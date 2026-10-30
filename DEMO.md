# TrustLens — Demo guide

## Wi-Fi-off checklist (do this 30 min before judging)

- [ ] `git pull`, then `npm install` **while online**.
- [ ] `npm test`: all green.
- [ ] Ollama running (`ollama serve`) and the model pulled: `ollama list` shows `llama3.2:3b`.
- [ ] Warm the model once, so the first explanation isn't slow: `ollama run llama3.2:3b "hi"`.
- [ ] **Turn Wi-Fi OFF.**
- [ ] `npm run demo`, then open **http://127.0.0.1:5050**.
- [ ] Header shows **Engine: stub/P2** (green dot) and **AI: on-device ready** (green dot). There is **no "Demo data" pill**; if there is one, the server isn't reachable.
- [ ] Kannada renders correctly in the "ಕನ್ನಡ · kyc" sample chip (no boxes).
- [ ] Browser zoom at 125–150% so the badge reads from across the room. Pick light or dark mode with the ☀/☾ button.
- [ ] Open **My feedback** → **Clear all**, so the demo starts clean.
- [ ] Have the QR sample ready: the QR tab has built-in sample buttons. For a physical demo, show `client/public/samples/qr-upi-receive-scam.png` on a phone and drop a photo or screenshot of it.
- [ ] Double-check the report channels in `server/src/report.js` (1930, cybercrime.gov.in, Chakshu on sancharsaathi.gov.in).

## 3-minute script

| Time | Do | Say |
|---|---|---|
| 0:00–0:20 | Point at the header badge: "Runs fully on this device". | "Every year Indians lose crores to fake KYC, electricity and 'digital arrest' messages. TrustLens catches the impersonation, explains why, and never sends your message anywhere. Wi-Fi is off right now." |
| 0:20–0:55 | Click **EN · kyc**. | "Critical, 100. One sentence tells you what it is: *a fake SBI KYC message trying to get your OTP*. Every suspicious phrase is highlighted. Hover 'share the OTP': a serious sign, because banks never ask. The link pretends to be SBI on a `.xyz` domain, and it came from a normal mobile number, not SBI's registered header." Scroll to **Verify safely**: "We tell you to use YONO or the number on your passbook. We never print a phone number a scammer could fake." |
| 0:55–1:20 | Click **ಕನ್ನಡ · kyc**, hover **ತಕ್ಷಣ**. Then click **Kanglish · electricity**. | "Same scam in Kannada: highlights land on the exact Kannada words. And Kanglish, the way people actually text: *'power cut aagutte… pay maadi'*. High risk." Point at the privacy chip: "The phone number was hidden *before* analysis." |
| 1:20–1:40 | Click **EN · normal · VM-SBIINB** (a real-looking SBI OTP). | "A real SBI OTP message: **Safe**. The sender matches SBI's official header, and 'do not share' isn't mistaken for 'share'. Low false alarms matter, or people stop trusting the tool. We still show safety tips and never say '100% safe'." |
| 1:40–2:10 | Switch to **QR** → click the **UPI "receive cashback"** sample. | "The QR is decoded in the browser; the image never leaves it. It's a UPI QR saying *'Scan to receive cashback'*. Critical: scanning a UPI QR only ever **sends** money. That's the most common QR trick." |
| 2:10–2:45 | Click **Kanglish · electricity** again, then **I think this is legit**, keep the default ticks (all weak signs), also tick **Asks you to pay**, toggle **Trust this sender**, click **Re-check**. | "Say it's genuinely my electricity guy. Weak signs fade out: the urgency and the threat. But the **money request stays**, with the reason why we can't remove it. High drops to Caution, not Safe. You can't argue a scam away. Feedback is saved only in this browser, as a 60-character redacted preview." |
| 2:45–3:00 | Scroll to **AI explanation (on-device)** on any result. | "A local Llama model explains it in plain words, in English or Kannada. It only sees the redacted text and can't change the score. Rules decide, AI explains. Scoring is fully deterministic and every point is traceable." |

**Backup lines if asked**

- *"How accurate is it?"* → `npm run eval` on P1's 150–200 message dataset, compared with a plain keyword filter (precision matters: fewer false alarms).
- *"What if Ollama crashes?"* → The AI section just disappears; everything else works. Try `pkill ollama` live.
- *"What if the server dies?"* → The UI switches to demo data and shows a **Demo data** pill, so it never pretends.
- *"Privacy proof?"* → [PRIVACY.md](PRIVACY.md); `npm test` includes tests that capture all log output and the exact AI prompt and assert no phone, OTP, account, card, Aadhaar, PAN, UPI or email values appear.

## If something goes wrong

| Symptom | Fix |
|---|---|
| "Demo data" pill is visible | The server isn't running, so start `npm run demo`. A port clash shows "Port 5050 is already in use" → `lsof -i :5050`, stop that process, or set `API_PORT`. |
| AI: off | Run `ollama serve`, then `ollama list` (the model name must match `OLLAMA_MODEL`). The status refreshes every 15 s. |
| Kannada shows boxes | Hard-refresh. Fonts are bundled, so a stale cache is the only cause. |
| First AI explanation is slow | Warm the model (see checklist). The timeout is 8 s, after which the section hides. |
