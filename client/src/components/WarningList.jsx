import { STRENGTH, signalTitle } from '../lib/levels.js';

/** Group signal instances by id, serious first, then by weight. */
export function groupSignals(signals) {
  const groups = new Map();
  for (const s of signals || []) {
    const g = groups.get(s.id) || { id: s.id, strength: s.strength, category: s.category, weight: 0, explanation: s.explanation, items: [], keptNote: null, source: s.source };
    g.items.push(s);
    g.weight = Math.max(g.weight, s.weightApplied ?? s.weight);
    if (s.strength === 'serious') g.strength = 'serious';
    if (s.keptNote) g.keptNote = s.keptNote;
    groups.set(s.id, g);
  }
  return [...groups.values()].sort((a, b) =>
    a.strength === b.strength ? b.weight - a.weight : a.strength === 'serious' ? -1 : 1,
  );
}

export function flashSignal(keys) {
  for (const key of keys) {
    const el = document.querySelector(`mark[data-keys~="${CSS.escape(key)}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.remove('tl-flash');
      void el.offsetWidth; // restart animation
      el.classList.add('tl-flash');
      setTimeout(() => el.classList.remove('tl-flash'), 1300);
      return true;
    }
  }
  return false;
}

export default function WarningList({ signals, fadingIds }) {
  const groups = groupSignals(signals);
  if (groups.length === 0) {
    return <p className="text-slate-600 dark:text-slate-300">No warning signs were found in this message.</p>;
  }
  return (
    <ul className="space-y-2" data-testid="warning-list">
      {groups.map((g) => {
        const hasSpan = g.items.some((s) => Number.isInteger(s.start));
        const evidence = [...new Set(g.items.map((s) => s.evidence).filter(Boolean))].slice(0, 3);
        const fading = fadingIds?.has(g.id);
        return (
          <li key={g.id} className={`tl-rise overflow-hidden ${fading ? 'tl-fade-out' : ''}`}>
            <button
              type="button"
              disabled={!hasSpan}
              onClick={() => flashSignal(g.items.map((s) => s.key))}
              className="w-full rounded-xl p-3 text-left ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-default disabled:hover:bg-transparent dark:ring-slate-800 dark:hover:bg-slate-800/60"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase ${STRENGTH[g.strength].pill}`}>
                  {STRENGTH[g.strength].label}
                </span>
                <span className="font-semibold">{signalTitle(g.id)}</span>
                {g.items.length > 1 && <span className="text-xs text-slate-500">×{g.items.length}</span>}
                {!hasSpan && <span className="text-xs text-slate-500 dark:text-slate-400">about the sender</span>}
                <span className="ml-auto text-xs tabular-nums text-slate-500 dark:text-slate-400">+{Math.round(g.weight)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{g.explanation}</p>
              {evidence.length > 0 && (
                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  Found: {evidence.map((e) => `“${e}”`).join(', ')}
                </p>
              )}
              {g.keptNote && (
                <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-900 dark:bg-red-950/50 dark:text-red-100">
                  Can’t remove this: {g.keptNote}
                </p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
