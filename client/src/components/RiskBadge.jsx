import { LEVELS } from '../lib/levels.js';

export default function RiskBadge({ level, score, verdict, senderVerified, senderTrusted }) {
  const meta = LEVELS[level] || LEVELS.caution;
  return (
    <div className={`rounded-2xl p-4 ring-1 sm:p-6 ${meta.soft}`} role="status" aria-live="polite" data-testid="risk-badge">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`flex items-center gap-3 rounded-2xl px-5 py-3 shadow-sm transition-colors duration-500 ${meta.badge}`}
        >
          <span className="text-4xl font-extrabold sm:text-5xl" aria-hidden="true">{meta.icon}</span>
          <span className="text-4xl font-extrabold uppercase tracking-tight sm:text-6xl">{meta.label}</span>
        </div>
        <div className="min-w-[8rem] flex-1">
          <div className="flex items-baseline justify-between text-sm font-semibold">
            <span>Risk score</span>
            <span className="text-2xl font-extrabold tabular-nums">
              {score}
              <span className="text-sm font-semibold opacity-70">/100</span>
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15" aria-hidden="true">
            <div className={`h-full rounded-full transition-all duration-700 ${meta.bar}`} style={{ width: `${Math.max(3, score)}%` }} />
          </div>
          <div className="mt-1 text-sm opacity-80">{meta.sub}</div>
        </div>
      </div>
      <p className="mt-4 text-lg font-semibold leading-snug sm:text-2xl">{verdict}</p>
      {(senderVerified || senderTrusted) && (
        <p className="mt-2 text-sm opacity-80">
          {senderVerified && 'Sender ID matches an official header for this organisation. '}
          {senderTrusted && 'You marked this sender as trusted — weak signs count less (serious ones never do).'}
        </p>
      )}
    </div>
  );
}
