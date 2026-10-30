import { useEffect, useMemo, useRef, useState } from 'react';
import { buildSegments } from '../lib/segments.js';
import { STRENGTH, signalTitle } from '../lib/levels.js';

// Renders the message as plain React text nodes (never innerHTML), with every suspicious
// span wrapped in a focusable <mark>. Overlapping spans are split into segments; a segment
// covered by several signals lists all of them in its tooltip.

const TIP_WIDTH = 300;

function strongest(spans) {
  return spans.some((s) => s.strength === 'serious') ? 'serious' : 'weak';
}

export default function HighlightedMessage({ text, signals, hiddenKeys }) {
  const spans = useMemo(
    () => (signals || []).filter((s) => Number.isInteger(s.start) && Number.isInteger(s.end) && !hiddenKeys?.has(s.key)),
    [signals, hiddenKeys],
  );
  const segments = useMemo(() => buildSegments(text, spans), [text, spans]);
  const [active, setActive] = useState(null); // { index, top, left, pinned }
  const rootRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const close = () => setActive(null);
    const onKey = (e) => e.key === 'Escape' && close();
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) close();
    };
    window.addEventListener('scroll', close, { passive: true, capture: true });
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [active]);

  useEffect(() => setActive(null), [text, signals]);

  function open(index, el, pinned = false) {
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth || 1024;
    const left = Math.max(8, Math.min(r.left, vw - Math.min(TIP_WIDTH, vw - 16) - 8));
    setActive({ index, top: r.bottom + 6, left, pinned });
  }

  const activeSeg = active ? segments[active.index] : null;

  return (
    <div ref={rootRef}>
      <p
        className="whitespace-pre-wrap break-words text-base leading-[1.9] sm:text-lg"
        data-testid="highlighted-message"
      >
        {segments.map((seg, i) => {
          if (seg.spans.length === 0) return <span key={i}>{seg.text}</span>;
          const strength = strongest(seg.spans);
          const keys = seg.spans.map((s) => s.key).join(' ');
          const label = seg.spans.map((s) => signalTitle(s.id)).join('; ');
          return (
            <mark
              key={i}
              tabIndex={0}
              data-keys={keys}
              aria-label={`${seg.text} — ${label}`}
              aria-describedby={active?.index === i ? 'tl-tooltip' : undefined}
              className={`cursor-help rounded px-0.5 underline decoration-2 underline-offset-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 ${STRENGTH[strength].mark} ${seg.spans.length > 1 ? 'decoration-double' : ''}`}
              onMouseEnter={(e) => (!active?.pinned || active.index !== i) && open(i, e.currentTarget)}
              onMouseLeave={() => setActive((a) => (a?.pinned ? a : null))}
              onFocus={(e) => open(i, e.currentTarget, active?.pinned && active.index === i)}
              onBlur={() => setActive((a) => (a?.pinned ? a : null))}
              onClick={(e) => (active?.index === i && active.pinned ? setActive(null) : open(i, e.currentTarget, true))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  open(i, e.currentTarget, true);
                }
              }}
            >
              {seg.text}
            </mark>
          );
        })}
      </p>

      {activeSeg && activeSeg.spans.length > 0 && (
        <div
          id="tl-tooltip"
          role="tooltip"
          className="tl-rise fixed z-50 rounded-xl bg-slate-900 p-3 text-left text-sm text-white shadow-xl ring-1 ring-white/10 dark:bg-slate-100 dark:text-slate-900"
          style={{ top: active.top, left: active.left, width: `min(${TIP_WIDTH}px, calc(100vw - 16px))` }}
        >
          <ul className="space-y-2.5">
            {[...activeSeg.spans]
              .sort((a, b) => (a.strength === b.strength ? b.weight - a.weight : a.strength === 'serious' ? -1 : 1))
              .map((s) => (
                <li key={s.key}>
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${STRENGTH[s.strength].pill}`}>
                      {STRENGTH[s.strength].label}
                    </span>
                    <span className="font-semibold">{signalTitle(s.id)}</span>
                  </div>
                  <p className="mt-1 leading-snug opacity-90">{s.explanation}</p>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
