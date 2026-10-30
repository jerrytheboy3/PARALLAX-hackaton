export const LEVEL_ORDER = ['safe', 'caution', 'high', 'critical'];

export const LEVELS = {
  safe: {
    label: 'Safe',
    sub: 'No strong warning signs found',
    badge: 'bg-emerald-600 text-white',
    soft: 'bg-emerald-50 text-emerald-950 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-50',
    bar: 'bg-emerald-500',
    icon: '✓',
  },
  caution: {
    label: 'Caution',
    sub: 'Some warning signs — verify before acting',
    badge: 'bg-amber-400 text-amber-950',
    soft: 'bg-amber-50 text-amber-950 ring-amber-500/30 dark:bg-amber-950/40 dark:text-amber-50',
    bar: 'bg-amber-400',
    icon: '!',
  },
  high: {
    label: 'High risk',
    sub: 'Likely a scam — do not act on it',
    badge: 'bg-orange-600 text-white',
    soft: 'bg-orange-50 text-orange-950 ring-orange-600/30 dark:bg-orange-950/40 dark:text-orange-50',
    bar: 'bg-orange-500',
    icon: '⚠',
  },
  critical: {
    label: 'Critical',
    sub: 'Scam — do not click, call, pay or share',
    badge: 'bg-red-700 text-white',
    soft: 'bg-red-50 text-red-950 ring-red-700/30 dark:bg-red-950/40 dark:text-red-50',
    bar: 'bg-red-600',
    icon: '✕',
  },
};

export const STRENGTH = {
  serious: {
    label: 'Serious',
    pill: 'bg-red-700 text-white',
    mark: 'bg-red-200/80 text-red-950 decoration-red-700 dark:bg-red-500/35 dark:text-red-50 dark:decoration-red-300',
  },
  weak: {
    label: 'Weak',
    pill: 'bg-amber-300 text-amber-950',
    mark: 'bg-amber-200/80 text-amber-950 decoration-amber-600 dark:bg-amber-400/30 dark:text-amber-50 dark:decoration-amber-300',
  },
};

const TITLES = {
  otp_request: 'Asks for your OTP / PIN / password',
  credential_request: 'Asks for login details',
  kyc_update: 'Fake "update your KYC" request',
  urgency: 'Rushes you to act now',
  threat: 'Threatens to block or cut something',
  digital_arrest: '"Digital arrest" / fake police threat',
  money_request: 'Asks you to pay or transfer money',
  too_good: 'Too-good-to-be-true offer',
  dangerous_link: 'Dangerous link',
  suspicious_link: 'Suspicious link',
  bank_from_mobile: 'Organisation texting from a personal mobile number',
  brand_from_freemail: 'Organisation emailing from a free email account',
  reply_to_mismatch: 'Replies go to a different address',
  org_link_mismatch: 'Link is not the official website',
  upi_receive_scam: '"Scan to receive money" trick',
};

export function signalTitle(id) {
  return TITLES[id] || id.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}
