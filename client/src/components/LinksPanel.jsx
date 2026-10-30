import { Pill } from './ui.jsx';

const VERDICT = {
  ok: { label: 'Looks official', cls: 'bg-emerald-600 text-white' },
  suspicious: { label: 'Suspicious', cls: 'bg-amber-300 text-amber-950' },
  dangerous: { label: 'Dangerous', cls: 'bg-red-700 text-white' },
};

// Links are shown as plain text on purpose — never as anchors, never fetched.
export default function LinksPanel({ links }) {
  if (!links?.length) return <p className="text-sm text-slate-600 dark:text-slate-300">No links found.</p>;
  return (
    <ul className="space-y-2" data-testid="links-panel">
      {links.map((l, i) => {
        const v = VERDICT[l.verdict] || VERDICT.suspicious;
        return (
          <li key={`${l.url}-${i}`} className="rounded-xl p-3 ring-1 ring-slate-200 dark:ring-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <Pill className={v.cls}>{v.label}</Pill>
              <span className="min-w-0 break-all font-mono text-sm select-all">{l.url}</span>
            </div>
            {l.reasons?.length > 0 && (
              <ul className="mt-1.5 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
                {l.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
      <li className="text-xs text-slate-500 dark:text-slate-400">Links are shown as text and were never opened.</li>
    </ul>
  );
}
