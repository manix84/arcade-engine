# 🧰 Test Setup

This folder contains shared setup for Vitest.

[setup.ts](setup.ts) installs lightweight browser API shims used by the unit
tests, including canvas, media elements, animation frames, fullscreen behavior,
storage, and related browser APIs that jsdom does not fully implement.

## 🧭 Why It Exists

Arcade Engine is a browser package, but most unit tests should run quickly
without launching a real browser. The setup file provides enough browser-like
behavior to verify engine logic and canvas/audio calls in Vitest.

## 🧪 When To Change It

Update this setup when:

- A new engine module uses a browser API that jsdom does not provide.
- A test needs a more realistic mock for canvas, audio, fullscreen, or timing.
- A browser behavior should be isolated behind a small, testable shim.

Keep setup behavior minimal. Prefer module-level tests over adding broad global
mock behavior unless multiple tests need it.
