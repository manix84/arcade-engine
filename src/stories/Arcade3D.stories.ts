import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  colorWithAlpha,
  drawCanvasLine,
  drawCanvasPolygon,
  fillCanvasWithTrail,
  getDepthProgress,
  getIsometricTileCorners,
  getIsometricWallSide,
  getLoopedDepth,
  projectIsometricPoint,
  projectPerspectivePoint,
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
  title: "Engine/3D/Arcade Scenes",
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

type SceneContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  delta: number;
  elapsed: number;
  frame: number;
};

const argTypes: Story["argTypes"] = {
  accentColor: { control: "color" },
  backgroundColor: { control: "color" },
  depth: { control: { type: "range", min: 8, max: 44, step: 1 } },
  objectCount: { control: { type: "range", min: 6, max: 90, step: 1 } },
  secondaryColor: { control: "color" },
  speed: { control: { type: "range", min: 0.2, max: 4, step: 0.1 } },
  trailOpacity: { control: { type: "range", min: 0, max: 0.45, step: 0.01 } },
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
      },
      args
    );
  };

  ticker.addSchedule(render, 1);
  ticker.start();
  onRemove(shell, () => ticker.stop());

  return shell;
};

const drawNeonRacer = (
  { canvas, context, elapsed }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const horizon = canvas.height * 0.38;
  const roadTop = canvas.width * 0.08;
  const roadBottom = canvas.width * 0.43;
  const road = [
    { x: canvas.width / 2 - roadTop, y: horizon },
    { x: canvas.width / 2 + roadTop, y: horizon },
    { x: canvas.width / 2 + roadBottom, y: canvas.height },
    { x: canvas.width / 2 - roadBottom, y: canvas.height },
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
    const center = canvas.width / 2 + Math.sin(z * 0.9 + elapsed) * 18 * (1 - z / args.depth);

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
      { horizon }
    );
    const to = projectPerspectivePoint(
      { x: lane * 210, y: 280, z: 0.5 },
      { height: canvas.height, width: canvas.width },
      { horizon }
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
      { horizon }
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
      { x: canvas.width / 2 - 56, y: canvas.height - 34 },
      { x: canvas.width / 2 - 30, y: canvas.height - 92 },
      { x: canvas.width / 2 + 30, y: canvas.height - 92 },
      { x: canvas.width / 2 + 56, y: canvas.height - 34 },
    ],
    colorWithAlpha(args.accentColor, 0.78),
    "#f5f7fb"
  );
};

const drawStarfighterRun = (
  { canvas, context, elapsed }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
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
      { focalLength: 440 }
    );
    const tail = projectPerspectivePoint(
      {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle * 1.4) * radius * 0.58,
        z: z + 1.8,
      },
      { height: canvas.height, width: canvas.width },
      { focalLength: 440 }
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
      { focalLength: 420 }
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
  context.moveTo(canvas.width / 2 - 24, canvas.height - 70);
  context.lineTo(canvas.width / 2, canvas.height - 116);
  context.lineTo(canvas.width / 2 + 24, canvas.height - 70);
  context.moveTo(canvas.width / 2 - 70, canvas.height - 52);
  context.lineTo(canvas.width / 2, canvas.height - 86);
  context.lineTo(canvas.width / 2 + 70, canvas.height - 52);
  context.stroke();
};

const drawIsometricDungeon = (
  { canvas, context, elapsed }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const tile = 34;
  const origin = { x: canvas.width / 2, y: 112 };
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
  { canvas, context, elapsed }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
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
      const x = canvas.width / 2 + Math.cos(angle) * (radius + wobble);
      const y = canvas.height / 2 + Math.sin(angle) * (radius * 0.56 + wobble);

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
        x: canvas.width / 2 + Math.cos(angle) * inner,
        y: canvas.height / 2 + Math.sin(angle) * inner * 0.56,
      },
      {
        x: canvas.width / 2 + Math.cos(angle) * outer,
        y: canvas.height / 2 + Math.sin(angle) * outer * 0.56,
      },
      colorWithAlpha(beam % 2 === 0 ? args.accentColor : args.secondaryColor, 0.18),
      2
    );
  }

  context.fillStyle = colorWithAlpha(args.backgroundColor, 0.72);
  context.beginPath();
  context.ellipse(canvas.width / 2, canvas.height / 2, 42, 24, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = colorWithAlpha("#ffffff", 0.5);
  context.stroke();
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
