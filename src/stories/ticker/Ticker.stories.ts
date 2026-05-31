import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Ticker } from "../../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createPanel,
  createValue,
  drawTopDownShip,
  onRemove,
  setValue,
} from "../story-utils.js";

const meta = {
  title: "Engine/Ticker",
} satisfies Meta;

export default meta;

type TickerStoryArgs = {
  autoStart: boolean;
  color: string;
  label: string;
  trackSpeed: number;
  onClear: () => void;
  onStart: () => void;
  onStop: () => void;
};

type Story = StoryObj<TickerStoryArgs>;

const drawTickerTrack = (
  canvas: HTMLCanvasElement,
  frame: number,
  color: string,
  label: string,
  trackSpeed: number
): void => {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const trackWidth = canvas.width - 56;
  const x = 28 + ((frame * trackSpeed) % trackWidth);
  const y = canvas.height / 2 + Math.sin(frame / 8) * 48;
  const previousX = 28 + (((frame - 1) * trackSpeed) % trackWidth);
  const previousY = canvas.height / 2 + Math.sin((frame - 1) / 8) * 48;
  const dx = x < previousX ? trackSpeed : x - previousX;
  const dy = x < previousX ? 0 : y - previousY;
  const heading = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;

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
  drawTopDownShip(context, x, y, {
    accent: color,
    heading,
    label,
    scale: 0.8,
    thrust: 0.4 + Math.sin(frame / 4) * 0.25,
  });
  context.fillStyle = "#f5f7fb";
  context.font = "16px monospace";
  context.fillText(`${label} ${frame}`, 18, 28);
};

const createTickerStory = (
  title: string,
  ticker: Ticker,
  args: TickerStoryArgs
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
    drawTickerTrack(canvas, frame, args.color, args.label, args.trackSpeed);
    update();
  }, 1);

  controls.append(
    createButton("Start", () => {
      args.onStart();
      ticker.start();
      update();
    }),
    createButton("Stop", () => {
      args.onStop();
      ticker.stop(update);
    }),
    createButton("Clear", () => {
      args.onClear();
      ticker.clearTicks();
      drawTickerTrack(canvas, 0, args.color, args.label, args.trackSpeed);
      update();
    })
  );
  stage.appendChild(canvas);
  values.append(tickValue, frameValue, stateValue);
  panel.appendChild(stage);
  statePanel.append(values, controls);
  grid.append(panel, statePanel);
  shell.appendChild(grid);
  drawTickerTrack(canvas, 0, args.color, args.label, args.trackSpeed);
  if (args.autoStart) {
    ticker.start();
  }
  update();
  onRemove(shell, () => {
    if (ticker.isRunning) {
      ticker.stop();
    }
  });

  return shell;
};

const tickerArgTypes: Story["argTypes"] = {
  autoStart: { control: "boolean" },
  color: { control: "color" },
  label: { control: "text" },
  trackSpeed: { control: { type: "range", min: 1, max: 18, step: 1 } },
};

const tickerPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByRole("button", { name: "Stop" }));
  await expect(canvas.getByText("false")).toBeVisible();
  await userEvent.click(canvas.getByRole("button", { name: "Start" }));
  await expect(canvas.getByText("true")).toBeVisible();
  await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
};

export const RequestAnimationFrame: Story = {
  args: {
    autoStart: true,
    color: "#90cdf4",
    label: "raf",
    trackSpeed: 7,
    onClear: fn(),
    onStart: fn(),
    onStop: fn(),
  },
  argTypes: tickerArgTypes,
  play: tickerPlay,
  render: (args) => createTickerStory("Ticker requestAnimationFrame", new Ticker(), args),
};

export const RenderFpsCap: Story = {
  args: {
    autoStart: true,
    color: "#f6e05e",
    label: "30fps",
    trackSpeed: 7,
    onClear: fn(),
    onStart: fn(),
    onStop: fn(),
  },
  argTypes: tickerArgTypes,
  play: tickerPlay,
  render: (args) => createTickerStory("Ticker fps cap", new Ticker({ fps: 30 }), args),
};

export const FixedStepSimulation: Story = {
  args: {
    autoStart: true,
    color: "#4fd1c5",
    label: "50hz",
    trackSpeed: 7,
    onClear: fn(),
    onStart: fn(),
    onStop: fn(),
  },
  argTypes: tickerArgTypes,
  play: tickerPlay,
  render: (args) =>
    createTickerStory("Ticker fixed-step simulation", new Ticker({ fixedStepFps: 50, maxCatchUpFrames: 4 }), args),
};
