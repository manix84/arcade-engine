import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  createLocalMultiplayerController,
  createMultiplayerSession,
  createPlayerInputIntent,
  drawCanvasLine,
  fillCanvasWithTrail,
  getAnimatedSpriteFrame,
  getFollowCamera,
  getInputActionState,
  getSpatialAudioMix,
  mergePlayerInputIntent,
} from "../../index.js";
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
  title: "Engine/Systems/New Helpers",
} satisfies Meta;

export default meta;

type Story = StoryObj;

const resizeCanvas = (canvas: HTMLCanvasElement, width = 720, height = 380): void => {
  canvas.width = width;
  canvas.height = height;
};

const createSystemsLayout = (
  title: string
): {
  canvas: HTMLCanvasElement;
  grid: HTMLDivElement;
  metrics: HTMLDivElement;
  shell: HTMLDivElement;
  stage: HTMLDivElement;
  visualPanel: HTMLElement;
} => {
  const shell = createDemoShell(title);
  const grid = document.createElement("div");
  const visualPanel = createPanel("Scene");
  const dataPanel = createPanel("State");
  const stage = document.createElement("div");
  const canvas = document.createElement("canvas");
  const metrics = document.createElement("div");

  appendStyles(shell);
  grid.className = "ae-grid";
  stage.className = "ae-stage";
  metrics.className = "ae-values";
  resizeCanvas(canvas);

  stage.append(canvas);
  visualPanel.append(stage);
  dataPanel.append(metrics);
  grid.append(visualPanel, dataPanel);
  shell.append(grid);

  return { canvas, grid, metrics, shell, stage, visualPanel };
};

export const InputActions: Story = {
  render: () => {
    const { canvas, metrics, shell } = createSystemsLayout("Input actions");
    const context = canvas.getContext("2d");
    const stateValue = createValue("actions");
    const pressedValue = createValue("pressed inputs");
    const bindings = {
      fire: ["Space", "MouseLeft", "TouchPrimary", "Gamepad0"],
      moveLeft: ["ArrowLeft", "KeyA", "GamepadAxisLeftXNegative"],
      moveRight: ["ArrowRight", "KeyD", "GamepadAxisLeftXPositive"],
    };
    const pressedInputs = new Set<string>(["KeyD"]);
    let frame = 0;
    let animationFrame = 0;

    metrics.append(
      stateValue,
      pressedValue,
      createValue("keyboard", "A / D / Space"),
      createValue("mouse touch", "buttons simulate raw codes")
    );

    const controls = document.createElement("div");
    controls.className = "ae-controls";

    const toggleInput = (input: string): void => {
      if (pressedInputs.has(input)) {
        pressedInputs.delete(input);
        return;
      }

      pressedInputs.add(input);
    };

    [
      ["KeyA", "Left"],
      ["KeyD", "Right"],
      ["Space", "Fire"],
      ["MouseLeft", "Mouse"],
      ["TouchPrimary", "Touch"],
      ["Gamepad0", "Pad Fire"],
    ].forEach(([input, label]) => {
      controls.append(createButton(label, () => toggleInput(input)));
    });
    metrics.append(controls);

    const render = (): void => {
      if (!context) {
        return;
      }

      const state = getInputActionState(bindings, pressedInputs);
      const direction = Number(state.moveRight) - Number(state.moveLeft);
      const thrust = state.fire ? 1 : 0.25;
      const x = canvas.width / 2 + direction * 140;

      frame += 1;
      fillCanvasWithTrail(context, canvas, "#05070a", 0.18);
      drawCanvasLine(context, { x: 80, y: 285 }, { x: canvas.width - 80, y: 285 }, "#243241", 3);
      drawTopDownShip(context, x, 210, {
        accent: state.fire ? "#f6e05e" : "#4fd1c5",
        heading: direction * 20,
        label: state.fire ? "fire" : "ready",
        scale: 1,
        thrust,
      });

      context.fillStyle = "rgba(144, 205, 244, 0.18)";
      context.fillRect(x - 28, 292, 56, 12);
      context.fillStyle = "#90cdf4";
      context.fillRect(x - 18 + Math.sin(frame / 12) * 6, 294, 36, 8);

      setValue(
        stateValue,
        Object.entries(state)
          .filter(([, active]) => active)
          .map(([action]) => action)
          .join(", ") || "none"
      );
      setValue(pressedValue, [...pressedInputs].join(", ") || "none");
      animationFrame = window.requestAnimationFrame(render);
    };

    const keyDown = (event: KeyboardEvent): void => {
      if (event.code === "KeyA" || event.code === "KeyD" || event.code === "Space") {
        pressedInputs.add(event.code);
      }
    };
    const keyUp = (event: KeyboardEvent): void => {
      pressedInputs.delete(event.code);
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    });

    return shell;
  },
};

export const LocalMultiplayer: Story = {
  render: () => {
    const { canvas, metrics, shell } = createSystemsLayout("Local multiplayer");
    const context = canvas.getContext("2d");
    const p1Value = createValue("p1");
    const p2Value = createValue("p2");
    const sessionValue = createValue("session");
    const remoteValue = createValue("remote intent");
    const multiplayer = createLocalMultiplayerController([
      {
        bindings: { fire: ["Space", "Gamepad0"], moveLeft: ["KeyA"], moveRight: ["KeyD"] },
        gamepadIndex: 0,
        id: "p1",
        name: "Player 1",
        team: "shared",
      },
      {
        bindings: { fire: ["Enter", "Gamepad0"], moveLeft: ["KeyJ"], moveRight: ["KeyL"] },
        gamepadIndex: 1,
        id: "p2",
        name: "Player 2",
        team: "shared",
      },
    ]);
    const session = createMultiplayerSession({
      id: "demo-room",
      localPeerId: "local",
      mode: "co-op",
      peers: [
        { connection: "local", id: "local", isLocal: true, playerId: "p1", team: "shared" },
        { connection: "local", id: "second", playerId: "p2", team: "shared" },
        { connection: "remote", id: "remote-ghost", playerId: "p3", team: "shared" },
      ],
    });
    let remotePulse = false;
    let remoteState = {};
    let sequence = 0;
    let animationFrame = 0;

    metrics.append(
      p1Value,
      p2Value,
      sessionValue,
      remoteValue,
      createValue("p1 controls", "A / D / Space"),
      createValue("p2 controls", "J / L / Enter")
    );

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("P1 fire", () => multiplayer.press("p1", "Space")),
      createButton("P1 release", () => multiplayer.release("p1", "Space")),
      createButton("P2 fire", () => multiplayer.press("p2", "Enter")),
      createButton("Remote pulse", () => {
        remotePulse = !remotePulse;
        sequence += 1;
        remoteState = mergePlayerInputIntent(
          remoteState,
          createPlayerInputIntent({
            actions: { assist: remotePulse },
            playerId: "p3",
            sequence,
          })
        );
      })
    );
    metrics.append(controls);

    const drawPlayer = (
      x: number,
      y: number,
      label: string,
      state: Record<string, boolean>,
      accent: string
    ): void => {
      if (!context) {
        return;
      }

      const direction = Number(state.moveRight) - Number(state.moveLeft);
      drawTopDownShip(context, x + direction * 54, y, {
        accent: state.fire ? "#f6e05e" : accent,
        heading: direction * 25,
        label,
        scale: 0.88,
        thrust: state.fire ? 0.9 : 0.2,
      });
    };

    const render = (): void => {
      if (!context) {
        return;
      }

      const state = multiplayer.getState();
      const p1 = state.p1 ?? {};
      const p2 = state.p2 ?? {};

      fillCanvasWithTrail(context, canvas, "#05070a", 0.12);
      context.fillStyle = "rgba(79, 209, 197, 0.10)";
      context.fillRect(80, 85, canvas.width - 160, 100);
      context.fillStyle = "rgba(252, 129, 129, 0.10)";
      context.fillRect(80, 215, canvas.width - 160, 100);
      drawPlayer(210, 135, "p1", p1, "#4fd1c5");
      drawPlayer(210, 265, "p2", p2, "#fc8181");

      if ((remoteState as Record<string, Record<string, boolean>>).p3?.assist) {
        context.strokeStyle = "#90cdf4";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(canvas.width - 150, 200, 38, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = "#90cdf4";
        context.fillText("remote p3 assist", canvas.width - 195, 258);
      }

      setValue(
        p1Value,
        Object.entries(p1).filter(([, active]) => active).map(([action]) => action).join(", ") ||
          "idle"
      );
      setValue(
        p2Value,
        Object.entries(p2).filter(([, active]) => active).map(([action]) => action).join(", ") ||
          "idle"
      );
      setValue(sessionValue, `${session.mode}, ${session.peers.length}/${session.maxPlayers}`);
      setValue(remoteValue, JSON.stringify(remoteState));
      animationFrame = window.requestAnimationFrame(render);
    };

    multiplayer.start();
    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      multiplayer.stop();
    });

    return shell;
  },
};

export const SpriteAnimationAndCamera: Story = {
  render: () => {
    const { canvas, metrics, shell } = createSystemsLayout("Sprite animation and camera");
    const context = canvas.getContext("2d");
    const sprite = document.createElement("canvas");
    const spriteContext = sprite.getContext("2d");
    const frameValue = createValue("sprite frame");
    const cameraValue = createValue("camera");
    const targetValue = createValue("target");
    let animationFrame = 0;
    let start = performance.now();
    let paused = false;

    sprite.width = 96;
    sprite.height = 24;
    ["#4fd1c5", "#f6e05e", "#fc8181", "#90cdf4"].forEach((color, index) => {
      if (!spriteContext) {
        return;
      }

      const x = index * 24;
      spriteContext.fillStyle = color;
      spriteContext.fillRect(x + 6, 6, 12, 12);
      spriteContext.fillStyle = "#f5f7fb";
      spriteContext.fillRect(x + 9, 3 + (index % 2) * 2, 6, 5);
      spriteContext.fillStyle = "#05070a";
      spriteContext.fillRect(x + 11, 9, 4, 4);
    });

    metrics.append(frameValue, cameraValue, targetValue, createValue("uses", "getAnimatedSpriteFrame + getFollowCamera"));
    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Pause", () => {
        paused = !paused;
      }),
      createButton("Restart", () => {
        start = performance.now();
      })
    );
    metrics.append(controls);

    const render = (now: number): void => {
      if (!context) {
        return;
      }

      const elapsedSeconds = paused ? 0 : (now - start) / 1000;
      const world = { height: 520, width: 1320 };
      const target = {
        posX: 660 + Math.sin(elapsedSeconds * 0.7) * 420,
        posY: 260 + Math.cos(elapsedSeconds * 0.9) * 130,
      };
      const camera = getFollowCamera({
        current: { posX: 280, posY: 90 },
        deadZone: { height: 80, width: 120 },
        smoothing: 0.18,
        target,
        viewport: canvas,
        worldBounds: world,
      });
      const frame = getAnimatedSpriteFrame({
        columns: 4,
        elapsedSeconds,
        fps: 8,
        frameCount: 4,
        frameHeight: 24,
        frameWidth: 24,
        posX: target.posX - camera.posX - 24,
        posY: target.posY - camera.posY - 24,
        renderHeight: 48,
        renderWidth: 48,
      });

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.translate(-camera.posX, -camera.posY);
      context.strokeStyle = "rgba(245, 247, 251, 0.08)";

      for (let x = 0; x <= world.width; x += 80) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, world.height);
        context.stroke();
      }

      for (let y = 0; y <= world.height; y += 80) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(world.width, y);
        context.stroke();
      }

      context.strokeStyle = "#243241";
      context.strokeRect(0, 0, world.width, world.height);
      context.restore();
      context.drawImage(
        sprite,
        frame.frameX,
        frame.frameY,
        frame.frameWidth,
        frame.frameHeight,
        frame.posX,
        frame.posY,
        frame.renderWidth,
        frame.renderHeight
      );

      context.strokeStyle = "#f6e05e";
      context.strokeRect(canvas.width / 2 - 60, canvas.height / 2 - 40, 120, 80);
      setValue(frameValue, `${frame.frameX / 24}`);
      setValue(cameraValue, `${Math.round(camera.posX)}, ${Math.round(camera.posY)}`);
      setValue(targetValue, `${Math.round(target.posX)}, ${Math.round(target.posY)}`);
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => window.cancelAnimationFrame(animationFrame));

    return shell;
  },
};

export const SpatialAudioMath: Story = {
  render: () => {
    const { canvas, metrics, shell } = createSystemsLayout("Spatial audio math");
    const context = canvas.getContext("2d");
    const distanceValue = createValue("distance");
    const panValue = createValue("pan");
    const gainValue = createValue("gain");
    let animationFrame = 0;
    let frame = 0;

    metrics.append(
      distanceValue,
      panValue,
      gainValue,
      createValue("uses", "getSpatialAudioMix"),
      createValue("audio", "math only, no autoplay")
    );

    const render = (): void => {
      if (!context) {
        return;
      }

      frame += 1;
      const listener = { posX: canvas.width / 2, posY: canvas.height / 2 };
      const source = {
        posX: listener.posX + Math.cos(frame / 80) * 240,
        posY: listener.posY + Math.sin(frame / 55) * 120,
      };
      const mix = getSpatialAudioMix({
        listener,
        listenerRange: 260,
        maxDistance: 360,
        source,
      });

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "rgba(245, 247, 251, 0.12)";
      context.beginPath();
      context.arc(listener.posX, listener.posY, 260, 0, Math.PI * 2);
      context.stroke();
      drawCanvasLine(
        context,
        { x: listener.posX, y: listener.posY },
        { x: source.posX, y: source.posY },
        "#243241",
        3
      );
      drawTopDownShip(context, listener.posX, listener.posY, {
        accent: "#4fd1c5",
        heading: 0,
        label: "listener",
        scale: 0.75,
      });
      context.fillStyle = `rgba(246, 224, 94, ${Math.max(0.2, mix.gain)})`;
      context.beginPath();
      context.arc(source.posX, source.posY, 22 + mix.gain * 24, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#f6e05e";
      context.fillText("source", source.posX - 18, source.posY + 48);

      setValue(distanceValue, Math.round(mix.distance));
      setValue(panValue, mix.pan.toFixed(2));
      setValue(gainValue, mix.gain.toFixed(2));
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => window.cancelAnimationFrame(animationFrame));

    return shell;
  },
};
