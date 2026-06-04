# 🗒️ What's New

## 📚 Documentation Expansion

- Expanded the root README into a fuller package map covering core modules,
  helper families, 2.5D projection, canvas rendering, 3D cube clusters,
  Storybook sections, testing, and migration status.
- Added local subsection README files so users can understand what each source
  or demo folder contains and how to use it.
- Clarified contribution expectations for documentation, Storybook examples,
  and API changes.

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
- Added a GitHub Pages workflow that deploys Storybook from `storybook-static`
  without adding Storybook output to the npm package build.

## 🧪 Test Coverage

- Added Vitest with jsdom.
- Added local browser API shims for canvas, media elements, animation frames,
  and storage.
- Added tests covering arena behavior, ticker timing, sound behavior,
  viewport math, debug vectors, grid helpers, box collision, 2.5D projection,
  cube clusters, canvas rendering, and helper utilities.

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
