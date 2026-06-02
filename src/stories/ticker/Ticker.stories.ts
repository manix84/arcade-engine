import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
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
  targetFps: TargetFps;
  trackSpeed: number;
  onClear: () => void;
  onStart: () => void;
  onStop: () => void;
};

type Story = StoryObj<TickerStoryArgs>;

type TickerAfterImage = {
  createdAt: number;
  opacity: number;
  x: number;
  y: number;
};

type FpsSample = {
  elapsedSeconds: number;
  frame: number;
};

type FpsStats = {
  count: number;
  max: number;
  min: number;
  total: number;
};

type TargetFps = "max" | number;

const commonFpsSteps = [1, 2, 5, 10, 15, 24, 30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 200, 240];
const panelBorderColor = "rgba(245, 247, 251, 0.14)";
const panelFlashTimers = new WeakMap<HTMLElement, number>();
const targetFpsOptions: TargetFps[] = ["max", ...commonFpsSteps];
const targetFpsLabels = {
  max: "Max",
  ...Object.fromEntries(commonFpsSteps.map((fps) => [fps, `${fps} FPS`])),
};

const getRenderFps = (targetFps: TargetFps): number | undefined =>
  targetFps === "max" ? undefined : targetFps;

const getFixedStepFps = (targetFps: TargetFps): number =>
  targetFps === "max" ? commonFpsSteps[commonFpsSteps.length - 1] : targetFps;

const flashPanelBorder = (panel: HTMLElement, color: string): void => {
  const existingTimer = panelFlashTimers.get(panel);

  if (existingTimer !== undefined) {
    window.clearTimeout(existingTimer);
  }

  panel.style.borderColor = color;
  panelFlashTimers.set(
    panel,
    window.setTimeout(() => {
      panel.style.borderColor = panelBorderColor;
      panelFlashTimers.delete(panel);
    }, 70)
  );
};

const updateMeasuredFps = (
  samples: FpsSample[],
  frame: number,
  elapsedSeconds: number
): number | undefined => {
  samples.push({ elapsedSeconds, frame });

  while (samples.length > 2 && elapsedSeconds - samples[0].elapsedSeconds > 1) {
    samples.shift();
  }

  const firstSample = samples[0];
  const elapsedWindow = elapsedSeconds - firstSample.elapsedSeconds;
  const frameWindow = frame - firstSample.frame;

  if (elapsedWindow <= 0 || frameWindow <= 0) {
    return undefined;
  }

  return frameWindow / elapsedWindow;
};

const resetFpsStats = (
  stats: FpsStats,
  minValue: HTMLElement,
  maxValue: HTMLElement,
  avgValue: HTMLElement
): void => {
  stats.count = 0;
  stats.max = 0;
  stats.min = Number.POSITIVE_INFINITY;
  stats.total = 0;
  setValue(minValue, "--");
  setValue(maxValue, "--");
  setValue(avgValue, "--");
};

const updateFpsStats = (
  stats: FpsStats,
  measuredFps: number | undefined,
  minValue: HTMLElement,
  maxValue: HTMLElement,
  avgValue: HTMLElement
): void => {
  if (measuredFps === undefined) {
    return;
  }

  stats.count++;
  stats.max = Math.max(stats.max, measuredFps);
  stats.min = Math.min(stats.min, measuredFps);
  stats.total += measuredFps;
  setValue(minValue, Math.round(stats.min));
  setValue(maxValue, Math.round(stats.max));
  setValue(avgValue, Math.round(stats.total / stats.count));
};

const drawTickerTrack = (
  canvas: HTMLCanvasElement,
  frame: number,
  color: string,
  label: string,
  trackSpeed: number,
  elapsedSeconds: number,
  measuredFps: number | undefined,
  afterImages: TickerAfterImage[]
): void => {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const trackWidth = canvas.width - 56;
  const pixelsPerSecond = trackSpeed * 66;
  const distance = elapsedSeconds * pixelsPerSecond;
  const previousDistance = Math.max(0, distance - pixelsPerSecond / 60);
  const x = 28 + (distance % trackWidth);
  const y = canvas.height / 2 + Math.sin(distance / 56) * 48;
  const previousX = 28 + (previousDistance % trackWidth);
  const previousY = canvas.height / 2 + Math.sin(previousDistance / 56) * 48;
  const dx = x < previousX ? pixelsPerSecond / 60 : x - previousX;
  const dy = x < previousX ? 0 : y - previousY;
  const heading = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  const thrust = 0.4 + Math.sin(elapsedSeconds * 7) * 0.25;

  afterImages.forEach((afterImage) => {
    afterImage.opacity = Math.max(0, 0.25 - (elapsedSeconds - afterImage.createdAt) * 0.175);
  });

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

  afterImages.forEach((afterImage) => {
    if (afterImage.opacity <= 0) {
      return;
    }

    context.save();
    context.globalAlpha = afterImage.opacity;
    context.fillStyle = color;
    context.beginPath();
    context.arc(afterImage.x, afterImage.y, 14, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });

  drawTopDownShip(context, x, y, {
    accent: color,
    heading,
    label,
    scale: 0.8,
    thrust,
  });
  afterImages.push({
    createdAt: elapsedSeconds,
    opacity: 0.25,
    x,
    y,
  });

  while (afterImages.length > 0 && afterImages[0].opacity <= 0) {
    afterImages.shift();
  }

  context.fillStyle = "#f5f7fb";
  context.font = "16px monospace";
  context.fillText(`${label} ${frame}`, 18, 28);
  context.textAlign = "right";
  context.fillText(measuredFps === undefined ? "-- FPS" : `${Math.round(measuredFps)} FPS`, canvas.width - 18, 28);
  context.textAlign = "start";
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
  const stateValue = createValue("running", "false");
  const minFpsValue = createValue("min FPS", "--");
  const maxFpsValue = createValue("max FPS", "--");
  const avgFpsValue = createValue("avg FPS", "--");
  const afterImages: TickerAfterImage[] = [];
  const fpsSamples: FpsSample[] = [];
  const fpsStats: FpsStats = {
    count: 0,
    max: 0,
    min: Number.POSITIVE_INFINITY,
    total: 0,
  };
  let elapsedSeconds = 0;
  let lastRenderTimestamp: number | undefined;

  appendStyles(shell);
  grid.className = "ae-grid";
  stage.className = "ae-stage";
  values.className = "ae-values";
  controls.className = "ae-controls";
  canvas.width = 620;
  canvas.height = 280;

  const update = (): void => {
    setValue(stateValue, String(ticker.isRunning));
  };
  const getElapsedSeconds = (): number => {
    const now = performance.now();

    if (lastRenderTimestamp !== undefined) {
      elapsedSeconds += (now - lastRenderTimestamp) / 1000;
    }

    lastRenderTimestamp = now;

    return elapsedSeconds;
  };
  const resetFpsTracking = (): void => {
    fpsSamples.length = 0;
    resetFpsStats(fpsStats, minFpsValue, maxFpsValue, avgFpsValue);
  };

  ticker.addSchedule((frame) => {
    const currentElapsedSeconds = getElapsedSeconds();
    const measuredFps = updateMeasuredFps(fpsSamples, frame, currentElapsedSeconds);

    drawTickerTrack(canvas, frame, args.color, args.label, args.trackSpeed, currentElapsedSeconds, measuredFps, afterImages);
    updateFpsStats(fpsStats, measuredFps, minFpsValue, maxFpsValue, avgFpsValue);
    flashPanelBorder(panel, args.color);
    update();
  }, 1);

  controls.append(
    createButton("Start", () => {
      args.onStart();
      lastRenderTimestamp = undefined;
      ticker.start();
      update();
    }),
    createButton("Stop", () => {
      args.onStop();
      ticker.stop(() => {
        lastRenderTimestamp = undefined;
        update();
      });
    }),
    createButton("Clear", () => {
      args.onClear();
      ticker.clearTicks();
      afterImages.length = 0;
      resetFpsTracking();
      elapsedSeconds = 0;
      lastRenderTimestamp = undefined;
      drawTickerTrack(canvas, 0, args.color, args.label, args.trackSpeed, elapsedSeconds, undefined, afterImages);
      update();
    })
  );
  stage.appendChild(canvas);
  values.append(stateValue, minFpsValue, maxFpsValue, avgFpsValue);
  panel.appendChild(stage);
  statePanel.append(values, controls);
  grid.append(panel, statePanel);
  shell.appendChild(grid);
  drawTickerTrack(canvas, 0, args.color, args.label, args.trackSpeed, elapsedSeconds, undefined, afterImages);
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
  targetFps: {
    control: "select",
    labels: targetFpsLabels,
    options: targetFpsOptions,
  },
  trackSpeed: { control: { type: "range", min: 1, max: 18, step: 1 } },
};

const tickerPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByRole("button", { name: "Stop" }));
  await waitFor(() => expect(canvas.getByText("false")).toBeVisible());
  await userEvent.click(canvas.getByRole("button", { name: "Start" }));
  await waitFor(() => expect(canvas.getByText("true")).toBeVisible());
  await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
};

export const RequestAnimationFrame: Story = {
  args: {
    autoStart: true,
    color: "#90cdf4",
    label: "raf",
    targetFps: "max",
    trackSpeed: 7,
    onClear: fn(),
    onStart: fn(),
    onStop: fn(),
  },
  argTypes: tickerArgTypes,
  play: tickerPlay,
  render: (args) => createTickerStory("Ticker requestAnimationFrame", new Ticker({ fps: getRenderFps(args.targetFps) }), args),
};

export const RenderFpsCap: Story = {
  args: {
    autoStart: true,
    color: "#f6e05e",
    label: "30fps",
    targetFps: 30,
    trackSpeed: 7,
    onClear: fn(),
    onStart: fn(),
    onStop: fn(),
  },
  argTypes: tickerArgTypes,
  play: tickerPlay,
  render: (args) => createTickerStory("Ticker fps cap", new Ticker({ fps: getRenderFps(args.targetFps) }), args),
};

export const FixedStepSimulation: Story = {
  args: {
    autoStart: true,
    color: "#4fd1c5",
    label: "50hz",
    targetFps: 50,
    trackSpeed: 7,
    onClear: fn(),
    onStart: fn(),
    onStop: fn(),
  },
  argTypes: tickerArgTypes,
  play: tickerPlay,
  render: (args) =>
    createTickerStory(
      "Ticker fixed-step simulation",
      new Ticker({ fixedStepFps: getFixedStepFps(args.targetFps), maxCatchUpFrames: 4 }),
      args
    ),
};
