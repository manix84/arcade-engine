# 🔊 Sound Stories

This folder documents the `Sound` module through Storybook demos. The stories
show how browser audio behavior maps to game controls and how global sound
state affects multiple sounds.

Audio playback must stay behind user gestures. The stories use buttons instead
of autoplay so they work with browser media restrictions.

## 🎚️ Master Sound

`MasterSound` demonstrates global sound state:

- Configure shared volume behavior.
- Create sound instances.
- Play and stop sounds from user gestures.
- Mute and unmute.
- Pause and resume active sounds.
- Clean up sounds when a story unloads.

Use this pattern for menus, settings screens, pause screens, and global game
audio controls.

## 💥 Sound Effects

`SoundEffects` demonstrates short effect playback.

It is useful for:

- Button feedback.
- Pickups.
- Shots.
- Collisions.
- UI confirmation sounds.

Effects should be short, low-intensity, and safe to trigger repeatedly.

## 🎵 Music

`Music` demonstrates music-channel playback and fades.

It is useful for:

- Menu music.
- Level loops.
- Smooth transitions.
- Fade-out before changing scenes.

Use the music channel separately from effects so games can expose sensible
volume controls.

## 🧭 Spatial And Global Audio

`SpatialAndGlobalAudio` demonstrates listener/source relationships and global
controls in the same scene.

The story makes listener position, sound source position, panning, and movement
visible. Use this pattern when a game needs positional audio tied to entities in
the arena.

`SpatialAndGlobalAudioDepth` presents the same concept with 2.5D visual depth.
The spatial behavior still comes from the engine `Sound` module; the depth view
helps users understand source distance and direction. The story uses exported
arcade-motion helpers for pan clamping and visual depth math.

## 🧹 Cleanup

Stories that create `Sound` instances should stop or destroy them when the
preview unloads. Use `Sound.stopAll()`, `Sound.destroyAll()`, or story-specific
cleanup depending on ownership.

## 🧪 Testing Notes

Unit tests use mocked media elements and audio APIs. Storybook is still useful
because it lets users verify real browser gesture, autoplay, and panning
behavior manually.
