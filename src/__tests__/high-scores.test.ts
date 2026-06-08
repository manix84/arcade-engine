import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHighScoreIntegrity,
  createHighScoreManager,
  getHighScorePlausibilityReasons,
  getHighScoreStatValues,
  isHighScoreRunReceipt,
  normalizeHighScoreName,
  validateHighScoreIntegrity,
  validateHighScoreSubmission,
} from "../index.js";

const storageKey = "arcadeEngine.testHighScores";

const createJsonResponse = (body: unknown, status = 200): Response =>
  ({
    json: vi.fn(() => Promise.resolve(body)),
    ok: status >= 200 && status < 300,
    status,
  }) as unknown as Response;

describe("high score helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("stores local high scores with configurable defaults and name normalization", () => {
    const manager = createHighScoreManager({
      apiEnabled: false,
      defaultScores: [
        {
          createdAt: 1,
          id: "default-score",
          name: "CPU",
          score: 1000,
          stats: ["Wave: 1"],
        },
      ],
      now: () => 2000,
      random: () => 0.25,
      storageKey,
    });

    const saved = manager.saveHighScore(" Ace Pilot! ", 1200, ["Wave: 2"]);

    expect(saved).toMatchObject({
      createdAt: 2000,
      id: "local-2000-9",
      name: "Ace Pilot",
      score: 1200,
      stats: ["Wave: 2"],
    });
    expect(manager.loadStoredScoreRecords()[0]).toMatchObject({
      syncState: "local",
    });
    expect(manager.getHighScores().map((score) => score.name)).toEqual([
      "Ace Pilot",
      "CPU",
    ]);
    expect(manager.getHighScoreThresholds(1)[0]?.name).toBe("Ace Pilot");
  });

  it("normalizes high-score names after filtering unsupported characters", () => {
    expect(normalizeHighScoreName(" Saved !!! ")).toBe("Saved");
    expect(normalizeHighScoreName(" Pilot    One ")).toBe("Pilot One");
    expect(normalizeHighScoreName(" !!! ", "ACE")).toBe("ACE");
  });

  it("sorts saved and default high scores together before slicing", () => {
    const manager = createHighScoreManager({
      apiEnabled: false,
      defaultScores: [
        {
          createdAt: 1,
          id: "default-score",
          name: "CPU",
          score: 1000,
          stats: [],
        },
      ],
      maxScores: 1,
      now: () => 2000,
      storageKey,
    });

    manager.saveHighScore("Low", 10, []);

    expect(manager.getHighScores()).toEqual([
      {
        createdAt: 1,
        id: "default-score",
        name: "CPU",
        score: 1000,
        stats: [],
      },
    ]);
    expect(manager.getHighScoreThresholds(1)).toEqual(manager.getHighScores());
  });

  it("loads stored score records defensively and normalizes cached entries", () => {
    const manager = createHighScoreManager({
      apiEnabled: false,
      maxStats: 2,
      now: () => 3000,
      storageKey,
    });

    localStorage.setItem(storageKey, "{not json");
    expect(manager.loadStoredScoreRecords()).toEqual([]);

    localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          createdAt: 2000.8,
          id: "saved-score",
          name: " Saved !!! ",
          run: { issuedAt: Number.NaN, runId: "bad", token: "bad" },
          score: 1200.9,
          stats: ["Wave: 2", "Shots: 30", "Ignored: 1"],
          submittedAt: 2100.4,
          syncState: "pending",
        },
        {
          id: "invalid-score",
          name: "Broken",
          score: "nope",
          stats: [],
          submittedAt: 1,
        },
      ])
    );

    expect(manager.loadStoredScoreRecords()).toEqual([
      {
        createdAt: 2000.8,
        id: "saved-score",
        integrity: undefined,
        name: "Saved",
        receivedAt: undefined,
        run: undefined,
        score: 1200,
        settings: undefined,
        stats: ["Wave: 2", "Shots: 30"],
        submittedAt: 2100.4,
        syncState: "pending",
      },
    ]);
  });

  it("creates and validates receipt-backed score integrity", () => {
    const entry = {
      id: "score-1",
      name: "ACE",
      score: 5000,
      settings: { difficulty: "normal", speed: 1 },
      stats: ["Enemies: 8", "Bosses: 1"],
      submittedAt: 2000,
    };
    const run = {
      issuedAt: 1000,
      runId: "run-1",
      token: "receipt-token",
    };
    const formatSettings = (settings: typeof entry.settings | undefined) =>
      settings
        ? JSON.stringify({
            difficulty: settings.difficulty,
            speed: settings.speed,
          })
        : "";
    const integrity = createHighScoreIntegrity(entry, run, {
      formatSettings,
      multiplier: 137,
    });

    expect(integrity).toEqual({
      checksum: expect.any(String),
      multiplier: 137,
      scoreProduct: 685000,
      statsProduct: expect.any(Number),
      version: 1,
    });
    expect(validateHighScoreIntegrity(entry, integrity, run, { formatSettings })).toBe(
      true
    );
    expect(
      validateHighScoreIntegrity({ ...entry, score: 999999 }, integrity, run, {
        formatSettings,
      })
    ).toBe(false);
    expect(
      validateHighScoreIntegrity(entry, integrity, { ...run, token: "tampered" }, {
        formatSettings,
      })
    ).toBe(false);
  });

  it("submits pending receipt-backed scores and stores remote results", async () => {
    const remoteEntry = {
      createdAt: 3000,
      id: "remote-score",
      name: "Remote Ace",
      receivedAt: 4000,
      score: 5000,
      stats: ["Wave: 3"],
    };
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (input === "/api/high-scores" && init?.method === "POST") {
        return Promise.resolve(createJsonResponse(remoteEntry));
      }

      return Promise.resolve(createJsonResponse([remoteEntry]));
    });
    const manager = createHighScoreManager({
      fetch: fetchMock,
      now: () => 5000,
      storageKey,
    });

    localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          createdAt: 2000,
          id: "local-score",
          name: "Local Ace",
          run: {
            issuedAt: 1000,
            runId: "run-1",
            token: "receipt-token",
          },
          score: 5000,
          stats: ["Wave: 3"],
          submittedAt: 2000,
          syncState: "pending",
        },
      ])
    );

    await manager.syncHighScores();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/high-scores",
      expect.objectContaining({ method: "POST" })
    );
    expect(manager.loadStoredScoreRecords()[0]).toMatchObject({
      id: "remote-score",
      receivedAt: 4000,
      syncState: "synced",
    });
    expect(manager.getHighScoreSyncStatus()).toBe("success");
  });

  it("starts remote high-score runs and expires transient sync success status", async () => {
    let now = 5000;
    const run = {
      issuedAt: 5000,
      runId: "run-started",
      token: "receipt-token",
    };
    const fetchMock = vi.fn(() => Promise.resolve(createJsonResponse(run)));
    const manager = createHighScoreManager({
      fetch: fetchMock,
      now: () => now,
      storageKey,
      syncSuccessDisplayMs: 1000,
    });

    await expect(manager.startHighScoreRun({ difficulty: "hard" })).resolves.toEqual(
      run
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/high-scores/runs",
      expect.objectContaining({
        body: JSON.stringify({
          gameVersion: "unknown",
          settings: { difficulty: "hard" },
          startedAt: 5000,
        }),
        method: "POST",
      })
    );
    expect(isHighScoreRunReceipt(run)).toBe(true);
    expect(manager.getHighScoreSyncStatus()).toBe("success");

    now = 6500;
    expect(manager.getHighScoreSyncStatus()).toBe("waiting");
  });

  it("reports sync errors when remote run creation fails or returns bad data", async () => {
    const failedFetch = vi.fn(() => Promise.resolve(createJsonResponse({}, 500)));
    const failedManager = createHighScoreManager({
      fetch: failedFetch,
      storageKey,
    });

    await expect(failedManager.startHighScoreRun()).resolves.toBeNull();
    expect(failedManager.getHighScoreSyncStatus()).toBe("error");

    const invalidFetch = vi.fn(() =>
      Promise.resolve(createJsonResponse({ issuedAt: Number.POSITIVE_INFINITY }))
    );
    const invalidManager = createHighScoreManager({
      fetch: invalidFetch,
      storageKey,
    });

    await expect(invalidManager.startHighScoreRun()).resolves.toBeNull();
    expect(invalidManager.getHighScoreSyncStatus()).toBe("error");
  });

  it("downgrades pending scores with invalid local integrity to local-only", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(createJsonResponse([])));
    const manager = createHighScoreManager({
      fetch: fetchMock,
      storageKey,
    });

    localStorage.setItem(
      storageKey,
      JSON.stringify([
        {
          createdAt: 2000,
          id: "tampered-score",
          integrity: {
            checksum: "bad",
            multiplier: 101,
            scoreProduct: 1,
            statsProduct: 1,
            version: 1,
          },
          name: "Tampered",
          run: {
            issuedAt: 1000,
            runId: "run-tampered",
            token: "receipt-token",
          },
          score: 999999,
          stats: ["Wave: 1"],
          submittedAt: 2000,
          syncState: "pending",
        },
      ])
    );

    await manager.syncHighScores();

    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/high-scores",
      expect.objectContaining({ method: "POST" })
    );
    expect(manager.loadStoredScoreRecords()[0]).toMatchObject({
      integrity: undefined,
      run: undefined,
      syncState: "local",
    });
  });

  it("validates backend score submissions with generic plausibility rules", () => {
    const entry = {
      id: "score-2",
      name: "ACE",
      score: 6000,
      stats: ["Enemies: 4", "Bosses: 1", "Accuracy: 85"],
      submittedAt: 2000,
    };
    const run = {
      issuedAt: 1000,
      runId: "run-2",
      token: "receipt-token",
    };
    const integrity = createHighScoreIntegrity(entry, run, {
      multiplier: 149,
    });
    const rules = {
      baseScoreBudget: 1000,
      maxScore: 10000,
      scoreBudget: [
        { stat: "Enemies", points: 500 },
        { stat: "Bosses", points: 3000 },
      ],
      statMaximums: { Accuracy: 100 },
    };

    expect(getHighScoreStatValues(entry.stats, ["Enemies", "Bosses"])).toEqual({
      Bosses: 1,
      Enemies: 4,
    });
    expect(getHighScorePlausibilityReasons(entry, rules)).toEqual([]);
    expect(
      validateHighScoreSubmission(
        {
          entry,
          gameVersion: "1.2.3",
          integrity,
          run,
          submittedAt: 2000,
        },
        {
          isRunReceiptTrusted: (receipt) => receipt.token === "receipt-token",
          rules,
        }
      )
    ).toEqual({
      accepted: true,
      gameVersion: "1.2.3",
      run,
      score: {
        id: "score-2",
        name: "ACE",
        score: 6000,
        stats: ["Enemies: 4", "Bosses: 1", "Accuracy: 85"],
      },
      submittedAt: 2000,
    });
    expect(
      validateHighScoreSubmission(
        {
          entry: { ...entry, score: 50000 },
          integrity,
          run: { ...run, token: "forged" },
          submittedAt: 2000,
        },
        {
          isRunReceiptTrusted: (receipt) => receipt.token === "receipt-token",
          rules,
        }
      )
    ).toEqual({
      accepted: false,
      error: "invalid_run_receipt",
      status: 401,
    });
  });

  it("rejects non-finite submitted timestamps and run receipt issue times", () => {
    const entry = {
      id: "score-3",
      name: "ACE",
      score: 1000,
      stats: [],
      submittedAt: 2000,
    };
    const run = {
      issuedAt: 1000,
      runId: "run-3",
      token: "receipt-token",
    };
    const integrity = createHighScoreIntegrity(entry, run, { multiplier: 151 });

    expect(
      validateHighScoreSubmission({
        entry,
        integrity,
        run,
        submittedAt: Number.NaN,
      })
    ).toEqual({
      accepted: false,
      error: "invalid_score",
      status: 400,
    });
    expect(
      validateHighScoreSubmission({
        entry,
        integrity,
        run: { ...run, issuedAt: Number.POSITIVE_INFINITY },
        submittedAt: 2000,
      })
    ).toEqual({
      accepted: false,
      error: "missing_run_receipt",
      status: 401,
    });
  });

  it("rejects malformed or implausible backend score submissions", () => {
    const entry = {
      id: "score-4",
      name: "ACE",
      score: 12000,
      stats: ["Enemies: 1"],
      submittedAt: 2000,
    };
    const run = {
      issuedAt: 1000,
      runId: "run-4",
      token: "receipt-token",
    };
    const integrity = createHighScoreIntegrity(entry, run, { multiplier: 151 });

    expect(validateHighScoreSubmission(null)).toEqual({
      accepted: false,
      error: "invalid_payload",
      status: 400,
    });
    expect(
      validateHighScoreSubmission({
        entry: { ...entry, stats: Array.from({ length: 17 }, () => "Too many: 1") },
        integrity,
        run,
        submittedAt: 2000,
      })
    ).toEqual({
      accepted: false,
      error: "invalid_score",
      status: 400,
    });
    expect(
      validateHighScoreSubmission(
        {
          entry,
          gameVersion: "x".repeat(40),
          integrity,
          run,
          submittedAt: 2000,
        },
        {
          rules: {
            baseScoreBudget: 0,
            maxScore: 20000,
            scoreBudget: [{ points: 1000, stat: "Enemies" }],
          },
        }
      )
    ).toEqual({
      accepted: false,
      error: "implausible_score",
      status: 422,
    });
  });
});
