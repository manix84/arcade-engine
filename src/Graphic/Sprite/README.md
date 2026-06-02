# 🧍 Legacy Sprite Implementations

This folder contains legacy JavaScript sprite implementations used as migration
references.

## 📦 Files

- [Static.js](Static.js) represents a non-animated sprite frame.
- [Animated.js](Animated.js) represents sprite animation behavior from the older
  engine.

## 🧭 Current Package Path

New code should prefer `GameArena.renderSprite(image, spriteFrame)` from
[../../arena.ts](../../arena.ts). The modern `SpriteFrame` type is exported from
the package through [../../index.ts](../../index.ts).

## 🧱 Migration Notes

When moving behavior from these files into TypeScript:

- Preserve frame coordinate behavior before changing API shape.
- Keep animation timing separate from rendering where possible.
- Use `Ticker` for frame timing rather than embedding loop ownership in a
  sprite class.
- Add tests for frame selection, bounds, and rendering calls.
