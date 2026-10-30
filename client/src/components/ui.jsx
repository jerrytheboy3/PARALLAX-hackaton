export function Card({ className = '', children, ...rest }) {
  return (
    <section
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5 dark:bg-slate-900 dark:ring-slate-800 ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, aside }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{children}</h2>
      {aside}
    </div>
  );
}

export function Pill({ className = '', children, ...rest }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${className}`} {...rest}>
      {children}
    </span>
  );
}
