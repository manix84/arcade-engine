export type HighScoreSyncState = "local" | "pending" | "synced";
export type HighScoreSyncStatus = "waiting" | "syncing" | "success" | "error";

export interface HighScoreEntry<Settings = unknown> {
  createdAt?: number;
  id: string;
  name: string;
  score: number;
  settings?: Settings;
  stats: string[];
}

export interface HighScoreRunReceipt {
  issuedAt: number;
  runId: string;
  token: string;
}

export interface HighScoreIntegrity {
  checksum: string;
  multiplier: number;
  scoreProduct: number;
  statsProduct: number;
  version: 1;
}

export interface StoredHighScoreEntry<Settings = unknown>
  extends HighScoreEntry<Settings> {
  integrity?: HighScoreIntegrity;
  receivedAt?: number;
  run?: HighScoreRunReceipt;
  submittedAt: number;
  syncState: HighScoreSyncState;
}

export interface HighScoreStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface HighScoreIntegrityOptions<Settings = unknown> {
  formatSettings?: (settings: Settings | undefined) => string;
  multiplier?: number;
  random?: () => number;
}

export interface HighScorePlausibilityRules {
  baseScoreBudget?: number;
  maxScore?: number;
  minScore?: number;
  minimumScoreBudget?: number;
  scoreBudget?: Array<{ points: number; stat: string }>;
  statMaximums?: Record<string, number>;
  statMinimums?: Record<string, number>;
}

export interface HighScoreSubmissionPayload<Settings = unknown> {
  entry?: unknown;
  gameVersion?: unknown;
  integrity?: unknown;
  run?: unknown;
  submittedAt?: unknown;
}

export interface HighScoreSubmissionValidationOptions<Settings = unknown> {
  allowLegacyMissingSettingsChecksum?: boolean;
  formatSettings?: (settings: Settings | undefined) => string;
  isRunReceiptTrusted?: (run: HighScoreRunReceipt) => boolean;
  maxGameVersionLength?: number;
  maxNameLength?: number;
  maxStatLength?: number;
  maxStats?: number;
  normalizeName?: (name: string) => string;
  normalizeSettings?: (settings: unknown) => Settings | undefined;
  rules?: HighScorePlausibilityRules;
}

export interface AcceptedHighScoreSubmission<Settings = unknown> {
  accepted: true;
  gameVersion: string;
  run: HighScoreRunReceipt;
  score: HighScoreEntry<Settings>;
  submittedAt: number;
}

export interface RejectedHighScoreSubmission {
  accepted: false;
  error: string;
  status: number;
}

export type HighScoreSubmissionValidationResult<Settings = unknown> =
  | AcceptedHighScoreSubmission<Settings>
  | RejectedHighScoreSubmission;

export interface HighScoreManagerOptions<Settings = unknown> {
  apiBasePath?: string;
  apiEnabled?: boolean;
  apiTimeoutMs?: number;
  defaultScores?: HighScoreEntry<Settings>[];
  fetch?: typeof fetch;
  formatSettings?: (settings: Settings | undefined) => string;
  gameVersion?: string;
  maxCachedScores?: number;
  maxScores?: number;
  maxStats?: number;
  normalizeName?: (name: string) => string;
  normalizeSettings?: (settings: unknown) => Settings | undefined;
  now?: () => number;
  random?: () => number;
  storage?: HighScoreStorage | null;
  storageKey: string;
  syncSuccessDisplayMs?: number;
}

export interface HighScoreManager<Settings = unknown> {
  getHighScores: () => HighScoreEntry<Settings>[];
  getHighScoreSyncStatus: () => HighScoreSyncStatus | null;
  getHighScoreThresholds: (limit: number) => HighScoreEntry<Settings>[];
  loadStoredHighScores: () => HighScoreEntry<Settings>[];
  loadStoredScoreRecords: () => StoredHighScoreEntry<Settings>[];
  saveHighScore: (
    name: string,
    score: number,
    stats: string[],
    run?: HighScoreRunReceipt | null,
    settings?: Settings
  ) => HighScoreEntry<Settings>;
  startHighScoreRun: (settings?: Settings) => Promise<HighScoreRunReceipt | null>;
  syncHighScores: () => Promise<void>;
}

const highScoreIntegrityVersion = 1;
const highScoreIntegrityHashModulo = 1000003;
const highScoreIntegrityMinMultiplier = 101;
const highScoreIntegrityMultiplierRange = 897;

export const normalizeHighScoreName = (name: string, fallback = "PLAYER"): string => {
  const normalized = name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 .'_-]/gi, "")
    .slice(0, 16);

  return normalized || fallback;
};

export const sortHighScores = <Settings = unknown>(
  left: HighScoreEntry<Settings>,
  right: HighScoreEntry<Settings>
): number =>
  normalizeScore(right.score) - normalizeScore(left.score) ||
  (left.createdAt ?? 0) - (right.createdAt ?? 0) ||
  left.name.localeCompare(right.name);

export const createHighScoreIntegrity = <Settings = unknown>(
  entry: HighScoreEntry<Settings> & { submittedAt?: number },
  run: HighScoreRunReceipt,
  options: HighScoreIntegrityOptions<Settings> = {}
): HighScoreIntegrity => {
  const multiplier = normalizeIntegrityMultiplier(
    options.multiplier ??
      highScoreIntegrityMinMultiplier +
        Math.floor(
          (options.random ?? Math.random)() * highScoreIntegrityMultiplierRange
        )
  );
  const scoreProduct = normalizeScore(entry.score) * multiplier;
  const statsProduct = getStatsProduct(entry.stats, multiplier);

  return {
    checksum: createHighScoreIntegrityChecksum(
      entry,
      run,
      entry.submittedAt ?? entry.createdAt ?? 0,
      multiplier,
      scoreProduct,
      statsProduct,
      options
    ),
    multiplier,
    scoreProduct,
    statsProduct,
    version: highScoreIntegrityVersion,
  };
};

export const validateHighScoreIntegrity = <Settings = unknown>(
  entry: HighScoreEntry<Settings> & { submittedAt?: number },
  integrity: unknown,
  run: HighScoreRunReceipt,
  options: HighScoreIntegrityOptions<Settings> & {
    allowLegacyMissingSettingsChecksum?: boolean;
  } = {}
): boolean => {
  if (!isHighScoreIntegrity(integrity)) {
    return false;
  }

  const scoreProduct = normalizeScore(entry.score) * integrity.multiplier;
  const statsProduct = getStatsProduct(entry.stats, integrity.multiplier);

  if (
    integrity.scoreProduct !== scoreProduct ||
    integrity.statsProduct !== statsProduct
  ) {
    return false;
  }

  const submittedAt = entry.submittedAt ?? entry.createdAt ?? 0;
  const checksums = [
    createHighScoreIntegrityChecksum(
      entry,
      run,
      submittedAt,
      integrity.multiplier,
      integrity.scoreProduct,
      integrity.statsProduct,
      options
    ),
  ];

  if (options.allowLegacyMissingSettingsChecksum && entry.settings === undefined) {
    checksums.push(
      createHighScoreIntegrityChecksum(
        entry,
        run,
        submittedAt,
        integrity.multiplier,
        integrity.scoreProduct,
        integrity.statsProduct,
        { ...options, includeSettings: false }
      )
    );
  }

  return checksums.includes(integrity.checksum);
};

export const validateHighScoreSubmission = <Settings = unknown>(
  payload: HighScoreSubmissionPayload<Settings>,
  options: HighScoreSubmissionValidationOptions<Settings> = {}
): HighScoreSubmissionValidationResult<Settings> => {
  if (!payload || typeof payload !== "object") {
    return rejectHighScoreSubmission("invalid_payload");
  }

  const entry = normalizeSubmittedScoreEntry(payload.entry, options);

  if (!entry || typeof payload.submittedAt !== "number") {
    return rejectHighScoreSubmission("invalid_score");
  }

  const run = normalizeHighScoreRunReceipt(payload.run);

  if (!run) {
    return rejectHighScoreSubmission("missing_run_receipt", 401);
  }

  if (options.isRunReceiptTrusted?.(run) === false) {
    return rejectHighScoreSubmission("invalid_run_receipt", 401);
  }

  const submittedAt = Math.max(0, Math.floor(payload.submittedAt));

  if (
    !validateHighScoreIntegrity(
      { ...entry, submittedAt },
      payload.integrity,
      run,
      {
        allowLegacyMissingSettingsChecksum:
          options.allowLegacyMissingSettingsChecksum,
        formatSettings: options.formatSettings,
      }
    )
  ) {
    return rejectHighScoreSubmission("invalid_score_integrity", 422);
  }

  if (!isHighScorePlausible(entry, options.rules)) {
    return rejectHighScoreSubmission("implausible_score", 422);
  }

  return {
    accepted: true,
    gameVersion: normalizeGameVersion(
      payload.gameVersion,
      options.maxGameVersionLength
    ),
    run,
    score: entry,
    submittedAt,
  };
};

export const isHighScorePlausible = <Settings = unknown>(
  entry: HighScoreEntry<Settings>,
  rules: HighScorePlausibilityRules = {}
): boolean => getHighScorePlausibilityReasons(entry, rules).length === 0;

export const getHighScorePlausibilityReasons = <Settings = unknown>(
  entry: HighScoreEntry<Settings>,
  rules: HighScorePlausibilityRules = {}
): string[] => {
  const score = normalizeScore(entry.score);
  const reasons: string[] = [];
  const minScore = rules.minScore ?? 1;
  const maxScore = rules.maxScore ?? Number.MAX_SAFE_INTEGER;
  const labels = [
    ...Object.keys(rules.statMinimums ?? {}),
    ...Object.keys(rules.statMaximums ?? {}),
    ...(rules.scoreBudget ?? []).map((rule) => rule.stat),
  ];
  const stats = getHighScoreStatValues(entry.stats, [...new Set(labels)]);

  if (score < minScore) {
    reasons.push("score_too_low");
  }

  if (score > maxScore) {
    reasons.push("score_too_high");
  }

  Object.entries(rules.statMinimums ?? {}).forEach(([stat, minimum]) => {
    if ((stats[stat] ?? 0) < minimum) {
      reasons.push(`stat_too_low:${stat}`);
    }
  });

  Object.entries(rules.statMaximums ?? {}).forEach(([stat, maximum]) => {
    if ((stats[stat] ?? 0) > maximum) {
      reasons.push(`stat_too_high:${stat}`);
    }
  });

  if (rules.scoreBudget) {
    const budget =
      (rules.baseScoreBudget ?? 0) +
      rules.scoreBudget.reduce(
        (total, rule) => total + (stats[rule.stat] ?? 0) * rule.points,
        0
      );
    const allowed = Math.max(budget, rules.minimumScoreBudget ?? 0);

    if (score > allowed) {
      reasons.push("score_exceeds_budget");
    }
  }

  return reasons;
};

export const getHighScoreStatValues = (
  stats: string[],
  labels: string[]
): Record<string, number> => {
  const text = stats.join("\n");

  return Object.fromEntries(labels.map((label) => [label, readNumberStat(text, label)]));
};

export const hashHighScoreText = (text: string): number => {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const isHighScoreIntegrity = (
  value: unknown
): value is HighScoreIntegrity => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const integrity = value as Partial<HighScoreIntegrity>;

  return (
    integrity.version === highScoreIntegrityVersion &&
    typeof integrity.multiplier === "number" &&
    Number.isInteger(integrity.multiplier) &&
    integrity.multiplier >= highScoreIntegrityMinMultiplier &&
    integrity.multiplier <
      highScoreIntegrityMinMultiplier + highScoreIntegrityMultiplierRange &&
    typeof integrity.scoreProduct === "number" &&
    Number.isInteger(integrity.scoreProduct) &&
    typeof integrity.statsProduct === "number" &&
    Number.isInteger(integrity.statsProduct) &&
    typeof integrity.checksum === "string"
  );
};

export const isHighScoreRunReceipt = (
  value: unknown
): value is HighScoreRunReceipt => normalizeHighScoreRunReceipt(value) !== undefined;

export const isHighScoreEntry = <Settings = unknown>(
  value: unknown
): value is HighScoreEntry<Settings> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<HighScoreEntry<Settings>>;

  return (
    (candidate.createdAt === undefined ||
      typeof candidate.createdAt === "number") &&
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.score === "number" &&
    Array.isArray(candidate.stats) &&
    candidate.stats.every((stat) => typeof stat === "string")
  );
};

export const createHighScoreManager = <Settings = unknown>(
  options: HighScoreManagerOptions<Settings>
): HighScoreManager<Settings> => {
  const apiBasePath = options.apiBasePath ?? "/api/high-scores";
  const apiTimeoutMs = options.apiTimeoutMs ?? 2500;
  const defaultScores = options.defaultScores ?? [];
  const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);
  const maxCachedScores = options.maxCachedScores ?? 50;
  const maxScores = options.maxScores ?? 10;
  const maxStats = options.maxStats ?? 16;
  const normalizeName = options.normalizeName ?? normalizeHighScoreName;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const storage = options.storage ?? getBrowserStorage();
  const syncSuccessDisplayMs = options.syncSuccessDisplayMs ?? 2500;
  let apiOffline = false;
  let syncStatus: HighScoreSyncStatus | null = "waiting";
  let syncStatusChangedAt = now();

  const setSyncStatus = (status: HighScoreSyncStatus | null): void => {
    if (syncStatus === status) {
      return;
    }

    syncStatus = status;
    syncStatusChangedAt = now();
  };

  const loadStoredScoreRecords = (): StoredHighScoreEntry<Settings>[] => {
    try {
      const storedScores = storage?.getItem(options.storageKey);

      if (!storedScores) {
        return [];
      }

      const parsed = JSON.parse(storedScores);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter(isHighScoreEntry)
        .map(normalizeStoredEntry)
        .sort(sortStoredHighScores)
        .slice(0, maxCachedScores);
    } catch {
      return [];
    }
  };

  const saveStoredScoreRecords = (
    entries: StoredHighScoreEntry<Settings>[]
  ): void => {
    try {
      storage?.setItem(
        options.storageKey,
        JSON.stringify(trimStoredScoreRecords(entries))
      );
    } catch {
      // Persistence is best effort; gameplay should keep running.
    }
  };

  const normalizeStoredEntry = (
    entry: HighScoreEntry<Settings> | StoredHighScoreEntry<Settings>
  ): StoredHighScoreEntry<Settings> => {
    const stored = entry as Partial<StoredHighScoreEntry<Settings>>;

    return {
      id: entry.id,
      createdAt:
        typeof stored.createdAt === "number"
          ? stored.createdAt
          : typeof stored.submittedAt === "number"
            ? stored.submittedAt
            : now(),
      name: normalizeName(entry.name),
      receivedAt:
        typeof stored.receivedAt === "number" ? stored.receivedAt : undefined,
      run: isHighScoreRunReceipt(stored.run) ? stored.run : undefined,
      score: normalizeScore(entry.score),
      settings: options.normalizeSettings
        ? options.normalizeSettings(stored.settings)
        : stored.settings,
      stats: entry.stats.slice(0, maxStats),
      integrity: isHighScoreIntegrity(stored.integrity)
        ? stored.integrity
        : undefined,
      submittedAt:
        typeof stored.submittedAt === "number" ? stored.submittedAt : now(),
      syncState: normalizeSyncState(stored.syncState, stored.run),
    };
  };

  const trimStoredScoreRecords = (
    entries: StoredHighScoreEntry<Settings>[]
  ): StoredHighScoreEntry<Settings>[] => {
    const pending = entries
      .filter((entry) => entry.syncState === "pending")
      .sort(sortStoredHighScores);
    const cached = entries
      .filter((entry) => entry.syncState !== "pending")
      .sort(sortStoredHighScores)
      .slice(0, Math.max(0, maxCachedScores - pending.length));

    return [...pending, ...cached].slice(0, maxCachedScores);
  };

  const fetchHighScoreApi = async (
    path = "",
    init?: RequestInit
  ): Promise<Response | null> => {
    if (options.apiEnabled === false || !fetchImpl) {
      return null;
    }

    const controller =
      typeof AbortController === "undefined" ? null : new AbortController();
    const timeout =
      controller === null
        ? undefined
        : setTimeout(() => controller.abort(), apiTimeoutMs);

    try {
      return await fetchImpl(`${apiBasePath}${path}`, {
        ...init,
        signal: controller?.signal ?? init?.signal,
      });
    } catch {
      return null;
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
  };

  const submitPendingScores = async (): Promise<boolean> => {
    if (options.apiEnabled === false || !fetchImpl) {
      return !hasPendingScores();
    }

    const records = loadStoredScoreRecords();
    let changed = false;
    let completed = true;

    for (const record of records) {
      if (record.syncState !== "pending") {
        continue;
      }

      if (!record.run) {
        record.syncState = "local";
        changed = true;
        continue;
      }

      if (!record.integrity) {
        record.integrity = createHighScoreIntegrity(record, record.run, {
          formatSettings: options.formatSettings,
          random,
        });
        changed = true;
      } else if (
        !validateHighScoreIntegrity(record, record.integrity, record.run, {
          allowLegacyMissingSettingsChecksum: true,
          formatSettings: options.formatSettings,
        })
      ) {
        record.integrity = undefined;
        record.run = undefined;
        record.syncState = "local";
        changed = true;
        continue;
      }

      try {
        const response = await fetchHighScoreApi("", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entry: toHighScoreEntry(record),
            gameVersion: options.gameVersion ?? "unknown",
            integrity: record.integrity,
            run: record.run,
            submittedAt: record.submittedAt,
          }),
        });

        if (!response) {
          completed = false;
          break;
        }

        if (response.status === 401 || response.status === 422) {
          record.integrity = undefined;
          record.run = undefined;
          record.syncState = "local";
          changed = true;
          continue;
        }

        if (!response.ok) {
          completed = false;
          break;
        }

        const remoteEntry = (await response.json()) as unknown;

        if (!isHighScoreEntry<Settings>(remoteEntry)) {
          continue;
        }

        const storedRemoteEntry = remoteEntry as HighScoreEntry<Settings> &
          Partial<StoredHighScoreEntry<Settings>>;

        record.id = storedRemoteEntry.id;
        record.createdAt = storedRemoteEntry.createdAt ?? now();
        record.name = normalizeName(storedRemoteEntry.name);
        record.score = normalizeScore(storedRemoteEntry.score);
        record.settings = options.normalizeSettings
          ? options.normalizeSettings(storedRemoteEntry.settings)
          : storedRemoteEntry.settings;
        record.stats = storedRemoteEntry.stats.slice(0, maxStats);
        record.integrity = undefined;
        record.receivedAt = storedRemoteEntry.receivedAt ?? now();
        record.run = undefined;
        record.syncState = "synced";
        changed = true;
      } catch {
        completed = false;
        break;
      }
    }

    if (changed) {
      saveStoredScoreRecords(records);
    }

    return completed;
  };

  const pullRemoteScores = async (): Promise<boolean> => {
    if (options.apiEnabled === false || !fetchImpl) {
      return true;
    }

    try {
      const response = await fetchHighScoreApi();

      if (!response?.ok) {
        return false;
      }

      const remoteScores = (await response.json()) as unknown;

      if (!Array.isArray(remoteScores)) {
        return false;
      }

      const remoteRecords = remoteScores
        .filter(isHighScoreEntry)
        .map((entry) =>
          normalizeStoredEntry({
            ...entry,
            receivedAt:
              typeof (entry as StoredHighScoreEntry<Settings>).receivedAt ===
              "number"
                ? (entry as StoredHighScoreEntry<Settings>).receivedAt
                : now(),
            submittedAt:
              typeof (entry as StoredHighScoreEntry<Settings>).submittedAt ===
              "number"
                ? (entry as StoredHighScoreEntry<Settings>).submittedAt
                : now(),
            syncState: "synced",
          } as StoredHighScoreEntry<Settings>)
        );

      saveStoredScoreRecords(
        upsertScoreRecords(loadStoredScoreRecords(), remoteRecords)
      );

      return true;
    } catch {
      return false;
    }
  };

  const hasPendingScores = (): boolean =>
    loadStoredScoreRecords().some((record) => record.syncState === "pending");

  const syncHighScores = async (): Promise<void> => {
    if (options.apiEnabled === false || !fetchImpl) {
      apiOffline = true;
      setSyncStatus("error");
      return;
    }

    setSyncStatus("syncing");
    const submitted = await submitPendingScores();
    const pulled = await pullRemoteScores();
    const synced = submitted && pulled && !hasPendingScores();

    apiOffline = !synced;
    setSyncStatus(synced ? "success" : "error");
  };

  return {
    getHighScores: () =>
      [
        ...loadStoredScoreRecords().sort(sortStoredHighScores).map(toHighScoreEntry),
        ...defaultScores.slice(0, maxScores),
      ].slice(0, maxScores),
    getHighScoreSyncStatus: () => {
      if (
        syncStatus === "success" &&
        now() - syncStatusChangedAt >= syncSuccessDisplayMs
      ) {
        return "waiting";
      }

      return apiOffline && syncStatus === "error" ? "error" : syncStatus;
    },
    getHighScoreThresholds: (limit: number) =>
      [
        ...loadStoredScoreRecords().map(toHighScoreEntry),
        ...defaultScores,
      ]
        .sort(sortHighScores)
        .slice(0, Math.max(0, Math.floor(limit))),
    loadStoredHighScores: () =>
      loadStoredScoreRecords()
        .sort(sortStoredHighScores)
        .slice(0, maxScores)
        .map(toHighScoreEntry),
    loadStoredScoreRecords,
    saveHighScore: (
      name,
      score,
      stats,
      run = null,
      settings
    ): HighScoreEntry<Settings> => {
      const shouldSync = Boolean(run && options.apiEnabled !== false && fetchImpl);
      const createdAt = now();
      const entry: StoredHighScoreEntry<Settings> = {
        createdAt,
        id: `local-${createdAt}-${random().toString(36).slice(2, 8)}`,
        name: normalizeName(name),
        run: shouldSync ? run ?? undefined : undefined,
        score: normalizeScore(score),
        settings,
        stats: stats.slice(0, maxStats),
        submittedAt: createdAt,
        syncState: shouldSync ? "pending" : "local",
      };

      if (shouldSync && entry.run) {
        entry.integrity = createHighScoreIntegrity(entry, entry.run, {
          formatSettings: options.formatSettings,
          random,
        });
      }

      saveStoredScoreRecords(
        trimStoredScoreRecords(upsertScoreRecords(loadStoredScoreRecords(), [entry]))
      );
      void syncHighScores();

      return toHighScoreEntry(entry);
    },
    startHighScoreRun: async (settings?: Settings) => {
      if (options.apiEnabled === false || !fetchImpl) {
        setSyncStatus("error");
        return null;
      }

      setSyncStatus("syncing");

      const response = await fetchHighScoreApi("/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameVersion: options.gameVersion ?? "unknown",
          settings,
          startedAt: now(),
        }),
      });

      if (!response?.ok) {
        apiOffline = true;
        setSyncStatus("error");
        return null;
      }

      const receipt = (await response.json()) as unknown;

      if (!isHighScoreRunReceipt(receipt)) {
        apiOffline = true;
        setSyncStatus("error");
        return null;
      }

      apiOffline = false;
      setSyncStatus("success");
      return receipt;
    },
    syncHighScores,
  };
};

const rejectHighScoreSubmission = (
  error: string,
  status = 400
): RejectedHighScoreSubmission => ({
  accepted: false,
  error,
  status,
});

const normalizeSubmittedScoreEntry = <Settings = unknown>(
  value: unknown,
  options: HighScoreSubmissionValidationOptions<Settings>
): HighScoreEntry<Settings> | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const entry = value as Partial<HighScoreEntry<Settings>>;
  const maxStats = options.maxStats ?? 16;
  const maxStatLength = options.maxStatLength ?? 80;
  const normalizeName = options.normalizeName ?? normalizeHighScoreName;

  if (
    typeof entry.id !== "string" ||
    typeof entry.name !== "string" ||
    typeof entry.score !== "number" ||
    !Number.isFinite(entry.score) ||
    !Array.isArray(entry.stats) ||
    entry.stats.length > maxStats ||
    !entry.stats.every(
      (stat) => typeof stat === "string" && stat.length <= maxStatLength
    )
  ) {
    return undefined;
  }

  const settings = options.normalizeSettings
    ? options.normalizeSettings(entry.settings)
    : entry.settings;

  return {
    ...(typeof entry.createdAt === "number" ? { createdAt: entry.createdAt } : {}),
    id: entry.id,
    name: normalizeName(entry.name).slice(0, options.maxNameLength ?? 16),
    score: normalizeScore(entry.score),
    ...(settings === undefined ? {} : { settings }),
    stats: entry.stats.slice(0, maxStats),
  };
};

const normalizeHighScoreRunReceipt = (
  value: unknown
): HighScoreRunReceipt | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const receipt = value as Partial<HighScoreRunReceipt>;

  if (
    typeof receipt.issuedAt !== "number" ||
    typeof receipt.runId !== "string" ||
    typeof receipt.token !== "string"
  ) {
    return undefined;
  }

  return {
    issuedAt: Math.max(0, Math.floor(receipt.issuedAt)),
    runId: receipt.runId,
    token: receipt.token,
  };
};

const normalizeGameVersion = (value: unknown, maxLength = 32): string =>
  typeof value === "string" && value.length <= maxLength ? value : "unknown";

const normalizeScore = (score: number): number =>
  Math.max(0, Math.floor(Number.isFinite(score) ? score : 0));

const normalizeIntegrityMultiplier = (multiplier: number): number => {
  const normalized = Math.floor(multiplier);

  if (
    normalized < highScoreIntegrityMinMultiplier ||
    normalized >= highScoreIntegrityMinMultiplier + highScoreIntegrityMultiplierRange
  ) {
    throw new Error(
      `High-score integrity multiplier must be between ${highScoreIntegrityMinMultiplier} and ${
        highScoreIntegrityMinMultiplier + highScoreIntegrityMultiplierRange - 1
      }.`
    );
  }

  return normalized;
};

const getStatsProduct = (stats: string[], multiplier: number): number =>
  (hashHighScoreText(stats.join("\n")) % highScoreIntegrityHashModulo) *
  multiplier;

const createHighScoreIntegrityChecksum = <Settings = unknown>(
  entry: HighScoreEntry<Settings>,
  run: HighScoreRunReceipt,
  submittedAt: number,
  multiplier: number,
  scoreProduct: number,
  statsProduct: number,
  options: HighScoreIntegrityOptions<Settings> & {
    includeSettings?: boolean;
  } = {}
): string =>
  hashHighScoreText(
    [
      highScoreIntegrityVersion,
      run.runId,
      run.token,
      run.issuedAt,
      entry.id,
      entry.name,
      normalizeScore(entry.score),
      ...(options.includeSettings === false
        ? []
        : [formatSettingsForIntegrity(entry.settings, options.formatSettings)]),
      entry.stats.join("\n"),
      Math.max(0, Math.floor(submittedAt)),
      multiplier,
      scoreProduct,
      statsProduct,
    ].join("|")
  ).toString(36);

const formatSettingsForIntegrity = <Settings = unknown>(
  settings: Settings | undefined,
  formatSettings?: (settings: Settings | undefined) => string
): string =>
  formatSettings
    ? formatSettings(settings)
    : settings === undefined
      ? ""
      : JSON.stringify(sortJsonValue(settings));

const sortJsonValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJsonValue(nested)])
    );
  }

  return value;
};

const readNumberStat = (text: string, label: string): number => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escapedLabel}:\\s*(\\d+)`, "i").exec(text);

  return match ? Number.parseInt(match[1], 10) : 0;
};

const normalizeSyncState = (syncState: unknown, run: unknown): HighScoreSyncState => {
  if (
    syncState === "local" ||
    syncState === "pending" ||
    syncState === "synced"
  ) {
    return syncState;
  }

  return isHighScoreRunReceipt(run) ? "pending" : "local";
};

const sortStoredHighScores = <Settings = unknown>(
  left: StoredHighScoreEntry<Settings>,
  right: StoredHighScoreEntry<Settings>
): number =>
  normalizeScore(right.score) - normalizeScore(left.score) ||
  left.createdAt - right.createdAt ||
  left.name.localeCompare(right.name);

const toHighScoreEntry = <Settings = unknown>(
  entry: HighScoreEntry<Settings>
): HighScoreEntry<Settings> => ({
  createdAt: entry.createdAt,
  id: entry.id,
  name: entry.name,
  score: normalizeScore(entry.score),
  ...(entry.settings === undefined ? {} : { settings: entry.settings }),
  stats: entry.stats,
});

const upsertScoreRecords = <Settings = unknown>(
  current: StoredHighScoreEntry<Settings>[],
  incoming: StoredHighScoreEntry<Settings>[]
): StoredHighScoreEntry<Settings>[] => {
  const byId = new Map(current.map((entry) => [entry.id, entry]));

  incoming.forEach((entry) => {
    byId.set(entry.id, entry);
  });

  return [...byId.values()];
};

const getBrowserStorage = (): HighScoreStorage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};
