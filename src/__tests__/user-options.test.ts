import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createUserOptionsStore,
  normalizeUserOptions,
  userOptionsChangedEventName,
  type UserOptionsStorage,
} from "../index.js";

interface TestOptions extends Record<string, unknown> {
  fullscreen: boolean;
  inputMode: "keyboard" | "touch";
  volume: number;
}

const defaults: TestOptions = {
  fullscreen: false,
  inputMode: "keyboard",
  volume: 6,
};

const storageKey = "arcadeEngine.testUserOptions";

describe("user option store", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads defaults and merges plain stored values", () => {
    localStorage.setItem(storageKey, JSON.stringify({ volume: 9 }));

    const store = createUserOptionsStore<TestOptions>({
      defaults,
      storageKey,
    });

    expect(store.getOptions()).toEqual({
      fullscreen: false,
      inputMode: "keyboard",
      volume: 9,
    });
    expect(normalizeUserOptions({ fullscreen: true }, defaults)).toEqual({
      fullscreen: true,
      inputMode: "keyboard",
      volume: 6,
    });
  });

  it("uses caller normalization for schema-specific validation", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        fullscreen: true,
        inputMode: "gamepad",
        volume: 99,
      })
    );

    const store = createUserOptionsStore<TestOptions>({
      defaults,
      normalize: (stored, fallback) => {
        const value = normalizeUserOptions(stored, fallback);

        return {
          ...value,
          inputMode: value.inputMode === "touch" ? "touch" : "keyboard",
          volume: Math.max(0, Math.min(10, Math.round(value.volume))),
        };
      },
      storageKey,
    });

    expect(store.getOptions()).toEqual({
      fullscreen: true,
      inputMode: "keyboard",
      volume: 10,
    });
  });

  it("persists setOption and setOptions changes with version metadata", () => {
    const store = createUserOptionsStore<TestOptions>({
      defaults,
      storageKey,
      version: 2,
    });

    expect(store.setOption("volume", 3)).toEqual({
      fullscreen: false,
      inputMode: "keyboard",
      volume: 3,
    });
    expect(
      store.setOptions((current) => ({
        fullscreen: !current.fullscreen,
        inputMode: "touch",
      }))
    ).toEqual({
      fullscreen: true,
      inputMode: "touch",
      volume: 3,
    });
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}")).toEqual({
      fullscreen: true,
      inputMode: "touch",
      optionsVersion: 2,
      volume: 3,
    });
  });

  it("notifies subscribers and DOM listeners with changed keys", () => {
    const eventTarget = new EventTarget();
    const eventListener = vi.fn();
    const listener = vi.fn();
    const store = createUserOptionsStore<TestOptions>({
      defaults,
      eventTarget,
      storageKey,
    });

    eventTarget.addEventListener(userOptionsChangedEventName, eventListener);
    const unsubscribe = store.subscribe(listener);

    store.setOption("volume", 8);
    unsubscribe();
    store.setOption("volume", 9);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      changedKeys: ["volume"],
      options: {
        fullscreen: false,
        inputMode: "keyboard",
        volume: 8,
      },
      previousOptions: defaults,
      source: "set",
    });
    expect(eventListener).toHaveBeenCalledTimes(2);
    expect((eventListener.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
      changedKeys: ["volume"],
      source: "set",
    });
  });

  it("reloads from storage and reports loaded changes", () => {
    const listener = vi.fn();
    const store = createUserOptionsStore<TestOptions>({
      defaults,
      storageKey,
    });

    store.subscribe(listener);
    localStorage.setItem(storageKey, JSON.stringify({ inputMode: "touch" }));

    expect(store.load()).toEqual({
      fullscreen: false,
      inputMode: "touch",
      volume: 6,
    });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        changedKeys: ["inputMode"],
        source: "load",
      })
    );
  });

  it("resets to defaults and removes stored options", () => {
    const store = createUserOptionsStore<TestOptions>({
      defaults,
      storageKey,
    });

    store.setOption("volume", 1);

    expect(store.reset()).toEqual(defaults);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it("keeps running when storage is unavailable or malformed", () => {
    const brokenStorage: UserOptionsStorage = {
      getItem: () => "{not json",
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const store = createUserOptionsStore<TestOptions>({
      defaults,
      storage: brokenStorage,
      storageKey,
    });

    expect(store.getOptions()).toEqual(defaults);
    expect(store.setOption("volume", 2)).toEqual({
      fullscreen: false,
      inputMode: "keyboard",
      volume: 2,
    });
  });
});
