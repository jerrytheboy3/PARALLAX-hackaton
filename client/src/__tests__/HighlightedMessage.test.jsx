// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import HighlightedMessage from '../components/HighlightedMessage.jsx';
import { buildSegments } from '../lib/segments.js';

afterEach(cleanup);

const sig = (key, start, end, strength = 'weak', id = key) => ({
  key, id, start, end, strength, weight: 10, category: 'other', explanation: `why ${key}`,
});

describe('HighlightedMessage', () => {
  it('renders <script> in a message as plain text, never as HTML', () => {
    const text = 'Hi <script>window.__pwned=1</script><img src=x onerror="window.__pwned=2"> share OTP';
    const start = text.indexOf('share OTP');
    const { container } = render(
      <HighlightedMessage text={text} signals={[sig('otp#0', start, start + 9, 'serious', 'otp_request')]} />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<script>window.__pwned=1</script>');
    expect(window.__pwned).toBeUndefined();
  });

  it('renders overlapping spans without losing or duplicating text', () => {
    const text = 'Pay now via bit.ly/x today';
    const signals = [sig('a', 0, 11), sig('b', 4, 20, 'serious'), sig('c', 12, 20)];
    const { container } = render(<HighlightedMessage text={text} signals={signals} />);
    const p = container.querySelector('[data-testid="highlighted-message"]');
    expect(p.textContent).toBe(text);
    const marks = [...container.querySelectorAll('mark')];
    // "now via" is covered by a and b
    const both = marks.find((m) => m.textContent === 'now via');
    expect(both.dataset.keys.split(' ').sort()).toEqual(['a', 'b']);
    // tooltip lists every covering signal
    fireEvent.focus(both);
    const tip = screen.getByRole('tooltip');
    expect(tip.textContent).toContain('why a');
    expect(tip.textContent).toContain('why b');
  });

  it('keeps Kannada text intact and never splits a grapheme cluster', () => {
    const text = 'ತಕ್ಷಣ OTP ಅನ್ನು ತಿಳಿಸಿ';
    // deliberately bad offsets that fall inside a cluster (after ತಕ್ before ಷ)
    const segs = buildSegments(text, [{ key: 'u', start: 2, end: 4 }]);
    expect(segs.map((s) => s.text).join('')).toBe(text);
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const bounds = new Set([...seg.segment(text)].map((s) => s.index).concat(text.length));
    for (const s of segs) {
      expect(bounds.has(s.start)).toBe(true);
      expect(bounds.has(s.end)).toBe(true);
    }
    const start = text.indexOf('ತಕ್ಷಣ');
    const { container } = render(<HighlightedMessage text={text} signals={[sig('k', start, start + 'ತಕ್ಷಣ'.length)]} />);
    expect(container.querySelector('mark').textContent).toBe('ತಕ್ಷಣ');
    expect(container.textContent).toBe(text);
  });

  it('ignores signals without offsets (sender signals) and out-of-range spans', () => {
    const text = 'hello';
    const { container } = render(
      <HighlightedMessage text={text} signals={[sig('s', null, null), sig('x', 3, 99)]} />,
    );
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.textContent).toBe('hello');
  });
});
