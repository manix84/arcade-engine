# 📚 Storybook Demos

This folder contains Storybook stories for the engine. The stories are living
documentation: they show what each API does, provide controls for changing
inputs, and make game-engine behavior visible through movement, sound, and
telemetry.

Storybook output is built to `storybook-static`. It is documentation/demo output
only and is not part of the published npm package.

## ▶️ Running Storybook

```sh
npm run storybook
```

Build the static version:

```sh
npm run build:storybook
```

## 🧰 Shared Story Utilities

[story-utils.ts](story-utils.ts) provides the shared demo shell, panels,
buttons, value readouts, inputs, generated tones, demo sprite drawing, top-down
ship drawing, target markers, styles, and cleanup helper.

Use it before adding custom story scaffolding. Consistent shells and controls
make the demos easier to compare.

## 🧭 Story Sections

### Overview

[Showcase.stories.ts](Showcase.stories.ts) demonstrates full arcade loops. The
main showcase combines canvas rendering, ticker timing, movement, collisions,
sound-ready controls, and visual debug information. The depth variant shows how
2.5D helper math can make the same arcade loop feel layered.

### Core

[GameArena.stories.ts](GameArena.stories.ts) shows the canvas arena API:
backgrounds, text, sprites, circles, assets, fullscreen behavior, and a
perspective arena variant. It also includes the canvas-rendered FPS debug
overlay with runtime level, position, scale, opacity, and target-FPS controls.
The graph view fills its compact panel and colors performance relative to the
selected FPS target.

[Ticker.stories.ts](Ticker.stories.ts) compares render-capped and fixed-step
tickers in one view.

[ticker/Ticker.stories.ts](ticker/Ticker.stories.ts) splits ticker behavior into
individual stories for requestAnimationFrame, FPS caps, and fixed-step
simulation.

[ViewportDebugVectors.stories.ts](ViewportDebugVectors.stories.ts) shows
viewport scaling, padded radii, movement vectors, and a depth variant.

### Helpers

[Helpers.stories.ts](Helpers.stories.ts) is the broad helper overview. More
focused helper stories live in [helpers/README.md](helpers/README.md).

### Input, Data, Rendering, Effects, And Physics

The shared demo implementations in [systems/](systems/README.md) are grouped in
the Storybook sidebar by the feature they demonstrate:

- `Engine/Input` for input actions and local multiplayer.
- `Engine/Player Data` for user options and high scores.
- `Engine/Achievements` for achievement progress and notifications.
- `Engine/Rendering` for display filters, sprite animation, procedural stars,
  camera helpers, and ray-traced apartment lighting.
- `Engine/Effects` for player, environment, atmospheric, and combo effects.
- `Engine/Physics` for gravity and 2D/3D ragdolls.
- `Engine/Audio/Spatial Audio` for spatial-audio math.

See [systems/README.md](systems/README.md) for the shared implementation notes.

Screen-effect and atmospheric demos share [fps-demo-scene.ts](fps-demo-scene.ts),
a low-resolution Canvas 2D first-person corridor renderer with a fixed
pixel-art HUD weapon asset. It exists so overlays can be judged over a coherent
game-like background instead of flat color blocks.

### Audio

[sound/Sound.stories.ts](sound/Sound.stories.ts) demonstrates sound lifecycle,
effects, music, spatial audio, and global controls. See
[sound/README.md](sound/README.md).

### 3D

[CubeClusters3D.stories.ts](CubeClusters3D.stories.ts) demonstrates
engine-driven cube-cluster data through destructible pickups and modular level
pieces. The story renderer is custom canvas code, but the cluster, link, bounds,
center, and explosion state come from engine helpers.

### Demos

[Arcade3D.stories.ts](Arcade3D.stories.ts) demonstrates different arcade camera
styles that can be built from the engine's 2.5D and canvas helpers:

- Neon vector racer.
- Starfighter run.
- Isometric dungeon room.
- Hyperspace gate.
- First-person player.
- 2D side scroller with obstacles, ladders, platforms, and dummy enemies.
- 2.5D belt side scroller with depth-scaled obstacles and dummy enemies.

The first-person and side-scroller stories use exported arcade-motion helpers
for camera framing, looped scenery, and jump arcs. Story code owns the drawing;
the reusable movement math belongs to the engine.

## 🧪 Interactions

Some stories include Storybook `play` functions and interaction tests. These
are used when a control, button, or visible state should be verified inside
Storybook.

## 🧹 Cleanup

Stories that start a ticker, create sounds, add pointer listeners, or bind
events should use `onRemove` from `story-utils.ts` so the preview cleans up when
the story changes.
