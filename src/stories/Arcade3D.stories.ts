import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  colorWithAlpha,
  drawCanvasLine,
  drawCanvasPolygon,
  fillCanvasWithTrail,
  getDepthProgress,
  getFirstPersonCamera,
  getIsometricTileCorners,
  getIsometricWallSide,
  getLoopedScrollerPosition,
  getLoopedDepth,
  projectIsometricPoint,
  projectPerspectivePoint,
  getSideScrollerJumpY,
  Ticker,
} from "../index.js";
import {
  appendStyles,
  createDemoShell,
  createPanel,
  createValue,
  onRemove,
  setValue,
} from "./story-utils.js";

const meta = {
  title: "Engine/Demos/Arcade Camera Styles",
} satisfies Meta;

export default meta;

type Arcade3DStoryArgs = {
  accentColor: string;
  backgroundColor: string;
  depth: number;
  objectCount: number;
  secondaryColor: string;
  speed: number;
  trailOpacity: number;
};

type Story = StoryObj<Arcade3DStoryArgs>;

type PointerState = {
  active: boolean;
  x: number;
  y: number;
};

type SceneContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  delta: number;
  elapsed: number;
  frame: number;
  pointer: PointerState;
};

const argTypes: Story["argTypes"] = {
  accentColor: { name: "Accent color", control: "color" },
  backgroundColor: { name: "Background color", control: "color" },
  depth: { name: "Depth range", control: { type: "range", min: 8, max: 44, step: 1 } },
  objectCount: { name: "Object count", control: { type: "range", min: 6, max: 90, step: 1 } },
  secondaryColor: { name: "Secondary color", control: "color" },
  speed: { name: "Scene speed", control: { type: "range", min: 0.2, max: 4, step: 0.1 } },
  trailOpacity: { name: "Trail opacity", control: { type: "range", min: 0, max: 0.45, step: 0.01 } },
};

const defaultArgs = {
  accentColor: "#4fd1c5",
  backgroundColor: "#05070a",
  depth: 24,
  objectCount: 28,
  secondaryColor: "#f6e05e",
  speed: 1,
  trailOpacity: 0.16,
} satisfies Arcade3DStoryArgs;

const createStoryShell = (
  title: string,
  args: Arcade3DStoryArgs,
  renderScene: (scene: SceneContext, args: Arcade3DStoryArgs) => void,
  stats: Array<[string, string | number]>
): HTMLElement => {
  const shell = createDemoShell(title);
  const grid = document.createElement("div");
  const scenePanel = createPanel("Scene");
  const telemetryPanel = createPanel("Telemetry");
  const stage = document.createElement("div");
  const canvas = document.createElement("canvas");
  const values = document.createElement("div");
  const valueItems = stats.map(([label, value]) => createValue(label, value));
  const fpsValue = createValue("fps", "0");
  const ticker = new Ticker();
  const pointer: PointerState = { active: false, x: 0, y: 0 };
  let frame = 0;
  let lastTime = performance.now();
  let fpsAge = 0;
  let fpsFrames = 0;

  appendStyles(shell);
  grid.className = "ae-grid";
  stage.className = "ae-stage";
  values.className = "ae-values";
  canvas.width = 760;
  canvas.height = 420;
  canvas.style.cursor = "grab";
  canvas.style.touchAction = "none";
  stage.appendChild(canvas);
  values.append(...valueItems, fpsValue);
  scenePanel.appendChild(stage);
  telemetryPanel.appendChild(values);
  grid.append(scenePanel, telemetryPanel);
  shell.appendChild(grid);

  const context = canvas.getContext("2d");

  if (!context) {
    return shell;
  }

  const updatePointer = (event: PointerEvent): void => {
    const bounds = canvas.getBoundingClientRect();

    pointer.active = true;
    pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    pointer.y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
  };

  const handlePointerDown = (event: PointerEvent): void => {
    updatePointer(event);
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent): void => updatePointer(event);

  const handlePointerUp = (event: PointerEvent): void => {
    canvas.style.cursor = "grab";

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerLeave = (): void => {
    pointer.active = false;
    pointer.x = 0;
    pointer.y = 0;
  };

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerLeave);

  const render = (): void => {
    const now = performance.now();
    const delta = Math.min(0.05, (now - lastTime) / 1000);

    frame += 1;
    fpsAge += delta;
    fpsFrames += 1;
    lastTime = now;

    if (fpsAge >= 0.5) {
      setValue(fpsValue, Math.round(fpsFrames / fpsAge));
      fpsAge = 0;
      fpsFrames = 0;
    }

    renderScene(
      {
        canvas,
        context,
        delta,
        elapsed: now / 1000,
        frame,
        pointer,
      },
      args
    );
  };

  ticker.addSchedule(render, 1);
  ticker.start();
  onRemove(shell, () => {
    ticker.stop();
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerUp);
    canvas.removeEventListener("pointerleave", handlePointerLeave);
  });

  return shell;
};

const drawNeonRacer = (
  { canvas, context, elapsed, pointer }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const cameraOffset = pointer.x * 54;
  const horizon = canvas.height * 0.38 + pointer.y * 18;
  const centerX = canvas.width / 2 + cameraOffset;
  const roadTop = canvas.width * 0.08;
  const roadBottom = canvas.width * 0.43;
  const road = [
    { x: centerX - roadTop, y: horizon },
    { x: centerX + roadTop, y: horizon },
    { x: canvas.width / 2 + roadBottom + cameraOffset * 0.22, y: canvas.height },
    { x: canvas.width / 2 - roadBottom + cameraOffset * 0.22, y: canvas.height },
  ];

  fillCanvasWithTrail(context, canvas, args.backgroundColor, args.trailOpacity);
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);

  sky.addColorStop(0, colorWithAlpha(args.accentColor, 0.12));
  sky.addColorStop(0.52, colorWithAlpha(args.backgroundColor, 0.2));
  sky.addColorStop(1, colorWithAlpha(args.secondaryColor, 0.08));
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawCanvasPolygon(context, road, "rgba(8, 12, 18, 0.92)", colorWithAlpha(args.accentColor, 0.42));

  for (let index = 0; index < Math.max(8, args.objectCount); index++) {
    const z = getLoopedDepth({
      depth: args.depth,
      elapsedSeconds: elapsed,
      index,
      spacing: 2.6,
      speed: args.speed * 7,
    });
    const width = 10 + z * 5.5;
    const y = horizon + (canvas.height - horizon) * (1 - z / args.depth) ** 2;
    const center = centerX + Math.sin(z * 0.9 + elapsed) * 18 * (1 - z / args.depth);

    drawCanvasLine(
      context,
      { x: center - width, y },
      { x: center + width, y },
      index % 2 === 0 ? colorWithAlpha(args.secondaryColor, 0.95) : colorWithAlpha(args.accentColor, 0.85),
      Math.max(1, 5 * (1 - z / args.depth))
    );
  }

  for (let lane = -2; lane <= 2; lane++) {
    const from = projectPerspectivePoint(
      { x: lane * 58, y: 140, z: args.depth },
      { height: canvas.height, width: canvas.width },
      { centerX, horizon }
    );
    const to = projectPerspectivePoint(
      { x: lane * 210, y: 280, z: 0.5 },
      { height: canvas.height, width: canvas.width },
      { centerX, horizon }
    );

    drawCanvasLine(context, from, to, colorWithAlpha(args.accentColor, lane === 0 ? 0.55 : 0.22), lane === 0 ? 2 : 1);
  }

  for (let index = 0; index < Math.min(8, args.objectCount); index++) {
    const z = getLoopedDepth({
      depth: args.depth,
      elapsedSeconds: elapsed,
      index,
      offset: 4,
      spacing: 4.7,
      speed: args.speed * 5,
    });
    const side = index % 2 === 0 ? -1 : 1;
    const p = projectPerspectivePoint(
      {
        x: side * (120 + Math.sin(index) * 40),
        y: 190,
        z,
      },
      { height: canvas.height, width: canvas.width },
      { centerX, horizon }
    );
    const width = 38 * p.scale;
    const height = 24 * p.scale;

    drawCanvasPolygon(
      context,
      [
        { x: p.x - width, y: p.y + height },
        { x: p.x - width * 0.58, y: p.y - height },
        { x: p.x + width * 0.58, y: p.y - height },
        { x: p.x + width, y: p.y + height },
      ],
      colorWithAlpha(index % 2 === 0 ? args.accentColor : args.secondaryColor, 0.45),
      colorWithAlpha("#ffffff", 0.28)
    );
  }

  drawCanvasPolygon(
    context,
    [
      { x: canvas.width / 2 - 56 + pointer.x * 18, y: canvas.height - 34 },
      { x: canvas.width / 2 - 30 + pointer.x * 8, y: canvas.height - 92 + pointer.y * 8 },
      { x: canvas.width / 2 + 30 + pointer.x * 8, y: canvas.height - 92 + pointer.y * 8 },
      { x: canvas.width / 2 + 56 + pointer.x * 18, y: canvas.height - 34 },
    ],
    colorWithAlpha(args.accentColor, 0.78),
    "#f5f7fb"
  );
};

const drawStarfighterRun = (
  { canvas, context, elapsed, pointer }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const centerX = canvas.width / 2 + pointer.x * 74;
  const horizon = canvas.height * 0.46 + pointer.y * 46;

  fillCanvasWithTrail(context, canvas, args.backgroundColor, args.trailOpacity);

  for (let index = 0; index < args.objectCount; index++) {
    const seed = index * 47.7;
    const z = getLoopedDepth({
      depth: args.depth,
      elapsedSeconds: elapsed,
      offset: seed,
      speed: args.speed * 14,
    });
    const angle = seed * 1.618;
    const radius = 70 + (index % 9) * 38;
    const point = projectPerspectivePoint(
      {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle * 1.4) * radius * 0.58,
        z,
      },
      { height: canvas.height, width: canvas.width },
      { centerX, focalLength: 440, horizon }
    );
    const tail = projectPerspectivePoint(
      {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle * 1.4) * radius * 0.58,
        z: z + 1.8,
      },
      { height: canvas.height, width: canvas.width },
      { centerX, focalLength: 440, horizon }
    );

    drawCanvasLine(
      context,
      tail,
      point,
      colorWithAlpha(index % 5 === 0 ? args.secondaryColor : args.accentColor, 0.18 + point.scale),
      Math.max(1, 4 * point.scale)
    );
  }

  for (let index = 0; index < Math.min(8, args.objectCount); index++) {
    const z = getLoopedDepth({
      depth: args.depth,
      elapsedSeconds: elapsed,
      index,
      offset: 6,
      spacing: 3.9,
      speed: args.speed * 4.2,
    });
    const orbit = elapsed * 0.9 + index;
    const target = projectPerspectivePoint(
      {
        x: Math.sin(orbit * 0.8) * 220,
        y: Math.cos(orbit * 1.1) * 90,
        z,
      },
      { height: canvas.height, width: canvas.width },
      { centerX, focalLength: 420, horizon }
    );
    const radius = 32 * target.scale;

    context.strokeStyle = colorWithAlpha(index % 2 === 0 ? args.secondaryColor : args.accentColor, 0.85);
    context.lineWidth = Math.max(1, 3 * target.scale);
    context.beginPath();
    context.arc(target.x, target.y, radius, 0, Math.PI * 2);
    context.moveTo(target.x - radius * 1.45, target.y);
    context.lineTo(target.x + radius * 1.45, target.y);
    context.moveTo(target.x, target.y - radius * 1.45);
    context.lineTo(target.x, target.y + radius * 1.45);
    context.stroke();
  }

  context.strokeStyle = colorWithAlpha("#ffffff", 0.7);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(canvas.width / 2 - 24 + pointer.x * 24, canvas.height - 70);
  context.lineTo(canvas.width / 2 + pointer.x * 10, canvas.height - 116 + pointer.y * 12);
  context.lineTo(canvas.width / 2 + 24 + pointer.x * 24, canvas.height - 70);
  context.moveTo(canvas.width / 2 - 70 + pointer.x * 34, canvas.height - 52);
  context.lineTo(canvas.width / 2 + pointer.x * 10, canvas.height - 86 + pointer.y * 10);
  context.lineTo(canvas.width / 2 + 70 + pointer.x * 34, canvas.height - 52);
  context.stroke();
};

const drawIsometricDungeon = (
  { canvas, context, elapsed, pointer }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const tile = 34;
  const origin = { x: canvas.width / 2 + pointer.x * 86, y: 112 + pointer.y * 46 };
  const isoOptions = { origin, tileHeight: tile, tileWidth: tile * 2 };
  const bob = Math.sin(elapsed * args.speed * 1.8) * 4;

  fillCanvasWithTrail(context, canvas, args.backgroundColor, args.trailOpacity * 0.4);

  for (let z = 7; z >= -7; z--) {
    for (let x = -7; x <= 7; x++) {
      const distance = Math.abs(x) + Math.abs(z);
      const center = projectIsometricPoint({ x, y: 0, z }, isoOptions);
      const tileCorners = getIsometricTileCorners(center, isoOptions);
      const isWall = distance > 8 || (x === -2 && z > -5 && z < 4) || (z === 3 && x > -1 && x < 6);
      const pulse = 0.55 + Math.sin(elapsed * args.speed + distance) * 0.08;

      drawCanvasPolygon(
        context,
        tileCorners,
        colorWithAlpha(isWall ? args.secondaryColor : args.accentColor, isWall ? 0.16 : 0.08 + pulse * 0.08),
        colorWithAlpha(isWall ? args.secondaryColor : args.accentColor, isWall ? 0.48 : 0.22)
      );

      if (isWall) {
        drawCanvasPolygon(
          context,
          getIsometricWallSide(tileCorners, tile),
          colorWithAlpha(args.secondaryColor, 0.15)
        );
      }
    }
  }

  for (let index = 0; index < Math.min(10, args.objectCount); index++) {
    const angle = elapsed * args.speed * 0.8 + index * 2.1;
    const gridX = Math.round(Math.cos(angle) * 4);
    const gridZ = Math.round(Math.sin(angle * 0.7) * 3);
    const loot = projectIsometricPoint({ x: gridX, y: 0, z: gridZ }, isoOptions);
    const x = loot.x;
    const y = loot.y - 18 - bob;

    context.fillStyle = colorWithAlpha(index % 2 === 0 ? args.accentColor : args.secondaryColor, 0.82);
    context.beginPath();
    context.moveTo(x, y - 18);
    context.lineTo(x + 15, y);
    context.lineTo(x, y + 18);
    context.lineTo(x - 15, y);
    context.closePath();
    context.fill();
    context.strokeStyle = colorWithAlpha("#ffffff", 0.45);
    context.stroke();
  }
};

const drawHyperspaceGate = (
  { canvas, context, elapsed, pointer }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const center = {
    x: canvas.width / 2 + pointer.x * 58,
    y: canvas.height / 2 + pointer.y * 38,
  };

  fillCanvasWithTrail(context, canvas, args.backgroundColor, args.trailOpacity);

  for (let index = 0; index < args.objectCount; index++) {
    const z = getLoopedDepth({
      depth: args.depth,
      elapsedSeconds: elapsed,
      index,
      spacing: 1.5,
      speed: args.speed * 5,
    });
    const progress = getDepthProgress(z, args.depth);
    const radius = 32 + progress * 360;
    const sides = 18;
    const spin = elapsed * args.speed * 0.8 + index * 0.2;
    const alpha = 0.08 + progress * 0.5;

    context.beginPath();
    for (let side = 0; side <= sides; side++) {
      const angle = (side / sides) * Math.PI * 2 + spin;
      const wobble = Math.sin(angle * 3 + elapsed * args.speed) * 8 * progress;
      const x = center.x + Math.cos(angle) * (radius + wobble);
      const y = center.y + Math.sin(angle) * (radius * 0.56 + wobble);

      if (side === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.strokeStyle = colorWithAlpha(index % 2 === 0 ? args.accentColor : args.secondaryColor, alpha);
    context.lineWidth = Math.max(1, progress * 5);
    context.stroke();
  }

  for (let beam = 0; beam < 12; beam++) {
    const angle = (beam / 12) * Math.PI * 2 + elapsed * args.speed * 0.2;
    const inner = 34;
    const outer = 380;

    drawCanvasLine(
      context,
      {
        x: center.x + Math.cos(angle) * inner,
        y: center.y + Math.sin(angle) * inner * 0.56,
      },
      {
        x: center.x + Math.cos(angle) * outer,
        y: center.y + Math.sin(angle) * outer * 0.56,
      },
      colorWithAlpha(beam % 2 === 0 ? args.accentColor : args.secondaryColor, 0.18),
      2
    );
  }

  context.fillStyle = colorWithAlpha(args.backgroundColor, 0.72);
  context.beginPath();
  context.ellipse(center.x, center.y, 42, 24, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = colorWithAlpha("#ffffff", 0.5);
  context.stroke();
};

const drawFirstPersonPlayer = (
  { canvas, context, elapsed, pointer }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const { centerX, horizon } = getFirstPersonCamera(
    { height: canvas.height, width: canvas.width },
    {
      bobAmount: 6,
      bobSpeed: 1.5,
      centerDrift: 78,
      elapsedSeconds: elapsed,
      horizonDrift: 34,
      horizonRatio: 0.47,
      look: pointer,
      speed: args.speed,
    }
  );
  const viewport = { height: canvas.height, width: canvas.width };

  fillCanvasWithTrail(context, canvas, args.backgroundColor, args.trailOpacity);
  context.fillStyle = colorWithAlpha(args.accentColor, 0.08);
  context.fillRect(0, 0, canvas.width, horizon);
  context.fillStyle = colorWithAlpha(args.secondaryColor, 0.06);
  context.fillRect(0, horizon, canvas.width, canvas.height - horizon);

  for (let index = 0; index < args.objectCount; index++) {
    const z = getLoopedDepth({
      depth: args.depth,
      elapsedSeconds: elapsed,
      index,
      offset: 2,
      spacing: 1.7,
      speed: args.speed * 5,
    });
    const progress = getDepthProgress(z, args.depth);
    const leftNear = projectPerspectivePoint({ x: -260, y: 220, z }, viewport, { centerX, horizon });
    const rightNear = projectPerspectivePoint({ x: 260, y: 220, z }, viewport, { centerX, horizon });
    const leftFar = projectPerspectivePoint({ x: -260, y: -140, z }, viewport, { centerX, horizon });
    const rightFar = projectPerspectivePoint({ x: 260, y: -140, z }, viewport, { centerX, horizon });
    const alpha = 0.08 + progress * 0.34;

    drawCanvasLine(context, leftNear, leftFar, colorWithAlpha(args.accentColor, alpha), Math.max(1, progress * 5));
    drawCanvasLine(context, rightNear, rightFar, colorWithAlpha(args.accentColor, alpha), Math.max(1, progress * 5));
    drawCanvasLine(context, leftFar, rightFar, colorWithAlpha(args.secondaryColor, alpha * 0.8), Math.max(1, progress * 4));

    if (index % 3 === 0) {
      const marker = projectPerspectivePoint(
        { x: Math.sin(index * 2.4) * 150, y: 64, z },
        viewport,
        { centerX, horizon }
      );
      const size = 34 * marker.scale;

      drawCanvasPolygon(
        context,
        [
          { x: marker.x, y: marker.y - size },
          { x: marker.x + size, y: marker.y },
          { x: marker.x, y: marker.y + size },
          { x: marker.x - size, y: marker.y },
        ],
        colorWithAlpha(index % 2 === 0 ? args.secondaryColor : args.accentColor, 0.18 + progress * 0.5),
        colorWithAlpha("#ffffff", 0.22 + progress * 0.2)
      );
    }
  }

  const reticle = { x: centerX, y: horizon - 4 };

  drawCanvasLine(context, { x: reticle.x - 24, y: reticle.y }, { x: reticle.x - 6, y: reticle.y }, "#f5f7fb", 2);
  drawCanvasLine(context, { x: reticle.x + 6, y: reticle.y }, { x: reticle.x + 24, y: reticle.y }, "#f5f7fb", 2);
  drawCanvasLine(context, { x: reticle.x, y: reticle.y - 24 }, { x: reticle.x, y: reticle.y - 6 }, "#f5f7fb", 2);
  drawCanvasLine(context, { x: reticle.x, y: reticle.y + 6 }, { x: reticle.x, y: reticle.y + 24 }, "#f5f7fb", 2);

  drawCanvasPolygon(
    context,
    [
      { x: canvas.width / 2 - 42 + pointer.x * 20, y: canvas.height },
      { x: canvas.width / 2 - 20 + pointer.x * 9, y: canvas.height - 74 + pointer.y * 8 },
      { x: canvas.width / 2 + 20 + pointer.x * 9, y: canvas.height - 74 + pointer.y * 8 },
      { x: canvas.width / 2 + 42 + pointer.x * 20, y: canvas.height },
    ],
    colorWithAlpha(args.secondaryColor, 0.54),
    colorWithAlpha("#ffffff", 0.36)
  );
};

const drawSideScroller2D = (
  { canvas, context, elapsed }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const groundY = canvas.height - 78;

  fillCanvasWithTrail(context, canvas, args.backgroundColor, args.trailOpacity * 0.35);
  context.fillStyle = colorWithAlpha(args.accentColor, 0.08);
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let layer = 0; layer < 3; layer++) {
    const speed = args.speed * (24 + layer * 28);
    const tileWidth = 190 - layer * 24;
    const y = 105 + layer * 62;
    const alpha = 0.12 + layer * 0.1;

    for (let index = -1; index < 7; index++) {
      const x =
        getLoopedScrollerPosition({
          elapsedSeconds: elapsed,
          index,
          offset: -tileWidth,
          range: tileWidth * 6,
          spacing: tileWidth,
          speed,
        });
      const height = 34 + Math.sin(index * 1.7 + layer) * 14 + layer * 18;

      drawCanvasPolygon(
        context,
        [
          { x, y: y + height },
          { x: x + tileWidth * 0.44, y },
          { x: x + tileWidth * 0.88, y: y + height },
        ],
        colorWithAlpha(layer === 2 ? args.secondaryColor : args.accentColor, alpha)
      );
    }
  }

  context.fillStyle = colorWithAlpha(args.secondaryColor, 0.18);
  context.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  drawCanvasLine(context, { x: 0, y: groundY }, { x: canvas.width, y: groundY }, colorWithAlpha(args.secondaryColor, 0.7), 3);

  for (let index = 0; index < Math.max(8, args.objectCount); index++) {
    const x =
      getLoopedScrollerPosition({
        elapsedSeconds: elapsed,
        index,
        offset: -70,
        range: canvas.width + 140,
        spacing: 116,
        speed: args.speed * 150,
      });
    const platformY = groundY - 44 - (index % 4) * 34;
    const width = 78 + (index % 3) * 28;

    drawCanvasPolygon(
      context,
      [
        { x, y: platformY },
        { x: x + width, y: platformY },
        { x: x + width - 12, y: platformY + 18 },
        { x: x + 12, y: platformY + 18 },
      ],
      colorWithAlpha(args.accentColor, 0.35),
      colorWithAlpha("#ffffff", 0.18)
    );
  }

  const playerX = canvas.width * 0.34;
  const playerY = getSideScrollerJumpY({
    elapsedSeconds: elapsed,
    groundY: groundY - 36,
    height: 54,
    speed: args.speed * 5,
  });

  context.fillStyle = colorWithAlpha(args.secondaryColor, 0.9);
  context.fillRect(playerX - 16, playerY - 28, 32, 42);
  context.fillStyle = colorWithAlpha(args.accentColor, 0.9);
  context.fillRect(playerX - 20, playerY + 12, 40, 14);
  drawCanvasLine(context, { x: playerX + 18, y: playerY - 8 }, { x: playerX + 46, y: playerY - 14 }, "#f5f7fb", 3);
};

const drawSideScroller2_5D = (
  { canvas, context, elapsed, pointer }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const centerX = canvas.width / 2 + pointer.x * 64;
  const horizon = canvas.height * 0.36 + pointer.y * 28;
  const viewport = { height: canvas.height, width: canvas.width };

  fillCanvasWithTrail(context, canvas, args.backgroundColor, args.trailOpacity * 0.55);
  context.fillStyle = colorWithAlpha(args.accentColor, 0.06);
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let lane = 0; lane < 4; lane++) {
    const z = 2 + lane * 3.6;
    const left = projectPerspectivePoint({ x: -420, y: 260, z }, viewport, { centerX, horizon });
    const right = projectPerspectivePoint({ x: 420, y: 260, z }, viewport, { centerX, horizon });

    drawCanvasLine(
      context,
      left,
      right,
      colorWithAlpha(lane % 2 === 0 ? args.secondaryColor : args.accentColor, 0.18 + lane * 0.08),
      2 + lane
    );
  }

  for (let index = 0; index < Math.max(12, args.objectCount); index++) {
    const depth = 3 + (index % 4) * 3.2;
    const laneProgress = getDepthProgress(depth, args.depth);
    const x =
      getLoopedScrollerPosition({
        elapsedSeconds: elapsed,
        index,
        offset: -80,
        range: canvas.width + 160,
        spacing: 92,
        speed: args.speed * (90 + laneProgress * 90),
      });
    const base = projectPerspectivePoint(
      { x: x - canvas.width / 2, y: 210, z: depth },
      viewport,
      { centerX, horizon }
    );
    const width = 42 + laneProgress * 56;
    const height = 28 + laneProgress * 38;

    drawCanvasPolygon(
      context,
      [
        { x: base.x - width, y: base.y },
        { x: base.x + width, y: base.y },
        { x: base.x + width * 0.68, y: base.y - height },
        { x: base.x - width * 0.68, y: base.y - height },
      ],
      colorWithAlpha(index % 2 === 0 ? args.accentColor : args.secondaryColor, 0.24 + laneProgress * 0.36),
      colorWithAlpha("#ffffff", 0.18 + laneProgress * 0.16)
    );
  }

  const playerBase = projectPerspectivePoint({ x: -170, y: 215, z: 4 }, viewport, { centerX, horizon });
  const bob = Math.sin(elapsed * args.speed * 5) * 7;

  drawCanvasPolygon(
    context,
    [
      { x: playerBase.x - 42, y: playerBase.y },
      { x: playerBase.x + 42, y: playerBase.y },
      { x: playerBase.x + 28, y: playerBase.y - 58 + bob },
      { x: playerBase.x - 28, y: playerBase.y - 58 + bob },
    ],
    colorWithAlpha(args.secondaryColor, 0.82),
    "#f5f7fb"
  );
  drawCanvasLine(context, { x: playerBase.x + 34, y: playerBase.y - 36 + bob }, { x: playerBase.x + 86, y: playerBase.y - 48 + bob }, colorWithAlpha(args.accentColor, 0.86), 4);
};

export const NeonVectorRacer: Story = {
  args: {
    ...defaultArgs,
    accentColor: "#4fd1c5",
    depth: 28,
    objectCount: 26,
    secondaryColor: "#f6e05e",
    speed: 1.5,
    trailOpacity: 0.18,
  },
  argTypes,
  render: (args) =>
    createStoryShell("3D neon vector racer", args, drawNeonRacer, [
      ["mode", "road"],
      ["hazards", args.objectCount],
      ["camera", "chase"],
    ]),
};

export const StarfighterRun: Story = {
  args: {
    ...defaultArgs,
    accentColor: "#90cdf4",
    depth: 34,
    objectCount: 68,
    secondaryColor: "#fc8181",
    speed: 1.2,
    trailOpacity: 0.26,
  },
  argTypes,
  render: (args) =>
    createStoryShell("3D starfighter run", args, drawStarfighterRun, [
      ["mode", "space"],
      ["contacts", args.objectCount],
      ["camera", "cockpit"],
    ]),
};

export const IsometricDungeonRoom: Story = {
  args: {
    ...defaultArgs,
    accentColor: "#9f7aea",
    backgroundColor: "#07080f",
    objectCount: 10,
    secondaryColor: "#f6e05e",
    speed: 0.8,
    trailOpacity: 0.05,
  },
  argTypes,
  render: (args) =>
    createStoryShell("3D isometric dungeon room", args, drawIsometricDungeon, [
      ["mode", "room"],
      ["loot", args.objectCount],
      ["camera", "isometric"],
    ]),
};

export const HyperspaceGate: Story = {
  args: {
    ...defaultArgs,
    accentColor: "#4fd1c5",
    depth: 38,
    objectCount: 36,
    secondaryColor: "#fc8181",
    speed: 1.1,
    trailOpacity: 0.28,
  },
  argTypes,
  render: (args) =>
    createStoryShell("3D hyperspace gate", args, drawHyperspaceGate, [
      ["mode", "tunnel"],
      ["rings", args.objectCount],
      ["camera", "rail"],
    ]),
};

export const FirstPersonPlayer: Story = {
  args: {
    ...defaultArgs,
    accentColor: "#90cdf4",
    depth: 26,
    objectCount: 22,
    secondaryColor: "#f6e05e",
    speed: 1.25,
    trailOpacity: 0.14,
  },
  argTypes,
  render: (args) =>
    createStoryShell("First-person player view", args, drawFirstPersonPlayer, [
      ["mode", "first person"],
      ["markers", args.objectCount],
      ["camera", "player"],
    ]),
};

export const SideScroller2D: Story = {
  args: {
    ...defaultArgs,
    accentColor: "#68d391",
    backgroundColor: "#060b10",
    objectCount: 18,
    secondaryColor: "#f6e05e",
    speed: 1.1,
    trailOpacity: 0.04,
  },
  argTypes,
  render: (args) =>
    createStoryShell("2D arcade side-scroller", args, drawSideScroller2D, [
      ["mode", "platform"],
      ["platforms", args.objectCount],
      ["camera", "side"],
    ]),
};

export const SideScroller2_5D: Story = {
  args: {
    ...defaultArgs,
    accentColor: "#4fd1c5",
    depth: 24,
    objectCount: 26,
    secondaryColor: "#fc8181",
    speed: 1,
    trailOpacity: 0.08,
  },
  argTypes,
  render: (args) =>
    createStoryShell("2.5D belt side-scroller", args, drawSideScroller2_5D, [
      ["mode", "belt"],
      ["props", args.objectCount],
      ["camera", "parallax"],
    ]),
};
