import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('..', import.meta.url));
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(path.join(d, f)).isDirectory() ? walk(path.join(d, f)) : [path.join(d, f)]));
const files = walk(src).filter((f) => /\.(jsx?|css)$/.test(f) && !f.includes('__tests__'));

describe('client static safety checks', () => {
  it('never uses dangerouslySetInnerHTML / innerHTML / eval', () => {
    for (const f of files) {
      const code = readFileSync(f, 'utf8');
      expect(code, f).not.toMatch(/dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(|new Function\(/);
    }
  });

  it('never loads anything from the internet (CDNs, Google Fonts, remote images)', () => {
    const html = readFileSync(path.join(src, '..', 'index.html'), 'utf8');
    expect(html).not.toMatch(/(src|href)=["']https?:\/\//);
    for (const f of files) {
      const code = readFileSync(f, 'utf8');
      expect(code, f).not.toMatch(/fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com|cdnjs/);
      expect(code, f).not.toMatch(/fetch\(\s*['"`]https?:/);
    }
  });

  it('renders links as text, never as anchors', () => {
    const code = readFileSync(path.join(src, 'components', 'LinksPanel.jsx'), 'utf8');
    expect(code).not.toMatch(/<a[\s>]/);
  });
});
