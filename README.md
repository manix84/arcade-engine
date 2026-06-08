# 🕹️ Arcade Engine

A small browser arcade-game engine for canvas games, published on npm as
`arcade-engine`.

Arcade Engine is a standalone TypeScript package for arcade-style browser
games. It provides a canvas arena, timing, audio, geometry, collision,
viewport, 2.5D projection, 3D cube-cluster, and rendering helpers that are
small enough to compose in your own game loop.

Install and import the npm package as `arcade-engine`. In this repository, the
public source entry point is `src/index.ts`; published builds emit ESM
JavaScript, source maps, declaration files, and declaration maps to `dist`.
Storybook is documentation and demo output only; it builds to `storybook-static`
and is not included in the npm package output.

## 🧭 Project History

Arcade Engine began as the reusable browser-game engine code inside
[manix84/time-pilot](https://github.com/manix84/time-pilot/). It was extracted
into its own package so the canvas arena, timing, audio, input, scoring, and
helper systems could support other arcade-style browser games too.

## ✨ What It Provides

- Canvas arena creation, resizing, fullscreen handling, text, sprites, circles,
  debug grids, and asset preloading.
- RequestAnimationFrame-backed ticking with render FPS caps and fixed-step
  simulation timing.
- HTML audio playback with music/effects channels, global pause/resume/stop,
  fades, blocked-playback reporting, and optional spatial panning.
- Input action mapping helpers for keyboard, mouse, touch, pointer, and gamepad
  controls.
- Local multiplayer input helpers for player one/player two keyboard,
  mouse/touch, and assigned gamepad controls, plus backend-agnostic remote
  player intent contracts.
- User option stores with schema defaults, caller-provided normalization,
  localStorage persistence, reset behavior, subscribers, and change events.
- Achievement state helpers for local unlocks, progress counters, and status
  lists.
- High-score helpers for local leaderboards, optional remote sync, receipt
  integrity payloads, and backend submission validation.
- Sprite animation helpers for frame timing and sprite-sheet frame selection.
- Math, heading, spawn, collision, area-exit, cloning, random-color, and
  browser-event helpers.
- 2D follow-camera helpers with smoothing, dead zones, and world bounds.
- Viewport scaling helpers for responsive arena bounds and debug vector drawing
  for heading and steering overlays.
- Grid helpers for board, tile, puzzle, and cell-based games.
- Axis-aligned box helpers for paddle, brick, shot, enemy, and platform-style
  movement.
- Gravity and lightweight 2D/3D ragdoll helpers for arcade physics effects.
- Canvas rendering helpers for trails, lines, polygons, hex color parsing, and
  shading.
- 2.5D projection helpers for perspective lanes, isometric tiles, depth loops,
  and pseudo-3D arcade camera effects.
- Arcade motion helpers for first-person camera framing, side-scroller loops,
  jump arcs, and spatial audio pan/depth calculations.
- Spatial audio math helpers for distance gain, pan, and listener/source mixes.
- 3D cube-cluster helpers for voxel-style pickups, modular level pieces,
  plasma links, deterministic explosions, and fading debris.

## 📦 Installation

```sh
npm install arcade-engine
```

The package name is lowercase for npm compatibility. The project and
documentation use the display name Arcade Engine.

## 🚪 Package Entry

```ts
import {
  addAchievementProgress,
  GameArena,
  Sound,
  Ticker,
  createCubeClusterFromPattern,
  createHighScoreManager,
  createUserOptionsStore,
  detectBoxCollision,
  drawDebugVectors,
  fillCanvasWithTrail,
  getFirstPersonCamera,
  getGridCell,
  getLoopedScrollerPosition,
  getPerspectiveScale,
  getScaledViewportLimit,
  helpers,
  projectIsometricPoint,
  projectPerspectivePoint,
  validateHighScoreSubmission,
} from "arcade-engine";
```

The package is ESM-only. Import from `arcade-engine`; do not import from
individual source files in consuming projects.

## 🧱 Core Modules

### 🎬 `GameArena`

`GameArena` owns a canvas inside a host element. It handles the common setup
work that most canvas games need before a loop can draw anything.

```ts
import { GameArena } from "arcade-engine";

const host = document.querySelector("#game") as HTMLElement;
const arena = new GameArena(host, {
  defaultTextColor: "#ffffff",
  fontFamily: "sans-serif",
});

arena.setBackgroundColor("#000000");
arena.clear();
arena.renderText("READY", 0, -40, {
  align: "center",
  size: 24,
});
```

Use it for canvas sizing, `CanvasRenderingContext2D` access, fullscreen
requests, asset preloading, sprite-frame drawing, crisp pixel-art rendering,
text drawing, circles, and debug grids.

### ⏱️ `Ticker`

`Ticker` schedules callbacks on `requestAnimationFrame`. Use an FPS cap when
you want to draw less often, or fixed-step timing when simulation should advance
at a stable rate regardless of render cadence.

```ts
import { Ticker } from "arcade-engine";

const ticker = new Ticker({ fixedStepFps: 50 });

ticker.addSchedule((frame) => {
  updateSimulation(frame);
}, 1);

ticker.start();
```

`new Ticker({ fps: 30 })` caps render callbacks. Fixed-step ticker options run
catch-up steps for deterministic movement and collision.

### 🔊 `Sound`

`Sound` wraps browser `Audio` elements and keeps channel volume, global mute,
pause/resume, fades, and cleanup in one place.

```ts
import { Sound } from "arcade-engine";

Sound.configure({
  getVolume: (channel) => (channel === "music" ? 0.6 : 0.8),
  onPlaybackBlocked: ({ channel, sources }) => {
    console.info("Playback blocked", channel, sources);
  },
});

const music = new Sound("/music/menu.ogg", { channel: "music" });
music.fadeInLoop(700);
```

Audio playback still follows browser rules, so games should start playback from
user gestures.

## 🧮 Helper Families

### Geometry And Events

The default `helpers` export includes:

- `float(number)` for rounding noisy decimal results.
- `rotateTo(destinationAngle, currentAngle, stepSize)` for incremental turning.
- `getSpawnCoords(target, options?)` for arc/radius spawning.
- `findHeading(target, origin?)` for angle and distance between objects.
- `detectCollision(target, origin?)` for radial collision.
- `detectAreaExit(radialCenter, target, radius)` for arena boundary checks.
- `bind(eventNames, callback, element?)` and `unbind(...eventNames)` for simple
  DOM event registration.
- `getRandomColor()` and `cloneObject(oldObject)`.

### Viewport And Debug Vectors

Viewport helpers calculate radius and scale limits from the current arena size.
Debug vectors draw velocity, heading, and target overlays so movement logic is
visible while developing.

### Grid And Box Collision

Grid helpers convert between pixel coordinates and cells, clamp cells to a
board, and snap entities to a grid. Box helpers move and collide top-left
`posX`/`posY` rectangles for games like Breakout, Space Invaders, and simple
platformers.

### Achievements

Achievement helpers keep definition metadata separate from persisted state.
Games can unlock achievements, increment progress counters, and render status
lists from the returned data. See the `Engine/Systems/New Helpers/Achievements`
Storybook story for an interactive unlock/progress example.

### High Scores

High-score helpers support local score tables and optional remote sync. Games
provide their own storage key, default scores, API path, settings
normalizers, and plausibility rules. See the
`Engine/Systems/New Helpers/High Scores` Storybook story for local leaderboard,
threshold, integrity, and plausibility examples.

Remote leaderboard submissions can use run receipts and integrity payloads. A
backend can import `validateHighScoreSubmission` from `arcade-engine/high-scores`
and pair it with the game's token signing, receipt storage, expiry, and rate
limits.

### User Options

User option stores keep game-specific settings schemas outside the engine while
providing reusable persistence mechanics. Games provide defaults, optional
normalization, and a storage key; the store handles localStorage access,
best-effort writes, reset, subscriptions, and optional DOM change events.

See the `Engine/Systems/New Helpers/User Options` Storybook story for a live
options-store example.

### Canvas Rendering

Canvas rendering helpers are small drawing utilities used by the demos and
available to games:

- `fillCanvasWithTrail(context, canvas, color, trailOpacity)` clears or fades a
  frame while leaving after-images.
- `drawCanvasLine(context, from, to, color, width?)`.
- `drawCanvasPolygon(context, points, color, stroke?)`.
- `parseHexColor`, `colorWithAlpha`, and `shadeHexColor` for hex color work.

`fillCanvasWithTrail` accepts any valid CSS color string. Hex-specific helpers
require 3 or 6 digit hex colors.

### 2.5D Projection

The `arcade-3d` helpers are renderer-agnostic math functions for arcade-style
depth effects:

- `projectPerspectivePoint(point, viewport, options?)`.
- `projectIsometricPoint(point, options?)`.
- `getPerspectiveScale(depth, options?)`.
- `getLoopedDepth(options)` and `wrapDepth(depth, range)`.
- `getDepthProgress(depth, range)`.
- `getIsometricTileCorners(center, options?)`.
- `getIsometricWallSide(tileCorners, height, side?)`.

These helpers do not require WebGL. They are useful for pseudo-3D racing,
starfields, first-person lanes, isometric rooms, 2.5D side scrollers, and
layered arcade scenes drawn to a normal canvas.

### 🏃 Arcade Motion

Arcade motion helpers move common demo math into the engine package:

- `getFirstPersonCamera(viewport, options?)` calculates center and horizon
  framing from viewport size, look input, and optional bobbing.
- `getLoopedScrollerPosition(options)` wraps side-scroller scenery and platform
  positions across a repeat range.
- `getSideScrollerActorPosition(options)` wraps obstacles, enemies, pickups, or
  platforms and reports visibility/progress for rendering and collision checks.
- `getSideScrollerJumpY(options)` calculates a simple jump/bob arc.
- `getSpatialAudioPan(options)` clamps source position into browser pan range.
- `getSpatialAudioDepth(options)` turns source distance into a visual depth
  value for 2.5D audio scenes.

### 🧊 3D Cube Clusters

Cube clusters describe block models as data rather than binding the engine to a
specific renderer.

```ts
import {
  centerCubeCluster,
  createCubeClusterFromPattern,
  createExplosionBlocks,
  stepExplosionBlocks,
} from "arcade-engine";

const pickup = createCubeClusterFromPattern(
  [
    [" ### ", "#####", " ### "],
    ["  #  ", " ### ", "  #  "],
  ],
  { color: "#4fd1c5", gap: 0.2, size: 1 }
);

const blocks = centerCubeCluster(pickup.blocks);
let explosion = createExplosionBlocks(blocks, { force: 7 });
explosion = stepExplosionBlocks(explosion, 1 / 60);
```

Use these helpers with Three.js, Babylon, raw WebGL, or a custom canvas
projection. The engine supplies block positions, links, bounds, centers,
normalized vectors, and explosion state; the renderer decides how to display
them.

## 📚 Storybook

Storybook contains live demos for the engine surface:

- **Overview**: animated arcade loop showcases.
- **Core**: `GameArena`, ticker behavior, viewport scaling, and debug vectors.
- **Helpers**: math, geometry, object cloning, event binding, collisions,
  rotation, spawning, and 2.5D variants.
- **Systems**: input actions, local multiplayer, user options, achievements,
  high scores, sprite animation, follow cameras, and spatial-audio math.
- **Audio**: master controls, effects, music, spatial panning, and global
  playback behavior.
- **3D**: cube-cluster pickups and modular level pieces.
- **Demos**: arcade camera styles, including racer, starfighter, isometric,
  hyperspace, first-person, 2D side scroller, and 2.5D side scroller examples.

Run it locally:

```sh
npm run storybook
```

Build the static docs:

```sh
npm run build:storybook
```

More local documentation is available in:

- [src/README.md](src/README.md)
- [src/stories/README.md](src/stories/README.md)
- [src/stories/helpers/README.md](src/stories/helpers/README.md)
- [src/stories/systems/README.md](src/stories/systems/README.md)
- [src/stories/sound/README.md](src/stories/sound/README.md)
- [src/stories/ticker/README.md](src/stories/ticker/README.md)

## 🛠️ Local Development

Install dependencies:

```sh
npm install
```

Run the main checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Preview the npm tarball contents:

```sh
npm run pack:dry-run
```

Build the release tarball locally:

```sh
npm run pack:release
```

Release publishing is handled by GitHub Actions when a release commit is pushed
to `main`. The workflow publishes `arcade-engine` to npmjs, publishes
`@manix84/arcade-engine` to GitHub Packages, and uploads the release tarball to
the GitHub Release for the package version. See [RELEASE.md](RELEASE.md) for
the release process and npm trusted publishing setup.

Story changes should also run:

```sh
npm run build:storybook
```

## 🧪 Tests

The test suite uses Vitest with jsdom and lightweight browser API shims for
canvas, media elements, animation frames, and storage.

Coverage includes package imports, arena behavior, viewport calculations, grid
and box helpers, input and multiplayer helpers, 2.5D projection math, cube
clusters, achievements, high scores, debug vectors, ticker scheduling, sound
lifecycle, and helper math/events.

## 🗺️ Package Modules

Active package modules:

- `src/index.ts`
- `src/arena.ts`
- `src/Ticker.ts`
- `src/Sound.ts`
- `src/input.ts`
- `src/multiplayer.ts`
- `src/user-options.ts`
- `src/achievements.ts`
- `src/high-scores.ts`
- `src/animation.ts`
- `src/camera.ts`
- `src/helpers.ts`
- `src/viewport.ts`
- `src/debug-vectors.ts`
- `src/grid.ts`
- `src/box-collision.ts`
- `src/physics.ts`
- `src/canvas-rendering.ts`
- `src/arcade-3d.ts`
- `src/arcade-motion.ts`
- `src/spatial-audio.ts`
- `src/cube-cluster.ts`
- `src/types.ts`

## 🤝 Project Docs

- [📘 API Reference](API.md)
- [📦 Release Process](RELEASE.md)
- [🗒️ What's New](WHATSNEW.md)
- [🗺️ Package Roadmap](ROADMAP.md)
- [🔐 Privacy](PRIVACY.md)
- [⚖️ Licence](LICENSE.md)
- [🤝 Contributing](CONTRIBUTING.md)
- [🛡️ Security](SECURITY.md)
- [💬 Support](SUPPORT.md)
