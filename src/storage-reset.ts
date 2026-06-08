export interface WebStorageLike {
  key: (index: number) => string | null;
  length: number;
  removeItem: (key: string) => void;
}

export interface StorageResetOptions {
  onError?: (error: unknown) => void;
  storage?: WebStorageLike | null;
}

export const getAvailableLocalStorage = (): Storage | null => {
  try {
    if (
      typeof localStorage === "undefined" ||
      typeof localStorage.length !== "number" ||
      typeof localStorage.key !== "function" ||
      typeof localStorage.removeItem !== "function"
    ) {
      return null;
    }

    return localStorage;
  } catch {
    return null;
  }
};

export const removeStorageKeysMatching = (
  matches: (key: string) => boolean,
  options: StorageResetOptions = {}
): string[] => {
  const storage =
    options.storage === undefined ? getAvailableLocalStorage() : options.storage;

  if (!storage) {
    return [];
  }

  try {
    const keys = Array.from({ length: storage.length }, (_, index) =>
      storage.key(index)
    ).filter((key): key is string => !!key && matches(key));

    keys.forEach((key) => storage.removeItem(key));
    return keys;
  } catch (error) {
    options.onError?.(error);
    return [];
  }
};

export const removeStorageNamespace = (
  prefix: string,
  options: StorageResetOptions = {}
): string[] =>
  removeStorageKeysMatching((key) => key.startsWith(prefix), options);

export const removeScoreStorageKeys = (
  prefix: string,
  options: StorageResetOptions = {}
): string[] => {
  const escapedPrefix = escapeRegExp(prefix);
  const scorePattern = new RegExp(
    `^${escapedPrefix}(?:bestScore|highScore|highScores|leaderboard|score|scores)`,
    "i"
  );

  return removeStorageKeysMatching((key) => scorePattern.test(key), options);
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
