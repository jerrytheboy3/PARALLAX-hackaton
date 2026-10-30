import { Pill } from './ui.jsx';

const NAMES = { phone: 'phone numbers', otp: 'OTP-like codes', account: 'account numbers', card: 'card numbers', aadhaar: 'Aadhaar numbers', pan: 'PAN numbers', upi: 'UPI IDs', email: 'email addresses' };

export default function PrivacyChip({ summary }) {
  const entries = Object.entries(summary || {}).filter(([, n]) => n > 0);
  const total = entries.reduce((a, [, n]) => a + n, 0);
  const detail = entries.map(([k, n]) => `${n} ${NAMES[k] || k}`).join(', ');
  return (
    <Pill
      className="bg-indigo-50 px-3 py-1 text-indigo-900 ring-1 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-100 dark:ring-indigo-800"
      title={total ? `Hidden before analysis: ${detail}` : 'No personal details found in this message'}
    >
      <span aria-hidden="true">🛡</span>
      {total ? `Privacy: ${total} detail${total === 1 ? '' : 's'} hidden before analysis` : 'Privacy: no personal details found'}
      {total > 0 && <span className="sr-only"> ({detail})</span>}
    </Pill>
  );
}
