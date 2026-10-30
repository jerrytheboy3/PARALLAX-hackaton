export default function Logo({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-indigo-600" />
      <circle cx="28" cy="28" r="13" fill="none" stroke="#fff" strokeWidth="6" />
      <path d="M38 38l12 12" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <path d="M22 28l4 4 8-8" fill="none" stroke="#a5f3fc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
