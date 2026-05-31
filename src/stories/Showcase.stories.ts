import type { Meta, StoryObj } from "@storybook/html-vite";
import {
  GameArena,
  Sound,
  Ticker,
  drawDebugVectors,
  getScaledViewportLimit,
  getViewportPaddedRadius,
  helpers,
} from "../index.js";
import {
  appendStyles,
  createButton,
  createDemoShell,
  createPanel,
  createToneUrl,
  createValue,
  drawTopDownShip,
  onRemove,
  setValue,
} from "./story-utils.js";

const meta = {
  title: "Engine/Showcase",
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const AnimatedArcadeLoop: Story = {
  render: () => {
    const shell = createDemoShell("Arcade Engine Showcase");
    const grid = document.createElement("div");
    const stagePanel = createPanel("Playable Surface");
    const systemsPanel = createPanel("Live Systems");
    const stage = document.createElement("div");
    const values = document.createElement("div");
    const controls = document.createElement("div");
    const log = document.createElement("pre");
    const tickValue = createValue("ticker frames", "0");
    const collisionValue = createValue("collision");
    const radiusValue = createValue("despawn radius");
    const spawnValue = createValue("spawn budget");
    const headingValue = createValue("heading");
    const soundValue = createValue("sound");
    const toneUrl = createToneUrl();
    const arena = new GameArena(stage, {
      debugGridColor: "rgba(245, 247, 251, 0.10)",
      fontFamily: "monospace",
    });
    arena.resize(760, 440);
    const ticker = new Ticker({ fixedStepFps: 50, maxCatchUpFrames: 4 });
    const effect = new Sound(toneUrl, {
      channel: "effects",
      onEnded: () => setValue(soundValue, "ended"),
    });
    const player = { heading: 0, posX: 0, posY: 0, radius: 22 };
    const enemies = Array.from({ length: 10 }, (_, index) => ({
      angle: index * 36,
      heading: index * 20,
      radius: 12 + (index % 3) * 4,
      speed: 0.8 + index * 0.08,
      posX: 0,
      posY: 0,
    }));
    let frame = 0;

    appendStyles(shell);
    grid.className = "ae-grid";
    stage.className = "ae-stage";
    values.className = "ae-values";
    controls.className = "ae-controls";
    log.className = "ae-log";

    Sound.configure({
      getVolume: () => 0.55,
      onPlaybackBlocked: () => setValue(soundValue, "blocked"),
    });

    const draw = (): void => {
      const context = arena.getContext() as CanvasRenderingContext2D;
      const viewport = { width: arena.width, height: arena.height };
      const despawnRadius = getViewportPaddedRadius(viewport, {
        minRadius: 420,
        padding: 120,
      });
      const spawnBudget = getScaledViewportLimit(6, viewport);
      let collided = false;

      arena.clear();
      arena.setBackgroundColor("#05070a");
      arena.drawDebugGrid(48, 48);

      for (let i = 0; i < 18; i++) {
        const x = Math.sin(frame / 70 + i) * arena.width * 0.48;
        const y = ((frame * (0.6 + i * 0.04) + i * 90) % (arena.height + 120)) -
          arena.height / 2 -
          60;

        arena.drawCircle(x, y, 18 + (i % 5) * 8, {
          backgroundColor: "rgba(144, 205, 244, 0.10)",
          borderColor: false,
        });
      }

      const previousPlayerX = player.posX;
      const previousPlayerY = player.posY;

      player.posX = helpers.float(Math.sin(frame / 45) * 90);
      player.posY = helpers.float(Math.cos(frame / 55) * 52);
      player.heading =
        ((Math.atan2(player.posX - previousPlayerX, -(player.posY - previousPlayerY)) * 180) /
          Math.PI +
          360) %
        360;

      enemies.forEach((enemy, index) => {
        enemy.angle = (enemy.angle + enemy.speed) % 360;
        enemy.posX = helpers.float(Math.sin(enemy.angle * (Math.PI / 180)) * (150 + index * 9));
        enemy.posY = helpers.float(-Math.cos(enemy.angle * (Math.PI / 180)) * (96 + index * 5));
        enemy.heading = helpers.findHeading(player, enemy);

        const hit = helpers.detectCollision(enemy, player);
        collided = collided || hit;

        arena.drawCircle(enemy.posX, enemy.posY, enemy.radius, {
          backgroundColor: hit ? "#fc8181" : "rgba(79, 209, 197, 0.22)",
          borderColor: hit ? "#fff7ae" : "#4fd1c5",
        });
        drawTopDownShip(context, enemy.posX, enemy.posY, {
          accent: hit ? "#fc8181" : "#4fd1c5",
          heading: enemy.heading,
          scale: 0.24 + enemy.radius / 90,
        });
        drawDebugVectors(
          context,
          enemy.posX,
          enemy.posY,
          enemy.heading,
          helpers.rotateTo(player.heading, enemy.heading, 35),
          {
            heading: "#90cdf4",
            steering: "#f6e05e",
            steeringArcFill: "rgba(246, 224, 94, 0.14)",
          },
          { fillTurnArc: index % 2 === 0, length: 24 }
        );
      });

      drawTopDownShip(context, player.posX, player.posY, {
        accent: "#f6e05e",
        heading: Number.isFinite(player.heading) ? player.heading : 0,
        label: "player",
        scale: 0.9,
        thrust: 0.55,
      });
      drawDebugVectors(
        context,
        player.posX,
        player.posY,
        player.heading,
        helpers.rotateTo(player.heading + 80, player.heading, 25),
        {
          heading: "#f5f7fb",
          steering: "#fc8181",
          steeringArcFill: "rgba(252, 129, 129, 0.2)",
        },
        { fillTurnArc: true, length: 52 }
      );
      arena.renderText("ARCADE ENGINE", 0, -arena.height / 2 + 34, {
        align: "center",
        color: "#f5f7fb",
        size: 24,
        stroke: "#05070a",
        strokeWidth: 4,
      });
      arena.renderText("CANVAS • TICKER • HELPERS • SOUND", 0, arena.height / 2 - 44, {
        align: "center",
        color: "#f6e05e",
        size: 14,
      });

      setValue(tickValue, ticker.getTicks());
      setValue(collisionValue, collided ? "yes" : "no");
      setValue(radiusValue, despawnRadius.toFixed(1));
      setValue(spawnValue, spawnBudget);
      setValue(headingValue, player.heading.toFixed(1));
    };

    ticker.addSchedule(() => {
      frame++;
      draw();
    }, 1);
    ticker.addSchedule(() => {
      log.textContent = `spawn ${JSON.stringify(
        helpers.getSpawnCoords(player, { spawnArc: 110, spawnRadius: 260 })
      )}\n${log.textContent}`.slice(0, 600);
    }, 50);

    controls.append(
      createButton("Start", () => ticker.start()),
      createButton("Pause", () => ticker.stop()),
      createButton("Ping", () => {
        setValue(soundValue, "playing");
        effect.play();
      }),
      createButton("Reset", () => {
        ticker.clearTicks();
        frame = 0;
        draw();
      })
    );
    values.append(tickValue, collisionValue, radiusValue, spawnValue, headingValue, soundValue);
    stagePanel.appendChild(stage);
    systemsPanel.append(values, controls, log);
    grid.append(stagePanel, systemsPanel);
    shell.appendChild(grid);

    draw();
    ticker.start();
    onRemove(shell, () => {
      if (ticker.isRunning) {
        ticker.stop();
      }

      effect.destroy();
      Sound.configure();
      URL.revokeObjectURL(toneUrl);
      arena.destroy();
    });

    return shell;
  },
};
