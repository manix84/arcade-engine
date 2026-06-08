import { describe, expect, it } from "vitest";
import {
  addAchievementProgress,
  createAchievementState,
  getAchievementStatuses,
  setAchievementProgress,
  unlockAchievement,
} from "../index.js";

const definitions = [
  {
    description: "Start one run.",
    id: "first-run",
    name: "First Run",
  },
  {
    description: "Clear three waves.",
    id: "waves",
    name: "Wave Breaker",
    progressGoal: 3,
  },
  {
    description: "Track a counter without an unlock target.",
    id: "endless",
    name: "Endless Counter",
    progressGoal: 0,
  },
] as const;

type TestAchievementId = (typeof definitions)[number]["id"];

describe("achievement helpers", () => {
  it("normalizes persisted state without preserving duplicate unlocks", () => {
    const state = createAchievementState<TestAchievementId>({
      progress: {
        waves: 2.8,
      },
      unlocked: ["first-run", "first-run"],
      unlockedAt: {
        "first-run": 1000.9,
      },
    });

    expect(state).toEqual({
      progress: {
        waves: 2.8,
      },
      unlocked: ["first-run"],
      unlockedAt: {
        "first-run": 1000.9,
      },
    });
  });

  it("sets progress with clamping, flooring, and immutable state updates", () => {
    const initial = createAchievementState<TestAchievementId>();
    const partial = setAchievementProgress(definitions, initial, "waves", 2.8, 1000);
    const completed = setAchievementProgress(
      definitions,
      partial.state,
      "waves",
      20,
      2000.9
    );

    expect(initial.progress).toEqual({});
    expect(partial).toMatchObject({
      unlocked: false,
      status: {
        progress: { current: 2, goal: 3 },
        unlocked: false,
      },
    });
    expect(completed).toMatchObject({
      unlocked: true,
      status: {
        progress: { current: 3, goal: 3 },
        unlocked: true,
        unlockedAt: 2000,
      },
    });
  });

  it("supports zero-goal progress counters without auto-unlocking", () => {
    const initial = createAchievementState<TestAchievementId>();
    const progress = addAchievementProgress(definitions, initial, "endless", 4.6, 1000);

    expect(progress).toMatchObject({
      unlocked: false,
      status: {
        progress: { current: 4, goal: 0 },
        unlocked: false,
      },
    });
  });

  it("returns direct unlock statuses and ignores duplicate unlock timestamps", () => {
    const initial = createAchievementState<TestAchievementId>();
    const first = unlockAchievement(initial, "first-run", 1200.8);
    const duplicate = unlockAchievement(first.state, "first-run", 9000);

    expect(duplicate.unlocked).toBe(false);
    expect(getAchievementStatuses(definitions, duplicate.state)[0]).toEqual({
      description: "Start one run.",
      id: "first-run",
      name: "First Run",
      unlocked: true,
      unlockedAt: 1200,
    });
  });

  it("throws for unknown progress achievement ids", () => {
    const state = createAchievementState<TestAchievementId>();

    expect(() =>
      setAchievementProgress(definitions, state, "missing" as TestAchievementId, 1)
    ).toThrow("Unknown achievement: missing");
  });
});
