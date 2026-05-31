import type { Meta, StoryObj } from "@storybook/html-vite";
import { Ticker } from "../../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createPanel,
  createValue,
  onRemove,
  setValue,
} from "../story-utils.js";

const meta = {
  title: "Engine/Ticker",
} satisfies Meta;

export default meta;

type Story = StoryObj;

const drawTickerTrack = (
  canvas: HTMLCanvasElement,
  frame: number,
  color: string,
  label: string
): void => {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const x = 28 + ((frame * 7) % (canvas.width - 56));
  const y = canvas.height / 2 + Math.sin(frame / 8) * 48;

  context.fillStyle = "#05070a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(245, 247, 251, 0.12)";

  for (let i = 24; i < canvas.width; i += 32) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, canvas.height);
    context.stroke();
  }

  context.strokeStyle = color;
  context.beginPath();
  context.moveTo(24, canvas.height / 2);
  context.lineTo(canvas.width - 24, canvas.height / 2);
  context.stroke();
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, 18, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#f5f7fb";
  context.font = "16px monospace";
  context.fillText(`${label} ${frame}`, 18, 28);
};

const createTickerStory = (
  title: string,
  ticker: Ticker,
  color: string,
  label: string
): HTMLElement => {
  const shell = createDemoShell(title);
  const grid = document.createElement("div");
  const panel = createPanel("Animated Track");
  const statePanel = createPanel("Controls");
  const stage = document.createElement("div");
  const canvas = document.createElement("canvas");
  const values = document.createElement("div");
  const controls = document.createElement("div");
  const tickValue = createValue("ticks", "0");
  const frameValue = createValue("last frame", "0");
  const stateValue = createValue("running", "false");

  appendStyles(shell);
  grid.className = "ae-grid";
  stage.className = "ae-stage";
  values.className = "ae-values";
  controls.className = "ae-controls";
  canvas.width = 620;
  canvas.height = 280;

  const update = (): void => {
    setValue(tickValue, ticker.getTicks());
    setValue(stateValue, String(ticker.isRunning));
  };

  ticker.addSchedule((frame) => {
    setValue(frameValue, frame);
    drawTickerTrack(canvas, frame, color, label);
    update();
  }, 1);

  controls.append(
    createButton("Start", () => {
      ticker.start();
      update();
    }),
    createButton("Stop", () => ticker.stop(update)),
    createButton("Clear", () => {
      ticker.clearTicks();
      drawTickerTrack(canvas, 0, color, label);
      update();
    })
  );
  stage.appendChild(canvas);
  values.append(tickValue, frameValue, stateValue);
  panel.appendChild(stage);
  statePanel.append(values, controls);
  grid.append(panel, statePanel);
  shell.appendChild(grid);
  drawTickerTrack(canvas, 0, color, label);
  ticker.start();
  update();
  onRemove(shell, () => {
    if (ticker.isRunning) {
      ticker.stop();
    }
  });

  return shell;
};

export const RequestAnimationFrame: Story = {
  render: () => createTickerStory("Ticker requestAnimationFrame", new Ticker(), "#90cdf4", "raf"),
};

export const RenderFpsCap: Story = {
  render: () => createTickerStory("Ticker fps cap", new Ticker({ fps: 30 }), "#f6e05e", "30fps"),
};

export const FixedStepSimulation: Story = {
  render: () =>
    createTickerStory(
      "Ticker fixed-step simulation",
      new Ticker({ fixedStepFps: 50, maxCatchUpFrames: 4 }),
      "#4fd1c5",
      "50hz"
    ),
};
