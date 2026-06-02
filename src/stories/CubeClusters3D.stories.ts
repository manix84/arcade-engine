import type { Meta, StoryObj } from "@storybook/html-vite";
import { fn } from "storybook/test";
import {
  centerCubeCluster,
  createCubeClusterFromPattern,
  createExplosionBlocks,
  createPlasmaLinks,
  stepExplosionBlocks,
} from "../index.js";
import type { CubeBlock, ExplosionBlock, PlasmaLink } from "../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createPanel,
  createValue,
  onRemove,
  setValue,
} from "./story-utils.js";

const meta = {
  title: "Engine/3D/Cube Clusters",
} satisfies Meta;

export default meta;

type CubeClusterStoryArgs = {
  accentColor: string;
  backgroundColor: string;
  blockColor: string;
  cutawayView: boolean;
  explosionLoop: boolean;
  explosionFadeMax: number;
  explosionFadeMin: number;
  explosionForce: number;
  gap: number;
  gravity: number;
  linkDistance: number;
  rotationSpeed: number;
  showLinks: boolean;
  spinX: number;
  spinY: number;
  tumbleSpeed: number;
  onAssemble: () => void;
  onExplode: () => void;
};

type Story = StoryObj<CubeClusterStoryArgs>;

type Vec2 = {
  x: number;
  y: number;
};

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

type AnimatedExplosionBlock = ExplosionBlock & {
  fadeSpeed: number;
  originOpacity?: number;
  originX?: number;
  originY?: number;
  originZ?: number;
  reassembleAge?: number;
  reassembleDuration?: number;
  targetX?: number;
  targetY?: number;
  targetZ?: number;
  tumbleSpeedX: number;
  tumbleSpeedY: number;
  tumbleSpeedZ: number;
  tumbleX: number;
  tumbleY: number;
  tumbleZ: number;
};

type RenderBlock = CubeBlock | AnimatedExplosionBlock;

type SceneState = {
  blocks: CubeBlock[];
  explosion: AnimatedExplosionBlock[];
  lastTime: number;
  mode: "assembled" | "exploding" | "reassembling";
  rotation: number;
};

type CameraState = {
  hasUserControl: boolean;
  isDragging: boolean;
  lastPointerX: number;
  lastPointerY: number;
  rotationX: number;
  rotationY: number;
  zoom: number;
};

type Face = {
  color: string;
  depth: number;
  points: Vec2[];
};

const pickupPattern = [
  [" ### ", "#####", "#####", " ### "],
  ["  #  ", " ### ", " ### ", "  #  "],
  [" ### ", "#####", "#####", " ### "],
];

const platformPattern = [
  ["########", "########", "##....##", "##....##", "########", "########"],
  ["........", ".######.", ".#....#.", ".#....#.", ".######.", "........"],
  ["........", "...##...", "..####..", "..####..", "...##...", "........"],
];

const argTypes: Story["argTypes"] = {
  accentColor: { name: "Accent color", control: "color" },
  backgroundColor: { name: "Background color", control: "color" },
  blockColor: { name: "Block color", control: "color" },
  cutawayView: { name: "Cutaway view", control: "boolean" },
  explosionLoop: { name: "Explosion loop", control: "boolean" },
  explosionFadeMax: { name: "Max fade speed", control: { type: "range", min: 0.2, max: 2.2, step: 0.05 } },
  explosionFadeMin: { name: "Min fade speed", control: { type: "range", min: 0.1, max: 1.6, step: 0.05 } },
  explosionForce: { name: "Explosion force", control: { type: "range", min: 1, max: 12, step: 0.5 } },
  gap: { name: "Block gap", control: { type: "range", min: 0, max: 0.7, step: 0.02 } },
  gravity: { name: "Gravity", control: { type: "range", min: -6, max: 2, step: 0.25 } },
  linkDistance: { name: "Link distance", control: { type: "range", min: 1, max: 2.6, step: 0.05 } },
  rotationSpeed: { name: "Rotation speed", control: { type: "range", min: -1.5, max: 1.5, step: 0.05 } },
  showLinks: { name: "Show links", control: "boolean" },
  spinX: { name: "Spin X", control: { type: "range", min: -0.8, max: 0.8, step: 0.05 } },
  spinY: { name: "Spin Y", control: { type: "range", min: -0.8, max: 0.8, step: 0.05 } },
  tumbleSpeed: { name: "Tumble speed", control: { type: "range", min: 0, max: 12, step: 0.25 } },
};

const defaultArgs = {
  accentColor: "#f6e05e",
  backgroundColor: "#05070a",
  blockColor: "#4fd1c5",
  cutawayView: false,
  explosionLoop: false,
  explosionFadeMax: 1.05,
  explosionFadeMin: 0.35,
  explosionForce: 5,
  gap: 0.18,
  gravity: -1.4,
  linkDistance: 1.55,
  onAssemble: fn(),
  onExplode: fn(),
  rotationSpeed: 0.45,
  showLinks: true,
  spinX: -0.34,
  spinY: 0.62,
  tumbleSpeed: 5,
} satisfies CubeClusterStoryArgs;

const parseHexColor = (hex: string): [number, number, number] => {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized,
    16
  );

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const shadeColor = (hex: string, shade: number, alpha = 1): string => {
  const [red, green, blue] = parseHexColor(hex);
  const tint = (value: number): number => Math.max(0, Math.min(255, Math.round(value * shade)));

  return `rgba(${tint(red)}, ${tint(green)}, ${tint(blue)}, ${alpha})`;
};

const rotatePoint = (point: Vec3, rotationY: number, rotationX: number): Vec3 => {
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const x = point.x * cosY - point.z * sinY;
  const z = point.x * sinY + point.z * cosY;

  return {
    x,
    y: point.y * cosX - z * sinX,
    z: point.y * sinX + z * cosX,
  };
};

const rotateLocalPoint = (point: Vec3, rotationX: number, rotationY: number, rotationZ: number): Vec3 => {
  const cosX = Math.cos(rotationX);
  const sinX = Math.sin(rotationX);
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const cosZ = Math.cos(rotationZ);
  const sinZ = Math.sin(rotationZ);
  const y = point.y * cosX - point.z * sinX;
  const z = point.y * sinX + point.z * cosX;
  const x = point.x * cosY + z * sinY;
  const rotatedZ = -point.x * sinY + z * cosY;

  return {
    x: x * cosZ - y * sinZ,
    y: x * sinZ + y * cosZ,
    z: rotatedZ,
  };
};

const projectPoint = (
  point: Vec3,
  canvas: HTMLCanvasElement,
  rotationY: number,
  rotationX: number,
  zoom: number
): Vec2 & { depth: number } => {
  const rotated = rotatePoint(point, rotationY, rotationX);
  const cameraDistance = 18;
  const scale = (zoom * cameraDistance) / (cameraDistance + rotated.z);

  return {
    depth: rotated.z,
    x: canvas.width / 2 + rotated.x * scale,
    y: canvas.height / 2 - rotated.y * scale,
  };
};

const getCubeCorners = (block: RenderBlock): Vec3[] => {
  const size = block.size ?? 1;
  const half = size / 2;
  const offsets = [
    { x: -half, y: -half, z: -half },
    { x: half, y: -half, z: -half },
    { x: half, y: half, z: -half },
    { x: -half, y: half, z: -half },
    { x: -half, y: -half, z: half },
    { x: half, y: -half, z: half },
    { x: half, y: half, z: half },
    { x: -half, y: half, z: half },
  ];

  return offsets.map((offset) => {
    const rotatedOffset =
      "tumbleX" in block
        ? rotateLocalPoint(offset, block.tumbleX, block.tumbleY, block.tumbleZ)
        : offset;

    return {
      x: block.x + rotatedOffset.x,
      y: block.y + rotatedOffset.y,
      z: block.z + rotatedOffset.z,
    };
  });
};

const createCubeFaces = (
  block: RenderBlock,
  canvas: HTMLCanvasElement,
  rotationY: number,
  rotationX: number,
  zoom: number,
  cutawayView: boolean
): Face[] => {
  const color = block.color ?? "#4fd1c5";
  const alpha = "opacity" in block ? block.opacity : 1;
  const projected = getCubeCorners(block).map((corner) =>
    projectPoint(corner, canvas, rotationY, rotationX, zoom)
  );
  const faces = [
    { color: shadeColor(color, 0.68, alpha), indexes: [0, 3, 2, 1] },
    { color: shadeColor(color, 0.82, alpha), indexes: [1, 2, 6, 5] },
    { color: shadeColor(color, 1.12, alpha), indexes: [3, 7, 6, 2] },
    { color: shadeColor(color, 0.52, alpha), indexes: [4, 5, 6, 7] },
    { color: shadeColor(color, 0.62, alpha), indexes: [0, 4, 7, 3] },
    { color: shadeColor(color, 0.45, alpha), indexes: [0, 1, 5, 4] },
  ];

  const renderFaces = faces.map((face) => {
    const points = face.indexes.map((index) => projected[index]);
    const depth = points.reduce((total, point) => total + point.depth, 0) / points.length;

    return {
      color: face.color,
      depth,
      points,
    };
  });

  if (!cutawayView) {
    return renderFaces;
  }

  const cameraFaceDepth = Math.min(...renderFaces.map((face) => face.depth));

  return renderFaces.filter((face) => face.depth !== cameraFaceDepth);
};

const drawPolygon = (
  context: CanvasRenderingContext2D,
  face: Face
): void => {
  context.beginPath();
  face.points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
      return;
    }

    context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.fillStyle = face.color;
  context.fill();
  context.strokeStyle = "rgba(245, 247, 251, 0.1)";
  context.lineWidth = 1;
  context.stroke();
};

const drawLinks = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  blocks: RenderBlock[],
  links: PlasmaLink[],
  args: CubeClusterStoryArgs,
  rotationY: number,
  rotationX: number,
  zoom: number
): void => {
  const blockById = new Map(blocks.map((block) => [block.id, block]));

  links.forEach((link) => {
    const from = blockById.get(link.from);
    const to = blockById.get(link.to);

    if (!from || !to) {
      return;
    }

    const start = projectPoint(from, canvas, rotationY, rotationX, zoom);
    const end = projectPoint(to, canvas, rotationY, rotationX, zoom);

    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.strokeStyle = shadeColor(args.accentColor, 1, 0.12 + link.strength * 0.25);
    context.lineWidth = 1 + link.strength * 2;
    context.stroke();
  });
};

const drawScene = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  blocks: RenderBlock[],
  links: PlasmaLink[],
  args: CubeClusterStoryArgs,
  rotationY: number,
  rotationX: number,
  zoom: number
): void => {
  context.fillStyle = args.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (args.showLinks) {
    drawLinks(context, canvas, blocks, links, args, rotationY, rotationX, zoom);
  }

  blocks
    .flatMap((block) => createCubeFaces(block, canvas, rotationY, rotationX, zoom, args.cutawayView))
    .sort((a, b) => b.depth - a.depth)
    .forEach((face) => drawPolygon(context, face));
};

const createBlocks = (
  pattern: string[][],
  args: CubeClusterStoryArgs
): CubeBlock[] =>
  centerCubeCluster(
    createCubeClusterFromPattern(pattern, {
      color: args.blockColor,
      gap: args.gap,
      layerGap: args.gap,
      size: 1,
    }).blocks
  );

const createAnimatedExplosionBlocks = (
  blocks: CubeBlock[],
  args: CubeClusterStoryArgs
): AnimatedExplosionBlock[] =>
  createExplosionBlocks(blocks, {
    force: args.explosionForce,
    spin: 0.8,
  }).map((block, index) => {
    const fadeRange = Math.max(0, args.explosionFadeMax - args.explosionFadeMin);
    const direction = index % 6;
    const axisKick = args.explosionForce * 0.42;
    const velocity = {
      x: block.velocity.x + (direction === 0 ? axisKick : direction === 1 ? -axisKick : 0),
      y: block.velocity.y + (direction === 2 ? axisKick : direction === 3 ? -axisKick : 0),
      z: block.velocity.z + (direction === 4 ? axisKick : direction === 5 ? -axisKick : 0),
    };

    return {
      ...block,
      fadeSpeed: args.explosionFadeMin + Math.random() * fadeRange,
      tumbleSpeedX: (Math.random() * 2 - 1) * args.tumbleSpeed,
      tumbleSpeedY: (Math.random() * 2 - 1) * args.tumbleSpeed,
      tumbleSpeedZ: (Math.random() * 2 - 1) * args.tumbleSpeed,
      tumbleX: Math.random() * Math.PI,
      tumbleY: Math.random() * Math.PI,
      tumbleZ: Math.random() * Math.PI,
      velocity,
    };
  });

const stepAnimatedExplosionBlocks = (
  blocks: AnimatedExplosionBlock[],
  delta: number,
  args: CubeClusterStoryArgs
): AnimatedExplosionBlock[] =>
  stepExplosionBlocks(blocks, delta, {
    drag: 0.985,
    fadeSpeed: 0,
    gravity: args.gravity,
  }).map((block) => {
    const animatedBlock = block as AnimatedExplosionBlock;

    return {
      ...animatedBlock,
      opacity: Math.max(0, animatedBlock.opacity - animatedBlock.fadeSpeed * delta),
      tumbleX: animatedBlock.tumbleX + animatedBlock.tumbleSpeedX * delta,
      tumbleY: animatedBlock.tumbleY + animatedBlock.tumbleSpeedY * delta,
      tumbleZ: animatedBlock.tumbleZ + animatedBlock.tumbleSpeedZ * delta,
    };
  });

const easeOutCubic = (value: number): number => 1 - (1 - value) ** 3;

const createReassembleBlocks = (
  sourceBlocks: AnimatedExplosionBlock[],
  targetBlocks: CubeBlock[]
): AnimatedExplosionBlock[] => {
  const sourceById = new Map(sourceBlocks.map((block) => [block.id, block]));

  return targetBlocks.map((target, index) => {
    const source = sourceById.get(target.id);
    const nearbyOffset = {
      x: (Math.random() - 0.5) * 3.4,
      y: (Math.random() - 0.5) * 3.4,
      z: (Math.random() - 0.5) * 3.4,
    };
    const block: AnimatedExplosionBlock =
      source ??
      {
        ...target,
        opacity: 0,
        velocity: { x: 0, y: 0, z: 0 },
        x: target.x + nearbyOffset.x,
        y: target.y + nearbyOffset.y,
        z: target.z + nearbyOffset.z,
        fadeSpeed: 0,
        tumbleSpeedX: (Math.random() * 2 - 1) * 2.4,
        tumbleSpeedY: (Math.random() * 2 - 1) * 2.4,
        tumbleSpeedZ: (Math.random() * 2 - 1) * 2.4,
        tumbleX: Math.random() * Math.PI,
        tumbleY: Math.random() * Math.PI,
        tumbleZ: Math.random() * Math.PI,
      };

    return {
      ...block,
      fadeSpeed: 0,
      originOpacity: block.opacity,
      originX: block.x,
      originY: block.y,
      originZ: block.z,
      reassembleAge: 0,
      reassembleDuration: 0.75 + (index % 7) * 0.045,
      targetX: target.x,
      targetY: target.y,
      targetZ: target.z,
      tumbleSpeedX: block.tumbleSpeedX * 0.45,
      tumbleSpeedY: block.tumbleSpeedY * 0.45,
      tumbleSpeedZ: block.tumbleSpeedZ * 0.45,
    };
  });
};

const stepReassembleBlocks = (
  blocks: AnimatedExplosionBlock[],
  delta: number
): AnimatedExplosionBlock[] =>
  blocks.map((block) => {
    const age = (block.reassembleAge ?? 0) + delta;
    const duration = block.reassembleDuration ?? 0.9;
    const progress = Math.min(1, age / duration);
    const eased = easeOutCubic(progress);
    const originX = block.originX ?? block.x;
    const originY = block.originY ?? block.y;
    const originZ = block.originZ ?? block.z;
    const targetX = block.targetX ?? block.x;
    const targetY = block.targetY ?? block.y;
    const targetZ = block.targetZ ?? block.z;

    return {
      ...block,
      opacity: (block.originOpacity ?? block.opacity) + (1 - (block.originOpacity ?? block.opacity)) * eased,
      reassembleAge: age,
      tumbleSpeedX: block.tumbleSpeedX * 0.965,
      tumbleSpeedY: block.tumbleSpeedY * 0.965,
      tumbleSpeedZ: block.tumbleSpeedZ * 0.965,
      tumbleX: block.tumbleX * (1 - eased) + block.tumbleSpeedX * delta,
      tumbleY: block.tumbleY * (1 - eased) + block.tumbleSpeedY * delta,
      tumbleZ: block.tumbleZ * (1 - eased) + block.tumbleSpeedZ * delta,
      x: originX + (targetX - originX) * eased,
      y: originY + (targetY - originY) * eased,
      z: originZ + (targetZ - originZ) * eased,
    };
  });

const createDemo = (
  title: string,
  pattern: string[][],
  args: CubeClusterStoryArgs,
  options: {
    autoExplode?: boolean;
    zoom: number;
  }
): HTMLElement => {
  const shell = createDemoShell(title);
  const grid = document.createElement("div");
  const scenePanel = createPanel("Scene");
  const controlsPanel = createPanel("Loop");
  const stage = document.createElement("div");
  const canvas = document.createElement("canvas");
  const controls = document.createElement("div");
  const values = document.createElement("div");
  const blockValue = createValue("blocks", "0");
  const linkValue = createValue("links", "0");
  const stateValue = createValue("state", "assembled");
  const state: SceneState = {
    blocks: createBlocks(pattern, args),
    explosion: [],
    lastTime: performance.now(),
    mode: "assembled",
    rotation: 0,
  };
  const camera: CameraState = {
    hasUserControl: false,
    isDragging: false,
    lastPointerX: 0,
    lastPointerY: 0,
    rotationX: args.spinX,
    rotationY: args.spinY,
    zoom: options.zoom,
  };
  let animationFrame = 0;
  let autoExplodeAt = performance.now() + 1800;

  appendStyles(shell);
  grid.className = "ae-grid";
  stage.className = "ae-stage";
  controls.className = "ae-controls";
  values.className = "ae-values";
  canvas.width = 760;
  canvas.height = 420;
  canvas.style.cursor = "grab";
  canvas.style.touchAction = "none";
  stage.appendChild(canvas);
  values.append(blockValue, linkValue, stateValue);
  scenePanel.appendChild(stage);
  controlsPanel.append(values, controls);
  grid.append(scenePanel, controlsPanel);
  shell.appendChild(grid);

  const context = canvas.getContext("2d");

  if (!context) {
    return shell;
  }

  const assemble = (): void => {
    args.onAssemble();
    state.blocks = createBlocks(pattern, args);

    if (state.mode === "assembled") {
      state.explosion = [];
      state.mode = "assembled";
      autoExplodeAt = performance.now() + 1800;
      return;
    }

    state.explosion = createReassembleBlocks(state.explosion, state.blocks);
    state.mode = "reassembling";
  };

  const explode = (): void => {
    if (state.mode === "exploding") {
      return;
    }

    args.onExplode();
    state.explosion = createAnimatedExplosionBlocks(state.blocks, args);
    state.mode = "exploding";
  };

  controls.append(
    createButton("Assemble", assemble),
    createButton("Explode", explode),
    createButton("Reset View", () => {
      camera.hasUserControl = false;
      camera.rotationX = args.spinX;
      camera.rotationY = args.spinY;
      camera.zoom = options.zoom;
    })
  );

  const handlePointerDown = (event: PointerEvent): void => {
    camera.hasUserControl = true;
    camera.isDragging = true;
    camera.lastPointerX = event.clientX;
    camera.lastPointerY = event.clientY;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!camera.isDragging) {
      return;
    }

    const deltaX = event.clientX - camera.lastPointerX;
    const deltaY = event.clientY - camera.lastPointerY;

    camera.lastPointerX = event.clientX;
    camera.lastPointerY = event.clientY;
    camera.rotationY += deltaX * 0.01;
    camera.rotationX = Math.max(-1.2, Math.min(1.2, camera.rotationX + deltaY * 0.01));
  };

  const handlePointerUp = (event: PointerEvent): void => {
    camera.isDragging = false;
    canvas.style.cursor = "grab";

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    camera.hasUserControl = true;
    camera.zoom = Math.max(18, Math.min(64, camera.zoom * Math.exp(-event.deltaY * 0.0015)));
  };

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("wheel", handleWheel, { passive: false });

  const render = (now: number): void => {
    const delta = Math.min(0.05, (now - state.lastTime) / 1000);
    const shouldAutoExplode = Boolean(options.autoExplode && args.explosionLoop);

    state.lastTime = now;

    if (camera.hasUserControl) {
      state.rotation = 0;
    } else {
      state.rotation += delta * args.rotationSpeed;
      camera.rotationX = args.spinX;
      camera.rotationY = args.spinY + state.rotation;
    }

    if (shouldAutoExplode && state.mode === "assembled" && now > autoExplodeAt) {
      explode();
    }

    if (state.mode === "exploding") {
      state.explosion = stepAnimatedExplosionBlocks(state.explosion, delta, args).filter(
        (block) => block.opacity > 0
      );

      if (!state.explosion.length && options.autoExplode) {
        assemble();
      }
    }

    if (state.mode === "reassembling") {
      state.explosion = stepReassembleBlocks(state.explosion, delta);

      if (
        state.explosion.length > 0 &&
        state.explosion.every((block) => (block.reassembleAge ?? 0) >= (block.reassembleDuration ?? 0))
      ) {
        state.explosion = [];
        state.mode = "assembled";
        autoExplodeAt = performance.now() + 1800;
      }
    }

    const renderedBlocks = state.mode === "assembled" ? state.blocks : state.explosion;
    const links = createPlasmaLinks(renderedBlocks, args.linkDistance);

    setValue(blockValue, renderedBlocks.length);
    setValue(linkValue, links.length);
    setValue(stateValue, state.mode);
    drawScene(context, canvas, renderedBlocks, links, args, camera.rotationY, camera.rotationX, camera.zoom);
    animationFrame = window.requestAnimationFrame(render);
  };

  animationFrame = window.requestAnimationFrame(render);
  onRemove(shell, () => {
    window.cancelAnimationFrame(animationFrame);
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerUp);
    canvas.removeEventListener("wheel", handleWheel);
  });

  return shell;
};

export const DestructiblePickup: Story = {
  args: {
    ...defaultArgs,
    accentColor: "#f6e05e",
    blockColor: "#4fd1c5",
    explosionLoop: true,
    explosionForce: 5.5,
    gap: 0.14,
    linkDistance: 1.45,
    rotationSpeed: 0.58,
  },
  argTypes,
  render: (args) =>
    createDemo("3D destructible pickup", pickupPattern, args, {
      autoExplode: true,
      zoom: 38,
    }),
};

export const ModularLevelKit: Story = {
  args: {
    ...defaultArgs,
    accentColor: "#90cdf4",
    blockColor: "#9f7aea",
    explosionForce: 3.5,
    gap: 0.08,
    gravity: -0.4,
    linkDistance: 1.38,
    rotationSpeed: 0.24,
    spinX: -0.56,
    spinY: 0.74,
  },
  argTypes,
  render: (args) =>
    createDemo("3D modular level kit", platformPattern, args, {
      zoom: 30,
    }),
};
