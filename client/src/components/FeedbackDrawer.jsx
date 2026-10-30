import { useEffect, useRef } from 'react';
import { LEVELS } from '../lib/levels.js';

export default function FeedbackDrawer({ open, onClose, entries, onDelete, onClear, trusted, onUntrust }) {
  const closeRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function exportJson() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), feedback: entries, trustedSenders: trusted }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trustlens-feedback-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-labelledby="fb-title">
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} aria-hidden="true" />
      <aside className="tl-rise absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <h2 id="fb-title" className="text-lg font-bold">My feedback</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-xl hover:bg-slate-100 dark:hover:bg-slate-800">
            ×
          </button>
        </div>
        <p className="px-4 pt-3 text-xs text-slate-500 dark:text-slate-400">
          Stored only in this browser (localStorage). Only a 60-character redacted preview is kept — never the full message.
        </p>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {entries.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-300">No feedback yet. Use “I think this is legit” on a result.</p>}
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl p-3 ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{new Date(e.at).toLocaleString()}</span>
                <button type="button" onClick={() => onDelete(e.id)} className="rounded px-1.5 py-0.5 font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950">
                  Delete
                </button>
              </div>
              <p className="mt-1 truncate font-mono text-sm">“{e.preview}”</p>
              <p className="mt-1 text-sm">
                {LEVELS[e.levelBefore]?.label} → <strong>{LEVELS[e.levelAfter]?.label}</strong>
                {e.dropped?.length > 0 && <span className="text-slate-600 dark:text-slate-300"> · removed {e.dropped.length}</span>}
                {e.kept?.length > 0 && <span className="text-slate-600 dark:text-slate-300"> · kept {e.kept.length} serious</span>}
              </p>
              {e.reason && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Your reason: {e.reason}</p>}
            </div>
          ))}
          {trusted.length > 0 && (
            <div className="pt-2">
              <h3 className="mb-2 text-sm font-semibold">Trusted senders</h3>
              <ul className="space-y-1">
                {trusted.map((t) => (
                  <li key={t} className="flex items-center justify-between rounded-lg px-2 py-1 text-sm ring-1 ring-slate-200 dark:ring-slate-800">
                    <span className="font-mono">{t}</span>
                    <button type="button" onClick={() => onUntrust(t)} className="text-xs font-semibold text-red-700 dark:text-red-300">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
          <button type="button" onClick={exportJson} disabled={!entries.length && !trusted.length} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Export JSON
          </button>
          <button type="button" onClick={onClear} disabled={!entries.length && !trusted.length} className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-slate-300 disabled:opacity-50 dark:ring-slate-700">
            Clear all
          </button>
        </div>
      </aside>
    </div>
  );
}
