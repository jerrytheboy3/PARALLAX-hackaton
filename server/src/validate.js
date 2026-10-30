// Input validation for every API body. Returns { value } or { error }.
export const LIMITS = {
  textMax: 5000,
  fieldMax: 200,
  contextMax: 1000,
  reasonMax: 500,
  listMax: 200,
};
const TYPES = new Set(['sms', 'email', 'qr']);

const optString = (v, max, name) => {
  if (v === undefined || v === null || v === '') return { ok: true, v: undefined };
  if (typeof v !== 'string') return { ok: false, error: `${name} must be a string` };
  if (v.length > max) return { ok: false, error: `${name} is too long (max ${max} characters)` };
  return { ok: true, v };
};

const strList = (v, name) => {
  if (v === undefined || v === null) return { ok: true, v: [] };
  if (!Array.isArray(v) || v.length > LIMITS.listMax || !v.every((x) => typeof x === 'string' && x.length <= LIMITS.fieldMax)) {
    return { ok: false, error: `${name} must be a list of short strings` };
  }
  return { ok: true, v };
};

export function validateAnalyze(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be a JSON object' };
  const { text, type = 'sms' } = body;
  if (typeof text !== 'string' || !text.trim()) return { error: 'text is required' };
  if (text.length > LIMITS.textMax) return { error: `text is too long (max ${LIMITS.textMax} characters)` };
  if (!TYPES.has(type)) return { error: 'type must be one of sms, email, qr' };
  const out = { text, type };
  for (const [k, max] of [['sender', LIMITS.fieldMax], ['subject', LIMITS.fieldMax], ['replyTo', LIMITS.fieldMax], ['context', LIMITS.contextMax]]) {
    const r = optString(body[k], max, k);
    if (!r.ok) return { error: r.error };
    out[k] = r.v;
  }
  const ts = strList(body.trustedSenders, 'trustedSenders');
  if (!ts.ok) return { error: ts.error };
  out.trustedSenders = ts.v;
  return { value: out };
}

export function validateReassess(body) {
  const base = validateAnalyze(body);
  if (base.error) return base;
  const ids = strList(body.disputedSignalIds, 'disputedSignalIds');
  if (!ids.ok) return { error: ids.error };
  const reason = optString(body.reason, LIMITS.reasonMax, 'reason');
  if (!reason.ok) return { error: reason.error };
  if (body.trustSender !== undefined && typeof body.trustSender !== 'boolean') return { error: 'trustSender must be true or false' };
  return { value: { ...base.value, disputedSignalIds: ids.v, reason: reason.v, trustSender: !!body.trustSender } };
}

export function validateExplain(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be a JSON object' };
  const { redactedText, signals = [], level, lang = 'en' } = body;
  if (typeof redactedText !== 'string' || !redactedText.trim()) return { error: 'redactedText is required' };
  if (redactedText.length > LIMITS.textMax + 1000) return { error: 'redactedText is too long' };
  if (!['safe', 'caution', 'high', 'critical'].includes(level)) return { error: 'level is invalid' };
  if (!Array.isArray(signals) || signals.length > 100) return { error: 'signals must be a list' };
  if (!['en', 'kn'].includes(lang)) return { error: 'lang must be en or kn' };
  const clean = signals
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({
      id: String(s.id || '').slice(0, 64),
      category: String(s.category || '').slice(0, 32),
      strength: s.strength === 'serious' ? 'serious' : 'weak',
      evidence: String(s.evidence || '').slice(0, 200),
      explanation: String(s.explanation || '').slice(0, 300),
    }));
  return { value: { redactedText, signals: clean, level, lang } };
}
