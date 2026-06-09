import { describe, expect, it } from "vitest";
import {
  FpsOverlay,
  GameArena,
  PerformanceSampler,
} from "../index.js";
import { createCanvasContextMock } from "../test/setup.js";

const createContext = (): CanvasRenderingContext2D =>
  createCanvasContextMock() as unknown as CanvasRenderingContext2D;

const viewport = { height: 180, width: 320 };

const createHost = (width = 320, height = 180): HTMLElement => {
  const host = document.createElement("div");

  Object.defineProperty(host, "clientWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(host, "clientHeight", {
    configurable: true,
    value: height,
  });

  return host;
};

describe("performance sampler", () => {
  it("calculates current, rolling average, low, high, and frame time metrics", () => {
    let now = 0;
    const sampler = new PerformanceSampler({
      historyMs: 5000,
      now: () => now,
      rollingWindowMs: 1000,
    });

    now += 16.7;
    sampler.update(16.7, now);
    now += 25;
    sampler.update(25, now);
    now += 10;
    const metrics = sampler.update(10, now);

    expect(Math.round(metrics.currentFps)).toBe(100);
    expect(metrics.averageFps).toBeGreaterThan(55);
    expect(Math.round(metrics.lowFps)).toBe(40);
    expect(Math.round(metrics.highFps)).toBe(100);
    expect(metrics.frameTimeMs).toBe(10);
    expect(sampler.getHistory().length).toBeGreaterThan(0);
  });

  it("can clear sampled metrics", () => {
    const sampler = new PerformanceSampler();

    sampler.update(16.7, 16.7);
    sampler.clear();

    expect(sampler.getMetrics().sampleCount).toBe(0);
    expect(sampler.getHistory()).toHaveLength(0);
  });
});

describe("fps overlay", () => {
  it("does not sample or render while disabled", () => {
    const overlay = new FpsOverlay({ enabled: false });
    const context = createContext();

    overlay.update(16.7, 16.7);
    overlay.render(context, { viewport });

    expect(overlay.getMetrics().sampleCount).toBe(0);
    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it("renders minimal, basic, detailed, and graph levels with rectangles and text", () => {
    const overlay = new FpsOverlay({
      enabled: true,
      level: "minimal",
      position: "bottom-right",
      scale: 1.5,
    });
    const context = createContext();

    for (let frame = 0; frame < 20; frame += 1) {
      overlay.update(16 + (frame % 3) * 2, frame * 16);
    }

    overlay.render(context, { viewport });
    expect(context.fillText).toHaveBeenCalledWith(
      expect.stringContaining("FPS"),
      expect.any(Number),
      expect.any(Number)
    );

    overlay.setLevel("basic");
    overlay.render(context, { viewport });
    expect(context.fillText).toHaveBeenCalledWith(
      expect.stringContaining("AVG"),
      expect.any(Number),
      expect.any(Number)
    );

    overlay.setLevel("detailed");
    overlay.render(context, { viewport });
    expect(context.fillText).toHaveBeenCalledWith(
      expect.stringContaining("LOW 0.1%"),
      expect.any(Number),
      expect.any(Number)
    );

    overlay.setLevel("graph");
    overlay.render(context, { viewport });
    expect(context.fillRect).toHaveBeenCalled();
    expect(context.lineTo).not.toHaveBeenCalled();
    expect(context.arc).not.toHaveBeenCalled();
    expect(context.imageSmoothingEnabled).toBe(false);
  });

  it("supports runtime controls", () => {
    const overlay = new FpsOverlay({ enabled: true, level: "minimal" });

    expect(overlay.nextLevel()).toBe("basic");
    overlay.setLevel("graph");
    expect(overlay.getLevel()).toBe("graph");
    expect(overlay.toggle()).toBe(false);
    expect(overlay.isEnabled()).toBe(false);
    overlay.setOptions({ enabled: true, position: "top-right", scale: 2 });
    expect(overlay.isEnabled()).toBe(true);
  });
});

describe("game arena debug overlay", () => {
  it("renders the configured fps overlay through the arena convenience method", () => {
    const host = createHost();
    const arena = new GameArena(host, {
      debug: {
        enabled: true,
        fps: {
          enabled: true,
          level: "basic",
        },
      },
    });
    const context = arena.getContext() as CanvasRenderingContext2D;

    arena.renderDebugOverlay(16.7, 16.7);

    expect(context.fillText).toHaveBeenCalledWith(
      expect.stringContaining("FPS"),
      expect.any(Number),
      expect.any(Number)
    );

    arena.destroy();
  });
});
