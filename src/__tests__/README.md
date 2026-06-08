# 🧪 Unit Tests

This folder contains Vitest unit tests for the engine package.

The tests use jsdom and shared browser API shims from [../test/setup.ts](../test/setup.ts).
They verify package behavior without requiring a real browser window.

## 📦 Test Files

- [engine.test.ts](engine.test.ts) checks package imports, `GameArena`, ticker,
  sound, viewport, and debug-vector behavior.
- [helpers.test.ts](helpers.test.ts) checks classic helper math, events, and
  utility behavior.
- [grid-and-box.test.ts](grid-and-box.test.ts) checks grid conversion,
  clamping, snapping, box movement, containment, and collision.
- [arcade-3d.test.ts](arcade-3d.test.ts) checks perspective, isometric, looped
  depth, and canvas rendering helper behavior.
- [browser-capabilities.test.ts](browser-capabilities.test.ts) checks wake
  locks, immersive mode requests, and installed-app exit fallbacks.
- [display-filters.test.ts](display-filters.test.ts) checks CRT/VHS preset
  metadata, intensity normalization, setting normalization, and runtime boosts.
- [user-options.test.ts](user-options.test.ts) checks option defaults,
  normalization, persistence, reset behavior, subscribers, and change events.
- [runtime-logger.test.ts](runtime-logger.test.ts) checks log-level guards,
  cycling, threshold filtering, and console routing.
- [storage-reset.test.ts](storage-reset.test.ts) checks best-effort storage
  cleanup for custom predicates, namespaces, and score-like keys.
- [viewport-scale.test.ts](viewport-scale.test.ts) checks manual zoom clamping,
  stepping, formatting, and responsive scale math.
- [achievements.test.ts](achievements.test.ts) checks achievement state
  normalization, progress clamping, unlock timestamps, and unknown-id failures.
- [achievement-notifications.test.ts](achievement-notifications.test.ts) checks
  canvas popup queueing, event enqueueing, icon drawing/fallbacks, and timing.
- [high-scores.test.ts](high-scores.test.ts) checks local high-score storage,
  receipt-backed integrity, server receipt helpers, optional remote sync, and
  backend submission validation.
- [systems.test.ts](systems.test.ts) checks input action mapping, multiplayer
  input contracts, sprite animation frame helpers, follow-camera behavior, and
  spatial-audio math.
- [cube-cluster.test.ts](cube-cluster.test.ts) checks cluster creation, links,
  centering, bounds, vectors, explosions, and visibility filtering.
- [coverage.test.ts](coverage.test.ts) protects package exports and broad test
  coverage expectations.

## ▶️ Running Tests

```sh
npm test
```

Run coverage:

```sh
npm run coverage
```

## 🧭 When To Add Tests

Add tests when changing:

- Public exports.
- Canvas rendering helpers.
- Timing behavior.
- Input or multiplayer helpers.
- Browser capability wrappers.
- Display filter presets and normalization.
- User option persistence helpers.
- Achievement helpers.
- Achievement notification rendering.
- High-score storage, sync, integrity, or validation helpers.
- Sound lifecycle.
- Helper math.
- Grid or box collision.
- 2.5D projection helpers.
- Cube-cluster data or explosion behavior.
- Legacy migration behavior.

Storybook can show behavior visually, but public engine logic should still have
unit coverage.
