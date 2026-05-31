import type { Meta, StoryObj } from "@storybook/html-vite";
import { helpers } from "../../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createPanel,
  createValue,
  drawTargetMarker,
  drawTopDownShip,
  onRemove,
  setValue,
} from "../story-utils.js";

const meta = {
  title: "Engine/Helpers/Objects And Events",
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const CloneObject: Story = {
  render: () => {
    const shell = createDemoShell("helpers.cloneObject");
    const grid = document.createElement("div");
    const visualPanel = createPanel("Crew State");
    const panel = createPanel("Nested Object Copy");
    const stage = document.createElement("div");
    const canvas = document.createElement("canvas");
    const values = document.createElement("div");
    const controls = document.createElement("div");
    const originalValue = createValue("original");
    const cloneValue = createValue("clone");
    const linkedValue = createValue("shares references");
    const original = { lives: 3, nested: { score: 1000 } };
    const clone = helpers.cloneObject(original);

    appendStyles(shell);
    grid.className = "ae-grid";
    stage.className = "ae-stage";
    values.className = "ae-values";
    controls.className = "ae-controls";
    canvas.width = 620;
    canvas.height = 300;

    const draw = (): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "rgba(245, 247, 251, 0.12)";
      context.strokeRect(70, 80, 180, 150);
      context.strokeRect(370, 80, 180, 150);
      drawTopDownShip(context, 160, 145, {
        accent: original.lives > 1 ? "#4fd1c5" : "#fc8181",
        heading: 0,
        label: "original",
        scale: 0.92,
        thrust: 0.2,
      });
      drawTopDownShip(context, 460, 145, {
        accent: "#f6e05e",
        heading: 0,
        label: "clone",
        scale: 0.92 + clone.lives * 0.02,
        thrust: 0.2,
      });
      context.fillStyle = "#f5f7fb";
      context.font = "16px monospace";
      context.fillText(`original ${original.nested.score}`, 92, 262);
      context.fillText(`clone ${clone.nested.score}`, 398, 262);
    };

    const refresh = (): void => {
      setValue(originalValue, JSON.stringify(original));
      setValue(cloneValue, JSON.stringify(clone));
      setValue(linkedValue, String(original.nested === clone.nested));
      draw();
    };

    controls.append(
      createButton("Change Original", () => {
        original.lives--;
        original.nested.score += 250;
        refresh();
      }),
      createButton("Change Clone", () => {
        clone.lives++;
        clone.nested.score += 500;
        refresh();
      })
    );
    values.append(originalValue, cloneValue, linkedValue);
    stage.appendChild(canvas);
    visualPanel.appendChild(stage);
    panel.append(values, controls);
    grid.append(visualPanel, panel);
    shell.appendChild(grid);
    refresh();

    return shell;
  },
};

export const BindAndUnbind: Story = {
  render: () => {
    const shell = createDemoShell("helpers.bind / helpers.unbind");
    const grid = document.createElement("div");
    const visualPanel = createPanel("Signal Route");
    const panel = createPanel("Event Target");
    const stage = document.createElement("div");
    const canvas = document.createElement("canvas");
    const controls = document.createElement("div");
    const log = document.createElement("pre");
    const target = new EventTarget();
    let animationFrame = 0;
    let pulse = 0;
    let isBound = true;

    appendStyles(shell);
    grid.className = "ae-grid";
    stage.className = "ae-stage";
    controls.className = "ae-controls";
    log.className = "ae-log";
    canvas.width = 620;
    canvas.height = 300;

    const draw = (): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      pulse = Math.max(0, pulse - 0.025);
      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = isBound ? "#4fd1c5" : "#64748b";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(110, 150);
      context.bezierCurveTo(230, 70, 390, 230, 510, 150);
      context.stroke();
      drawTopDownShip(context, 110, 150, {
        accent: "#f6e05e",
        heading: 90,
        label: "sender",
        scale: 0.82,
        thrust: isBound ? 0.35 + pulse : 0,
      });
      drawTargetMarker(context, 510, 150, {
        color: isBound ? "#4fd1c5" : "#64748b",
        label: "listener",
        radius: 24 + pulse * 8,
      });
      context.fillStyle = "#f5f7fb";
      context.font = "16px monospace";
      context.fillText(isBound ? "events bound" : "events unbound", 244, 260);
      animationFrame = window.requestAnimationFrame(draw);
    };

    const listener = (event: Event): void => {
      pulse = 1;
      log.textContent = `${event.type} handled\n${log.textContent}`.slice(0, 500);
    };

    helpers.bind("alpha beta", listener, target);
    controls.append(
      createButton("Alpha", () => target.dispatchEvent(new Event("alpha"))),
      createButton("Beta", () => target.dispatchEvent(new Event("beta"))),
      createButton("Toggle Binding", () => {
        if (isBound) {
          helpers.unbind("alpha", "beta");
          log.textContent = `unbound\n${log.textContent}`;
        } else {
          helpers.bind("alpha beta", listener, target);
          log.textContent = `bound\n${log.textContent}`;
        }

        isBound = !isBound;
        pulse = 1;
      })
    );
    stage.appendChild(canvas);
    visualPanel.appendChild(stage);
    panel.append(controls, log);
    grid.append(visualPanel, panel);
    shell.appendChild(grid);
    draw();
    onRemove(shell, () => window.cancelAnimationFrame(animationFrame));

    return shell;
  },
};
