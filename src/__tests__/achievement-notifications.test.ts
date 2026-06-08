import { describe, expect, it, vi } from "vitest";
import {
  achievementNotificationEventName,
  AchievementNotificationRenderer,
} from "../index.js";
import { createCanvasContextMock } from "../test/setup.js";

const createContext = (): CanvasRenderingContext2D =>
  createCanvasContextMock() as unknown as CanvasRenderingContext2D;

describe("achievement notification renderer", () => {
  it("renders queued achievement notifications", () => {
    let now = 1000;
    const context = createContext();
    const renderer = new AchievementNotificationRenderer({
      context,
      getViewport: () => ({ height: 380, width: 720 }),
      now: () => now,
    });

    renderer.enqueue({
      description: "Clear the first wave with a steady hand.",
      name: "Wave Breaker",
    });

    expect(renderer.getQueueLength()).toBe(1);
    expect(renderer.render()).toBe(true);

    const calls = (context as unknown as { calls: Array<{ method: string }> }).calls;

    expect(calls.some((call) => call.method === "fillRect")).toBe(true);
    expect(calls.some((call) => call.method === "strokeRect")).toBe(true);
    expect(calls.some((call) => call.method === "fillText")).toBe(true);

    now = 5000;
    expect(renderer.render()).toBe(false);
    expect(renderer.getQueueLength()).toBe(0);
  });

  it("listens for custom achievement notification events", () => {
    const context = createContext();
    const eventTarget = new EventTarget();
    const renderer = new AchievementNotificationRenderer({
      context,
      eventTarget,
      getViewport: () => ({ height: 380, width: 720 }),
      now: () => 1000,
    });

    eventTarget.dispatchEvent(
      new CustomEvent(achievementNotificationEventName, {
        detail: {
          description: "Unlock from an event.",
          name: "Event Unlock",
        },
      })
    );

    expect(renderer.getQueueLength()).toBe(1);

    renderer.destroy();
    eventTarget.dispatchEvent(
      new CustomEvent(achievementNotificationEventName, {
        detail: {
          description: "Ignored after destroy.",
          name: "Ignored",
        },
      })
    );

    expect(renderer.getQueueLength()).toBe(0);
  });

  it("draws icon sprites when provided and falls back when drawing fails", () => {
    const context = createContext();
    const renderer = new AchievementNotificationRenderer({
      context,
      getViewport: () => ({ height: 380, width: 720 }),
      now: () => 1000,
    });
    const image = document.createElement("canvas");

    renderer.enqueue({
      description: "Uses a provided sprite frame.",
      icon: {
        frameHeight: 8,
        frameWidth: 8,
        frameX: 8,
        frameY: 0,
        image,
      },
      name: "Icon",
    });
    renderer.render();

    expect(context.drawImage).toHaveBeenCalledWith(
      image,
      8,
      0,
      8,
      8,
      expect.any(Number),
      expect.any(Number),
      40,
      40
    );

    const fallbackContext = createContext();
    const fallbackRenderer = new AchievementNotificationRenderer({
      context: fallbackContext,
      getViewport: () => ({ height: 380, width: 720 }),
      now: () => 1000,
    });

    vi.mocked(fallbackContext.drawImage).mockImplementationOnce(() => {
      throw new Error("draw failed");
    });
    fallbackRenderer.enqueue({
      description: "Falls back to placeholder.",
      icon: { image },
      name: "Fallback",
    });
    fallbackRenderer.render();

    expect(fallbackContext.strokeRect).toHaveBeenCalled();
  });

  it("uses scale and custom timing options", () => {
    let now = 1000;
    const context = createContext();
    const renderer = new AchievementNotificationRenderer({
      context,
      getViewport: () => ({ height: 760, width: 1440 }),
      now: () => now,
      scale: () => 2,
      timing: {
        exitMs: 10,
        holdMs: 20,
        slideMs: 10,
      },
    });

    renderer.enqueue({
      description: "Short timing.",
      name: "Quick",
    });
    renderer.render();
    expect(context.scale).toHaveBeenCalledWith(2, 2);

    now = 1041;
    expect(renderer.render()).toBe(false);
  });
});
