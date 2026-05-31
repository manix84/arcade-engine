# 🕹️ Arcade Engine

A small browser arcade-game engine for canvas games.

This repository is currently being modernized from the older AMD/JavaScript
engine to a standalone TypeScript package. The active package entry point is
`src/index.ts`, and published builds are emitted to `dist`.

## ✨ What It Provides

- Canvas arena creation and resizing.
- Fullscreen helpers with browser fallback handling.
- Sprite frame rendering with crisp pixel-art defaults.
- Canvas text rendering with expanded arcade-style spacing.
- Asset preloading with progress callbacks.
- Circle drawing and debug grid helpers.
- RequestAnimationFrame-backed ticking.
- Fixed-step simulation timing support.
- HTML audio wrapper with global pause/resume/stop, music/effects channels,
  fades, playback-blocked reporting, and optional browser spatial panning.
- Geometry, heading, collision, viewport, and debug-vector helpers.
- Grid helpers for cell-based games like Tetris and board-based puzzle games.
- Box movement and collision helpers for Space Invaders, Breakout, platform,
  paddle, brick, shot, and enemy patterns.
- 3D cube-cluster helpers for voxel-style characters, plasma links, and
  deterministic block explosions.

## 📦 Installation

```sh
npm install arcade-engine
```

## 🚪 Package Entry

```ts
import {
  GameArena,
  Sound,
  Ticker,
  createCubeClusterFromPattern,
  detectBoxCollision,
  drawDebugVectors,
  getGridCell,
  getScaledViewportLimit,
  getViewportPaddedRadius,
  helpers,
} from "arcade-engine";
```

The npm package is ESM and publishes generated JavaScript, source maps,
declaration files, and declaration maps from `dist`.

## 🧱 Core Modules

### 🎬 `GameArena`

`GameArena` owns a canvas inside a host element.

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

Useful methods include:

- `resize(width?, height?)`
- `getContext(dimensions?)`
- `enterFullScreen()`
- `exitFullScreen()`
- `toggleFullScreen()`
- `registerAssets(assets)`
- `preloadAssets(callback)`
- `renderText(message, x, y, options)`
- `renderSprite(image, spriteFrame)`
- `drawCircle(x, y, radius, options)`
- `drawDebugGrid(widthSpace?, heightSpace?)`
- `destroy()`

### ⏱️ `Ticker`

`Ticker` schedules frame callbacks with optional render throttling or fixed-step
simulation timing.

```ts
import { Ticker } from "arcade-engine";

const ticker = new Ticker({ fixedStepFps: 50 });

ticker.addSchedule((frame) => {
  updateSimulation(frame);
}, 1);

ticker.start();
```

Use `new Ticker({ fps: 30 })` for capped render-style scheduling, or
`new Ticker({ fixedStepFps: 50 })` for stable simulation catch-up.

### 🔊 `Sound`

`Sound` wraps HTML audio and centralizes music/effects volume behavior.

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

Global helpers include `Sound.pauseAll()`, `Sound.resumePaused()`,
`Sound.stopAll()`, `Sound.destroyAll()`, `Sound.setMuted()`, and
`Sound.refreshAllVolumes()`.

### 🧮 Helpers

The default `helpers` export includes geometry and event helpers:

- `float(number)`
- `rotateTo(destinationAngle, currentAngle, stepSize)`
- `getSpawnCoords(target, options?)`
- `findHeading(target, origin?)`
- `detectCollision(target, origin?)`
- `detectAreaExit(radialCenter, target, radius)`
- `bind(eventNames, callback, element?)`
- `unbind(...eventNames)`
- `getRandomColor()`
- `cloneObject(oldObject)`

Viewport helpers include `getViewportRadius`, `getViewportPaddedRadius`,
`getViewportAreaScale`, and `getScaledViewportLimit`.

### 🧩 Grid Helpers

Grid helpers support fixed-cell games without changing the existing
heading-based helpers.

```ts
import { getGridCell, getGridPosition, snapToGrid } from "arcade-engine";

const board = {
  columns: 10,
  rows: 20,
  cellWidth: 24,
  cellHeight: 24,
  originX: 8,
  originY: 16,
};

const activeCell = getGridPosition(board, { posX: 82, posY: 118 });
const renderCell = getGridCell(board, activeCell);
const snapped = snapToGrid(board, { posX: 999, posY: -20 });
```

Useful helpers include:

- `getGridSize(grid)`
- `getGridCell(grid, position)`
- `getGridCellCenter(grid, position)`
- `getGridPosition(grid, coordinates)`
- `isInsideGrid(grid, position)`
- `clampGridPosition(grid, position)`
- `snapToGrid(grid, coordinates)`

### 🧱 Box Helpers

Box helpers use top-left `posX`/`posY` coordinates and are designed for
axis-aligned games such as Space Invaders, Breakout, and paddle games.

```ts
import { detectBoxCollision, keepBoxInside, moveBy } from "arcade-engine";

const arena = { posX: 0, posY: 0, width: 320, height: 240 };
const paddle = { posX: 280, posY: 220, width: 56, height: 12, velocityX: 80 };
const ball = { posX: 42, posY: 96, width: 8, height: 8 };
const brick = { posX: 40, posY: 88, width: 48, height: 16 };

const movedPaddle = keepBoxInside(moveBy(paddle, 0.5), arena);
const didHitBrick = detectBoxCollision(ball, brick);
```

Useful helpers include:

- `clamp(value, min, max)`
- `moveBy(entity, delta?)`
- `detectBoxCollision(target, origin)`
- `containsBox(bounds, target)`
- `keepBoxInside(target, bounds)`
- `getBoxCenter(box)`

### 🧊 3D Cube Clusters

Cube-cluster helpers describe loosely connected 3D blocks without tying the
engine package to a renderer. Use them with Three.js, Babylon, raw WebGL, or a
custom renderer.

```ts
import {
  centerCubeCluster,
  createCubeClusterFromPattern,
  createExplosionBlocks,
  stepExplosionBlocks,
} from "arcade-engine";

const invader = createCubeClusterFromPattern(
  [
    [" # # ", "#####", "# # #"],
    ["  #  ", " ### ", "  #  "],
  ],
  { size: 1, gap: 0.2, layerGap: 0.2, color: "#4fd1c5" }
);

const blocks = centerCubeCluster(invader.blocks);
let explosion = createExplosionBlocks(blocks, { force: 7 });

explosion = stepExplosionBlocks(explosion, 1 / 60, {
  drag: 0.985,
  fadeSpeed: 0.42,
});
```

Useful helpers include:

- `createCubeClusterFromPattern(layers, options?)`
- `createPlasmaLinks(blocks, maxDistance?)`
- `centerCubeCluster(blocks)`
- `getCubeClusterBounds(blocks)`
- `getCubeClusterCenter(blocks)`
- `createExplosionBlocks(blocks, options?)`
- `stepExplosionBlocks(blocks, delta, options?)`
- `getVisibleExplosionBlocks(blocks)`
- `normalizeVector(vector)`
- `getVectorDistance(a, b)`

## 🛠️ Local Development

Install dependencies:

```sh
npm install
```

Run type checks:

```sh
npm run typecheck
```

Run tests:

```sh
npm test
```

Build the npm package output:

```sh
npm run build
```

Preview the npm tarball contents:

```sh
npm run pack:dry-run
```

Run Storybook locally:

```sh
npm run storybook
```

Build the GitHub Pages Storybook output:

```sh
npm run build:storybook
```

Storybook builds to `storybook-static` and is not included in the npm package
or the `dist` package build.

## 🧪 Tests

The test suite uses Vitest with jsdom and lightweight browser API shims for
canvas, media elements, animation frames, and storage.

Current coverage includes:

- Engine module imports.
- Arena canvas creation, text, sprite, circle, fullscreen, and asset behavior.
- Viewport calculations.
- Grid and box helpers for cell-based and axis-aligned games.
- 3D cube-cluster helpers for voxel character assembly and explosions.
- Debug vector drawing.
- Ticker scheduling and fixed-step behavior.
- Sound lifecycle, volume channels, global pause/resume/stop, playback-blocked
  callbacks, and spatial-audio cleanup.
- Core helper math and event binding.

## 📚 Storybook

Storybook contains live demos for the engine surface:

- `GameArena`
- helper math, geometry, object, and event utilities
- viewport scaling and debug vectors
- requestAnimationFrame, FPS-capped, and fixed-step tickers
- sound playback, global controls, channels, fades, and spatial panning

The Storybook UI uses local Arcade Engine branding and is deployed to GitHub
Pages from the `storybook-static` output.

## 🗺️ Migration Status

Migrated TypeScript modules:

- `src/index.ts`
- `src/arena.ts`
- `src/Ticker.ts`
- `src/Sound.ts`
- `src/helpers.ts`
- `src/viewport.ts`
- `src/debug-vectors.ts`
- `src/types.ts`

Legacy JavaScript modules still present for review:

- `MainMenu.js`
- `src/Fullscreen.js`
- `src/Graphic.js`
- `src/Graphic/Sprite.js`
- `src/Graphic/Sprite/Static.js`
- `src/Graphic/Sprite/Animated.js`
- `src/Ticker/worker.js`
- `src/debugging.js`
- `src/keyboard.js`

## 🤝 Project Docs

- [📝 What's New](WHATSNEW.md)
- [🔐 Privacy](PRIVACY.md)
- [⚖️ Licence](LICENSE.md)
- [🤝 Contributing](CONTRIBUTING.md)
- [🛡️ Security](SECURITY.md)
- [💬 Support](SUPPORT.md)
