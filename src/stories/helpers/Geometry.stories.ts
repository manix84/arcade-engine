import type { Meta, StoryObj } from "@storybook/html-vite";
import { helpers } from "../../index.js";
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

const visualHeadingTo = (target: { posX: number; posY: number }, origin?: { posX: number; posY: number }): number =>
  (helpers.findHeading(target, origin) + 180) % 360;

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
