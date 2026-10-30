// FAKE DATA — used when VITE_USE_MOCK=true or the server is unreachable.
// Shapes match CONTRACT.md §4 exactly. The UI shows a "Demo data" pill whenever these are used.
// Offsets are computed from the text at load time so highlights always line up.

import seed from '../../../data/seed.json';

export const EXTRA_SAMPLES = [
  {
    id: 'en-caution-001',
    type: 'sms',
    sender: '+91 90000 12345',
    text: 'URGENT: Your HDFC credit card reward points expire today. Redeem them now before they lapse.',
    lang: 'en',
    label: 'scam',
    expectedLevel: 'caution',
  },
];

export const REPORT_STEPS = [
  { id: '1930', title: 'Call 1930', detail: 'National Cyber Crime Helpline — call right away if you have lost money.' },
  { id: 'cybercrime', title: 'cybercrime.gov.in', detail: 'Report the fraud on the National Cyber Crime Reporting Portal.' },
  { id: 'chakshu', title: 'Chakshu on sancharsaathi.gov.in', detail: 'Report suspected fraud calls, SMS and WhatsApp messages.' },
];

const GENERIC_VERIFY = {
  orgId: 'generic',
  title: 'Check it safely',
  steps: [
    'Do not click links or call numbers given in the message.',
    'Open the official app, or type the official website address yourself.',
    'Call the number printed on your card, bill or passbook — not one from the message.',
    'Never share OTP, PIN, CVV or passwords. No real bank, company or police officer will ask.',
  ],
  officialDomains: [],
};

const ORGS = {
  sbi: {
    name: 'State Bank of India (SBI)',
    officialApp: 'YONO SBI',
    officialDomains: ['sbi.co.in', 'onlinesbi.sbi'],
    steps: [
      'Open the YONO SBI app yourself (not from a link) and check for alerts.',
      'KYC is only updated in the official app, at onlinesbi.sbi or at your branch.',
      'Call the customer-care number printed on your passbook or debit card.',
      'SBI never asks for OTP, PIN or password over SMS, call or email.',
    ],
  },
  bescom: {
    name: 'BESCOM',
    officialApp: 'BESCOM Mithra',
    officialDomains: ['bescom.karnataka.gov.in', 'bescom.co.in'],
    steps: [
      'Check your bill in the BESCOM Mithra app or on the official BESCOM website.',
      'Use the number printed on your paper electricity bill to call.',
      'BESCOM does not cut power at night over an SMS from a personal number.',
    ],
  },
  hdfc: {
    name: 'HDFC Bank',
    officialApp: 'HDFC Bank MobileBanking',
    officialDomains: ['hdfcbank.com'],
    steps: [
      'Check reward points inside the HDFC Bank app or NetBanking, typed in yourself.',
      'Call the number printed on the back of your card.',
    ],
  },
};

function verifyFor(orgIds) {
  if (!orgIds.length) return [GENERIC_VERIFY];
  return orgIds.map((id) => ({
    orgId: id,
    title: `Check with ${ORGS[id].name} directly`,
    steps: ORGS[id].steps,
    officialApp: ORGS[id].officialApp,
    officialDomains: ORGS[id].officialDomains,
  }));
}

function mockRedact(text) {
  const summary = { phone: 0, otp: 0, account: 0, card: 0, aadhaar: 0, pan: 0, upi: 0, email: 0 };
  let out = text.replace(/(\+91[\s-]?)?(?<!\d)[6-9]\d{4}[\s-]?\d{5}(?!\d)/g, () => {
    summary.phone++;
    return '[PHONE]';
  });
  out = out.replace(/(?<![\d,.])\d{4,8}(?![\d,])/g, (m) => {
    if (/^(19|20)\d\d$/.test(m)) return m;
    summary.otp++;
    return '[OTP]';
  });
  return { redactedText: out, redactionSummary: summary };
}

function sig(text, evidence, id, category, strength, weight, explanation, lang = 'en') {
  const start = text.indexOf(evidence);
  if (start < 0) return null;
  return { id, category, strength, weight, weightApplied: weight, start, end: start + evidence.length, evidence, explanation, lang, source: 'engine' };
}

function finish(text, partial, body) {
  const signals = partial.signals.filter(Boolean).map((s, i) => ({ ...s, key: `${s.id}#${i}` }));
  return {
    level: partial.level,
    score: partial.score,
    verdict: partial.verdict,
    signals,
    links: (partial.links || []).filter(Boolean),
    orgs: (partial.orgs || []).map((id) => ({ id, name: ORGS[id].name })),
    verifySteps: verifyFor(partial.orgs || []),
    reportSteps: REPORT_STEPS,
    combos: partial.combos || [],
    ...mockRedact(text),
    senderVerified: !!partial.senderVerified,
    senderTrusted: false,
    aiAvailable: true,
    engine: 'stub',
    ...(body?.type === 'qr' ? { displayText: text, qr: { kind: 'text' } } : {}),
  };
}

function link(text, url, verdict, reasons) {
  const start = text.indexOf(url);
  return start < 0 ? null : { url, start, end: start + url.length, verdict, reasons };
}

const byId = Object.fromEntries([...seed, ...EXTRA_SAMPLES].map((m) => [m.id, m.text]));

const CANNED = {
  'en-kyc-001': (t) => ({
    level: 'critical',
    score: 100,
    verdict: 'This looks like a fake SBI KYC message trying to get your login details or OTP.',
    orgs: ['sbi'],
    signals: [
      sig(t, 'BLOCKED', 'threat', 'threat', 'weak', 12, 'Threatens that your account will be blocked to scare you into acting fast.'),
      sig(t, 'Update your PAN/KYC', 'kyc_update', 'credential', 'weak', 12, 'Banks do not ask you to update KYC through a link in an SMS.'),
      sig(t, 'immediately', 'urgency', 'urgency', 'weak', 10, 'Creates urgency so you act before thinking.'),
      sig(t, 'http://sbi-kyc-verify.xyz/login', 'dangerous_link', 'link', 'serious', 30, 'Link uses a cheap ".xyz" domain and pretends to be SBI.'),
      sig(t, 'http://sbi-kyc-verify.xyz/login', 'org_link_mismatch', 'impersonation', 'serious', 25, 'Mentions SBI but the link is not an official SBI website.'),
      sig(t, 'share the OTP', 'otp_request', 'credential', 'serious', 35, 'Asks you to share an OTP — real banks never ask for this.'),
    ].map((s) => s && (s.id === 'org_link_mismatch' ? { ...s, source: 'server' } : s)),
    links: [link(t, 'http://sbi-kyc-verify.xyz/login', 'dangerous', ['Uses a risky ".xyz" domain', 'Pretends to be SBI but is not sbi.co.in', 'Not https'])],
    combos: [
      { id: 'credential_link', label: 'Asks for credentials AND has a link', bonus: 20 },
      { id: 'impersonation_link', label: 'Impersonates an organisation AND has a link', bonus: 15 },
    ],
  }),
  'en-normal-otp-001': () => ({
    level: 'safe',
    score: 0,
    verdict: 'No strong warning signs found. Still — never share this OTP with anyone.',
    orgs: ['sbi'],
    signals: [],
    senderVerified: true,
  }),
  'kn-kyc-001': (t) => ({
    level: 'critical',
    score: 100,
    verdict: 'This looks like a fake SBI KYC message trying to get your login details or OTP.',
    orgs: ['sbi'],
    signals: [
      sig(t, 'ಬ್ಲಾಕ್', 'threat', 'threat', 'weak', 12, 'Threatens that your account will be blocked ("ಬ್ಲಾಕ್").', 'kn'),
      sig(t, 'ತಕ್ಷಣ', 'urgency', 'urgency', 'weak', 10, 'Says "immediately" (ತಕ್ಷಣ) to rush you.', 'kn'),
      sig(t, 'KYC ಅಪ್ಡೇಟ್', 'kyc_update', 'credential', 'weak', 12, 'Asks you to update KYC — banks never do this over SMS.', 'kn'),
      sig(t, 'http://sbi-kyc.top/update', 'dangerous_link', 'link', 'serious', 30, 'Link uses a cheap ".top" domain and pretends to be SBI.'),
      sig(t, 'OTP ಅನ್ನು 9876543210 ಸಂಖ್ಯೆಗೆ ತಿಳಿಸಿ', 'otp_request', 'credential', 'serious', 35, 'Asks you to tell your OTP to a phone number.', 'kn'),
    ].map((s) => (s && s.id === 'otp_request' ? { ...s, evidence: 'OTP ಅನ್ನು [PHONE] ಸಂಖ್ಯೆಗೆ ತಿಳಿಸಿ' } : s)),
    links: [link(t, 'http://sbi-kyc.top/update', 'dangerous', ['Uses a risky ".top" domain', 'Pretends to be SBI'])],
    combos: [{ id: 'credential_link', label: 'Asks for credentials AND has a link', bonus: 20 }],
  }),
  'kanglish-bescom-001': (t) => ({
    level: 'high',
    score: 72,
    verdict: 'This looks like a fake BESCOM electricity bill message trying to make you pay money.',
    orgs: ['bescom'],
    signals: [
      sig(t, 'power cut aagutte', 'threat', 'threat', 'weak', 12, 'Threatens a power cut tonight to scare you.', 'kanglish'),
      sig(t, 'Takshana', 'urgency', 'urgency', 'weak', 10, 'Says "immediately" (takshana) to rush you.', 'kanglish'),
      sig(t, 'pay maadi', 'money_request', 'money', 'serious', 22, 'Asks you to pay money to an unknown contact.', 'kanglish'),
      { id: 'bank_from_mobile', category: 'sender', strength: 'weak', weight: 18, weightApplied: 18, start: null, end: null, evidence: '[PHONE]', explanation: 'Claims to be BESCOM but was sent from a normal 10-digit mobile number.', lang: 'en', source: 'engine' },
    ],
    combos: [{ id: 'urgency_money', label: 'Rushes you AND asks for money', bonus: 10 }],
  }),
  'en-caution-001': (t) => ({
    level: 'caution',
    score: 38,
    verdict: 'This message mentions HDFC Bank and has some warning signs. Check it in the official app before acting.',
    orgs: ['hdfc'],
    signals: [
      sig(t, 'URGENT', 'urgency', 'urgency', 'weak', 10, 'Creates urgency so you act before thinking.'),
      sig(t, 'reward points', 'too_good', 'other', 'weak', 10, '"Reward points expiring" is a common hook to get you to click or call.'),
      { id: 'bank_from_mobile', category: 'sender', strength: 'weak', weight: 18, weightApplied: 18, start: null, end: null, evidence: '[PHONE]', explanation: 'Claims to be a bank but was sent from a normal 10-digit mobile number.', lang: 'en', source: 'engine' },
    ],
  }),
};

const THRESHOLDS = { caution: 20, high: 45, critical: 75 };
function levelFor(score, hasSerious) {
  let lvl = score >= THRESHOLDS.critical ? 'critical' : score >= THRESHOLDS.high ? 'high' : score >= THRESHOLDS.caution ? 'caution' : 'safe';
  if (!hasSerious && (lvl === 'high' || lvl === 'critical')) lvl = 'caution';
  if (lvl === 'critical' && !hasSerious) lvl = 'high';
  return lvl;
}

const GENERIC_RULES = [
  [/\b(share|send|tell|give)\b[^.!?\n]{0,30}?\b(otp|pin|password|cvv)\b/gi, 'otp_request', 'credential', 'serious', 35, 'Asks you to share an OTP, PIN or password.'],
  [/\b(urgent(ly)?|immediately|right now|takshana|bega)\b|ತಕ್ಷಣ/gi, 'urgency', 'urgency', 'weak', 10, 'Creates urgency so you act before thinking.'],
  [/\b(blocked|suspended|deactivated|disconnected|arrest)\b|ಬ್ಲಾಕ್/gi, 'threat', 'threat', 'weak', 12, 'Uses a threat to scare you.'],
  [/\b(pay|transfer|send)\b[^.!?\n]{0,25}?(\brs\.?|₹|\bfee\b)/gi, 'money_request', 'money', 'serious', 22, 'Asks you to pay or transfer money.'],
  [/\b\S*(bit\.ly|\.xyz|\.top|\.click)\S*/gi, 'dangerous_link', 'link', 'serious', 30, 'Link uses a shortener or a cheap domain often used by scammers.'],
];

function genericAnalyze(text) {
  const signals = [];
  for (const [re, id, category, strength, weight, explanation] of GENERIC_RULES) {
    for (const m of text.matchAll(re)) {
      signals.push({ id, category, strength, weight, weightApplied: weight, start: m.index, end: m.index + m[0].length, evidence: m[0], explanation, lang: /[ಀ-೿]/.test(m[0]) ? 'kn' : 'en', source: 'engine' });
    }
  }
  const unique = new Map();
  for (const s of signals) unique.set(s.id, Math.max(unique.get(s.id) || 0, s.weight));
  const hasSerious = signals.some((s) => s.strength === 'serious');
  let score = Math.min(100, [...unique.values()].reduce((a, b) => a + b, 0));
  if (!hasSerious) score = Math.min(score, 44);
  const level = levelFor(score, hasSerious);
  const verdict =
    level === 'safe' ? 'No strong warning signs found. Stay alert anyway.'
    : level === 'caution' ? 'Some warning signs found. Verify through official channels before acting.'
    : 'This looks like a scam message. Do not click, call, pay or share anything.';
  return { level, score, verdict, signals, orgs: [] };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export async function mockAnalyze(body) {
  await delay(350);
  const text = body?.text || '';
  const id = Object.keys(byId).find((k) => byId[k] === text);
  const partial = id && CANNED[id] ? CANNED[id](text) : genericAnalyze(text);
  return finish(text, partial, body);
}

export async function mockReassess(body) {
  const base = await mockAnalyze(body);
  const disputed = new Set(body?.disputedSignalIds || []);
  const changes = [];
  const kept = [];
  for (const s of base.signals) {
    if (!disputed.has(s.id)) {
      kept.push(s);
    } else if (s.strength === 'weak') {
      if (!changes.some((c) => c.id === s.id)) changes.push({ id: s.id, action: 'dropped', why: 'You said this part is normal, and it is a weak sign on its own.' });
    } else {
      kept.push({ ...s, keptNote: 'This is a serious warning sign and cannot be dismissed.' });
      if (!changes.some((c) => c.id === s.id)) changes.push({ id: s.id, action: 'kept', why: 'Serious warning signs (OTP/PIN requests, money requests, dangerous links) stay even if the sender seems familiar.' });
    }
  }
  const droppedWeight = base.signals.filter((s) => !kept.includes(s) && !kept.some((k) => k.key === s.key)).reduce((a, s) => a + s.weight, 0);
  const hasSerious = kept.some((s) => s.strength === 'serious');
  let score = Math.max(0, base.score - droppedWeight);
  if (!hasSerious) score = Math.min(score, 44);
  return { ...base, signals: kept, score, level: levelFor(score, hasSerious), changes, senderTrusted: !!body?.trustSender };
}

export async function mockExplain(body) {
  await delay(900);
  const lvl = body?.level;
  const explanation =
    lvl === 'critical' || lvl === 'high'
      ? 'This message pretends to come from a trusted organisation and pushes you to act fast. It asks for things a real bank or company never asks for over SMS. Do not click the link or share any code — check in the official app instead.'
      : lvl === 'caution'
        ? 'A few things in this message are commonly used by scammers, but none is clearly dangerous on its own. Check it through the official app or number before you act.'
        : 'Nothing in this message looks like a typical scam. Still, never share an OTP or PIN with anyone who contacts you.';
  return { explanation };
}

export async function mockHealth() {
  return { ok: true, engine: 'stub', ai: 'ready', model: 'demo (mock)' };
}

export async function mockSamples() {
  return { source: 'seed', samples: [...seed, ...EXTRA_SAMPLES] };
}
