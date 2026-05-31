import type { Meta, StoryObj } from "@storybook/html-vite";
import { Sound } from "../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createPanel,
  createToneUrl,
  createValue,
  onRemove,
  setValue,
} from "./story-utils.js";

const meta = {
  title: "Engine/Sound",
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const ChannelsFadesAndSpatialControls: Story = {
  render: () => {
    const shell = createDemoShell("Sound");
    const grid = document.createElement("div");
    const controlsPanel = createPanel("Controls");
    const visualPanel = createPanel("Channel Visualizer");
    const statePanel = createPanel("State");
    const stage = document.createElement("div");
    const canvas = document.createElement("canvas");
    const controls = document.createElement("div");
    const values = document.createElement("div");
    const log = document.createElement("pre");
    const effectsVolume = createValue("effects volume", "0.8");
    const musicVolume = createValue("music volume", "0.5");
    const mutedValue = createValue("effects muted", "false");
    const panValue = createValue("pan", "0");
    const blockedValue = createValue("blocked", "0");
    const toneUrl = createToneUrl();
    let blockedCount = 0;
    let effectsVolumeNumber = 0.8;
    let musicVolumeNumber = 0.5;
    let muted = false;
    let pan = 0;
    let pulse = 0;
    let animationFrame = 0;

    appendStyles(shell);
    grid.className = "ae-grid";
    stage.className = "ae-stage";
    controls.className = "ae-controls";
    values.className = "ae-values";
    log.className = "ae-log";
    canvas.width = 640;
    canvas.height = 360;

    const appendLog = (message: string): void => {
      log.textContent = `${new Date().toLocaleTimeString()} ${message}\n${log.textContent}`.slice(
        0,
        1000
      );
    };

    const draw = (): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      pulse = Math.max(0, pulse - 0.025);
      context.fillStyle = "#05070a";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(79, 209, 197, 0.20)";
      context.fillRect(96, 260 - effectsVolumeNumber * 180, 120, effectsVolumeNumber * 180);
      context.fillStyle = "rgba(246, 224, 94, 0.22)";
      context.fillRect(424, 260 - musicVolumeNumber * 180, 120, musicVolumeNumber * 180);
      context.strokeStyle = "#4fd1c5";
      context.strokeRect(96, 80, 120, 180);
      context.strokeStyle = "#f6e05e";
      context.strokeRect(424, 80, 120, 180);
      context.fillStyle = "#f5f7fb";
      context.font = "16px monospace";
      context.fillText("effects", 118, 292);
      context.fillText("music", 462, 292);
      context.strokeStyle = "#90cdf4";
      context.beginPath();
      context.moveTo(260, 170);
      context.lineTo(380, 170);
      context.stroke();
      context.fillStyle = muted ? "#64748b" : "#fc8181";
      context.beginPath();
      context.arc(320 + pan * 60, 170, 18 + pulse * 36, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#f5f7fb";
      context.beginPath();
      context.arc(320 + pan * 60, 170, 18, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = "#cbd5e1";
      context.fillText("pan", 304, 216);
      animationFrame = window.requestAnimationFrame(draw);
    };

    Sound.configure({
      getVolume: (channel) =>
        channel === "music" ? musicVolumeNumber : effectsVolumeNumber,
      onPlaybackBlocked: ({ channel, sources }) => {
        blockedCount++;
        setValue(blockedValue, blockedCount);
        appendLog(`blocked ${channel}: ${sources.join(", ")}`);
      },
    });

    const effect = new Sound(toneUrl, {
      channel: "effects",
      onEnded: () => appendLog("effect ended"),
    });
    const music = new Sound(toneUrl, {
      channel: "music",
      loop: true,
    });

    const refresh = (): void => {
      Sound.setMuted(muted);
      Sound.refreshAllVolumes();
      effect.setPan(pan);
      effect.setSpatialPosition(pan * 240, 0, 240, 160);
      setValue(effectsVolume, effectsVolumeNumber.toFixed(1));
      setValue(musicVolume, musicVolumeNumber.toFixed(1));
      setValue(mutedValue, String(muted));
      setValue(panValue, pan.toFixed(1));
    };

    controls.append(
      createButton("Play Effect", () => {
        pulse = 1;
        effect.play();
        appendLog("effect play");
      }),
      createButton("Loop Music", () => {
        music.fadeInLoop(400);
        appendLog("music fade in");
      }),
      createButton("Fade Music Out", () => {
        music.fadeOutAndDestroy(900);
        appendLog("music fade out and destroy");
      }),
      createButton("Pause All", () => {
        Sound.pauseAll();
        appendLog("pause all");
      }),
      createButton("Resume Paused", () => {
        Sound.resumePaused();
        appendLog("resume paused");
      }),
      createButton("Stop All", () => {
        Sound.stopAll();
        appendLog("stop all");
      }),
      createButton("Mute Effects", () => {
        muted = !muted;
        refresh();
      }),
      createButton("Effects +", () => {
        effectsVolumeNumber = Math.min(1, effectsVolumeNumber + 0.1);
        refresh();
      }),
      createButton("Effects -", () => {
        effectsVolumeNumber = Math.max(0, effectsVolumeNumber - 0.1);
        refresh();
      }),
      createButton("Music +", () => {
        musicVolumeNumber = Math.min(1, musicVolumeNumber + 0.1);
        refresh();
      }),
      createButton("Music -", () => {
        musicVolumeNumber = Math.max(0, musicVolumeNumber - 0.1);
        refresh();
      }),
      createButton("Pan Left", () => {
        pan = Math.max(-1, pan - 0.25);
        refresh();
      }),
      createButton("Pan Right", () => {
        pan = Math.min(1, pan + 0.25);
        refresh();
      })
    );
    values.append(effectsVolume, musicVolume, mutedValue, panValue, blockedValue);
    stage.appendChild(canvas);
    visualPanel.appendChild(stage);
    controlsPanel.appendChild(controls);
    statePanel.append(values, log);
    grid.append(visualPanel, controlsPanel, statePanel);
    shell.appendChild(grid);
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
