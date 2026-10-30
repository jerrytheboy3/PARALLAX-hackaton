# data/

- `seed.json` — 10 hand-made messages (6 scam / 4 normal, EN + ಕನ್ನಡ + Kanglish) used for development and as UI samples.
- `messages.json` — **P1's full dataset goes here** (150–200 messages, same schema — see [../CONTRACT.md](../CONTRACT.md) §2).
  When it exists, `npm run eval` uses it, the UI samples come from it, and `npm test` validates its schema.

All numbers, IDs and UPI handles in these files must be **fake**.
