import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  colorWithAlpha,
  drawCanvasLine,
  drawCanvasPolygon,
  getDepthProgress,
  getLoopedDepth,
  helpers,
  projectPerspectivePoint,
} from "../../index.js";
import {
  appendStyles,
  createDemoShell,
  createPanel,
  createValue,
  drawTargetMarker,
  drawTopDownShip,
  onRemove,
  setValue,
} from "../story-utils.js";

const meta = {
  title: "Engine/Helpers/Geometry",
} satisfies Meta;

export default meta;

type FindHeadingArgs = {
  targetSpeedX: number;
  targetSpeedY: number;
  targetRadiusX: number;
  targetRadiusY: number;
};

type BaseStory = StoryObj;
type FindHeadingStory = StoryObj<FindHeadingArgs>;
type RotateToStory = StoryObj<RotateToArgs>;
type SpawnArcStory = StoryObj<SpawnArcArgs>;

type RotateToArgs = {
  currentSpeed: number;
  destinationSpeed: number;
  stepSize: number;
};

type SpawnArcArgs = {
  sampleCount: number;
  showSamples: boolean;
  spawnArc: number;
  spawnRadius: number;
};

type ProjectedPoint = {
  scale: number;
  x: number;
  y: number;
};

const visualHeadingTo = (target: { posX: number; posY: number }, origin?: { posX: number; posY: number }): number =>
  (helpers.findHeading(target, origin) + 180) % 360;

const projectDepthPoint = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  z: number,
  options: { centerX?: number; horizon?: number } = {}
): ProjectedPoint =>
  projectPerspectivePoint(
    { x, y, z },
    { height: canvas.height, width: canvas.width },
    {
      centerX: options.centerX ?? canvas.width / 2,
      horizon: options.horizon ?? canvas.height * 0.5,
    }
  );

const drawDepthGrid = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  horizon: number,
  centerX = canvas.width / 2
): void => {
  context.fillStyle = "#05070a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = colorWithAlpha("#4fd1c5", 0.06);
  context.fillRect(0, 0, canvas.width, horizon);
  context.fillStyle = colorWithAlpha("#f6e05e", 0.05);
  context.fillRect(0, horizon, canvas.width, canvas.height - horizon);

  for (let lane = -3; lane <= 3; lane++) {
    drawCanvasLine(
      context,
      projectDepthPoint(canvas, lane * 52, 160, 28, { centerX, horizon }),
      projectDepthPoint(canvas, lane * 170, 230, 1.1, { centerX, horizon }),
      colorWithAlpha(lane === 0 ? "#f6e05e" : "#4fd1c5", lane === 0 ? 0.34 : 0.18)
    );
  }

  for (let index = 0; index < 16; index++) {
    const z = 1 + index * 1.8;
    const progress = getDepthProgress(z, 30);

    drawCanvasLine(
      context,
      projectDepthPoint(canvas, -260, 210, z, { centerX, horizon }),
      projectDepthPoint(canvas, 260, 210, z, { centerX, horizon }),
      colorWithAlpha("#90cdf4", 0.06 + progress * 0.28),
      Math.max(1, progress * 3)
    );
  }
};

const drawDepthMarker = (
  context: CanvasRenderingContext2D,
  point: ProjectedPoint,
  color: string,
  label: string
): void => {
  const radius = Math.max(5, point.scale * 26);

  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fillStyle = colorWithAlpha(color, 0.24 + point.scale * 0.3);
  context.fill();
  context.strokeStyle = colorWithAlpha("#ffffff", 0.32);
  context.stroke();
  context.fillStyle = "#f5f7fb";
  context.font = "12px sans-serif";
  context.fillText(label, point.x + radius + 4, point.y - radius);
};

const createGeometryShell = (
  title: string,
  draw: (
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    frame: number,
    values: HTMLElement
  ) => void
): HTMLElement => {
  const shell = createDemoShell(title);
  const grid = document.createElement("div");
  const panel = createPanel("Canvas");
  const valuesPanel = createPanel("Values");
  const stage = document.createElement("div");
  const values = document.createElement("div");
  const canvas = document.createElement("canvas");
  let animationFrame = 0;
  let frame = 0;

  appendStyles(shell);
  grid.className = "ae-grid";
  stage.className = "ae-stage";
  values.className = "ae-values";
  canvas.width = 700;
  canvas.height = 420;

  stage.appendChild(canvas);
  panel.appendChild(stage);
  valuesPanel.appendChild(values);
  grid.append(panel, valuesPanel);
  shell.appendChild(grid);

  const animate = (): void => {
    const context = canvas.getContext("2d");

    if (context) {
      draw(context, canvas, frame++, values);
    }

    animationFrame = window.requestAnimationFrame(animate);
  };

  animate();
  onRemove(shell, () => window.cancelAnimationFrame(animationFrame));

  return shell;
};

const drawGrid = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
  context.fillStyle = "#05070a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.strokeStyle = "rgba(245, 247, 251, 0.10)";

  for (let x = -canvas.width / 2; x <= canvas.width / 2; x += 40) {
    context.beginPath();
    context.moveTo(x, -canvas.height / 2);
    context.lineTo(x, canvas.height / 2);
    context.stroke();
  }

  for (let y = -canvas.height / 2; y <= canvas.height / 2; y += 40) {
    context.beginPath();
    context.moveTo(-canvas.width / 2, y);
    context.lineTo(canvas.width / 2, y);
    context.stroke();
  }
};

export const FindHeading: FindHeadingStory = {
  args: {
    targetRadiusX: 190,
    targetRadiusY: 120,
    targetSpeedX: 45,
    targetSpeedY: 37,
  },
  argTypes: {
    targetRadiusX: { control: { type: "range", min: 40, max: 260, step: 5 } },
    targetRadiusY: { control: { type: "range", min: 40, max: 200, step: 5 } },
    targetSpeedX: { control: { type: "range", min: 18, max: 100, step: 1 } },
    targetSpeedY: { control: { type: "range", min: 18, max: 100, step: 1 } },
  },
  render: (args: FindHeadingArgs) =>
    createGeometryShell("helpers.findHeading", (context, canvas, frame, values) => {
      const target = {
        posX: Math.sin(frame / args.targetSpeedX) * args.targetRadiusX,
        posY: Math.cos(frame / args.targetSpeedY) * args.targetRadiusY,
      };
      const heading = helpers.findHeading(target);
      const visualHeading = visualHeadingTo(target);

      drawGrid(context, canvas);
      context.strokeStyle = "#f6e05e";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(target.posX, target.posY);
      context.stroke();
      drawTopDownShip(context, 0, 0, {
        accent: "#4fd1c5",
        heading: visualHeading,
        label: "ship",
        scale: 0.82,
        thrust: 0.35,
      });
      drawTargetMarker(context, target.posX, target.posY, {
        color: "#f6e05e",
        label: "target",
        radius: 20,
      });
      context.restore();
      values.replaceChildren(
        createValue("target", `${helpers.float(target.posX)}, ${helpers.float(target.posY)}`),
        createValue("heading", helpers.float(heading))
      );
    }),
};

export const RotateTo: RotateToStory = {
  args: {
    currentSpeed: 0.9,
    destinationSpeed: 1.8,
    stepSize: 18,
  },
  argTypes: {
    currentSpeed: { control: { type: "range", min: 0.2, max: 4, step: 0.1 } },
    destinationSpeed: { control: { type: "range", min: 0.2, max: 5, step: 0.1 } },
    stepSize: { control: { type: "range", min: 1, max: 45, step: 1 } },
  },
  render: (args: RotateToArgs) =>
    createGeometryShell("helpers.rotateTo", (context, canvas, frame, values) => {
      const destination = (frame * args.destinationSpeed) % 360;
      const current = helpers.rotateTo(
        destination,
        (frame * args.currentSpeed + 190) % 360,
        args.stepSize
      );
      const toPoint = (heading: number, length: number) => ({
        x: Math.sin(heading * (Math.PI / 180)) * length,
        y: -Math.cos(heading * (Math.PI / 180)) * length,
      });
      const destinationPoint = toPoint(destination, 145);
      const currentPoint = toPoint(current, 105);

      drawGrid(context, canvas);
      context.strokeStyle = "#fc8181";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(destinationPoint.x, destinationPoint.y);
      context.stroke();
      context.strokeStyle = "#4fd1c5";
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(currentPoint.x, currentPoint.y);
      context.stroke();
      drawTopDownShip(context, 0, 0, {
        accent: "#4fd1c5",
        heading: current,
        label: "current turn",
        scale: 0.82,
        thrust: 0.25,
      });
      drawTargetMarker(context, destinationPoint.x, destinationPoint.y, {
        color: "#fc8181",
        label: "desired",
        radius: 18,
      });
      context.restore();
      values.replaceChildren(
        createValue("destination", helpers.float(destination)),
        createValue("current step", helpers.float(current)),
        createValue("step size", args.stepSize)
      );
    }),
};

export const SpawnArc: SpawnArcStory = {
  args: {
    sampleCount: 12,
    showSamples: true,
    spawnArc: 95,
    spawnRadius: 145,
  },
  argTypes: {
    sampleCount: { control: { type: "range", min: 0, max: 40, step: 1 } },
    showSamples: { control: "boolean" },
    spawnArc: { control: { type: "range", min: 20, max: 180, step: 5 } },
    spawnRadius: { control: { type: "range", min: 70, max: 230, step: 5 } },
  },
  render: (args: SpawnArcArgs) =>
    createGeometryShell("helpers.getSpawnCoords", (context, canvas, frame, values) => {
      const spawnArc = args.spawnArc;
      const spawnRadius = args.spawnRadius;
      const arcInnerRadius = spawnRadius - 22;
      const arcOuterRadius = spawnRadius + 22;
      const target = {
        heading: (frame * 1.2) % 360,
        posX: Math.sin(frame / 65) * 60,
        posY: Math.cos(frame / 53) * 50,
      };
      const points = args.showSamples
        ? Array.from({ length: args.sampleCount }, () =>
            helpers.getSpawnCoords(target, { spawnArc, spawnRadius })
          )
        : [];
      const arcStart = (target.heading - spawnArc / 2 - 90) * (Math.PI / 180);
      const arcEnd = (target.heading + spawnArc / 2 - 90) * (Math.PI / 180);

      drawGrid(context, canvas);
      context.save();
      context.translate(target.posX, target.posY);
      context.fillStyle = "rgba(79, 209, 197, 0.12)";
      context.strokeStyle = "rgba(79, 209, 197, 0.72)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, arcOuterRadius, arcStart, arcEnd);
      context.arc(0, 0, arcInnerRadius, arcEnd, arcStart, true);
      context.closePath();
      context.fill();
      context.stroke();
      context.strokeStyle = "rgba(246, 224, 94, 0.8)";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, 0, spawnRadius, arcStart, arcEnd);
      context.stroke();
      context.restore();

      drawTopDownShip(context, target.posX, target.posY, {
        accent: "#f6e05e",
        heading: target.heading,
        label: "spawner",
        scale: 0.72,
        thrust: 0.35,
      });

      points.forEach((point, index) => {
        const pulse = 0.5 + Math.sin(frame / 12 + index) * 0.35;

        context.fillStyle = `rgba(245, 247, 251, ${0.55 + pulse * 0.35})`;
        context.beginPath();
        context.arc(point.posX, point.posY, 3 + pulse * 2, 0, Math.PI * 2);
        context.fill();
      });

      context.restore();
      values.replaceChildren(
        createValue("heading", helpers.float(target.heading)),
        createValue("spawn arc", `${spawnArc}°`),
        createValue("spawn radius", spawnRadius),
        createValue("samples", points.length)
      );
    }),
};

export const CollisionAndAreaExit: BaseStory = {
  render: () =>
    createGeometryShell("helpers.detectCollision / detectAreaExit", (context, canvas, frame, values) => {
      const origin = { posX: 0, posY: 0, radius: 52 };
      const target = {
        posX: Math.sin(frame / 36) * 160,
        posY: Math.cos(frame / 49) * 115,
        radius: 30,
      };
      const isColliding = helpers.detectCollision(target, origin);
      const hasExited = helpers.detectAreaExit(origin, target, 135);

      drawGrid(context, canvas);
      context.strokeStyle = hasExited ? "#fc8181" : "#243241";
      context.beginPath();
      context.arc(0, 0, 135, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "rgba(79, 209, 197, 0.18)";
      context.strokeStyle = "#4fd1c5";
      context.beginPath();
      context.arc(origin.posX, origin.posY, origin.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      drawTopDownShip(context, origin.posX, origin.posY, {
        accent: "#4fd1c5",
        heading: (frame * 1.2) % 360,
        label: "player",
        scale: 0.82,
        thrust: 0.25,
      });
      context.fillStyle = isColliding
        ? "rgba(252, 129, 129, 0.30)"
        : "rgba(246, 224, 94, 0.22)";
      context.strokeStyle = isColliding ? "#fc8181" : "#f6e05e";
      context.beginPath();
      context.arc(target.posX, target.posY, target.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      drawTopDownShip(context, target.posX, target.posY, {
        accent: isColliding ? "#fc8181" : "#f6e05e",
        heading: visualHeadingTo(origin, target),
        label: "enemy",
        scale: 0.62,
      });
      context.restore();
      values.replaceChildren(
        createValue("collision", String(isColliding)),
        createValue("area exit", String(hasExited)),
        createValue("exit radius", 135)
      );
    }),
};

export const FindHeadingDepth: FindHeadingStory = {
  args: FindHeading.args,
  argTypes: FindHeading.argTypes,
  render: (args: FindHeadingArgs) =>
    createGeometryShell("helpers.findHeading in 2.5D and 3D", (context, canvas, frame, values) => {
      const horizon = canvas.height * 0.48;
      const target = {
        posX: Math.sin(frame / args.targetSpeedX) * args.targetRadiusX,
        posY: Math.cos(frame / args.targetSpeedY) * args.targetRadiusY,
      };
      const depth = 5 + Math.abs(Math.sin(frame / 58)) * 18;
      const heading = helpers.findHeading(target);
      const originPoint = projectDepthPoint(canvas, 0, 170, 7, { horizon });
      const target2_5D = projectDepthPoint(canvas, target.posX, 170, depth, { horizon });
      const target3D = projectDepthPoint(canvas, target.posX, target.posY * 0.8, depth, {
        centerX: canvas.width * 0.72,
        horizon,
      });

      drawDepthGrid(context, canvas, horizon);
      drawCanvasLine(context, originPoint, target2_5D, colorWithAlpha("#f6e05e", 0.82), 3);
      drawCanvasLine(context, projectDepthPoint(canvas, 0, 0, 7, { centerX: canvas.width * 0.72, horizon }), target3D, colorWithAlpha("#fc8181", 0.82), 3);
      drawDepthMarker(context, originPoint, "#4fd1c5", "2.5D origin");
      drawDepthMarker(context, target2_5D, "#f6e05e", "2.5D target");
      drawDepthMarker(context, target3D, "#fc8181", "3D target");
      values.replaceChildren(
        createValue("findHeading", helpers.float(heading)),
        createValue("target depth", depth.toFixed(2)),
        createValue("2.5D", "x + depth"),
        createValue("3D", "x + y + depth")
      );
    }),
};

export const RotateToDepth: RotateToStory = {
  args: RotateTo.args,
  argTypes: RotateTo.argTypes,
  render: (args: RotateToArgs) =>
    createGeometryShell("helpers.rotateTo in 2.5D and 3D", (context, canvas, frame, values) => {
      const horizon = canvas.height * 0.5;
      const destination = (frame * args.destinationSpeed) % 360;
      const current = helpers.rotateTo(
        destination,
        (frame * args.currentSpeed + 190) % 360,
        args.stepSize
      );
      const toPoint = (heading: number, length: number, depth: number, centerX = canvas.width / 2) =>
        projectDepthPoint(
          canvas,
          Math.sin(heading * (Math.PI / 180)) * length,
          -Math.cos(heading * (Math.PI / 180)) * length,
          depth,
          { centerX, horizon }
        );
      const desired = toPoint(destination, 160, 12);
      const turned = toPoint(current, 122, 7);
      const desired3D = toPoint(destination, 150, 18, canvas.width * 0.72);
      const turned3D = toPoint(current, 120, 10, canvas.width * 0.72);

      drawDepthGrid(context, canvas, horizon);
      drawCanvasLine(context, projectDepthPoint(canvas, 0, 180, 5, { horizon }), desired, "#fc8181", 3);
      drawCanvasLine(context, projectDepthPoint(canvas, 0, 180, 5, { horizon }), turned, "#4fd1c5", 4);
      drawCanvasLine(context, projectDepthPoint(canvas, 0, 0, 5, { centerX: canvas.width * 0.72, horizon }), desired3D, colorWithAlpha("#fc8181", 0.76), 3);
      drawCanvasLine(context, projectDepthPoint(canvas, 0, 0, 5, { centerX: canvas.width * 0.72, horizon }), turned3D, colorWithAlpha("#4fd1c5", 0.9), 4);
      drawDepthMarker(context, desired, "#fc8181", "2.5D desired");
      drawDepthMarker(context, turned, "#4fd1c5", "2.5D current");
      drawDepthMarker(context, desired3D, "#fc8181", "3D desired");
      drawDepthMarker(context, turned3D, "#4fd1c5", "3D current");
      values.replaceChildren(
        createValue("destination", helpers.float(destination)),
        createValue("current step", helpers.float(current)),
        createValue("step size", args.stepSize)
      );
    }),
};

export const SpawnArcDepth: SpawnArcStory = {
  args: SpawnArc.args,
  argTypes: SpawnArc.argTypes,
  render: (args: SpawnArcArgs) =>
    createGeometryShell("helpers.getSpawnCoords in 2.5D and 3D", (context, canvas, frame, values) => {
      const horizon = canvas.height * 0.5;
      const target = {
        heading: (frame * 1.2) % 360,
        posX: Math.sin(frame / 65) * 60,
        posY: Math.cos(frame / 53) * 50,
      };
      const points = args.showSamples
        ? Array.from({ length: args.sampleCount }, () =>
            helpers.getSpawnCoords(target, {
              spawnArc: args.spawnArc,
              spawnRadius: args.spawnRadius,
            })
          )
        : [];

      drawDepthGrid(context, canvas, horizon);
      drawDepthMarker(context, projectDepthPoint(canvas, target.posX, 170, 7, { horizon }), "#f6e05e", "2.5D spawner");
      drawDepthMarker(context, projectDepthPoint(canvas, target.posX, target.posY, 7, { centerX: canvas.width * 0.72, horizon }), "#f6e05e", "3D spawner");

      points.forEach((point, index) => {
        const depth = getLoopedDepth({
          depth: 24,
          elapsedSeconds: frame / 60,
          index,
          offset: 4,
          spacing: 1.8,
          speed: 0.3,
        });

        drawDepthMarker(context, projectDepthPoint(canvas, point.posX, 180, depth, { horizon }), "#90cdf4", "");
        drawDepthMarker(context, projectDepthPoint(canvas, point.posX, point.posY, depth, { centerX: canvas.width * 0.72, horizon }), "#4fd1c5", "");
      });

      values.replaceChildren(
        createValue("heading", helpers.float(target.heading)),
        createValue("spawn arc", `${args.spawnArc}°`),
        createValue("spawn radius", args.spawnRadius),
        createValue("samples", points.length)
      );
    }),
};

export const CollisionAndAreaExitDepth: BaseStory = {
  render: () =>
    createGeometryShell("helpers.detectCollision / detectAreaExit in depth", (context, canvas, frame, values) => {
      const horizon = canvas.height * 0.5;
      const origin = { posX: 0, posY: 0, radius: 52 };
      const target = {
        posX: Math.sin(frame / 36) * 160,
        posY: Math.cos(frame / 49) * 115,
        radius: 30,
      };
      const depth = 6 + Math.abs(Math.cos(frame / 54)) * 18;
      const isColliding = helpers.detectCollision(target, origin);
      const hasExited = helpers.detectAreaExit(origin, target, 135);
      const origin2_5D = projectDepthPoint(canvas, origin.posX, 170, 7, { horizon });
      const target2_5D = projectDepthPoint(canvas, target.posX, 170, depth, { horizon });
      const origin3D = projectDepthPoint(canvas, origin.posX, origin.posY, 7, { centerX: canvas.width * 0.72, horizon });
      const target3D = projectDepthPoint(canvas, target.posX, target.posY, depth, { centerX: canvas.width * 0.72, horizon });

      drawDepthGrid(context, canvas, horizon);
      drawCanvasLine(context, origin2_5D, target2_5D, isColliding ? "#fc8181" : "#f6e05e", 3);
      drawCanvasLine(context, origin3D, target3D, hasExited ? "#fc8181" : "#4fd1c5", 3);
      drawDepthMarker(context, origin2_5D, "#4fd1c5", "2.5D player");
      drawDepthMarker(context, target2_5D, isColliding ? "#fc8181" : "#f6e05e", "2.5D enemy");
      drawDepthMarker(context, origin3D, "#4fd1c5", "3D player");
      drawDepthMarker(context, target3D, hasExited ? "#fc8181" : "#f6e05e", "3D enemy");
      values.replaceChildren(
        createValue("collision", String(isColliding)),
        createValue("area exit", String(hasExited)),
        createValue("target depth", depth.toFixed(2))
      );
    }),
};
