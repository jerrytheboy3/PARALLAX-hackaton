import RiskBadge from './RiskBadge.jsx';
import PrivacyChip from './PrivacyChip.jsx';
import HighlightedMessage from './HighlightedMessage.jsx';
import WarningList from './WarningList.jsx';
import LinksPanel from './LinksPanel.jsx';
import VerifyCard from './VerifyCard.jsx';
import { Card, CardTitle } from './ui.jsx';

const SAFE_TIPS = [
  'Low risk is not a guarantee — scammers keep changing their words.',
  'Never share an OTP, PIN, CVV or password with anyone, even "bank staff".',
  'If a message asks you to pay or click, open the official app yourself instead.',
];

export function ResultsEmpty() {
  return (
    <Card className="flex min-h-[28rem] flex-col items-center justify-center text-center">
      <div className="text-5xl" aria-hidden="true">🔍</div>
      <h2 className="mt-3 text-xl font-bold">Paste a message to check it</h2>
      <p className="mt-2 max-w-md text-slate-600 dark:text-slate-300">
        TrustLens highlights the exact words that look like a scam, explains why, and tells you how to verify safely.
        Works for SMS, email and QR codes — in English, ಕನ್ನಡ and Kanglish.
      </p>
    </Card>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Analysing">
      <div className="h-44 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-36 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export default function Results({ result, text, hiddenKeys, fadingIds, aiSlot, legitSlot, changesSlot }) {
  const displayText = result.displayText ?? text;
  return (
    <div className="space-y-4" data-testid="results">
      <RiskBadge
        level={result.level}
        score={result.score}
        verdict={result.verdict}
        senderVerified={result.senderVerified}
        senderTrusted={result.senderTrusted}
      />
      {result.engineError && (
        <p role="alert" className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-100">
          The detection engine hit a problem on this message, so only partial checks ran. Treat the result with extra care.
        </p>
      )}
      {changesSlot}

      {result.qr?.kind === 'upi' && (
        <Card className="ring-2 ring-red-300 dark:ring-red-800" data-testid="upi-card">
          <CardTitle>UPI QR details</CardTitle>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">Pays to</dt>
            <dd className="break-all font-semibold">
              {result.qr.payeeName || '(no name)'} <span className="font-mono font-normal">{result.qr.payeeVpa}</span>
            </dd>
            {result.qr.amount && (
              <>
                <dt className="text-slate-500 dark:text-slate-400">Amount</dt>
                <dd className="font-semibold">₹{result.qr.amount}</dd>
              </>
            )}
            {result.qr.note && (
              <>
                <dt className="text-slate-500 dark:text-slate-400">Note</dt>
                <dd>{result.qr.note}</dd>
              </>
            )}
          </dl>
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-900 dark:bg-red-950/50 dark:text-red-100">{result.qr.notice}</p>
        </Card>
      )}

      <Card>
        <CardTitle aside={<PrivacyChip summary={result.redactionSummary} />}>The message</CardTitle>
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
          <HighlightedMessage text={displayText} signals={result.signals} hiddenKeys={hiddenKeys} />
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Hover, tap or tab to a highlight to see why it was flagged. <span className="font-semibold text-red-700 dark:text-red-300">Red</span> = serious,{' '}
          <span className="font-semibold text-amber-700 dark:text-amber-300">amber</span> = weak.
        </p>
      </Card>

      <Card>
        <CardTitle aside={legitSlot}>Warning signs</CardTitle>
        <WarningList signals={result.signals} fadingIds={fadingIds} />
        {result.combos?.length > 0 && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Extra risk because signs appear together: {result.combos.map((c) => `${c.label} (+${c.bonus})`).join(' · ')}
          </p>
        )}
      </Card>

      {aiSlot}

      {result.level === 'safe' && (
        <Card className="bg-emerald-50/60 dark:bg-emerald-950/20">
          <CardTitle>Still, stay alert</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {SAFE_TIPS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardTitle>Links found</CardTitle>
        <LinksPanel links={result.links} />
      </Card>

      <VerifyCard verifySteps={result.verifySteps} reportSteps={result.reportSteps} level={result.level} />
    </div>
  );
}
