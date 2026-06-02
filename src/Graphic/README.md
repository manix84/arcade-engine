# 🖼️ Legacy Graphic Modules

This folder contains legacy JavaScript graphics modules that remain in the
repository while the TypeScript package migration continues.

These files are not the preferred public API for new games. The current package
entry point is [../index.ts](../index.ts), and canvas rendering should generally
start with `GameArena` from [../arena.ts](../arena.ts).

## 📦 Files

- [../Graphic.js](../Graphic.js) contains the legacy base graphic module.
- [Sprite.js](Sprite.js) contains the legacy sprite wrapper.
- [Sprite/Static.js](Sprite/Static.js) contains the legacy static sprite
  implementation.
- [Sprite/Animated.js](Sprite/Animated.js) contains the legacy animated sprite
  implementation.

## 🧭 When To Use

Use these files as migration references when preserving old behavior. For new
engine code, prefer:

- `GameArena.renderSprite(image, spriteFrame)` for sprite-frame drawing.
- `GameArena.renderText(...)` for text.
- `GameArena.drawCircle(...)` for circle drawing.
- `src/canvas-rendering.ts` helpers for lines, polygons, trails, and color
  work.

## 🧱 Migration Direction

Before deleting or replacing a legacy graphic module:

- Identify which behavior is still useful.
- Add TypeScript tests around the replacement behavior.
- Export the replacement through `src/index.ts` if it becomes public.
- Update Storybook so users can see the modern path.
