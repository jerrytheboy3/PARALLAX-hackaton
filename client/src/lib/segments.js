// Split a message into non-overlapping segments so overlapping highlight spans render correctly.
// Each segment knows every signal that covers it. Boundaries are snapped to grapheme clusters
// so Kannada vowel signs / viramas are never split across two elements (no broken characters).

function graphemeBoundaries(text) {
  const set = new Set([0, text.length]);
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    for (const { index } of seg.segment(text)) set.add(index);
  } else {
    // Fallback: every index except inside surrogate pairs / before combining marks.
    for (let i = 1; i < text.length; i++) {
      const c = text.charCodeAt(i);
      const isLowSurrogate = c >= 0xdc00 && c <= 0xdfff;
      const isMark = /\p{M}/u.test(text[i]);
      if (!isLowSurrogate && !isMark) set.add(i);
    }
  }
  return [...set].sort((a, b) => a - b);
}

function snapDown(bounds, pos) {
  let best = 0;
  for (const b of bounds) {
    if (b <= pos) best = b;
    else break;
  }
  return best;
}

function snapUp(bounds, pos) {
  for (const b of bounds) if (b >= pos) return b;
  return bounds[bounds.length - 1];
}

/**
 * @param {string} text
 * @param {{key:string,start:number,end:number}[]} spans
 * @returns {{start:number,end:number,text:string,spans:object[]}[]}
 */
export function buildSegments(text, spans) {
  if (!text) return [];
  const valid = (spans || []).filter(
    (s) => Number.isInteger(s.start) && Number.isInteger(s.end) && s.start >= 0 && s.end <= text.length && s.start < s.end,
  );
  if (valid.length === 0) return [{ start: 0, end: text.length, text, spans: [] }];

  const bounds = graphemeBoundaries(text);
  const snapped = valid.map((s) => ({ ...s, start: snapDown(bounds, s.start), end: snapUp(bounds, s.end) }));

  const cuts = new Set([0, text.length]);
  for (const s of snapped) {
    cuts.add(s.start);
    cuts.add(s.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (a === b) continue;
    const covering = snapped.filter((s) => s.start <= a && s.end >= b);
    const prev = out[out.length - 1];
    if (prev && prev.spans.length === 0 && covering.length === 0) {
      prev.end = b;
      prev.text = text.slice(prev.start, b);
    } else {
      out.push({ start: a, end: b, text: text.slice(a, b), spans: covering });
    }
  }
  return out;
}
