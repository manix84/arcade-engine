# ⏱️ Ticker Stories

This folder documents the `Ticker` module through focused timing demos.

The ticker stories show the difference between how often a frame is rendered
and how far the simulated object moves over time. The ship should travel the
same distance per second regardless of selected render FPS; lower FPS simply
leaves fewer rendered positions.

## 🎞️ RequestAnimationFrame

`RequestAnimationFrame` uses an uncapped `Ticker`. It renders as often as the
browser schedules animation frames.

Use this when:

- You want the browser's natural refresh cadence.
- Rendering every available frame is acceptable.
- Simulation is simple enough to update once per rendered frame.

## 🎚️ Render FPS Cap

`RenderFpsCap` uses `new Ticker({ fps })`. It caps draw callbacks to a target
FPS while movement remains based on elapsed time.

Use this when:

- You want to compare 1 FPS, 2 FPS, 5 FPS, 10 FPS, 30 FPS, 60 FPS, and higher
  browser-supported render rates.
- A game should render less often to reduce work.
- You still want actors to move at the same speed per second.

The Storybook controls expose common FPS steps and a `Max` option.

## 🧮 Fixed-Step Simulation

`FixedStepSimulation` uses `new Ticker({ fixedStepFps })`. It separates
simulation steps from render cadence and can catch up after slow frames.

Use this when:

- Collision or physics should be deterministic.
- Movement should advance in consistent simulation steps.
- A slow render frame should not permanently slow the game state.

## 📊 Telemetry

Ticker stories display measured FPS plus min/max/average values. These values
reset when target FPS changes so users can compare the new setting cleanly.

The border flash marks each rendered frame. After-image circles show where a
frame was drawn and fade over time, making frame cadence visible.

## 🧹 Cleanup

Stories that start a ticker must stop it when the story unloads. Use
`onRemove` from `../story-utils.ts` for cleanup.
