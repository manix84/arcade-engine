# 🧮 Helper Stories

This folder documents focused helper APIs through visual Storybook examples.
Use these stories when you want to understand what the helper calculates, what
shape of object it expects, and how the result can drive a game scene.

## 🧮 Math

[Math.stories.ts](Math.stories.ts) covers small numeric and color helpers.

### `FloatCleanup`

Shows `helpers.float(number)`. The story demonstrates how noisy JavaScript
decimal results can be cleaned before displaying or comparing values.

Use it when a calculation produces values such as `0.30000000000000004` and you
need a tidy arcade-friendly number.

### `RandomColorPalette`

Shows `helpers.getRandomColor()`. The story builds a color palette so users can
see the generated values.

Use it for simple debug colors, temporary particles, or placeholder arcade
entities.

## 📐 Geometry

[Geometry.stories.ts](Geometry.stories.ts) covers heading, rotation, spawn, and
radial collision helpers.

### `FindHeading`

Shows `helpers.findHeading(target, origin?)`. It calculates distance and angle
between two positioned objects.

Use it for turrets, enemy steering, pointer targeting, homing shots, and debug
lines.

### `RotateTo`

Shows `helpers.rotateTo(destinationAngle, currentAngle, stepSize)`. It rotates
toward a target angle without snapping instantly.

Use it for ships, turrets, enemies, radar sweeps, and any object that needs to
turn gradually.

### `SpawnArc`

Shows `helpers.getSpawnCoords(target, options?)`. It creates positions around a
target using radius, heading, and arc options.

Use it for enemy waves, radial pickups, projectiles, shields, orbiting objects,
and spawn previews.

### `CollisionAndAreaExit`

Shows `helpers.detectCollision(target, origin?)` and
`helpers.detectAreaExit(radialCenter, target, radius)`.

Use radial collision for circular actors, pickups, bullets, and simple arena
entities. Use area exit checks when objects should wrap, bounce, despawn, or be
clamped at an arena boundary.

### Depth Variants

The `FindHeadingDepth`, `RotateToDepth`, `SpawnArcDepth`, and
`CollisionAndAreaExitDepth` stories show how the same helper concepts can be
presented in a layered 2.5D scene. They still use engine helper math; the depth
effect is visual framing.

## 🧱 Objects And Events

[ObjectsAndEvents.stories.ts](ObjectsAndEvents.stories.ts) covers cloning and
DOM event binding.

### `CloneObject`

Shows `helpers.cloneObject(oldObject)`. It creates a copy that can be changed
without mutating the original object.

Use it when demo controls, entity templates, or reset states need a fresh object
instead of a shared reference.

### `BindAndUnbind`

Shows `helpers.bind(eventNames, callback, element?)` and
`helpers.unbind(...eventNames)`.

Use it for small browser event hooks. For larger input systems, keep ownership
clear and make sure listeners are removed during cleanup.

## 🧭 Helper Choice

- Use geometry helpers for radial arcade objects with `posX`, `posY`, and
  `radius`.
- Use grid helpers from `src/grid.ts` for tile/cell games.
- Use box helpers from `src/box-collision.ts` for top-left rectangular
  collisions.
- Use 2.5D helpers from `src/arcade-3d.ts` when the scene needs visual depth,
  isometric projection, or looped depth movement.
