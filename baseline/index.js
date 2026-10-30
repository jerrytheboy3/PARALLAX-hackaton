// ╔════════════════════════════════════════════════════════════════════╗
// ║ STUB BASELINE — replace with P1's keyword filter (CONTRACT.md §3).   ║
// ║ A deliberately dumb keyword match, used only for comparison.         ║
// ╚════════════════════════════════════════════════════════════════════╝
export const baselineName = 'stub';

const KEYWORDS = ['otp', 'kyc', 'urgent', 'blocked', 'suspended', 'click', 'link', 'verify', 'prize', 'won', 'lottery', 'arrest', 'pay', 'refund', 'bit.ly', 'ತಕ್ಷಣ', 'ಬ್ಲಾಕ್', 'bega', 'takshana'];

export function keywordFilter(text) {
  const t = String(text || '').toLowerCase();
  const matched = KEYWORDS.filter((k) => t.includes(k));
  return { flagged: matched.length > 0, matched };
}
