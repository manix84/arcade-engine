import type { StoryObj } from "@storybook/html-vite";
import {
  colorWithAlpha,
  detectBoxCollision,
  drawCanvasLine,
  drawCanvasPolygon,
  fillCanvasWithTrail,
  getDepthProgress,
  getIsometricTileCorners,
  getLoopedScrollerPosition,
  getLoopedDepth,
  projectIsometricPoint,
  projectPerspectivePoint,
  getSideScrollerActorPosition,
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
import { drawFpsDemoScene } from "./fps-demo-scene.js";

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
  baseX: number;
  baseY: number;
  dragStartX: number;
  dragStartY: number;
  x: number;
  y: number;
  zoom: number;
};

type KeyboardState = {
  playerX: number;
  playerZ: number;
  pressed: Set<string>;
};

type SceneContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  delta: number;
  elapsed: number;
  frame: number;
  keyboard: KeyboardState;
  pointer: PointerState;
};

type IsometricDungeonTile = "#" | "." | "C" | "D" | "P" | "S" | "T" | "W";

type StoryShellOptions = {
  enableArrowMovement?: boolean;
  enableWheelZoom?: boolean;
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

const isometricDungeonArgTypes: Story["argTypes"] = {
  ...argTypes,
  depth: {
    table: { disable: true },
  },
  objectCount: {
    table: { disable: true },
  },
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

const isometricDungeonMap = [
  "###########",
  "#..T...T..#",
  "#.........#",
  "#..P...P..#",
  "#....W....#",
  "#.........#",
  "#..C...S..#",
  "#.........#",
  "#..T...T..#",
  "###..D..###",
  "###########",
] as const;

let isometricDungeonCanvas: HTMLCanvasElement | undefined;

const createStoryShell = (
  title: string,
  args: Arcade3DStoryArgs,
  renderScene: (scene: SceneContext, args: Arcade3DStoryArgs) => void,
  stats: Array<[string, string | number]>,
  options: StoryShellOptions = {}
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
  const keyboard: KeyboardState = {
    playerX: -1,
    playerZ: 1,
    pressed: new Set<string>(),
  };
  const pointer: PointerState = {
    active: false,
    baseX: 0,
    baseY: 0,
    dragStartX: 0,
    dragStartY: 0,
    x: 0,
    y: 0,
    zoom: 1,
  };
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
  canvas.tabIndex = 0;
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

  const getNormalizedPointer = (event: PointerEvent): { x: number; y: number } => {
    const bounds = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      y: ((event.clientY - bounds.top) / bounds.height) * 2 - 1,
    };
  };

  const updatePointer = (event: PointerEvent): void => {
    const normalizedPointer = getNormalizedPointer(event);

    pointer.x = pointer.baseX + normalizedPointer.x - pointer.dragStartX;
    pointer.y = pointer.baseY + normalizedPointer.y - pointer.dragStartY;
  };

  const handlePointerDown = (event: PointerEvent): void => {
    const normalizedPointer = getNormalizedPointer(event);

    canvas.focus();
    pointer.active = true;
    pointer.baseX = pointer.x;
    pointer.baseY = pointer.y;
    pointer.dragStartX = normalizedPointer.x;
    pointer.dragStartY = normalizedPointer.y;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!pointer.active) {
      return;
    }

    updatePointer(event);
  };

  const handlePointerUp = (event: PointerEvent): void => {
    pointer.active = false;
    canvas.style.cursor = "grab";

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const handlePointerLeave = (): void => {
    if (!pointer.active) {
      canvas.style.cursor = "grab";
    }
  };

  const handleWheel = (event: WheelEvent): void => {
    if (!options.enableWheelZoom) {
      return;
    }

    event.preventDefault();
    const zoomDelta = event.deltaY > 0 ? -0.08 : 0.08;

    pointer.zoom = Math.max(0.65, Math.min(2.2, pointer.zoom + zoomDelta));
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!options.enableArrowMovement || !isArrowKey(event.key)) {
      return;
    }

    event.preventDefault();
    keyboard.pressed.add(event.key);
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    if (!options.enableArrowMovement || !isArrowKey(event.key)) {
      return;
    }

    event.preventDefault();
    keyboard.pressed.delete(event.key);
  };

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

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
        keyboard,
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
    canvas.removeEventListener("wheel", handleWheel);
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  });

  return shell;
};

const isArrowKey = (key: string): boolean =>
  key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight";

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
  { canvas, context, delta, elapsed, keyboard, pointer }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const pixelScale = 2;
  const width = Math.max(1, Math.floor(canvas.width / pixelScale));
  const height = Math.max(1, Math.floor(canvas.height / pixelScale));
  const internalCanvas = getIsometricDungeonCanvas(width, height);
  const internalContext = internalCanvas.getContext("2d");

  if (!internalContext) {
    return;
  }

  internalContext.imageSmoothingEnabled = false;
  drawIsometricDungeonScene(internalContext, {
    args,
    delta,
    elapsed,
    height,
    keyboard,
    pointer,
    width,
  });

  context.save();
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(internalCanvas, 0, 0, canvas.width, canvas.height);
  context.restore();
};

const getIsometricDungeonCanvas = (
  width: number,
  height: number
): HTMLCanvasElement => {
  isometricDungeonCanvas ??= document.createElement("canvas");
  isometricDungeonCanvas.width = width;
  isometricDungeonCanvas.height = height;

  return isometricDungeonCanvas;
};

const drawIsometricDungeonScene = (
  context: CanvasRenderingContext2D,
  options: {
    args: Arcade3DStoryArgs;
    delta: number;
    elapsed: number;
    height: number;
    keyboard: KeyboardState;
    pointer: PointerState;
    width: number;
  }
): void => {
  const { args, delta, elapsed, height, keyboard, pointer, width } = options;
  const tile = Math.max(12, Math.round(18 * pointer.zoom));
  const origin = {
    x: width / 2,
    y: height / 2,
  };
  const isoOptions = { origin, tileHeight: tile, tileWidth: tile * 2 };
  const rotation = pointer.x * Math.PI;

  updateIsometricDungeonPlayer(keyboard, rotation, delta, args.speed);
  drawIsometricDungeonBackdrop(context, width, height, args.backgroundColor);

  isometricDungeonMap
    .flatMap((row, zIndex) =>
      [...row].map((tileCode, xIndex) => {
        const gridX = xIndex - Math.floor(row.length / 2);
        const gridZ = zIndex - Math.floor(isometricDungeonMap.length / 2);
        const corners = getRotatedIsometricTileCorners(gridX, gridZ, rotation, isoOptions);
        const center = getPolygonCenter(corners);

        return {
          center,
          corners,
          tileCode,
          xIndex,
          zIndex,
        };
      })
    )
    .sort((first, second) => first.center.y - second.center.y)
    .forEach(({ center, corners, tileCode, xIndex, zIndex }) => {
      const tileKind = tileCode as IsometricDungeonTile;

      if (tileKind === "#") {
        drawIsometricDungeonWall(context, corners, tile);
        return;
      }

      drawIsometricDungeonFloor(context, corners, tileKind, xIndex, zIndex);
      drawIsometricDungeonProp(context, center, tileKind, elapsed, args);
    });

  drawIsometricDungeonPlayer(context, isoOptions, rotation, keyboard, elapsed, args);
};

const updateIsometricDungeonPlayer = (
  keyboard: KeyboardState,
  rotation: number,
  delta: number,
  speed: number
): void => {
  let screenX = 0;
  let screenZ = 0;

  if (keyboard.pressed.has("ArrowLeft")) {
    screenX -= 1;
  }

  if (keyboard.pressed.has("ArrowRight")) {
    screenX += 1;
  }

  if (keyboard.pressed.has("ArrowUp")) {
    screenZ -= 1;
  }

  if (keyboard.pressed.has("ArrowDown")) {
    screenZ += 1;
  }

  if (screenX === 0 && screenZ === 0) {
    return;
  }

  const magnitude = Math.hypot(screenX, screenZ);
  const normalizedX = screenX / magnitude;
  const normalizedZ = screenZ / magnitude;
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const worldX = normalizedX * cos - normalizedZ * sin;
  const worldZ = normalizedX * sin + normalizedZ * cos;
  const step = delta * (2.4 + speed * 0.35);
  const nextX = keyboard.playerX + worldX * step;
  const nextZ = keyboard.playerZ + worldZ * step;

  if (isIsometricDungeonWalkable(nextX, keyboard.playerZ)) {
    keyboard.playerX = nextX;
  }

  if (isIsometricDungeonWalkable(keyboard.playerX, nextZ)) {
    keyboard.playerZ = nextZ;
  }
};

const isIsometricDungeonWalkable = (x: number, z: number): boolean => {
  const column = Math.floor(x + isometricDungeonMap[0].length / 2);
  const row = Math.floor(z + isometricDungeonMap.length / 2);
  const tile = isometricDungeonMap[row]?.[column] as IsometricDungeonTile | undefined;

  return tile !== undefined && tile !== "#";
};

const projectRotatedIsometricPoint = (
  x: number,
  z: number,
  rotation: number,
  isoOptions: Parameters<typeof projectIsometricPoint>[1]
): ReturnType<typeof projectIsometricPoint> => {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  return projectIsometricPoint(
    {
      x: x * cos - z * sin,
      y: 0,
      z: x * sin + z * cos,
    },
    isoOptions
  );
};

const getRotatedIsometricTileCorners = (
  x: number,
  z: number,
  rotation: number,
  isoOptions: Parameters<typeof projectIsometricPoint>[1]
): ReturnType<typeof getIsometricTileCorners> => [
  projectRotatedIsometricPoint(x, z, rotation, isoOptions),
  projectRotatedIsometricPoint(x + 1, z, rotation, isoOptions),
  projectRotatedIsometricPoint(x + 1, z + 1, rotation, isoOptions),
  projectRotatedIsometricPoint(x, z + 1, rotation, isoOptions),
];

const getPolygonCenter = (
  points: ReturnType<typeof getIsometricTileCorners>
): ReturnType<typeof projectIsometricPoint> => {
  const total = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x,
      y: sum.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
};

const drawIsometricDungeonBackdrop = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor: string
): void => {
  const gradient = context.createLinearGradient(0, 0, 0, height);

  gradient.addColorStop(0, backgroundColor);
  gradient.addColorStop(0.58, "#111017");
  gradient.addColorStop(1, "#06070b");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(0, 0, 0, 0.28)";
  context.fillRect(0, Math.floor(height * 0.78), width, Math.ceil(height * 0.22));
};

const drawIsometricDungeonFloor = (
  context: CanvasRenderingContext2D,
  corners: ReturnType<typeof getIsometricTileCorners>,
  tileKind: IsometricDungeonTile,
  xIndex: number,
  zIndex: number
): void => {
  const isWater = tileKind === "W";
  const isDoor = tileKind === "D";
  const shade = (xIndex + zIndex) % 2 === 0 ? 0.92 : 1;

  drawCanvasPolygon(
    context,
    corners,
    isWater
      ? "rgba(54, 117, 138, 0.72)"
      : isDoor
        ? "rgba(87, 61, 42, 0.92)"
        : `rgba(${Math.round(42 * shade)}, ${Math.round(43 * shade)}, ${Math.round(52 * shade)}, 0.95)`,
    isWater ? "rgba(144, 205, 244, 0.42)" : "rgba(10, 11, 16, 0.7)"
  );

  if (!isWater && tileKind !== "D") {
    const [top, right, bottom, left] = corners;

    drawCanvasLine(context, top, bottom, "rgba(255, 255, 255, 0.05)");
    drawCanvasLine(context, left, right, "rgba(0, 0, 0, 0.18)");
  }
};

const drawIsometricDungeonWall = (
  context: CanvasRenderingContext2D,
  corners: ReturnType<typeof getIsometricTileCorners>,
  height: number
): void => {
  const raised = corners.map((point) => ({ x: point.x, y: point.y - height }));
  const shades = [
    "rgba(31, 28, 39, 0.98)",
    "rgba(42, 37, 52, 0.98)",
    "rgba(24, 22, 31, 0.98)",
    "rgba(36, 32, 45, 0.98)",
  ];

  getIsometricWallFaces(raised, height)
    .sort((first, second) => first.depth - second.depth)
    .forEach((face) => {
      drawCanvasPolygon(context, face.points, shades[face.index]);
    });

  drawCanvasPolygon(context, raised, "rgba(62, 55, 75, 0.98)", "rgba(148, 122, 176, 0.35)");

  const [, right, , left] = raised;
  drawCanvasLine(context, left, right, "rgba(255, 255, 255, 0.08)");
};

const getIsometricWallFaces = (
  raised: ReturnType<typeof getIsometricTileCorners>,
  height: number
): Array<{
  depth: number;
  index: number;
  points: ReturnType<typeof getIsometricTileCorners>;
}> =>
  raised.map((from, index) => {
    const to = raised[(index + 1) % raised.length];
    const lowerTo = { x: to.x, y: to.y + height };
    const lowerFrom = { x: from.x, y: from.y + height };
    const points = [from, to, lowerTo, lowerFrom] as ReturnType<typeof getIsometricTileCorners>;

    return {
      depth: getPolygonCenter(points).y,
      index,
      points,
    };
  });

const drawIsometricDungeonProp = (
  context: CanvasRenderingContext2D,
  center: { x: number; y: number },
  tileKind: IsometricDungeonTile,
  elapsed: number,
  args: Arcade3DStoryArgs
): void => {
  if (tileKind === "T") {
    const flicker = 0.75 + Math.sin(elapsed * args.speed * 12 + center.x) * 0.15;

    context.fillStyle = "rgba(61, 42, 28, 0.9)";
    context.fillRect(center.x - 2, center.y + 1, 4, 12);
    context.fillStyle = colorWithAlpha(args.secondaryColor, 0.52 * flicker);
    context.beginPath();
    context.arc(center.x, center.y - 2, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = colorWithAlpha("#f6e05e", 0.92);
    context.fillRect(center.x - 2, center.y - 8, 4, 7);
    return;
  }

  if (tileKind === "P") {
    context.fillStyle = "rgba(14, 15, 20, 0.48)";
    context.fillRect(center.x - 8, center.y + 10, 16, 5);
    context.fillStyle = "rgba(73, 67, 87, 0.96)";
    context.fillRect(center.x - 6, center.y - 18, 12, 30);
    context.fillStyle = "rgba(112, 100, 132, 0.96)";
    context.fillRect(center.x - 8, center.y - 23, 16, 6);
    context.fillRect(center.x - 8, center.y + 8, 16, 6);
    return;
  }

  if (tileKind === "C") {
    context.fillStyle = "rgba(12, 11, 14, 0.45)";
    context.fillRect(center.x - 12, center.y + 11, 24, 5);
    context.fillStyle = "rgba(99, 62, 34, 0.96)";
    context.fillRect(center.x - 12, center.y - 7, 24, 17);
    context.fillStyle = colorWithAlpha(args.secondaryColor, 0.82);
    context.fillRect(center.x - 2, center.y - 6, 4, 16);
    context.fillRect(center.x - 12, center.y, 24, 3);
    return;
  }

  if (tileKind === "S") {
    for (let step = 0; step < 4; step++) {
      context.fillStyle = `rgba(75, 69, 88, ${0.88 - step * 0.08})`;
      context.fillRect(center.x - 14 + step * 3, center.y - 4 + step * 5, 28 - step * 6, 4);
    }
  }
};

const drawIsometricDungeonPlayer = (
  context: CanvasRenderingContext2D,
  isoOptions: Parameters<typeof projectIsometricPoint>[1],
  rotation: number,
  keyboard: KeyboardState,
  elapsed: number,
  args: Arcade3DStoryArgs
): void => {
  const bob = Math.sin(elapsed * args.speed * 4) * 2;
  const center = projectRotatedIsometricPoint(keyboard.playerX, keyboard.playerZ, rotation, isoOptions);

  context.fillStyle = "rgba(0, 0, 0, 0.34)";
  context.fillRect(center.x - 9, center.y + 11, 18, 5);
  context.fillStyle = colorWithAlpha(args.accentColor, 0.95);
  context.fillRect(center.x - 6, center.y - 18 + bob, 12, 21);
  context.fillStyle = "#e8d4b2";
  context.fillRect(center.x - 5, center.y - 27 + bob, 10, 9);
  context.fillStyle = colorWithAlpha(args.secondaryColor, 0.84);
  context.fillRect(center.x + 4, center.y - 12 + bob, 12, 4);
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
  { canvas, context, elapsed }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  drawFpsDemoScene(context, {
    height: canvas.height,
    intensity: 0.92,
    pixelScale: 3,
    routeSpeed: args.speed * 1.2,
    theme: "sciFi",
    timeMs: elapsed * 1000,
    width: canvas.width,
  });
};

const drawSideScroller2D = (
  { canvas, context, elapsed }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const groundY = canvas.height - 78;
  const runnerSpeed = args.speed * 156;
  const encounterCount = Math.max(10, Math.min(args.objectCount, 24));
  const encounterRange = encounterCount * 138;

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

  const actors = Array.from({ length: encounterCount }, (_, index) => {
    const pattern = index % 6;
    const kind =
      pattern === 0 || pattern === 4
        ? "enemy"
        : pattern === 1
          ? "crate"
          : pattern === 2
            ? "ladder"
            : "platform";
    const width = kind === "platform" ? 116 : kind === "ladder" ? 42 : 54;
    const height = kind === "platform" ? 18 : kind === "ladder" ? 120 : kind === "enemy" ? 38 : 46;
    const y =
      kind === "platform"
        ? groundY - 122 - (index % 2) * 42
        : kind === "ladder"
          ? groundY - height
          : groundY - height;
    const position = getSideScrollerActorPosition({
      elapsedSeconds: elapsed,
      index,
      offset: -220,
      range: encounterRange,
      spacing: 138,
      speed: runnerSpeed,
      viewportWidth: canvas.width,
      width,
    });

    return { height, index, kind, width, x: position.x, y };
  });

  const playerX = canvas.width * 0.34;
  const jumpY = getSideScrollerJumpY({
    elapsedSeconds: elapsed,
    groundY: groundY - 36,
    height: 66,
    speed: args.speed * 5,
  });
  const nearbyLadder = actors.find(
    (actor) =>
      actor.kind === "ladder" &&
      playerX + 18 > actor.x &&
      playerX - 18 < actor.x + actor.width
  );
  const nearbyPlatform = actors.find(
    (actor) =>
      actor.kind === "platform" &&
      playerX + 22 > actor.x &&
      playerX - 22 < actor.x + actor.width &&
      jumpY > actor.y - 42
  );
  const climbProgress = nearbyLadder
    ? Math.max(0, Math.min(1, (playerX - nearbyLadder.x) / nearbyLadder.width))
    : 0;
  const playerY = nearbyLadder
    ? nearbyLadder.y + nearbyLadder.height - 22 - climbProgress * 92
    : nearbyPlatform
      ? nearbyPlatform.y - 34
      : jumpY;
  const playerBox = {
    height: 52,
    posX: playerX - 18,
    posY: playerY - 32,
    width: 36,
  };
  const killedEnemies = new Set<number>();

  actors.forEach((actor) => {
    if (actor.kind !== "enemy") {
      return;
    }

    const enemyBox = {
      height: actor.height,
      posX: actor.x,
      posY: actor.y,
      width: actor.width,
    };

    if (detectBoxCollision(playerBox, enemyBox) && playerY < groundY - 46) {
      killedEnemies.add(actor.index);
    }
  });

  actors.forEach((actor) => {
    if (actor.x + actor.width < -20 || actor.x > canvas.width + 20) {
      return;
    }

    if (actor.kind === "platform") {
      drawCanvasPolygon(
        context,
        [
          { x: actor.x, y: actor.y },
          { x: actor.x + actor.width, y: actor.y },
          { x: actor.x + actor.width - 12, y: actor.y + actor.height },
          { x: actor.x + 12, y: actor.y + actor.height },
        ],
        colorWithAlpha(args.accentColor, 0.36),
        colorWithAlpha("#ffffff", 0.18)
      );
      return;
    }

    if (actor.kind === "ladder") {
      context.strokeStyle = colorWithAlpha("#f5f7fb", 0.32);
      context.lineWidth = 3;
      drawCanvasLine(context, { x: actor.x + 6, y: actor.y }, { x: actor.x + 6, y: actor.y + actor.height }, args.secondaryColor, 3);
      drawCanvasLine(context, { x: actor.x + actor.width - 6, y: actor.y }, { x: actor.x + actor.width - 6, y: actor.y + actor.height }, args.secondaryColor, 3);

      for (let rung = 12; rung < actor.height; rung += 18) {
        drawCanvasLine(
          context,
          { x: actor.x + 5, y: actor.y + rung },
          { x: actor.x + actor.width - 5, y: actor.y + rung },
          colorWithAlpha("#f5f7fb", 0.5),
          2
        );
      }
      return;
    }

    if (actor.kind === "enemy") {
      const killed = killedEnemies.has(actor.index);

      context.fillStyle = killed ? colorWithAlpha("#94a3b8", 0.55) : colorWithAlpha("#fc8181", 0.82);
      context.fillRect(actor.x + 4, killed ? actor.y + 22 : actor.y + 8, actor.width - 8, killed ? 12 : actor.height - 8);
      context.fillStyle = killed ? colorWithAlpha("#f6e05e", 0.42) : "#05070a";
      context.fillRect(actor.x + 14, actor.y + 18, 7, 5);
      context.fillRect(actor.x + actor.width - 21, actor.y + 18, 7, 5);
      if (!killed) {
        drawCanvasLine(context, { x: actor.x + 6, y: actor.y + actor.height }, { x: actor.x - 8, y: actor.y + actor.height + 10 }, "#f5f7fb", 2);
        drawCanvasLine(context, { x: actor.x + actor.width - 6, y: actor.y + actor.height }, { x: actor.x + actor.width + 8, y: actor.y + actor.height + 10 }, "#f5f7fb", 2);
      }
      return;
    }

    context.fillStyle = colorWithAlpha(args.secondaryColor, 0.76);
    context.fillRect(actor.x, actor.y, actor.width, actor.height);
    context.fillStyle = colorWithAlpha(args.accentColor, 0.35);
    context.fillRect(actor.x + 8, actor.y + 8, actor.width - 16, 8);
  });

  context.fillStyle = colorWithAlpha("#05070a", 0.34);
  context.fillRect(playerX - 28, groundY + 8, 56, 7);
  context.fillStyle = colorWithAlpha(args.secondaryColor, 0.9);
  context.fillRect(playerX - 16, playerY - 28, 32, 42);
  context.fillStyle = colorWithAlpha(args.accentColor, 0.9);
  context.fillRect(playerX - 20, playerY + 12, 40, 14);
  drawCanvasLine(
    context,
    { x: playerX + 18, y: playerY - 8 },
    { x: playerX + 46, y: nearbyLadder ? playerY - 22 : playerY - 14 },
    "#f5f7fb",
    3
  );

  context.fillStyle = "#cbd5e1";
  context.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  context.fillText(
    nearbyLadder ? "climb" : nearbyPlatform ? "platform" : killedEnemies.size > 0 ? "stomp" : "jump",
    playerX - 24,
    playerY - 44
  );
};

const drawSideScroller2_5D = (
  { canvas, context, elapsed, pointer }: SceneContext,
  args: Arcade3DStoryArgs
): void => {
  const centerX = canvas.width / 2 + pointer.x * 64;
  const horizon = canvas.height * 0.36 + pointer.y * 28;
  const viewport = { height: canvas.height, width: canvas.width };
  const beltDepths = [3.4, 6.4, 9.4, 12.4];
  const actorCount = Math.max(14, Math.min(args.objectCount, 30));
  const actorRange = actorCount * 112;

  fillCanvasWithTrail(context, canvas, args.backgroundColor, args.trailOpacity * 0.55);
  context.fillStyle = colorWithAlpha(args.accentColor, 0.06);
  context.fillRect(0, 0, canvas.width, canvas.height);

  beltDepths.forEach((depth, lane) => {
    const nearLeft = projectPerspectivePoint({ x: -520, y: 260, z: depth }, viewport, { centerX, horizon });
    const nearRight = projectPerspectivePoint({ x: 520, y: 260, z: depth }, viewport, { centerX, horizon });
    const farLeft = projectPerspectivePoint({ x: -500, y: 208, z: depth + 1.6 }, viewport, { centerX, horizon });
    const farRight = projectPerspectivePoint({ x: 500, y: 208, z: depth + 1.6 }, viewport, { centerX, horizon });
    const laneAlpha = 0.08 + (1 - lane / beltDepths.length) * 0.18;

    drawCanvasPolygon(
      context,
      [nearLeft, nearRight, farRight, farLeft],
      colorWithAlpha(lane % 2 === 0 ? args.secondaryColor : args.accentColor, laneAlpha),
      colorWithAlpha("#ffffff", 0.08 + laneAlpha * 0.4)
    );

    drawCanvasLine(
      context,
      nearLeft,
      farLeft,
      colorWithAlpha(args.accentColor, 0.14),
      1 + lane * 0.4
    );
    drawCanvasLine(
      context,
      nearRight,
      farRight,
      colorWithAlpha(args.accentColor, 0.14),
      1 + lane * 0.4
    );
  });

  const actors = Array.from({ length: actorCount }, (_, index) => {
    const depth = beltDepths[index % beltDepths.length];
    const pattern = index % 7;
    const kind =
      pattern === 0 || pattern === 4
        ? "enemy"
        : pattern === 1
          ? "crate"
          : pattern === 2
            ? "ladder"
            : "platform";
    const width = kind === "platform" ? 104 : kind === "ladder" ? 44 : 56;
    const height = kind === "platform" ? 18 : kind === "ladder" ? 114 : kind === "enemy" ? 40 : 48;
    const position = getSideScrollerActorPosition({
      elapsedSeconds: elapsed,
      index,
      offset: -180,
      range: actorRange,
      spacing: 112,
      speed: args.speed * (96 + getDepthProgress(depth, args.depth) * 80),
      viewportWidth: canvas.width,
      width,
    });
    const base = projectPerspectivePoint(
      { x: position.x - canvas.width / 2, y: 226, z: depth },
      viewport,
      { centerX, horizon }
    );
    const depthProgress = getDepthProgress(depth, args.depth);

    return { base, depth, depthProgress, height, index, kind, width };
  });

  const playerDepth = 4;
  const jumpLift = Math.max(0, Math.sin(elapsed * args.speed * 5)) * 64;
  const playerProbe = projectPerspectivePoint({ x: -170, y: 215, z: playerDepth }, viewport, { centerX, horizon });
  const nearbyLadder = actors.find(
    (actor) =>
      actor.kind === "ladder" &&
      Math.abs(actor.depth - playerDepth) < 1.1 &&
      Math.abs(actor.base.x - playerProbe.x) < 44
  );
  const climbLift = nearbyLadder ? Math.max(0, Math.min(1, (playerProbe.x - nearbyLadder.base.x + 28) / 56)) * 82 : 0;
  const playerBase = projectPerspectivePoint(
    { x: -170, y: 215 - Math.max(jumpLift, climbLift), z: playerDepth },
    viewport,
    { centerX, horizon }
  );
  const bob = Math.sin(elapsed * args.speed * 5) * 5;
  const playerBox = {
    height: 58,
    posX: playerBase.x - 42,
    posY: playerBase.y - 62 + bob,
    width: 84,
  };
  const stompedEnemies = new Set<number>();

  actors.forEach((actor) => {
    if (actor.kind !== "enemy" || Math.abs(actor.depth - playerDepth) > 1.1) {
      return;
    }

    const scale = Math.max(0.36, actor.base.scale);
    const enemyBox = {
      height: actor.height * scale,
      posX: actor.base.x - (actor.width * scale) / 2,
      posY: actor.base.y - actor.height * scale,
      width: actor.width * scale,
    };

    if (detectBoxCollision(playerBox, enemyBox) && jumpLift > 28) {
      stompedEnemies.add(actor.index);
    }
  });

  actors
    .slice()
    .sort((a, b) => b.depth - a.depth)
    .forEach((actor) => {
      if (actor.base.x < -90 || actor.base.x > canvas.width + 90) {
        return;
      }

      const scale = Math.max(0.34, actor.base.scale);
      const width = actor.width * scale;
      const height = actor.height * scale;
      const alpha = 0.18 + actor.depthProgress * 0.58;
      const x = actor.base.x;
      const y = actor.base.y;

      context.fillStyle = colorWithAlpha("#05070a", 0.25 + actor.depthProgress * 0.16);
      context.beginPath();
      context.ellipse(x, y + 6 * scale, width * 0.58, 8 * scale, 0, 0, Math.PI * 2);
      context.fill();

      if (actor.kind === "platform") {
        drawCanvasPolygon(
          context,
          [
            { x: x - width * 0.72, y },
            { x: x + width * 0.72, y },
            { x: x + width * 0.54, y: y - height },
            { x: x - width * 0.54, y: y - height },
          ],
          colorWithAlpha(args.accentColor, alpha),
          colorWithAlpha("#ffffff", 0.1 + actor.depthProgress * 0.2)
        );
        return;
      }

      if (actor.kind === "ladder") {
        drawCanvasLine(context, { x: x - width * 0.34, y }, { x: x - width * 0.22, y: y - height }, args.secondaryColor, Math.max(2, 4 * scale));
        drawCanvasLine(context, { x: x + width * 0.34, y }, { x: x + width * 0.22, y: y - height }, args.secondaryColor, Math.max(2, 4 * scale));

        for (let rung = 0.18; rung < 0.92; rung += 0.18) {
          const rungY = y - height * rung;

          drawCanvasLine(
            context,
            { x: x - width * 0.28, y: rungY },
            { x: x + width * 0.28, y: rungY },
            colorWithAlpha("#f5f7fb", 0.38 + actor.depthProgress * 0.28),
            Math.max(1, 2 * scale)
          );
        }
        return;
      }

      if (actor.kind === "enemy") {
        const stomped = stompedEnemies.has(actor.index);

        context.fillStyle = stomped ? colorWithAlpha("#94a3b8", 0.5) : colorWithAlpha("#fc8181", alpha + 0.08);
        context.fillRect(x - width * 0.42, stomped ? y - height * 0.32 : y - height, width * 0.84, stomped ? height * 0.22 : height * 0.82);
        context.fillStyle = stomped ? colorWithAlpha(args.secondaryColor, 0.42) : "#05070a";
        context.fillRect(x - width * 0.18, y - height * 0.62, Math.max(2, 5 * scale), Math.max(2, 5 * scale));
        context.fillRect(x + width * 0.1, y - height * 0.62, Math.max(2, 5 * scale), Math.max(2, 5 * scale));
        return;
      }

      drawCanvasPolygon(
        context,
        [
          { x: x - width * 0.5, y },
          { x: x + width * 0.5, y },
          { x: x + width * 0.42, y: y - height },
          { x: x - width * 0.42, y: y - height },
        ],
        colorWithAlpha(args.secondaryColor, alpha),
        colorWithAlpha(args.accentColor, 0.12 + actor.depthProgress * 0.2)
      );
    });

  context.fillStyle = colorWithAlpha("#05070a", 0.32);
  context.beginPath();
  context.ellipse(playerBase.x, playerBase.y + 8, 52 * playerBase.scale, 9 * playerBase.scale, 0, 0, Math.PI * 2);
  context.fill();
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
  context.fillStyle = "#cbd5e1";
  context.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  context.fillText(
    nearbyLadder ? "climb" : stompedEnemies.size > 0 ? "stomp" : "belt jump",
    playerBase.x - 36,
    playerBase.y - 78 + bob
  );
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
  argTypes: isometricDungeonArgTypes,
  render: (args) =>
    createStoryShell("3D isometric dungeon room", args, drawIsometricDungeon, [
      ["mode", "room"],
      ["drag", "rotate"],
      ["keys", "move"],
    ], { enableArrowMovement: true, enableWheelZoom: true }),
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
      ["scene", "fps corridor"],
      ["camera", "route"],
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
