import { describe, expect, it, vi } from "vitest";
import {
  getAvailableLocalStorage,
  removeScoreStorageKeys,
  removeStorageKeysMatching,
  removeStorageNamespace,
  type WebStorageLike,
} from "../index.js";

const createMemoryStorage = (keys: string[]): WebStorageLike & {
  removed: string[];
} => {
  const storageKeys = [...keys];
  const removed: string[] = [];

  return {
    get length() {
      return storageKeys.length;
    },
    key: (index) => storageKeys[index] ?? null,
    removeItem: (key) => {
      removed.push(key);
      const index = storageKeys.indexOf(key);

      if (index >= 0) {
        storageKeys.splice(index, 1);
      }
    },
    removed,
  };
};

describe("storage reset helpers", () => {
  it("returns localStorage when browser storage is available", () => {
    expect(getAvailableLocalStorage()).toBe(localStorage);
  });

  it("removes keys matching a custom predicate", () => {
    const storage = createMemoryStorage(["game.a", "game.b", "other.a"]);
    const removed = removeStorageKeysMatching(
      (key) => key.startsWith("game."),
      { storage }
    );

    expect(removed).toEqual(["game.a", "game.b"]);
    expect(storage.removed).toEqual(["game.a", "game.b"]);
  });

  it("removes namespaced and score-like storage keys", () => {
    const namespaced = createMemoryStorage([
      "arcade.userOptions",
      "arcade.achievements",
      "other.highScore",
    ]);
    const scores = createMemoryStorage([
      "arcade.highScore",
      "arcade.scores",
      "arcade.userOptions",
      "other.highScore",
    ]);

    expect(removeStorageNamespace("arcade.", { storage: namespaced })).toEqual([
      "arcade.userOptions",
      "arcade.achievements",
    ]);
    expect(removeScoreStorageKeys("arcade.", { storage: scores })).toEqual([
      "arcade.highScore",
      "arcade.scores",
    ]);
  });

  it("keeps reset calls best effort when storage access fails", () => {
    const onError = vi.fn();
    const storage: WebStorageLike = {
      get length(): number {
        throw new Error("blocked");
      },
      key: () => null,
      removeItem: vi.fn(),
    };

    expect(removeStorageKeysMatching(() => true, { onError, storage })).toEqual(
      []
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
