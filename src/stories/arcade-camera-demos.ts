import type { StoryObj } from "@storybook/html-vite";
import {
  colorWithAlpha,
  detectBoxCollision,
  drawCanvasLine,
  drawCanvasPolygon,
  fillCanvasWithTrail,
  findStringTileMapCell,
  findStringTileMapCells,
  getDepthProgress,
  getIsometricTileCorners,
  getLoopedScrollerPosition,
  getLoopedDepth,
  getStringTileMapCellFromCenteredPoint,
  getStringTileMapCenteredPoint,
  getStringTileMapTile,
  projectIsometricPoint,
  projectPerspectivePoint,
  parseStringTileMap,
  getSideScrollerActorPosition,
  getSideScrollerJumpY,
  type StringTileMap,
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
  chestOpen: boolean;
  doorOpenProgress: Map<string, number>;
  exitReached: boolean;
  facingX: number;
  facingZ: number;
  interactionLabel: string;
  playerX: number;
  playerZ: number;
  pressed: Set<string>;
  stairsReached: boolean;
};

type SceneContext = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  delta: number;
  dungeonMap: DungeonMapState;
  elapsed: number;
  frame: number;
  keyboard: KeyboardState;
  pointer: PointerState;
};

type IsometricDungeonTile = "#" | " " | "." | "_" | "C" | "D" | "P" | "S" | "d" | "o" | "r" | "u" | "w";
type IsometricDungeonTileRole = "blocked" | "floor" | "interactable" | "light" | "prop" | "spawn" | "void";

type StoryShellOptions = {
  enableArrowMovement?: boolean;
  mapEditor?: {
    initialText: string;
  };
  enableWheelZoom?: boolean;
  updateStats?: (scene: SceneContext, args: Arcade3DStoryArgs) => Array<string | number>;
};

type DungeonMapState = StringTileMap<IsometricDungeonTile> & {
  spawnX: number;
  spawnZ: number;
};

type IsometricDungeonCamera = {
  focusX: number;
  focusZ: number;
};

type IsometricDungeonDirection = "east" | "north" | "south" | "west";

type DungeonMapEditorSurface = {
  editor: HTMLTextAreaElement;
  element: HTMLElement;
  legend: HTMLElement;
  resetLegendPosition: () => void;
};

type DungeonMapLegendSurface = {
  element: HTMLElement;
  resetPosition: () => void;
};

type DungeonProjectedTile = {
  center: ReturnType<typeof projectIsometricPoint>;
  corners: ReturnType<typeof getIsometricTileCorners>;
  facing: IsometricDungeonDirection;
  gridX: number;
  gridZ: number;
  tileKind: IsometricDungeonTile;
  xIndex: number;
  zIndex: number;
};

type DungeonRenderable = {
  depth: number;
  draw: () => void;
  order: number;
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

const defaultIsometricDungeonMapText = `
#################
#       r  o    #
#      www      #
#   P       P   #
#     wwwww     #
#     wwwww     #
#     wwwww     ######
#     wwwww     #  o #
#     wwwww    rDr C #
#     wwwww     #  o #
#     wwwww     ######
#     wwwww     #
#     wwwww     #
#   P       P   #
#   o       o   #
#               #
########D########
###  o     o  ###
#      www      #
#   P       P   #
#               #
#       S       #
#       .       #
#               #
#               #
#               #
#               #
#               #
#   u       d   #
#   C       r   #
#   P   o   P   #
#               #
#################
`.trim();

const isometricDungeonTiles = {
  " ": { label: "floor", role: "floor", walkable: true },
  "#": { label: "stone wall", role: "blocked", walkable: false },
  ".": { label: "floor marker", role: "floor", walkable: true },
  _: { label: "empty", role: "void", walkable: false },
  C: { label: "chest", role: "interactable", walkable: true },
  D: { label: "door", role: "interactable", walkable: true },
  P: { label: "pillar", role: "prop", walkable: false },
  S: { label: "player spawn", role: "spawn", walkable: true },
  d: { label: "stairs down", role: "interactable", walkable: true },
  o: { label: "light source", role: "light", walkable: true },
  r: { label: "rubble", role: "prop", walkable: false },
  u: { label: "stairs up", role: "interactable", walkable: true },
  w: { label: "water", role: "floor", walkable: true },
} satisfies Record<
  IsometricDungeonTile,
  {
    label: string;
    role: IsometricDungeonTileRole;
    walkable: boolean;
  }
>;

let isometricDungeonCanvas: HTMLCanvasElement | undefined;

const parseIsometricDungeonMap = (text: string): DungeonMapState => {
  const map = parseStringTileMap<IsometricDungeonTile>(text, {
    emptyTile: "_",
    normalizeTile: parseIsometricDungeonTile,
  });
  const spawn = findStringTileMapCell(map, "S");
  const fallbackSpawn = getStringTileMapCenteredPoint(
    map,
    Math.floor(map.width / 2),
    Math.floor(map.height / 2)
  );

  return {
    ...map,
    spawnX: (spawn?.x ?? fallbackSpawn.x) + 0.5,
    spawnZ: (spawn?.z ?? fallbackSpawn.z) + 0.5,
  };
};

const parseIsometricDungeonTile = (tile: string): IsometricDungeonTile => {
  if (tile in isometricDungeonTiles) {
    return tile as IsometricDungeonTile;
  }

  return " ";
};

const getIsometricDungeonGridX = (column: number, width: number): number =>
  column - Math.floor(width / 2);

const getIsometricDungeonGridZ = (row: number, height: number): number =>
  row - Math.floor(height / 2);

const getIsometricDungeonColumn = (x: number, width: number): number =>
  Math.floor(x + Math.floor(width / 2));

const getIsometricDungeonRow = (z: number, height: number): number =>
  Math.floor(z + Math.floor(height / 2));

const resetIsometricDungeonPlayer = (
  keyboard: KeyboardState,
  dungeonMap: DungeonMapState
): void => {
  keyboard.chestOpen = false;
  keyboard.doorOpenProgress.clear();
  keyboard.exitReached = false;
  keyboard.facingX = 1;
  keyboard.facingZ = 0;
  keyboard.interactionLabel = "none";
  keyboard.playerX = dungeonMap.spawnX;
  keyboard.playerZ = dungeonMap.spawnZ;
  keyboard.pressed.clear();
  keyboard.stairsReached = false;
};

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
  let dungeonMap = parseIsometricDungeonMap(options.mapEditor?.initialText ?? defaultIsometricDungeonMapText);
  const keyboard: KeyboardState = {
    chestOpen: false,
    doorOpenProgress: new Map<string, number>(),
    exitReached: false,
    facingX: 1,
    facingZ: 0,
    interactionLabel: "none",
    playerX: dungeonMap.spawnX,
    playerZ: dungeonMap.spawnZ,
    pressed: new Set<string>(),
    stairsReached: false,
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
  const mapEditorSurface = options.mapEditor
    ? createIsometricDungeonMapEditor(options.mapEditor.initialText)
    : undefined;
  const mapEditor = mapEditorSurface?.editor;
  const telemetryHeading = telemetryPanel.querySelector("h2");

  mapEditor?.addEventListener("input", () => {
    dungeonMap = parseIsometricDungeonMap(mapEditor.value);
    resetIsometricDungeonPlayer(keyboard, dungeonMap);
  });

  if (mapEditorSurface) {
    telemetryPanel.style.position = "relative";

    if (telemetryHeading instanceof HTMLElement) {
      telemetryHeading.style.marginRight = "42px";
    }
  }

  scenePanel.appendChild(stage);
  telemetryPanel.append(
    ...(mapEditorSurface ? [mapEditorSurface.legend, values, mapEditorSurface.element] : [values])
  );
  grid.append(scenePanel, telemetryPanel);
  shell.appendChild(grid);
  mapEditorSurface?.resetLegendPosition();
  requestAnimationFrame(() => {
    mapEditorSurface?.resetLegendPosition();
  });

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
    if (!options.enableArrowMovement || isTextEditingTarget(event.target) || !isArrowKey(event.key)) {
      return;
    }

    event.preventDefault();
    keyboard.pressed.add(event.key);
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    if (!options.enableArrowMovement || isTextEditingTarget(event.target) || !isArrowKey(event.key)) {
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

    const scene = {
      canvas,
      context,
      delta,
      dungeonMap,
      elapsed: now / 1000,
      frame,
      keyboard,
      pointer,
    };

    renderScene(scene, args);

    options.updateStats?.(scene, args).forEach((value, index) => {
      const item = valueItems[index];

      if (item) {
        setValue(item, value);
      }
    });
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

const isTextEditingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;

const createIsometricDungeonMapEditor = (initialText: string): DungeonMapEditorSurface => {
  const surface = document.createElement("div");
  const editor = document.createElement("textarea");
  const legend = createIsometricDungeonMapLegend();

  surface.style.position = "relative";
  surface.style.marginTop = "18px";
  editor.value = initialText;
  editor.setAttribute("aria-label", "Dungeon map editor");
  editor.spellcheck = false;
  editor.style.boxSizing = "border-box";
  editor.style.width = "100%";
  editor.style.minHeight = "190px";
  editor.style.padding = "12px";
  editor.style.border = "1px solid rgba(148, 163, 184, 0.28)";
  editor.style.borderRadius = "8px";
  editor.style.background = "rgba(5, 7, 10, 0.72)";
  editor.style.color = "#dbeafe";
  editor.style.font = "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  editor.style.lineHeight = "1.35";
  editor.style.resize = "vertical";
  editor.style.whiteSpace = "pre";
  editor.style.overflow = "auto";

  surface.append(editor);

  return { editor, element: surface, legend: legend.element, resetLegendPosition: legend.resetPosition };
};

const createIsometricDungeonMapLegend = (): DungeonMapLegendSurface => {
  const legend = document.createElement("aside");
  const title = document.createElement("button");
  const list = document.createElement("dl");
  const position = {
    left: 0,
    restingLeft: 0,
    restingTop: 10,
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0,
    top: 10,
  };
  let collapsed = true;
  let dragged = false;
  let dragEnabled = false;

  legend.setAttribute("aria-label", "Dungeon map legend");
  legend.style.position = "absolute";
  legend.style.left = `${position.left}px`;
  legend.style.top = `${position.top}px`;
  legend.style.zIndex = "2";
  legend.style.boxSizing = "border-box";
  legend.style.border = "1px solid rgba(148, 163, 184, 0.38)";
  legend.style.borderRadius = "8px";
  legend.style.background = "rgba(12, 18, 27, 0.95)";
  legend.style.boxShadow = "0 14px 30px rgba(0, 0, 0, 0.3)";
  legend.style.color = "#dbeafe";
  legend.style.font = "12px Inter, ui-sans-serif, system-ui, sans-serif";
  legend.style.userSelect = "none";

  title.type = "button";
  title.setAttribute("aria-label", "Toggle dungeon map legend");
  title.setAttribute("aria-expanded", "false");
  title.style.display = "block";
  title.style.width = "100%";
  title.style.height = "32px";
  title.style.padding = "0 10px";
  title.style.border = "0";
  title.style.background = "rgba(30, 41, 59, 0.92)";
  title.style.color = "#f8fafc";
  title.style.cursor = "grab";
  title.style.font = "700 12px Inter, ui-sans-serif, system-ui, sans-serif";
  title.style.textAlign = "center";

  list.style.display = "grid";
  list.style.gridTemplateColumns = "max-content 1fr";
  list.style.gap = "6px 10px";
  list.style.margin = "0";
  list.style.padding = "10px";

  Object.entries(isometricDungeonTiles).forEach(([symbol, tile]) => {
    if (tile.role === "void") {
      return;
    }

    const term = document.createElement("dt");
    const description = document.createElement("dd");

    term.textContent = symbol === " " ? "space" : symbol;
    term.style.display = "grid";
    term.style.placeItems = "center";
    term.style.minWidth = "32px";
    term.style.height = "22px";
    term.style.margin = "0";
    term.style.border = "1px solid rgba(148, 163, 184, 0.3)";
    term.style.borderRadius = "4px";
    term.style.background = "rgba(5, 7, 10, 0.64)";
    term.style.color = "#f6e05e";
    term.style.font = "700 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

    description.textContent = `${tile.label} · ${tile.role}`;
    description.style.margin = "0";
    description.style.color = "#cbd5e1";
    description.style.lineHeight = "22px";

    list.append(term, description);
  });

  const applyLegendState = (): void => {
    if (collapsed) {
      position.top = position.restingTop;
    }

    title.textContent = collapsed ? "?" : "Legend";
    title.setAttribute("aria-expanded", String(!collapsed));
    title.style.borderBottom = collapsed ? "0" : "1px solid rgba(148, 163, 184, 0.24)";
    title.style.textAlign = collapsed ? "center" : "left";
    legend.style.width = collapsed ? "34px" : "min(220px, calc(100% - 24px))";
    legend.style.maxHeight = collapsed ? "34px" : "190px";
    legend.style.overflow = collapsed ? "hidden" : "auto";
    list.hidden = collapsed;
    updateLegendRestingPosition();
    clampLegendPosition();
  };

  const updateLegendRestingPosition = (): void => {
    const parent = legend.parentElement;

    if (!parent || !collapsed) {
      return;
    }

    const parentBounds = parent.getBoundingClientRect();
    const legendBounds = legend.getBoundingClientRect();

    position.restingLeft = Math.max(0, parentBounds.width - legendBounds.width - 16);
    position.left = position.restingLeft;
    position.top = position.restingTop;
  };

  const clampLegendPosition = (): void => {
    const parent = legend.parentElement;

    if (!parent) {
      return;
    }

    const parentBounds = parent.getBoundingClientRect();
    const legendBounds = legend.getBoundingClientRect();
    const maxLeft = Math.max(0, parentBounds.width - legendBounds.width);
    const maxTop = Math.max(0, parentBounds.height - legendBounds.height);

    position.left = Math.min(Math.max(0, position.left), maxLeft);
    position.top = Math.min(Math.max(0, position.top), maxTop);
    legend.style.left = `${position.left}px`;
    legend.style.top = `${position.top}px`;
  };

  title.addEventListener("pointerdown", (event) => {
    dragEnabled = !collapsed;

    if (dragEnabled) {
      title.setPointerCapture(event.pointerId);
    }

    title.style.cursor = "grabbing";
    position.pointerX = event.clientX - position.left;
    position.pointerY = event.clientY - position.top;
    position.startX = event.clientX;
    position.startY = event.clientY;
    dragged = false;
  });

  title.addEventListener("pointermove", (event) => {
    if (!dragEnabled || !title.hasPointerCapture(event.pointerId)) {
      return;
    }

    if (Math.hypot(event.clientX - position.startX, event.clientY - position.startY) > 3) {
      dragged = true;
    }

    position.left = event.clientX - position.pointerX;
    position.top = event.clientY - position.pointerY;
    clampLegendPosition();
  });

  const stopLegendDrag = (event: PointerEvent, shouldToggle: boolean): void => {
    title.style.cursor = "grab";

    if (title.hasPointerCapture(event.pointerId)) {
      title.releasePointerCapture(event.pointerId);
    }

    if (shouldToggle && !dragged) {
      collapsed = !collapsed;
      applyLegendState();
    }

    dragEnabled = false;
  };

  title.addEventListener("pointerup", (event) => {
    stopLegendDrag(event, true);
  });
  title.addEventListener("pointercancel", (event) => {
    stopLegendDrag(event, false);
  });
  legend.append(title, list);
  applyLegendState();

  return {
    element: legend,
    resetPosition: () => {
      if (!collapsed) {
        return;
      }

      updateLegendRestingPosition();
      clampLegendPosition();
    },
  };
};

const getIsometricDungeonStats = (
  { dungeonMap, keyboard, pointer }: SceneContext
): Array<string | number> => {
  const column = getIsometricDungeonColumn(keyboard.playerX, dungeonMap.width);
  const row = getIsometricDungeonRow(keyboard.playerZ, dungeonMap.height);

  return [
    `${column}, ${row}`,
    keyboard.interactionLabel,
    `${Math.round(pointer.x * 180)}deg / ${pointer.zoom.toFixed(2)}x`,
  ];
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
  { canvas, context, delta, dungeonMap, elapsed, keyboard, pointer }: SceneContext,
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
    dungeonMap,
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
    dungeonMap: DungeonMapState;
    elapsed: number;
    height: number;
    keyboard: KeyboardState;
    pointer: PointerState;
    width: number;
  }
): void => {
  const { args, delta, dungeonMap, elapsed, height, keyboard, pointer, width } = options;
  const tile = Math.max(12, Math.round(18 * pointer.zoom));
  const origin = {
    x: width / 2,
    y: height / 2,
  };
  const isoOptions = { origin, tileHeight: tile, tileWidth: tile * 2 };
  const rotation = pointer.x * Math.PI;

  updateIsometricDungeonPlayer(keyboard, dungeonMap, rotation, delta, args.speed);
  updateIsometricDungeonInteractions(keyboard, dungeonMap, delta);
  drawIsometricDungeonBackdrop(context, width, height, args.backgroundColor);

  const camera = {
    focusX: keyboard.playerX,
    focusZ: keyboard.playerZ,
  };
  const tiles = dungeonMap.rows.flatMap((row, zIndex) =>
    [...row].map((tileCode, xIndex): DungeonProjectedTile => {
        const gridX = getIsometricDungeonGridX(xIndex, dungeonMap.width);
        const gridZ = getIsometricDungeonGridZ(zIndex, dungeonMap.height);
        const corners = getRotatedIsometricTileCorners(gridX, gridZ, rotation, isoOptions, camera);
        const center = getPolygonCenter(corners);

        return {
          center,
          corners,
          facing: getIsometricDungeonPropFacing(dungeonMap, xIndex, zIndex, tileCode as IsometricDungeonTile),
          gridX,
          gridZ,
          tileKind: tileCode as IsometricDungeonTile,
          xIndex,
          zIndex,
        };
      })
  );
  const renderables: DungeonRenderable[] = [];
  let renderOrder = 0;
  const addRenderable = (depth: number, draw: () => void): void => {
    renderables.push({ depth, draw, order: renderOrder });
    renderOrder += 1;
  };

  tiles
    .slice()
    .sort((first, second) => first.center.y - second.center.y)
    .forEach((tileInfo) => {
      if (tileInfo.tileKind === "_") {
        return;
      }

      if (tileInfo.tileKind === "#") {
        enqueueIsometricDungeonWallRenderables(addRenderable, context, tileInfo.corners, tile);
        return;
      }

      drawIsometricDungeonFloor(context, tileInfo, keyboard);
      if (tileInfo.tileKind === "o") {
        drawIsometricDungeonTorchLight(context, tileInfo.center, tile, elapsed, args);
      }

      if (tileInfo.tileKind === "D") {
        enqueueIsometricDungeonDoorRenderables(addRenderable, context, tileInfo, keyboard, args);
        return;
      }

      if (tileInfo.tileKind !== " " && tileInfo.tileKind !== "S") {
        addRenderable(
          tileInfo.center.y + getIsometricDungeonPropDepthOffset(tileInfo.tileKind, tile),
          () => drawIsometricDungeonProp(context, tileInfo, keyboard, elapsed, args)
        );
      }
    });

  addRenderable(
    projectRotatedIsometricPoint(keyboard.playerX, keyboard.playerZ, rotation, isoOptions, camera).y + tile * 0.7,
    () => drawIsometricDungeonPlayer(context, isoOptions, rotation, camera, keyboard, elapsed, args)
  );

  renderables
    .sort((first, second) => first.depth - second.depth || first.order - second.order)
    .forEach((renderable) => renderable.draw());
};

const updateIsometricDungeonPlayer = (
  keyboard: KeyboardState,
  dungeonMap: DungeonMapState,
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
  const currentTile = getIsometricDungeonTileAt(dungeonMap, keyboard.playerX, keyboard.playerZ);
  const terrainSpeed = currentTile === "w" ? 0.65 : 1;
  const step = delta * (2.4 + speed * 0.35) * terrainSpeed;
  const nextX = keyboard.playerX + worldX * step;
  const nextZ = keyboard.playerZ + worldZ * step;

  keyboard.facingX = worldX;
  keyboard.facingZ = worldZ;

  if (isIsometricDungeonWalkable(dungeonMap, nextX, keyboard.playerZ)) {
    keyboard.playerX = nextX;
  }

  if (isIsometricDungeonWalkable(dungeonMap, keyboard.playerX, nextZ)) {
    keyboard.playerZ = nextZ;
  }
};

const updateIsometricDungeonInteractions = (
  keyboard: KeyboardState,
  dungeonMap: DungeonMapState,
  delta: number
): void => {
  const nearestChest = findNearestDungeonTile(dungeonMap, keyboard, "C", 1);
  const nearestDoor = findNearestOpenableDungeonDoor(dungeonMap, keyboard, 1.1);
  const nearestStairsUp = findNearestDungeonTile(dungeonMap, keyboard, "u", 1);
  const nearestStairsDown = findNearestDungeonTile(dungeonMap, keyboard, "d", 1);
  const doorCells = findStringTileMapCells(dungeonMap, "D");
  const activeDoorKeys = new Set<string>();

  if (nearestChest) {
    keyboard.chestOpen = true;
  }

  doorCells.forEach((cell) => {
    const key = getDungeonDoorKey(cell.column, cell.row);
    const x = cell.x + 0.5;
    const z = cell.z + 0.5;
    const distance = Math.hypot(keyboard.playerX - x, keyboard.playerZ - z);
    const shouldOpen = distance <= 1.1 && isDungeonDoorApproachOpen(dungeonMap, keyboard, cell);
    const current = keyboard.doorOpenProgress.get(key) ?? 0;
    const speed = shouldOpen ? 3.8 : 1.85;
    const next = current + (shouldOpen ? 1 : -1) * delta * speed;

    activeDoorKeys.add(key);
    keyboard.doorOpenProgress.set(key, Math.max(0, Math.min(1, next)));
  });
  [...keyboard.doorOpenProgress.keys()].forEach((key) => {
    if (!activeDoorKeys.has(key)) {
      keyboard.doorOpenProgress.delete(key);
    }
  });

  if (nearestStairsUp || nearestStairsDown) {
    keyboard.stairsReached = true;
  }

  if (nearestDoor && (keyboard.doorOpenProgress.get(nearestDoor.key) ?? 0) > 0.65) {
    keyboard.exitReached = true;
  }

  keyboard.interactionLabel = nearestChest
    ? keyboard.chestOpen
      ? "chest open"
      : "chest"
    : nearestDoor
      ? (keyboard.doorOpenProgress.get(nearestDoor.key) ?? 0) > 0.65
        ? "door open"
        : "door opening"
      : nearestStairsUp
      ? "stairs up"
      : nearestStairsDown
        ? "stairs down"
        : "none";
};

const isIsometricDungeonWalkable = (
  dungeonMap: DungeonMapState,
  x: number,
  z: number
): boolean => {
  const tile = getIsometricDungeonTileAt(dungeonMap, x, z);

  return tile !== undefined && isometricDungeonTiles[tile].walkable;
};

const getIsometricDungeonTileAt = (
  dungeonMap: DungeonMapState,
  x: number,
  z: number
): IsometricDungeonTile | undefined => {
  return getStringTileMapCellFromCenteredPoint(dungeonMap, x, z)?.tile;
};

const findNearestDungeonTile = (
  dungeonMap: DungeonMapState,
  keyboard: KeyboardState,
  tileKind: IsometricDungeonTile,
  radius: number
): { column: number; distance: number; key: string; row: number; x: number; z: number } | undefined => {
  let nearest: { column: number; distance: number; key: string; row: number; x: number; z: number } | undefined;

  findStringTileMapCells(dungeonMap, tileKind).forEach((cell) => {
    const x = cell.x + 0.5;
    const z = cell.z + 0.5;
    const distance = Math.hypot(keyboard.playerX - x, keyboard.playerZ - z);

    if (distance <= radius && (!nearest || distance < nearest.distance)) {
      nearest = { column: cell.column, distance, key: getDungeonDoorKey(cell.column, cell.row), row: cell.row, x, z };
    }
  });

  return nearest;
};

const findNearestOpenableDungeonDoor = (
  dungeonMap: DungeonMapState,
  keyboard: KeyboardState,
  radius: number
): { column: number; distance: number; key: string; row: number; x: number; z: number } | undefined => {
  let nearest: { column: number; distance: number; key: string; row: number; x: number; z: number } | undefined;

  findStringTileMapCells(dungeonMap, "D").forEach((cell) => {
    if (!isDungeonDoorApproachOpen(dungeonMap, keyboard, cell)) {
      return;
    }

    const x = cell.x + 0.5;
    const z = cell.z + 0.5;
    const distance = Math.hypot(keyboard.playerX - x, keyboard.playerZ - z);

    if (distance <= radius && (!nearest || distance < nearest.distance)) {
      nearest = { column: cell.column, distance, key: getDungeonDoorKey(cell.column, cell.row), row: cell.row, x, z };
    }
  });

  return nearest;
};

const isDungeonDoorApproachOpen = (
  dungeonMap: DungeonMapState,
  keyboard: KeyboardState,
  door: { column: number; row: number; x: number; z: number }
): boolean => {
  const doorCenterX = door.x + 0.5;
  const doorCenterZ = door.z + 0.5;
  const axis = getIsometricDungeonDoorAxis(dungeonMap, door.column, door.row);
  const approachColumn = axis === "horizontal"
    ? door.column + (keyboard.playerX < doorCenterX ? -1 : 1)
    : door.column;
  const approachRow = axis === "horizontal"
    ? door.row
    : door.row + (keyboard.playerZ < doorCenterZ ? -1 : 1);
  const approachTile = getStringTileMapTile(dungeonMap, approachColumn, approachRow);

  return approachTile !== undefined && isometricDungeonTiles[approachTile].walkable;
};

const getDungeonDoorKey = (column: number, row: number): string => `${column}:${row}`;

const getIsometricDungeonPropFacing = (
  dungeonMap: DungeonMapState,
  column: number,
  row: number,
  tile: IsometricDungeonTile
): IsometricDungeonDirection => {
  if (tile === "D") {
    return getIsometricDungeonDoorFacing(dungeonMap, column, row);
  }

  if (tile === "C") {
    return getIsometricDungeonChestFacing(dungeonMap, column, row);
  }

  return "south";
};

const getIsometricDungeonDoorFacing = (
  dungeonMap: DungeonMapState,
  column: number,
  row: number
): IsometricDungeonDirection => {
  const north = isIsometricDungeonCellWalkable(dungeonMap, column, row - 1);
  const south = isIsometricDungeonCellWalkable(dungeonMap, column, row + 1);
  const east = isIsometricDungeonCellWalkable(dungeonMap, column + 1, row);
  const west = isIsometricDungeonCellWalkable(dungeonMap, column - 1, row);
  const verticalWallSides =
    Number(isIsometricDungeonWallAttachment(dungeonMap, column, row - 1)) +
    Number(isIsometricDungeonWallAttachment(dungeonMap, column, row + 1));
  const horizontalWallSides =
    Number(isIsometricDungeonWallAttachment(dungeonMap, column - 1, row)) +
    Number(isIsometricDungeonWallAttachment(dungeonMap, column + 1, row));

  if (verticalWallSides > horizontalWallSides) {
    return east ? "east" : "west";
  }

  if (horizontalWallSides > verticalWallSides) {
    return south ? "south" : "north";
  }

  if (east && !west) {
    return "east";
  }

  if (west && !east) {
    return "west";
  }

  if (south && !north) {
    return "south";
  }

  if (north && !south) {
    return "north";
  }

  return "south";
};

const getIsometricDungeonDoorAxis = (
  dungeonMap: DungeonMapState,
  column: number,
  row: number
): "horizontal" | "vertical" => {
  const verticalWallSides =
    Number(isIsometricDungeonWallAttachment(dungeonMap, column, row - 1)) +
    Number(isIsometricDungeonWallAttachment(dungeonMap, column, row + 1));
  const horizontalWallSides =
    Number(isIsometricDungeonWallAttachment(dungeonMap, column - 1, row)) +
    Number(isIsometricDungeonWallAttachment(dungeonMap, column + 1, row));

  if (verticalWallSides > horizontalWallSides) {
    return "horizontal";
  }

  if (horizontalWallSides > verticalWallSides) {
    return "vertical";
  }

  const verticalOpenings =
    Number(isIsometricDungeonCellWalkable(dungeonMap, column, row - 1)) +
    Number(isIsometricDungeonCellWalkable(dungeonMap, column, row + 1));
  const horizontalOpenings =
    Number(isIsometricDungeonCellWalkable(dungeonMap, column - 1, row)) +
    Number(isIsometricDungeonCellWalkable(dungeonMap, column + 1, row));

  return horizontalOpenings > verticalOpenings ? "horizontal" : "vertical";
};

const getIsometricDungeonChestFacing = (
  dungeonMap: DungeonMapState,
  column: number,
  row: number
): IsometricDungeonDirection => {
  const candidates: Array<{ direction: IsometricDungeonDirection; open: boolean }> = [
    { direction: "south", open: isIsometricDungeonCellWalkable(dungeonMap, column, row + 1) },
    { direction: "east", open: isIsometricDungeonCellWalkable(dungeonMap, column + 1, row) },
    { direction: "west", open: isIsometricDungeonCellWalkable(dungeonMap, column - 1, row) },
    { direction: "north", open: isIsometricDungeonCellWalkable(dungeonMap, column, row - 1) },
  ];

  return candidates.find((candidate) => candidate.open)?.direction ?? "south";
};

const isIsometricDungeonCellWalkable = (
  dungeonMap: DungeonMapState,
  column: number,
  row: number
): boolean => {
  const tile = getStringTileMapTile(dungeonMap, column, row);

  return tile !== undefined && isometricDungeonTiles[tile].walkable;
};

const isIsometricDungeonCellBlocked = (
  dungeonMap: DungeonMapState,
  column: number,
  row: number
): boolean => {
  const tile = getStringTileMapTile(dungeonMap, column, row);

  return tile === undefined || !isometricDungeonTiles[tile].walkable;
};

const isIsometricDungeonWallAttachment = (
  dungeonMap: DungeonMapState,
  column: number,
  row: number
): boolean => getStringTileMapTile(dungeonMap, column, row) === "#";

const projectRotatedIsometricPoint = (
  x: number,
  z: number,
  rotation: number,
  isoOptions: Parameters<typeof projectIsometricPoint>[1],
  camera: IsometricDungeonCamera
): ReturnType<typeof projectIsometricPoint> => {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const localX = x - camera.focusX;
  const localZ = z - camera.focusZ;

  return projectIsometricPoint(
    {
      x: localX * cos - localZ * sin,
      y: 0,
      z: localX * sin + localZ * cos,
    },
    isoOptions
  );
};

const getRotatedIsometricTileCorners = (
  x: number,
  z: number,
  rotation: number,
  isoOptions: Parameters<typeof projectIsometricPoint>[1],
  camera: IsometricDungeonCamera
): ReturnType<typeof getIsometricTileCorners> => [
  projectRotatedIsometricPoint(x, z, rotation, isoOptions, camera),
  projectRotatedIsometricPoint(x + 1, z, rotation, isoOptions, camera),
  projectRotatedIsometricPoint(x + 1, z + 1, rotation, isoOptions, camera),
  projectRotatedIsometricPoint(x, z + 1, rotation, isoOptions, camera),
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

const getTileLocalPoint = (
  { corners }: DungeonProjectedTile,
  u: number,
  v: number,
  lift = 0
): ReturnType<typeof projectIsometricPoint> => {
  const [origin, xEdge, , zEdge] = corners;

  return {
    x: origin.x + (xEdge.x - origin.x) * u + (zEdge.x - origin.x) * v,
    y: origin.y + (xEdge.y - origin.y) * u + (zEdge.y - origin.y) * v - lift,
  };
};

const orientTileLocalCoordinates = (
  facing: IsometricDungeonDirection,
  u: number,
  v: number
): { u: number; v: number } => {
  if (facing === "north") {
    return { u: 1 - u, v: 1 - v };
  }

  if (facing === "east") {
    return { u: v, v: 1 - u };
  }

  if (facing === "west") {
    return { u: 1 - v, v: u };
  }

  return { u, v };
};

const getOrientedTileLocalPoint = (
  tileInfo: DungeonProjectedTile,
  u: number,
  v: number,
  lift = 0
): ReturnType<typeof projectIsometricPoint> => {
  const oriented = orientTileLocalCoordinates(tileInfo.facing, u, v);

  return getTileLocalPoint(tileInfo, oriented.u, oriented.v, lift);
};

const getSwingingDoorLocalPoint = (
  tileInfo: DungeonProjectedTile,
  u: number,
  v: number,
  openProgress: number,
  lift = 0
): ReturnType<typeof projectIsometricPoint> => {
  const hingeU = 0.18;
  const hingeV = 0.5;
  const angle = -openProgress * Math.PI * 0.48;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const localU = u - hingeU;
  const localV = v - hingeV;

  return getOrientedTileLocalPoint(
    tileInfo,
    hingeU + localU * cos - localV * sin,
    hingeV + localU * sin + localV * cos,
    lift
  );
};

const getTileLocalQuad = (
  tileInfo: DungeonProjectedTile,
  fromU: number,
  fromV: number,
  toU: number,
  toV: number,
  lift = 0
): ReturnType<typeof getIsometricTileCorners> => [
  getTileLocalPoint(tileInfo, fromU, fromV, lift),
  getTileLocalPoint(tileInfo, toU, fromV, lift),
  getTileLocalPoint(tileInfo, toU, toV, lift),
  getTileLocalPoint(tileInfo, fromU, toV, lift),
];

const getOrientedTileLocalQuad = (
  tileInfo: DungeonProjectedTile,
  fromU: number,
  fromV: number,
  toU: number,
  toV: number,
  lift = 0
): ReturnType<typeof getIsometricTileCorners> => [
  getOrientedTileLocalPoint(tileInfo, fromU, fromV, lift),
  getOrientedTileLocalPoint(tileInfo, toU, fromV, lift),
  getOrientedTileLocalPoint(tileInfo, toU, toV, lift),
  getOrientedTileLocalPoint(tileInfo, fromU, toV, lift),
];

const getSwingingDoorLocalQuad = (
  tileInfo: DungeonProjectedTile,
  fromU: number,
  fromV: number,
  toU: number,
  toV: number,
  openProgress: number,
  lift = 0
): ReturnType<typeof getIsometricTileCorners> => [
  getSwingingDoorLocalPoint(tileInfo, fromU, fromV, openProgress, lift),
  getSwingingDoorLocalPoint(tileInfo, toU, fromV, openProgress, lift),
  getSwingingDoorLocalPoint(tileInfo, toU, toV, openProgress, lift),
  getSwingingDoorLocalPoint(tileInfo, fromU, toV, openProgress, lift),
];

const getRotatedWorldQuad = (
  x: number,
  z: number,
  width: number,
  depth: number,
  rotation: number,
  isoOptions: Parameters<typeof projectIsometricPoint>[1],
  camera: IsometricDungeonCamera,
  lift = 0
): ReturnType<typeof getIsometricTileCorners> => {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;

  return [
    projectRotatedIsometricPoint(x - halfWidth, z - halfDepth, rotation, isoOptions, camera),
    projectRotatedIsometricPoint(x + halfWidth, z - halfDepth, rotation, isoOptions, camera),
    projectRotatedIsometricPoint(x + halfWidth, z + halfDepth, rotation, isoOptions, camera),
    projectRotatedIsometricPoint(x - halfWidth, z + halfDepth, rotation, isoOptions, camera),
  ].map((point) => ({ x: point.x, y: point.y - lift }));
};

const drawIsometricCuboid = (
  context: CanvasRenderingContext2D,
  base: ReturnType<typeof getIsometricTileCorners>,
  height: number,
  colors: {
    sideA: string;
    sideB: string;
    sideC: string;
    sideD: string;
    top: string;
    stroke?: string;
  }
): void => {
  const top = base.map((point) => ({ x: point.x, y: point.y - height }));
  const sideColors = [colors.sideA, colors.sideB, colors.sideC, colors.sideD];
  const faces = base.map((from, index) => {
    const nextIndex = (index + 1) % base.length;
    const to = base[nextIndex];
    const topTo = top[nextIndex];
    const topFrom = top[index];
    const points = [from, to, topTo, topFrom] as ReturnType<typeof getIsometricTileCorners>;

    return {
      color: sideColors[index],
      depth: getPolygonCenter(points).y,
      points,
    };
  });

  faces
    .sort((first, second) => first.depth - second.depth)
    .forEach((face) => {
      drawCanvasPolygon(context, face.points, face.color, colors.stroke);
    });
  drawCanvasPolygon(context, top as ReturnType<typeof getIsometricTileCorners>, colors.top, colors.stroke);
};

const enqueueIsometricCuboidRenderables = (
  addRenderable: (depth: number, draw: () => void) => void,
  context: CanvasRenderingContext2D,
  base: ReturnType<typeof getIsometricTileCorners>,
  height: number,
  colors: {
    sideA: string;
    sideB: string;
    sideC: string;
    sideD: string;
    top: string;
    stroke?: string;
  }
): void => {
  const top = base.map((point) => ({ x: point.x, y: point.y - height }));
  const sideColors = [colors.sideA, colors.sideB, colors.sideC, colors.sideD];
  const sideDepths: number[] = [];

  base.forEach((from, index) => {
    const nextIndex = (index + 1) % base.length;
    const to = base[nextIndex];
    const topTo = top[nextIndex];
    const topFrom = top[index];
    const points = [from, to, topTo, topFrom] as ReturnType<typeof getIsometricTileCorners>;

    const depth = getPolygonCenter(points).y;

    sideDepths.push(depth);
    addRenderable(depth, () => {
      drawCanvasPolygon(context, points, sideColors[index], colors.stroke);
    });
  });
  addRenderable(Math.max(...sideDepths) + 0.1, () => {
    drawCanvasPolygon(context, top as ReturnType<typeof getIsometricTileCorners>, colors.top, colors.stroke);
  });
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
  tileInfo: DungeonProjectedTile,
  keyboard: KeyboardState
): void => {
  const { corners, tileKind, xIndex, zIndex } = tileInfo;
  const isWater = tileKind === "w";
  const isDoor = tileKind === "D";
  const isStairs = tileKind === "u";
  const isSpawn = tileKind === "S";
  const shade = (xIndex + zIndex) % 2 === 0 ? 0.92 : 1;
  const exitGlow =
    (keyboard.stairsReached || keyboard.interactionLabel.startsWith("stairs")) && isStairs;
  const doorGlow = keyboard.interactionLabel === "door" && isDoor;

  drawCanvasPolygon(
    context,
    corners,
    isWater
      ? "rgba(38, 96, 112, 0.74)"
      : isDoor
        ? doorGlow
          ? "rgba(112, 84, 48, 0.95)"
          : "rgba(87, 61, 42, 0.92)"
        : exitGlow
          ? "rgba(89, 110, 95, 0.96)"
        : isSpawn
          ? "rgba(45, 56, 58, 0.95)"
          : `rgba(${Math.round(42 * shade)}, ${Math.round(43 * shade)}, ${Math.round(52 * shade)}, 0.95)`,
    isWater
      ? "rgba(144, 205, 244, 0.46)"
      : doorGlow
        ? "rgba(246, 224, 94, 0.45)"
      : exitGlow
        ? "rgba(246, 224, 94, 0.55)"
        : isSpawn
          ? "rgba(79, 209, 197, 0.32)"
        : "rgba(10, 11, 16, 0.7)"
  );

  if (tileKind !== "D") {
    const [top, right, bottom, left] = corners;

    drawCanvasLine(context, top, bottom, "rgba(255, 255, 255, 0.05)");
    drawCanvasLine(context, left, right, "rgba(0, 0, 0, 0.18)");
  }
};

const drawIsometricDungeonTorchLight = (
  context: CanvasRenderingContext2D,
  center: { x: number; y: number },
  tile: number,
  elapsed: number,
  args: Arcade3DStoryArgs
): void => {
  const flicker = 0.82 + Math.sin(elapsed * args.speed * 11 + center.x) * 0.12;
  const gradient = context.createRadialGradient(center.x, center.y - tile * 0.25, 0, center.x, center.y - tile * 0.25, tile * 2.8);

  gradient.addColorStop(0, colorWithAlpha(args.secondaryColor, 0.28 * flicker));
  gradient.addColorStop(0.45, colorWithAlpha(args.secondaryColor, 0.1 * flicker));
  gradient.addColorStop(1, "rgba(246, 224, 94, 0)");
  context.fillStyle = gradient;
  context.fillRect(center.x - tile * 3, center.y - tile * 3, tile * 6, tile * 6);
};

const getIsometricDungeonPropDepthOffset = (
  tileKind: IsometricDungeonTile,
  tile: number
): number => {
  if (tileKind === "o" || tileKind === "P") {
    return tile * 1.1;
  }

  if (tileKind === "C") {
    return tile * 0.8;
  }

  if (tileKind === "r") {
    return tile * 0.55;
  }

  return tile * 0.45;
};

const enqueueIsometricDungeonWallRenderables = (
  addRenderable: (depth: number, draw: () => void) => void,
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

  const faces = getIsometricWallFaces(raised, height);

  faces.forEach((face) => {
    addRenderable(face.depth, () => {
      drawCanvasPolygon(context, face.points, shades[face.index]);
    });
  });
  addRenderable(Math.max(...faces.map((face) => face.depth)) + 0.1, () => {
    drawCanvasPolygon(context, raised as ReturnType<typeof getIsometricTileCorners>, "rgba(62, 55, 75, 0.98)", "rgba(148, 122, 176, 0.35)");
    const [, right, , left] = raised;

    drawCanvasLine(context, left, right, "rgba(255, 255, 255, 0.08)");
  });
};

const enqueueIsometricDungeonDoorRenderables = (
  addRenderable: (depth: number, draw: () => void) => void,
  context: CanvasRenderingContext2D,
  tileInfo: DungeonProjectedTile,
  keyboard: KeyboardState,
  args: Arcade3DStoryArgs
): void => {
  const doorKey = getDungeonDoorKey(tileInfo.xIndex, tileInfo.zIndex);
  const openProgress = keyboard.doorOpenProgress.get(doorKey) ?? 0;
  const easedOpen = 1 - (1 - openProgress) ** 2;
  const doorReady = keyboard.interactionLabel.startsWith("door");
  const panel = getSwingingDoorLocalQuad(
    tileInfo,
    0.18,
    0.42,
    0.82,
    0.58,
    easedOpen
  );
  const handle = getSwingingDoorLocalPoint(tileInfo, 0.63, 0.59, easedOpen, 14);

  enqueueIsometricCuboidRenderables(
    addRenderable,
    context,
    getOrientedTileLocalQuad(tileInfo, 0.02, 0.36, 0.16, 0.64),
    26,
    {
      sideA: "rgba(35, 24, 18, 0.94)",
      sideB: "rgba(82, 53, 36, 0.94)",
      sideC: "rgba(29, 21, 17, 0.94)",
      sideD: "rgba(65, 43, 31, 0.94)",
      top: "rgba(105, 70, 45, 0.96)",
      stroke: doorReady ? "rgba(246, 224, 94, 0.48)" : "rgba(246, 224, 94, 0.14)",
    }
  );
  enqueueIsometricCuboidRenderables(
    addRenderable,
    context,
    getOrientedTileLocalQuad(tileInfo, 0.84, 0.36, 0.98, 0.64),
    26,
    {
      sideA: "rgba(35, 24, 18, 0.94)",
      sideB: "rgba(82, 53, 36, 0.94)",
      sideC: "rgba(29, 21, 17, 0.94)",
      sideD: "rgba(65, 43, 31, 0.94)",
      top: "rgba(105, 70, 45, 0.96)",
      stroke: doorReady ? "rgba(246, 224, 94, 0.62)" : "rgba(246, 224, 94, 0.18)",
    }
  );
  enqueueIsometricCuboidRenderables(
    addRenderable,
    context,
    getOrientedTileLocalQuad(tileInfo, 0.02, 0.36, 0.98, 0.48),
    28,
    {
      sideA: "rgba(39, 27, 20, 0.96)",
      sideB: "rgba(92, 59, 39, 0.96)",
      sideC: "rgba(31, 22, 17, 0.96)",
      sideD: "rgba(74, 48, 33, 0.96)",
      top: "rgba(118, 78, 49, 0.96)",
      stroke: doorReady ? "rgba(246, 224, 94, 0.5)" : "rgba(246, 224, 94, 0.12)",
    }
  );
  enqueueIsometricCuboidRenderables(addRenderable, context, panel, 22, {
    sideA: doorReady ? colorWithAlpha(args.secondaryColor, 0.22) : "rgba(55, 36, 26, 0.94)",
    sideB: "rgba(112, 70, 42, 0.96)",
    sideC: "rgba(37, 27, 22, 0.96)",
    sideD: "rgba(92, 58, 38, 0.96)",
    top: "rgba(133, 83, 48, 0.96)",
    stroke: doorReady ? "rgba(246, 224, 94, 0.72)" : "rgba(246, 224, 94, 0.18)",
  });
  addRenderable(handle.y, () => {
    context.fillStyle = colorWithAlpha(args.secondaryColor, doorReady ? 0.95 : 0.54);
    context.fillRect(handle.x - 1, handle.y - 1, 3, 3);
  });
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
  tileInfo: DungeonProjectedTile,
  keyboard: KeyboardState,
  elapsed: number,
  args: Arcade3DStoryArgs
): void => {
  const { center, tileKind } = tileInfo;

  if (tileKind === "o") {
    const flicker = 0.75 + Math.sin(elapsed * args.speed * 12 + center.x) * 0.15;

    context.fillStyle = "rgba(61, 42, 28, 0.9)";
    context.fillRect(center.x - 2, center.y - 3, 4, 16);
    context.fillStyle = "rgba(30, 22, 17, 0.88)";
    context.fillRect(center.x - 6, center.y + 11, 12, 3);
    context.fillStyle = colorWithAlpha(args.secondaryColor, 0.52 * flicker);
    context.beginPath();
    context.arc(center.x, center.y - 8, 11, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = colorWithAlpha("#f6e05e", 0.92);
    context.fillRect(center.x - 2, center.y - 14, 4, 8);
    context.fillStyle = colorWithAlpha("#fc8181", 0.62);
    context.fillRect(center.x - 1, center.y - 17, 2, 5);
    return;
  }

  if (tileKind === "P") {
    const base = getTileLocalQuad(tileInfo, 0.2, 0.2, 0.8, 0.8, 0);

    context.fillStyle = "rgba(14, 15, 20, 0.48)";
    context.beginPath();
    context.ellipse(center.x, center.y + 8, 12, 5, 0, 0, Math.PI * 2);
    context.fill();
    drawIsometricCuboid(context, base, 28, {
      sideA: "rgba(66, 60, 82, 0.98)",
      sideB: "rgba(82, 74, 101, 0.98)",
      sideC: "rgba(45, 41, 58, 0.98)",
      sideD: "rgba(73, 67, 87, 0.98)",
      top: "rgba(122, 111, 144, 0.98)",
      stroke: "rgba(148, 122, 176, 0.24)",
    });
    drawCanvasPolygon(context, getTileLocalQuad(tileInfo, 0.12, 0.12, 0.88, 0.88), "rgba(88, 80, 105, 0.72)");
    return;
  }

  if (tileKind === "C") {
    const base = getOrientedTileLocalQuad(tileInfo, 0.16, 0.28, 0.84, 0.74, 0);
    const lock = getOrientedTileLocalPoint(tileInfo, 0.5, 0.74, 8);
    const chestReady = keyboard.interactionLabel === "chest" || keyboard.interactionLabel === "chest open";

    context.fillStyle = "rgba(12, 11, 14, 0.45)";
    context.fillRect(center.x - 12, center.y + 11, 24, 5);
    drawIsometricCuboid(context, base, 12, {
      sideA: "rgba(76, 47, 29, 0.98)",
      sideB: "rgba(112, 70, 38, 0.98)",
      sideC: "rgba(55, 35, 25, 0.98)",
      sideD: "rgba(99, 62, 34, 0.98)",
      top: keyboard.chestOpen ? "rgba(30, 24, 21, 0.98)" : "rgba(132, 83, 43, 0.98)",
      stroke: chestReady ? "rgba(246, 224, 94, 0.78)" : "rgba(246, 224, 94, 0.18)",
    });
    if (keyboard.chestOpen || chestReady) {
      const glow = context.createRadialGradient(center.x, center.y - 10, 0, center.x, center.y - 10, 20);

      gradientSafeAddColorStop(glow, [
        [0, colorWithAlpha(args.secondaryColor, keyboard.chestOpen ? 0.44 + Math.sin(elapsed * 8) * 0.08 : 0.22)],
        [1, "rgba(246, 224, 94, 0)"],
      ]);
      context.fillStyle = glow;
      context.fillRect(center.x - 24, center.y - 30, 48, 40);
    }
    context.fillStyle = colorWithAlpha(args.secondaryColor, 0.82);
    context.fillRect(lock.x - 2, lock.y - 2, 4, 5);
    return;
  }

  if (tileKind === "S") {
    return;
  }

  if (tileKind === "u") {
    const stairsReady = keyboard.interactionLabel === (tileKind === "u" ? "stairs up" : "stairs down");
    const pulse = keyboard.stairsReached || stairsReady ? 0.32 + Math.sin(elapsed * 8) * 0.08 : 0.12;

    for (let step = 0; step < 4; step++) {
      drawIsometricCuboid(
        context,
        getTileLocalQuad(tileInfo, 0.18 + step * 0.08, 0.18 + step * 0.12, 0.82 - step * 0.08, 0.34 + step * 0.12),
        3 + step * 2,
        {
          sideA: `rgba(58, 54, 70, ${0.88 - step * 0.06})`,
          sideB: `rgba(82, 76, 98, ${0.88 - step * 0.06})`,
          sideC: `rgba(42, 39, 53, ${0.88 - step * 0.06})`,
          sideD: `rgba(75, 69, 88, ${0.88 - step * 0.06})`,
          top: `rgba(95, 88, 108, ${0.9 - step * 0.05})`,
          stroke: stairsReady ? "rgba(246, 224, 94, 0.5)" : "rgba(255, 255, 255, 0.1)",
        }
      );
    }
    context.fillStyle = colorWithAlpha(args.secondaryColor, pulse);
    context.beginPath();
    context.ellipse(center.x, center.y + 10, 24, 8, 0, 0, Math.PI * 2);
    context.fill();
    return;
  }

  if (tileKind === "d") {
    const stairsReady = keyboard.interactionLabel === "stairs down";
    const pulse = keyboard.stairsReached || stairsReady ? 0.3 + Math.sin(elapsed * 8) * 0.06 : 0.08;
    const opening = getTileLocalQuad(tileInfo, 0.16, 0.18, 0.84, 0.82);

    drawCanvasPolygon(context, opening, "rgba(4, 5, 9, 0.98)", stairsReady ? "rgba(246, 224, 94, 0.52)" : "rgba(0, 0, 0, 0.72)");

    for (let step = 0; step < 5; step++) {
      const v = 0.24 + step * 0.1;
      const tread = getTileLocalQuad(tileInfo, 0.23 + step * 0.045, v, 0.77 - step * 0.045, v + 0.055, -step * 3);

      drawCanvasPolygon(
        context,
        tread,
        `rgba(78, 72, 92, ${0.88 - step * 0.1})`,
        stairsReady ? "rgba(246, 224, 94, 0.34)" : "rgba(255, 255, 255, 0.09)"
      );
      const front = [
        tread[2],
        tread[3],
        { x: tread[3].x, y: tread[3].y + 5 + step * 2 },
        { x: tread[2].x, y: tread[2].y + 5 + step * 2 },
      ] as ReturnType<typeof getIsometricTileCorners>;

      drawCanvasPolygon(context, front, `rgba(22, 21, 30, ${0.78 - step * 0.08})`);
    }
    context.fillStyle = colorWithAlpha(args.secondaryColor, pulse);
    context.beginPath();
    context.ellipse(center.x, center.y + 9, 22, 7, 0, 0, Math.PI * 2);
    context.fill();
    return;
  }

  if (tileKind === "r") {
    const base = getTileLocalQuad(tileInfo, 0.24, 0.28, 0.74, 0.72, 0);

    drawIsometricCuboid(context, base, 8, {
      sideA: "rgba(50, 48, 58, 0.95)",
      sideB: "rgba(72, 68, 82, 0.95)",
      sideC: "rgba(36, 34, 44, 0.95)",
      sideD: "rgba(60, 56, 70, 0.95)",
      top: "rgba(99, 92, 112, 0.95)",
      stroke: "rgba(255, 255, 255, 0.08)",
    });
    drawCanvasPolygon(context, getTileLocalQuad(tileInfo, 0.48, 0.18, 0.8, 0.42), "rgba(83, 79, 95, 0.88)");
    return;
  }

};

const gradientSafeAddColorStop = (
  gradient: CanvasGradient,
  stops: Array<[number, string]>
): void => {
  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
};

const drawIsometricDungeonPlayer = (
  context: CanvasRenderingContext2D,
  isoOptions: Parameters<typeof projectIsometricPoint>[1],
  rotation: number,
  camera: IsometricDungeonCamera,
  keyboard: KeyboardState,
  elapsed: number,
  args: Arcade3DStoryArgs
): void => {
  const bob = Math.max(0, Math.sin(elapsed * args.speed * 8)) * 2;
  const center = projectRotatedIsometricPoint(keyboard.playerX, keyboard.playerZ, rotation, isoOptions, camera);
  const bodyBase = getRotatedWorldQuad(keyboard.playerX, keyboard.playerZ, 0.38, 0.38, rotation, isoOptions, camera, bob);
  const headBase = getRotatedWorldQuad(
    keyboard.playerX,
    keyboard.playerZ,
    0.22,
    0.22,
    rotation,
    isoOptions,
    camera,
    19 + bob
  );
  const facing = projectRotatedIsometricPoint(
    keyboard.playerX + keyboard.facingX * 0.42,
    keyboard.playerZ + keyboard.facingZ * 0.42,
    rotation,
    isoOptions,
    camera
  );
  const armStart = { x: center.x, y: center.y - 15 + bob };
  const armTarget = {
    x: center.x + (facing.x - center.x) * 1.1,
    y: center.y - 13 + (facing.y - center.y) * 1.1 + bob,
  };

  context.fillStyle = "rgba(0, 0, 0, 0.34)";
  context.beginPath();
  context.ellipse(center.x, center.y + 10, 12, 5, 0, 0, Math.PI * 2);
  context.fill();
  drawIsometricCuboid(context, bodyBase, 20, {
    sideA: colorWithAlpha(args.accentColor, 0.74),
    sideB: colorWithAlpha(args.accentColor, 0.95),
    sideC: colorWithAlpha(args.accentColor, 0.58),
    sideD: colorWithAlpha(args.accentColor, 0.82),
    top: colorWithAlpha("#90cdf4", 0.96),
    stroke: colorWithAlpha("#ffffff", 0.16),
  });
  drawCanvasLine(context, armStart, armTarget, colorWithAlpha(args.secondaryColor, 0.9), 3);
  drawIsometricCuboid(context, headBase, 8, {
    sideA: "#c7a27c",
    sideB: "#e8d4b2",
    sideC: "#a77d5c",
    sideD: "#d8b58f",
    top: "#f2dfc3",
    stroke: "rgba(5, 7, 10, 0.16)",
  });
  context.fillStyle = colorWithAlpha("#05070a", 0.62);
  context.fillRect(center.x + Math.sign(facing.x - center.x) * 2, center.y - 24 + bob, 3, 2);
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
      ["player", "4, 6"],
      ["nearby", "none"],
      ["camera", "0deg / 1.00x"],
    ], {
      enableArrowMovement: true,
      mapEditor: { initialText: defaultIsometricDungeonMapText },
      enableWheelZoom: true,
      updateStats: getIsometricDungeonStats,
    }),
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
