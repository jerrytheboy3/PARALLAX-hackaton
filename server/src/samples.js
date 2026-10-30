import { existsSync, readFileSync } from 'node:fs';

const DATA = new URL('../../data/', import.meta.url);
const MAX_PER_GROUP = 2;

function readJson(name) {
  const url = new URL(name, DATA);
  if (!existsSync(url)) return null;
  try {
    const data = JSON.parse(readFileSync(url, 'utf8'));
    return Array.isArray(data) && data.length ? data : null;
  } catch {
    return null;
  }
}

/** Sample chips for the UI: P1's dataset if present (a balanced handful), else the 10-message seed. */
export function loadSamples() {
  const dataset = readJson('messages.json');
  if (dataset) {
    const groups = new Map();
    for (const m of dataset) {
      if (!m?.text || !m?.id) continue;
      const k = `${m.lang}|${m.label}|${m.type}`;
      const g = groups.get(k) || [];
      if (g.length < MAX_PER_GROUP) g.push(m);
      groups.set(k, g);
    }
    return { source: 'dataset', samples: [...groups.values()].flat().slice(0, 16) };
  }
  return { source: 'seed', samples: readJson('seed.json') || [] };
}
