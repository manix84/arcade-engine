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
