# 🗒️ What's New

## 📚 Documentation Expansion

- Expanded the root README into a fuller package map covering core modules,
  helper families, 2.5D projection, canvas rendering, 3D cube clusters,
  Storybook sections, testing, and package modules.
- Added local subsection README files so users can understand what each source
  or demo folder contains and how to use it.
- Clarified contribution expectations for documentation, Storybook examples,
  and API changes.

## 📦 Published Package

- Arcade Engine is available from npm as `arcade-engine`.
- The npm package exposes the typed ESM build from `dist` and includes the
  public root Markdown docs.
- Storybook remains live documentation and demo output; it is not included in
  the npm package. Screenshot assets are not bundled into the npm tarball; the
  package README rewrites screenshot links to GitHub raw URLs during package
  packing.

## 🧱 TypeScript Package Modernization

- Modernized the standalone Arcade Engine repository from older AMD-style
  JavaScript modules toward a TypeScript package.
- Added a TypeScript package entry point at `src/index.ts`.
- Added an npm package build that emits ESM JavaScript, source maps,
  declaration files, and declaration maps into `dist`.
- Added package exports, `types`, `files`, repository metadata, keywords,
  public publish config, and a dry-run pack script for npm publishing.
- Added an automatic GitHub Actions release workflow for pushes to `main`, with
  manual release dispatches for selected tags.
- Added release tarball packaging and GitHub Release asset upload for release
  tags.
- Added GitHub Packages publishing as `@manix84/arcade-engine` alongside the
  npmjs `arcade-engine` package.
- Added local package metadata, TypeScript config, Vitest config, and a lockfile
  so the engine can be developed and tested independently.

## 🎬 Engine Modules

- Added `GameArena` as the canvas arena wrapper for sizing, assets, text,
  sprites, circles, debug grids, and fullscreen behavior.
- Added a requestAnimationFrame-backed `Ticker` with render throttling and
  fixed-step simulation support.
- Added a richer `Sound` wrapper with music/effects channels, global
  pause/resume/stop helpers, fade helpers, playback-blocked callbacks, and
  optional browser spatial panning.
- Added input action helpers for mapping keyboard, mouse, touch, pointer, and
  gamepad inputs to game actions.
- Added multiplayer helpers for local player-scoped input, assigned gamepads,
  co-op/PvP session metadata, and serializable remote player input intents.
- Added browser capability helpers for screen wake locks, immersive fullscreen
  orientation requests, and installed-app exit fallback events.
- Added generic user option store helpers for defaults, normalization,
  localStorage persistence, reset, subscribers, and change events.
- Added retro display filter helpers for CRT/VHS presets, custom settings,
  normalization, and runtime boost composition.
- Added generic achievement helpers for unlock state, progress counters, and
  status lists.
- Added canvas achievement notification helpers for queued unlock popups.
- Added high-score helpers for local leaderboards, optional remote sync,
  receipt-backed integrity, server receipt validation, and backend submission
  validation.
- Added runtime utility helpers for log levels, console logging, storage reset
  actions, and manual viewport zoom scaling.
- Added sprite animation helpers for frame timing and sprite-sheet frame data.
- Added follow-camera helpers for 2D worlds.
- Added grid helpers for board and tile games.
- Added axis-aligned box helpers for paddle, brick, shot, enemy, and platform
  patterns.
- Added gravity and lightweight 2D/3D ragdoll helpers for arcade physics
  effects.
- Added canvas rendering helpers for trails, lines, polygons, and color work.
- Added 2.5D projection helpers for perspective, isometric, and looped-depth
  arcade scenes.
- Added arcade-motion and spatial-audio math helpers for first-person framing,
  side scrollers, actor placement, jump arcs, pan, gain, and listener/source
  mixes.
- Added 3D cube-cluster helpers for voxel-style models, plasma links, bounds,
  centers, and deterministic block explosions.
- Added `ScreenEffectManager` with pixel-art Canvas 2D screen effects for
  droplets, fire, frost, poison, low health, shock, speed boost, environmental
  heat, environmental frost, environmental fire, and underwater feedback.
- Added atmospheric Canvas 2D effects for rain, snow, ash, and embers, including
  density presets, wind, splashes, layered flakes, optional snow accumulation,
  and ash/ember balancing.
- Added procedural background stars for generated pixel starfields with
  player-relative lateral movement and z-axis fly-through/receding motion.
- Added `PerformanceSampler` and `FpsOverlay` for Canvas 2D frame telemetry,
  including target-FPS relative graph coloring and `GameArena` integration.
- Added shared `types.ts` contracts for public engine options and data shapes.

## 📚 Storybook Demos

- Added branded Storybook demos for the arena, helper math and geometry,
  viewport utilities, debug vectors, tickers, and sound system.
- Split broad demos into smaller Storybook sections so individual APIs are
  discoverable from the sidebar.
- Added arcade camera demos covering racer, starfighter, isometric room,
  hyperspace gate, first-person player, 2D side scroller, and 2.5D side
  scroller styles.
- Expanded the 2D and 2.5D side-scroller demos with obstacles, ladders,
  platforms, depth-scaled belt actors, and stompable dummy enemies.
- Added cube-cluster demos for destructible pickups and modular level pieces.
- Added systems demos for input actions, local multiplayer, sprite animation,
  follow cameras, and spatial-audio math.
- Added systems demos for gravity and 2D/3D ragdoll helpers.
- Added a systems demo for persisted user option stores.
- Added a systems demo for CRT/VHS display filter presets.
- Added a systems demo for achievement notification popups.
- Added systems demos for achievement progress/unlocks and high-score
  leaderboard validation helpers, including Storybook actions and interaction
  checks for their controls.
- Added Player Effects stories under `Engine/Systems/Player Effects` for screen
  droplets and player-state fire, frost, poison, low-health, shock, and
  speed-boost overlays.
- Added Screen Effects stories under `Engine/Systems/Screen Effects` for heat,
  frost, fire, and underwater environmental overlays.
- Added Atmospheric Effects stories under `Engine/Systems/Atmospheric Effects`
  for rain, snow, ash, and embers.
- Replaced flat screen-effect backgrounds with a reusable pixel-art FPS corridor
  demo scene and fixed HUD weapon asset so effects can be evaluated over a
  coherent game-like view.
- Added Storybook controls for the FPS debug overlay, including display level,
  position, scale, opacity, and target FPS.
- Added a Presentation story for procedural stars with forward, reverse,
  strafe, climb, and calm motion presets.
- Added a GitHub Pages workflow that deploys Storybook from `storybook-static`
  without adding Storybook output to the npm package build.

## 🧪 Test Coverage

- Added Vitest with jsdom.
- Added local browser API shims for canvas, media elements, animation frames,
  and storage.
- Added tests covering arena behavior, ticker timing, sound behavior,
  viewport math, debug vectors, grid helpers, box collision, 2.5D projection,
  cube clusters, browser capabilities, display filters, user options,
  achievements, achievement notifications, high scores, screen effects,
  atmospheric effects, procedural background stars, FPS overlay
  sampling/rendering, canvas rendering, and helper utilities.

## 🧹 Legacy Cleanup

- Removed conflicting legacy AMD `src/Sound.js` and `src/Ticker.js` files so
  extensionless imports resolve to the new TypeScript modules.
- Audited and removed the remaining legacy AMD JavaScript modules that were not
  exported, tested, used by Storybook, or included in the npm package build:
  `MainMenu.js`, `src/Fullscreen.js`, `src/Graphic.js`, sprite wrappers,
  `src/Ticker/worker.js`, `src/debugging.js`, and `src/keyboard.js`.

## 🔜 Next Milestones

- Continue moving demo-only behavior into public helpers when it proves useful
  to real games.
- Keep Storybook examples aligned with capabilities exported from the engine.
