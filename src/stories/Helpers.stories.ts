import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  colorWithAlpha,
  drawCanvasLine,
  helpers,
  projectPerspectivePoint,
} from "../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createNumberInput,
  createPanel,
  createValue,
  drawTargetMarker,
  drawTopDownShip,
  getNumberInputValue,
  setValue,
} from "./story-utils.js";

const meta = {
  title: "Engine/Helpers/Overview",
} satisfies Meta;

export default meta;

type Story = StoryObj;

const visualHeadingTo = (target: { posX: number; posY: number }, origin?: { posX: number; posY: number }): number =>
  (helpers.findHeading(target, origin) + 180) % 360;

export const MathCollisionAndEvents: Story = {
  render: () => {
    const shell = createDemoShell("Helpers");
    const grid = document.createElement("div");
    const visualPanel = createPanel("Geometry Visualizer");
    const mathPanel = createPanel("Math");
    const collisionPanel = createPanel("Collision");
    const eventPanel = createPanel("Events");
    const stage = document.createElement("div");
    const canvas = document.createElement("canvas");
    const mathValues = document.createElement("div");
    const collisionValues = document.createElement("div");
    const controls = document.createElement("div");
    const eventLog = document.createElement("pre");

    appendStyles(shell);
    grid.className = "ae-grid";
    stage.className = "ae-stage";
    mathValues.className = "ae-values";
    collisionValues.className = "ae-values";
    controls.className = "ae-controls";
    eventLog.className = "ae-log";
    canvas.width = 640;
    canvas.height = 360;

    const destination = createNumberInput("destination", 270, 0, 359);
    const current = createNumberInput("current", 0, 0, 359);
    const step = createNumberInput("step", 22.5, 0.5, 90, 0.5);
    const rotateValue = createValue("rotateTo");
    const headingValue = createValue("findHeading");
    const spawnValue = createValue("getSpawnCoords");
    const floatValue = createValue("float");
    const colorValue = createValue("getRandomColor");

    const targetX = createNumberInput("target x", 32, -200, 200);
    const targetY = createNumberInput("target y", 18, -200, 200);
    const targetRadius = createNumberInput("target radius", 24, 1, 120);
    const originRadius = createNumberInput("origin radius", 32, 1, 120);
    const collisionValue = createValue("detectCollision");
    const exitValue = createValue("detectAreaExit");
    const cloneValue = createValue("cloneObject");

    const updateMath = (): void => {
      const destinationAngle = getNumberInputValue(destination);
      const currentAngle = getNumberInputValue(current);
      const stepSize = getNumberInputValue(step);
      const spawn = helpers.getSpawnCoords(
        { heading: currentAngle, posX: 10, posY: 20 },
        { spawnArc: 80, spawnRadius: 120 }
      );

      setValue(rotateValue, helpers.rotateTo(destinationAngle, currentAngle, stepSize));
      setValue(
        headingValue,
        helpers.findHeading({ posX: destinationAngle - 180, posY: currentAngle - 180 })
      );
      setValue(spawnValue, `${spawn.posX}, ${spawn.posY}`);
      setValue(floatValue, helpers.float(Math.PI));
      setValue(colorValue, helpers.getRandomColor());
    };

    const updateCollision = (): void => {
      const context = canvas.getContext("2d");
      const target = {
        posX: getNumberInputValue(targetX),
        posY: getNumberInputValue(targetY),
        radius: getNumberInputValue(targetRadius),
      };
      const origin = {
        posX: 0,
        posY: 0,
        radius: getNumberInputValue(originRadius),
      };
      const clone = helpers.cloneObject({ target, origin });

      setValue(collisionValue, String(helpers.detectCollision(target, origin)));
      setValue(exitValue, String(helpers.detectAreaExit(origin, target, 90)));
      setValue(cloneValue, String(clone.target !== target && clone.origin !== origin));

      if (!context) {
        return;
      }

      const targetHeading = helpers.findHeading(target, origin);
      const spawn = helpers.getSpawnCoords(
        { heading: targetHeading, posX: origin.posX, posY: origin.posY },
        { spawnArc: 80, spawnRadius: 130 }
      );
      const isColliding = helpers.detectCollision(target, origin);

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

      context.fillStyle = "rgba(79, 209, 197, 0.18)";
      context.strokeStyle = "#4fd1c5";
      context.beginPath();
      context.arc(origin.posX, origin.posY, origin.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      drawTopDownShip(context, origin.posX, origin.posY, {
        accent: "#4fd1c5",
        heading: visualHeadingTo(target, origin),
        label: "origin",
        scale: 0.78,
        thrust: isColliding ? 0.75 : 0.25,
      });

      context.fillStyle = isColliding
        ? "rgba(252, 129, 129, 0.24)"
        : "rgba(246, 224, 94, 0.18)";
      context.strokeStyle = isColliding ? "#fc8181" : "#f6e05e";
      context.beginPath();
      context.arc(target.posX, target.posY, target.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      drawTopDownShip(context, target.posX, target.posY, {
        accent: isColliding ? "#fc8181" : "#f6e05e",
        heading: visualHeadingTo(origin, target),
        label: "target",
        scale: 0.58,
      });

      context.strokeStyle = "#f5f7fb";
      context.beginPath();
      context.moveTo(origin.posX, origin.posY);
      context.lineTo(target.posX, target.posY);
      context.stroke();

      context.fillStyle = "#90cdf4";
      context.beginPath();
      context.arc(spawn.posX, spawn.posY, 7, 0, Math.PI * 2);
      context.fill();
      drawTargetMarker(context, spawn.posX, spawn.posY, {
        color: "#90cdf4",
        label: "spawn",
        radius: 9,
      });
      context.restore();
    };

    const eventTarget = new EventTarget();
    const listener = (event: Event): void => {
      eventLog.textContent = `${event.type}\n${eventLog.textContent}`.slice(0, 400);
    };

    helpers.bind(["alpha", "beta"], listener, eventTarget);

    mathValues.append(
      destination,
      current,
      step,
      rotateValue,
      headingValue,
      spawnValue,
      floatValue,
      colorValue
    );
    collisionValues.append(
      targetX,
      targetY,
      targetRadius,
      originRadius,
      collisionValue,
      exitValue,
      cloneValue
    );
    controls.append(
      createButton("Alpha", () => eventTarget.dispatchEvent(new Event("alpha"))),
      createButton("Beta", () => eventTarget.dispatchEvent(new Event("beta"))),
      createButton("Unbind", () => helpers.unbind("alpha", "beta"))
    );

    stage.appendChild(canvas);
    visualPanel.appendChild(stage);
    mathPanel.appendChild(mathValues);
    collisionPanel.appendChild(collisionValues);
    eventPanel.append(controls, eventLog);
    grid.append(visualPanel, mathPanel, collisionPanel, eventPanel);
    shell.appendChild(grid);

    shell.addEventListener("input", () => {
      updateMath();
      updateCollision();
    });
    updateMath();
    updateCollision();

    return shell;
  },
};

export const MathCollisionAndEventsDepth: Story = {
  render: () => {
    const shell = createDemoShell("Helpers: 2.5D / 3D");
    const grid = document.createElement("div");
    const visualPanel = createPanel("Depth Visualizer");
    const mathPanel = createPanel("Math");
    const collisionPanel = createPanel("Collision");
    const eventPanel = createPanel("Events");
    const stage = document.createElement("div");
    const canvas = document.createElement("canvas");
    const mathValues = document.createElement("div");
    const collisionValues = document.createElement("div");
    const controls = document.createElement("div");
    const eventLog = document.createElement("pre");

    appendStyles(shell);
    grid.className = "ae-grid";
    stage.className = "ae-stage";
    mathValues.className = "ae-values";
    collisionValues.className = "ae-values";
    controls.className = "ae-controls";
    eventLog.className = "ae-log";
    canvas.width = 640;
    canvas.height = 360;

    const targetX = createNumberInput("target x", 32, -200, 200);
    const targetY = createNumberInput("target y", 18, -200, 200);
    const targetRadius = createNumberInput("target radius", 24, 1, 120);
    const originRadius = createNumberInput("origin radius", 32, 1, 120);
    const rotateValue = createValue("rotateTo");
    const headingValue = createValue("findHeading");
    const spawnValue = createValue("getSpawnCoords");
    const collisionValue = createValue("detectCollision");
    const exitValue = createValue("detectAreaExit");

    const project = (x: number, y: number, z: number, centerX = canvas.width / 2) =>
      projectPerspectivePoint(
        { x, y, z },
        { height: canvas.height, width: canvas.width },
        { centerX, horizon: canvas.height * 0.52 }
      );

    const update = (): void => {
      const context = canvas.getContext("2d");
      const target = {
        posX: getNumberInputValue(targetX),
        posY: getNumberInputValue(targetY),
        radius: getNumberInputValue(targetRadius),
      };
      const origin = {
        posX: 0,
        posY: 0,
        radius: getNumberInputValue(originRadius),
      };
      const heading = helpers.findHeading(target, origin);
      const rotated = helpers.rotateTo(heading, heading + 120, 18);
      const spawn = helpers.getSpawnCoords(
        { heading, posX: origin.posX, posY: origin.posY },
        { spawnArc: 80, spawnRadius: 130 }
      );
      const isColliding = helpers.detectCollision(target, origin);
      const hasExited = helpers.detectAreaExit(origin, target, 90);

      setValue(rotateValue, helpers.float(rotated));
      setValue(headingValue, helpers.float(heading));
      setValue(spawnValue, `${spawn.posX}, ${spawn.posY}`);
      setValue(collisionValue, String(isColliding));
      setValue(exitValue, String(hasExited));

      if (!context) {
        return;
      }

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = colorWithAlpha("#4fd1c5", 0.06);
      context.fillRect(0, 0, canvas.width, canvas.height * 0.52);

      const origin2_5D = project(origin.posX, 160, 7);
      const target2_5D = project(target.posX, 160, 9 + Math.abs(target.posY) / 10);
      const origin3D = project(origin.posX, origin.posY, 7, canvas.width * 0.72);
      const target3D = project(target.posX, target.posY, 9 + Math.abs(target.posY) / 10, canvas.width * 0.72);

      drawCanvasLine(context, origin2_5D, target2_5D, isColliding ? "#fc8181" : "#f6e05e", 3);
      drawCanvasLine(context, origin3D, target3D, hasExited ? "#fc8181" : "#4fd1c5", 3);
      drawTargetMarker(context, origin2_5D.x, origin2_5D.y, { color: "#4fd1c5", label: "2.5D", radius: origin.radius * origin2_5D.scale });
      drawTargetMarker(context, target2_5D.x, target2_5D.y, { color: isColliding ? "#fc8181" : "#f6e05e", label: "target", radius: target.radius * target2_5D.scale });
      drawTargetMarker(context, origin3D.x, origin3D.y, { color: "#90cdf4", label: "3D", radius: origin.radius * origin3D.scale });
      drawTargetMarker(context, target3D.x, target3D.y, { color: hasExited ? "#fc8181" : "#f6e05e", label: "target", radius: target.radius * target3D.scale });
    };

    const eventTarget = new EventTarget();
    const listener = (event: Event): void => {
      eventLog.textContent = `${event.type}\n${eventLog.textContent}`.slice(0, 400);
    };

    helpers.bind(["alpha-depth", "beta-depth"], listener, eventTarget);
    mathValues.append(rotateValue, headingValue, spawnValue);
    collisionValues.append(targetX, targetY, targetRadius, originRadius, collisionValue, exitValue);
    controls.append(
      createButton("Alpha", () => eventTarget.dispatchEvent(new Event("alpha-depth"))),
      createButton("Beta", () => eventTarget.dispatchEvent(new Event("beta-depth"))),
      createButton("Unbind", () => helpers.unbind("alpha-depth", "beta-depth"))
    );

    stage.appendChild(canvas);
    visualPanel.appendChild(stage);
    mathPanel.appendChild(mathValues);
    collisionPanel.appendChild(collisionValues);
    eventPanel.append(controls, eventLog);
    grid.append(visualPanel, mathPanel, collisionPanel, eventPanel);
    shell.appendChild(grid);
    shell.addEventListener("input", update);
    update();

    return shell;
  },
};
