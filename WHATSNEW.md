# 🗒️ What's New

## 🧱 TypeScript Package Modernization

- Started modernizing the standalone Arcade Engine repository from the older
  AMD-style JavaScript modules to a TypeScript package.
- Added a TypeScript package entry point at `src/index.ts`.
- Added local package metadata, TypeScript config, Vitest config, and a lockfile
  so the engine can be developed and tested independently.
- Added a local `.gitignore` for dependency, build, and coverage output.

## 🎬 Engine Modules

- Added `GameArena` as the canvas arena wrapper for sizing, assets, text,
  sprites, circles, debug grids, and fullscreen behavior.
- Added a requestAnimationFrame-backed `Ticker` with render throttling and
  fixed-step simulation support.
- Added a richer `Sound` wrapper with music/effects channels, global
  pause/resume/stop helpers, fade helpers, playback-blocked callbacks, and
  optional browser spatial panning.
- Added shared `types.ts` contracts for public engine options and data shapes.

## 🧮 Utilities

- Added heading, collision, spawn, cloning, color, and event-binding helpers.
- Added viewport radius and viewport-area scaling helpers.
- Added debug vector drawing for heading and steering overlays.

## 🧪 Test Coverage

- Added Vitest with jsdom.
- Added local browser API shims for canvas, media elements, animation frames,
  and storage.
- Added tests covering arena behavior, ticker timing, sound behavior,
  viewport math, debug vectors, and helper utilities.
- Confirmed the modernized slice passes `npm run typecheck` and `npm test`.

## 🧹 Legacy Cleanup

- Removed conflicting legacy AMD `src/Sound.js` and `src/Ticker.js` files so
  extensionless imports resolve to the new TypeScript modules.
- Left the remaining legacy JavaScript modules in place for follow-up review
  rather than removing them as part of the first modernization slice.

## 🔜 Next Milestones

- Decide whether the remaining legacy `Graphic`, `Fullscreen`, `keyboard`, and
  `MainMenu` modules should be ported, replaced by `GameArena`, or archived.
- Decide when the package should stop being private.
- Add CI once the package boundary is stable.
