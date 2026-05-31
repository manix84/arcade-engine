import type { Meta, StoryObj } from "@storybook/html-vite";
import { fn } from "storybook/test";
import { Sound } from "../../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createPanel,
  createToneUrl,
  createValue,
  drawTargetMarker,
  drawTopDownShip,
  onRemove,
  setValue,
} from "../story-utils.js";

const meta = {
  title: "Engine/Sound",
} satisfies Meta;

export default meta;

type MasterSoundArgs = {
  effectsMuted: boolean;
  effectsVolume: number;
  masterVolume: number;
  musicVolume: number;
  onLoopMusic: () => void;
  onMuteEffects: () => void;
  onPauseAll: () => void;
  onPlayEffect: () => void;
  onResumePaused: () => void;
  onStopAll: () => void;
};

type MasterSoundStory = StoryObj<MasterSoundArgs>;
type MusicStory = StoryObj<MusicArgs>;
type SoundEffectsStory = StoryObj<SoundEffectsArgs>;
type SpatialAudioStory = StoryObj<SpatialAudioArgs>;

type SoundEffectsArgs = {
  effectsVolume: number;
  onEffectsDown: () => void;
  onEffectsUp: () => void;
  onImpact: () => void;
  onLaser: () => void;
};

type MusicArgs = {
  musicVolume: number;
  onFadeInLoop: () => void;
  onFadeOut: () => void;
  onMusicDown: () => void;
  onMusicUp: () => void;
  onPause: () => void;
  onResume: () => void;
};

type SpatialAudioArgs = {
  autoMove: boolean;
  listenerRange: number;
  onMoveSource: () => void;
  onPlayGlobal: () => void;
  onSourceLeft: () => void;
  onSourceRight: () => void;
  onStartSpatialLoop: () => void;
  onStopAll: () => void;
};

type SoundScene = {
  canvas: HTMLCanvasElement;
  controls: HTMLDivElement;
  log: HTMLPreElement;
  shell: HTMLElement;
  values: HTMLDivElement;
};

const createSoundScene = (title: string, visualTitle = "Audio Field"): SoundScene => {
  const shell = createDemoShell(title);
  const grid = document.createElement("div");
  const visualPanel = createPanel(visualTitle);
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
  canvas.width = 720;
  canvas.height = 420;

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

const drawGrid = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void => {
  context.fillStyle = "#05070a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(245, 247, 251, 0.1)";
  context.lineWidth = 1;

  for (let x = 40; x < canvas.width; x += 40) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }

  for (let y = 40; y < canvas.height; y += 40) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
};

const drawBus = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  label: string,
  amount: number,
  color: string
): void => {
  context.strokeStyle = "rgba(245, 247, 251, 0.28)";
  context.strokeRect(x, y, width, 18);
  context.fillStyle = color;
  context.fillRect(x, y, width * amount, 18);
  context.fillStyle = "#f5f7fb";
  context.font = "14px monospace";
  context.fillText(label, x, y - 8);
};

const destroyUrls = (urls: string[]): void => {
  urls.forEach((url) => URL.revokeObjectURL(url));
};

export const MasterSound: MasterSoundStory = {
  args: {
    effectsMuted: false,
    effectsVolume: 0.8,
    masterVolume: 0.8,
    musicVolume: 0.6,
    onLoopMusic: fn(),
    onMuteEffects: fn(),
    onPauseAll: fn(),
    onPlayEffect: fn(),
    onResumePaused: fn(),
    onStopAll: fn(),
  },
  argTypes: {
    effectsMuted: { control: "boolean" },
    effectsVolume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    masterVolume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
    musicVolume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
  },
  render: (args: MasterSoundArgs) => {
    const { canvas, controls, log, shell, values } = createSoundScene(
      "Sound: Master Sound",
      "Global Mix"
    );
    const effectUrl = createToneUrl({
      durationSeconds: 0.42,
      frequency: 440,
      gain: 0.22,
      modulationFrequency: 5,
      waveform: "soft-square",
    });
    const musicUrl = createToneUrl({
      durationSeconds: 1.8,
      frequency: 146.83,
      gain: 0.2,
      modulationFrequency: 0.7,
      waveform: "triangle",
    });
    const masterValue = createValue("master", "0.8");
    const effectsValue = createValue("effects", "0.8");
    const musicValue = createValue("music", "0.6");
    const mutedValue = createValue("effects muted", "false");
    const stateValue = createValue("global state", "ready");
    let animationFrame = 0;
    let masterVolume = args.masterVolume;
    let effectsVolume = args.effectsVolume;
    let musicVolume = args.musicVolume;
    let effectsMuted = args.effectsMuted;
    let pulse = 0;

    Sound.configure({
      getVolume: (channel) =>
        masterVolume * (channel === "music" ? musicVolume : effectsVolume),
      onPlaybackBlocked: ({ channel }) => {
        setValue(stateValue, `${channel} blocked`);
        appendLog(log, `${channel} playback blocked`);
      },
    });

    const effect = new Sound(effectUrl, { channel: "effects" });
    const music = new Sound(musicUrl, { channel: "music", loop: true });

    const refresh = (): void => {
      Sound.setMuted(effectsMuted);
      Sound.refreshAllVolumes();
      setValue(masterValue, masterVolume.toFixed(1));
      setValue(effectsValue, effectsVolume.toFixed(1));
      setValue(musicValue, musicVolume.toFixed(1));
      setValue(mutedValue, String(effectsMuted));
    };

    const draw = (): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      pulse = Math.max(0, pulse - 0.025);
      drawGrid(context, canvas);
      drawBus(context, 96, 82, 520, "master output", masterVolume, "#90cdf4");
      drawBus(context, 96, 168, 220, "sound effects", effectsMuted ? 0 : effectsVolume, "#4fd1c5");
      drawBus(context, 396, 168, 220, "music", musicVolume, "#f6e05e");
      context.strokeStyle = "rgba(245, 247, 251, 0.26)";
      context.beginPath();
      context.moveTo(206, 168);
      context.lineTo(356, 100);
      context.lineTo(506, 168);
      context.stroke();
      drawTopDownShip(context, 206, 260, {
        accent: effectsMuted ? "#64748b" : "#4fd1c5",
        heading: 0,
        label: "effects",
        scale: 0.72,
        thrust: effectsMuted ? 0 : 0.35 + pulse,
      });
      drawTopDownShip(context, 506, 260, {
        accent: "#f6e05e",
        heading: 0,
        label: "music",
        scale: 0.72,
        thrust: musicVolume,
      });
      animationFrame = window.requestAnimationFrame(draw);
    };

    controls.append(
      createButton("Play Effect", () => {
        args.onPlayEffect();
        pulse = 1;
        effect.play();
        setValue(stateValue, "effect playing");
        appendLog(log, "effect play");
      }),
      createButton("Loop Music", () => {
        args.onLoopMusic();
        music.fadeInLoop(500);
        setValue(stateValue, "music loop");
        appendLog(log, "music fade in loop");
      }),
      createButton("Pause All", () => {
        args.onPauseAll();
        Sound.pauseAll();
        setValue(stateValue, "paused");
        appendLog(log, "pause all");
      }),
      createButton("Resume Paused", () => {
        args.onResumePaused();
        Sound.resumePaused();
        setValue(stateValue, "resumed");
        appendLog(log, "resume paused");
      }),
      createButton("Stop All", () => {
        args.onStopAll();
        Sound.stopAll();
        setValue(stateValue, "stopped");
        appendLog(log, "stop all");
      }),
      createButton("Master +", () => {
        masterVolume = Math.min(1, masterVolume + 0.1);
        refresh();
      }),
      createButton("Master -", () => {
        masterVolume = Math.max(0, masterVolume - 0.1);
        refresh();
      }),
      createButton("Mute Effects", () => {
        args.onMuteEffects();
        effectsMuted = !effectsMuted;
        refresh();
      })
    );
    values.append(masterValue, effectsValue, musicValue, mutedValue, stateValue);
    refresh();
    draw();
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      Sound.destroyAll();
      Sound.configure();
      destroyUrls([effectUrl, musicUrl]);
    });

    return shell;
  },
};

export const SoundEffects: SoundEffectsStory = {
  args: {
    effectsVolume: 0.8,
    onEffectsDown: fn(),
    onEffectsUp: fn(),
    onImpact: fn(),
    onLaser: fn(),
  },
  argTypes: {
    effectsVolume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
  },
  render: (args: SoundEffectsArgs) => {
    const { canvas, controls, log, shell, values } = createSoundScene(
      "Sound: Sound Effects",
      "Effect Bursts"
    );
    const laserUrl = createToneUrl({
      durationSeconds: 0.26,
      frequency: 523.25,
      gain: 0.2,
      modulationFrequency: 8,
      release: 0.14,
      waveform: "sine",
    });
    const hitUrl = createToneUrl({
      durationSeconds: 0.5,
      frequency: 196,
      gain: 0.24,
      modulationFrequency: 2.5,
      release: 0.22,
      waveform: "triangle",
    });
    const channelValue = createValue("effects volume", "0.8");
    const shotsValue = createValue("shots", "0");
    const stateValue = createValue("state", "ready");
    const bursts: Array<{ age: number; x: number; y: number }> = [];
    let animationFrame = 0;
    let effectsVolume = args.effectsVolume;
    let shots = 0;

    Sound.configure({
      getVolume: (channel) => (channel === "effects" ? effectsVolume : 0.5),
      onPlaybackBlocked: () => setValue(stateValue, "blocked"),
    });

    const playEffect = (kind: "hit" | "laser"): void => {
      const sound = new Sound(kind === "laser" ? laserUrl : hitUrl, {
        channel: "effects",
        instantDestroy: true,
      });

      shots++;
      bursts.push({
        age: 0,
        x: 520 + Math.sin(shots * 1.7) * 72,
        y: 180 + Math.cos(shots * 1.2) * 86,
      });
      setValue(shotsValue, shots);
      setValue(stateValue, kind);
      appendLog(log, `${kind} effect`);
      if (kind === "laser") {
        args.onLaser();
      } else {
        args.onImpact();
      }
      sound.play();
    };

    const draw = (): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      drawGrid(context, canvas);
      context.strokeStyle = "#4fd1c5";
      context.beginPath();
      context.moveTo(170, 210);
      context.lineTo(520, 180);
      context.stroke();
      drawTopDownShip(context, 170, 210, {
        accent: "#4fd1c5",
        heading: 85,
        label: "player",
        scale: 0.86,
        thrust: 0.4,
      });
      drawTargetMarker(context, 520, 180, {
        color: "#fc8181",
        label: "enemy",
        radius: 26,
      });

      for (let i = bursts.length - 1; i >= 0; i--) {
        const burst = bursts[i];

        burst.age += 0.025;
        if (burst.age >= 1) {
          bursts.splice(i, 1);
          continue;
        }

        context.strokeStyle = `rgba(246, 224, 94, ${1 - burst.age})`;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(burst.x, burst.y, 12 + burst.age * 58, 0, Math.PI * 2);
        context.stroke();
      }

      drawBus(context, 110, 340, 500, "effects channel", effectsVolume, "#4fd1c5");
      animationFrame = window.requestAnimationFrame(draw);
    };

    controls.append(
      createButton("Laser", () => playEffect("laser")),
      createButton("Impact", () => playEffect("hit")),
      createButton("Effects +", () => {
        args.onEffectsUp();
        effectsVolume = Math.min(1, effectsVolume + 0.1);
        Sound.refreshAllVolumes();
        setValue(channelValue, effectsVolume.toFixed(1));
      }),
      createButton("Effects -", () => {
        args.onEffectsDown();
        effectsVolume = Math.max(0, effectsVolume - 0.1);
        Sound.refreshAllVolumes();
        setValue(channelValue, effectsVolume.toFixed(1));
      })
    );
    values.append(channelValue, shotsValue, stateValue);
    draw();
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      Sound.destroyAll();
      Sound.configure();
      destroyUrls([laserUrl, hitUrl]);
    });

    return shell;
  },
};

export const Music: MusicStory = {
  args: {
    musicVolume: 0.6,
    onFadeInLoop: fn(),
    onFadeOut: fn(),
    onMusicDown: fn(),
    onMusicUp: fn(),
    onPause: fn(),
    onResume: fn(),
  },
  argTypes: {
    musicVolume: { control: { type: "range", min: 0, max: 1, step: 0.1 } },
  },
  render: (args: MusicArgs) => {
    const { canvas, controls, log, shell, values } = createSoundScene(
      "Sound: Music",
      "Loop And Fade"
    );
    const musicUrl = createToneUrl({
      durationSeconds: 2.4,
      frequency: 130.81,
      gain: 0.2,
      modulationFrequency: 0.8,
      release: 0.32,
      waveform: "triangle",
    });
    const volumeValue = createValue("music volume", "0.6");
    const fadeValue = createValue("fade", "ready");
    const loopValue = createValue("loop", "stopped");
    let animationFrame = 0;
    let musicVolume = args.musicVolume;
    let phase = 0;

    Sound.configure({ getVolume: (channel) => (channel === "music" ? musicVolume : 0.6) });
    const music = new Sound(musicUrl, { channel: "music", loop: true });

    const refresh = (): void => {
      Sound.refreshAllVolumes();
      setValue(volumeValue, musicVolume.toFixed(1));
    };

    const draw = (): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      phase += 0.035;
      drawGrid(context, canvas);
      context.strokeStyle = "#f6e05e";
      context.lineWidth = 3;
      context.beginPath();

      for (let x = 90; x <= 630; x += 8) {
        const y = 210 + Math.sin(phase + x / 32) * 34 * musicVolume;

        if (x === 90) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      context.stroke();
      drawTopDownShip(context, 360, 210, {
        accent: "#f6e05e",
        heading: 90,
        label: "music bed",
        scale: 0.9,
        thrust: musicVolume,
      });
      drawBus(context, 110, 340, 500, "music channel", musicVolume, "#f6e05e");
      animationFrame = window.requestAnimationFrame(draw);
    };

    controls.append(
      createButton("Fade In Loop", () => {
        args.onFadeInLoop();
        music.fadeInLoop(700);
        setValue(fadeValue, "fade in");
        setValue(loopValue, "looping");
        appendLog(log, "fade in loop");
      }),
      createButton("Fade Out", () => {
        args.onFadeOut();
        music.fadeOutAndDestroy(900);
        setValue(fadeValue, "fade out");
        setValue(loopValue, "destroying");
        appendLog(log, "fade out and destroy");
      }),
      createButton("Pause", () => {
        args.onPause();
        Sound.pauseAll();
        setValue(loopValue, "paused");
        appendLog(log, "pause all");
      }),
      createButton("Resume", () => {
        args.onResume();
        Sound.resumePaused();
        setValue(loopValue, "looping");
        appendLog(log, "resume paused");
      }),
      createButton("Music +", () => {
        args.onMusicUp();
        musicVolume = Math.min(1, musicVolume + 0.1);
        refresh();
      }),
      createButton("Music -", () => {
        args.onMusicDown();
        musicVolume = Math.max(0, musicVolume - 0.1);
        refresh();
      })
    );
    values.append(volumeValue, fadeValue, loopValue);
    refresh();
    draw();
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      Sound.destroyAll();
      Sound.configure();
      destroyUrls([musicUrl]);
    });

    return shell;
  },
};

export const SpatialAndGlobalAudio: SpatialAudioStory = {
  args: {
    autoMove: true,
    listenerRange: 260,
    onMoveSource: fn(),
    onPlayGlobal: fn(),
    onSourceLeft: fn(),
    onSourceRight: fn(),
    onStartSpatialLoop: fn(),
    onStopAll: fn(),
  },
  argTypes: {
    autoMove: { control: "boolean" },
    listenerRange: { control: { type: "range", min: 120, max: 320, step: 10 } },
  },
  render: (args: SpatialAudioArgs) => {
    const { canvas, controls, log, shell, values } = createSoundScene(
      "Sound: Spatial And Global Audio",
      "Listener Space"
    );
    const globalUrl = createToneUrl({
      durationSeconds: 0.5,
      frequency: 329.63,
      gain: 0.22,
      modulationFrequency: 1.5,
      waveform: "sine",
    });
    const spatialUrl = createToneUrl({
      durationSeconds: 1.6,
      frequency: 220,
      gain: 0.2,
      modulationFrequency: 0.9,
      release: 0.28,
      waveform: "triangle",
    });
    const modeValue = createValue("mode", "spatial");
    const panValue = createValue("pan", "0.00");
    const positionValue = createValue("position", "0, 0");
    let animationFrame = 0;
    let isMoving = args.autoMove;
    let sourceX = 230;
    let sourceY = 0;
    let sourceHeading = 270;
    let frame = 0;

    Sound.configure({
      getVolume: () => 0.65,
      onPlaybackBlocked: ({ channel }) => appendLog(log, `${channel} blocked`),
    });
    const globalSound = new Sound(globalUrl, { channel: "effects" });
    const spatialSound = new Sound(spatialUrl, { channel: "effects", loop: true });

    const refreshSpatial = (): void => {
      spatialSound.setPan(sourceX / args.listenerRange);
      spatialSound.setSpatialPosition(sourceX, sourceY, args.listenerRange, 170);
      setValue(panValue, (sourceX / args.listenerRange).toFixed(2));
      setValue(positionValue, `${Math.round(sourceX)}, ${Math.round(sourceY)}`);
    };

    const draw = (): void => {
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      frame++;
      if (isMoving) {
        const previousSourceX = sourceX;
        const previousSourceY = sourceY;

        sourceX = Math.sin(frame / 70) * 240;
        sourceY = Math.cos(frame / 95) * 140;
        sourceHeading =
          ((Math.atan2(sourceX - previousSourceX, -(sourceY - previousSourceY)) * 180) /
            Math.PI +
            360) %
          360;
        refreshSpatial();
      }

      drawGrid(context, canvas);
      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      context.strokeStyle = "rgba(144, 205, 244, 0.36)";
      context.beginPath();
      context.arc(0, 0, args.listenerRange, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = "#f6e05e";
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(sourceX, sourceY);
      context.stroke();
      drawTargetMarker(context, 0, 0, {
        color: "#90cdf4",
        label: "listener",
        radius: 24,
      });
      drawTopDownShip(context, sourceX, sourceY, {
        accent: "#f6e05e",
        heading: sourceHeading,
        label: "spatial source",
        scale: 0.76,
        thrust: 0.45,
      });
      context.restore();
      animationFrame = window.requestAnimationFrame(draw);
    };

    controls.append(
      createButton("Play Global", () => {
        args.onPlayGlobal();
        globalSound.play();
        setValue(modeValue, "global");
        appendLog(log, "global sound");
      }),
      createButton("Start Spatial Loop", () => {
        args.onStartSpatialLoop();
        spatialSound.loop();
        setValue(modeValue, "spatial loop");
        appendLog(log, "spatial loop");
      }),
      createButton("Stop All", () => {
        args.onStopAll();
        Sound.stopAll();
        setValue(modeValue, "stopped");
        appendLog(log, "stop all");
      }),
      createButton("Move Source", () => {
        args.onMoveSource();
        isMoving = !isMoving;
        appendLog(log, isMoving ? "source moving" : "source locked");
      }),
      createButton("Left", () => {
        args.onSourceLeft();
        isMoving = false;
        sourceX = Math.max(-args.listenerRange, sourceX - 40);
        sourceHeading = 270;
        refreshSpatial();
      }),
      createButton("Right", () => {
        args.onSourceRight();
        isMoving = false;
        sourceX = Math.min(args.listenerRange, sourceX + 40);
        sourceHeading = 90;
        refreshSpatial();
      })
    );
    values.append(modeValue, panValue, positionValue);
    refreshSpatial();
    draw();
    onRemove(shell, () => {
      window.cancelAnimationFrame(animationFrame);
      Sound.destroyAll();
      Sound.configure();
      destroyUrls([globalUrl, spatialUrl]);
    });

    return shell;
  },
};
