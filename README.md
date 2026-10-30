# TrustLens — Catch the Impersonation

> **Pitch (placeholder — P1 to finalise):** TrustLens tells you in one glance whether an SMS, email or QR code is a scam — in English, ಕನ್ನಡ and Kanglish — and shows *exactly which words* gave it away. It runs entirely on your laptop: no message ever leaves the device.

Built for the **Parallax 24-hour hackathon, problem statement PS-03 — "TrustLens: Catch the Impersonation"**.

- Paste an SMS or email, or drop a QR code image. The result is a big **Safe / Caution / High / Critical** badge, a one-line verdict and every suspicious phrase highlighted with an explanation.
- **Rule-based, explainable scoring.** Every point of the score traces back to a detected signal. An optional **local** AI model writes a plain-language explanation, but it never decides the risk.
- **"Verify safely" steps** for 21 Indian organisations (banks, BESCOM, India Post, couriers, UPI apps, Income Tax, UIDAI, police/"digital arrest", telecoms, jobs), plus reporting via 1930, cybercrime.gov.in and Chakshu.
- **"I think this is legit"**: users can dispute weak signs, but serious ones (OTP/PIN requests, money requests, dangerous links) can never be argued away.
- **Privacy first.** Personal data is redacted *before* analysis, nothing is stored on the server, nothing is logged, links are never opened, and QR images never leave the browser. See [PRIVACY.md](PRIVACY.md).

---

## Architecture

```
 ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
 │    Input     │──▶│    Redact    │──▶│    Engine    │──▶│    Score     │──▶│ Verify steps │──▶│ AI explain   │──▶│ Legit        │
 │ SMS / email /│   │ phone, OTP,  │   │ P2's detect()│   │ rule-based,  │   │ per org +    │   │ local Ollama │   │ feedback     │
 │ QR (decoded  │   │ account, card│   │ on REDACTED  │   │ one config,  │   │ 1930 /       │   │ redacted in, │   │ weak signals │
 │ in browser)  │   │ Aadhaar, PAN,│   │ text → spans │   │ Safe…Critical│   │ cybercrime / │   │ optional,    │   │ drop, serious│
 │              │   │ UPI, email   │   │ mapped back  │   │              │   │ Chakshu      │   │ never scores │   │ stay         │
 └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
   client/           server/src/        engine/            server/src/        server/src/        server/src/        server/src/
   lib/qr.js         redact.js          index.js           scoring.js         orgs.json          ai.js              pipeline.js
                                                                                                                    (reassess)
```

Everything runs on **one laptop**: React UI ⇄ Express on `127.0.0.1:5050` ⇄ (optional) Ollama on `127.0.0.1:11434`.

```
/client     React (Vite) + Tailwind v4 — the UI judges see                     (P4)
/server     Express API: redaction, pipeline, scoring, orgs, AI, QR, logger    (P3)
/engine     detection engine — index.js is the swap point, stub.js is a STUB   (P2)
/baseline   keyword-filter baseline (stub until P1's lands)                   (P1)
/data       seed.json (10 messages) · messages.json (P1's dataset, later)     (P1)
/scripts    eval.js · check-offline.js · make-qr.js
/tests      contract.test.js — validates whatever engine/dataset is plugged in
```

## Run it offline on a Mac

**Once, while you still have internet:**

```bash
brew install node
```

```bash
npm install
```

```bash
brew install ollama
```

```bash
ollama serve
```

Then, in another terminal:

```bash
ollama pull llama3.2:3b
```

Ollama is optional. Without it, the AI explanation section is simply hidden.

**Demo (Wi-Fi can be off):**

```bash
npm run demo
```

Open **http://127.0.0.1:5050**. One command and one port: it builds the client, checks that the bundle has no remote references, and serves it from the API server.

| Command | What it does |
|---|---|
| `npm run dev` | API on :5050 + Vite on http://127.0.0.1:5173 with hot reload |
| `npm run demo` | Build the client and serve everything from http://127.0.0.1:5050 |
| `npm test` | All tests (server, client, privacy/security, engine contract) |
| `npm run eval` | Run the dataset through the full pipeline (and baseline) and print accuracy |
| `VITE_USE_MOCK=true npm run dev -w client` | UI only, fake data, no backend needed |

Configuration (all optional, see [.env.example](.env.example)): `HOST` (default `127.0.0.1`), `API_PORT` (5050), `OLLAMA_URL` (must be loopback), `OLLAMA_MODEL` (`llama3.2:3b`), `OLLAMA_TIMEOUT_MS` (8000).

If the server is unreachable, the UI falls back to built-in demo data and shows a **"Demo data"** pill, so it never looks broken and nobody is fooled.

## API

All JSON, stateless, nothing persisted. Full shapes are in [CONTRACT.md §4](CONTRACT.md#4-http-api-p3--p4).

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/api/health` | — | `{ ok, engine: "stub"\|"p2", ai: "ready"\|"unavailable", model }` |
| GET | `/api/samples` | — | sample messages for the UI chips |
| POST | `/api/analyze` | `{ text, type: "sms"\|"email"\|"qr", sender?, subject?, replyTo?, context?, trustedSenders? }` | `{ level, score, verdict, signals, links, orgs, verifySteps, reportSteps, redactedText, redactionSummary, aiAvailable, engine, … }` |
| POST | `/api/explain` | `{ redactedText, signals, level, lang?: "en"\|"kn" }` | `{ explanation: string \| null }` (8 s timeout) |
| POST | `/api/reassess` | analyze body + `{ disputedSignalIds, reason, trustSender }` | analyze result + `changes: [{ id, action: "dropped"\|"kept", why }]` |

Limits: `text` ≤ 5,000 chars, body ≤ 20 KB (413), 60 requests/min, invalid input returns 400.

## How scoring works

All numbers live in one object, `SCORING` in [server/src/scoring.js](server/src/scoring.js).

- `score = Σ signal weights (each signal id counted once) + combination bonuses`, capped at 100.
  - Example combos: credential + link +20, impersonation + link +15, urgency + money +10, threat + police +20.
- Levels: **Safe** < 20 ≤ **Caution** < 45 ≤ **High** < 75 ≤ **Critical**.
- **Weak signals alone never exceed Caution. Critical requires at least one serious signal.**
- A sender matching the organisation's official SMS header or email domain, or one the user trusts, halves *weak* weights. Serious signals are never reduced.

## Plugging in P1 and P2

- **P2 (engine):** put your code in `engine/p2/`, change the two lines in [engine/index.js](engine/index.js), then run `npm test`. [tests/contract.test.js](tests/contract.test.js) checks the output shape, `text.slice(start, end) === evidence`, determinism, no network calls, and robustness on tricky input.
- **P1 (dataset):** save `data/messages.json` (same schema as [data/seed.json](data/seed.json)). `npm test` validates it, `npm run eval` scores it, and the UI samples switch to it.
- **P1 (baseline):** replace [baseline/index.js](baseline/index.js) with `keywordFilter(text) → { flagged, matched }`. `npm run eval` prints it next to TrustLens.

Details: [CONTRACT.md](CONTRACT.md).

## Team

| Role | Owner | Scope |
|---|---|---|
| P1 | _name_ | Dataset (150–200 msgs, EN / ಕನ್ನಡ / Kanglish), keyword baseline, accuracy numbers, pitch |
| P2 | _name_ | Detection engine: links, senders, word lists, anti-trick normalisation |
| P3 | _name_ | Backend, PII redaction, local AI, scoring, verify steps, legit logic, privacy/security tests, docs |
| P4 | _name_ | Frontend: scanner, risk badge, highlights, verify card, legit flow, QR upload |

## Limitations

- **The engine is currently a stub** with a handful of patterns. Real coverage depends on P2's engine. The 100% score on `seed.json` means nothing, because the stub was written against those 10 messages.
- Redaction is pattern-based. It catches numbers and IDs, not names or postal addresses. A number in an unusual format can slip through (it still never leaves the laptop).
- Org detection uses alias lists. Official domains and SMS headers in `orgs.json` should be re-checked; a wrong header only halves weak weights.
- Kanglish spelling varies a lot, and the stub knows only a few spellings.
- The AI explanation quality depends on the local model (llama3.2:3b is small). It is guarded but can still be bland.
- Trusted senders and feedback live in this browser's localStorage, so they are not synced and anyone using the same browser profile can read them.
- No image OCR: screenshots of SMS are not read, only QR codes.

## Future scope

- Browser extension that checks emails and web pages in place.
- Android **share target** / WhatsApp "share to TrustLens", so users never copy and paste.
- More Indian languages (Hindi, Tamil, Telugu, Marathi) and their code-mixed forms.
- On-device OCR for screenshots of messages.
- An anonymised, opt-in way to turn local feedback into better rules.

## License

Hackathon prototype. Add a license before reusing.
