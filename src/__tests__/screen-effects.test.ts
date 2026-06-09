import { describe, expect, it, vi } from "vitest";
import {
  createEnvironmentFireEffectDefinition,
  createEnvironmentFrostEffectDefinition,
  createEnvironmentHeatEffectDefinition,
  createEnvironmentUnderwaterEffectDefinition,
  createScreenFireEffectDefinition,
  createScreenFrostEffectDefinition,
  createScreenLowHealthEffectDefinition,
  createScreenPoisonEffectDefinition,
  createScreenShockEffectDefinition,
  createScreenSpeedBoostEffectDefinition,
  createScreenDropletsEffectDefinition,
  defaultScreenDropletsConfig,
  environmentFireEffectId,
  environmentFrostEffectId,
  environmentHeatEffectId,
  environmentUnderwaterEffectId,
  screenDropletsEffectId,
  screenFireEffectId,
  screenFrostEffectId,
  screenLowHealthEffectId,
  screenPoisonEffectId,
  screenShockEffectId,
  screenSpeedBoostEffectId,
  ScreenEffectManager,
  type ScreenEffectDefinition,
  type ScreenEffectInstance,
} from "../index.js";
import { createCanvasContextMock } from "../test/setup.js";

const createContext = (): CanvasRenderingContext2D =>
  createCanvasContextMock() as unknown as CanvasRenderingContext2D;

const viewport = { height: 360, width: 640 };

describe("screen effect manager", () => {
  it("registers built-in screen droplets by default", () => {
    const manager = new ScreenEffectManager();

    expect(manager.getRegisteredEffects()).toEqual([
      environmentFireEffectId,
      environmentFrostEffectId,
      environmentHeatEffectId,
      environmentUnderwaterEffectId,
      screenDropletsEffectId,
      screenFireEffectId,
      screenFrostEffectId,
      screenLowHealthEffectId,
      screenPoisonEffectId,
      screenShockEffectId,
      screenSpeedBoostEffectId,
    ]);

    manager.enable(screenDropletsEffectId, {
      fadeMs: 0,
      intensity: 1,
      settings: {
        random: () => 0.5,
        spawnRate: 50,
      },
    });
    manager.update(0.03, viewport);

    const context = createContext();
    manager.render(context, viewport);

    expect(context.fillRect).toHaveBeenCalled();
    expect(context.imageSmoothingEnabled).toBe(false);
  });

  it("updates and renders active effects in priority order", () => {
    const calls: string[] = [];
    const createDefinition = (label: string, priority: number): ScreenEffectDefinition => ({
      create: (): ScreenEffectInstance => ({
        destroy: () => calls.push(`${label}:destroy`),
        render: () => calls.push(`${label}:render`),
        update: ({ intensity }) => calls.push(`${label}:update:${intensity.toFixed(1)}`),
      }),
      priority,
    });
    const manager = new ScreenEffectManager({ registerBuiltIns: false });

    manager.register("front", createDefinition("front", 20));
    manager.register("back", createDefinition("back", 5));
    manager.enable("front", { fadeMs: 0, intensity: 1 });
    manager.enable("back", { fadeMs: 0, intensity: 1 });
    manager.update(1 / 60, viewport);
    manager.render(createContext(), viewport);

    expect(calls).toEqual([
      "front:update:1.0",
      "back:update:1.0",
      "back:render",
      "front:render",
    ]);
  });

  it("fades effects in and out before destroying them", () => {
    const destroy = vi.fn();
    const update = vi.fn();
    const manager = new ScreenEffectManager({ registerBuiltIns: false });

    manager.register("fade", {
      create: () => ({
        destroy,
        render: vi.fn(),
        update,
      }),
    });

    manager.enable("fade", { fadeMs: 1000, intensity: 1 });
    manager.update(0.25, viewport);
    expect(update).toHaveBeenLastCalledWith({
      deltaTime: 0.25,
      intensity: 0.25,
      viewport,
    });

    manager.disable("fade", { fadeMs: 500 });
    manager.update(0.25, viewport);
    expect(manager.isEnabled("fade")).toBe(false);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("clears and unregisters active effects", () => {
    const destroy = vi.fn();
    const manager = new ScreenEffectManager({ registerBuiltIns: false });

    manager.register("custom", {
      create: () => ({
        destroy,
        render: vi.fn(),
        update: vi.fn(),
      }),
    });
    manager.enable("custom", { fadeMs: 0, intensity: 1 });

    expect(manager.getActiveEffects()).toEqual([
      { effectId: "custom", isActive: false, priority: 0 },
    ]);

    manager.update(0, viewport);
    expect(manager.getActiveEffects()).toEqual([
      { effectId: "custom", isActive: true, priority: 0 },
    ]);

    manager.clear();
    expect(manager.isEnabled("custom")).toBe(false);
    expect(destroy).toHaveBeenCalledTimes(1);

    manager.enable("custom", { fadeMs: 0 });
    manager.unregister("custom");
    expect(manager.getRegisteredEffects()).toEqual([]);
  });

  it("throws when enabling an unknown effect", () => {
    const manager = new ScreenEffectManager({ registerBuiltIns: false });

    expect(() => manager.enable("missing")).toThrow(
      'Screen effect "missing" has not been registered.'
    );
  });
});

describe("pixel screen feedback effects", () => {
  it.each([
    ["fire", createScreenFireEffectDefinition],
    ["frost", createScreenFrostEffectDefinition],
    ["low-health", createScreenLowHealthEffectDefinition],
    ["poison", createScreenPoisonEffectDefinition],
    ["shock", createScreenShockEffectDefinition],
    ["speed-boost", createScreenSpeedBoostEffectDefinition],
  ] as const)("draws pixel-art %s feedback with rectangles", (_label, createDefinition) => {
    const definition = createDefinition({
      maxParticles: 4,
      pixelSize: 6,
      random: () => 0.5,
      spawnRate: 80,
    });
    const effect = definition.create();
    const context = createContext();

    effect.update({
      deltaTime: 0.1,
      intensity: 1,
      viewport,
    });
    effect.render(context, viewport, { intensity: 1 });

    expect(context.fillRect).toHaveBeenCalled();
    expect(context.arc).not.toHaveBeenCalled();
    expect(context.lineTo).not.toHaveBeenCalled();
    expect(context.imageSmoothingEnabled).toBe(false);
  });
});

describe("environment screen effects", () => {
  it.each([
    ["fire", createEnvironmentFireEffectDefinition, true],
    ["frost", createEnvironmentFrostEffectDefinition, false],
    ["heat", createEnvironmentHeatEffectDefinition, true],
    ["underwater", createEnvironmentUnderwaterEffectDefinition, true],
  ] as const)(
    "draws pixel-art %s environment feedback",
    (_label, createDefinition, distorts) => {
      const definition = createDefinition({
        maxParticles: 4,
        pixelSize: 6,
        random: () => 0.5,
        spawnRate: 80,
      });
      const effect = definition.create();
      const context = createContext();

      (context as unknown as { canvas: HTMLCanvasElement }).canvas =
        document.createElement("canvas");
      effect.update({
        deltaTime: 0.1,
        intensity: 1,
        viewport,
      });
      effect.render(context, viewport, { intensity: 1 });

      expect(context.fillRect).toHaveBeenCalled();
      if (distorts) {
        expect(context.drawImage).toHaveBeenCalled();
      }
      expect(context.arc).not.toHaveBeenCalled();
      expect(context.lineTo).not.toHaveBeenCalled();
      expect(context.imageSmoothingEnabled).toBe(false);
    }
  );
});

describe("screen droplets effect", () => {
  it("normalizes droplet configuration and draws pooled droplets", () => {
    const random = vi.fn(() => 0.5);
    const definition = createScreenDropletsEffectDefinition({
      fadeSpeed: Number.NaN,
      maxDroplets: 2,
      maxSize: 8,
      minSize: 8,
      random,
      slideSpeed: 30,
      spawnRate: 120,
      trailLength: 12,
    });
    const effect = definition.create();
    const context = createContext();

    effect.update({
      deltaTime: 0.1,
      intensity: 1,
      viewport,
    });
    effect.render(context, viewport, { intensity: 1 });

    expect(random).toHaveBeenCalled();
    expect(context.fillRect).toHaveBeenCalled();
    expect(context.lineTo).not.toHaveBeenCalled();

    effect.update({
      deltaTime: 10,
      intensity: 1,
      viewport,
    });
    effect.render(context, viewport, { intensity: 1 });

    expect(defaultScreenDropletsConfig.fadeSpeed).toBe(0.95);
    expect(defaultScreenDropletsConfig.focusMode).toBe("arcade");
    expect(defaultScreenDropletsConfig.mergeEnabled).toBe(true);
    expect(defaultScreenDropletsConfig.spawnRate).toBe(2);
  });

  it("waits briefly on impact before sliding and drawing a trail", () => {
    const definition = createScreenDropletsEffectDefinition({
      maxDroplets: 4,
      maxSize: 8,
      minSize: 8,
      random: () => 0.5,
      spawnRate: 50,
      trailLength: 12,
    });
    const effect = definition.create();
    const context = createContext();
    const calls = (
      context as unknown as {
        calls: Array<{ method: string }>;
      }
    ).calls;

    effect.update({
      deltaTime: 0.02,
      intensity: 1,
      viewport,
    });
    effect.render(context, viewport, { intensity: 1 });
    const impactFillRects = calls.filter((call) => call.method === "fillRect").length;

    effect.update({
      deltaTime: 0.35,
      intensity: 1,
      viewport,
    });
    effect.render(context, viewport, { intensity: 1 });
    const slidingFillRects = calls.filter((call) => call.method === "fillRect").length;

    expect(slidingFillRects).toBeGreaterThan(impactFillRects * 2);
  });
});
