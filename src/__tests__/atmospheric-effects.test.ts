import { describe, expect, it } from "vitest";
import {
  createAtmosphericAshEmberEffect,
  createAtmosphericRainEffect,
  createAtmosphericSnowEffect,
} from "../index.js";
import { createCanvasContextMock } from "../test/setup.js";

const createContext = (): CanvasRenderingContext2D =>
  createCanvasContextMock() as unknown as CanvasRenderingContext2D;

const viewport = { height: 180, width: 320 };
const tallViewport = { height: 10000, width: 320 };

describe("atmospheric rain effect", () => {
  it("spawns pixel rain drops by density and renders snapped rectangles", () => {
    const effect = createAtmosphericRainEffect({
      density: "storm",
      pixelSize: 2,
      random: () => 0.5,
    });
    const context = createContext();

    effect.update(0.1, viewport);
    effect.render(context, viewport);

    expect(effect.getActiveDropCount()).toBeGreaterThan(0);
    expect(context.fillRect).toHaveBeenCalled();
    expect(context.lineTo).not.toHaveBeenCalled();
    expect(context.arc).not.toHaveBeenCalled();
    expect(context.imageSmoothingEnabled).toBe(false);
  });

  it("keeps rain bounded by max drops and clears active particles", () => {
    const effect = createAtmosphericRainEffect({
      density: "storm",
      maxDrops: 3,
      random: () => 0.5,
      spawnRate: 200,
    });

    effect.update(0.1, viewport);
    expect(effect.getActiveDropCount()).toBe(3);

    effect.clear();
    expect(effect.getActiveDropCount()).toBe(0);
    expect(effect.getActiveSplashCount()).toBe(0);
  });

  it("creates short-lived splashes when drops reach the bottom", () => {
    const effect = createAtmosphericRainEffect({
      density: "heavy",
      random: () => 0.5,
      spawnRate: 40,
    });

    effect.update(0.1, viewport);
    for (let index = 0; index < 8; index += 1) {
      effect.update(0.1, viewport);
    }

    expect(effect.getActiveSplashCount()).toBeGreaterThan(0);

    effect.setOptions({ spawnRate: 0 });
    for (let index = 0; index < 8; index += 1) {
      effect.update(0.1, viewport);
    }

    expect(effect.getActiveSplashCount()).toBe(0);
  });

  it("accepts runtime wind and density changes", () => {
    const effect = createAtmosphericRainEffect({
      density: "light",
      random: () => 0.5,
      spawnRate: 10,
      wind: 0,
    });

    effect.setOptions({
      density: "storm",
      maxDrops: 5,
      spawnRate: 80,
      wind: 180,
    });
    effect.update(0.1, viewport);

    expect(effect.getActiveDropCount()).toBe(5);
  });

  it("uses new density defaults when changing only the rain density preset", () => {
    const effect = createAtmosphericRainEffect({
      density: "medium",
      random: () => 0.5,
    });

    effect.setOptions({ density: "storm" });
    for (let index = 0; index < 8; index += 1) {
      effect.update(0.1, tallViewport);
    }

    expect(effect.getActiveDropCount()).toBe(170);
  });
});

describe("atmospheric snow effect", () => {
  it("spawns layered pixel snowflakes and renders rectangles", () => {
    const effect = createAtmosphericSnowEffect({
      density: "blizzard",
      pixelSize: 2,
      random: () => 0.75,
    });
    const context = createContext();

    effect.update(0.1, viewport);
    effect.render(context, viewport);

    expect(effect.getActiveFlakeCount()).toBeGreaterThan(0);
    expect(context.fillRect).toHaveBeenCalled();
    expect(context.lineTo).not.toHaveBeenCalled();
    expect(context.arc).not.toHaveBeenCalled();
    expect(context.imageSmoothingEnabled).toBe(false);
  });

  it("keeps snow bounded by max flakes and clears state", () => {
    const effect = createAtmosphericSnowEffect({
      density: "blizzard",
      maxFlakes: 4,
      random: () => 0.5,
      spawnRate: 200,
    });

    effect.update(0.1, viewport);
    expect(effect.getActiveFlakeCount()).toBe(4);

    effect.clear();
    expect(effect.getActiveFlakeCount()).toBe(0);
    expect(effect.getAccumulationHeight()).toBe(0);
  });

  it("can accumulate a pixel snow layer at the bottom", () => {
    const effect = createAtmosphericSnowEffect({
      accumulationEnabled: true,
      accumulationLimit: 8,
      accumulationRate: 2,
      density: "heavy-snow",
      random: () => 0.8,
      spawnRate: 80,
    });
    const context = createContext();

    for (let index = 0; index < 32; index += 1) {
      effect.update(0.1, viewport);
    }
    effect.render(context, viewport);

    expect(effect.getAccumulationHeight()).toBeGreaterThan(0);
    expect(effect.getAccumulationHeight()).toBeLessThanOrEqual(8);
    expect(context.fillRect).toHaveBeenCalled();
  });

  it("accepts runtime density, wind, and accumulation changes", () => {
    const effect = createAtmosphericSnowEffect({
      density: "light-flurry",
      random: () => 0.5,
      spawnRate: 8,
      wind: 0,
    });

    effect.setOptions({
      accumulationEnabled: true,
      density: "blizzard",
      maxFlakes: 6,
      spawnRate: 80,
      wind: 140,
    });
    effect.update(0.1, viewport);

    expect(effect.getActiveFlakeCount()).toBe(6);
  });

  it("uses new density defaults when changing only the snow density preset", () => {
    const effect = createAtmosphericSnowEffect({
      density: "snow",
      random: () => 0.5,
    });

    effect.setOptions({ density: "blizzard" });
    for (let index = 0; index < 11; index += 1) {
      effect.update(0.1, tallViewport);
    }

    expect(effect.getActiveFlakeCount()).toBe(160);
  });
});

describe("atmospheric ash and ember effect", () => {
  it("spawns ash and embers together and renders pixel rectangles", () => {
    const effect = createAtmosphericAshEmberEffect({
      emberRatio: 0.5,
      intensity: "wildfire",
      pixelSize: 2,
      random: () => 0.4,
      spawnRate: 60,
    });
    const context = createContext();

    effect.update(0.1, viewport);
    effect.render(context, viewport);

    expect(effect.getActiveParticleCount()).toBeGreaterThan(0);
    expect(effect.getActiveEmberCount()).toBeGreaterThan(0);
    expect(context.fillRect).toHaveBeenCalled();
    expect(context.lineTo).not.toHaveBeenCalled();
    expect(context.arc).not.toHaveBeenCalled();
    expect(context.imageSmoothingEnabled).toBe(false);
  });

  it("supports ash-only atmospheric drift", () => {
    const effect = createAtmosphericAshEmberEffect({
      emberRatio: 0,
      maxParticles: 5,
      random: () => 0.8,
      spawnRate: 80,
    });

    effect.update(0.1, viewport);

    expect(effect.getActiveAshCount()).toBe(5);
    expect(effect.getActiveEmberCount()).toBe(0);
  });

  it("supports ember-heavy foreground energy", () => {
    const effect = createAtmosphericAshEmberEffect({
      emberRatio: 1,
      maxParticles: 4,
      random: () => 0.2,
      spawnRate: 80,
    });

    effect.update(0.1, viewport);

    expect(effect.getActiveAshCount()).toBe(0);
    expect(effect.getActiveEmberCount()).toBe(4);
  });

  it("accepts runtime intensity and wind changes", () => {
    const effect = createAtmosphericAshEmberEffect({
      intensity: "smolder",
      random: () => 0.5,
      spawnRate: 5,
      wind: 0,
    });

    effect.setOptions({
      intensity: "inferno",
      maxParticles: 6,
      spawnRate: 80,
      wind: 90,
    });
    effect.update(0.1, viewport);

    expect(effect.getActiveParticleCount()).toBe(6);

    effect.clear();
    expect(effect.getActiveParticleCount()).toBe(0);
  });

  it("uses new intensity defaults when changing only the ash and ember preset", () => {
    const effect = createAtmosphericAshEmberEffect({
      intensity: "smolder",
      random: () => 0.5,
    });

    effect.setOptions({ intensity: "inferno" });
    for (let index = 0; index < 15; index += 1) {
      effect.update(0.1, tallViewport);
    }

    expect(effect.getActiveParticleCount()).toBe(140);
  });
});
