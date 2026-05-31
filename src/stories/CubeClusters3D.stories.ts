import type { Meta, StoryObj } from "@storybook/html-vite";
import { fn } from "storybook/test";
import {
  centerCubeCluster,
  createCubeClusterFromPattern,
  createExplosionBlocks,
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
  explosionForce: number;
  plasmaColor: string;
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
  tumbleX: number;
  tumbleY: number;
  tumbleZ: number;
};

type Story = StoryObj<CubeClusterStoryArgs>;

const invaderPattern = [
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
    "           ",
    "  #     #  ",
    "   #####   ",
    "  #######  ",
    " ######### ",
    "  #######  ",
    "   #   #   ",
    "           ",
  ],
];

const visualCenterOffsetX = 1.7;

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

const createPlasmaData = (
  links: PlasmaLink[],
  blockById: Map<string, CubeBlock>,
  time = 0
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

    const amount = 0.045 + (1 - link.strength) * 0.045;
    const phase = time * 0.018 + index * 1.913;
    const wobble = {
      x: Math.sin(phase) * amount,
      y: Math.cos(phase * 1.37) * amount,
      z: Math.sin(phase * 0.73) * amount,
    };

    data.push(
      surface.from.x + wobble.x,
      surface.from.y + wobble.y,
      surface.from.z + wobble.z,
      surface.to.x - wobble.y,
      surface.to.y + wobble.x,
      surface.to.z - wobble.z
    );
  });

  return new Float32Array(data);
};

const getJitteredBlock = (block: CubeBlock, time: number, index: number): CubeBlock => {
  const pulse = time * 0.018;
  const amount = 0.035;

  return {
    ...block,
    x: block.x + Math.sin(pulse * 2.7 + index * 0.91) * amount,
    y: block.y + Math.cos(pulse * 3.1 + index * 1.17) * amount,
    z: block.z + Math.sin(pulse * 4.3 + index * 0.63) * amount,
  };
};

const createAnimatedExplosionBlocks = (
  blocks: CubeBlock[],
  force: number
): AnimatedBlock[] =>
  createExplosionBlocks(blocks, {
    force,
    spin: 0.32,
  }).map((block, index) => ({
    ...block,
    tumbleX: index * 0.37,
    tumbleY: index * 0.19,
    tumbleZ: index * 0.29,
  }));

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
  const cluster = createCubeClusterFromPattern(invaderPattern, {
    color: args.blockColor,
    depth: 0.65,
    gap: 0.18,
    layerGap: 0.18,
    size: 0.88,
  });
  const blocks = centerCubeCluster(cluster.blocks).map((block) => ({
    ...block,
    x: block.x + visualCenterOffsetX,
  }));
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  let lastFrameTime = performance.now();
  let animationFrame = 0;
  let explosionBlocks: AnimatedBlock[] = [];
  let isExploding = false;
  let cameraYaw = 0.08;
  let cameraPitch = -0.35;
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
  const cubeBuffer = gl.createBuffer();
  const edgeBuffer = gl.createBuffer();
  const lineBuffer = gl.createBuffer();

  if (!cubeBuffer || !edgeBuffer || !lineBuffer) {
    throw new Error("Unable to create WebGL buffers.");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, edgeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeEdges, gl.STATIC_DRAW);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  setValue(blockValue, blocks.length);
  setValue(linkValue, cluster.links.length);

  const assemble = (): void => {
    isExploding = false;
    explosionBlocks = [];
    setValue(statusValue, "assembled");
  };

  controls.append(
    createButton("Explode", () => {
      args.onExplode();
      explosionBlocks = createAnimatedExplosionBlocks(blocks, args.explosionForce);
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

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);

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

  const drawPlasma = (projection: Mat4, time: number): void => {
    const pulse = 0.48 + Math.sin(time / 39) * 0.28 + Math.sin(time / 11) * 0.12;
    const plasmaData = createPlasmaData(cluster.links, blockById, time);

    gl.useProgram(lineProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, plasmaData, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(lineProgram.attributes.aPosition);
    gl.vertexAttribPointer(lineProgram.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(lineProgram.uniforms.uProjection, false, projection);
    gl.uniform3fv(lineProgram.uniforms.uColor, parseColor(args.plasmaColor));
    gl.uniform1f(lineProgram.uniforms.uAlpha, Math.max(0.1, pulse));
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.lineWidth(2);
    gl.drawArrays(gl.LINES, 0, plasmaData.length / 3);
    gl.uniform3fv(lineProgram.uniforms.uColor, parseColor("#ffffff"));
    gl.uniform1f(lineProgram.uniforms.uAlpha, Math.max(0.06, pulse * 0.42));
    gl.lineWidth(1);
    gl.drawArrays(gl.LINES, 0, plasmaData.length / 3);
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
    const aspect = canvas.width / canvas.height;
    const viewProjection = multiply(
      perspective(48 * (Math.PI / 180), aspect, 0.1, 100),
      translate(0, 0, -23)
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
        fadeSpeed: 0.42,
        gravity: -0.14,
      }).map((block, index) => ({
        ...block,
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
      drawPlasma(projection, now);
      blocks.forEach((block, index) => {
        const jittered = getJitteredBlock(block, now, index);
        const twitch = multiply(
          multiply(rotateX(Math.sin(now / 80 + index) * 0.025), rotateY(Math.cos(now / 95 + index) * 0.03)),
          scale3(1, 1 + Math.sin(now / 70 + index * 0.3) * 0.015, 1)
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
    gl.deleteBuffer(cubeBuffer);
    gl.deleteBuffer(edgeBuffer);
    gl.deleteBuffer(lineBuffer);
    gl.deleteProgram(cubeProgram.program);
    gl.deleteProgram(lineProgram.program);
  });

  return shell;
};

export const VoxelInvader: Story = {
  args: {
    blockColor: "#4fd1c5",
    explosionForce: 7,
    plasmaColor: "#90cdf4",
    spinSpeed: 0.45,
    onAssemble: fn(),
    onExplode: fn(),
  },
  argTypes: {
    blockColor: { control: "color" },
    explosionForce: { control: { type: "range", min: 2, max: 14, step: 1 } },
    plasmaColor: { control: "color" },
    spinSpeed: { control: { type: "range", min: 0, max: 1.5, step: 0.05 } },
  },
  render: createClusterShell,
};
