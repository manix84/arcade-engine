import { describe, expect, it, vi } from "vitest";
import {
  createScreenDropletsEffectDefinition,
  defaultScreenDropletsConfig,
  screenDropletsEffectId,
  ScreenEffectManager,
  type ScreenEffectDefinition,
  type ScreenEffectInstance,
} from "../index.js";
import { createCanvasContextMock } from "../test/setup.js";

const createContext = (): CanvasRenderingContext2D => {
  const context = createCanvasContextMock() as unknown as CanvasRenderingContext2D;

  context.ellipse = vi.fn(() => undefined) as unknown as CanvasRenderingContext2D["ellipse"];
  return context;
};

const viewport = { height: 360, width: 640 };

describe("screen effect manager", () => {
  it("registers built-in screen droplets by default", () => {
    const manager = new ScreenEffectManager();

    expect(manager.getRegisteredEffects()).toContain(screenDropletsEffectId);

    manager.enable(screenDropletsEffectId, {
      fadeMs: 0,
      intensity: 0.75,
      settings: {
        random: () => 0.5,
        spawnRate: 12,
      },
    });
    manager.update(0.1, viewport);

    const context = createContext();
    manager.render(context, viewport);

    expect(context.ellipse).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalled();
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
    expect(context.ellipse).toHaveBeenCalled();
    expect(context.lineTo).toHaveBeenCalled();

    effect.update({
      deltaTime: 10,
      intensity: 1,
      viewport,
    });
    effect.render(context, viewport, { intensity: 1 });

    expect(defaultScreenDropletsConfig.fadeSpeed).toBe(0.95);
  });
});
