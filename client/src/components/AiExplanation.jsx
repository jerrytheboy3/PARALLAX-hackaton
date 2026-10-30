import { useEffect, useState } from 'react';
import { explain } from '../api/client.js';
import { Card, CardTitle } from './ui.jsx';

// Loads AFTER the main result. Hidden entirely if the local model is unavailable or fails.
export default function AiExplanation({ result, mode }) {
  const [lang, setLang] = useState('en');
  const [state, setState] = useState({ status: 'loading', text: null });

  useEffect(() => {
    if (!result?.aiAvailable) return undefined;
    let alive = true;
    setState({ status: 'loading', text: null });
    explain({
      redactedText: result.redactedText,
      level: result.level,
      lang,
      signals: result.signals.map(({ id, category, strength, evidence, explanation }) => ({ id, category, strength, evidence, explanation })),
    })
      .then((r) => alive && setState(r?.explanation ? { status: 'done', text: r.explanation } : { status: 'none', text: null }))
      .catch(() => alive && setState({ status: 'none', text: null }));
    return () => {
      alive = false;
    };
  }, [result, lang]);

  if (!result?.aiAvailable || state.status === 'none') return null;

  return (
    <Card className="tl-rise" data-testid="ai-explanation">
      <CardTitle
        aside={
          <button
            type="button"
            onClick={() => setLang((l) => (l === 'en' ? 'kn' : 'en'))}
            disabled={state.status === 'loading'}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50 dark:text-indigo-200 dark:ring-indigo-800 dark:hover:bg-indigo-950"
          >
            {lang === 'en' ? 'ಕನ್ನಡದಲ್ಲಿ' : 'In English'}
          </button>
        }
      >
        AI explanation (on-device)
      </CardTitle>
      {state.status === 'loading' ? (
        <div className="space-y-2" aria-busy="true" aria-label="Writing explanation">
          <div className="h-4 w-11/12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-10/12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-7/12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      ) : (
        <p className="text-base leading-relaxed">{state.text}</p>
      )}
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {mode === 'mock' ? 'Demo text (mock data). ' : ''}Generated locally — your message never left this laptop. The risk level above is decided by fixed rules, not by the AI.
      </p>
    </Card>
  );
}
