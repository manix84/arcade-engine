import type { Meta, StoryObj } from "@storybook/html-vite";
import { fn } from "storybook/test";
import {
  centerCubeCluster,
  createCubeClusterFromPattern,
  createExplosionBlocks,
  createPlasmaLinks,
  getVisibleExplosionBlocks,
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
  blockColor: string;
  cubeSquash: number;
  cubeTwitch: number;
  cubeWiggle: number;
  explodeFadeMaxTime: number;
  explodeFadeMinTime: number;
  fadeMaxTime: number;
  fadeMinTime: number;
  explosionForce: number;
  plasmaCoreThickness: number;
  plasmaColor: string;
  plasmaGlow: number;
  plasmaThickness: number;
  plasmaWiggle: number;
  spinSpeed: number;
  onAssemble: () => void;
  onExplode: () => void;
};

type Mat4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

type ProgramInfo = {
  attributes: Record<string, number>;
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;
};

type AnimatedBlock = ExplosionBlock & {
  age: number;
  fadeDelay: number;
  fadeDuration: number;
  tumbleX: number;
  tumbleY: number;
  tumbleZ: number;
};

type FrameBlock = CubeBlock & {
  opacity: number;
};

type Story = StoryObj<CubeClusterStoryArgs>;

const invaderFrames = [
  [
    "  #     #  ",
    "   #   #   ",
    "  #######  ",
    " ## ### ## ",
    "###########",
    "# ####### #",
    "# #     # #",
    "   ## ##   ",
  ],
  [
    "  #     #  ",
    "   #   #   ",
    "# ####### #",
    "### ### ###",
    "###########",
    " ######### ",
    "  #     #  ",
    " #       # ",
  ],
];

const visualCenterOffsetX = 1.7;
const minCameraDistance = 2.4;
const maxCameraDistance = 28;
const frameHoldTime = 720;
const frameSlideTime = 360;
const defaultFadeMinTime = 90;
const defaultFadeMaxTime = 320;
const defaultExplodeFadeMinTime = 700;
const defaultExplodeFadeMaxTime = 2200;

const vertexShaderSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
uniform mat4 uProjection;
uniform mat4 uModel;
varying float vLight;

void main() {
  vec3 lightDirection = normalize(vec3(-0.45, 0.72, 0.55));
  vec3 normal = normalize(mat3(uModel) * aNormal);
  vLight = 0.38 + max(dot(normal, lightDirection), 0.0) * 0.62;
  gl_Position = uProjection * uModel * vec4(aPosition, 1.0);
}
`;

const fragmentShaderSource = `
precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;
uniform float uRim;
varying float vLight;

void main() {
  vec3 glass = mix(vec3(0.86, 0.97, 1.0), uColor, 0.48);
  vec3 rim = vec3(0.95, 1.0, 1.0) * uRim;
  gl_FragColor = vec4(glass * vLight + rim, uAlpha);
}
`;

const lineVertexShaderSource = `
attribute vec3 aPosition;
uniform mat4 uProjection;

void main() {
  gl_Position = uProjection * vec4(aPosition, 1.0);
}
`;

const lineFragmentShaderSource = `
precision mediump float;
uniform vec3 uColor;
uniform float uAlpha;

void main() {
  gl_FragColor = vec4(uColor, uAlpha);
}
`;

const plasmaVertexShaderSource = `
attribute vec3 aStart;
attribute vec3 aEnd;
attribute float aSide;
attribute float aAlong;
uniform mat4 uProjection;
uniform vec2 uViewport;
uniform float uThickness;

void main() {
  vec4 startClip = uProjection * vec4(aStart, 1.0);
  vec4 endClip = uProjection * vec4(aEnd, 1.0);
  vec2 startNdc = startClip.xy / startClip.w;
  vec2 endNdc = endClip.xy / endClip.w;
  vec2 direction = (endNdc - startNdc) * uViewport;
  float lengthPixels = max(length(direction), 0.001);
  vec2 normal = vec2(-direction.y, direction.x) / lengthPixels;
  vec4 clip = mix(startClip, endClip, aAlong);

  clip.xy += normal * aSide * uThickness * clip.w / uViewport;
  gl_Position = clip;
}
`;

const cubeData = new Float32Array([
  -0.5, -0.5, 0.5, 0, 0, 1, 0.5, -0.5, 0.5, 0, 0, 1, 0.5, 0.5, 0.5, 0, 0, 1,
  -0.5, -0.5, 0.5, 0, 0, 1, 0.5, 0.5, 0.5, 0, 0, 1, -0.5, 0.5, 0.5, 0, 0, 1,
  0.5, -0.5, -0.5, 0, 0, -1, -0.5, -0.5, -0.5, 0, 0, -1, -0.5, 0.5, -0.5, 0, 0, -1,
  0.5, -0.5, -0.5, 0, 0, -1, -0.5, 0.5, -0.5, 0, 0, -1, 0.5, 0.5, -0.5, 0, 0, -1,
  -0.5, -0.5, -0.5, -1, 0, 0, -0.5, -0.5, 0.5, -1, 0, 0, -0.5, 0.5, 0.5, -1, 0, 0,
  -0.5, -0.5, -0.5, -1, 0, 0, -0.5, 0.5, 0.5, -1, 0, 0, -0.5, 0.5, -0.5, -1, 0, 0,
  0.5, -0.5, 0.5, 1, 0, 0, 0.5, -0.5, -0.5, 1, 0, 0, 0.5, 0.5, -0.5, 1, 0, 0,
  0.5, -0.5, 0.5, 1, 0, 0, 0.5, 0.5, -0.5, 1, 0, 0, 0.5, 0.5, 0.5, 1, 0, 0,
  -0.5, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, -0.5, 0, 1, 0,
  -0.5, 0.5, 0.5, 0, 1, 0, 0.5, 0.5, -0.5, 0, 1, 0, -0.5, 0.5, -0.5, 0, 1, 0,
  -0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, 0.5, 0, -1, 0,
  -0.5, -0.5, -0.5, 0, -1, 0, 0.5, -0.5, 0.5, 0, -1, 0, -0.5, -0.5, 0.5, 0, -1, 0,
]);

const cubeEdges = new Float32Array([
  -0.5, -0.5, -0.5, 0.5, -0.5, -0.5,
  0.5, -0.5, -0.5, 0.5, 0.5, -0.5,
  0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
  -0.5, 0.5, -0.5, -0.5, -0.5, -0.5,
  -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
  0.5, -0.5, 0.5, 0.5, 0.5, 0.5,
  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
  -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,
  0.5, -0.5, -0.5, 0.5, -0.5, 0.5,
  0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
  -0.5, 0.5, -0.5, -0.5, 0.5, 0.5,
]);

const identity = (): Mat4 => [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

const multiply = (a: Mat4, b: Mat4): Mat4 => {
  const out = new Array<number>(16).fill(0) as Mat4;

  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      for (let i = 0; i < 4; i++) {
        out[column * 4 + row] += a[i * 4 + row] * b[column * 4 + i];
      }
    }
  }

  return out;
};

const translate = (x: number, y: number, z: number): Mat4 => [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  x, y, z, 1,
];

const scale = (value: number): Mat4 => [
  value, 0, 0, 0,
  0, value, 0, 0,
  0, 0, value, 0,
  0, 0, 0, 1,
];

const scale3 = (x: number, y: number, z: number): Mat4 => [
  x, 0, 0, 0,
  0, y, 0, 0,
  0, 0, z, 0,
  0, 0, 0, 1,
];

const rotateX = (radians: number): Mat4 => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);

  return [
    1, 0, 0, 0,
    0, c, s, 0,
    0, -s, c, 0,
    0, 0, 0, 1,
  ];
};

const rotateY = (radians: number): Mat4 => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);

  return [
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  ];
};

const rotateZ = (radians: number): Mat4 => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);

  return [
    c, s, 0, 0,
    -s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
};

const perspective = (fovRadians: number, aspect: number, near: number, far: number): Mat4 => {
  const f = 1 / Math.tan(fovRadians / 2);
  const range = 1 / (near - far);

  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * range, -1,
    0, 0, near * far * range * 2, 0,
  ];
};

const parseColor = (color: string): [number, number, number] => {
  const hex = color.replace("#", "");
  const value = Number.parseInt(hex.length === 3
    ? [...hex].map((character) => character + character).join("")
    : hex, 16);

  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
};

const createShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader => {
  const shader = gl.createShader(type);

  if (!shader) {
    throw new Error("Unable to create WebGL shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(String(gl.getShaderInfoLog(shader)));
  }

  return shader;
};

const createProgram = (
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string,
  attributes: string[],
  uniforms: string[]
): ProgramInfo => {
  const program = gl.createProgram();

  if (!program) {
    throw new Error("Unable to create WebGL program.");
  }

  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(String(gl.getProgramInfoLog(program)));
  }

  return {
    attributes: Object.fromEntries(attributes.map((name) => [name, gl.getAttribLocation(program, name)])),
    program,
    uniforms: Object.fromEntries(uniforms.map((name) => {
      const location = gl.getUniformLocation(program, name);

      if (!location) {
        throw new Error(`Unable to find WebGL uniform ${name}.`);
      }

      return [name, location];
    })),
  };
};

const smoothStep = (value: number): number => value * value * (3 - 2 * value);

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const getSeededUnit = (seed: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index++) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
};

const getStaggeredFadeProgress = (
  transitionProgress: number,
  id: string,
  transitionKey: string,
  minFadeTime: number,
  maxFadeTime: number
): number => {
  const minDuration = clamp(minFadeTime / frameSlideTime, 0.05, 1);
  const maxDuration = clamp(maxFadeTime / frameSlideTime, minDuration, 1);
  const durationSeed = getSeededUnit(`${transitionKey}:${id}:duration`);
  const startSeed = getSeededUnit(`${transitionKey}:${id}:start`);
  const duration = minDuration + (maxDuration - minDuration) * durationSeed;
  const start = (1 - duration) * startSeed;

  return smoothStep(clamp((transitionProgress - start) / duration, 0, 1));
};

const getBlockDistance = (a: CubeBlock, b: CubeBlock): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const findNearestBlock = (block: CubeBlock, blocks: CubeBlock[]): CubeBlock => {
  if (!blocks.length) {
    return block;
  }

  return blocks.reduce((nearest, candidate) =>
    getBlockDistance(block, candidate) < getBlockDistance(block, nearest) ? candidate : nearest
  );
};

const buildInvaderFrameBlocks = (): CubeBlock[][] =>
  invaderFrames.map((frame) =>
    centerCubeCluster(createCubeClusterFromPattern([frame], {
      depth: 0.65,
      gap: 0.18,
      layerGap: 0.18,
      size: 0.88,
    }).blocks).map((block) => ({
      ...block,
      color: undefined,
      id: block.id.replace(/^0:/, ""),
      x: block.x + visualCenterOffsetX,
    }))
  );

const createSlidingFrameBlocks = (
  fromBlocks: CubeBlock[],
  toBlocks: CubeBlock[],
  progress: number,
  color: string,
  transitionKey = "initial",
  minFadeTime = defaultFadeMinTime,
  maxFadeTime = defaultFadeMaxTime
): FrameBlock[] => {
  const eased = smoothStep(progress);
  const fromById = new Map(fromBlocks.map((block) => [block.id, block]));
  const toById = new Map(toBlocks.map((block) => [block.id, block]));
  const ids = new Set([...fromById.keys(), ...toById.keys()]);
  const blocks: FrameBlock[] = [];

  ids.forEach((id) => {
    const from = fromById.get(id);
    const to = toById.get(id);
    const start = from ?? findNearestBlock(to as CubeBlock, fromBlocks);
    const end = to ?? findNearestBlock(from as CubeBlock, toBlocks);
    const fadeProgress = from && to
      ? 1
      : getStaggeredFadeProgress(progress, id, transitionKey, minFadeTime, maxFadeTime);
    const opacity = from && to ? 1 : from ? 1 - fadeProgress : fadeProgress;

    blocks.push({
      color,
      id,
      opacity,
      size: (to ?? from)?.size,
      x: start.x + (end.x - start.x) * eased,
      y: start.y + (end.y - start.y) * eased,
      z: start.z + (end.z - start.z) * eased,
    });
  });

  return blocks.filter((block) => block.opacity > 0.02);
};

const getPlasmaSurfacePoints = (
  from: CubeBlock,
  to: CubeBlock
): { from: CubeBlock; to: CubeBlock } | null => {
  const delta = {
    x: to.x - from.x,
    y: to.y - from.y,
    z: to.z - from.z,
  };
  const distance = Math.hypot(delta.x, delta.y, delta.z);

  if (!distance) {
    return null;
  }

  const direction = {
    x: delta.x / distance,
    y: delta.y / distance,
    z: delta.z / distance,
  };
  const fromInset = (from.size ?? 1) / 2 + 0.02;
  const toInset = (to.size ?? 1) / 2 + 0.02;

  if (distance <= fromInset + toInset) {
    return null;
  }

  return {
    from: {
      ...from,
      x: from.x + direction.x * fromInset,
      y: from.y + direction.y * fromInset,
      z: from.z + direction.z * fromInset,
    },
    to: {
      ...to,
      x: to.x - direction.x * toInset,
      y: to.y - direction.y * toInset,
      z: to.z - direction.z * toInset,
    },
  };
};

const pushPlasmaRibbonVertex = (
  data: number[],
  from: CubeBlock,
  to: CubeBlock,
  side: number,
  along: number
): void => {
  data.push(from.x, from.y, from.z, to.x, to.y, to.z, side, along);
};

const createPlasmaRibbonData = (
  links: PlasmaLink[],
  blockById: Map<string, CubeBlock>,
  time = 0,
  wiggle = 0.045
): Float32Array => {
  const data: number[] = [];

  links.forEach((link, index) => {
    const from = blockById.get(link.from);
    const to = blockById.get(link.to);

    if (!from || !to) {
      return;
    }

    const surface = getPlasmaSurfacePoints(from, to);

    if (!surface) {
      return;
    }

    const amount = wiggle + (1 - link.strength) * wiggle;
    const phase = time * 0.018 + index * 1.913;
    const wobble = {
      x: Math.sin(phase) * amount,
      y: Math.cos(phase * 1.37) * amount,
      z: Math.sin(phase * 0.73) * amount,
    };

    const start = {
      ...surface.from,
      x: surface.from.x + wobble.x,
      y: surface.from.y + wobble.y,
      z: surface.from.z + wobble.z,
    };
    const end = {
      ...surface.to,
      x: surface.to.x - wobble.y,
      y: surface.to.y + wobble.x,
      z: surface.to.z - wobble.z,
    };

    pushPlasmaRibbonVertex(data, start, end, -1, 0);
    pushPlasmaRibbonVertex(data, start, end, 1, 0);
    pushPlasmaRibbonVertex(data, start, end, -1, 1);
    pushPlasmaRibbonVertex(data, start, end, -1, 1);
    pushPlasmaRibbonVertex(data, start, end, 1, 0);
    pushPlasmaRibbonVertex(data, start, end, 1, 1);
  });

  return new Float32Array(data);
};

const getJitteredBlock = (
  block: CubeBlock,
  time: number,
  index: number,
  amount: number
): CubeBlock => {
  const pulse = time * 0.018;

  return {
    ...block,
    x: block.x + Math.sin(pulse * 2.7 + index * 0.91) * amount,
    y: block.y + Math.cos(pulse * 3.1 + index * 1.17) * amount,
    z: block.z + Math.sin(pulse * 4.3 + index * 0.63) * amount,
  };
};

const createAnimatedExplosionBlocks = (
  blocks: CubeBlock[],
  force: number,
  minFadeTime = defaultExplodeFadeMinTime,
  maxFadeTime = defaultExplodeFadeMaxTime
): AnimatedBlock[] => {
  const fadeMin = Math.max(1, Math.min(minFadeTime, maxFadeTime));
  const fadeMax = Math.max(fadeMin, maxFadeTime);

  return createExplosionBlocks(blocks, {
    force,
    spin: 0.32,
  }).map((block, index) => ({
    ...block,
    age: 0,
    fadeDelay: getSeededUnit(`explode:${block.id}:delay`) *
      Math.max(0, (fadeMax - fadeMin) / 1000),
    fadeDuration: (
      fadeMin +
      (fadeMax - fadeMin) * getSeededUnit(`explode:${block.id}:duration`)
    ) / 1000,
    tumbleX: index * 0.37,
    tumbleY: index * 0.19,
    tumbleZ: index * 0.29,
  }));
};

const createClusterShell = (args: CubeClusterStoryArgs): HTMLElement => {
  const shell = createDemoShell("3D cube-cluster invader");
  const grid = document.createElement("div");
  const visualPanel = createPanel("Voxel Character");
  const controlsPanel = createPanel("Controls");
  const statePanel = createPanel("State");
  const stage = document.createElement("div");
  const canvas = document.createElement("canvas");
  const controls = document.createElement("div");
  const values = document.createElement("div");
  const statusValue = createValue("state", "assembled");
  const blockValue = createValue("blocks", "0");
  const linkValue = createValue("plasma links", "0");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  const frameBlocks = buildInvaderFrameBlocks();
  let renderedBlocks: FrameBlock[] = createSlidingFrameBlocks(
    frameBlocks[0],
    frameBlocks[1],
    0,
    args.blockColor,
    "0:1",
    args.fadeMinTime,
    args.fadeMaxTime
  );
  let lastFrameTime = performance.now();
  let animationFrame = 0;
  let explosionBlocks: AnimatedBlock[] = [];
  let isExploding = false;
  let cameraYaw = 0.08;
  let cameraPitch = -0.35;
  let cameraDistance = 23;
  let hasCameraControl = false;
  let isDraggingCamera = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  if (!gl) {
    throw new Error("WebGL is required for this story.");
  }

  appendStyles(shell);
  grid.className = "ae-grid";
  stage.className = "ae-stage";
  controls.className = "ae-controls";
  values.className = "ae-values";
  stage.style.aspectRatio = "760 / 520";
  stage.style.minHeight = "360px";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.cursor = "grab";
  canvas.style.touchAction = "none";

  const cubeProgram = createProgram(
    gl,
    vertexShaderSource,
    fragmentShaderSource,
    ["aPosition", "aNormal"],
    ["uProjection", "uModel", "uColor", "uAlpha", "uRim"]
  );
  const lineProgram = createProgram(
    gl,
    lineVertexShaderSource,
    lineFragmentShaderSource,
    ["aPosition"],
    ["uProjection", "uColor", "uAlpha"]
  );
  const plasmaProgram = createProgram(
    gl,
    plasmaVertexShaderSource,
    lineFragmentShaderSource,
    ["aStart", "aEnd", "aSide", "aAlong"],
    ["uProjection", "uViewport", "uThickness", "uColor", "uAlpha"]
  );
  const cubeBuffer = gl.createBuffer();
  const edgeBuffer = gl.createBuffer();
  const plasmaBuffer = gl.createBuffer();

  if (!cubeBuffer || !edgeBuffer || !plasmaBuffer) {
    throw new Error("Unable to create WebGL buffers.");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeEdges, gl.STATIC_DRAW);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  setValue(blockValue, renderedBlocks.length);
  setValue(linkValue, createPlasmaLinks(renderedBlocks).length);

  const assemble = (): void => {
    isExploding = false;
    explosionBlocks = [];
    setValue(statusValue, "assembled");
  };

  controls.append(
    createButton("Explode", () => {
      args.onExplode();
      explosionBlocks = createAnimatedExplosionBlocks(
        renderedBlocks,
        args.explosionForce,
        args.explodeFadeMinTime,
        args.explodeFadeMaxTime
      );
      isExploding = true;
      setValue(statusValue, "exploding");
    }),
    createButton("Assemble", () => {
      args.onAssemble();
      assemble();
    })
  );

  const handlePointerDown = (event: PointerEvent): void => {
    isDraggingCamera = true;
    hasCameraControl = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.style.cursor = "grabbing";
    canvas.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent): void => {
    if (!isDraggingCamera) {
      return;
    }

    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    cameraYaw += deltaX * 0.008;
    cameraPitch = Math.max(-1.05, Math.min(0.75, cameraPitch + deltaY * 0.008));
  };

  const handlePointerUp = (event: PointerEvent): void => {
    isDraggingCamera = false;
    canvas.style.cursor = "grab";

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    hasCameraControl = true;

    const zoomFactor = Math.exp(event.deltaY * 0.0015);

    cameraDistance = Math.max(
      minCameraDistance,
      Math.min(maxCameraDistance, cameraDistance * zoomFactor)
    );
  };

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("wheel", handleWheel, { passive: false });

  const drawCube = (
    block: CubeBlock | AnimatedBlock,
    projection: Mat4,
    tumble: Mat4 = identity()
  ): void => {
    const size = block.size ?? 1;
    const model = multiply(multiply(translate(block.x, block.y, block.z), tumble), scale(size));

    gl.useProgram(cubeProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.enableVertexAttribArray(cubeProgram.attributes.aPosition);
    gl.enableVertexAttribArray(cubeProgram.attributes.aNormal);
    gl.vertexAttribPointer(cubeProgram.attributes.aPosition, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(cubeProgram.attributes.aNormal, 3, gl.FLOAT, false, 24, 12);
    gl.uniformMatrix4fv(cubeProgram.uniforms.uProjection, false, projection);
    gl.uniformMatrix4fv(cubeProgram.uniforms.uModel, false, model);
    gl.uniform3fv(cubeProgram.uniforms.uColor, parseColor(block.color ?? args.blockColor));
    gl.uniform1f(cubeProgram.uniforms.uAlpha, "opacity" in block ? block.opacity * 0.38 : 0.38);
    gl.uniform1f(cubeProgram.uniforms.uRim, "opacity" in block ? block.opacity * 0.08 : 0.08);
    gl.depthMask(false);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, cubeData.length / 6);

    gl.useProgram(lineProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuffer);
    gl.enableVertexAttribArray(lineProgram.attributes.aPosition);
    gl.vertexAttribPointer(lineProgram.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(lineProgram.uniforms.uProjection, false, multiply(projection, model));
    gl.uniform3fv(lineProgram.uniforms.uColor, parseColor("#e7fbff"));
    gl.uniform1f(lineProgram.uniforms.uAlpha, "opacity" in block ? block.opacity * 0.34 : 0.34);
    gl.drawArrays(gl.LINES, 0, cubeEdges.length / 3);
    gl.depthMask(true);
  };

  const drawPlasma = (
    projection: Mat4,
    time: number,
    blocks: FrameBlock[]
  ): void => {
    const pulse = 0.48 + Math.sin(time / 39) * 0.28 + Math.sin(time / 11) * 0.12;
    const links = createPlasmaLinks(blocks);
    const blockById = new Map(blocks.map((block) => [block.id, block]));
    const plasmaData = createPlasmaRibbonData(links, blockById, time, args.plasmaWiggle);
    const stride = 32;

    gl.useProgram(plasmaProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, plasmaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, plasmaData, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(plasmaProgram.attributes.aStart);
    gl.enableVertexAttribArray(plasmaProgram.attributes.aEnd);
    gl.enableVertexAttribArray(plasmaProgram.attributes.aSide);
    gl.enableVertexAttribArray(plasmaProgram.attributes.aAlong);
    gl.vertexAttribPointer(plasmaProgram.attributes.aStart, 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(plasmaProgram.attributes.aEnd, 3, gl.FLOAT, false, stride, 12);
    gl.vertexAttribPointer(plasmaProgram.attributes.aSide, 1, gl.FLOAT, false, stride, 24);
    gl.vertexAttribPointer(plasmaProgram.attributes.aAlong, 1, gl.FLOAT, false, stride, 28);
    gl.uniformMatrix4fv(plasmaProgram.uniforms.uProjection, false, projection);
    gl.uniform2f(plasmaProgram.uniforms.uViewport, canvas.width, canvas.height);
    gl.uniform3fv(plasmaProgram.uniforms.uColor, parseColor(args.plasmaColor));
    gl.uniform1f(plasmaProgram.uniforms.uAlpha, Math.max(0.04, pulse * args.plasmaGlow));
    gl.uniform1f(plasmaProgram.uniforms.uThickness, args.plasmaThickness);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.drawArrays(gl.TRIANGLES, 0, plasmaData.length / 8);
    gl.uniform3fv(plasmaProgram.uniforms.uColor, parseColor("#ffffff"));
    gl.uniform1f(plasmaProgram.uniforms.uAlpha, Math.max(0.03, pulse * args.plasmaGlow * 0.36));
    gl.uniform1f(plasmaProgram.uniforms.uThickness, args.plasmaCoreThickness);
    gl.drawArrays(gl.TRIANGLES, 0, plasmaData.length / 8);
    setValue(linkValue, links.length);
  };

  const resizeCanvas = (): void => {
    const pixelRatio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.floor(bounds.width * pixelRatio));
    const nextHeight = Math.max(1, Math.floor(bounds.height * pixelRatio));

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }
  };

  const render = (): void => {
    resizeCanvas();

    const now = performance.now();
    const delta = Math.min(0.05, (now - lastFrameTime) / 1000);
    const frameCycleTime = frameHoldTime + frameSlideTime;
    const frameIndex = Math.floor(now / frameCycleTime) % frameBlocks.length;
    const nextFrameIndex = (frameIndex + 1) % frameBlocks.length;
    const framePhase = now % frameCycleTime;
    const frameProgress = framePhase < frameHoldTime
      ? 0
      : Math.min(1, (framePhase - frameHoldTime) / frameSlideTime);
    const aspect = canvas.width / canvas.height;
    const viewProjection = multiply(
      perspective(48 * (Math.PI / 180), aspect, 0.1, 100),
      translate(0, 0, -cameraDistance)
    );
    const cameraOrbit = multiply(
      multiply(rotateX(cameraPitch), rotateY(cameraYaw)),
      translate(-visualCenterOffsetX, 0, 0)
    );
    const projection = multiply(viewProjection, cameraOrbit);

    lastFrameTime = now;
    if (!hasCameraControl) {
      cameraYaw += args.spinSpeed * delta;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.02, 0.03, 0.04, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (isExploding) {
      explosionBlocks = stepExplosionBlocks(explosionBlocks, delta, {
        drag: 0.985,
        fadeSpeed: 0,
        gravity: -0.14,
      }).map((block, index) => ({
        ...block,
        age: (explosionBlocks[index]?.age ?? 0) + delta,
        fadeDelay: explosionBlocks[index]?.fadeDelay ?? 0,
        fadeDuration: explosionBlocks[index]?.fadeDuration ?? 1,
        opacity: 1 - clamp(
          (
            ((explosionBlocks[index]?.age ?? 0) + delta) -
            (explosionBlocks[index]?.fadeDelay ?? 0)
          ) / (explosionBlocks[index]?.fadeDuration ?? 1),
          0,
          1
        ),
        tumbleX: (explosionBlocks[index]?.tumbleX ?? 0) + delta * (1.8 + index * 0.07),
        tumbleY: (explosionBlocks[index]?.tumbleY ?? 0) - delta * (1.3 + index * 0.05),
        tumbleZ: (explosionBlocks[index]?.tumbleZ ?? 0) + delta * (1.1 + index * 0.03),
      }));
      explosionBlocks.forEach((block) => {
        if (block.opacity > 0) {
          const tumble = multiply(multiply(rotateX(block.tumbleX), rotateY(block.tumbleY)), rotateZ(block.tumbleZ));

          drawCube(block, projection, tumble);
        }
      });

      if (!getVisibleExplosionBlocks(explosionBlocks).length) {
        isExploding = false;
        setValue(statusValue, "vanished");
      }
    } else {
      renderedBlocks = createSlidingFrameBlocks(
        frameBlocks[frameIndex],
        frameBlocks[nextFrameIndex],
        frameProgress,
        args.blockColor,
        `${frameIndex}:${nextFrameIndex}`,
        args.fadeMinTime,
        args.fadeMaxTime
      );
      setValue(blockValue, renderedBlocks.length);
      drawPlasma(projection, now, renderedBlocks);
      renderedBlocks.forEach((block, index) => {
        const jittered = getJitteredBlock(block, now, index, args.cubeWiggle);
        const twitch = multiply(
          multiply(
            rotateX(Math.sin(now / 80 + index) * args.cubeTwitch),
            rotateY(Math.cos(now / 95 + index) * args.cubeTwitch * 1.2)
          ),
          scale3(1, 1 + Math.sin(now / 70 + index * 0.3) * args.cubeSquash, 1)
        );

        drawCube(jittered, projection, twitch);
      });
    }

    animationFrame = window.requestAnimationFrame(render);
  };

  stage.appendChild(canvas);
  values.append(statusValue, blockValue, linkValue);
  visualPanel.appendChild(stage);
  controlsPanel.appendChild(controls);
  statePanel.appendChild(values);
  grid.append(visualPanel, controlsPanel, statePanel);
  shell.appendChild(grid);
  render();

  onRemove(shell, () => {
    window.cancelAnimationFrame(animationFrame);
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerUp);
    canvas.removeEventListener("wheel", handleWheel);
    gl.deleteBuffer(cubeBuffer);
    gl.deleteBuffer(edgeBuffer);
    gl.deleteBuffer(plasmaBuffer);
    gl.deleteProgram(cubeProgram.program);
    gl.deleteProgram(lineProgram.program);
    gl.deleteProgram(plasmaProgram.program);
  });

  return shell;
};

export const VoxelInvader: Story = {
  args: {
    blockColor: "#4fd1c5",
    cubeSquash: 0.015,
    cubeTwitch: 0.025,
    cubeWiggle: 0.035,
    explodeFadeMaxTime: 550,
    explodeFadeMinTime: 100,
    fadeMaxTime: defaultFadeMaxTime,
    fadeMinTime: defaultFadeMinTime,
    explosionForce: 14,
    plasmaCoreThickness: 4,
    plasmaColor: "#90cdf4",
    plasmaGlow: 1.5,
    plasmaThickness: 2.2,
    plasmaWiggle: 0,
    spinSpeed: 0,
    onAssemble: fn(),
    onExplode: fn(),
  },
  argTypes: {
    blockColor: { control: "color" },
    cubeSquash: { control: { type: "range", min: 0, max: 0.05, step: 0.001 } },
    cubeTwitch: { control: { type: "range", min: 0, max: 0.08, step: 0.001 } },
    cubeWiggle: { control: { type: "range", min: 0, max: 0.12, step: 0.005 } },
    explodeFadeMaxTime: { control: { type: "range", min: 300, max: 4000, step: 50 } },
    explodeFadeMinTime: { control: { type: "range", min: 100, max: 3000, step: 50 } },
    fadeMaxTime: { control: { type: "range", min: 90, max: frameSlideTime, step: 10 } },
    fadeMinTime: { control: { type: "range", min: 20, max: frameSlideTime, step: 10 } },
    explosionForce: { control: { type: "range", min: 2, max: 14, step: 1 } },
    plasmaCoreThickness: { control: { type: "range", min: 0.2, max: 4, step: 0.1 } },
    plasmaColor: { control: "color" },
    plasmaGlow: { control: { type: "range", min: 0.1, max: 1.5, step: 0.05 } },
    plasmaThickness: { control: { type: "range", min: 0.5, max: 8, step: 0.1 } },
    plasmaWiggle: { control: { type: "range", min: 0, max: 0.16, step: 0.005 } },
    spinSpeed: { control: { type: "range", min: 0, max: 1.5, step: 0.05 } },
  },
  render: createClusterShell,
};
