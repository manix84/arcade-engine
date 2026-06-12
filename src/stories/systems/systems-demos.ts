import type { StoryObj } from "@storybook/html-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  addAchievementProgress,
  applyGravity2D,
  applyGravity3D,
  AchievementNotificationRenderer,
  createAtmosphericAshEmberEffect,
  createAtmosphericRainEffect,
  createAtmosphericSnowEffect,
  createAchievementState,
  createHighScoreIntegrity,
  createHighScoreManager,
  createUserOptionsStore,
  defaultCustomDisplayFilterSettings,
  displayFilterModeLabels,
  displayFilterModes,
  environmentFireEffectId,
  environmentFrostEffectId,
  environmentHeatEffectId,
  environmentUnderwaterEffectId,
  getDisplayFilterSettingsForMode,
  createRagdoll2D,
  createRagdoll3D,
  createLocalMultiplayerController,
  createMultiplayerSession,
  createPlayerInputIntent,
  createProceduralStarfield,
  ScreenEffectManager,
  screenDropletsEffectId,
  screenFireEffectId,
  screenFrostEffectId,
  screenLowHealthEffectId,
  screenPoisonEffectId,
  screenShockEffectId,
  screenSpeedBoostEffectId,
  colorWithAlpha,
  createRayTracingRectangle,
  drawCanvasLine,
  drawCanvasPolygon,
  fillCanvasWithTrail,
  getAchievementStatuses,
  getAnimatedSpriteFrame,
  getFollowCamera,
  getHighScorePlausibilityReasons,
  getInputActionState,
  getSpatialAudioMix,
  mergePlayerInputIntent,
  stepRagdoll2D,
  stepRagdoll3D,
  unlockAchievement,
  validateHighScoreSubmission,
  type AchievementDefinition,
  type AchievementState,
  type AtmosphericAshEmberIntensity,
  type AtmosphericPlayerMotion,
  type AtmosphericRainDensity,
  type AtmosphericSnowDensity,
  type HighScoreEntry,
  type HighScoreRunReceipt,
  type HighScoreStorage,
  type DisplayFilterMode,
  type UserOptionsStorage,
  type Ragdoll2D as PhysicsRagdoll2D,
  type Ragdoll3D as PhysicsRagdoll3D,
  type RagdollConstraint,
  type RagdollPoint2D,
  type RagdollPoint3D,
  type RayTracingBounce,
  type RayTracingBounds,
  type RayTracingPoint,
  type RayTracingPolygon,
  type RayTracingSurface,
  traceLightBounces,
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
import { drawFpsDemoScene } from "../fps-demo-scene.js";

type DemoAchievementId = "first-sortie" | "wave-breaker" | "precision-run";
type AtmosphericMotionPreset = "still" | "walk-forward" | "turn-left" | "turn-right" | "patrol-loop";

type SystemsStoryArgs = {
  baseScoreBudget?: number;
  displayFilterMode?: DisplayFilterMode;
  displayFilterBoost?: number;
  highScoreValue?: number;
  bounceAttenuation?: number;
  lampLightIntensity?: number;
  lightBounces?: number;
  showLightRayGuides?: boolean;
  lowScoreValue?: number;
  maxAcceptedScore?: number;
  onAchievementProgress?: (id: DemoAchievementId) => void;
  onAchievementNotification?: (name: string) => void;
  onAchievementReset?: () => void;
  onAchievementUnlock?: (id: DemoAchievementId) => void;
  comboMotionEnabled?: boolean;
  comboMotionPreset?: AtmosphericMotionPreset;
  onAshEmberChange?: (
    intensity: AtmosphericAshEmberIntensity,
    wind: number,
    emberRatio: number
  ) => void;
  ashEmberIntensity?: AtmosphericAshEmberIntensity;
  ashEmberRatio?: number;
  ashEmberWind?: number;
  onHighScoreSave?: (entry: HighScoreEntry) => void;
  onHighScoreTamper?: (accepted: boolean, label: string) => void;
  onHighScoreValidate?: (accepted: boolean, label: string) => void;
  onRainChange?: (
    density: AtmosphericRainDensity,
    wind: number,
    motionPreset: AtmosphericMotionPreset,
    motionEnabled: boolean
  ) => void;
  onAtmosphericMotionChange?: (effect: string, preset: AtmosphericMotionPreset, enabled: boolean) => void;
  onScreenEffectChange?: (intensity: number) => void;
  onSnowChange?: (
    density: AtmosphericSnowDensity,
    wind: number,
    accumulationEnabled: boolean
  ) => void;
  onStarfieldMotionChange?: (label: string) => void;
  rainDensity?: AtmosphericRainDensity;
  rainMotionEnabled?: boolean;
  rainMotionPreset?: AtmosphericMotionPreset;
  rainWind?: number;
  snowMotionEnabled?: boolean;
  snowMotionPreset?: AtmosphericMotionPreset;
  screenEffectIntensity?: number;
  snowAccumulationEnabled?: boolean;
  snowDensity?: AtmosphericSnowDensity;
  snowWind?: number;
  ashEmberMotionEnabled?: boolean;
  ashEmberMotionPreset?: AtmosphericMotionPreset;
  onUserOptionsChange?: (options: Record<string, unknown>) => void;
  precisionGoal?: number;
  tvLightIntensity?: number;
  waveGoal?: number;
  windowLightIntensity?: number;
};

type Story = StoryObj<SystemsStoryArgs>;

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

const getDemoAchievementDefinitions = (
  waveGoal: number,
  precisionGoal: number
): readonly AchievementDefinition<DemoAchievementId>[] => [
  {
    description: "Start a tracked run.",
    id: "first-sortie",
    name: "First Sortie",
  },
  {
    description: "Clear 3 attack waves.",
    id: "wave-breaker",
    name: "Wave Breaker",
    progressGoal: waveGoal,
  },
  {
    description: "Land 5 precision shots.",
    id: "precision-run",
    name: "Precision Run",
    progressGoal: precisionGoal,
  },
];

const drawAchievementBoard = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  definitions: readonly AchievementDefinition<DemoAchievementId>[],
  state: AchievementState<DemoAchievementId>
): void => {
  const statuses = getAchievementStatuses(definitions, state);

  context.fillStyle = "#05070a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#cbd5e1";
  context.font = "18px sans-serif";
  context.fillText("Achievement state", 38, 48);

  statuses.forEach((status, index) => {
    const y = 86 + index * 86;
    const progress = status.progress
      ? status.progress.current / Math.max(1, status.progress.goal)
      : status.unlocked
        ? 1
        : 0;
    const accent = status.unlocked ? "#f6e05e" : "#4fd1c5";

    context.fillStyle = "rgba(245, 247, 251, 0.06)";
    context.fillRect(38, y, canvas.width - 76, 62);
    context.fillStyle = status.unlocked
      ? "rgba(246, 224, 94, 0.24)"
      : "rgba(79, 209, 197, 0.18)";
    context.fillRect(38, y, (canvas.width - 76) * progress, 62);
    context.strokeStyle = accent;
    context.lineWidth = 2;
    context.strokeRect(38, y, canvas.width - 76, 62);
    context.fillStyle = accent;
    context.font = "16px sans-serif";
    context.fillText(status.name, 58, y + 25);
    context.fillStyle = "#cbd5e1";
    context.font = "13px sans-serif";
    context.fillText(status.description, 58, y + 47);
    context.fillStyle = status.unlocked ? "#f6e05e" : "#90cdf4";
    context.textAlign = "right";
    context.fillText(
      status.progress
        ? `${status.progress.current}/${status.progress.goal}`
        : status.unlocked
          ? "unlocked"
          : "locked",
      canvas.width - 58,
      y + 36
    );
    context.textAlign = "start";
  });
};

const achievementsPlay: Story["play"] = async ({
  args,
  canvasElement,
}) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByRole("button", { name: "Start Run" }));
  await waitFor(() => expect(canvas.getByText("first-sortie")).toBeVisible());
  await expect(args.onAchievementUnlock!).toHaveBeenCalledWith("first-sortie");

  await userEvent.click(canvas.getByRole("button", { name: "Clear Wave" }));
  await userEvent.click(canvas.getByRole("button", { name: "Clear Wave" }));
  await userEvent.click(canvas.getByRole("button", { name: "Clear Wave" }));
  await waitFor(() =>
    expect(canvas.getByText("wave-breaker 3/3, precision-run 0/5")).toBeVisible()
  );
  await expect(args.onAchievementProgress!).toHaveBeenCalledTimes(3);

  await userEvent.click(canvas.getByRole("button", { name: "Precision Shot" }));
  await waitFor(() =>
    expect(canvas.getByText("wave-breaker 3/3, precision-run 1/5")).toBeVisible()
  );
  await expect(args.onAchievementProgress!).toHaveBeenCalledWith("precision-run");

  await userEvent.click(canvas.getByRole("button", { name: "Reset" }));
  await waitFor(() => expect(canvas.getAllByText("none").length).toBeGreaterThan(0));
  await expect(args.onAchievementReset!).toHaveBeenCalledTimes(1);
};

export const Achievements: Story = {
  args: {
    onAchievementProgress: fn(),
    onAchievementReset: fn(),
    onAchievementUnlock: fn(),
    precisionGoal: 5,
    waveGoal: 3,
  },
  argTypes: {
    precisionGoal: { control: { max: 10, min: 1, step: 1, type: "range" } },
    waveGoal: { control: { max: 10, min: 1, step: 1, type: "range" } },
  },
  play: achievementsPlay,
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("Achievement helpers");
    const context = canvas.getContext("2d");
    const definitions = getDemoAchievementDefinitions(
      args.waveGoal ?? 3,
      args.precisionGoal ?? 5
    );
    const unlockedValue = createValue("unlocked");
    const progressValue = createValue("progress");
    const lastValue = createValue("last change", "ready");
    let state = createAchievementState<DemoAchievementId>();
    let unlockedAt = 1000;

    metrics.append(
      unlockedValue,
      progressValue,
      lastValue,
      createValue("uses", "createAchievementState + addAchievementProgress")
    );

    const updateMetrics = (lastChange: string): void => {
      const statuses = getAchievementStatuses(definitions, state);
      const progress = statuses
        .filter((status) => status.progress)
        .map(
          (status) =>
            `${status.id} ${status.progress?.current}/${status.progress?.goal}`
        )
        .join(", ");

      setValue(unlockedValue, state.unlocked.join(", ") || "none");
      setValue(progressValue, progress || "none");
      setValue(lastValue, lastChange);

      if (context) {
        drawAchievementBoard(context, canvas, definitions, state);
      }
    };

    const unlock = (id: DemoAchievementId): void => {
      unlockedAt += 500;
      const result = unlockAchievement(state, id, unlockedAt);

      state = result.state;
      updateMetrics(result.unlocked ? `unlocked ${id}` : `${id} already unlocked`);
    };

    const addProgress = (id: DemoAchievementId): void => {
      unlockedAt += 500;
      const result = addAchievementProgress(
        definitions,
        state,
        id,
        1,
        unlockedAt
      );

      state = result.state;
      updateMetrics(result.unlocked ? `unlocked ${id}` : `advanced ${id}`);
    };

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Start Run", () => {
        args.onAchievementUnlock?.("first-sortie");
        unlock("first-sortie");
      }),
      createButton("Clear Wave", () => {
        args.onAchievementProgress?.("wave-breaker");
        addProgress("wave-breaker");
      }),
      createButton("Precision Shot", () => {
        args.onAchievementProgress?.("precision-run");
        addProgress("precision-run");
      }),
      createButton("Reset", () => {
        args.onAchievementReset?.();
        state = createAchievementState();
        updateMetrics("reset");
      })
    );
    metrics.append(controls);
    updateMetrics("ready");

    return shell;
  },
};

export const AchievementNotifications: Story = {
  args: {
    onAchievementNotification: fn(),
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("Achievement notifications");
    const context = canvas.getContext("2d");
    const queueValue = createValue("queue", 0);
    const lastValue = createValue("last unlock", "none");
    const usesValue = createValue("uses", "AchievementNotificationRenderer");
    let animationFrame = 0;

    metrics.append(queueValue, lastValue, usesValue);

    if (!context) {
      return shell;
    }

    const renderer = new AchievementNotificationRenderer({
      context,
      getViewport: () => ({ height: canvas.height, width: canvas.width }),
      layout: {
        bottomOffset: 54,
      },
      scale: 1,
    });

    const drawBackdrop = (): void => {
      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "rgba(245, 247, 251, 0.12)";
      context.strokeRect(48, 54, canvas.width - 96, canvas.height - 108);
      context.fillStyle = "#cbd5e1";
      context.font = "18px sans-serif";
      context.fillText("Achievement popup queue", 64, 88);
    };

    const enqueue = (name: string, description: string): void => {
      renderer.enqueue({ description, name });
      args.onAchievementNotification?.(name);
      setValue(lastValue, name);
      setValue(queueValue, renderer.getQueueLength());
    };

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Unlock Wave", () =>
        enqueue("Wave Breaker", "Clear a full wave without losing momentum.")
      ),
      createButton("Unlock Precision", () =>
        enqueue("Precision Run", "Land five clean shots in a row.")
      )
    );
    metrics.append(controls);

    const render = (): void => {
      drawBackdrop();
      renderer.render();
      setValue(queueValue, renderer.getQueueLength());
      animationFrame = window.requestAnimationFrame(render);
    };

    enqueue("First Sortie", "Start a tracked run and survive the opening pass.");
    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      renderer.destroy();
    });

    return shell;
  },
};

const createStoryStorage = (): HighScoreStorage => {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};

const demoDefaultHighScores: HighScoreEntry[] = [
  { id: "default-1", name: "NOVA", score: 9000, stats: ["Waves: 3"] },
  { id: "default-2", name: "BYTE", score: 6200, stats: ["Waves: 2"] },
  { id: "default-3", name: "KAI", score: 3400, stats: ["Waves: 1"] },
];

const demoRunReceipt: HighScoreRunReceipt = {
  issuedAt: 1700000000000,
  runId: "story-run-1",
  token: "story-token",
};

const drawHighScoreBoard = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  scores: readonly HighScoreEntry[],
  validationLabel: string
): void => {
  const maxScore = Math.max(1, ...scores.map((score) => score.score));

  context.fillStyle = "#05070a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#cbd5e1";
  context.font = "18px sans-serif";
  context.fillText("High-score table", 38, 48);

  scores.forEach((score, index) => {
    const y = 82 + index * 54;
    const width = (canvas.width - 210) * (score.score / maxScore);

    context.fillStyle = "rgba(245, 247, 251, 0.06)";
    context.fillRect(38, y, canvas.width - 76, 34);
    context.fillStyle =
      index === 0 ? "rgba(246, 224, 94, 0.38)" : "rgba(79, 209, 197, 0.28)";
    context.fillRect(166, y, width, 34);
    context.fillStyle = index === 0 ? "#f6e05e" : "#cbd5e1";
    context.font = "16px monospace";
    context.fillText(`${String(index + 1).padStart(2, "0")} ${score.name}`, 52, y + 23);
    context.textAlign = "right";
    context.fillText(String(score.score), canvas.width - 54, y + 23);
    context.textAlign = "start";
  });

  context.fillStyle = validationLabel.startsWith("accepted") ? "#4fd1c5" : "#fc8181";
  context.font = "14px sans-serif";
  context.fillText(validationLabel, 38, canvas.height - 38);
};

const highScoresPlay: Story["play"] = async ({
  args,
  canvasElement,
}) => {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByRole("button", { name: "Save 12,400" }));
  await waitFor(() => expect(canvas.getByText("Ace 12400")).toBeVisible());
  await expect(args.onHighScoreSave!).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Ace", score: 12400 })
  );

  await userEvent.click(canvas.getByRole("button", { name: "Save 4,200" }));
  await waitFor(() =>
    expect(args.onHighScoreSave!).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Rae", score: 4200 })
    )
  );
  await expect(args.onHighScoreSave!).toHaveBeenCalledTimes(2);

  await userEvent.click(canvas.getByRole("button", { name: "Validate" }));
  await waitFor(() => expect(canvas.getByText("accepted 12400")).toBeVisible());
  await expect(args.onHighScoreValidate!).toHaveBeenCalledWith(
    true,
    "accepted 12400"
  );

  await userEvent.click(canvas.getByRole("button", { name: "Tamper" }));
  await waitFor(() =>
    expect(canvas.getByText("422 invalid_score_integrity")).toBeVisible()
  );
  await expect(args.onHighScoreTamper!).toHaveBeenCalledWith(
    false,
    "422 invalid_score_integrity"
  );
};

export const HighScores: Story = {
  args: {
    baseScoreBudget: 1000,
    highScoreValue: 12400,
    lowScoreValue: 4200,
    maxAcceptedScore: 50000,
    onHighScoreSave: fn(),
    onHighScoreTamper: fn(),
    onHighScoreValidate: fn(),
  },
  argTypes: {
    baseScoreBudget: { control: { max: 5000, min: 0, step: 100, type: "range" } },
    highScoreValue: { control: { max: 30000, min: 1000, step: 100, type: "range" } },
    lowScoreValue: { control: { max: 10000, min: 1000, step: 100, type: "range" } },
    maxAcceptedScore: { control: { max: 100000, min: 5000, step: 1000, type: "range" } },
  },
  play: highScoresPlay,
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("High-score helpers");
    const context = canvas.getContext("2d");
    const leaderValue = createValue("leader");
    const thresholdValue = createValue("top 3 threshold");
    const validationValue = createValue("validation", "not run");
    const plausibilityValue = createValue("plausibility", "not run");
    let now = 1700000001000;
    const manager = createHighScoreManager({
      apiEnabled: false,
      defaultScores: demoDefaultHighScores,
      maxScores: 5,
      now: () => {
        now += 1000;
        return now;
      },
      random: () => 0.42,
      storage: createStoryStorage(),
      storageKey: "storybook.highScores",
    });

    metrics.append(
      leaderValue,
      thresholdValue,
      validationValue,
      plausibilityValue,
      createValue("uses", "createHighScoreManager + validateHighScoreSubmission")
    );

    const getValidationLabel = (): string =>
      String(validationValue.querySelector("strong")?.textContent ?? "not run");

    const refresh = (validationLabel = getValidationLabel()): void => {
      const scores = manager.getHighScores();
      const threshold = manager.getHighScoreThresholds(3).at(-1);

      setValue(leaderValue, scores[0] ? `${scores[0].name} ${scores[0].score}` : "none");
      setValue(thresholdValue, threshold ? String(threshold.score) : "none");

      if (context) {
        drawHighScoreBoard(context, canvas, scores, validationLabel);
      }
    };

    const getRules = () => ({
      baseScoreBudget: args.baseScoreBudget ?? 1000,
      maxScore: args.maxAcceptedScore ?? 50000,
      scoreBudget: [
        { points: 2400, stat: "Waves" },
        { points: 80, stat: "Accuracy" },
      ],
    });

    const saveScore = (name: string, score: number, stats: string[]): void => {
      const entry = manager.saveHighScore(name, score, stats, demoRunReceipt);
      const reasons = getHighScorePlausibilityReasons(entry, getRules());

      args.onHighScoreSave?.(entry);
      setValue(plausibilityValue, reasons.join(", ") || "plausible");
      refresh(`saved ${entry.name}`);
    };

    const validateScore = (tampered: boolean): void => {
      const submittedAt = 1700000005000;
      const entry: HighScoreEntry = {
        createdAt: submittedAt,
        id: "submitted-story-score",
        name: "ACE",
        score: args.highScoreValue ?? 12400,
        stats: ["Waves: 5", "Accuracy: 80"],
      };
      const integrity = createHighScoreIntegrity(
        { ...entry, submittedAt },
        demoRunReceipt,
        { multiplier: 151 }
      );
      const score = tampered ? { ...entry, score: 999999 } : entry;
      const result = validateHighScoreSubmission(
        {
          entry: score,
          gameVersion: "storybook",
          integrity,
          run: demoRunReceipt,
          submittedAt,
        },
        {
          isRunReceiptTrusted: (run) => run.runId === demoRunReceipt.runId,
          rules: getRules(),
        }
      );
      const label =
        result.accepted === true
          ? `accepted ${result.score.score}`
          : `${result.status} ${result.error}`;

      if (tampered) {
        args.onHighScoreTamper?.(result.accepted, label);
      } else {
        args.onHighScoreValidate?.(result.accepted, label);
      }
      setValue(validationValue, label);
      setValue(
        plausibilityValue,
        getHighScorePlausibilityReasons(score, getRules()).join(", ") ||
          "plausible"
      );
      refresh(label);
    };

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Save 4,200", () => {
        saveScore("Rae!", args.lowScoreValue ?? 4200, ["Waves: 1", "Accuracy: 40"]);
      }),
      createButton("Save 12,400", () => {
        saveScore("Ace", args.highScoreValue ?? 12400, ["Waves: 5", "Accuracy: 80"]);
      }),
      createButton("Validate", () => validateScore(false)),
      createButton("Tamper", () => validateScore(true))
    );
    metrics.append(controls);
    refresh();

    return shell;
  },
};

type DemoUserOptions = {
  fullscreen: boolean;
  inputMode: "keyboard" | "touch";
  volume: number;
};

const createDemoUserOptionsStorage = (): UserOptionsStorage => {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};

export const UserOptions: Story = {
  args: {
    onUserOptionsChange: fn(),
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("User option store");
    const context = canvas.getContext("2d");
    const optionsValue = createValue("options");
    const sourceValue = createValue("last source", "ready");
    const changedValue = createValue("changed keys", "none");
    const storageValue = createValue("stored", "defaults");
    const storage = createDemoUserOptionsStorage();
    const store = createUserOptionsStore<DemoUserOptions>({
      defaults: {
        fullscreen: false,
        inputMode: "keyboard",
        volume: 6,
      },
      normalize: (stored, defaults) => {
        const value = stored && typeof stored === "object" ? stored : {};
        const record = value as Partial<DemoUserOptions>;

        return {
          fullscreen:
            typeof record.fullscreen === "boolean"
              ? record.fullscreen
              : defaults.fullscreen,
          inputMode: record.inputMode === "touch" ? "touch" : defaults.inputMode,
          volume:
            typeof record.volume === "number" && Number.isFinite(record.volume)
              ? Math.max(0, Math.min(10, Math.round(record.volume)))
              : defaults.volume,
        };
      },
      storage,
      storageKey: "storybook.userOptions",
      version: 1,
    });

    metrics.append(
      optionsValue,
      sourceValue,
      changedValue,
      storageValue,
      createValue("uses", "createUserOptionsStore")
    );

    const drawOptions = (): void => {
      if (!context) {
        return;
      }

      const current = store.getOptions();

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#cbd5e1";
      context.font = "18px sans-serif";
      context.fillText("Persisted user options", 38, 48);
      [
        ["Volume", `${current.volume}/10`, current.volume / 10],
        ["Input", current.inputMode, current.inputMode === "touch" ? 1 : 0.35],
        ["Fullscreen", current.fullscreen ? "on" : "off", current.fullscreen ? 1 : 0.25],
      ].forEach(([label, value, percent], index) => {
        const y = 92 + index * 64;
        const progress = typeof percent === "number" ? percent : 0;

        context.fillStyle = "rgba(245, 247, 251, 0.06)";
        context.fillRect(38, y, canvas.width - 76, 36);
        context.fillStyle = "rgba(79, 209, 197, 0.26)";
        context.fillRect(38, y, (canvas.width - 76) * progress, 36);
        context.fillStyle = "#f5f7fb";
        context.font = "15px sans-serif";
        context.fillText(String(label), 54, y + 23);
        context.textAlign = "right";
        context.fillText(String(value), canvas.width - 54, y + 23);
        context.textAlign = "start";
      });
    };

    const updateValues = (source = "ready", changedKeys: string[] = []): void => {
      const current = store.getOptions();

      setValue(optionsValue, JSON.stringify(current));
      setValue(sourceValue, source);
      setValue(changedValue, changedKeys.join(", ") || "none");
      setValue(storageValue, storage.getItem("storybook.userOptions") ?? "none");
      args.onUserOptionsChange?.(current);
      drawOptions();
    };

    store.subscribe((change) => {
      updateValues(String(change.source), change.changedKeys.map(String));
    });

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Volume Up", () => {
        const current = store.getOptions();

        store.setOption("volume", Math.min(10, current.volume + 1));
      }),
      createButton("Toggle Input", () => {
        const current = store.getOptions();

        store.setOption(
          "inputMode",
          current.inputMode === "keyboard" ? "touch" : "keyboard"
        );
      }),
      createButton("Fullscreen", () => {
        const current = store.getOptions();

        store.setOption("fullscreen", !current.fullscreen);
      }),
      createButton("Reset", () => {
        store.reset();
      })
    );
    metrics.append(controls);
    updateValues();

    return shell;
  },
};

export const DisplayFilters: Story = {
  args: {
    displayFilterBoost: 18,
    displayFilterMode: "arcade-crt",
  },
  argTypes: {
    displayFilterBoost: {
      control: { max: 60, min: 0, step: 1, type: "range" },
    },
    displayFilterMode: {
      control: "select",
      labels: displayFilterModeLabels,
      options: displayFilterModes.filter((mode) => mode !== "custom"),
    },
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("Display filters");
    const context = canvas.getContext("2d");
    const mode = args.displayFilterMode ?? "arcade-crt";
    const boost = args.displayFilterBoost ?? 18;
    const settings = getDisplayFilterSettingsForMode(
      mode,
      defaultCustomDisplayFilterSettings,
      {
        bulletPersistenceBoost: boost,
        explosionBloomBoost: boost,
        lowHealthInstabilityBoost: Math.round(boost / 2),
        timeWarpDistortionBoost: Math.round(boost / 3),
      }
    );
    const modeValue = createValue("mode", displayFilterModeLabels[mode]);
    const bloomValue = createValue("bloom", settings.bloom);
    const scanlineValue = createValue("scanlines", settings.scanlines);
    const interferenceValue = createValue("interference", settings.interference);
    const usesValue = createValue("uses", "getDisplayFilterSettingsForMode");

    metrics.append(modeValue, bloomValue, scanlineValue, interferenceValue, usesValue);

    if (context) {
      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const cellSize = 32;

      for (let y = 0; y < canvas.height; y += cellSize) {
        for (let x = 0; x < canvas.width; x += cellSize) {
          const lit = (x / cellSize + y / cellSize) % 2 === 0;
          const alpha = lit ? 0.78 : 0.34;

          context.fillStyle = `rgba(79, 209, 197, ${alpha})`;
          context.fillRect(x + 8, y + 8, cellSize - 12, cellSize - 12);
        }
      }

      context.fillStyle = `rgba(246, 224, 94, ${settings.bloom / 160})`;
      context.beginPath();
      context.arc(canvas.width / 2, canvas.height / 2, 110, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `rgba(5, 7, 10, ${settings.scanlines / 120})`;
      for (let y = 0; y < canvas.height; y += 8) {
        context.fillRect(0, y, canvas.width, 3);
      }

      context.strokeStyle = `rgba(252, 129, 129, ${settings.colourBleed / 120})`;
      context.lineWidth = 4;
      context.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);

      context.fillStyle = "#f5f7fb";
      context.font = "20px sans-serif";
      context.fillText(displayFilterModeLabels[mode], 42, 46);
    }

    return shell;
  },
};

type ScreenEffectStoryOptions = {
  effectId: string;
  heavyLabel: string;
  heavyValue: number;
  lightLabel: string;
  lightValue: number;
  settings?: Record<string, unknown>;
  title: string;
};

type AtmosphericComboEffect = {
  clear: () => void;
  render: (context: CanvasRenderingContext2D, viewport: { height: number; width: number }) => void;
  setPlayerMotion: (motion: AtmosphericPlayerMotion) => void;
  update: (deltaTime: number, viewport: { height: number; width: number }) => void;
};

type ComboEffectStoryOptions = {
  atmosphericLabel: string;
  createAtmosphericEffect: () => AtmosphericComboEffect;
  getAtmosphericMetric: (effect: AtmosphericComboEffect) => string;
  heavyLabel: string;
  heavyScreenIntensity: number;
  lightLabel: string;
  lightScreenIntensity: number;
  screenEffectId: string;
  screenSettings?: Record<string, unknown>;
  setClearAtmosphericPreset: (effect: AtmosphericComboEffect) => void;
  setHeavyAtmosphericPreset: (effect: AtmosphericComboEffect) => void;
  setLightAtmosphericPreset: (effect: AtmosphericComboEffect) => void;
  theme?: "sciFi" | "concrete" | "industrial";
  title: string;
};

const screenDropletStorySettings = {
  focusMode: "arcade",
  gravity: 96,
  maxDroplets: 58,
  maxSize: 8,
  mergeEnabled: true,
  minSize: 3,
  slideSpeed: 145,
  spawnRate: 50,
  trailFadeSpeed: 3.4,
  trailLength: 12,
};

const createComboEffectStory = ({
  atmosphericLabel,
  createAtmosphericEffect,
  getAtmosphericMetric,
  heavyLabel,
  heavyScreenIntensity,
  lightLabel,
  lightScreenIntensity,
  screenEffectId,
  screenSettings,
  setClearAtmosphericPreset,
  setHeavyAtmosphericPreset,
  setLightAtmosphericPreset,
  theme = "sciFi",
  title,
}: ComboEffectStoryOptions): Story => ({
  args: {
    comboMotionEnabled: true,
    comboMotionPreset: "patrol-loop",
    onAtmosphericMotionChange: fn(),
    onScreenEffectChange: fn(),
    screenEffectIntensity: lightScreenIntensity,
  },
  argTypes: {
    comboMotionEnabled: {
      control: "boolean",
      name: "Player motion",
    },
    comboMotionPreset: {
      control: "select",
      name: "Motion preset",
      options: ["still", "walk-forward", "turn-left", "turn-right", "patrol-loop"],
    },
    screenEffectIntensity: {
      control: { max: 1, min: 0, step: 0.05, type: "range" },
      name: "Screen intensity",
    },
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout(title);
    const context = canvas.getContext("2d");
    const screenValue = createValue("screen");
    const motionValue = createValue("motion");
    const atmosphericValue = createValue(atmosphericLabel);
    const usesValue = createValue("uses", "ScreenEffectManager + atmospheric effect");
    const manager = new ScreenEffectManager();
    const atmosphericEffect = createAtmosphericEffect();
    let screenIntensity = args.screenEffectIntensity ?? lightScreenIntensity;
    let motionEnabled = args.comboMotionEnabled ?? true;
    let motionPreset = args.comboMotionPreset ?? "patrol-loop";
    let animationFrame = 0;
    let lastTime = performance.now();

    manager.enable(screenEffectId, {
      fadeMs: 0,
      intensity: screenIntensity,
      settings: screenSettings,
    });
    setLightAtmosphericPreset(atmosphericEffect);

    const setCombo = (
      nextScreenIntensity: number,
      configureAtmosphere: (effect: AtmosphericComboEffect) => void
    ): void => {
      screenIntensity = Math.min(1, Math.max(0, nextScreenIntensity));
      manager.setIntensity(screenEffectId, screenIntensity, 260);
      configureAtmosphere(atmosphericEffect);
      setValue(screenValue, screenIntensity.toFixed(2));
      setValue(atmosphericValue, getAtmosphericMetric(atmosphericEffect));
      args.onScreenEffectChange?.(screenIntensity);
    };

    const setMotion = (
      nextMotionPreset = motionPreset,
      nextMotionEnabled = motionEnabled
    ): void => {
      motionPreset = nextMotionPreset;
      motionEnabled = nextMotionEnabled;
      setValue(motionValue, motionEnabled ? motionPreset : "disabled");
      args.onAtmosphericMotionChange?.(title, motionPreset, motionEnabled);
    };

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton(lightLabel, () => setCombo(lightScreenIntensity, setLightAtmosphericPreset)),
      createButton(heavyLabel, () => setCombo(heavyScreenIntensity, setHeavyAtmosphericPreset)),
      createButton("Clear", () => setCombo(0, setClearAtmosphericPreset)),
      createButton("Walk", () => setMotion("walk-forward", true)),
      createButton("Turn Left", () => setMotion("turn-left", true)),
      createButton("Turn Right", () => setMotion("turn-right", true)),
      createButton("Patrol Loop", () => setMotion("patrol-loop", true)),
      createButton("Motion Off", () => setMotion(motionPreset, false))
    );
    metrics.append(screenValue, motionValue, atmosphericValue, usesValue, controls);
    setCombo(screenIntensity, setLightAtmosphericPreset);
    setMotion(motionPreset, motionEnabled);

    const render = (): void => {
      if (!context) {
        return;
      }

      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      const viewport = { height: canvas.height, width: canvas.width };

      lastTime = now;
      atmosphericEffect.setPlayerMotion({
        enabled: motionEnabled,
        ...getAtmosphericMotionPreset(motionPreset, now),
      });
      drawFpsDemoScene(context, {
        height: canvas.height,
        pixelScale: 3,
        routeSpeed: 1.2,
        theme,
        timeMs: now,
        width: canvas.width,
      });

      atmosphericEffect.update(delta, viewport);
      atmosphericEffect.render(context, viewport);
      manager.update(delta, viewport);
      manager.render(context, viewport);

      setValue(screenValue, screenIntensity.toFixed(2));
      setValue(atmosphericValue, getAtmosphericMetric(atmosphericEffect));
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      atmosphericEffect.clear();
      manager.clear();
    });

    return shell;
  },
});

const createScreenEffectStory = ({
  effectId,
  heavyLabel,
  heavyValue,
  lightLabel,
  lightValue,
  settings,
  title,
}: ScreenEffectStoryOptions): Story => ({
  args: {
    onScreenEffectChange: fn(),
    screenEffectIntensity: lightValue,
  },
  argTypes: {
    screenEffectIntensity: {
      control: { max: 1, min: 0, step: 0.05, type: "range" },
      name: "Intensity",
    },
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout(title);
    const context = canvas.getContext("2d");
    const intensityValue = createValue("intensity");
    const effectValue = createValue("effect");
    const usesValue = createValue("uses", "ScreenEffectManager");
    const manager = new ScreenEffectManager();
    let intensity = args.screenEffectIntensity ?? lightValue;
    let animationFrame = 0;
    let lastTime = performance.now();

    manager.enable(effectId, {
      fadeMs: 0,
      intensity,
      settings,
    });

    const setIntensity = (nextIntensity: number): void => {
      intensity = Math.min(1, Math.max(0, nextIntensity));
      manager.setIntensity(effectId, intensity, 260);
      setValue(intensityValue, intensity.toFixed(2));
      args.onScreenEffectChange?.(intensity);
    };

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton(lightLabel, () => setIntensity(lightValue)),
      createButton(heavyLabel, () => setIntensity(heavyValue)),
      createButton("Clear Lens", () => setIntensity(0))
    );
    metrics.append(intensityValue, effectValue, usesValue, controls);

    const render = (): void => {
      if (!context) {
        return;
      }

      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);

      lastTime = now;
      drawFpsDemoScene(context, {
        height: canvas.height,
        pixelScale: 3,
        routeSpeed: 1.45,
        theme: "sciFi",
        timeMs: now,
        width: canvas.width,
      });

      manager.update(delta, { height: canvas.height, width: canvas.width });
      manager.render(context, { height: canvas.height, width: canvas.width });

      setValue(intensityValue, intensity.toFixed(2));
      setValue(effectValue, effectId);
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      manager.clear();
    });

    return shell;
  },
});

export const ScreenDroplets: Story = {
  ...createScreenEffectStory({
    effectId: screenDropletsEffectId,
    heavyLabel: "Heavy Rain",
    heavyValue: 1,
    lightLabel: "Light Rain",
    lightValue: 0.04,
    settings: screenDropletStorySettings,
    title: "Screen droplets",
  }),
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Heavy Rain" }));
    await waitFor(() => expect(args.onScreenEffectChange).toHaveBeenCalledWith(1));
  },
};

export const ScreenFire: Story = createScreenEffectStory({
  effectId: screenFireEffectId,
  heavyLabel: "Near Flames",
  heavyValue: 0.9,
  lightLabel: "Heat Flicker",
  lightValue: 0.35,
  title: "Screen fire",
});

export const ScreenFrost: Story = createScreenEffectStory({
  effectId: screenFrostEffectId,
  heavyLabel: "Frozen",
  heavyValue: 0.86,
  lightLabel: "Cold Air",
  lightValue: 0.32,
  title: "Screen frost",
});

export const ScreenPoison: Story = createScreenEffectStory({
  effectId: screenPoisonEffectId,
  heavyLabel: "Toxic Cloud",
  heavyValue: 0.85,
  lightLabel: "Gas Trace",
  lightValue: 0.28,
  title: "Screen poison",
});

export const ScreenLowHealth: Story = createScreenEffectStory({
  effectId: screenLowHealthEffectId,
  heavyLabel: "Critical",
  heavyValue: 0.94,
  lightLabel: "Injured",
  lightValue: 0.34,
  title: "Low health",
});

export const ScreenShock: Story = createScreenEffectStory({
  effectId: screenShockEffectId,
  heavyLabel: "Electric Hit",
  heavyValue: 0.95,
  lightLabel: "Static",
  lightValue: 0.38,
  title: "Shock",
});

export const ScreenSpeedBoost: Story = createScreenEffectStory({
  effectId: screenSpeedBoostEffectId,
  heavyLabel: "Full Boost",
  heavyValue: 0.92,
  lightLabel: "Sprint",
  lightValue: 0.36,
  title: "Speed boost",
});

export const RainCombo: Story = createComboEffectStory({
  atmosphericLabel: "rain",
  createAtmosphericEffect: () =>
    createAtmosphericRainEffect({
      density: "medium",
      pixelSize: 2,
      spawnRate: 120,
      wind: 52,
    }),
  getAtmosphericMetric: (effect) => {
    const rain = effect as ReturnType<typeof createAtmosphericRainEffect>;

    return `${rain.getActiveDropCount()} drops`;
  },
  heavyLabel: "Storm Soaked",
  heavyScreenIntensity: 1,
  lightLabel: "Wet Lens",
  lightScreenIntensity: 0.22,
  screenEffectId: screenDropletsEffectId,
  screenSettings: screenDropletStorySettings,
  setClearAtmosphericPreset: (effect) => {
    const rain = effect as ReturnType<typeof createAtmosphericRainEffect>;

    rain.setOptions({ density: "light", spawnRate: 0, wind: 0 });
    rain.clear();
  },
  setHeavyAtmosphericPreset: (effect) => {
    const rain = effect as ReturnType<typeof createAtmosphericRainEffect>;

    rain.setOptions({ density: "storm", spawnRate: 240, wind: 120 });
  },
  setLightAtmosphericPreset: (effect) => {
    const rain = effect as ReturnType<typeof createAtmosphericRainEffect>;

    rain.setOptions({ density: "medium", spawnRate: 120, wind: 52 });
  },
  title: "Rain combo",
});

export const FireAshCombo: Story = createComboEffectStory({
  atmosphericLabel: "air",
  createAtmosphericEffect: () =>
    createAtmosphericAshEmberEffect({
      emberRatio: 0.32,
      intensity: "burning",
      pixelSize: 2,
      spawnRate: 72,
      wind: 28,
    }),
  getAtmosphericMetric: (effect) => {
    const ashAndEmbers = effect as ReturnType<typeof createAtmosphericAshEmberEffect>;

    return `${ashAndEmbers.getActiveAshCount()} ash / ${ashAndEmbers.getActiveEmberCount()} embers`;
  },
  heavyLabel: "Burning Air",
  heavyScreenIntensity: 0.92,
  lightLabel: "Near Fire",
  lightScreenIntensity: 0.42,
  screenEffectId: screenFireEffectId,
  setClearAtmosphericPreset: (effect) => {
    const ashAndEmbers = effect as ReturnType<typeof createAtmosphericAshEmberEffect>;

    ashAndEmbers.setOptions({ emberRatio: 0, intensity: "smolder", spawnRate: 0, wind: 0 });
    ashAndEmbers.clear();
  },
  setHeavyAtmosphericPreset: (effect) => {
    const ashAndEmbers = effect as ReturnType<typeof createAtmosphericAshEmberEffect>;

    ashAndEmbers.setOptions({
      emberRatio: 0.48,
      intensity: "inferno",
      spawnRate: 150,
      wind: 68,
    });
  },
  setLightAtmosphericPreset: (effect) => {
    const ashAndEmbers = effect as ReturnType<typeof createAtmosphericAshEmberEffect>;

    ashAndEmbers.setOptions({
      emberRatio: 0.32,
      intensity: "burning",
      spawnRate: 72,
      wind: 28,
    });
  },
  theme: "industrial",
  title: "Fire and ash combo",
});

export const FrostSnowCombo: Story = createComboEffectStory({
  atmosphericLabel: "snow",
  createAtmosphericEffect: () =>
    createAtmosphericSnowEffect({
      accumulationEnabled: false,
      density: "heavy-snow",
      pixelSize: 2,
      spawnRate: 115,
      wind: 36,
    }),
  getAtmosphericMetric: (effect) => {
    const snow = effect as ReturnType<typeof createAtmosphericSnowEffect>;

    return `${snow.getActiveFlakeCount()} flakes`;
  },
  heavyLabel: "Whiteout",
  heavyScreenIntensity: 0.9,
  lightLabel: "Freezing Air",
  lightScreenIntensity: 0.4,
  screenEffectId: screenFrostEffectId,
  setClearAtmosphericPreset: (effect) => {
    const snow = effect as ReturnType<typeof createAtmosphericSnowEffect>;

    snow.setOptions({
      accumulationEnabled: false,
      density: "light-flurry",
      spawnRate: 0,
      wind: 0,
    });
    snow.clear();
  },
  setHeavyAtmosphericPreset: (effect) => {
    const snow = effect as ReturnType<typeof createAtmosphericSnowEffect>;

    snow.setOptions({
      accumulationEnabled: false,
      density: "blizzard",
      spawnRate: 230,
      wind: 120,
    });
  },
  setLightAtmosphericPreset: (effect) => {
    const snow = effect as ReturnType<typeof createAtmosphericSnowEffect>;

    snow.setOptions({
      accumulationEnabled: false,
      density: "heavy-snow",
      spawnRate: 115,
      wind: 36,
    });
  },
  title: "Frost and snow combo",
});

const getAtmosphericMotionPreset = (
  preset: AtmosphericMotionPreset,
  timeMs: number
): Required<Pick<
  AtmosphericPlayerMotion,
  "influence" | "turnVelocity" | "velocityX" | "velocityY" | "velocityZ"
>> => {
  if (preset === "walk-forward") {
    return { influence: 1.45, turnVelocity: 0, velocityX: 0, velocityY: 0, velocityZ: 420 };
  }

  if (preset === "turn-left") {
    return { influence: 1.35, turnVelocity: -360, velocityX: 0, velocityY: 0, velocityZ: 260 };
  }

  if (preset === "turn-right") {
    return { influence: 1.35, turnVelocity: 360, velocityX: 0, velocityY: 0, velocityZ: 260 };
  }

  if (preset === "patrol-loop") {
    const phase = (timeMs / 1000) % 7.2;
    const rightTurn = phase > 1.8 && phase < 2.55 ? 340 : 0;
    const leftTurn = phase > 5.0 && phase < 5.75 ? -340 : 0;

    return {
      influence: 1.35,
      turnVelocity: rightTurn + leftTurn,
      velocityX: 0,
      velocityY: 0,
      velocityZ: rightTurn || leftTurn ? 250 : 390,
    };
  }

  return { influence: 1, turnVelocity: 0, velocityX: 0, velocityY: 0, velocityZ: 0 };
};

export const AtmosphericRain: Story = {
  args: {
    onRainChange: fn(),
    rainDensity: "medium",
    rainMotionEnabled: true,
    rainMotionPreset: "patrol-loop",
    rainWind: 42,
  },
  argTypes: {
    rainDensity: {
      control: "select",
      name: "Density",
      options: ["light", "medium", "heavy", "storm"],
    },
    rainMotionEnabled: {
      control: "boolean",
      name: "Player motion",
    },
    rainMotionPreset: {
      control: "select",
      name: "Motion preset",
      options: ["still", "walk-forward", "turn-left", "turn-right", "patrol-loop"],
    },
    rainWind: {
      control: { max: 260, min: -260, step: 10, type: "range" },
      name: "Wind",
    },
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("Atmospheric rain");
    const context = canvas.getContext("2d");
    const densityValue = createValue("density");
    const windValue = createValue("wind");
    const motionValue = createValue("motion");
    const dropsValue = createValue("drops");
    const splashesValue = createValue("splashes");
    const usesValue = createValue("uses", "AtmosphericRainEffect");
    const rain = createAtmosphericRainEffect({
      density: args.rainDensity ?? "medium",
      pixelSize: 2,
      playerMotion: {
        enabled: args.rainMotionEnabled ?? true,
        ...getAtmosphericMotionPreset(args.rainMotionPreset ?? "patrol-loop", performance.now()),
      },
      wind: args.rainWind ?? 42,
    });
    let density = args.rainDensity ?? "medium";
    let motionEnabled = args.rainMotionEnabled ?? true;
    let motionPreset = args.rainMotionPreset ?? "patrol-loop";
    let wind = args.rainWind ?? 42;
    let animationFrame = 0;
    let lastTime = performance.now();

    const updateRainOptions = (
      nextDensity: AtmosphericRainDensity,
      nextWind: number,
      nextMotionPreset = motionPreset,
      nextMotionEnabled = motionEnabled
    ): void => {
      density = nextDensity;
      motionEnabled = nextMotionEnabled;
      motionPreset = nextMotionPreset;
      wind = nextWind;
      rain.setOptions({ density, wind });
      setValue(densityValue, density);
      setValue(motionValue, motionEnabled ? motionPreset : "disabled");
      setValue(windValue, `${wind}`);
      args.onRainChange?.(density, wind, motionPreset, motionEnabled);
    };

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Light", () => updateRainOptions("light", wind)),
      createButton("Medium", () => updateRainOptions("medium", wind)),
      createButton("Heavy", () => updateRainOptions("heavy", wind)),
      createButton("Storm", () => updateRainOptions("storm", wind)),
      createButton("Wind Left", () => updateRainOptions(density, -180)),
      createButton("Calm", () => updateRainOptions(density, 0)),
      createButton("Wind Right", () => updateRainOptions(density, 180)),
      createButton("Walk", () => updateRainOptions(density, wind, "walk-forward", true)),
      createButton("Turn Left", () => updateRainOptions(density, wind, "turn-left", true)),
      createButton("Turn Right", () => updateRainOptions(density, wind, "turn-right", true)),
      createButton("Patrol Loop", () => updateRainOptions(density, wind, "patrol-loop", true)),
      createButton("Motion Off", () => updateRainOptions(density, wind, motionPreset, false))
    );
    metrics.append(densityValue, windValue, motionValue, dropsValue, splashesValue, usesValue, controls);
    updateRainOptions(density, wind);

    const render = (): void => {
      if (!context) {
        return;
      }

      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);

      lastTime = now;
      rain.setPlayerMotion({
        enabled: motionEnabled,
        ...getAtmosphericMotionPreset(motionPreset, now),
      });
      drawFpsDemoScene(context, {
        height: canvas.height,
        pixelScale: 3,
        routeSpeed: 1.2,
        theme: "sciFi",
        timeMs: now,
        width: canvas.width,
      });

      rain.update(delta, { height: canvas.height, width: canvas.width });
      rain.render(context, { height: canvas.height, width: canvas.width });

      setValue(dropsValue, rain.getActiveDropCount());
      setValue(splashesValue, rain.getActiveSplashCount());
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      rain.clear();
    });

    return shell;
  },
};

export const AtmosphericSnow: Story = {
  args: {
    onAtmosphericMotionChange: fn(),
    onSnowChange: fn(),
    snowAccumulationEnabled: true,
    snowDensity: "snow",
    snowMotionEnabled: true,
    snowMotionPreset: "patrol-loop",
    snowWind: 18,
  },
  argTypes: {
    snowAccumulationEnabled: {
      control: "boolean",
      name: "Accumulation",
    },
    snowDensity: {
      control: "select",
      name: "Density",
      options: ["light-flurry", "snow", "heavy-snow", "blizzard"],
    },
    snowMotionEnabled: {
      control: "boolean",
      name: "Player motion",
    },
    snowMotionPreset: {
      control: "select",
      name: "Motion preset",
      options: ["still", "walk-forward", "turn-left", "turn-right", "patrol-loop"],
    },
    snowWind: {
      control: { max: 220, min: -220, step: 10, type: "range" },
      name: "Wind",
    },
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("Atmospheric snow");
    const context = canvas.getContext("2d");
    const densityValue = createValue("density");
    const windValue = createValue("wind");
    const motionValue = createValue("motion");
    const flakesValue = createValue("flakes");
    const accumulationValue = createValue("accumulation");
    const usesValue = createValue("uses", "AtmosphericSnowEffect");
    const snow = createAtmosphericSnowEffect({
      accumulationEnabled: args.snowAccumulationEnabled ?? true,
      density: args.snowDensity ?? "snow",
      pixelSize: 2,
      playerMotion: {
        enabled: args.snowMotionEnabled ?? true,
        ...getAtmosphericMotionPreset(args.snowMotionPreset ?? "patrol-loop", performance.now()),
      },
      wind: args.snowWind ?? 18,
    });
    let accumulationEnabled = args.snowAccumulationEnabled ?? true;
    let density = args.snowDensity ?? "snow";
    let motionEnabled = args.snowMotionEnabled ?? true;
    let motionPreset = args.snowMotionPreset ?? "patrol-loop";
    let wind = args.snowWind ?? 18;
    let animationFrame = 0;
    let lastTime = performance.now();

    const updateSnowOptions = (
      nextDensity: AtmosphericSnowDensity,
      nextWind: number,
      nextAccumulationEnabled: boolean,
      nextMotionPreset = motionPreset,
      nextMotionEnabled = motionEnabled
    ): void => {
      accumulationEnabled = nextAccumulationEnabled;
      density = nextDensity;
      motionEnabled = nextMotionEnabled;
      motionPreset = nextMotionPreset;
      wind = nextWind;
      snow.setOptions({ accumulationEnabled, density, wind });
      setValue(densityValue, density);
      setValue(motionValue, motionEnabled ? motionPreset : "disabled");
      setValue(windValue, `${wind}`);
      args.onSnowChange?.(density, wind, accumulationEnabled);
      args.onAtmosphericMotionChange?.("snow", motionPreset, motionEnabled);
    };

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Flurry", () => updateSnowOptions("light-flurry", wind, accumulationEnabled)),
      createButton("Snow", () => updateSnowOptions("snow", wind, accumulationEnabled)),
      createButton("Heavy", () => updateSnowOptions("heavy-snow", wind, accumulationEnabled)),
      createButton("Blizzard", () => updateSnowOptions("blizzard", 150, accumulationEnabled)),
      createButton("Wind Left", () => updateSnowOptions(density, -130, accumulationEnabled)),
      createButton("Calm", () => updateSnowOptions(density, 0, accumulationEnabled)),
      createButton("Build Up", () => updateSnowOptions(density, wind, true)),
      createButton("No Build Up", () => updateSnowOptions(density, wind, false)),
      createButton("Walk", () => updateSnowOptions(density, wind, accumulationEnabled, "walk-forward", true)),
      createButton("Turn Left", () => updateSnowOptions(density, wind, accumulationEnabled, "turn-left", true)),
      createButton("Turn Right", () => updateSnowOptions(density, wind, accumulationEnabled, "turn-right", true)),
      createButton("Patrol Loop", () => updateSnowOptions(density, wind, accumulationEnabled, "patrol-loop", true)),
      createButton("Motion Off", () => updateSnowOptions(density, wind, accumulationEnabled, motionPreset, false))
    );
    metrics.append(densityValue, windValue, motionValue, flakesValue, accumulationValue, usesValue, controls);
    updateSnowOptions(density, wind, accumulationEnabled);

    const render = (): void => {
      if (!context) {
        return;
      }

      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);

      lastTime = now;
      snow.setPlayerMotion({
        enabled: motionEnabled,
        ...getAtmosphericMotionPreset(motionPreset, now),
      });
      drawFpsDemoScene(context, {
        height: canvas.height,
        pixelScale: 3,
        routeSpeed: 1.05,
        theme: "sciFi",
        timeMs: now,
        width: canvas.width,
      });

      snow.update(delta, { height: canvas.height, width: canvas.width });
      snow.render(context, { height: canvas.height, width: canvas.width });

      setValue(flakesValue, snow.getActiveFlakeCount());
      setValue(accumulationValue, snow.getAccumulationHeight().toFixed(1));
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      snow.clear();
    });

    return shell;
  },
};

export const AtmosphericAshAndEmbers: Story = {
  args: {
    ashEmberIntensity: "burning",
    ashEmberMotionEnabled: true,
    ashEmberMotionPreset: "patrol-loop",
    ashEmberRatio: 0.24,
    ashEmberWind: 24,
    onAtmosphericMotionChange: fn(),
    onAshEmberChange: fn(),
  },
  argTypes: {
    ashEmberIntensity: {
      control: "select",
      name: "Intensity",
      options: ["smolder", "burning", "wildfire", "inferno"],
    },
    ashEmberMotionEnabled: {
      control: "boolean",
      name: "Player motion",
    },
    ashEmberMotionPreset: {
      control: "select",
      name: "Motion preset",
      options: ["still", "walk-forward", "turn-left", "turn-right", "patrol-loop"],
    },
    ashEmberRatio: {
      control: { max: 0.65, min: 0, step: 0.05, type: "range" },
      name: "Ember ratio",
    },
    ashEmberWind: {
      control: { max: 180, min: -180, step: 10, type: "range" },
      name: "Wind",
    },
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("Atmospheric ash and embers");
    const context = canvas.getContext("2d");
    const intensityValue = createValue("intensity");
    const windValue = createValue("wind");
    const motionValue = createValue("motion");
    const ashValue = createValue("ash");
    const emberValue = createValue("embers");
    const usesValue = createValue("uses", "AtmosphericAshEmberEffect");
    const ashAndEmbers = createAtmosphericAshEmberEffect({
      emberRatio: args.ashEmberRatio ?? 0.24,
      intensity: args.ashEmberIntensity ?? "burning",
      pixelSize: 2,
      playerMotion: {
        enabled: args.ashEmberMotionEnabled ?? true,
        ...getAtmosphericMotionPreset(args.ashEmberMotionPreset ?? "patrol-loop", performance.now()),
      },
      wind: args.ashEmberWind ?? 24,
    });
    let emberRatio = args.ashEmberRatio ?? 0.24;
    let intensity = args.ashEmberIntensity ?? "burning";
    let motionEnabled = args.ashEmberMotionEnabled ?? true;
    let motionPreset = args.ashEmberMotionPreset ?? "patrol-loop";
    let wind = args.ashEmberWind ?? 24;
    let animationFrame = 0;
    let lastTime = performance.now();

    const updateAshEmberOptions = (
      nextIntensity: AtmosphericAshEmberIntensity,
      nextWind: number,
      nextEmberRatio: number,
      nextMotionPreset = motionPreset,
      nextMotionEnabled = motionEnabled
    ): void => {
      emberRatio = nextEmberRatio;
      intensity = nextIntensity;
      motionEnabled = nextMotionEnabled;
      motionPreset = nextMotionPreset;
      wind = nextWind;
      ashAndEmbers.setOptions({ emberRatio, intensity, wind });
      setValue(intensityValue, intensity);
      setValue(motionValue, motionEnabled ? motionPreset : "disabled");
      setValue(windValue, `${wind}`);
      args.onAshEmberChange?.(intensity, wind, emberRatio);
      args.onAtmosphericMotionChange?.("ash-embers", motionPreset, motionEnabled);
    };

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Smolder", () => updateAshEmberOptions("smolder", wind, 0.1)),
      createButton("Burning", () => updateAshEmberOptions("burning", wind, 0.24)),
      createButton("Wildfire", () => updateAshEmberOptions("wildfire", wind, 0.3)),
      createButton("Inferno", () => updateAshEmberOptions("inferno", 70, 0.36)),
      createButton("Ash Only", () => updateAshEmberOptions(intensity, wind, 0)),
      createButton("More Embers", () => updateAshEmberOptions(intensity, wind, 0.52)),
      createButton("Wind Left", () => updateAshEmberOptions(intensity, -80, emberRatio)),
      createButton("Wind Right", () => updateAshEmberOptions(intensity, 80, emberRatio)),
      createButton("Walk", () => updateAshEmberOptions(intensity, wind, emberRatio, "walk-forward", true)),
      createButton("Turn Left", () => updateAshEmberOptions(intensity, wind, emberRatio, "turn-left", true)),
      createButton("Turn Right", () => updateAshEmberOptions(intensity, wind, emberRatio, "turn-right", true)),
      createButton("Patrol Loop", () => updateAshEmberOptions(intensity, wind, emberRatio, "patrol-loop", true)),
      createButton("Motion Off", () => updateAshEmberOptions(intensity, wind, emberRatio, motionPreset, false))
    );
    metrics.append(intensityValue, windValue, motionValue, ashValue, emberValue, usesValue, controls);
    updateAshEmberOptions(intensity, wind, emberRatio);

    const render = (): void => {
      if (!context) {
        return;
      }

      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);

      lastTime = now;
      ashAndEmbers.setPlayerMotion({
        enabled: motionEnabled,
        ...getAtmosphericMotionPreset(motionPreset, now),
      });
      drawFpsDemoScene(context, {
        height: canvas.height,
        pixelScale: 3,
        routeSpeed: 1.18,
        theme: "industrial",
        timeMs: now,
        width: canvas.width,
      });

      ashAndEmbers.update(delta, { height: canvas.height, width: canvas.width });
      ashAndEmbers.render(context, { height: canvas.height, width: canvas.width });

      setValue(ashValue, ashAndEmbers.getActiveAshCount());
      setValue(emberValue, ashAndEmbers.getActiveEmberCount());
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      ashAndEmbers.clear();
    });

    return shell;
  },
};

export const EnvironmentHeat: Story = createScreenEffectStory({
  effectId: environmentHeatEffectId,
  heavyLabel: "Heat Haze",
  heavyValue: 0.82,
  lightLabel: "Warm Air",
  lightValue: 0.3,
  title: "Environment heat",
});

export const EnvironmentFrost: Story = createScreenEffectStory({
  effectId: environmentFrostEffectId,
  heavyLabel: "Deep Freeze",
  heavyValue: 0.88,
  lightLabel: "Cold Glass",
  lightValue: 0.34,
  title: "Environment frost",
});

export const EnvironmentFire: Story = createScreenEffectStory({
  effectId: environmentFireEffectId,
  heavyLabel: "Burning",
  heavyValue: 0.9,
  lightLabel: "Near Fire",
  lightValue: 0.38,
  title: "Environment fire",
});

export const EnvironmentUnderwater: Story = createScreenEffectStory({
  effectId: environmentUnderwaterEffectId,
  heavyLabel: "Submerged",
  heavyValue: 0.82,
  lightLabel: "Shallow Water",
  lightValue: 0.32,
  title: "Environment underwater",
});

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

export const ProceduralStars: Story = {
  args: {
    onStarfieldMotionChange: fn(),
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("Procedural stars");
    const context = canvas.getContext("2d");
    const modeValue = createValue("mode", "forward");
    const velocityValue = createValue("velocity", "0, 0, 34");
    const usesValue = createValue("uses", "ProceduralStarfield");
    const starfield = createProceduralStarfield({
      pixelSize: 1,
      spreadX: 760,
      spreadY: 460,
      starCount: 180,
      velocityZ: 34,
    });
    let animationFrame = 0;
    let lastTime = performance.now();
    let mode = "forward";
    let motion = { velocityX: 0, velocityY: 0, velocityZ: 34 };

    const setMotion = (
      label: string,
      nextMotion: { velocityX: number; velocityY: number; velocityZ: number }
    ): void => {
      mode = label;
      motion = nextMotion;
      starfield.setMotion(motion);
      args.onStarfieldMotionChange?.(label);
    };

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Forward", () => setMotion("forward", { velocityX: 0, velocityY: 0, velocityZ: 34 })),
      createButton("Reverse", () => setMotion("reverse", { velocityX: 0, velocityY: 0, velocityZ: -28 })),
      createButton("Strafe Left", () => setMotion("strafe left", { velocityX: -92, velocityY: 0, velocityZ: 18 })),
      createButton("Strafe Right", () => setMotion("strafe right", { velocityX: 92, velocityY: 0, velocityZ: 18 })),
      createButton("Climb", () => setMotion("climb", { velocityX: 0, velocityY: -68, velocityZ: 24 })),
      createButton("Calm", () => setMotion("calm", { velocityX: 8, velocityY: 0, velocityZ: 4 }))
    );
    metrics.append(modeValue, velocityValue, usesValue, controls);

    const renderPlayerShip = (): void => {
      if (!context) {
        return;
      }

      const centerX = Math.round(canvas.width / 2);
      const centerY = Math.round(canvas.height / 2);
      const bank = Math.max(-18, Math.min(18, motion.velocityX * 0.16));
      const shipX = centerX + Math.max(-14, Math.min(14, motion.velocityX * 0.08));
      const shipY = centerY + 62 + Math.max(-12, Math.min(12, motion.velocityY * 0.12));
      const thrust = Math.max(0.18, Math.min(1, 0.28 + Math.abs(motion.velocityZ) / 42));

      context.fillStyle = "rgba(79, 209, 197, 0.12)";
      context.fillRect(centerX - 1, centerY - 42, 2, 24);
      context.fillRect(centerX - 1, centerY + 18, 2, 24);
      drawTopDownShip(context, shipX, shipY, {
        accent: "#f6e05e",
        heading: bank,
        scale: 0.9,
        thrust,
      });
    };

    const render = (now: number): void => {
      if (!context) {
        return;
      }

      const deltaTime = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      starfield.update(deltaTime, canvas);

      context.fillStyle = "#03050d";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(79, 209, 197, 0.08)";
      context.fillRect(0, Math.round(canvas.height * 0.5), canvas.width, 1);
      starfield.render(context, canvas);
      renderPlayerShip();

      setValue(modeValue, mode);
      setValue(
        velocityValue,
        `${Math.round(motion.velocityX)}, ${Math.round(motion.velocityY)}, ${Math.round(motion.velocityZ)}`
      );
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

const getPoint2D = (
  points: readonly RagdollPoint2D[],
  id: string
): RagdollPoint2D | undefined => points.find((point) => point.id === id);

const drawRagdoll2D = (
  context: CanvasRenderingContext2D,
  ragdoll: PhysicsRagdoll2D,
  color: string
): void => {
  context.strokeStyle = color;
  context.lineWidth = 4;
  ragdoll.constraints.forEach((constraint) => {
    const a = getPoint2D(ragdoll.points, constraint.a);
    const b = getPoint2D(ragdoll.points, constraint.b);

    if (a && b) {
      drawCanvasLine(context, { x: a.posX, y: a.posY }, { x: b.posX, y: b.posY }, color, 4);
    }
  });
  ragdoll.points.forEach((point) => {
    context.fillStyle = point.pinned ? "#f6e05e" : color;
    context.beginPath();
    context.arc(point.posX, point.posY, point.id === "head" ? 10 : 6, 0, Math.PI * 2);
    context.fill();
  });
};

const projectRagdollPoint = (
  point: RagdollPoint3D,
  canvas: HTMLCanvasElement
): { scale: number; x: number; y: number } => {
  const depth = 260 + point.posZ;
  const scale = 260 / Math.max(80, depth);

  return {
    scale,
    x: canvas.width / 2 + point.posX * scale,
    y: canvas.height / 2 + point.posY * scale,
  };
};

const drawRagdoll3D = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  ragdoll: PhysicsRagdoll3D,
  color: string
): void => {
  const projected = new Map(
    ragdoll.points.map((point) => [point.id, projectRagdollPoint(point, canvas)])
  );

  ragdoll.constraints.forEach((constraint: RagdollConstraint) => {
    const a = projected.get(constraint.a);
    const b = projected.get(constraint.b);

    if (a && b) {
      drawCanvasLine(context, a, b, color, Math.max(2, 4 * Math.min(a.scale, b.scale)));
    }
  });
  ragdoll.points.forEach((point) => {
    const projectedPoint = projected.get(point.id);

    if (!projectedPoint) {
      return;
    }

    context.fillStyle = point.pinned ? "#f6e05e" : color;
    context.beginPath();
    context.arc(
      projectedPoint.x,
      projectedPoint.y,
      (point.id === "head" ? 10 : 6) * projectedPoint.scale,
      0,
      Math.PI * 2
    );
    context.fill();
  });
};

export const Gravity: Story = {
  render: () => {
    const { canvas, metrics, shell } = createSystemsLayout("Gravity helper");
    const context = canvas.getContext("2d");
    const bodyValue = createValue("body");
    const gravityValue = createValue("gravity", "980 px/s/s");
    let animationFrame = 0;
    let body2D = { posX: 110, posY: 40, velocityX: 80, velocityY: -260 };
    let body3D = { posX: -170, posY: -80, posZ: 120, velocityX: 42, velocityY: -180, velocityZ: -34 };
    let last = performance.now();

    metrics.append(bodyValue, gravityValue, createValue("uses", "applyGravity2D + applyGravity3D"));
    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Reset", () => {
        body2D = { posX: 110, posY: 40, velocityX: 80, velocityY: -260 };
        body3D = { posX: -170, posY: -80, posZ: 120, velocityX: 42, velocityY: -180, velocityZ: -34 };
      })
    );
    metrics.append(controls);

    const render = (now: number): void => {
      if (!context) {
        return;
      }

      const delta = Math.min(0.033, (now - last) / 1000);
      last = now;
      body2D = applyGravity2D(body2D, {
        bounce: 0.62,
        delta,
        floorY: canvas.height - 54,
        gravity: 980,
        maxFallSpeed: 760,
      });
      body3D = applyGravity3D(body3D, {
        bounce: 0.5,
        delta,
        floorY: 95,
        gravity: 680,
        maxFallSpeed: 560,
      });

      if (body2D.posX > canvas.width + 30) {
        body2D = { ...body2D, posX: -30 };
      }

      if (body3D.posX > 260) {
        body3D = { ...body3D, posX: -260 };
      }

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawCanvasLine(context, { x: 0, y: canvas.height - 54 }, { x: canvas.width, y: canvas.height - 54 }, "#243241", 3);
      context.fillStyle = "#4fd1c5";
      context.beginPath();
      context.arc(body2D.posX, body2D.posY, 18, 0, Math.PI * 2);
      context.fill();

      const point3D = projectRagdollPoint({ id: "body", posX: body3D.posX, posY: body3D.posY, posZ: body3D.posZ }, canvas);
      drawCanvasPolygon(
        context,
        [
          { x: point3D.x, y: point3D.y - 22 * point3D.scale },
          { x: point3D.x + 22 * point3D.scale, y: point3D.y },
          { x: point3D.x, y: point3D.y + 22 * point3D.scale },
          { x: point3D.x - 22 * point3D.scale, y: point3D.y },
        ],
        "rgba(246, 224, 94, 0.78)"
      );
      setValue(bodyValue, `2D y ${Math.round(body2D.posY)}, 3D y ${Math.round(body3D.posY)}`);
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => window.cancelAnimationFrame(animationFrame));

    return shell;
  },
};

export const Ragdoll2D: Story = {
  render: () => {
    const { canvas, metrics, shell } = createSystemsLayout("2D ragdoll helper");
    const context = canvas.getContext("2d");
    const pointsValue = createValue("points");
    const constraintsValue = createValue("constraints");
    let ragdoll = createRagdoll2D({ posX: canvas.width / 2, posY: 120 });
    let animationFrame = 0;

    metrics.append(pointsValue, constraintsValue, createValue("uses", "createRagdoll2D + stepRagdoll2D"));
    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Drop", () => {
        ragdoll = createRagdoll2D({ posX: canvas.width / 2, posY: 90 });
      }),
      createButton("Pinned Head", () => {
        ragdoll = createRagdoll2D({ posX: canvas.width / 2, posY: 110 }, { pinnedHead: true });
      })
    );
    metrics.append(controls);

    const render = (): void => {
      if (!context) {
        return;
      }

      ragdoll = stepRagdoll2D(ragdoll, {
        delta: 1 / 60,
        floorY: canvas.height - 44,
        gravity: 1150,
        iterations: 6,
      });
      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawCanvasLine(context, { x: 0, y: canvas.height - 44 }, { x: canvas.width, y: canvas.height - 44 }, "#243241", 3);
      drawRagdoll2D(context, ragdoll, "#4fd1c5");
      setValue(pointsValue, ragdoll.points.length);
      setValue(constraintsValue, ragdoll.constraints.length);
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => window.cancelAnimationFrame(animationFrame));

    return shell;
  },
};

export const Ragdoll3D: Story = {
  render: () => {
    const { canvas, metrics, shell } = createSystemsLayout("3D ragdoll helper");
    const context = canvas.getContext("2d");
    const depthValue = createValue("depth spread");
    let ragdoll = createRagdoll3D({ posX: 0, posY: -100, posZ: 0 }, { scale: 1.35 });
    let animationFrame = 0;
    let spin = 0;

    metrics.append(depthValue, createValue("uses", "createRagdoll3D + stepRagdoll3D"));
    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Reset", () => {
        ragdoll = createRagdoll3D({ posX: 0, posY: -100, posZ: 0 }, { scale: 1.35 });
      })
    );
    metrics.append(controls);

    const render = (): void => {
      if (!context) {
        return;
      }

      spin += 0.02;
      ragdoll = stepRagdoll3D(
        {
          constraints: ragdoll.constraints,
          points: ragdoll.points.map((point) => ({
            ...point,
            previousZ: point.previousZ ?? point.posZ,
            posZ: point.posZ + Math.sin(spin + point.posX * 0.02) * 0.4,
          })),
        },
        {
          delta: 1 / 60,
          floorY: 120,
          gravity: 900,
          iterations: 6,
        }
      );

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "rgba(245, 247, 251, 0.12)";
      context.strokeRect(canvas.width / 2 - 210, canvas.height / 2 - 120, 420, 220);
      drawRagdoll3D(context, canvas, ragdoll, "#f6e05e");

      const zValues = ragdoll.points.map((point) => point.posZ);
      setValue(depthValue, `${Math.round(Math.min(...zValues))}..${Math.round(Math.max(...zValues))}`);
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => window.cancelAnimationFrame(animationFrame));

    return shell;
  },
};

type ApartmentLight = {
  color: string;
  id: "lamp" | "tv" | "window";
  phase: number;
  position: RayTracingPoint;
  radius: number;
  strength: number;
  temperature: string;
};

type ApartmentObjectKind =
  | "coffee-table"
  | "console"
  | "lamp"
  | "plant"
  | "rug"
  | "shelf"
  | "sofa";

type ApartmentObject = {
  blocksLight: boolean;
  fill: string;
  height: number;
  id: string;
  kind: ApartmentObjectKind;
  movable: boolean;
  stroke?: string;
  width: number;
  x: number;
  y: number;
};

type ApartmentDrag = {
  index: number;
  offsetX: number;
  offsetY: number;
};

const apartmentBounds: RayTracingBounds = {
  height: 332,
  surfaceColor: "#2b3035",
  width: 612,
  x: 54,
  y: 34,
};

const createApartmentObjects = (): ApartmentObject[] => [
  {
    blocksLight: true,
    fill: "#343945",
    height: 92,
    id: "sofa",
    kind: "sofa",
    movable: true,
    width: 192,
    x: 166,
    y: 212,
  },
  {
    blocksLight: true,
    fill: "#5f4a38",
    height: 62,
    id: "coffee table",
    kind: "coffee-table",
    movable: true,
    stroke: "rgba(255, 236, 180, 0.2)",
    width: 120,
    x: 256,
    y: 170,
  },
  {
    blocksLight: true,
    fill: "#544437",
    height: 74,
    id: "lamp",
    kind: "lamp",
    movable: true,
    stroke: "rgba(255, 222, 142, 0.2)",
    width: 60,
    x: 468,
    y: 202,
  },
  {
    blocksLight: true,
    fill: "#101913",
    height: 30,
    id: "tv",
    kind: "console",
    movable: true,
    stroke: "rgba(94, 255, 122, 0.28)",
    width: 138,
    x: 422,
    y: 68,
  },
  {
    blocksLight: true,
    fill: "#423f37",
    height: 40,
    id: "shelf",
    kind: "shelf",
    movable: true,
    stroke: "rgba(245, 247, 251, 0.12)",
    width: 116,
    x: 102,
    y: 68,
  },
  {
    blocksLight: true,
    fill: "#29352d",
    height: 50,
    id: "plant",
    kind: "plant",
    movable: true,
    stroke: "rgba(144, 205, 244, 0.12)",
    width: 52,
    x: 84,
    y: 296,
  },
  {
    blocksLight: false,
    fill: "rgba(245, 247, 251, 0.09)",
    height: 56,
    id: "rug",
    kind: "rug",
    movable: true,
    stroke: "rgba(245, 247, 251, 0.06)",
    width: 74,
    x: 376,
    y: 244,
  },
];

const drawApartmentPath = (
  context: CanvasRenderingContext2D,
  points: readonly RayTracingPoint[]
): void => {
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
      return;
    }

    context.lineTo(point.x, point.y);
  });
  context.closePath();
};

const fillApartmentRectangle = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke = "rgba(245, 247, 251, 0.14)"
): void => {
  context.fillStyle = fill;
  context.fillRect(x, y, width, height);
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);
};

const getApartmentObjectPolygon = (object: ApartmentObject): RayTracingPolygon =>
  createRayTracingRectangle(object.x, object.y, object.width, object.height);

const getApartmentObjectCenter = (object: ApartmentObject): RayTracingPoint => ({
  x: object.x + object.width / 2,
  y: object.y + object.height / 2,
});

const getApartmentOccluders = (
  objects: readonly ApartmentObject[],
  origin?: RayTracingPoint
): RayTracingSurface[] =>
  objects
    .filter(
      (object) =>
        object.blocksLight &&
        (!origin ||
          origin.x < object.x ||
          origin.x > object.x + object.width ||
          origin.y < object.y ||
          origin.y > object.y + object.height)
    )
    .map((object) => ({
      polygon: getApartmentObjectPolygon(object),
      surfaceColor: object.fill,
    }));

const getApartmentObjectById = (
  objects: readonly ApartmentObject[],
  id: string
): ApartmentObject | undefined => objects.find((object) => object.id === id);

const getTvStaticColor = (frame: number): string => {
  const colors = ["#d9dde5", "#c7ced8", "#e6e9ef", "#b9c1cc", "#d0d6df", "#edf0f5"];
  const step = Math.floor(frame / 8);
  const jitter = Math.floor(Math.abs(Math.sin(frame * 0.37) * 2));

  return colors[(step + jitter) % colors.length] ?? "#f5f7fb";
};

const getApartmentLights = (
  objects: readonly ApartmentObject[],
  frame: number
): ApartmentLight[] => {
  const lamp = getApartmentObjectById(objects, "lamp");
  const tv = getApartmentObjectById(objects, "tv");

  return [
    {
      color: "#7ec8ff",
      id: "window",
      phase: 0,
      position: { x: 78, y: 136 },
      radius: 340,
      strength: 0.36,
      temperature: "cool blue",
    },
    {
      color: "#ffd36f",
      id: "lamp",
      phase: 1.6,
      position: lamp ? getApartmentObjectCenter(lamp) : { x: 498, y: 216 },
      radius: 230,
      strength: 0.42,
      temperature: "warm yellow",
    },
    {
      color: getTvStaticColor(frame),
      id: "tv",
      phase: 3.1,
      position: tv
        ? { x: tv.x + tv.width / 2, y: tv.y + tv.height + 6 }
        : { x: 492, y: 104 },
      radius: 260,
      strength: 0.54,
      temperature: "static flicker",
    },
  ];
};

const drawApartmentObject = (
  context: CanvasRenderingContext2D,
  object: ApartmentObject,
  isDragging: boolean
): void => {
  fillApartmentRectangle(
    context,
    object.x,
    object.y,
    object.width,
    object.height,
    object.fill,
    isDragging ? "rgba(245, 247, 251, 0.72)" : object.stroke
  );

  if (object.kind === "sofa") {
    fillApartmentRectangle(
      context,
      object.x + 18,
      object.y + 20,
      68,
      48,
      "#48505f",
      "rgba(245, 247, 251, 0.11)"
    );
    fillApartmentRectangle(
      context,
      object.x + object.width - 86,
      object.y + 20,
      68,
      48,
      "#48505f",
      "rgba(245, 247, 251, 0.11)"
    );
  }

  if (object.kind === "coffee-table") {
    fillApartmentRectangle(
      context,
      object.x + 30,
      object.y + 18,
      60,
      24,
      "#7a6048",
      "rgba(255, 236, 180, 0.2)"
    );
  }

  if (object.kind === "console") {
    context.fillStyle = "rgba(245, 247, 251, 0.68)";
    context.fillRect(object.x + 22, object.y + 8, object.width - 44, 10);
    context.fillStyle = "rgba(255, 255, 255, 0.46)";
    context.fillRect(object.x + 22, object.y + 8, object.width - 62, 4);
    context.fillStyle = "rgba(148, 163, 184, 0.44)";
    context.fillRect(object.x + 38, object.y + 14, object.width - 66, 3);
  }

  if (object.kind === "lamp") {
    const center = getApartmentObjectCenter(object);

    context.fillStyle = "rgba(255, 217, 116, 0.78)";
    context.beginPath();
    context.arc(center.x, center.y, 12, 0, Math.PI * 2);
    context.fill();
  }
};

const drawApartmentBase = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  objects: readonly ApartmentObject[],
  draggingIndex?: number
): void => {
  context.fillStyle = "#07080b";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const floor = context.createLinearGradient(
    apartmentBounds.x ?? 0,
    apartmentBounds.y ?? 0,
    (apartmentBounds.x ?? 0) + apartmentBounds.width,
    (apartmentBounds.y ?? 0) + apartmentBounds.height
  );
  floor.addColorStop(0, "#22201d");
  floor.addColorStop(0.5, "#181b1e");
  floor.addColorStop(1, "#1d1b20");
  context.fillStyle = floor;
  context.fillRect(
    apartmentBounds.x ?? 0,
    apartmentBounds.y ?? 0,
    apartmentBounds.width,
    apartmentBounds.height
  );

  context.strokeStyle = "rgba(245, 247, 251, 0.26)";
  context.lineWidth = 10;
  context.strokeRect(
    apartmentBounds.x ?? 0,
    apartmentBounds.y ?? 0,
    apartmentBounds.width,
    apartmentBounds.height
  );

  context.strokeStyle = "rgba(120, 190, 255, 0.85)";
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(58, 96);
  context.lineTo(58, 178);
  context.stroke();

  context.strokeStyle = "rgba(246, 224, 94, 0.18)";
  context.lineWidth = 1;
  for (let x = 80; x < 650; x += 32) {
    drawCanvasLine(context, { x, y: 44 }, { x, y: 356 }, "rgba(245, 247, 251, 0.035)");
  }
  for (let y = 58; y < 350; y += 32) {
    drawCanvasLine(context, { x: 64, y }, { x: 656, y }, "rgba(245, 247, 251, 0.032)");
  }

  objects.forEach((object, index) => {
    if (object.kind === "rug") {
      drawApartmentObject(context, object, index === draggingIndex);
    }
  });
  objects.forEach((object, index) => {
    if (object.kind !== "rug") {
      drawApartmentObject(context, object, index === draggingIndex);
    }
  });
};

const drawApartmentLightLayer = (
  context: CanvasRenderingContext2D,
  light: ApartmentLight,
  layer: RayTracingBounce,
  strength: number
): void => {
  const isBounce = layer.level > 0;
  const radius = isBounce ? light.radius * 0.32 : light.radius;
  const gradient = context.createRadialGradient(
    layer.origin.x,
    layer.origin.y,
    2,
    layer.origin.x,
    layer.origin.y,
    radius
  );
  const color = layer.color ?? light.color;
  const alpha = isBounce ? strength * layer.intensity * 0.58 : strength * layer.intensity;

  gradient.addColorStop(0, colorWithAlpha(color, alpha));
  gradient.addColorStop(0.46, colorWithAlpha(color, alpha * 0.32));
  gradient.addColorStop(1, colorWithAlpha(color, 0));

  context.save();
  if (isBounce) {
    context.beginPath();
    context.rect(
      apartmentBounds.x ?? 0,
      apartmentBounds.y ?? 0,
      apartmentBounds.width,
      apartmentBounds.height
    );
  } else {
    drawApartmentPath(context, layer.hits);
  }
  context.clip();
  context.globalCompositeOperation = "lighter";
  context.fillStyle = gradient;
  context.fillRect(
    (apartmentBounds.x ?? 0) - 8,
    (apartmentBounds.y ?? 0) - 8,
    apartmentBounds.width + 16,
    apartmentBounds.height + 16
  );
  context.restore();
};

const drawApartmentLight = (
  context: CanvasRenderingContext2D,
  light: ApartmentLight,
  frame: number,
  occluders: readonly RayTracingSurface[],
  intensity: number,
  bounces: number,
  showRayGuides: boolean,
  bounceAttenuation: number
): RayTracingBounce[] => {
  const pulse = 0.9 + Math.sin(frame / 42 + light.phase) * 0.08;
  const strength = light.strength * intensity * pulse;
  const layers = traceLightBounces(light.position, apartmentBounds, occluders, {
    attenuation: bounceAttenuation,
    bounces,
    lightColor: light.color,
    maxOriginsPerBounce: 3,
    surfaceColorMix: 0.42,
  });

  layers.forEach((layer) => drawApartmentLightLayer(context, light, layer, strength));

  if (showRayGuides) {
    context.save();
    drawApartmentPath(context, layers[0]?.hits ?? []);
    context.strokeStyle = colorWithAlpha(light.color, 0.18);
    context.lineWidth = 1;
    context.stroke();
    context.restore();
  }

  return layers;
};

const drawApartmentFixtures = (
  context: CanvasRenderingContext2D,
  lights: readonly ApartmentLight[]
): void => {
  context.save();
  context.globalCompositeOperation = "source-over";
  lights.forEach((light) => {
    context.fillStyle = colorWithAlpha(light.color, 0.92);
    context.beginPath();
    context.arc(light.position.x, light.position.y, 7, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = colorWithAlpha("#ffffff", 0.68);
    context.lineWidth = 2;
    context.stroke();
  });
  context.restore();
};

const getApartmentPointerPoint = (
  canvas: HTMLCanvasElement,
  event: PointerEvent
): RayTracingPoint => {
  const bounds = canvas.getBoundingClientRect();

  return {
    x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
    y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
  };
};

const findApartmentObjectAt = (
  objects: readonly ApartmentObject[],
  point: RayTracingPoint
): number => {
  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const object = objects[index];

    if (
      object?.movable &&
      point.x >= object.x &&
      point.x <= object.x + object.width &&
      point.y >= object.y &&
      point.y <= object.y + object.height
    ) {
      return index;
    }
  }

  return -1;
};

const moveApartmentObject = (
  object: ApartmentObject,
  point: RayTracingPoint,
  drag: ApartmentDrag
): void => {
  const left = apartmentBounds.x ?? 0;
  const top = apartmentBounds.y ?? 0;
  const maxX = left + apartmentBounds.width - object.width;
  const maxY = top + apartmentBounds.height - object.height;

  object.x = Math.max(left, Math.min(maxX, point.x - drag.offsetX));
  object.y = Math.max(top, Math.min(maxY, point.y - drag.offsetY));
};

export const RayTracedApartment: Story = {
  args: {
    bounceAttenuation: 0.1,
    lampLightIntensity: 0.65,
    lightBounces: 1,
    showLightRayGuides: true,
    tvLightIntensity: 0.65,
    windowLightIntensity: 0.65,
  },
  argTypes: {
    bounceAttenuation: { control: { max: 0.5, min: 0.02, step: 0.02, type: "range" } },
    lampLightIntensity: { control: { max: 1.2, min: 0.05, step: 0.05, type: "range" } },
    lightBounces: { control: { max: 3, min: 0, step: 1, type: "range" } },
    showLightRayGuides: { control: "boolean" },
    tvLightIntensity: { control: { max: 1.2, min: 0.05, step: 0.05, type: "range" } },
    windowLightIntensity: { control: { max: 1.2, min: 0.05, step: 0.05, type: "range" } },
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("Ray-traced apartment");
    const context = canvas.getContext("2d");
    const windowValue = createValue("window", "blue cool");
    const lampValue = createValue("lamp", "warm yellow");
    const tvValue = createValue("tv", "static flicker");
    const raysValue = createValue("rays");
    const bouncesValue = createValue("bounces", args.lightBounces ?? 1);
    const bounceAttenuationValue = createValue("bounce attenuation", args.bounceAttenuation ?? 0.1);
    const guidesValue = createValue("guides", args.showLightRayGuides ? "on" : "off");
    const selectedValue = createValue("selected", "none");
    const windowIntensityValue = createValue("window intensity", args.windowLightIntensity ?? 0.65);
    const lampIntensityValue = createValue("lamp intensity", args.lampLightIntensity ?? 0.65);
    const tvIntensityValue = createValue("tv intensity", args.tvLightIntensity ?? 0.65);
    const objects = createApartmentObjects();
    let drag: ApartmentDrag | undefined;
    let animationFrame = 0;
    let frame = 0;

    resizeCanvas(canvas, 720, 420);
    canvas.style.cursor = "grab";
    metrics.append(
      windowValue,
      lampValue,
      tvValue,
      raysValue,
      bouncesValue,
      bounceAttenuationValue,
      guidesValue,
      selectedValue,
      windowIntensityValue,
      lampIntensityValue,
      tvIntensityValue,
      createValue("movable", String(objects.filter((object) => object.movable).length))
    );

    const pointerDown = (event: PointerEvent): void => {
      const point = getApartmentPointerPoint(canvas, event);
      const index = findApartmentObjectAt(objects, point);
      const object = objects[index];

      if (!object) {
        setValue(selectedValue, "none");
        return;
      }

      drag = {
        index,
        offsetX: point.x - object.x,
        offsetY: point.y - object.y,
      };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
      setValue(selectedValue, object.id);
    };

    const pointerMove = (event: PointerEvent): void => {
      const point = getApartmentPointerPoint(canvas, event);

      if (!drag) {
        canvas.style.cursor =
          findApartmentObjectAt(objects, point) >= 0 ? "grab" : "default";
        return;
      }

      const object = objects[drag.index];

      if (object) {
        moveApartmentObject(object, point, drag);
        setValue(selectedValue, object.id);
      }
    };

    const pointerUp = (event: PointerEvent): void => {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      drag = undefined;
      canvas.style.cursor = "grab";
    };

    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);

    const render = (): void => {
      if (!context) {
        return;
      }

      frame += 1;
      const lights = getApartmentLights(objects, frame);
      const intensityByLight = {
        lamp: Math.max(0, Math.min(1.5, args.lampLightIntensity ?? 0.65)),
        tv: Math.max(0, Math.min(1.5, args.tvLightIntensity ?? 0.65)),
        window: Math.max(0, Math.min(1.5, args.windowLightIntensity ?? 0.65)),
      };
      const bounces = Math.max(0, Math.min(3, Math.floor(args.lightBounces ?? 1)));
      const bounceAttenuation = Math.max(0.02, Math.min(0.5, args.bounceAttenuation ?? 0.1));
      const showRayGuides = args.showLightRayGuides ?? true;
      drawApartmentBase(context, canvas, objects, drag?.index);
      const hitCount = lights.reduce(
        (count, light) =>
          count +
          drawApartmentLight(
            context,
            light,
            frame,
            getApartmentOccluders(objects, light.position),
            intensityByLight[light.id],
            bounces,
            showRayGuides,
            bounceAttenuation
          ).reduce((total, layer) => total + layer.hits.length, 0),
        0
      );
      drawApartmentFixtures(context, lights);

      setValue(windowValue, lights[0]?.temperature ?? "");
      setValue(lampValue, lights[1]?.temperature ?? "");
      setValue(tvValue, lights[2]?.temperature ?? "");
      setValue(raysValue, hitCount);
      setValue(bouncesValue, bounces);
      setValue(bounceAttenuationValue, bounceAttenuation.toFixed(2));
      setValue(guidesValue, showRayGuides ? "on" : "off");
      setValue(windowIntensityValue, intensityByLight.window.toFixed(2));
      setValue(lampIntensityValue, intensityByLight.lamp.toFixed(2));
      setValue(tvIntensityValue, intensityByLight.tv.toFixed(2));
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
    });

    return shell;
  },
};
