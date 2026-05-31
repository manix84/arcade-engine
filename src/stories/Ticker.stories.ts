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

type Story = StoryObj;

export const RenderAndFixedStepTickers: Story = {
  render: () => {
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
    const renderTickValue = createValue("ticks", "0");
    const renderFrameValue = createValue("last frame", "0");
    const renderStateValue = createValue("running", "false");
    const fixedTickValue = createValue("ticks", "0");
    const fixedFrameValue = createValue("last frame", "0");
    const fixedStateValue = createValue("running", "false");

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

    const renderTicker = new Ticker({ fps: 30 });
    const fixedTicker = new Ticker({ fixedStepFps: 50, maxCatchUpFrames: 4 });

    const update = (): void => {
      setValue(renderTickValue, renderTicker.getTicks());
      setValue(renderStateValue, String(renderTicker.isRunning));
      setValue(fixedTickValue, fixedTicker.getTicks());
      setValue(fixedStateValue, String(fixedTicker.isRunning));
    };

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

      const trackWidth = canvas.width - 56;
      const x = 28 + ((frame * 7) % trackWidth);
      const y = canvas.height / 2 + Math.sin(frame / 8) * 48;
      const previousX = 28 + (((frame - 1) * 7) % trackWidth);
      const previousY = canvas.height / 2 + Math.sin((frame - 1) / 8) * 48;
      const dx = x < previousX ? 7 : x - previousX;
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
        scale: 0.72,
        thrust: 0.4 + Math.sin(frame / 4) * 0.25,
      });
      context.fillStyle = "#f5f7fb";
      context.font = "16px monospace";
      context.fillText(`${label} ${frame}`, 18, 28);
    };

    renderTicker.addSchedule((frame) => {
      setValue(renderFrameValue, frame);
      drawTickerTrack(renderCanvas, frame, "#f6e05e", "render");
      update();
    }, 1);
    renderTicker.addSchedule(() => {
      renderPanel.style.borderColor = "#f6e05e";
      window.setTimeout(() => {
        renderPanel.style.borderColor = "rgba(245, 247, 251, 0.14)";
      }, 70);
    }, 15);
    fixedTicker.addSchedule((frame) => {
      setValue(fixedFrameValue, frame);
      drawTickerTrack(fixedCanvas, frame, "#4fd1c5", "fixed");
      update();
    }, 1);

    renderControls.append(
      createButton("Start", () => {
        renderTicker.start();
        update();
      }),
      createButton("Stop", () => renderTicker.stop(update)),
      createButton("Clear", () => {
        renderTicker.clearTicks();
        update();
      }),
      createButton("15 FPS", () => renderTicker.setFps(15)),
      createButton("60 FPS", () => renderTicker.setFps(60))
    );
    fixedControls.append(
      createButton("Start", () => {
        fixedTicker.start();
        update();
      }),
      createButton("Stop", () => fixedTicker.stop(update)),
      createButton("Clear", () => {
        fixedTicker.clearTicks();
        update();
      })
    );
    renderValues.append(renderTickValue, renderFrameValue, renderStateValue);
    fixedValues.append(fixedTickValue, fixedFrameValue, fixedStateValue);
    renderStage.appendChild(renderCanvas);
    fixedStage.appendChild(fixedCanvas);
    renderPanel.append(renderStage, renderValues, renderControls);
    fixedPanel.append(fixedStage, fixedValues, fixedControls);
    grid.append(renderPanel, fixedPanel);
    shell.appendChild(grid);
    renderTicker.start();
    fixedTicker.start();
    drawTickerTrack(renderCanvas, 0, "#f6e05e", "render");
    drawTickerTrack(fixedCanvas, 0, "#4fd1c5", "fixed");
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
