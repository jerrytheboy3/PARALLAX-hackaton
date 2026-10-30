// @vitest-environment jsdom
// Full UI flow with the server unreachable → automatic mock fallback ("Demo data").
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import App from '../App.jsx';

beforeAll(() => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function () {};
});
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

describe('App (mock fallback)', () => {
  it('shows Demo data, scans a sample, highlights it, and runs the legit flow', async () => {
    render(<App />);
    await screen.findByText('Demo data');
    expect(screen.getByText(/Runs fully on this device/)).toBeTruthy();

    const chip = await screen.findByRole('button', { name: /Kanglish · electricity/ });
    fireEvent.click(chip);
    const badge = await screen.findByTestId('risk-badge');
    expect(badge.textContent).toMatch(/High risk/i);
    const marks = document.querySelectorAll('mark');
    expect([...marks].map((m) => m.textContent)).toContain('pay maadi');

    fireEvent.click(screen.getByRole('button', { name: 'I think this is legit' }));
    const panel = await screen.findByTestId('legit-panel');
    fireEvent.click(within(panel).getByRole('button', { name: /Re-check/ }));
    const changes = await screen.findByTestId('changes-card', {}, { timeout: 3000 });
    expect(changes.textContent).toMatch(/Removed/);
    await waitFor(() => expect(screen.getByRole('button', { name: /My feedback \(1\)/ })).toBeTruthy());
    expect(localStorage.getItem('trustlens.feedback')).not.toContain('9876543210');
  });

  it('typed text with <script> is shown as text, and Ctrl+Enter scans', async () => {
    render(<App />);
    const box = await screen.findByPlaceholderText(/Paste the SMS/);
    fireEvent.change(box, { target: { value: '<script>window.__x=1</script> URGENT share your OTP' } });
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    const msg = await screen.findByTestId('highlighted-message');
    expect(msg.textContent).toContain('<script>');
    expect(document.querySelector('[data-testid="highlighted-message"] script')).toBeNull();
    expect(window.__x).toBeUndefined();
  });
});
