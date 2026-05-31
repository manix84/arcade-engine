import type { Meta, StoryObj } from "@storybook/html-vite";
import { Sound } from "../../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createPanel,
  createToneUrl,
  createValue,
  onRemove,
  setValue,
} from "../story-utils.js";

const meta = {
  title: "Engine/Sound",
} satisfies Meta;

export default meta;

type Story = StoryObj;

const createSoundShell = (title: string): {
  canvas: HTMLCanvasElement;
  controls: HTMLDivElement;
  log: HTMLPreElement;
  shell: HTMLElement;
  values: HTMLDivElement;
} => {
  const shell = createDemoShell(title);
  const grid = document.createElement("div");
  const visualPanel = createPanel("Visualizer");
  const controlsPanel = createPanel("Controls");
  const statePanel = createPanel("State");
  const stage = document.createElement("div");
  const canvas = document.createElement("canvas");
  const controls = document.createElement("div");
  const values = document.createElement("div");
  const log = document.createElement("pre");

  appendStyles(shell);
  grid.className = "ae-grid";
  stage.className = "ae-stage";
  controls.className = "ae-controls";
  values.className = "ae-values";
  log.className = "ae-log";
  canvas.width = 640;
  canvas.height = 360;

  stage.appendChild(canvas);
  visualPanel.appendChild(stage);
  controlsPanel.appendChild(controls);
  statePanel.append(values, log);
  grid.append(visualPanel, controlsPanel, statePanel);
  shell.appendChild(grid);

  return { canvas, controls, log, shell, values };
};

const appendLog = (log: HTMLPreElement, message: string): void => {
  log.textContent = `${new Date().toLocaleTimeString()} ${message}\n${log.textContent}`.slice(
    0,
    900
  );
};

export const PlaybackAndGlobalControls: Story = {
  render: () => {
    const { canvas, controls, log, shell, values } = createSoundShell("Sound playback");
    const toneUrl = createToneUrl();
    const stateValue = createValue("state", "ready");
    const blockedValue = createValue("blocked", "0");
    let pulse = 0;
    let blockedCount = 0;
    let animationFrame = 0;

    Sound.configure({
      getVolume: () => 0.65,
      onPlaybackBlocked: () => {
        blockedCount++;
        setValue(blockedValue, blockedCount);
      },
    });

    const effect = new Sound(toneUrl, {
      channel: "effects",
      onEnded: () => setValue(stateValue, "ended"),
    });
    const draw = (): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      pulse = Math.max(0, pulse - 0.025);
      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(252, 129, 129, 0.22)";
      context.beginPath();
      context.arc(canvas.width / 2, canvas.height / 2, 38 + pulse * 120, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#fc8181";
      context.beginPath();
      context.arc(canvas.width / 2, canvas.height / 2, 38, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "#f5f7fb";
      context.font = "18px monospace";
      context.fillText("play / pause / resume / stop", 168, 314);
      animationFrame = window.requestAnimationFrame(draw);
    };

    controls.append(
      createButton("Play", () => {
        pulse = 1;
        setValue(stateValue, "playing");
        appendLog(log, "play");
        effect.play();
      }),
      createButton("Pause All", () => {
        Sound.pauseAll();
        setValue(stateValue, "paused");
        appendLog(log, "pause all");
      }),
      createButton("Resume Paused", () => {
        Sound.resumePaused();
        setValue(stateValue, "resumed");
        appendLog(log, "resume paused");
      }),
      createButton("Stop All", () => {
        Sound.stopAll();
        setValue(stateValue, "stopped");
        appendLog(log, "stop all");
      })
    );
    values.append(stateValue, blockedValue);
    draw();
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      URL.revokeObjectURL(toneUrl);
      Sound.destroyAll();
      Sound.configure();
    });

    return shell;
  },
};

export const ChannelsAndVolume: Story = {
  render: () => {
    const { canvas, controls, shell, values } = createSoundShell("Sound channels");
    const effectsValue = createValue("effects", "0.8");
    const musicValue = createValue("music", "0.5");
    let effectsVolume = 0.8;
    let musicVolume = 0.5;
    let animationFrame = 0;

    Sound.configure({
      getVolume: (channel) => (channel === "music" ? musicVolume : effectsVolume),
    });

    const refresh = (): void => {
      Sound.refreshAllVolumes();
      setValue(effectsValue, effectsVolume.toFixed(1));
      setValue(musicValue, musicVolume.toFixed(1));
    };
    const draw = (): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(79, 209, 197, 0.28)";
      context.fillRect(140, 280 - effectsVolume * 210, 120, effectsVolume * 210);
      context.fillStyle = "rgba(246, 224, 94, 0.28)";
      context.fillRect(380, 280 - musicVolume * 210, 120, musicVolume * 210);
      context.strokeStyle = "#f5f7fb";
      context.strokeRect(140, 70, 120, 210);
      context.strokeRect(380, 70, 120, 210);
      context.fillStyle = "#f5f7fb";
      context.font = "18px monospace";
      context.fillText("effects", 160, 316);
      context.fillText("music", 410, 316);
      animationFrame = window.requestAnimationFrame(draw);
    };

    controls.append(
      createButton("Effects +", () => {
        effectsVolume = Math.min(1, effectsVolume + 0.1);
        refresh();
      }),
      createButton("Effects -", () => {
        effectsVolume = Math.max(0, effectsVolume - 0.1);
        refresh();
      }),
      createButton("Music +", () => {
        musicVolume = Math.min(1, musicVolume + 0.1);
        refresh();
      }),
      createButton("Music -", () => {
        musicVolume = Math.max(0, musicVolume - 0.1);
        refresh();
      })
    );
    values.append(effectsValue, musicValue);
    refresh();
    draw();
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      Sound.destroyAll();
      Sound.configure();
    });

    return shell;
  },
};

export const SpatialPanAndFade: Story = {
  render: () => {
    const { canvas, controls, log, shell, values } = createSoundShell("Sound spatial pan and fades");
    const toneUrl = createToneUrl();
    const panValue = createValue("pan", "0");
    const fadeValue = createValue("fade", "ready");
    let pan = 0;
    let animationFrame = 0;

    Sound.configure({ getVolume: () => 0.55 });
    const music = new Sound(toneUrl, { channel: "music", loop: true });
    const refresh = (): void => {
      music.setPan(pan);
      music.setSpatialPosition(pan * 240, 0, 240, 160);
      setValue(panValue, pan.toFixed(2));
    };
    const draw = (): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = "#90cdf4";
      context.beginPath();
      context.moveTo(120, canvas.height / 2);
      context.lineTo(canvas.width - 120, canvas.height / 2);
      context.stroke();
      context.fillStyle = "#f6e05e";
      context.beginPath();
      context.arc(canvas.width / 2 + pan * 200, canvas.height / 2, 30, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#f5f7fb";
      context.font = "18px monospace";
      context.fillText("stereo / spatial position", 198, 310);
      animationFrame = window.requestAnimationFrame(draw);
    };

    controls.append(
      createButton("Fade In Loop", () => {
        music.fadeInLoop(700);
        setValue(fadeValue, "fade in loop");
        appendLog(log, "fade in loop");
      }),
      createButton("Fade Out Destroy", () => {
        music.fadeOutAndDestroy(900);
        setValue(fadeValue, "fade out destroy");
        appendLog(log, "fade out destroy");
      }),
      createButton("Left", () => {
        pan = Math.max(-1, pan - 0.25);
        refresh();
      }),
      createButton("Right", () => {
        pan = Math.min(1, pan + 0.25);
        refresh();
      })
    );
    values.append(panValue, fadeValue);
    refresh();
    draw();
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      URL.revokeObjectURL(toneUrl);
      Sound.destroyAll();
      Sound.configure();
    });

    return shell;
  },
};
