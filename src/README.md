# 🧱 Source Modules

This folder contains the source for the published `arcade-engine` package and
the Storybook demos that document it.

The public package boundary is [index.ts](index.ts). Consumers should import
from the npm package root, `arcade-engine`, not from individual source files.
Internal files are documented here so contributors can understand what each
module owns and where new behavior should live.

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

## 🎮 Input Actions

[input.ts](input.ts) maps raw keyboard, mouse, touch, pointer, and gamepad input
to semantic actions and provides a small controller with explicit start/stop
cleanup.

Use it when a game wants to reason about `jump`, `fire`, or `moveLeft` instead
of browser key names, mouse buttons, touch events, or gamepad button/axis
numbers.

## 👥 Multiplayer

[multiplayer.ts](multiplayer.ts) composes input action controllers into
player-scoped local multiplayer state and provides small data contracts for
remote co-op or PvP input sync.

Use it when a game needs player one/player two controls, assigned gamepad
indexes, or serializable `PlayerInputIntent` objects that can be sent through a
game-owned backend, relay, WebSocket, or WebRTC connection.

## 📱 Browser Capabilities

[browser-capabilities.ts](browser-capabilities.ts) wraps optional browser/PWA
APIs behind small best-effort helpers.

Use it for:

- Screen Wake Lock support detection and lifecycle management.
- Fullscreen and orientation-lock requests from trusted user gestures.
- Installed-app close attempts with a blocked-exit fallback event.

These helpers are exported from the package root. Games still decide when to
request these capabilities and what fallback UI to show when the browser denies
them.

## 📺 Display Filters

[display-filters.ts](display-filters.ts) contains retro display preset data and
normalization helpers.

Use it for:

- CRT, VHS, off, and custom display-filter modes.
- Settings labels and descriptions for menus.
- Normalizing untrusted filter intensities.
- Resolving presets plus temporary runtime boosts into effective settings.

The module returns settings data only; games decide how to apply the visual
effect in CSS, canvas, WebGL, or another renderer.

## ⚙️ User Options

[user-options.ts](user-options.ts) contains a generic local user-options store.

Use it for:

- Schema defaults and caller-provided normalization.
- Best-effort localStorage persistence.
- Reset behavior that removes stored preferences.
- Store subscribers and optional DOM change events.

Games keep their concrete option schema, migrations, and validation rules. The
module is exported from the package root, and the
`Engine/Systems/Player Data/User Options` Storybook story shows a small
settings store.

## 🧰 Runtime Utilities

[runtime-logger.ts](runtime-logger.ts) contains configurable log-level helpers
and a small console logger factory.

[storage-reset.ts](storage-reset.ts) contains best-effort localStorage access
and cleanup helpers for namespaced or score-like keys.

[viewport-scale.ts](viewport-scale.ts) contains manual zoom normalization,
stepping, formatting, and responsive viewport scale helpers.

Use these modules for debug menus, player-facing zoom settings, and maintenance
actions without coupling games to one option schema or storage namespace.

## 🏆 Achievements

[achievements.ts](achievements.ts) contains generic achievement state helpers.

Use it for:

- Achievement definitions, unlock state, progress counters, and status lists.

The module has no browser dependency and is exported from the package root. The
`Engine/Systems/Achievements/Achievements` Storybook story shows progress
counters, direct unlocks, status lists, and immutable state updates.

## 🏆 Achievement Notifications

[achievement-notifications.ts](achievement-notifications.ts) contains a generic
canvas unlock-popup renderer.

Use it for:

- Queued achievement unlock notifications.
- Slide, hold, and exit timing.
- Optional icon sprite frames or placeholder icons.
- Event-driven enqueueing with caller-owned event names and targets.

The renderer depends only on a canvas context and caller-provided viewport data.
Games still own achievement definitions, icon assets, and when to render.

## 🏅 High Scores

[high-scores.ts](high-scores.ts) contains local leaderboard, remote sync, and
submission validation helpers.

Use it for:

- Local-first score storage with configurable storage keys.
- Optional remote sync through configurable API routes.
- Run receipt and integrity payload creation.
- Server receipt issuance, token hashing, expiry checks, and receipt
  validation.
- Backend validation of unknown score-submission payloads.
- Game-specific score plausibility rules based on stat limits and score
  budgets.

Backends can import `arcade-engine/high-scores` for receipt and submission
validation helpers while keeping route handling, score storage, used-receipt
updates, and rate limits app-owned. See the `Engine/Systems/Player Data/High Scores`
Storybook story for local leaderboards, default-score merging, thresholds, integrity
validation, and plausibility feedback.

## 🎞️ Sprite Animation

[animation.ts](animation.ts) calculates animation frame indices and sprite-sheet
frame data for `GameArena.renderSprite`.

Use it when a sprite sheet needs stable timing without embedding animation
state inside rendering code.

## 📷 Camera

[camera.ts](camera.ts) calculates 2D follow-camera positions with optional
dead-zone, smoothing, and world-bound clamping.

Use it for side scrollers, top-down arenas, and larger worlds where the canvas
viewport follows a player or focus object.

## 🧭 Viewport And Debug Vectors

[viewport.ts](viewport.ts) calculates radius, padded radius, area scale, and
scaled viewport limits from dimensions.

[viewport-scale.ts](viewport-scale.ts) covers reference-size scaling and manual
zoom percentages for UI/game surfaces.

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

## 🧲 Physics

[physics.ts](physics.ts) contains lightweight arcade physics helpers:

- 2D gravity integration with velocity, floor clamping, and optional bounce.
- 3D gravity integration that preserves depth movement.
- 2D ragdoll point/constraint creation.
- 3D ragdoll point/constraint creation.
- Verlet-style ragdoll stepping with constraint solving.

Use these helpers for falling objects, impacts, knockbacks, simple dummy
enemies, and visual ragdoll effects without adding a full physics engine.

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

## 🏃 Arcade Motion

[arcade-motion.ts](arcade-motion.ts) contains reusable movement and camera math
that used to live only in Storybook demos:

- First-person camera center/horizon framing.
- Looped side-scroller positions.
- Side-scroller actor positions for obstacles, enemies, pickups, and platforms.
- Simple side-scroller jump arcs.
- Spatial audio pan clamping.
- Spatial audio visual depth calculation.

Use these helpers when a game needs the same arcade camera, side-scroller, or
spatial-audio behavior without copying story-specific formulas.

## 🔊 Spatial Audio Math

[spatial-audio.ts](spatial-audio.ts) calculates distance gain and combined
listener/source pan/gain data.

Use it with `Sound.setPan`, channel volume decisions, or custom positional
audio UI.

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
