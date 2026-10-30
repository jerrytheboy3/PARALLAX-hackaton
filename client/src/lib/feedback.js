// "My feedback" + trusted senders — stored ONLY in this browser's localStorage.
// Never the full message: a 60-character preview of the REDACTED text.
import { load, save, remove } from './storage.js';

const FB_KEY = 'trustlens.feedback';
const TRUST_KEY = 'trustlens.trustedSenders';
export const PREVIEW_CHARS = 60;

export const loadFeedback = () => {
  const v = load(FB_KEY, []);
  return Array.isArray(v) ? v : [];
};
export const saveFeedback = (list) => save(FB_KEY, list.slice(0, 200));
export const clearFeedback = () => remove(FB_KEY);

export function makeFeedbackEntry({ before, after, disputedSignalIds, reason, trustSender, type }) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    type,
    preview: String(after?.redactedText || before?.redactedText || '').slice(0, PREVIEW_CHARS),
    levelBefore: before?.level,
    levelAfter: after?.level,
    scoreBefore: before?.score,
    scoreAfter: after?.score,
    disputed: disputedSignalIds,
    dropped: (after?.changes || []).filter((c) => c.action === 'dropped').map((c) => c.id),
    kept: (after?.changes || []).filter((c) => c.action === 'kept').map((c) => c.id),
    reason: String(reason || '').slice(0, 120),
    trustedSender: !!trustSender,
  };
}

export const loadTrusted = () => {
  const v = load(TRUST_KEY, []);
  return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 200) : [];
};
export function addTrusted(sender) {
  const s = String(sender || '').trim();
  if (!s) return loadTrusted();
  const list = [...new Set([...loadTrusted(), s])];
  save(TRUST_KEY, list);
  return list;
}
export function removeTrusted(sender) {
  const list = loadTrusted().filter((x) => x !== sender);
  save(TRUST_KEY, list);
  return list;
}
