import { Card, CardTitle } from './ui.jsx';

export default function VerifyCard({ verifySteps, reportSteps, level }) {
  return (
    <Card data-testid="verify-card">
      <CardTitle>Verify safely</CardTitle>
      <div className="space-y-4">
        {(verifySteps || []).map((v) => (
          <div key={v.orgId}>
            <h3 className="font-semibold">{v.title}</h3>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
              {v.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {(v.officialApp || v.officialDomains?.length > 0) && (
              <p className="mt-2 text-sm">
                {v.officialApp && (
                  <>
                    Official app: <strong>{v.officialApp}</strong>
                  </>
                )}
                {v.officialApp && v.officialDomains?.length > 0 && ' · '}
                {v.officialDomains?.length > 0 && (
                  <>
                    Official site{v.officialDomains.length > 1 ? 's' : ''}:{' '}
                    <span className="font-mono">{v.officialDomains.join(', ')}</span>{' '}
                    <span className="text-slate-500">(type it yourself)</span>
                  </>
                )}
              </p>
            )}
          </div>
        ))}
      </div>

      {reportSteps?.length > 0 && (
        <div className="mt-5 rounded-xl bg-slate-100 p-3 dark:bg-slate-800/70">
          <h3 className="font-semibold">
            {level === 'high' || level === 'critical' ? 'Report it' : 'If something feels wrong, report it'}
          </h3>
          <ul className="mt-1.5 space-y-1 text-sm">
            {reportSteps.map((r) => (
              <li key={r.id}>
                <strong>{r.title}</strong> — <span className="text-slate-700 dark:text-slate-300">{r.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
