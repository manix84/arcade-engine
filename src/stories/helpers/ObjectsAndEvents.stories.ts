import type { Meta, StoryObj } from "@storybook/html-vite";
import { helpers } from "../../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createPanel,
  createValue,
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
    const panel = createPanel("Nested Object Copy");
    const values = document.createElement("div");
    const controls = document.createElement("div");
    const originalValue = createValue("original");
    const cloneValue = createValue("clone");
    const linkedValue = createValue("shares references");
    const original = { lives: 3, nested: { score: 1000 } };
    const clone = helpers.cloneObject(original);

    appendStyles(shell);
    grid.className = "ae-grid";
    values.className = "ae-values";
    controls.className = "ae-controls";

    const refresh = (): void => {
      setValue(originalValue, JSON.stringify(original));
      setValue(cloneValue, JSON.stringify(clone));
      setValue(linkedValue, String(original.nested === clone.nested));
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
    panel.append(values, controls);
    grid.appendChild(panel);
    shell.appendChild(grid);
    refresh();

    return shell;
  },
};

export const BindAndUnbind: Story = {
  render: () => {
    const shell = createDemoShell("helpers.bind / helpers.unbind");
    const grid = document.createElement("div");
    const panel = createPanel("Event Target");
    const controls = document.createElement("div");
    const log = document.createElement("pre");
    const target = new EventTarget();
    let isBound = true;

    appendStyles(shell);
    grid.className = "ae-grid";
    controls.className = "ae-controls";
    log.className = "ae-log";

    const listener = (event: Event): void => {
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
      })
    );
    panel.append(controls, log);
    grid.appendChild(panel);
    shell.appendChild(grid);

    return shell;
  },
};
