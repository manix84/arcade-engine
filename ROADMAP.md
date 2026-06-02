# 🗺️ Finish Roadmap

This roadmap describes the remaining work to take Arcade Engine from a
modernized package-in-progress to a release-ready browser game engine.

## ✅ Stage 1: Package Readiness Baseline

Goal: make the package coherent, verifiable, and understandable before changing
more engine behavior.

Stage 1 is about confidence. The package should have a clear license, a clear
public entry point, complete user documentation, and a passing verification
baseline.

### Scope

- Confirm the npm package metadata matches the intended package use.
- Confirm `LICENSE.md` allows games to install and ship the engine as a normal
  dependency.
- Confirm root and subsection documentation explain the package surface.
- Confirm the public entry point is `src/index.ts`.
- Confirm Storybook remains documentation/demo output only.
- Run lint, typecheck, unit tests, package build, Storybook build, and dry-run
  package verification.
- Record any failures as stage 2 or stage 3 follow-up work.

### Current Status

- License: MIT.
- Package metadata: public package metadata is present.
- Root documentation: present.
- Subsection documentation: present for source, stories, helpers, sound,
  ticker, legacy graphics, ticker worker, tests, and test setup.
- Lint: passed.
- Typecheck: passed.
- Unit tests: passed.
- Package build: passed.
- Storybook build: passed.
- Package dry-run: passed.

Stage 1 is complete when these results are committed with the roadmap.

## 🧱 Stage 2: Public API And Legacy Boundary

Goal: make the exported engine surface deliberate and remove uncertainty around
legacy JavaScript files.

### Work

- Audit every export from `src/index.ts`.
- Decide which legacy files are kept, ported, or removed:
  - `MainMenu.js`
  - `src/Fullscreen.js`
  - `src/Graphic.js`
  - `src/Graphic/Sprite.js`
  - `src/Graphic/Sprite/Static.js`
  - `src/Graphic/Sprite/Animated.js`
  - `src/Ticker/worker.js`
  - `src/debugging.js`
  - `src/keyboard.js`
- Move useful demo-only behavior into public helpers when it belongs in the
  engine.
- Add tests before removing or replacing legacy behavior.
- Keep public types explicit and documented.

## 🎮 Stage 3: Engine Capability Coverage

Goal: prove the engine can support the kinds of games shown in Storybook without
the demos hiding all of the useful work.

### Work

- Review each Storybook demo and identify behavior that should be engine-owned.
- Expand helpers where useful for:
  - First-person player movement.
  - 2D side scrollers.
  - 2.5D side scrollers.
  - Arcade camera projection.
  - Spatial/global audio scenes.
  - Collision and area exit flows.
  - Spawn arcs and heading helpers.
- Add focused tests for new helpers.
- Keep stories as visual documentation of engine APIs, not standalone toy
  implementations.

## 📚 Stage 4: Documentation And Demo Polish

Goal: make the engine easy to learn from npm, GitHub, and Storybook.

### Work

- Ensure every public export has a README or Storybook reference.
- Add concise usage examples for high-value APIs.
- Check Storybook section names and sidebar organization.
- Confirm controls are named clearly and reset where expected.
- Capture any important screenshots or visual notes for release materials.

## 📦 Stage 5: Release Candidate

Goal: prepare the package for publishing.

### Work

- Run:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run build:storybook
npm run pack:dry-run
```

- Inspect the dry-run package contents.
- Confirm `dist` contains ESM JavaScript, source maps, declarations, and
  declaration maps.
- Confirm `storybook-static` is excluded from the npm package.
- Confirm README, license, privacy, and what's-new docs are included.
- Tag or publish only after the verification baseline is clean.
