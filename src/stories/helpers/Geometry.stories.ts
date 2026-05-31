import type { Meta, StoryObj } from "@storybook/html-vite";
import { helpers } from "../../index.js";
import {
  appendStyles,
  createDemoShell,
  createPanel,
  createValue,
  onRemove,
  setValue,
} from "../story-utils.js";

const meta = {
  title: "Engine/Helpers/Geometry",
} satisfies Meta;

export default meta;

type Story = StoryObj;

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

export const FindHeading: Story = {
  render: () =>
    createGeometryShell("helpers.findHeading", (context, canvas, frame, values) => {
      const target = {
        posX: Math.sin(frame / 45) * 190,
        posY: Math.cos(frame / 37) * 120,
      };
      const heading = helpers.findHeading(target);

      drawGrid(context, canvas);
      context.strokeStyle = "#f6e05e";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(target.posX, target.posY);
      context.stroke();
      context.fillStyle = "#4fd1c5";
      context.beginPath();
      context.arc(target.posX, target.posY, 14, 0, Math.PI * 2);
      context.fill();
      context.restore();
      values.replaceChildren(
        createValue("target", `${helpers.float(target.posX)}, ${helpers.float(target.posY)}`),
        createValue("heading", helpers.float(heading))
      );
    }),
};

export const RotateTo: Story = {
  render: () =>
    createGeometryShell("helpers.rotateTo", (context, canvas, frame, values) => {
      const destination = (frame * 1.8) % 360;
      const current = helpers.rotateTo(destination, (frame * 0.9 + 190) % 360, 18);
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
      context.restore();
      values.replaceChildren(
        createValue("destination", helpers.float(destination)),
        createValue("current step", helpers.float(current)),
        createValue("step size", 18)
      );
    }),
};

export const SpawnArc: Story = {
  render: () =>
    createGeometryShell("helpers.getSpawnCoords", (context, canvas, frame, values) => {
      const target = {
        heading: (frame * 1.2) % 360,
        posX: Math.sin(frame / 65) * 60,
        posY: Math.cos(frame / 53) * 50,
      };
      const points = Array.from({ length: 16 }, () =>
        helpers.getSpawnCoords(target, { spawnArc: 95, spawnRadius: 145 })
      );

      drawGrid(context, canvas);
      context.fillStyle = "#f6e05e";
      context.beginPath();
      context.arc(target.posX, target.posY, 16, 0, Math.PI * 2);
      context.fill();

      points.forEach((point) => {
        context.fillStyle = "rgba(79, 209, 197, 0.72)";
        context.beginPath();
        context.arc(point.posX, point.posY, 5, 0, Math.PI * 2);
        context.fill();
      });

      context.restore();
      values.replaceChildren(
        createValue("heading", helpers.float(target.heading)),
        createValue("spawn arc", "95°"),
        createValue("spawn radius", 145)
      );
    }),
};

export const CollisionAndAreaExit: Story = {
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
      context.fillStyle = isColliding
        ? "rgba(252, 129, 129, 0.30)"
        : "rgba(246, 224, 94, 0.22)";
      context.strokeStyle = isColliding ? "#fc8181" : "#f6e05e";
      context.beginPath();
      context.arc(target.posX, target.posY, target.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();
      values.replaceChildren(
        createValue("collision", String(isColliding)),
        createValue("area exit", String(hasExited)),
        createValue("exit radius", 135)
      );
    }),
};
