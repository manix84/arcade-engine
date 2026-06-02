# ⏱️ Legacy Ticker Worker

This folder contains [worker.js](worker.js), a legacy ticker worker retained for
review during the TypeScript migration.

The current public ticker is [../Ticker.ts](../Ticker.ts), exported as `Ticker`
from [../index.ts](../index.ts).

## 🧭 Current Public API

Use `Ticker` for:

- Browser animation-frame scheduling.
- Optional render FPS caps.
- Fixed-step simulation timing.
- Catch-up frame limits.
- Start/stop lifecycle.

## 🧱 Migration Notes

The worker file should be treated as historical behavior until a clear need
exists for worker-backed timing in the modern package.

If worker timing is reintroduced:

- Keep the public API typed.
- Document browser support and fallback behavior.
- Add tests for lifecycle and message handling.
- Keep the worker out of Storybook unless the demo explains why a worker is
  useful.
