import type { Meta, StoryObj } from "@storybook/html-vite";
import { GameArena, helpers } from "../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createDemoSprite,
  createPanel,
  createValue,
  drawTopDownShip,
  onRemove,
  setValue,
} from "./story-utils.js";

const meta = {
  title: "Engine/GameArena",
} satisfies Meta;

export default meta;

type Story = StoryObj;

const drawArenaDemo = (arena: GameArena, frame = 0): void => {
  const playerX = arena.posX;
  const playerY = arena.posY;
  const previousPlayerX = helpers.float(Math.sin((frame - 1) / 40) * 80);
  const previousPlayerY = helpers.float(Math.cos((frame - 1) / 50) * 40);
  const playerHeading =
    ((Math.atan2(playerX - previousPlayerX, -(playerY - previousPlayerY)) * 180) /
      Math.PI +
      360) %
    360;
  const wingmanX = -playerX + 58;
  const wingmanY = -playerY - 52;
  const previousWingmanX = -previousPlayerX + 58;
  const previousWingmanY = -previousPlayerY - 52;
  const wingmanHeading =
    ((Math.atan2(wingmanX - previousWingmanX, -(wingmanY - previousWingmanY)) * 180) /
      Math.PI +
      360) %
    360;

  arena.clear();
  arena.setBackgroundColor("#05070a");
  arena.drawDebugGrid(40, 40);
  arena.drawCircle(0, 0, 96, {
    backgroundColor: "rgba(79, 209, 197, 0.12)",
    borderColor: "#4fd1c5",
    borderWidth: 2,
  });
  arena.drawCircle(-90, 72, 28, {
    backgroundColor: "#f6e05e",
    borderColor: "#fff7ae",
  });
  drawTopDownShip(arena.getContext() as CanvasRenderingContext2D, playerX, playerY, {
    accent: "#4fd1c5",
    heading: Number.isFinite(playerHeading) ? playerHeading : 0,
    label: "player",
    scale: 0.9,
    thrust: 0.5,
  });
  drawTopDownShip(arena.getContext() as CanvasRenderingContext2D, wingmanX, wingmanY, {
    accent: "#f6e05e",
    heading: Number.isFinite(wingmanHeading) ? wingmanHeading : 180,
    label: "wingman",
    scale: 0.72,
    thrust: 0.35,
  });
  arena.renderText("ARCADE ENGINE", 0, -130, {
    align: "center",
    color: "#f5f7fb",
    size: 24,
    stroke: "#0f1720",
    strokeWidth: 4,
  });
  arena.renderText(`FRAME ${frame}`, 0, 128, {
    align: "center",
    color: "#f6e05e",
    size: 16,
  });
};

export const CompleteArena: Story = {
  render: () => {
    const shell = createDemoShell("GameArena");
    const grid = document.createElement("div");
    const stagePanel = createPanel("Canvas");
    const statePanel = createPanel("State");
    const stage = document.createElement("div");
    const values = document.createElement("div");
    const widthValue = createValue("width");
    const heightValue = createValue("height");
    const fullscreenValue = createValue("fullscreen");
    const lockedValue = createValue("locked");
    const toggleValue = createValue("can toggle");
    const assetValue = createValue("assets");
    const controls = document.createElement("div");
    let animationFrame = 0;
    let frame = 0;
    let isAnimating = true;

    appendStyles(shell);
    grid.className = "ae-grid";
    stage.className = "ae-stage";
    values.className = "ae-values";
    controls.className = "ae-controls";

    stagePanel.appendChild(stage);
    statePanel.appendChild(values);
    statePanel.appendChild(controls);
    grid.append(stagePanel, statePanel);
    shell.appendChild(grid);

    const arena = new GameArena(stage, {
      debugGridColor: "rgba(245, 247, 251, 0.14)",
      defaultTextColor: "#f5f7fb",
      fontFamily: "monospace",
    });
    arena.resize(720, 420);

    const updateState = (): void => {
      setValue(widthValue, arena.width);
      setValue(heightValue, arena.height);
      setValue(fullscreenValue, String(arena.isFullScreen()));
      setValue(lockedValue, String(arena.isFullScreenLocked()));
      setValue(toggleValue, String(arena.canToggleFullScreen()));
    };

    values.append(
      widthValue,
      heightValue,
      fullscreenValue,
      lockedValue,
      toggleValue,
      assetValue
    );

    controls.append(
      createButton("Redraw", () => {
        drawArenaDemo(arena, ++frame);
      }),
      createButton("Animate", () => {
        isAnimating = !isAnimating;
      }),
      createButton("Resize 640x360", () => {
        arena.resize(640, 360);
        drawArenaDemo(arena, ++frame);
        updateState();
      }),
      createButton("Resize Host", () => {
        arena.resize();
        drawArenaDemo(arena, ++frame);
        updateState();
      }),
      createButton("Preload Assets", () => {
        const sprite = createDemoSprite();
        const source = sprite.toDataURL();

        arena.registerAssets([source, source]);
        arena.preloadAssets(({ loaded, remaining }) => {
          setValue(assetValue, `${loaded} loaded, ${remaining} remaining`);
        });
      }),
      createButton("Fullscreen", () => {
        arena.toggleFullScreen();
        updateState();
      })
    );

    const animate = (): void => {
      if (isAnimating) {
        frame++;
        arena.updatePosition(
          helpers.float(Math.sin(frame / 40) * 80),
          helpers.float(Math.cos(frame / 50) * 40)
        );
        drawArenaDemo(arena, frame);
        updateState();
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    drawArenaDemo(arena, frame);
    updateState();
    animate();
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      arena.destroy();
    });

    return shell;
  },
};
