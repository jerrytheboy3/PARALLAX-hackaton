import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Scanner from './components/Scanner.jsx';
import QrInput from './components/QrInput.jsx';
import Results, { ResultsEmpty, ResultsSkeleton } from './components/Results.jsx';
import AiExplanation from './components/AiExplanation.jsx';
import LegitPanel, { ChangesCard } from './components/LegitPanel.jsx';
import FeedbackDrawer from './components/FeedbackDrawer.jsx';
import { analyze, reassess, buildPayload, getMode, health as fetchHealth, onModeChange, samples as fetchSamples } from './api/client.js';
import { EXTRA_SAMPLES } from './api/mock.js';
import { load, save } from './lib/storage.js';
import { addTrusted, clearFeedback, loadFeedback, loadTrusted, makeFeedbackEntry, removeTrusted, saveFeedback } from './lib/feedback.js';

const EMPTY_FORM = { type: 'sms', text: '', sender: '', subject: '', replyTo: '', context: '' };
const FADE_MS = 650;

function initialTheme() {
  const saved = load('trustlens.theme', null);
  if (saved === 'dark' || saved === 'light') return saved;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export default function App() {
  const [theme, setTheme] = useState(initialTheme);
  const [mode, setMode] = useState(getMode());
  const [health, setHealth] = useState(null);
  const [samples, setSamples] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const formRef = useRef(form);
  formRef.current = form;
  const [scanned, setScanned] = useState(null); // { form } snapshot of what was analysed
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [legitOpen, setLegitOpen] = useState(false);
  const [legitBusy, setLegitBusy] = useState(false);
  const [changes, setChanges] = useState(null); // { before, after }
  const [fadingIds, setFadingIds] = useState(null);
  const [hiddenKeys, setHiddenKeys] = useState(null);

  const [feedback, setFeedback] = useState(loadFeedback);
  const [trusted, setTrusted] = useState(loadTrusted);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    save('trustlens.theme', theme);
  }, [theme]);

  useEffect(() => onModeChange(setMode), []);

  useEffect(() => {
    let alive = true;
    const tick = () => fetchHealth().then((h) => alive && setHealth(h));
    tick();
    const id = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    fetchSamples()
      .then((r) => {
        const list = r?.samples || [];
        const extras = EXTRA_SAMPLES.filter((e) => !list.some((s) => s.id === e.id));
        setSamples([...list, ...extras]);
      })
      .catch(() => setSamples(EXTRA_SAMPLES));
  }, [mode]);

  const scan = useCallback(
    async (f) => {
      const current = f || formRef.current;
      if (!current.text.trim()) return;
      setLoading(true);
      setError(null);
      setLegitOpen(false);
      setChanges(null);
      try {
        const r = await analyze(buildPayload(current, { trustedSenders: trusted }));
        setResult(r);
        setScanned({ form: current });
      } catch (e) {
        setError(e.message || 'Something went wrong. Try again.');
      } finally {
        setLoading(false);
      }
    },
    [trusted],
  );

  function pickSample(s) {
    const next = { ...EMPTY_FORM, type: s.type || 'sms', text: s.text, sender: s.sender || '', subject: s.subject || '', replyTo: s.replyTo || '' };
    setForm(next);
    scan(next);
  }

  async function submitLegit({ disputedSignalIds, reason, trustSender }) {
    if (!scanned || !result) return;
    setLegitBusy(true);
    setError(null);
    try {
      const sender = scanned.form.sender;
      const after = await reassess(buildPayload(scanned.form, { trustedSenders: trusted, disputedSignalIds, reason, trustSender }));
      const before = result;
      const droppedIds = new Set(after.changes.filter((c) => c.action === 'dropped').map((c) => c.id));
      setLegitOpen(false);
      setFadingIds(droppedIds);
      setHiddenKeys(new Set(before.signals.filter((s) => droppedIds.has(s.id)).map((s) => s.key)));
      setTimeout(() => {
        setResult(after);
        setChanges({ before, after });
        setFadingIds(null);
        setHiddenKeys(null);
      }, FADE_MS);
      if (trustSender && sender) setTrusted(addTrusted(sender));
      const next = [makeFeedbackEntry({ before, after, disputedSignalIds, reason, trustSender, type: scanned.form.type }), ...feedback];
      saveFeedback(next);
      setFeedback(next);
    } catch (e) {
      setError(e.message || 'Could not re-check. Try again.');
    } finally {
      setLegitBusy(false);
    }
  }

  const legitButton =
    result && result.signals.length > 0 && !legitOpen ? (
      <button
        type="button"
        onClick={() => setLegitOpen(true)}
        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-300 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-indigo-200 dark:ring-indigo-700 dark:hover:bg-indigo-950"
      >
        I think this is legit
      </button>
    ) : null;

  return (
    <div className="min-h-screen">
      <Header
        health={health}
        mode={mode}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenFeedback={() => setDrawerOpen(true)}
        feedbackCount={feedback.length}
      />
      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:py-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <Scanner
            form={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onScan={() => scan()}
            loading={loading}
            samples={samples}
            onSample={pickSample}
            error={error}
            qrSlot={
              <QrInput
                context={form.context}
                onContext={(context) => setForm((f) => ({ ...f, context }))}
                onDecoded={(text) => {
                  const next = { ...formRef.current, type: 'qr', text };
                  setForm(next);
                  scan(next);
                }}
              />
            }
          />
        </div>
        <div className="min-w-0 space-y-4">
          {loading ? (
            <ResultsSkeleton />
          ) : result && scanned ? (
            <>
              {legitOpen && (
                <LegitPanel
                  result={result}
                  canTrustSender={!!scanned.form.sender && scanned.form.type !== 'qr'}
                  busy={legitBusy}
                  onSubmit={submitLegit}
                  onCancel={() => setLegitOpen(false)}
                />
              )}
              <Results
                result={result}
                text={scanned.form.text}
                hiddenKeys={hiddenKeys}
                fadingIds={fadingIds}
                legitSlot={legitButton}
                changesSlot={changes && <ChangesCard changes={changes.after.changes} before={changes.before} after={changes.after} />}
                aiSlot={<AiExplanation key={`${result.redactedText}|${result.level}|${result.score}`} result={result} mode={mode} />}
              />
            </>
          ) : (
            <ResultsEmpty />
          )}
        </div>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-slate-500 dark:text-slate-400">
        TrustLens · Parallax hackathon PS-03 · Rule-based scoring, on-device AI explanations only
      </footer>
      <FeedbackDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        entries={feedback}
        trusted={trusted}
        onDelete={(id) => {
          const next = feedback.filter((e) => e.id !== id);
          saveFeedback(next);
          setFeedback(next);
        }}
        onClear={() => {
          clearFeedback();
          setFeedback([]);
          save('trustlens.trustedSenders', []);
          setTrusted([]);
        }}
        onUntrust={(s) => setTrusted(removeTrusted(s))}
      />
    </div>
  );
}
