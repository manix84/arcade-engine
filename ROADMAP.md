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

### Current Status

- Added `API.md` as a package-level reference for every public export from
  `src/index.ts`.
- Linked the API reference from the root README and included it in npm package
  files.
- Added concise examples for core classes, helpers, grid/box collision, canvas
  rendering, 2.5D projection, arcade motion, and cube clusters.
- Polished prominent Storybook control labels for arcade camera, cube-cluster,
  and audio stories so controls read as user-facing options.

Verification notes:

- Verified with `npm run lint`, `npm run typecheck`, `npm test`,
  `npm run build`, `npm run build:storybook`, and `npm run pack:dry-run`.
- Unit tests passed with 103 assertions.
- The package dry run confirmed `API.md` is included in the published tarball.
- The local tool shell needs `PATH=/usr/local/bin:$PATH`; the dry run used
  `npm_config_cache=/private/tmp/arcade-engine-npm-cache`.

### Pre-Stage 5 Additions

- Added input action mapping and an input controller so games can map raw
  keyboard, mouse, touch, pointer, and gamepad input to semantic actions.
- Added local multiplayer input helpers for player-scoped controls, assigned
  gamepads, and serializable input intents for game-owned remote co-op/PvP
  transports.
- Added sprite animation helpers for frame timing and sprite-sheet frame data.
- Added 2D follow-camera helpers with smoothing, dead zones, and world bounds.
- Added spatial audio gain/mix helpers for listener/source calculations.
- Added Systems Storybook stories for input actions, local multiplayer,
  sprite animation, follow cameras, and spatial-audio math.

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

### Current Status

Latest verification: June 2, 2026.

- Version checked: `2.24.0`.
- Lint: passed.
- Typecheck: passed.
- Unit tests: passed with 119 tests across 20 files.
- Package build: passed and validated `dist`.
- Storybook build: passed.
- Package dry-run: passed.
- Dry-run package contents: 83 files, 77.4 kB packed, 334.4 kB unpacked.
- `dist` contains ESM JavaScript, source maps, declaration files, and
  declaration maps.
- `dist/multiplayer.*`, `dist/input.*`, `dist/animation.*`,
  `dist/camera.*`, and `dist/spatial-audio.*` are included.
- `storybook-static` is excluded from the npm package.
- `README.md`, `API.md`, `LICENSE.md`, `PRIVACY.md`, `RELEASE.md`, and
  `WHATSNEW.md` are included in the npm package.
- Automatic npm publishing is configured through the `NPM Release` GitHub
  Actions workflow for matching `v*` release tags.

Verification notes:

- The local tool shell needs `PATH=/usr/local/bin:$PATH` so npm can find Node.
- Vitest needs local socket access in this environment.
- The package dry run used `npm_config_cache=/private/tmp/arcade-engine-npm-cache`
  to avoid unrelated permissions in the user npm cache.
- Storybook emitted chunk-size and plugin-timing warnings during the static
  build, but completed successfully.

## 🔭 Post-Release Backlog

These items would make Arcade Engine more capable, but they should not block the
Stage 5 release candidate unless a real game depends on them immediately.

### Entity And Pool Helpers

- Bullet, projectile, particle, pickup, and enemy object pools.
- Spawn/despawn helpers for high-volume arcade objects.
- Reuse-focused APIs that avoid unnecessary garbage during fast loops.

### Timers And Cooldowns

- Cooldown helpers for fire rates, invulnerability windows, and ability timers.
- Countdown and elapsed-time helpers that work cleanly with `Ticker`.
- Small state helpers for one-shot, repeating, and delayed actions.

### Collision Response

- Bounce and reflect helpers for balls, shots, paddles, and walls.
- Separation helpers for overlapping boxes or circles.
- Optional collision result objects with side, normal, overlap, and response
  hints.

### Enemy Movement And Paths

- Patrol helpers for looping, ping-pong, and waypoint movement.
- Steering helpers for simple chase, flee, orbit, and intercept behavior.
- Wave movement helpers for arcade shooter enemies.

### Particles And Effects

- Burst, trail, and fade helpers for canvas particles.
- Small effect presets for pickups, impacts, explosions, and engine thrust.
- Data-first helpers that can be rendered by canvas, WebGL, or another renderer.

### Scene And State Helpers

- Lightweight scene lifecycle helpers for menu, play, pause, game over, and
  transition states.
- Stack or switch helpers that coordinate cleanup with `Ticker`, input, and
  sound.
- Optional transition timing helpers for fades and wipes.

### Input Follow-Ups

- Gamepad connection/disconnection event helpers.
- Pointer gesture helpers for drag, swipe, tap, and virtual sticks.
- Touch-safe UI helpers for mobile/tablet arcade controls.
- Optional rollback/prediction helpers if a real game needs tighter remote PvP
  behavior.

### Audio Follow-Ups

- Mixer helpers for ducking, crossfades, and bus-style channel groups.
- Distance curve presets for spatial sound.
- Storybook demos that combine `Sound`, `getSpatialAudioMix`, and visible
  listener/source telemetry.
