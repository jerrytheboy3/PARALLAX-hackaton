// API client. Talks to the local server (same origin in demo mode, Vite proxy in dev).
// Falls back to mock data when VITE_USE_MOCK=true or the server can't be reached,
// and tells subscribers so the UI can show the "Demo data" pill.

import { mockAnalyze, mockExplain, mockHealth, mockReassess, mockSamples } from './mock.js';

const FORCE_MOCK = import.meta.env?.VITE_USE_MOCK === 'true';

let mode = FORCE_MOCK ? 'mock' : 'live';
const listeners = new Set();

export function getMode() {
  return mode;
}
export function isForcedMock() {
  return FORCE_MOCK;
}
export function onModeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function setMode(next) {
  if (FORCE_MOCK || next === mode) return;
  mode = next;
  listeners.forEach((fn) => fn(mode));
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const MOCKS = {
  'GET /health': () => mockHealth(),
  'GET /samples': () => mockSamples(),
  'POST /analyze': (b) => mockAnalyze(b),
  'POST /reassess': (b) => mockReassess(b),
  'POST /explain': (b) => mockExplain(b),
};

// Only these keys ever leave the browser. QR images are decoded locally — the image never does.
const ALLOWED_KEYS = ['text', 'type', 'sender', 'subject', 'replyTo', 'context', 'trustedSenders', 'disputedSignalIds', 'reason', 'trustSender'];

/** Build the exact request body for /analyze and /reassess from UI state (whitelisted keys only). */
export function buildPayload(form, extra = {}) {
  const src = { ...form, ...extra };
  const out = {};
  for (const k of ALLOWED_KEYS) {
    const v = src[k];
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '' && k !== 'text') continue;
    if (Array.isArray(v) && v.length === 0 && k !== 'disputedSignalIds') continue;
    out[k] = v;
  }
  if (out.type !== 'email') {
    delete out.subject;
    delete out.replyTo;
  }
  if (out.type !== 'qr') delete out.context;
  if (out.type === 'qr') delete out.sender;
  return out;
}

async function request(method, path, body, { timeoutMs = 20000 } = {}) {
  const mock = MOCKS[`${method} ${path}`];
  if (mode === 'mock') return mock(body);

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' && path === '/explain') return { explanation: null };
    setMode('mock');
    return mock(body);
  }
  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  if (!isJson) {
    // Vite proxy error page / server down → demo data
    setMode('mock');
    return mock(body);
  }
  const data = await res.json();
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  return data;
}

export async function health() {
  if (FORCE_MOCK) return mockHealth();
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(4000) });
    if (!(res.headers.get('content-type') || '').includes('application/json')) throw new Error('not json');
    const data = await res.json();
    setMode('live');
    return data;
  } catch {
    setMode('mock');
    return mockHealth();
  }
}

export const samples = () => request('GET', '/samples');
export const analyze = (payload) => request('POST', '/analyze', payload);
export const reassess = (payload) => request('POST', '/reassess', payload);
export const explain = (payload) => request('POST', '/explain', payload, { timeoutMs: 12000 });
