# 🧱 Source Modules

This folder contains the source for the published `arcade-engine` package and
the Storybook demos that document it.

The public package boundary is [index.ts](index.ts). Consumers should import
from `arcade-engine`, not from individual source files. Internal files are
documented here so contributors can understand what each module owns and where
new behavior should live.

## 🚪 Public Entry Point

[index.ts](index.ts) re-exports the engine classes, helper functions, and public
types that are included in the package build.

When adding a public API:

- Export the implementation or type from `src/index.ts`.
- Add or update tests for the behavior.
- Update the root [README.md](../README.md) when the API becomes part of the
  package surface.
- Update a local README or Storybook story when users need a visible example.

## 🎬 Canvas Arena

[arena.ts](arena.ts) defines `GameArena`, the browser canvas wrapper.

Use it when a game needs:

- A canvas attached to a host element.
- Resize and context access.
- Fullscreen requests.
- Asset preloading.
- Text, sprite-frame, circle, and debug-grid drawing.
- A single cleanup point through `destroy()`.

`GameArena` is intentionally focused on canvas setup and common drawing helpers.
It does not own game state, physics, input, or scene management.

## ⏱️ Ticker

[Ticker.ts](Ticker.ts) defines the requestAnimationFrame-backed loop scheduler.

Use it for:

- Uncapped animation-frame callbacks.
- Render FPS caps.
- Fixed-step simulation timing.
- Catch-up limits for stable simulation loops.

## 🔊 Sound

[Sound.ts](Sound.ts) wraps HTML audio playback.

Use it for:

- Music and effects channels.
- Global mute, pause, resume, stop, and destroy.
- Fade-in/fade-out behavior.
- Playback-blocked callbacks.
- Optional browser spatial audio.

Audio must still be started by user gestures when browsers require it.

## 🧮 Helpers

[helpers.ts](helpers.ts) contains classic arcade math and DOM helpers:

- Floating-point cleanup.
- Heading calculation.
- Incremental angle rotation.
- Spawn coordinates along an arc.
- Radial collision and area-exit checks.
- Object cloning.
- Random colors.
- Event binding and unbinding.

These helpers work with simple `posX`, `posY`, `radius`, and `heading` style
objects used by many arcade games.

## 🧭 Viewport And Debug Vectors

[viewport.ts](viewport.ts) calculates radius, padded radius, area scale, and
scaled viewport limits from dimensions.

[debug-vectors.ts](debug-vectors.ts) draws visual movement/debug overlays to a
canvas context. Use it to make heading, velocity, and target relationships
visible during development.

## 🧩 Grid And Box Collision

[grid.ts](grid.ts) is for fixed-cell games. It converts between pixel
coordinates and grid cells, clamps positions, and snaps points into cells.

[box-collision.ts](box-collision.ts) is for axis-aligned rectangles. It moves
objects by velocity, checks overlap, keeps boxes inside bounds, and calculates
centers.

Use grid helpers for board/tile logic. Use box helpers for top-left rectangle
movement and collision.

## 🎨 Canvas Rendering

[canvas-rendering.ts](canvas-rendering.ts) contains renderer-agnostic canvas
helpers used by the visual demos:

- `fillCanvasWithTrail` for fading previous frames.
- `drawCanvasLine`.
- `drawCanvasPolygon`.
- `parseHexColor`.
- `colorWithAlpha`.
- `shadeHexColor`.

`fillCanvasWithTrail` accepts normal CSS colors. The color conversion helpers
expect 3 or 6 digit hex strings.

## 🕹️ 2.5D Projection

[arcade-3d.ts](arcade-3d.ts) contains math helpers for pseudo-3D and isometric
canvas scenes:

- Perspective point projection.
- Perspective depth scaling.
- Looped depth movement.
- Depth progress.
- Isometric point projection.
- Isometric tile and wall polygon helpers.

These helpers are not tied to WebGL. They support canvas-rendered arcade camera
styles such as racers, starfields, first-person corridors, isometric rooms, and
2.5D side scrollers.

## 🧊 Cube Clusters

[cube-cluster.ts](cube-cluster.ts) describes voxel-style block structures as
data:

- Build clusters from text patterns.
- Center clusters.
- Get bounds and centers.
- Generate nearby plasma links.
- Create deterministic explosion blocks.
- Step explosion velocity, drag, gravity, and opacity.
- Filter visible debris.

The module does not render cubes. Storybook currently demonstrates one custom
canvas projection, but games can render the same data with Three.js, Babylon,
raw WebGL, or another renderer.

## 🧾 Shared Types

[types.ts](types.ts) contains shared public interfaces for arena options,
coordinates, headings, sprite frames, ticker instances, and sound configuration.

Prefer adding public contracts here when multiple modules or consumers need the
same shape.

## 📚 Stories And Tests

- [stories/README.md](stories/README.md) documents the Storybook demo folders.
- [__tests__/README.md](__tests__/README.md) documents the unit test coverage.
- [test/README.md](test/README.md) documents shared test setup.

Storybook is not part of the package output. Tests and stories are development
documentation for the engine behavior.
