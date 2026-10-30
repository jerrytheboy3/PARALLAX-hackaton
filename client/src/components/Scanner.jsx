import { Card } from './ui.jsx';

const TYPES = [
  { id: 'sms', label: 'SMS' },
  { id: 'email', label: 'Email' },
  { id: 'qr', label: 'QR' },
];
const LANG = { en: 'EN', kn: 'ಕನ್ನಡ', kanglish: 'Kanglish' };
export const MAX_CHARS = 5000;

const input =
  'w-full rounded-xl border-0 bg-white px-3 py-2 text-base ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-950 dark:ring-slate-700';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export default function Scanner({ form, onChange, onScan, loading, samples, onSample, error, qrSlot }) {
  const tooLong = form.text.length > MAX_CHARS;
  const canScan = !loading && form.text.trim().length > 0 && !tooLong;

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (canScan) onScan();
    }
  }

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canScan) onScan();
        }}
        onKeyDown={onKeyDown}
        className="space-y-4"
      >
        <div role="radiogroup" aria-label="Message type" className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={form.type === t.id}
              onClick={() => onChange({ type: t.id })}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                form.type === t.id ? 'bg-white text-slate-900 shadow dark:bg-slate-950 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {form.type === 'sms' && (
          <Field label="Sender ID / number (optional)">
            <input className={input} value={form.sender} onChange={(e) => onChange({ sender: e.target.value })} placeholder="e.g. VM-SBIINB or +91 98765 43210" maxLength={200} autoComplete="off" />
          </Field>
        )}
        {form.type === 'email' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="From (optional)">
              <input className={input} value={form.sender} onChange={(e) => onChange({ sender: e.target.value })} placeholder="alerts@bank.com" maxLength={200} autoComplete="off" />
            </Field>
            <Field label="Reply-To (optional)">
              <input className={input} value={form.replyTo} onChange={(e) => onChange({ replyTo: e.target.value })} placeholder="different address?" maxLength={200} autoComplete="off" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Subject (optional)">
                <input className={input} value={form.subject} onChange={(e) => onChange({ subject: e.target.value })} maxLength={200} autoComplete="off" />
              </Field>
            </div>
          </div>
        )}
        {form.type === 'qr' && qrSlot}

        <Field label={form.type === 'qr' ? 'Decoded QR content' : 'Message'}>
          <textarea
            className={`${input} min-h-44 resize-y font-sans leading-relaxed`}
            value={form.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder={form.type === 'qr' ? 'Drop a QR image above — its content appears here' : 'Paste the SMS or email here…'}
            spellCheck={false}
            aria-describedby="char-count"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canScan}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-lg font-bold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Scan message'}
          </button>
          <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">⌘/Ctrl + Enter</span>
          <span id="char-count" className={`ml-auto text-xs tabular-nums ${tooLong ? 'font-bold text-red-600' : 'text-slate-500 dark:text-slate-400'}`}>
            {form.text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </p>
        )}
      </form>

      {samples?.length > 0 && (
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Try a sample</div>
          <div className="flex flex-wrap gap-2">
            {samples.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSample(s)}
                title={s.text}
                className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 transition hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                  s.label === 'scam'
                    ? 'bg-red-50 text-red-900 ring-red-200 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900'
                    : 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-900'
                }`}
              >
                {LANG[s.lang] || s.lang} · {s.label === 'scam' ? (s.scamType || 'scam').replace('_', ' ') : 'normal'}
                {s.label !== 'scam' && /^[A-Z]{2}-[A-Z0-9]{3,9}$/i.test(s.sender || '') ? ` · ${s.sender.toUpperCase()}` : ''}
                {s.type !== 'sms' ? ` · ${s.type}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
