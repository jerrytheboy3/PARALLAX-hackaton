import { useEffect, useRef, useState } from 'react';
import { decodeQrFromBlob, QR_SAMPLES } from '../lib/qr.js';

// Drop / pick / paste a QR image. Decoded locally with jsQR — the image never leaves the browser.
export default function QrInput({ context, onContext, onDecoded }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  async function handle(blob) {
    if (!blob) return;
    setError(null);
    setBusy(true);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(blob);
    });
    try {
      const text = await decodeQrFromBlob(blob);
      onDecoded(text);
    } catch (e) {
      setError(e.message || 'Could not read that image.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onPaste(e) {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      if (item) {
        e.preventDefault();
        handle(item.getAsFile());
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSample(file) {
    try {
      const res = await fetch(file); // bundled with the app (same origin, offline)
      handle(await res.blob());
    } catch {
      setError('Could not load the sample image.');
    }
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a QR code image"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inputRef.current?.click())}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-32 cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed p-4 transition focus-visible:outline-2 focus-visible:outline-indigo-500 ${
          drag ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-300 hover:border-indigo-400 dark:border-slate-700'
        }`}
      >
        {preview ? (
          <img src={preview} alt="QR code you added" className="h-24 w-24 rounded-lg bg-white object-contain ring-1 ring-slate-200" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 text-4xl dark:bg-slate-800" aria-hidden="true">
            ▦
          </div>
        )}
        <div className="text-sm">
          <div className="font-semibold">{busy ? 'Reading QR…' : 'Drop a QR image, click to choose, or paste (⌘/Ctrl+V)'}</div>
          <div className="mt-1 text-slate-500 dark:text-slate-400">Decoded on this device — the image is never uploaded.</div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium text-slate-600 dark:text-slate-300">Sample QR:</span>
        {QR_SAMPLES.map((s) => (
          <button
            key={s.file}
            type="button"
            onClick={() => loadSample(s.file)}
            className={`rounded-full px-2.5 py-1 font-semibold ring-1 focus-visible:outline-2 focus-visible:outline-indigo-500 ${
              s.scam ? 'bg-red-50 text-red-900 ring-red-200 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-900' : 'bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:ring-emerald-900'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Message that came with the QR (optional)</span>
        <input
          className="w-full rounded-xl border-0 bg-white px-3 py-2 text-base ring-1 ring-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:bg-slate-950 dark:ring-slate-700"
          value={context}
          maxLength={1000}
          onChange={(e) => onContext(e.target.value)}
          placeholder='e.g. "Scan this to receive your refund"'
        />
      </label>
    </div>
  );
}
