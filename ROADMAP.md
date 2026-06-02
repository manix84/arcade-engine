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

Latest verification: June 2, 2026.

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

Verification notes:

- The local tool shell needs `PATH=/usr/local/bin:$PATH` so npm can find Node.
- Vitest needs local socket access in this environment.
- The package dry run used `npm_config_cache=/private/tmp/arcade-engine-npm-cache`
  to avoid unrelated permissions in the user npm cache.

Stage 1 is complete when these results are committed with the roadmap.

## 🧱 Stage 2: Public API And Legacy Boundary

Goal: make the exported engine surface deliberate and remove uncertainty around
legacy JavaScript files.

### Work

- Audit every export from `src/index.ts`.
- Decide which legacy files are kept, ported, or removed. Stage 2 removed:
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

### Current Status

- Public exports from `src/index.ts` have a regression test.
- Legacy AMD-era JavaScript modules were audited and removed because they were
  not exported, not used by source or Storybook, excluded from lint, and not
  included in the package build.
- Modern replacements are documented through `GameArena`, `Ticker`, canvas
  rendering helpers, debug vectors, and helper/event APIs.

Verification notes:

- Verified with `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run build`, `npm run build:storybook`, and `npm run pack:dry-run`.
- Unit tests passed with 99 assertions after adding the public export-surface
  regression test.
- The package dry run confirmed the removed legacy files are not part of the
  published tarball.
- The local tool shell needs `PATH=/usr/local/bin:$PATH`; the dry run used
  `npm_config_cache=/private/tmp/arcade-engine-npm-cache`.

## 🎮 Stage 3: Engine Capability Coverage

Goal: prove the engine can support the kinds of games shown in Storybook without
the demos hiding all of the useful work.

### Work

- Review each Storybook demo and identify behavior that should be engine-owned.
- Expand helpers where useful for:
  - First-person player movement. Stage 3 added camera framing helpers.
  - 2D side scrollers. Stage 3 added loop and jump helpers.
  - 2.5D side scrollers. Stage 3 reused loop helpers with projection helpers.
  - Arcade camera projection.
  - Spatial/global audio scenes. Stage 3 added pan and visual depth helpers.
  - Collision and area exit flows.
  - Spawn arcs and heading helpers.
- Add focused tests for new helpers.
- Keep stories as visual documentation of engine APIs, not standalone toy
  implementations.

### Current Status

- `src/arcade-motion.ts` owns reusable first-person camera, side-scroller, jump,
  and spatial-audio math from the demos.
- Arcade camera and spatial audio stories now call exported helpers for reusable
  behavior and keep only presentation drawing in Storybook.
- Focused tests cover the new helpers and the public export surface.

Verification notes:

- Verified with `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run build`, `npm run build:storybook`, and `npm run pack:dry-run`.
- Unit tests passed with 103 assertions after adding focused arcade-motion
  helper coverage.
- The package dry run confirmed `dist/arcade-motion.*` files are included in
  the published tarball.
- The local tool shell needs `PATH=/usr/local/bin:$PATH`; the dry run used
  `npm_config_cache=/private/tmp/arcade-engine-npm-cache`.

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
