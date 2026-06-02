import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  GameArena,
  Ticker,
  colorWithAlpha,
  drawCanvasLine,
  drawCanvasPolygon,
  getDepthProgress,
  getLoopedDepth,
  helpers,
  projectPerspectivePoint,
} from "../index.js";
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
  title: "Engine/Core/GameArena",
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

const drawArena3DDemo = (
  arena: GameArena,
  elapsedSeconds: number,
  pointer: { x: number; y: number }
): void => {
  const context = arena.getContext() as CanvasRenderingContext2D;
  const viewport = { height: arena.height, width: arena.width };
  const centerX = arena.width / 2 + pointer.x * 72;
  const horizon = arena.height * 0.42 + pointer.y * 34;
  const depth = 30;

  arena.clear();
  arena.setBackgroundColor("#05070a");

  context.save();
  context.translate(-arena.width / 2, -arena.height / 2);
  context.fillStyle = colorWithAlpha("#4fd1c5", 0.08);
  context.fillRect(0, 0, arena.width, horizon);
  context.fillStyle = colorWithAlpha("#f6e05e", 0.06);
  context.fillRect(0, horizon, arena.width, arena.height - horizon);

  drawCanvasPolygon(
    context,
    [
      { x: centerX - 64, y: horizon },
      { x: centerX + 64, y: horizon },
      { x: arena.width / 2 + 270 + pointer.x * 22, y: arena.height },
      { x: arena.width / 2 - 270 + pointer.x * 22, y: arena.height },
    ],
    "rgba(8, 12, 18, 0.92)",
    colorWithAlpha("#4fd1c5", 0.42)
  );

  for (let index = 0; index < 22; index++) {
    const z = getLoopedDepth({
      depth,
      elapsedSeconds,
      index,
      spacing: 2.2,
      speed: 8,
    });
    const progress = getDepthProgress(z, depth);
    const left = projectPerspectivePoint(
      { x: -210, y: 235, z },
      viewport,
      { centerX, horizon }
    );
    const right = projectPerspectivePoint(
      { x: 210, y: 235, z },
      viewport,
      { centerX, horizon }
    );

    drawCanvasLine(
      context,
      left,
      right,
      colorWithAlpha(index % 2 === 0 ? "#f6e05e" : "#4fd1c5", 0.18 + progress * 0.55),
      Math.max(1, progress * 5)
    );
  }

  for (let index = 0; index < 9; index++) {
    const z = getLoopedDepth({
      depth,
      elapsedSeconds,
      index,
      offset: 4,
      spacing: 4.1,
      speed: 5.5,
    });
    const side = index % 2 === 0 ? -1 : 1;
    const beacon = projectPerspectivePoint(
      { x: side * 185, y: 130, z },
      viewport,
      { centerX, horizon }
    );
    const size = Math.max(5, beacon.scale * 32);

    context.beginPath();
    context.arc(beacon.x, beacon.y, size, 0, Math.PI * 2);
    context.fillStyle = colorWithAlpha(index % 2 === 0 ? "#f6e05e" : "#4fd1c5", 0.42);
    context.fill();
    context.strokeStyle = colorWithAlpha("#ffffff", 0.24);
    context.lineWidth = 1;
    context.stroke();
  }

  context.restore();
  drawTopDownShip(context, pointer.x * 22, 126 + pointer.y * 10, {
    accent: "#4fd1c5",
    heading: pointer.x * 18,
    label: "arena",
    scale: 0.78,
    thrust: 0.45,
  });
  arena.renderText("GAMEARENA 3D CANVAS", 0, -156, {
    align: "center",
    color: "#f5f7fb",
    size: 22,
    stroke: "#0f1720",
    strokeWidth: 4,
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

export const PerspectiveArena: Story = {
  render: () => {
    const shell = createDemoShell("GameArena 3D canvas");
    const grid = document.createElement("div");
    const stagePanel = createPanel("Canvas");
    const statePanel = createPanel("State");
    const stage = document.createElement("div");
    const values = document.createElement("div");
    const controls = document.createElement("div");
    const modeValue = createValue("mode", "pseudo 3D");
    const pointerValue = createValue("pointer", "0, 0");
    const fpsValue = createValue("fps", "0");
    const arena = new GameArena(stage, {
      debugGridColor: "rgba(245, 247, 251, 0.10)",
      defaultTextColor: "#f5f7fb",
      fontFamily: "monospace",
    });
    const ticker = new Ticker();
    const pointer = { x: 0, y: 0 };
    let lastTime = performance.now();
    let elapsedSeconds = 0;
    let fpsAge = 0;
    let fpsFrames = 0;
    let scheduleId = 0;

    appendStyles(shell);
    grid.className = "ae-grid";
    stage.className = "ae-stage";
    values.className = "ae-values";
    controls.className = "ae-controls";
    stagePanel.appendChild(stage);
    statePanel.append(values, controls);
    grid.append(stagePanel, statePanel);
    shell.appendChild(grid);

    arena.resize(720, 420);
    const canvas = arena.getElement();

    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    values.append(modeValue, pointerValue, fpsValue);
    controls.append(
      createButton("Reset View", () => {
        pointer.x = 0;
        pointer.y = 0;
      })
    );

    const updatePointer = (event: PointerEvent): void => {
      const bounds = canvas.getBoundingClientRect();

      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    };
    const handlePointerDown = (event: PointerEvent): void => {
      updatePointer(event);
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(event.pointerId);
    };
    const handlePointerMove = (event: PointerEvent): void => updatePointer(event);
    const handlePointerUp = (event: PointerEvent): void => {
      canvas.style.cursor = "grab";

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);

    scheduleId = ticker.addSchedule(() => {
      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);

      elapsedSeconds += delta;
      fpsAge += delta;
      fpsFrames += 1;
      lastTime = now;

      if (fpsAge >= 0.5) {
        setValue(fpsValue, Math.round(fpsFrames / fpsAge));
        fpsAge = 0;
        fpsFrames = 0;
      }

      setValue(pointerValue, `${pointer.x.toFixed(2)}, ${pointer.y.toFixed(2)}`);
      drawArena3DDemo(arena, elapsedSeconds, pointer);
    }, 1);
    ticker.start();

    drawArena3DDemo(arena, elapsedSeconds, pointer);
    onRemove(shell, () => {
      ticker.removeSchedule(scheduleId);
      ticker.stop();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      arena.destroy();
    });

    return shell;
  },
};
