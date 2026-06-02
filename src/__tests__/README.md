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
- Sound lifecycle.
- Helper math.
- Grid or box collision.
- 2.5D projection helpers.
- Cube-cluster data or explosion behavior.
- Legacy migration behavior.

Storybook can show behavior visually, but public engine logic should still have
unit coverage.
