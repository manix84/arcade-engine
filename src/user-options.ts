export interface UserOptionsStorage {
  getItem: (key: string) => string | null;
  removeItem?: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

export interface UserOptionsChange<T extends Record<string, unknown>> {
  changedKeys: Array<keyof T>;
  options: T;
  previousOptions: T;
  source: "load" | "reset" | "set";
}

export type UserOptionsChangeListener<T extends Record<string, unknown>> = (
  change: UserOptionsChange<T>
) => void;

export interface UserOptionsStoreOptions<T extends Record<string, unknown>> {
  defaults: T;
  eventName?: string;
  eventTarget?: EventTarget | null;
  normalize?: (stored: unknown, defaults: T) => T;
  storage?: UserOptionsStorage | null;
  storageKey: string;
  version?: number;
  versionKey?: string;
}

export interface UserOptionsStore<T extends Record<string, unknown>> {
  getOptions: () => T;
  load: () => T;
  reset: () => T;
  setOption: <Key extends keyof T>(key: Key, value: T[Key]) => T;
  setOptions: (options: Partial<T> | ((current: T) => Partial<T>)) => T;
  subscribe: (listener: UserOptionsChangeListener<T>) => () => void;
}

export const userOptionsChangedEventName = "arcade-engine:userOptionsChanged";

export const createUserOptionsStore = <T extends Record<string, unknown>>(
  options: UserOptionsStoreOptions<T>
): UserOptionsStore<T> => {
  const storage = options.storage ?? getBrowserStorage();
  const eventName = options.eventName ?? userOptionsChangedEventName;
  const eventTarget = options.eventTarget ?? getBrowserEventTarget();
  const listeners = new Set<UserOptionsChangeListener<T>>();
  let currentOptions = readOptions(options, storage);

  const notify = (change: UserOptionsChange<T>): void => {
    listeners.forEach((listener) => listener(change));

    if (!eventTarget) {
      return;
    }

    try {
      eventTarget.dispatchEvent(
        new CustomEvent(eventName, {
          detail: change,
        })
      );
    } catch {
      // Event dispatch is observational; option updates should still complete.
    }
  };

  const write = (
    nextOptions: T,
    changedKeys: Array<keyof T>,
    source: UserOptionsChange<T>["source"],
    persist = true
  ): T => {
    const previousOptions = currentOptions;

    currentOptions = cloneUserOptions(nextOptions);
    if (persist) {
      persistOptions(options, storage, currentOptions);
    }
    notify({
      changedKeys,
      options: cloneUserOptions(currentOptions),
      previousOptions,
      source,
    });

    return cloneUserOptions(currentOptions);
  };

  return {
    getOptions: () => cloneUserOptions(currentOptions),
    load: () => {
      const loadedOptions = readOptions(options, storage);
      const changedKeys = getChangedOptionKeys(currentOptions, loadedOptions);

      if (changedKeys.length === 0) {
        currentOptions = loadedOptions;
        return cloneUserOptions(currentOptions);
      }

      return write(loadedOptions, changedKeys, "load");
    },
    reset: () => {
      const defaults = cloneUserOptions(options.defaults);
      const changedKeys = getChangedOptionKeys(currentOptions, defaults);

      try {
        storage?.removeItem?.(options.storageKey);
      } catch {
        // Reset mirrors persistence: best effort only.
      }

      return write(defaults, changedKeys, "reset", false);
    },
    setOption: (key, value) =>
      write(
        {
          ...currentOptions,
          [key]: value,
        },
        [key],
        "set"
      ),
    setOptions: (update) => {
      const patch =
        typeof update === "function"
          ? update(cloneUserOptions(currentOptions))
          : update;
      const nextOptions = {
        ...currentOptions,
        ...patch,
      };

      return write(nextOptions, Object.keys(patch) as Array<keyof T>, "set");
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

const readOptions = <T extends Record<string, unknown>>(
  options: UserOptionsStoreOptions<T>,
  storage: UserOptionsStorage | null
): T => {
  const defaults = cloneUserOptions(options.defaults);

  try {
    const storedText = storage?.getItem(options.storageKey);
    const stored = storedText ? (JSON.parse(storedText) as unknown) : {};
    const normalized = options.normalize
      ? options.normalize(stored, defaults)
      : normalizeUserOptions(stored, defaults);

    return cloneUserOptions(normalized);
  } catch {
    return defaults;
  }
};

export const normalizeUserOptions = <T extends Record<string, unknown>>(
  stored: unknown,
  defaults: T
): T => {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return cloneUserOptions(defaults);
  }

  const storedOptions = stored as Record<string, unknown>;
  const normalized = cloneUserOptions(defaults);

  (Object.keys(defaults) as Array<keyof T>).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(storedOptions, key)) {
      normalized[key] = storedOptions[String(key)] as T[typeof key];
    }
  });

  return normalized;
};

const persistOptions = <T extends Record<string, unknown>>(
  options: UserOptionsStoreOptions<T>,
  storage: UserOptionsStorage | null,
  value: T
): void => {
  try {
    storage?.setItem(
      options.storageKey,
      JSON.stringify(getPersistedOptions(options, value))
    );
  } catch {
    // Persistence is best effort; gameplay should keep running.
  }
};

const getPersistedOptions = <T extends Record<string, unknown>>(
  options: UserOptionsStoreOptions<T>,
  value: T
): Record<string, unknown> => {
  if (options.version === undefined) {
    return value;
  }

  return {
    ...value,
    [options.versionKey ?? "optionsVersion"]: options.version,
  };
};

const getChangedOptionKeys = <T extends Record<string, unknown>>(
  previousOptions: T,
  nextOptions: T
): Array<keyof T> =>
  (Object.keys(nextOptions) as Array<keyof T>).filter(
    (key) =>
      JSON.stringify(previousOptions[key]) !== JSON.stringify(nextOptions[key])
  );

const cloneUserOptions = <T extends Record<string, unknown>>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value) as T;
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const getBrowserStorage = (): UserOptionsStorage | null => {
  try {
    if (
      typeof localStorage === "undefined" ||
      typeof localStorage.getItem !== "function" ||
      typeof localStorage.setItem !== "function"
    ) {
      return null;
    }

    return localStorage;
  } catch {
    return null;
  }
};

const getBrowserEventTarget = (): EventTarget | null => {
  try {
    return typeof window === "undefined" ? null : window;
  } catch {
    return null;
  }
};
