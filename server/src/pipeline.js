// analyze flow: validate (in routes) → redact → engine → map spans → orgs → score → verify steps
// Nothing in here stores, logs or sends message text anywhere.

import * as defaultEngine from '../../engine/index.js';
import { redact, redactValue, describeSender, senderKey, emptySummary } from './redact.js';
import { detectOrgs, orgLinkMismatch, senderIsOfficial, verifyStepsFor } from './orgs.js';
import { scoreSignals, verdictFor } from './scoring.js';
import { REPORT_STEPS } from './report.js';
import { analyzeQrContent } from './qr.js';

const CATEGORIES = new Set(['urgency', 'threat', 'credential', 'money', 'link', 'sender', 'impersonation', 'other']);
const LANGS = new Set(['en', 'kn', 'kanglish']);
const VERDICTS = new Set(['ok', 'suspicious', 'dangerous']);

/** Redaction counts for the message plus the sender / reply-to fields. */
function senderSummary(summary, ...fields) {
  const out = { ...emptySummary(), ...summary };
  for (const f of fields) {
    if (f === '[PHONE]') out.phone += 1;
    else if (f === '[EMAIL]') out.email += 1;
  }
  return out;
}

const validSpan = (s, e, len) => Number.isInteger(s) && Number.isInteger(e) && s >= 0 && e <= len && s < e;

/** Defensive clean-up of whatever the engine returned, so a buggy engine can't crash the demo. */
export function sanitizeEngineOutput(out, text) {
  const len = text.length;
  const signals = (Array.isArray(out?.signals) ? out.signals : [])
    .filter((s) => s && typeof s === 'object' && typeof s.id === 'string' && s.id)
    .map((s) => {
      const span = validSpan(s.start, s.end, len);
      return {
        id: s.id.slice(0, 64),
        category: CATEGORIES.has(s.category) ? s.category : 'other',
        strength: s.strength === 'serious' ? 'serious' : 'weak',
        weight: Math.min(40, Math.max(1, Number.isFinite(+s.weight) ? +s.weight : 5)),
        start: span ? s.start : null,
        end: span ? s.end : null,
        evidence: span ? text.slice(s.start, s.end) : String(s.evidence ?? '').slice(0, 200),
        explanation: String(s.explanation || 'Matched a known scam pattern.').slice(0, 300),
        lang: LANGS.has(s.lang) ? s.lang : 'en',
        source: s.source === 'server' ? 'server' : 'engine',
      };
    });
  const links = (Array.isArray(out?.links) ? out.links : [])
    .filter((l) => l && typeof l.url === 'string' && validSpan(l.start, l.end, len))
    .map((l) => ({
      url: text.slice(l.start, l.end),
      start: l.start,
      end: l.end,
      verdict: VERDICTS.has(l.verdict) ? l.verdict : 'suspicious',
      reasons: (Array.isArray(l.reasons) ? l.reasons : []).map((r) => String(r).slice(0, 200)).slice(0, 6),
    }));
  const claimedOrgs = Array.isArray(out?.claimedOrgs) ? out.claimedOrgs.filter((x) => typeof x === 'string') : [];
  return { signals, links, claimedOrgs };
}

/**
 * Run the full analysis on an already-validated input.
 * @param {{text,type,sender?,subject?,replyTo?,context?,trustedSenders?}} input
 * @param {{ engine?: {detect:Function, engineName:string}, aiAvailable?: boolean, extraTrusted?: string[] }} opts
 */
export async function analyze(input, { engine = defaultEngine, aiAvailable = false } = {}) {
  let text = input.text;
  let extraOriginalSignals = [];
  const extra = {};

  // 0. QR: analyse the decoded content (URL / upi:// / text); offsets refer to displayText
  if (input.type === 'qr') {
    const q = analyzeQrContent(input.text, input.context);
    text = q.displayText;
    extraOriginalSignals = q.signals;
    extra.displayText = q.displayText;
    extra.qr = q.qr;
  }

  // 1. Redact BEFORE analysis
  const red = redact(text);
  const sender = describeSender(input.type === 'qr' ? undefined : input.sender);
  const replyTo = describeSender(input.replyTo);
  const subject = input.subject ? redactValue(input.subject) : undefined;

  // 2. Engine on redacted text only
  let raw;
  let engineError = false;
  try {
    raw = await engine.detect({
      text: red.redactedText,
      type: input.type,
      sender: sender.redacted,
      senderInfo: sender.info,
      subject,
      replyTo: replyTo.redacted,
      replyToInfo: replyTo.info.kind === 'none' ? undefined : replyTo.info,
    });
  } catch {
    raw = { signals: [], links: [] };
    engineError = true;
  }
  const clean = sanitizeEngineOutput(raw, red.redactedText);

  // 3. Organisations + server-side signals (still on redacted offsets)
  const orgs = detectOrgs({ text: red.redactedText, subject, senderInfo: sender.info, engineClaims: clean.claimedOrgs });
  const serverSignals = orgLinkMismatch(clean.links, orgs);

  // 4. Map every span back onto the ORIGINAL text; evidence stays redacted
  const mapSpan = (o) => {
    if (o.start === null) return o;
    const m = red.toOriginal(o.start, o.end);
    return { ...o, start: m.start, end: m.end };
  };
  const signals = [...clean.signals, ...serverSignals].map(mapSpan);
  for (const s of extraOriginalSignals) signals.push({ ...s, evidence: redactValue(s.evidence) });
  const links = clean.links.map(mapSpan);

  // 5. Score
  const senderVerified = senderIsOfficial(orgs, sender.info);
  const trusted = new Set((input.trustedSenders || []).map(senderKey).filter(Boolean));
  const senderTrusted = !!input.sender && trusted.has(senderKey(input.sender));
  const scored = scoreSignals({ signals, orgs, senderVerified, senderTrusted });
  const keyed = scored.signals.map((s, i) => ({ ...s, key: `${s.id}#${i}` }));

  return {
    level: scored.level,
    score: scored.score,
    verdict: verdictFor({ level: scored.level, signals: keyed, orgs, text: `${subject || ''} ${red.redactedText}`, qr: extra.qr }),
    signals: keyed,
    links,
    orgs: orgs.map((o) => ({ id: o.id, name: o.name })),
    verifySteps: verifyStepsFor(orgs),
    reportSteps: REPORT_STEPS,
    combos: scored.combos,
    redactedText: red.redactedText,
    redactionSummary: senderSummary(red.summary, sender.redacted, replyTo.redacted),
    senderVerified,
    senderTrusted,
    ...extra,
    aiAvailable,
    engine: engine.engineName === 'p2' ? 'p2' : 'stub',
    ...(engineError ? { engineError: true } : {}),
    _orgs: orgs, // internal, stripped before sending
  };
}

const KEEP_WHY = {
  credential: 'Real banks and companies never ask for an OTP, PIN or password. Even if the sender is genuine, sharing it lets someone empty your account.',
  money: 'A request to pay or transfer money must be checked in the official app or on the official number, no matter who sent it.',
  link: 'This link is dangerous on its own. Even trusted contacts get hacked — open the official app or website yourself instead.',
  impersonation: 'The message names an organisation but points to a website that is not theirs.',
  threat: 'Police, CBI and customs never arrest anyone or ask for money over a call or message.',
};

/**
 * "This is actually legit": disputed WEAK signals drop; SERIOUS ones stay with an explanation.
 */
export async function reassess(input, opts = {}) {
  const trustedSenders = [...(input.trustedSenders || [])];
  if (input.trustSender && input.sender) trustedSenders.push(input.sender);
  const base = await analyze({ ...input, trustedSenders }, opts);

  const disputed = new Set(input.disputedSignalIds || []);
  const changes = [];
  const remaining = [];
  for (const s of base.signals) {
    if (!disputed.has(s.id)) {
      remaining.push(s);
      continue;
    }
    if (s.strength === 'serious') {
      const why = KEEP_WHY[s.category] || 'This is a serious warning sign and cannot be dismissed.';
      remaining.push({ ...s, keptNote: why });
      if (!changes.some((c) => c.id === s.id)) changes.push({ id: s.id, action: 'kept', why });
    } else if (!changes.some((c) => c.id === s.id)) {
      changes.push({ id: s.id, action: 'dropped', why: 'You said this part is normal, and on its own it is only a weak sign.' });
    }
  }

  const rescored = scoreSignals({
    signals: remaining.map(({ weightApplied, ...s }) => s), // eslint-disable-line no-unused-vars
    orgs: base._orgs,
    senderVerified: base.senderVerified,
    senderTrusted: base.senderTrusted,
  });
  const signals = rescored.signals.map((s) => ({ ...s }));
  return {
    ...base,
    level: rescored.level,
    score: rescored.score,
    combos: rescored.combos,
    signals,
    verdict: verdictFor({ level: rescored.level, signals, orgs: base._orgs, text: base.redactedText, qr: base.qr }),
    changes,
  };
}

/** Remove internal fields before sending a result over HTTP. */
export function publicResult(r) {
  const { _orgs, ...rest } = r; // eslint-disable-line no-unused-vars
  return rest;
}
