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
  title: "Engine/Helpers/Math",
} satisfies Meta;

export default meta;

type Story = StoryObj;

const createCanvasStory = (
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
  const panel = createPanel("Live Demo");
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
  canvas.width = 680;
  canvas.height = 380;

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

export const FloatCleanup: Story = {
  render: () =>
    createCanvasStory("helpers.float", (context, canvas, frame, values) => {
      const raw = Math.sin(frame / 23) * Math.PI * 100;
      const cleaned = helpers.float(raw);

      values.replaceChildren(
        createValue("raw", raw.toString()),
        createValue("float", cleaned.toString())
      );

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#243241";
      context.beginPath();
      context.moveTo(40, canvas.height / 2);
      context.lineTo(canvas.width - 40, canvas.height / 2);
      context.stroke();
      context.fillStyle = "#4fd1c5";
      context.fillRect(80, canvas.height / 2 - raw / 4, 180, raw / 2);
      context.fillStyle = "#f6e05e";
      context.fillRect(420, canvas.height / 2 - cleaned / 4, 180, cleaned / 2);
      context.fillStyle = "#f5f7fb";
      context.font = "18px monospace";
      context.fillText("raw", 145, 320);
      context.fillText("rounded to 5 decimals", 397, 320);
    }),
};

export const RandomColorPalette: Story = {
  render: () =>
    createCanvasStory("helpers.getRandomColor", (context, canvas, frame, values) => {
      const colors = Array.from({ length: 18 }, (_, index) => {
        const hueFrame = frame + index * 17;

        return frame % 20 === 0 ? helpers.getRandomColor() : `hsl(${hueFrame % 360} 90% 55%)`;
      });

      values.replaceChildren(createValue("swatches", colors.length));
      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);

      colors.forEach((color, index) => {
        const x = 42 + (index % 6) * 100;
        const y = 42 + Math.floor(index / 6) * 98;

        context.fillStyle = color;
        context.fillRect(x, y, 68, 68);
        context.strokeStyle = "#f5f7fb";
        context.strokeRect(x, y, 68, 68);
      });
    }),
};
