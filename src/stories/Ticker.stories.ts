import type { Meta, StoryObj } from "@storybook/html-vite";
import { Ticker } from "../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createPanel,
  createValue,
  drawTopDownShip,
  onRemove,
  setValue,
} from "./story-utils.js";

const meta = {
  title: "Engine/Ticker",
} satisfies Meta;

export default meta;

type TargetFps = "max" | number;

type TickerStoryArgs = {
  fixedTargetFps: TargetFps;
  renderTargetFps: TargetFps;
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

export const RenderAndFixedStepTickers: Story = {
  args: {
    fixedTargetFps: 50,
    renderTargetFps: 30,
  },
  argTypes: {
    fixedTargetFps: {
      control: "select",
      labels: targetFpsLabels,
      options: targetFpsOptions,
    },
    renderTargetFps: {
      control: "select",
      labels: targetFpsLabels,
      options: targetFpsOptions,
    },
  },
  render: (args) => {
    const shell = createDemoShell("Ticker");
    const grid = document.createElement("div");
    const renderPanel = createPanel("Render Ticker");
    const fixedPanel = createPanel("Fixed Step Ticker");
    const renderStage = document.createElement("div");
    const fixedStage = document.createElement("div");
    const renderCanvas = document.createElement("canvas");
    const fixedCanvas = document.createElement("canvas");
    const renderValues = document.createElement("div");
    const fixedValues = document.createElement("div");
    const renderControls = document.createElement("div");
    const fixedControls = document.createElement("div");
    const renderStateValue = createValue("running", "false");
    const fixedStateValue = createValue("running", "false");
    const renderMinFpsValue = createValue("min FPS", "--");
    const renderMaxFpsValue = createValue("max FPS", "--");
    const renderAvgFpsValue = createValue("avg FPS", "--");
    const fixedMinFpsValue = createValue("min FPS", "--");
    const fixedMaxFpsValue = createValue("max FPS", "--");
    const fixedAvgFpsValue = createValue("avg FPS", "--");

    appendStyles(shell);
    grid.className = "ae-grid";
    renderValues.className = "ae-values";
    fixedValues.className = "ae-values";
    renderStage.className = "ae-stage";
    fixedStage.className = "ae-stage";
    renderControls.className = "ae-controls";
    fixedControls.className = "ae-controls";
    renderCanvas.width = 520;
    renderCanvas.height = 220;
    fixedCanvas.width = 520;
    fixedCanvas.height = 220;

    const renderTicker = new Ticker({ fps: getRenderFps(args.renderTargetFps) });
    const fixedTicker = new Ticker({ fixedStepFps: getFixedStepFps(args.fixedTargetFps), maxCatchUpFrames: 4 });

    const update = (): void => {
      setValue(renderStateValue, String(renderTicker.isRunning));
      setValue(fixedStateValue, String(fixedTicker.isRunning));
    };

    const drawTickerTrack = (
      canvas: HTMLCanvasElement,
      frame: number,
      color: string,
      label: string,
      elapsedSeconds: number,
      measuredFps: number | undefined,
      afterImages: TickerAfterImage[]
    ): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      const trackWidth = canvas.width - 56;
      const pixelsPerSecond = 462;
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
        context.arc(afterImage.x, afterImage.y, 13, 0, Math.PI * 2);
        context.fill();
        context.restore();
      });

      drawTopDownShip(context, x, y, {
        accent: color,
        heading,
        label,
        scale: 0.72,
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

    const renderAfterImages: TickerAfterImage[] = [];
    const fixedAfterImages: TickerAfterImage[] = [];
    const renderFpsSamples: FpsSample[] = [];
    const fixedFpsSamples: FpsSample[] = [];
    const renderFpsStats: FpsStats = {
      count: 0,
      max: 0,
      min: Number.POSITIVE_INFINITY,
      total: 0,
    };
    const fixedFpsStats: FpsStats = {
      count: 0,
      max: 0,
      min: Number.POSITIVE_INFINITY,
      total: 0,
    };
    let renderElapsedSeconds = 0;
    let fixedElapsedSeconds = 0;
    let lastRenderTimestamp: number | undefined;
    let lastFixedTimestamp: number | undefined;
    const getElapsedSeconds = (current: number, lastTimestamp: number | undefined): [number, number] => {
      const now = performance.now();

      if (lastTimestamp === undefined) {
        return [current, now];
      }

      return [current + (now - lastTimestamp) / 1000, now];
    };
    const resetRenderFpsTracking = (): void => {
      renderFpsSamples.length = 0;
      resetFpsStats(renderFpsStats, renderMinFpsValue, renderMaxFpsValue, renderAvgFpsValue);
    };
    const resetFixedFpsTracking = (): void => {
      fixedFpsSamples.length = 0;
      resetFpsStats(fixedFpsStats, fixedMinFpsValue, fixedMaxFpsValue, fixedAvgFpsValue);
    };

    renderTicker.addSchedule((frame) => {
      [renderElapsedSeconds, lastRenderTimestamp] = getElapsedSeconds(renderElapsedSeconds, lastRenderTimestamp);
      const measuredFps = updateMeasuredFps(renderFpsSamples, frame, renderElapsedSeconds);

      drawTickerTrack(renderCanvas, frame, "#f6e05e", "render", renderElapsedSeconds, measuredFps, renderAfterImages);
      updateFpsStats(renderFpsStats, measuredFps, renderMinFpsValue, renderMaxFpsValue, renderAvgFpsValue);
      flashPanelBorder(renderPanel, "#f6e05e");
      update();
    }, 1);
    fixedTicker.addSchedule((frame) => {
      [fixedElapsedSeconds, lastFixedTimestamp] = getElapsedSeconds(fixedElapsedSeconds, lastFixedTimestamp);
      const measuredFps = updateMeasuredFps(fixedFpsSamples, frame, fixedElapsedSeconds);

      drawTickerTrack(fixedCanvas, frame, "#4fd1c5", "fixed", fixedElapsedSeconds, measuredFps, fixedAfterImages);
      updateFpsStats(fixedFpsStats, measuredFps, fixedMinFpsValue, fixedMaxFpsValue, fixedAvgFpsValue);
      flashPanelBorder(fixedPanel, "#4fd1c5");
      update();
    }, 1);

    renderControls.append(
      createButton("Start", () => {
        lastRenderTimestamp = undefined;
        renderTicker.start();
        update();
      }),
      createButton("Stop", () =>
        renderTicker.stop(() => {
          lastRenderTimestamp = undefined;
          update();
        })
      ),
      createButton("Clear", () => {
        renderTicker.clearTicks();
        renderAfterImages.length = 0;
        resetRenderFpsTracking();
        renderElapsedSeconds = 0;
        lastRenderTimestamp = undefined;
        drawTickerTrack(renderCanvas, 0, "#f6e05e", "render", renderElapsedSeconds, undefined, renderAfterImages);
        update();
      })
    );
    fixedControls.append(
      createButton("Start", () => {
        lastFixedTimestamp = undefined;
        fixedTicker.start();
        update();
      }),
      createButton("Stop", () =>
        fixedTicker.stop(() => {
          lastFixedTimestamp = undefined;
          update();
        })
      ),
      createButton("Clear", () => {
        fixedTicker.clearTicks();
        fixedAfterImages.length = 0;
        resetFixedFpsTracking();
        fixedElapsedSeconds = 0;
        lastFixedTimestamp = undefined;
        drawTickerTrack(fixedCanvas, 0, "#4fd1c5", "fixed", fixedElapsedSeconds, undefined, fixedAfterImages);
        update();
      })
    );
    renderValues.append(renderStateValue, renderMinFpsValue, renderMaxFpsValue, renderAvgFpsValue);
    fixedValues.append(fixedStateValue, fixedMinFpsValue, fixedMaxFpsValue, fixedAvgFpsValue);
    renderStage.appendChild(renderCanvas);
    fixedStage.appendChild(fixedCanvas);
    renderPanel.append(renderStage, renderValues, renderControls);
    fixedPanel.append(fixedStage, fixedValues, fixedControls);
    grid.append(renderPanel, fixedPanel);
    shell.appendChild(grid);
    renderTicker.start();
    fixedTicker.start();
    drawTickerTrack(renderCanvas, 0, "#f6e05e", "render", renderElapsedSeconds, undefined, renderAfterImages);
    drawTickerTrack(fixedCanvas, 0, "#4fd1c5", "fixed", fixedElapsedSeconds, undefined, fixedAfterImages);
    update();
    onRemove(shell, () => {
      if (renderTicker.isRunning) {
        renderTicker.stop();
      }

      if (fixedTicker.isRunning) {
        fixedTicker.stop();
      }
    });

    return shell;
  },
};
