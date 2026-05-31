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
varying float vLight;

void main() {
  gl_FragColor = vec4(uColor * vLight, uAlpha);
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

const createPlasmaData = (
  links: PlasmaLink[],
  blockById: Map<string, CubeBlock>
): Float32Array => {
  const data: number[] = [];

  links.forEach((link) => {
    const from = blockById.get(link.from);
    const to = blockById.get(link.to);

    if (!from || !to) {
      return;
    }

    data.push(from.x, from.y, from.z, to.x, to.y, to.z);
  });

  return new Float32Array(data);
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
  const cluster = createCubeClusterFromPattern(invaderPattern, {
    color: args.blockColor,
    depth: 0.65,
    gap: 0.18,
    layerGap: 0.18,
    size: 0.88,
  });
  const blocks = centerCubeCluster(cluster.blocks);
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  let lastFrameTime = performance.now();
  let animationFrame = 0;
  let explosionBlocks: ExplosionBlock[] = [];
  let isExploding = false;
  let rotationY = 0.45;

  if (!gl) {
    throw new Error("WebGL is required for this story.");
  }

  appendStyles(shell);
  grid.className = "ae-grid";
  stage.className = "ae-stage";
  controls.className = "ae-controls";
  values.className = "ae-values";
  stage.style.minHeight = "520px";
  canvas.width = 760 * (window.devicePixelRatio || 1);
  canvas.height = 520 * (window.devicePixelRatio || 1);
  canvas.style.width = "760px";
  canvas.style.height = "520px";

  const cubeProgram = createProgram(
    gl,
    vertexShaderSource,
    fragmentShaderSource,
    ["aPosition", "aNormal"],
    ["uProjection", "uModel", "uColor", "uAlpha"]
  );
  const lineProgram = createProgram(
    gl,
    lineVertexShaderSource,
    lineFragmentShaderSource,
    ["aPosition"],
    ["uProjection", "uColor", "uAlpha"]
  );
  const cubeBuffer = gl.createBuffer();
  const lineBuffer = gl.createBuffer();
  const plasmaData = createPlasmaData(cluster.links, blockById);

  if (!cubeBuffer || !lineBuffer) {
    throw new Error("Unable to create WebGL buffers.");
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cubeData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, plasmaData, gl.STATIC_DRAW);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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
      explosionBlocks = createExplosionBlocks(blocks, {
        force: args.explosionForce,
        spin: 0.28,
      });
      isExploding = true;
      setValue(statusValue, "exploding");
    }),
    createButton("Assemble", () => {
      args.onAssemble();
      assemble();
    })
  );

  const drawCube = (block: CubeBlock | ExplosionBlock, projection: Mat4): void => {
    const size = block.size ?? 1;
    const model = multiply(multiply(translate(block.x, block.y, block.z), scale(size)), identity());

    gl.useProgram(cubeProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.enableVertexAttribArray(cubeProgram.attributes.aPosition);
    gl.enableVertexAttribArray(cubeProgram.attributes.aNormal);
    gl.vertexAttribPointer(cubeProgram.attributes.aPosition, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(cubeProgram.attributes.aNormal, 3, gl.FLOAT, false, 24, 12);
    gl.uniformMatrix4fv(cubeProgram.uniforms.uProjection, false, projection);
    gl.uniformMatrix4fv(cubeProgram.uniforms.uModel, false, model);
    gl.uniform3fv(cubeProgram.uniforms.uColor, parseColor(block.color ?? args.blockColor));
    gl.uniform1f(cubeProgram.uniforms.uAlpha, "opacity" in block ? block.opacity : 1);
    gl.drawArrays(gl.TRIANGLES, 0, cubeData.length / 6);
  };

  const drawPlasma = (projection: Mat4): void => {
    const pulse = 0.55 + Math.sin(performance.now() / 95) * 0.24;

    gl.useProgram(lineProgram.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.enableVertexAttribArray(lineProgram.attributes.aPosition);
    gl.vertexAttribPointer(lineProgram.attributes.aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(lineProgram.uniforms.uProjection, false, projection);
    gl.uniform3fv(lineProgram.uniforms.uColor, parseColor(args.plasmaColor));
    gl.uniform1f(lineProgram.uniforms.uAlpha, Math.max(0.18, pulse));
    gl.lineWidth(1);
    gl.drawArrays(gl.LINES, 0, plasmaData.length / 3);
  };

  const render = (): void => {
    const now = performance.now();
    const delta = Math.min(0.05, (now - lastFrameTime) / 1000);
    const aspect = canvas.width / canvas.height;
    const viewProjection = multiply(
      perspective(48 * (Math.PI / 180), aspect, 0.1, 100),
      translate(0, 0, -23)
    );
    const projection = multiply(viewProjection, multiply(rotateX(-0.35), rotateY(rotationY)));

    lastFrameTime = now;
    rotationY += args.spinSpeed * delta;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.02, 0.03, 0.04, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (isExploding) {
      explosionBlocks = stepExplosionBlocks(explosionBlocks, delta, {
        drag: 0.985,
        fadeSpeed: 0.42,
        gravity: -0.14,
      });
      explosionBlocks.forEach((block) => {
        if (block.opacity > 0) {
          drawCube(block, projection);
        }
      });

      if (!getVisibleExplosionBlocks(explosionBlocks).length) {
        isExploding = false;
        setValue(statusValue, "vanished");
      }
    } else {
      drawPlasma(projection);
      blocks.forEach((block) => drawCube(block, projection));
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
    gl.deleteBuffer(cubeBuffer);
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
