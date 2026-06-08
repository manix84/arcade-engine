# 🧩 Systems Stories

This folder documents engine helpers that coordinate common game systems rather
than a single geometry or drawing operation.

## 🎮 Input Actions

`InputActions` shows how raw inputs map to semantic actions such as `fire`,
`moveLeft`, and `moveRight`.

The story demonstrates:

- Keyboard action state.
- Mouse, touch, and gamepad-style input codes.
- `getInputActionState`.
- Visual movement driven by action state rather than raw browser events.

Use this pattern when a game needs remappable controls or multiple device
families feeding the same gameplay actions.

## 👥 Local Multiplayer

`LocalMultiplayer` shows player-scoped input state for local co-op or local
player-vs-player games.

The story demonstrates:

- Separate player bindings.
- Player one and player two controls.
- Assigned gamepad indexes.
- Co-op session metadata.
- A remote-style input intent merged into the same state shape.

Remote multiplayer is represented as serializable data contracts. Arcade Engine
does not provide a backend, matchmaking, relay, WebSocket server, or WebRTC
signalling server. Games can send `PlayerInputIntent` objects through whichever
transport they own.

## ⚙️ User Options

`UserOptions` shows a generic persisted settings store.

The story demonstrates:

- `createUserOptionsStore`.
- Schema defaults and caller-provided normalization.
- Best-effort local storage writes.
- Reset behavior.
- Store subscribers and change telemetry.

Use this pattern when a game needs persistent player preferences while keeping
its concrete settings schema and validation rules in game code.

## 📺 Display Filters

`DisplayFilters` shows retro display preset settings as renderer-agnostic data.

The story demonstrates:

- `displayFilterModes`.
- `displayFilterModeLabels`.
- `defaultCustomDisplayFilterSettings`.
- `getDisplayFilterSettingsForMode`.
- Runtime boost composition for glow, curvature, dithering, flicker, and
  interference values.

Use this pattern when a game needs CRT/VHS/custom display options but wants the
renderer to stay game-owned.

## 🏆 Achievements

`Achievements` shows local achievement definition, progress, unlock, and status
helpers.

The story demonstrates:

- `createAchievementState`.
- `unlockAchievement`.
- `addAchievementProgress`.
- `getAchievementStatuses`.
- Immutable state updates that can be persisted by the game.
- Storybook actions and play-function checks for the main unlock/reset flow.

Use this pattern when a game needs local achievements, progress counters, or a
status screen without coupling unlock logic to rendering code.

## 🌧️ Screen Effects

The Screen Effects stories show the reusable screen-effect manager with separate
demos for the built-in screen droplets, fire, frost, poison, and low-health
feedback effects.

The story demonstrates:

- `ScreenEffectManager`.
- Built-in effect registration.
- Intensity controls.
- Canvas 2D pixel-snapped particles, bands, droplets, highlights, and trails.
- Storybook actions and play-function checks for effect controls.

Use this pattern when a game needs temporary overlay effects such as rain on a
camera lens, frost, embers, mud, or other visor-style feedback.

## 🏆 Achievement Notifications

`AchievementNotifications` shows a canvas unlock-popup queue.

The story demonstrates:

- `AchievementNotificationRenderer`.
- Queued notifications.
- Slide/hold/exit timing.
- Canvas text and icon-placeholder rendering.

Use this pattern when a game needs achievement popups while keeping achievement
definitions, assets, and render-loop ownership in game code.

## 🏅 High Scores

`HighScores` shows local leaderboard management and backend-importable
validation helpers.

The story demonstrates:

- `createHighScoreManager`.
- Default-score merging and top-score thresholds.
- `createHighScoreIntegrity`.
- `validateHighScoreSubmission`.
- `getHighScorePlausibilityReasons`.
- Storybook actions and play-function checks for save, validate, and tamper
  controls.

Use this pattern when a game needs a local-first score table, optional remote
submission payloads, and server-side checks that can share the same validation
rules.

## 🎞️ Sprite Animation And Camera

`SpriteAnimationAndCamera` shows sprite-frame timing and a follow camera in the
same moving world.

The story demonstrates:

- `getAnimatedSpriteFrame`.
- Sprite-sheet frame selection for canvas rendering.
- `getFollowCamera`.
- Dead-zone and world-bound camera framing.

Use this pattern for top-down arenas, side scrollers, and larger tile worlds
where the renderer should stay simple and the reusable math should live in the
engine.

## 🔊 Spatial Audio Math

`SpatialAudioMath` visualizes listener/source distance, pan, and gain without
playing audio automatically.

The story demonstrates:

- `getSpatialAudioMix`.
- Listener/source positions.
- Pan values.
- Distance-based gain.

Use this helper alongside `Sound.setPan`, custom mixers, or UI telemetry for
positional sound.

## 🧲 Gravity

`Gravity` shows 2D and 3D bodies using exported gravity helpers.

The story demonstrates:

- `applyGravity2D`.
- `applyGravity3D`.
- Floor clamping.
- Bounce and falling-speed limits.

Use this pattern for falling pickups, debris, knockback, thrown objects, or
simple arcade platformer bodies.

## 🧍 2D Ragdoll

`Ragdoll2D` shows a small linked point/constraint skeleton falling under
gravity.

The story demonstrates:

- `createRagdoll2D`.
- `stepRagdoll2D`.
- Pinned and unpinned points.
- Floor collision and repeated constraint solving.

Use this pattern for dummy enemies, impact effects, or simple character
collapse animations.

## 🧍 3D Ragdoll

`Ragdoll3D` shows the same linked skeleton with depth and a simple 3D
projection.

The story demonstrates:

- `createRagdoll3D`.
- `stepRagdoll3D`.
- Depth-aware point projection.
- Constraint solving across X, Y, and Z.

Use this pattern for pseudo-3D or WebGL-style ragdoll effects where the engine
owns the point/constraint data and the renderer decides how to draw it.
