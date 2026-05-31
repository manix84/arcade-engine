import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  drawDebugVectors,
  getScaledViewportLimit,
  getViewportAreaScale,
  getViewportPaddedRadius,
  getViewportRadius,
} from "../index.js";
import {
  appendStyles,
  createDemoShell,
  createNumberInput,
  createPanel,
  createValue,
  drawTargetMarker,
  drawTopDownShip,
  getNumberInputValue,
  onRemove,
  setValue,
} from "./story-utils.js";

const meta = {
  title: "Engine/Viewport And Debug Vectors",
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const ScalingAndVectors: Story = {
  render: () => {
    const shell = createDemoShell("Viewport And Debug Vectors");
    const grid = document.createElement("div");
    const stagePanel = createPanel("Canvas");
    const valuesPanel = createPanel("Values");
    const stage = document.createElement("div");
    const canvas = document.createElement("canvas");
    const values = document.createElement("div");
    const width = createNumberInput("width", 800, 240, 2200);
    const height = createNumberInput("height", 600, 160, 1600);
    const heading = createNumberInput("heading", 15, 0, 359);
    const steering = createNumberInput("steering", 112, 0, 359);
    const radiusValue = createValue("radius");
    const paddedValue = createValue("padded radius");
    const scaleValue = createValue("area scale");
    const limitValue = createValue("scaled limit");
    let animationFrame = 0;
    let frame = 0;

    appendStyles(shell);
    grid.className = "ae-grid";
    stage.className = "ae-stage";
    values.className = "ae-values";
    canvas.width = 720;
    canvas.height = 420;

    const render = (): void => {
      const context = canvas.getContext("2d");
      const viewport = {
        width: getNumberInputValue(width),
        height: getNumberInputValue(height),
      };

      if (!context) {
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      context.strokeStyle = "rgba(245, 247, 251, 0.18)";
      context.strokeRect(-viewport.width / 8, -viewport.height / 8, viewport.width / 4, viewport.height / 4);
      drawTargetMarker(context, viewport.width / 8, -viewport.height / 8, {
        color: "#90cdf4",
        label: "viewport edge",
        radius: 15,
      });
      drawDebugVectors(
        context,
        0,
        0,
        getNumberInputValue(heading),
        getNumberInputValue(steering),
        {
          heading: "#f6e05e",
          steering: "#4fd1c5",
          steeringArcFill: "rgba(252, 129, 129, 0.24)",
        },
        { fillTurnArc: true, length: 120 }
      );
      drawTopDownShip(context, 0, 0, {
        accent: "#f6e05e",
        heading: getNumberInputValue(heading),
        label: "actor",
        scale: 0.82,
        thrust: 0.35,
      });
      context.restore();

      setValue(radiusValue, getViewportRadius(viewport).toFixed(2));
      setValue(
        paddedValue,
        getViewportPaddedRadius(viewport, { minRadius: 520, padding: 96 }).toFixed(2)
      );
      setValue(scaleValue, getViewportAreaScale(viewport).toFixed(2));
      setValue(limitValue, getScaledViewportLimit(12, viewport));
    };

    stage.appendChild(canvas);
    values.append(
      width,
      height,
      heading,
      steering,
      radiusValue,
      paddedValue,
      scaleValue,
      limitValue
    );
    stagePanel.appendChild(stage);
    valuesPanel.appendChild(values);
    grid.append(stagePanel, valuesPanel);
    shell.appendChild(grid);
    shell.addEventListener("input", render);
    const animate = (): void => {
      frame++;

      const headingInput = heading.querySelector("input");
      const steeringInput = steering.querySelector("input");

      if (headingInput && steeringInput) {
        headingInput.value = String((frame * 1.4) % 360);
        steeringInput.value = String((frame * 2.1 + 70) % 360);
      }

      render();
      animationFrame = window.requestAnimationFrame(animate);
    };

    animate();
    onRemove(shell, () => window.cancelAnimationFrame(animationFrame));

    return shell;
  },
};
