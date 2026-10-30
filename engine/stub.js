// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  STUB ENGINE — REPLACE WITH P2's DETECTION ENGINE (see CONTRACT.md §1)     ║
// ║  Deliberately small: a handful of obvious patterns so the whole flow works ║
// ║  end-to-end before the real engine lands. No anti-trick handling here.    ║
// ╚══════════════════════════════════════════════════════════════════════════╝

// Words before a match that turn "share your OTP" into "never share your OTP".
const NEGATION_BEFORE = /\b(?:not|never|don'?t|do not|dont|won'?t|will never|no one|nobody|no need to)\b[^.!?\n]{0,15}$/i;
const NEGATION_AFTER = /^[^.!?\n]{0,8}(?:ಬೇಡ|beda|maadbedi|madbedi|madabedi|maadabedi)/i;

const R = (id, category, strength, weight, lang, re, explanation, negatable = false) => ({
  id, category, strength, weight, lang, re, explanation, negatable,
});

const RULES = [
  // ── credential ────────────────────────────────────────────────────────────
  R('otp_request', 'credential', 'serious', 35, 'en',
    /\b(?:share|send|tell|give|provide|enter|confirm|forward|reply with|disclose|submit)\b[^.!?\n]{0,40}?\b(?:otp|one[- ]?time[- ]?password|m?pin|cvv|password|passcode)\b/gi,
    'Asks you to share an OTP, PIN or password — real banks and companies never ask for these.', true),
  R('otp_request', 'credential', 'serious', 35, 'kanglish',
    /\b(?:otp|pin|password)\b[^.!?\n]{0,25}?\b(?:heli|helri|kodi|kodri|kalsi|kalisi|share\s?maadi|share\s?madi|send\s?maadi|send\s?madi|tilsi|thilsi)\b/gi,
    'Asks you to tell or send your OTP/PIN (Kanglish) — never share these with anyone.', true),
  R('otp_request', 'credential', 'serious', 35, 'kn',
    /(?:ಒಟಿಪಿ|ಓಟಿಪಿ|OTP|ಪಿನ್|PIN|ಪಾಸ್‌?ವರ್ಡ್)[^.!?\n]{0,35}?(?:ಹಂಚಿಕೊಳ್ಳಿ|ತಿಳಿಸಿ|ಕಳುಹಿಸಿ|ಹೇಳಿ|ನೀಡಿ|ಕೊಡಿ)/gu,
    'Asks you to share your OTP/PIN (Kannada) — real organisations never ask for these.', true),
  R('kyc_update', 'credential', 'weak', 12, 'en',
    /\b(?:(?:update|verify|complete|re-?submit|link)\b[^.!?\n]{0,25}?\b(?:kyc|pan|aadhaa?r)\b|(?:kyc|pan|aadhaa?r)\b[^.!?\n]{0,20}?\b(?:update|verification|verify|expired?|pending|suspended|blocked)\b)/gi,
    'Banks and companies do not ask you to update KYC/PAN/Aadhaar through a message.'),
  R('kyc_update', 'credential', 'weak', 12, 'kn',
    /KYC\s?(?:ಅಪ್‌?ಡೇಟ್|ನವೀಕರಿಸಿ|ಪರಿಶೀಲನೆ)/gu,
    'Asks you to update KYC (Kannada) — banks never do this through an SMS.'),

  // ── urgency ───────────────────────────────────────────────────────────────
  R('urgency', 'urgency', 'weak', 10, 'en',
    /\b(?:urgent(?:ly)?|immediately|right now|act now|asap|within \d+\s?(?:hours?|hrs?|minutes?|mins?)|today itself|last chance|final (?:notice|warning|reminder)|expires? (?:today|tonight)|before midnight)\b/gi,
    'Creates urgency so you act before you think.'),
  R('urgency', 'urgency', 'weak', 10, 'kanglish',
    /\b(?:bega|beega|takshana|thakshana|ivattu\s?ne|ivathe|eegle|eega\s?le)\b/gi,
    'Rushes you ("bega", "takshana") so you act before you think.'),
  R('urgency', 'urgency', 'weak', 10, 'kn',
    /(?:ತಕ್ಷಣ|ಕೂಡಲೇ|ತುರ್ತು|ಇಂದೇ|ಈಗಲೇ)/gu,
    'Rushes you ("ತಕ್ಷಣ" = immediately) so you act before you think.'),

  // ── threat ────────────────────────────────────────────────────────────────
  R('threat', 'threat', 'weak', 12, 'en',
    /\b(?:blocked|suspended|suspension|deactivated|deactivation|disconnected|disconnection|terminated|frozen|legal action|penalty)\b/gi,
    'Threatens that something will be blocked or cut to scare you.'),
  R('threat', 'threat', 'weak', 12, 'kanglish',
    /\b(?:(?:power|current|line)\s?cut\s?(?:aagutte|agutte|madtivi|maadtivi)|block\s?(?:aagutte|agutte|madtivi|maadtivi)|band\s?(?:aagutte|agutte))\b/gi,
    'Threatens a power cut or block (Kanglish) to scare you.'),
  R('threat', 'threat', 'weak', 12, 'kn',
    /(?:ಬ್ಲಾಕ್|ಸ್ಥಗಿತ|ಕಡಿತ|ನಿರ್ಬಂಧ)/gu,
    'Threatens that your account or service will be blocked (Kannada).'),
  R('digital_arrest', 'threat', 'serious', 30, 'en',
    /\b(?:digital(?:ly)? arrest(?:ed)?|arrest warrant|under arrest|face arrest|will be arrested|money laundering|narcotics|illegal drugs)\b/gi,
    'Police, CBI and customs never "arrest" anyone over a call or message — this is the "digital arrest" scam.'),
  R('digital_arrest', 'threat', 'serious', 30, 'kanglish',
    /\b(?:arrest\s?(?:madtivi|maadtivi|aagthira|agtira|aagtira))\b/gi,
    'Threatens arrest (Kanglish) — real police never do this over a message.'),
  R('digital_arrest', 'threat', 'serious', 30, 'kn',
    /(?:ಡಿಜಿಟಲ್ ಅರೆಸ್ಟ್|ಬಂಧಿಸಲಾಗುವುದು|ಬಂಧನ ವಾರಂಟ್)/gu,
    'Threatens arrest (Kannada) — real police never do this over a message.'),

  // ── money ─────────────────────────────────────────────────────────────────
  R('money_request', 'money', 'serious', 22, 'en',
    /\b(?:pay|transfer|deposit|remit|send)\b[^.!?\n]{0,35}?(?:\brs\.?\s?\d|₹\s?\d|\binr\s?\d|\brupees\b|\bmoney\b|\bfees?\b|\bcharges?\b|\bfine\b|\[UPI_ID\]|\bverification account\b)/gi,
    'Asks you to pay or transfer money — verify through the official app before paying anyone.', true),
  R('money_request', 'money', 'serious', 22, 'kanglish',
    /\b(?:pay\s?maadi|pay\s?madi|duddu\s?(?:kalsi|kalisi|haaki|haki)|amount\s?(?:kalsi|kalisi|haaki|haki)|transfer\s?maadi|transfer\s?madi)\b/gi,
    'Asks you to pay money (Kanglish) — verify through the official app before paying anyone.', true),
  R('money_request', 'money', 'serious', 22, 'kn',
    /(?:ಶುಲ್ಕ(?:ವನ್ನು)?\s?ಪಾವತಿಸಿ|ಹಣ(?:ವನ್ನು)?\s?(?:ಕಳುಹಿಸಿ|ವರ್ಗಾಯಿಸಿ|ಪಾವತಿಸಿ)|ದಂಡ(?:ವನ್ನು)?\s?ಪಾವತಿಸಿ)/gu,
    'Asks you to pay money (Kannada) — verify through the official app before paying anyone.', true),

  // ── too good to be true ───────────────────────────────────────────────────
  R('too_good', 'other', 'weak', 10, 'en',
    /\b(?:congratulations|you(?:'ve| have)? won|lottery|lucky draw|jackpot|cashback|reward(?: points)?|prize|(?:you (?:are|have been) )?selected for|work[- ]from[- ]home|earn rs|guaranteed returns?)\b/gi,
    'Too-good-to-be-true offers (prizes, rewards, easy jobs) are a classic scam hook.'),
  R('too_good', 'other', 'weak', 10, 'kn',
    /(?:ಅಭಿನಂದನೆಗಳು|ಬಹುಮಾನ|ಲಾಟರಿ|ಕ್ಯಾಶ್‌?ಬ್ಯಾಕ್)/gu,
    'Too-good-to-be-true offer (Kannada) — a classic scam hook.'),
];

// ── links (text only — NEVER fetched) ─────────────────────────────────────────
const TLDS = 'com|in|net|org|info|io|co|me|ly|xyz|top|click|link|site|online|live|app|biz|shop|store|buzz|icu|rest|cc|tk|ml|ga|cf|gq|pw|vip|win|loan|work|support|services|bank|gov|edu|ac|sbi|gl|gd|at|to|ws|us|uk';
const URL_RE = new RegExp(
  `https?:\\/\\/[^\\s<>"'\\u0C80-\\u0CFF]+|(?<![\\w@.\\-/])(?:www\\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:${TLDS})(?![a-z0-9-])(?:[:/?#][^\\s<>"'\\u0C80-\\u0CFF]*)?`,
  'gi',
);
const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'is.gd', 'goo.gl', 'rb.gy', 'shorturl.at', 'tiny.cc', 'ow.ly', 's.id', 'v.gd', 'rebrand.ly', 't.ly', 'bitly.com']);
const RISKY_TLDS = new Set(['xyz', 'top', 'click', 'link', 'site', 'online', 'live', 'buzz', 'icu', 'rest', 'tk', 'ml', 'ga', 'cf', 'gq', 'pw', 'vip', 'win', 'loan', 'work', 'support', 'shop']);
const BRANDS = [
  ['sbi', 'SBI', ['sbi.co.in', 'onlinesbi.sbi', 'sbi.bank.in', 'sbicard.com']],
  ['hdfc', 'HDFC Bank', ['hdfcbank.com', 'hdfc.bank.in']],
  ['icici', 'ICICI Bank', ['icicibank.com', 'icici.bank.in']],
  ['axisbank', 'Axis Bank', ['axisbank.com', 'axis.bank.in']],
  ['kotak', 'Kotak', ['kotak.com', 'kotak.bank.in']],
  ['bescom', 'BESCOM', ['bescom.karnataka.gov.in', 'bescom.co.in']],
  ['indiapost', 'India Post', ['indiapost.gov.in']],
  ['bluedart', 'Blue Dart', ['bluedart.com']],
  ['delhivery', 'Delhivery', ['delhivery.com']],
  ['amazon', 'Amazon', ['amazon.in', 'amazon.com']],
  ['flipkart', 'Flipkart', ['flipkart.com']],
  ['paytm', 'Paytm', ['paytm.com']],
  ['phonepe', 'PhonePe', ['phonepe.com']],
  ['incometax', 'Income Tax Dept', ['incometax.gov.in']],
  ['uidai', 'UIDAI', ['uidai.gov.in']],
  ['aadhaar', 'UIDAI', ['uidai.gov.in']],
  ['kyc', 'a bank', []],
];

const isOfficial = (host, domains) => domains.some((d) => host === d || host.endsWith(`.${d}`));

function hostOf(url) {
  const h = url.replace(/^https?:\/\//i, '').split(/[/:?#]/)[0].toLowerCase();
  return h.startsWith('www.') ? h.slice(4) : h;
}

function checkLink(url) {
  const host = hostOf(url);
  const tld = host.split('.').pop();
  const reasons = [];
  let danger = false;
  let susp = false;
  if (SHORTENERS.has(host)) {
    susp = true;
    reasons.push('Shortened link — it hides the real website');
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    danger = true;
    reasons.push('Uses a raw IP address instead of a website name');
  }
  if (host.includes('xn--')) {
    danger = true;
    reasons.push('Uses look-alike characters (punycode)');
  }
  if (RISKY_TLDS.has(tld)) {
    danger = true;
    reasons.push(`Uses a cheap ".${tld}" domain often used by scammers`);
  }
  const brand = BRANDS.find(([key, , domains]) => host.replace(/-/g, '').includes(key) && !isOfficial(host, domains));
  if (brand) {
    danger = true;
    reasons.push(brand[0] === 'kyc' ? 'Website name is built to look like a bank/KYC page' : `Uses "${brand[1]}" in the address but is not ${brand[1]}'s official website`);
  }
  if (!danger && !susp && (/(?:login|verify|kyc|update|secure|account|reward|refund)/.test(host) || (host.match(/-/g) || []).length >= 3)) {
    susp = true;
    reasons.push('Website name uses words scammers like (login, verify, update…)');
  }
  if (/^http:\/\//i.test(url) && (danger || susp)) reasons.push('Not secure (http, not https)');
  return { verdict: danger ? 'dangerous' : susp ? 'suspicious' : 'ok', reasons };
}

const ORG_WORDS = /\b(?:bank|sbi|hdfc|icici|axis|kotak|kyc|a\/c|account|bescom|electricity|india post|courier|parcel|amazon|flipkart|paytm|phonepe|income tax|aadhaa?r|police|cbi|customs)\b|ಬ್ಯಾಂಕ್|ಖಾತೆ|ಬೆಸ್ಕಾಂ|ವಿದ್ಯುತ್/i;

/** STUB detect() — same signature P2's engine must implement. */
export function detect({ text, senderInfo, replyToInfo, subject } = {}) {
  const t = typeof text === 'string' ? text : '';
  const signals = [];
  const links = [];

  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    for (const m of t.matchAll(rule.re)) {
      const start = m.index;
      const end = start + m[0].length;
      if (rule.negatable) {
        if (NEGATION_BEFORE.test(t.slice(Math.max(0, start - 30), start))) continue;
        if (NEGATION_AFTER.test(t.slice(end, end + 12))) continue;
      }
      signals.push({ id: rule.id, category: rule.category, strength: rule.strength, weight: rule.weight, start, end, evidence: m[0], explanation: rule.explanation, lang: rule.lang });
    }
  }

  URL_RE.lastIndex = 0;
  const urlSpans = [...t.matchAll(URL_RE)].map((m) => [m.index, m.index + m[0].length]);
  // Words inside a URL ("sbi-kyc-verify.xyz") are judged by the link checks, not the text rules.
  for (let i = signals.length - 1; i >= 0; i--) {
    const s = signals[i];
    if (urlSpans.some(([a, b]) => s.start >= a && s.end <= b)) signals.splice(i, 1);
  }

  URL_RE.lastIndex = 0;
  for (const m of t.matchAll(URL_RE)) {
    const url = m[0].replace(/[.,;:!?)\]'"]+$/, '');
    const start = m.index;
    const end = start + url.length;
    const { verdict, reasons } = checkLink(url);
    links.push({ url, start, end, verdict, reasons });
    if (verdict === 'dangerous') {
      signals.push({ id: 'dangerous_link', category: 'link', strength: 'serious', weight: 30, start, end, evidence: url, explanation: `Dangerous link: ${reasons[0].toLowerCase()}.`, lang: 'en' });
    } else if (verdict === 'suspicious') {
      signals.push({ id: 'suspicious_link', category: 'link', strength: 'weak', weight: 15, start, end, evidence: url, explanation: `Suspicious link: ${reasons[0].toLowerCase()}.`, lang: 'en' });
    }
  }

  const mentionsOrg = ORG_WORDS.test(t) || ORG_WORDS.test(subject || '');
  const kind = senderInfo?.kind;
  if (mentionsOrg && (kind === 'mobile' || kind === 'intl' || kind === 'landline')) {
    signals.push({
      id: 'bank_from_mobile', category: 'sender', strength: 'weak', weight: 18, start: null, end: null, evidence: '[PHONE]',
      explanation: kind === 'intl'
        ? 'Claims to be an Indian bank/company but was sent from a foreign phone number.'
        : 'Claims to be a bank/company but was sent from a normal 10-digit mobile number. Real ones use registered sender IDs like "VM-SBIINB".',
      lang: 'en',
    });
  }
  if (mentionsOrg && kind === 'email' && senderInfo.freemail) {
    signals.push({ id: 'brand_from_freemail', category: 'sender', strength: 'weak', weight: 18, start: null, end: null, evidence: senderInfo.domain, explanation: `Claims to be an organisation but was sent from a free ${senderInfo.domain} address.`, lang: 'en' });
  }
  if (kind === 'email' && replyToInfo?.domain && senderInfo.domain && replyToInfo.domain !== senderInfo.domain) {
    signals.push({ id: 'reply_to_mismatch', category: 'sender', strength: 'weak', weight: 12, start: null, end: null, evidence: replyToInfo.domain, explanation: `Replies go to a different address (${replyToInfo.domain}) than the sender (${senderInfo.domain}).`, lang: 'en' });
  }

  return { signals, links };
}
