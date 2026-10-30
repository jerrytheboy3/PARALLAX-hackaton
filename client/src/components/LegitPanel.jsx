import { useEffect, useRef, useState } from 'react';
import { STRENGTH, signalTitle } from '../lib/levels.js';
import { groupSignals } from './WarningList.jsx';
import { Card } from './ui.jsx';

// "I think this is legit": pick the signs you disagree with, say why, optionally trust the sender.
export default function LegitPanel({ result, canTrustSender, busy, onSubmit, onCancel }) {
  const groups = groupSignals(result.signals);
  const [picked, setPicked] = useState(() => new Set(groups.filter((g) => g.strength === 'weak').map((g) => g.id)));
  const [reason, setReason] = useState('');
  const [trust, setTrust] = useState(false);
  const rootRef = useRef(null);
  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    rootRef.current?.querySelector('input')?.focus({ preventScroll: true });
  }, []);

  const toggle = (id) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <Card className="tl-rise scroll-mt-4 ring-2 ring-indigo-400 dark:ring-indigo-600" data-testid="legit-panel">
      <form
        ref={rootRef}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ disputedSignalIds: [...picked], reason: reason.trim(), trustSender: trust });
        }}
        className="space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold">Think this message is genuine?</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Tick the warning signs you think are wrong. Weak signs will be removed. Serious ones (OTP/PIN requests, money requests,
            dangerous links) stay — we’ll explain why.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">There are no warning signs to dispute.</p>
        ) : (
          <fieldset className="space-y-2">
            <legend className="sr-only">Warning signs you disagree with</legend>
            {groups.map((g) => (
              <label key={g.id} className="flex cursor-pointer items-start gap-3 rounded-xl p-2.5 ring-1 ring-slate-200 hover:bg-slate-50 dark:ring-slate-800 dark:hover:bg-slate-800/60">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-indigo-600" checked={picked.has(g.id)} onChange={() => toggle(g.id)} />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${STRENGTH[g.strength].pill}`}>{STRENGTH[g.strength].label}</span>
                    <span className="font-semibold">{signalTitle(g.id)}</span>
                  </span>
                  {g.strength === 'serious' && (
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Serious — will be kept even if ticked.</span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Why do you think it’s legit? (optional)</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            placeholder="e.g. This is my electricity guy, I know him"
            className="w-full rounded-xl border-0 bg-white px-3 py-2 ring-1 ring-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-950 dark:ring-slate-700"
          />
        </label>

        <label className={`flex items-center gap-3 ${canTrustSender ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
          <input
            type="checkbox"
            role="switch"
            disabled={!canTrustSender}
            checked={trust}
            onChange={(e) => setTrust(e.target.checked)}
            className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-slate-300 transition before:block before:h-4 before:w-4 before:translate-x-0.5 before:rounded-full before:bg-white before:transition checked:bg-indigo-600 checked:before:translate-x-4 dark:bg-slate-700"
          />
          <span className="text-sm">
            Trust this sender next time {!canTrustSender && <span className="text-slate-500">(no sender entered)</span>}
            <span className="block text-xs text-slate-500 dark:text-slate-400">Saved only in this browser. Makes weak signs count less — never hides serious ones.</span>
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50"
          >
            {busy ? 'Re-checking…' : 'Re-check with my feedback'}
          </button>
          <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 font-semibold ring-1 ring-slate-300 hover:bg-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

export function ChangesCard({ changes, before, after }) {
  if (!changes) return null;
  return (
    <Card className="tl-rise" data-testid="changes-card">
      <h2 className="font-bold">
        After your feedback: {before.level} {before.score} → <span className="uppercase">{after.level}</span> {after.score}
      </h2>
      {changes.length === 0 ? (
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Nothing was disputed, so nothing changed.</p>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {changes.map((c) => (
            <li key={c.id} className="flex gap-2">
              <span
                className={`mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                  c.action === 'dropped' ? 'bg-emerald-600 text-white' : 'bg-red-700 text-white'
                }`}
              >
                {c.action === 'dropped' ? 'Removed' : 'Kept'}
              </span>
              <span>
                <strong className={c.action === 'dropped' ? 'line-through decoration-2 opacity-70' : ''}>{signalTitle(c.id)}</strong>
                <span className="text-slate-600 dark:text-slate-300"> — {c.why}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
