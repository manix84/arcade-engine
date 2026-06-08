# 📘 Arcade Engine API

This reference maps the public exports from `arcade-engine` to what they do,
where to see them, and the simplest way to start using them.

Install the package from npm:

```sh
npm install arcade-engine
```

Import from the package root:

```ts
import { GameArena, Ticker, helpers } from "arcade-engine";
```

## 🎬 Core Classes

| Export | What It Does | See Also |
| --- | --- | --- |
| `GameArena` | Creates and manages a browser canvas, drawing context, fullscreen behavior, asset preloading, text, sprites, circles, and debug grids. | `Engine/Core/GameArena` Storybook section |
| `Ticker` | Runs animation callbacks on `requestAnimationFrame`, with optional render FPS caps and fixed-step simulation. | `Engine/Core/Ticker` Storybook section |
| `Sound` | Wraps browser audio with channels, global controls, fades, playback-blocked reporting, and optional spatial audio. | `Engine/Audio/Sound` Storybook section |
| `helpers` | Default object containing classic geometry, collision, spawn, rotation, clone, random-color, and event helpers. | `Engine/Helpers/*` Storybook sections |

```ts
const arena = new GameArena(document.querySelector("#game") as HTMLElement);
const ticker = new Ticker({ fixedStepFps: 50 });

ticker.addSchedule(() => {
  arena.clear();
  arena.renderText("READY", 0, 0, { align: "center" });
});

ticker.start();
```

## 🧮 Geometry And Events

These functions are available through the default `helpers` export.

| Helper | Use It For |
| --- | --- |
| `helpers.float(number)` | Tidying decimal precision. |
| `helpers.findHeading(target, origin?)` | Distance and heading between two radial objects. |
| `helpers.rotateTo(destinationAngle, currentAngle, stepSize)` | Gradual steering toward a destination angle. |
| `helpers.getSpawnCoords(target, options?)` | Enemy, pickup, projectile, or effect spawn positions around a target. |
| `helpers.detectCollision(target, origin?)` | Radial collision between two objects. |
| `helpers.detectAreaExit(radialCenter, target, radius)` | Boundary exit checks for circular arenas. |
| `helpers.bind(eventNames, callback, element?)` | Lightweight DOM event binding. |
| `helpers.unbind(...eventNames)` | Event cleanup for helpers-bound listeners. |
| `helpers.getRandomColor()` | Debug or placeholder colors. |
| `helpers.cloneObject(oldObject)` | Copying plain data objects. |

```ts
const heading = helpers.findHeading(enemy, player);
enemy.heading = helpers.rotateTo(heading.angle, enemy.heading, 3);
```

## 🎮 Input Actions

| Export | Use It For |
| --- | --- |
| `getInputCode` | Normalize keyboard, mouse, pointer, touch, gamepad, or string input into an input code. |
| `getInputActions` | Resolve an input event or input code to semantic actions. |
| `getInputActionState` | Convert currently pressed inputs into an action-state object. |
| `getGamepadInputCodes` | Read pressed gamepad buttons and active axes. |
| `createInputController` | Track keyboard, mouse, touch, pointer, and gamepad inputs through start/stop lifecycle helpers. |
| `createKeyboardInputController` | Backwards-compatible alias for `createInputController`. |

```ts
const input = createInputController({
  fire: ["Space", "MouseLeft", "TouchPrimary", "Gamepad0"],
  moveLeft: ["ArrowLeft", "KeyA", "GamepadAxisLeftXNegative"],
});

input.start();
input.updateGamepads();

if (input.isPressed("fire")) {
  // Fire a shot.
}
```

## 👥 Multiplayer Input

| Export | Use It For |
| --- | --- |
| `createLocalMultiplayerController` | Track separate action state for multiple local players. |
| `createMultiplayerSession` | Describe a local or remote co-op/PvP session without choosing a backend. |
| `createPlayerInputIntent` | Create serializable player input messages for remote sync. |
| `getPlayerActionState` | Resolve one player's bindings against pressed inputs. |
| `mergePlayerInputIntent` | Merge a local or remote player intent into a player-state map. |

```ts
const multiplayer = createLocalMultiplayerController([
  {
    bindings: { fire: ["Space", "Gamepad0"], moveLeft: ["KeyA"] },
    gamepadIndex: 0,
    id: "p1",
  },
  {
    bindings: { fire: ["Enter", "Gamepad0"], moveLeft: ["KeyJ"] },
    gamepadIndex: 1,
    id: "p2",
  },
]);

multiplayer.start();
multiplayer.updateGamepads();

const state = multiplayer.getState();
```

Remote multiplayer is supported as data contracts rather than a bundled
network stack. Games can send `PlayerInputIntent` objects through WebSocket,
WebRTC, a hosted relay, or their own backend.

## 📱 Browser Capabilities

| Export | Use It For |
| --- | --- |
| `canUseScreenWakeLock` | Detect whether the browser exposes the Screen Wake Lock API. |
| `ScreenWakeLockController` | Acquire, release, and reacquire best-effort screen wake locks around gameplay state. |
| `canUseFullscreen` | Detect fullscreen request support on an element. |
| `canLockOrientation` | Detect Screen Orientation lock support. |
| `enterImmersiveMode` | Request fullscreen and an optional orientation lock from a trusted user gesture. |
| `exitInstalledApp` | Attempt to close an installed app window and dispatch a fallback event if blocked. |
| `appExitBlockedEventName` | Default event name used by `exitInstalledApp`. |

```ts
const wakeLock = new ScreenWakeLockController();

wakeLock.setActive(true);

await enterImmersiveMode({ orientation: "landscape" });

window.addEventListener(appExitBlockedEventName, () => {
  showExitFallback();
});
exitInstalledApp();
```

These helpers treat browser capability calls as optional. Denied or unsupported
requests should not interrupt gameplay.

## ⚙️ User Options

| Export | Use It For |
| --- | --- |
| `createUserOptionsStore` | Create a typed local options store with defaults, normalization, persistence, reset, subscribers, and optional DOM change events. |
| `normalizeUserOptions` | Shallow-merge unknown stored values over defaults before app-specific validation. |
| `userOptionsChangedEventName` | Default DOM event name dispatched after option changes. |

```ts
const options = createUserOptionsStore({
  defaults: {
    fullscreen: false,
    inputMode: "keyboard",
    volume: 6,
  },
  normalize: (stored, defaults) => ({
    ...normalizeUserOptions(stored, defaults),
    volume: Math.max(0, Math.min(10, Number((stored as { volume?: unknown }).volume ?? defaults.volume))),
  }),
  storageKey: "myGame.options",
  version: 1,
});

options.setOption("volume", 8);
options.subscribe(({ changedKeys, options }) => {
  console.info("Options changed", changedKeys, options);
});
```

Games own their concrete schema and validation rules. The store owns the
browser-safe mechanics of reading, writing, resetting, and notifying.

## 📺 Display Filters

| Export | Use It For |
| --- | --- |
| `displayFilterModes` | Ordered preset list for settings menus. |
| `displayFilterModeLabels` | User-facing labels for built-in display filter modes. |
| `displayFilterSettingKeys` | Ordered setting keys for custom filter controls. |
| `displayFilterSettingLabels` | User-facing labels for individual filter settings. |
| `displayFilterSettingDescriptions` | Short descriptions for settings UI. |
| `displayFilterPresets` | Built-in CRT/VHS/off settings. |
| `defaultCustomDisplayFilterSettings` | Default custom settings object. |
| `defaultDisplayFilterRuntimeBoosts` | Zeroed temporary boost values. |
| `normalizeDisplayFilterIntensity` | Clamp unknown values to integer `0..100`. |
| `normalizeDisplayFilterSettings` | Normalize partial or untrusted settings into a complete settings object. |
| `getDisplayFilterSettingsForMode` | Resolve preset/custom settings plus runtime boosts into effective settings. |

```ts
const settings = getDisplayFilterSettingsForMode(
  "arcade-crt",
  defaultCustomDisplayFilterSettings,
  { explosionBloomBoost: 20 }
);

applyCanvasFilter(settings);
```

The helpers produce settings data only. Games choose how to render scanlines,
masking, curvature, bloom, and other presentation effects.

## 🏆 Achievements

| Export | Use It For |
| --- | --- |
| `createAchievementState` | Normalize persisted achievement state into unlocked, unlocked-at, and progress maps. |
| `unlockAchievement` | Mark an achievement as unlocked without mutating previous state. |
| `setAchievementProgress` | Set progress for one achievement and unlock it when its goal is reached. |
| `addAchievementProgress` | Increment progress for one achievement and unlock it when its goal is reached. |
| `getAchievementStatuses` | Combine definitions with current progress and unlock state for rendering. |

```ts
const definitions = [
  {
    description: "Start a run.",
    id: "first-run",
    name: "First Run",
  },
  {
    description: "Collect 10 medals.",
    id: "medal-collector",
    name: "Medal Collector",
    progressGoal: 10,
  },
] as const;

let achievements = createAchievementState();
achievements = unlockAchievement(achievements, "first-run").state;
achievements = addAchievementProgress(
  definitions,
  achievements,
  "medal-collector",
  1
).state;
```

Achievement helpers are local game-state utilities. Remote leaderboard
validation is handled by the high-score helpers. See
`Engine/Systems/New Helpers/Achievements` in Storybook for an interactive
progress and unlock demo.

## 🏅 High Scores

Backend code can import high-score validation helpers without importing the
whole engine root:

```ts
import { validateHighScoreSubmission } from "arcade-engine/high-scores";
```

| Export | Use It For |
| --- | --- |
| `createHighScoreManager` | Create a configurable local leaderboard and optional remote-sync controller. |
| `createHighScoreIntegrity` | Create receipt-backed integrity data for a score submission. |
| `validateHighScoreIntegrity` | Verify score, stats, settings, receipt, and submitted-at values still match integrity data. |
| `validateHighScoreSubmission` | Validate unknown backend payloads before accepting remote leaderboard rows. |
| `isHighScorePlausible` | Check stat limits and weighted score budgets. |
| `getHighScorePlausibilityReasons` | Return machine-readable plausibility failures. |
| `getHighScoreStatValues` | Parse numeric stat lines such as `Enemies: 12`. |
| `normalizeHighScoreName` | Normalize arcade-style score names. |
| `sortHighScores` | Sort score entries by score, timestamp, and name. |
| `isHighScoreEntry` | Type guard for public score rows. |
| `isHighScoreIntegrity` | Type guard for score integrity payloads. |
| `isHighScoreRunReceipt` | Type guard for run receipts. |
| `hashHighScoreText` | Stable non-cryptographic text hash used by integrity helpers. |

```ts
const scores = createHighScoreManager({
  apiBasePath: "/api/scores",
  defaultScores: [],
  gameVersion: "1.0.0",
  storageKey: "myGame.highScores",
});

scores.saveHighScore("ACE", 12000, ["Enemies: 10"]);
```

```ts
const validation = validateHighScoreSubmission(payload, {
  isRunReceiptTrusted: (run) => trustedRunIds.has(run.runId),
  rules: {
    baseScoreBudget: 1000,
    maxScore: 1000000,
    scoreBudget: [
      { stat: "Enemies", points: 500 },
      { stat: "Bosses", points: 5000 },
    ],
  },
});

if (!validation.accepted) {
  throw new Error(validation.error);
}
```

Use these helpers alongside your API routes, receipt signing, score storage,
receipt expiry, and plausibility policy. See
`Engine/Systems/New Helpers/High Scores` in Storybook for a local leaderboard
and validation demo.

## 🎞️ Sprite Animation

| Export | Use It For |
| --- | --- |
| `getSpriteFrameIndex` | Frame timing from elapsed seconds, animation FPS, and frame count. |
| `getSpriteSheetFrame` | Convert a frame index into `GameArena.renderSprite` frame data. |
| `getAnimatedSpriteFrame` | Get timed sprite frame data in one call. |

```ts
const frame = getAnimatedSpriteFrame({
  columns: 4,
  elapsedSeconds,
  fps: 12,
  frameCount: 8,
  frameHeight: 16,
  frameWidth: 16,
});

arena.renderSprite(spriteImage, frame);
```

## 🧩 Grid And Box Helpers

| Export | Use It For |
| --- | --- |
| `getGridSize` | Pixel dimensions for a grid definition. |
| `getGridCell` | Top-left pixel coordinates for a grid cell. |
| `getGridCellCenter` | Center pixel coordinates for a grid cell. |
| `getGridPosition` | Grid coordinates from pixel coordinates. |
| `isInsideGrid` | Cell bounds checks. |
| `clampGridPosition` | Clamping a cell to the grid. |
| `snapToGrid` | Snapping pixel coordinates into a valid grid cell. |
| `clamp` | Numeric clamp utility used by box helpers. |
| `moveBy` | Move a velocity-bearing rectangle over time. |
| `detectBoxCollision` | Axis-aligned rectangle overlap. |
| `containsBox` | Rectangle containment. |
| `keepBoxInside` | Clamp a rectangle inside bounds. |
| `getBoxCenter` | Rectangle center point. |

```ts
const nextPaddle = keepBoxInside(moveBy(paddle, delta), arenaBounds);
const hit = detectBoxCollision(ball, brick);
```

## 🧲 Physics

| Export | Use It For |
| --- | --- |
| `applyGravity2D` | Apply gravity, velocity, floor clamping, and optional bounce to a 2D body. |
| `applyGravity3D` | Apply vertical gravity while preserving depth movement for a 3D body. |
| `createRagdoll2D` | Create a small linked 2D ragdoll point/constraint skeleton. |
| `createRagdoll3D` | Create a linked 3D ragdoll point/constraint skeleton. |
| `stepRagdoll2D` | Step a 2D ragdoll with Verlet-style gravity and constraint solving. |
| `stepRagdoll3D` | Step a 3D ragdoll with gravity, depth, and constraint solving. |

```ts
let body = { posX: 20, posY: 0, velocityY: 0 };

body = applyGravity2D(body, {
  delta,
  floorY: 240,
  gravity: 980,
});
```

## 🧭 Viewport And Debug Vectors

| Export | Use It For |
| --- | --- |
| `getViewportRadius` | Radius from viewport dimensions. |
| `getViewportPaddedRadius` | Radius with padding. |
| `getViewportAreaScale` | Scale values against viewport area. |
| `getScaledViewportLimit` | Responsive spawn/entity limits. |
| `drawDebugVectors` | Canvas overlays for heading, velocity, and target vectors. |

## 📷 Camera

| Export | Use It For |
| --- | --- |
| `getFollowCamera` | 2D camera follow behavior with optional dead zone, smoothing, and world bounds. |

```ts
const camera = getFollowCamera({
  current: previousCamera,
  deadZone: { width: 80, height: 48 },
  smoothing: 0.2,
  target: player,
  viewport,
  worldBounds,
});
```

## 🎨 Canvas Rendering

| Export | Use It For |
| --- | --- |
| `fillCanvasWithTrail` | Frame clears with fading after-images. |
| `drawCanvasLine` | Simple line drawing. |
| `drawCanvasPolygon` | Filled and optionally stroked polygons. |
| `parseHexColor` | Hex color parsing. |
| `colorWithAlpha` | Hex color to RGBA string. |
| `shadeHexColor` | Hex color shading. |

```ts
fillCanvasWithTrail(context, canvas, "#05070a", 0.18);
drawCanvasLine(context, from, to, "#f6e05e", 2);
```

## 🕹️ 2.5D Projection

| Export | Use It For |
| --- | --- |
| `wrapDepth` | Looping depth values through a fixed range. |
| `getLoopedDepth` | Repeating starfields, lanes, gates, or scenery by depth. |
| `getDepthProgress` | Normalized depth progress for alpha, size, and intensity. |
| `getPerspectiveScale` | Scale from depth. |
| `projectPerspectivePoint` | Project a 3D point into 2D canvas coordinates. |
| `projectIsometricPoint` | Convert a 3D grid point into isometric 2D coordinates. |
| `getIsometricTileCorners` | Tile diamond corners for isometric drawing. |
| `getIsometricWallSide` | Extruded wall side polygons. |

```ts
const projected = projectPerspectivePoint(
  { x: laneX, y: 120, z: depth },
  { width: canvas.width, height: canvas.height }
);
```

## 🏃 Arcade Motion

| Export | Use It For |
| --- | --- |
| `getFirstPersonCamera` | First-person center/horizon framing from viewport and look input. |
| `getLoopedScrollerPosition` | Wrapped side-scroller scenery and platform positions. |
| `getSideScrollerActorPosition` | Wrapped actor positions with visibility and progress for obstacles, enemies, pickups, or platforms. |
| `getSideScrollerJumpY` | Simple jump and bob arcs. |
| `getSpatialAudioPan` | Clamp game-space source position into browser pan range. |
| `getSpatialAudioDepth` | Convert source distance into visual depth for 2.5D audio scenes. |

```ts
const camera = getFirstPersonCamera(viewport, {
  centerDrift: 78,
  horizonRatio: 0.47,
  look: pointer,
});
```

## 🔊 Spatial Audio Math

| Export | Use It For |
| --- | --- |
| `getDistanceGain` | Convert listener/source distance into a gain value. |
| `getSpatialAudioMix` | Calculate distance, pan, and gain for a source relative to a listener. |

```ts
const mix = getSpatialAudioMix({
  listener: player,
  listenerRange: 240,
  maxDistance: 480,
  source: pickup,
});

sound.setPan(mix.pan);
```

## 🧊 Cube Clusters

| Export | Use It For |
| --- | --- |
| `createCubeClusterFromPattern` | Build voxel-like block models from text patterns. |
| `createPlasmaLinks` | Generate links between nearby blocks. |
| `centerCubeCluster` | Center block coordinates around their bounds center. |
| `getCubeClusterBounds` | Cluster min/max bounds. |
| `getCubeClusterCenter` | Cluster center point. |
| `cloneCubeBlock` | Copy a cube block. |
| `createExplosionBlocks` | Convert blocks into moving explosion debris. |
| `stepExplosionBlocks` | Advance explosion position, velocity, gravity, drag, and opacity. |
| `getVisibleExplosionBlocks` | Filter faded debris. |
| `normalizeVector` | Normalize a 3D vector. |
| `getVectorDistance` | Distance between 3D points. |

```ts
const cluster = createCubeClusterFromPattern([["###", " # "]]);
const blocks = centerCubeCluster(cluster.blocks);
const explosion = createExplosionBlocks(blocks, { force: 6 });
```

## 🧾 Public Types

The package exports TypeScript types for public data shapes, including:

- Arena, sound, ticker, input, multiplayer, animation, camera, coordinate,
  heading, sprite, and render options.
- Achievement, high-score, grid, box, physics, viewport, debug-vector, canvas
  color, projection, arcade-motion, spatial-audio, cube-cluster, and explosion
  types.

Use these types when building reusable game systems on top of Arcade Engine.
