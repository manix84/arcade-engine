# 🕹️ Arcade Engine

A small browser arcade-game engine for canvas games.

This repository is currently being modernized from the older AMD/JavaScript
engine to a standalone TypeScript package. The active package entry point is
`src/index.ts`.

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

## 📦 Package Entry

```ts
import {
  GameArena,
  Sound,
  Ticker,
  drawDebugVectors,
  getScaledViewportLimit,
  getViewportPaddedRadius,
  helpers,
} from "arcade-engine";
```

The repository is marked `private` while the package shape settles. The source is
usable locally through TypeScript-aware tooling and bundlers.

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

## 🧪 Tests

The test suite uses Vitest with jsdom and lightweight browser API shims for
canvas, media elements, animation frames, and storage.

Current coverage includes:

- Engine module imports.
- Arena canvas creation, text, sprite, circle, fullscreen, and asset behavior.
- Viewport calculations.
- Debug vector drawing.
- Ticker scheduling and fixed-step behavior.
- Sound lifecycle, volume channels, global pause/resume/stop, playback-blocked
  callbacks, and spatial-audio cleanup.
- Core helper math and event binding.

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
