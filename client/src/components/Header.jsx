import Logo from './Logo.jsx';
import { Pill } from './ui.jsx';

function Dot({ on, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span className={`h-2.5 w-2.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export default function Header({ health, mode, theme, onToggleTheme, onOpenFeedback, feedbackCount = 0 }) {
  const engine = health?.engine === 'p2' ? 'P2' : 'stub';
  const aiReady = health?.ai === 'ready';
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div className="leading-tight">
            <div className="text-xl font-extrabold tracking-tight">TrustLens</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Catch the impersonation</div>
          </div>
        </div>
        {mode === 'mock' && (
          <Pill className="bg-amber-300 text-amber-950" title="The server isn't reachable (or VITE_USE_MOCK=true). Results are fake demo data.">
            Demo data
          </Pill>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <Dot on={!!health?.ok} label={`Engine: ${engine}`} />
          <Dot on={aiReady} label={aiReady ? 'AI: on-device ready' : 'AI: off'} />
          {onOpenFeedback && (
            <button
              type="button"
              onClick={onOpenFeedback}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
            >
              My feedback{feedbackCount ? ` (${feedbackCount})` : ''}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-lg p-2 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
        </div>
      </div>
      <div className="bg-indigo-600 px-4 py-1.5 text-center text-xs font-semibold text-white sm:text-sm">
        🔒 Runs fully on this device — no message leaves your laptop.
      </div>
    </header>
  );
}
