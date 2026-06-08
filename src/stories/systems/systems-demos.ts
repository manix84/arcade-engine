import type { StoryObj } from "@storybook/html-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  addAchievementProgress,
  applyGravity2D,
  applyGravity3D,
  AchievementNotificationRenderer,
  createAchievementState,
  createHighScoreIntegrity,
  createHighScoreManager,
  createUserOptionsStore,
  defaultCustomDisplayFilterSettings,
  displayFilterModeLabels,
  displayFilterModes,
  getDisplayFilterSettingsForMode,
  createRagdoll2D,
  createRagdoll3D,
  createLocalMultiplayerController,
  createMultiplayerSession,
  createPlayerInputIntent,
  ScreenEffectManager,
  screenDropletsEffectId,
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

type DemoAchievementId = "first-sortie" | "wave-breaker" | "precision-run";

type SystemsStoryArgs = {
  baseScoreBudget?: number;
  displayFilterMode?: DisplayFilterMode;
  displayFilterBoost?: number;
  highScoreValue?: number;
  lowScoreValue?: number;
  maxAcceptedScore?: number;
  onAchievementProgress?: (id: DemoAchievementId) => void;
  onAchievementNotification?: (name: string) => void;
  onAchievementReset?: () => void;
  onAchievementUnlock?: (id: DemoAchievementId) => void;
  onHighScoreSave?: (entry: HighScoreEntry) => void;
  onHighScoreTamper?: (accepted: boolean, label: string) => void;
  onHighScoreValidate?: (accepted: boolean, label: string) => void;
  onScreenEffectChange?: (intensity: number) => void;
  screenEffectIntensity?: number;
  onUserOptionsChange?: (options: Record<string, unknown>) => void;
  precisionGoal?: number;
  waveGoal?: number;
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

export const ScreenDroplets: Story = {
  args: {
    onScreenEffectChange: fn(),
    screenEffectIntensity: 0.04,
  },
  argTypes: {
    screenEffectIntensity: {
      control: { max: 1, min: 0, step: 0.05, type: "range" },
      name: "Intensity",
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "Heavy Rain" }));
    await waitFor(() => expect(args.onScreenEffectChange).toHaveBeenCalledWith(1));
  },
  render: (args) => {
    const { canvas, metrics, shell } = createSystemsLayout("Screen droplets");
    const context = canvas.getContext("2d");
    const intensityValue = createValue("intensity");
    const dropletValue = createValue("effect");
    const usesValue = createValue("uses", "ScreenEffectManager");
    const manager = new ScreenEffectManager();
    let intensity = args.screenEffectIntensity ?? 0.04;
    let animationFrame = 0;
    let lastTime = performance.now();

    manager.enable(screenDropletsEffectId, {
      fadeMs: 0,
      intensity,
      settings: {
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
      },
    });

    const setIntensity = (nextIntensity: number): void => {
      intensity = Math.min(1, Math.max(0, nextIntensity));
      manager.setIntensity(screenDropletsEffectId, intensity, 260);
      setValue(intensityValue, intensity.toFixed(2));
      args.onScreenEffectChange?.(intensity);
    };

    const controls = document.createElement("div");
    controls.className = "ae-controls";
    controls.append(
      createButton("Light Rain", () => setIntensity(0.04)),
      createButton("Heavy Rain", () => setIntensity(1)),
      createButton("Clear Lens", () => setIntensity(0))
    );
    metrics.append(intensityValue, dropletValue, usesValue, controls);

    const render = (): void => {
      if (!context) {
        return;
      }

      const now = performance.now();
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      const shipX = canvas.width / 2 + Math.sin(now / 650) * 180;

      lastTime = now;
      fillCanvasWithTrail(context, canvas, "#07101a", 0.2);

      for (let y = 52; y < canvas.height; y += 56) {
        drawCanvasLine(
          context,
          { x: 0, y },
          { x: canvas.width, y: y + Math.sin(now / 700 + y) * 10 },
          "rgba(79, 209, 197, 0.12)",
          2
        );
      }

      drawCanvasLine(
        context,
        { x: 70, y: 285 },
        { x: canvas.width - 70, y: 285 },
        "rgba(203, 213, 225, 0.28)",
        3
      );
      drawTopDownShip(context, shipX, 220, {
        accent: "#f6e05e",
        heading: Math.sin(now / 480) * 18,
        label: "visor",
        scale: 1.08,
        thrust: 0.72,
      });

      manager.update(delta, { height: canvas.height, width: canvas.width });
      manager.render(context, { height: canvas.height, width: canvas.width });

      setValue(intensityValue, intensity.toFixed(2));
      setValue(dropletValue, screenDropletsEffectId);
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      manager.clear();
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
