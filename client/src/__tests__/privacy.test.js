// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import QRCode from 'qrcode';
import { buildPayload } from '../api/client.js';
import { decodeImageData } from '../lib/qr.js';
import { makeFeedbackEntry, saveFeedback, loadFeedback, PREVIEW_CHARS, addTrusted, loadTrusted } from '../lib/feedback.js';
import { load, save } from '../lib/storage.js';

/** Render a QR string into an RGBA ImageData-like object (no canvas needed). */
function qrImageData(text, scale = 6, margin = 4) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const size = (n + margin * 2) * scale;
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (qr.modules.get(y, x))
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            const i = (((y + margin) * scale + dy) * size + (x + margin) * scale + dx) * 4;
            data[i] = data[i + 1] = data[i + 2] = 0;
          }
  return { data, width: size, height: size };
}

describe('QR stays in the browser', () => {
  it('decodes a QR image locally with jsQR (no network)', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const text = 'upi://pay?pa=cashback.rewards@ybl&pn=Amazon%20Rewards&am=4999';
    expect(decodeImageData(qrImageData(text))).toBe(text);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('the analyze request body contains decoded text only — never the image', () => {
    const fakeImage = new File([new Uint8Array([137, 80, 78, 71])], 'qr.png', { type: 'image/png' });
    const form = { type: 'qr', text: 'upi://pay?pa=x@ybl', context: 'scan to receive', sender: '9876543210', file: fakeImage, image: 'data:image/png;base64,iVBORw0KGgo=', preview: 'blob:http://x/1' };
    const body = buildPayload(form, { trustedSenders: [] });
    expect(Object.keys(body).sort()).toEqual(['context', 'text', 'type']);
    const json = JSON.stringify(body);
    expect(json).not.toMatch(/data:image|blob:|base64|\.png/);
  });

  it('buildPayload only sends whitelisted fields for each type', () => {
    expect(Object.keys(buildPayload({ type: 'sms', text: 'hi', sender: 'VM-X', subject: 's', replyTo: 'r', context: 'c', secret: 1 })).sort()).toEqual(['sender', 'text', 'type']);
    expect(Object.keys(buildPayload({ type: 'email', text: 'hi', sender: 'a@b.com', subject: 's', replyTo: 'r@b.com' })).sort()).toEqual(['replyTo', 'sender', 'subject', 'text', 'type']);
  });
});

describe('localStorage feedback', () => {
  beforeEach(() => localStorage.clear());

  it('stores only a 60-char redacted preview — never the full message', () => {
    const full = 'Dear customer call 9876543210 and share OTP 482913 '.repeat(5);
    const before = { level: 'high', score: 72, redactedText: 'Dear customer call [PHONE] and share OTP [OTP] '.repeat(5) };
    const after = { ...before, level: 'caution', score: 30, changes: [{ id: 'urgency', action: 'dropped' }, { id: 'otp_request', action: 'kept' }] };
    saveFeedback([makeFeedbackEntry({ before, after, disputedSignalIds: ['urgency'], reason: 'friend', trustSender: false, type: 'sms' })]);
    const stored = localStorage.getItem('trustlens.feedback');
    expect(stored).not.toContain(full);
    expect(stored).not.toContain('9876543210');
    expect(stored).not.toContain('482913');
    const [entry] = loadFeedback();
    expect(entry.preview.length).toBeLessThanOrEqual(PREVIEW_CHARS);
    expect(entry).toMatchObject({ levelBefore: 'high', levelAfter: 'caution', dropped: ['urgency'], kept: ['otp_request'] });
  });

  it('survives broken / unavailable storage', () => {
    localStorage.setItem('trustlens.feedback', '{not json');
    expect(loadFeedback()).toEqual([]);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(save('x', 1)).toBe(false);
    spy.mockRestore();
    const g = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(load('x', 'fallback')).toBe('fallback');
    g.mockRestore();
  });

  it('trusted senders are de-duplicated', () => {
    addTrusted('VM-SBIINB');
    addTrusted('VM-SBIINB');
    expect(loadTrusted()).toEqual(['VM-SBIINB']);
  });
});
