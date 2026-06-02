import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  colorWithAlpha,
  drawCanvasLine,
  drawDebugVectors,
  getScaledViewportLimit,
  getViewportAreaScale,
  getViewportPaddedRadius,
  getViewportRadius,
  projectPerspectivePoint,
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
  title: "Engine/Core/Viewport And Debug Vectors",
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

export const ScalingAndVectorsDepth: Story = {
  render: () => {
    const shell = createDemoShell("Viewport And Debug Vectors: 2.5D / 3D");
    const grid = document.createElement("div");
    const stagePanel = createPanel("Depth Canvas");
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
    const limitValue = createValue("scaled limit");
    let animationFrame = 0;
    let frame = 0;

    appendStyles(shell);
    grid.className = "ae-grid";
    stage.className = "ae-stage";
    values.className = "ae-values";
    canvas.width = 720;
    canvas.height = 420;

    const project = (x: number, y: number, z: number, centerX = canvas.width / 2) =>
      projectPerspectivePoint(
        { x, y, z },
        { height: canvas.height, width: canvas.width },
        { centerX, horizon: canvas.height * 0.5 }
      );

    const render = (): void => {
      const context = canvas.getContext("2d");
      const viewport = {
        width: getNumberInputValue(width),
        height: getNumberInputValue(height),
      };

      if (!context) {
        return;
      }

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = colorWithAlpha("#4fd1c5", 0.06);
      context.fillRect(0, 0, canvas.width, canvas.height * 0.5);

      for (let z = 2; z <= 28; z += 2) {
        drawCanvasLine(
          context,
          project(-viewport.width / 5, viewport.height / 5, z),
          project(viewport.width / 5, viewport.height / 5, z),
          colorWithAlpha("#90cdf4", 0.08 + (28 - z) / 90)
        );
      }

      const actor = project(0, 150, 7);

      context.save();
      context.translate(actor.x, actor.y);
      context.scale(actor.scale, actor.scale);
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
        { fillTurnArc: true, length: 130 }
      );
      drawTopDownShip(context, 0, 0, {
        accent: "#f6e05e",
        heading: getNumberInputValue(heading),
        label: "2.5D actor",
        scale: 0.82,
        thrust: 0.35,
      });
      context.restore();

      const actor3D = project(110, -20, 16, canvas.width * 0.7);

      context.save();
      context.translate(actor3D.x, actor3D.y);
      context.scale(actor3D.scale, actor3D.scale);
      drawDebugVectors(
        context,
        0,
        0,
        getNumberInputValue(heading) + 40,
        getNumberInputValue(steering) - 35,
        {
          heading: "#fc8181",
          steering: "#90cdf4",
          steeringArcFill: "rgba(144, 205, 244, 0.20)",
        },
        { fillTurnArc: true, length: 150 }
      );
      drawTopDownShip(context, 0, 0, {
        accent: "#90cdf4",
        heading: getNumberInputValue(heading) + 40,
        label: "3D actor",
        scale: 0.82,
        thrust: 0.35,
      });
      context.restore();

      setValue(radiusValue, getViewportRadius(viewport).toFixed(2));
      setValue(paddedValue, getViewportPaddedRadius(viewport, { minRadius: 520, padding: 96 }).toFixed(2));
      setValue(limitValue, getScaledViewportLimit(12, viewport));
    };

    stage.appendChild(canvas);
    values.append(width, height, heading, steering, radiusValue, paddedValue, limitValue);
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
