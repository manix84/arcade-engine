export type AchievementId = string;

export interface AchievementDefinition<Id extends AchievementId = AchievementId> {
  description: string;
  id: Id;
  name: string;
  progressGoal?: number;
}

export interface AchievementProgress {
  current: number;
  goal: number;
}

export interface AchievementStatus<Id extends AchievementId = AchievementId>
  extends AchievementDefinition<Id> {
  progress?: AchievementProgress;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface AchievementState<Id extends AchievementId = AchievementId> {
  progress: Partial<Record<Id, number>>;
  unlocked: Id[];
  unlockedAt: Partial<Record<Id, number>>;
}

export interface AchievementUnlockResult<Id extends AchievementId = AchievementId> {
  state: AchievementState<Id>;
  unlocked: boolean;
}

export interface AchievementProgressResult<Id extends AchievementId = AchievementId> {
  state: AchievementState<Id>;
  status: AchievementStatus<Id>;
  unlocked: boolean;
}

export const createAchievementState = <
  Id extends AchievementId = AchievementId,
>(
  state: Partial<AchievementState<Id>> = {}
): AchievementState<Id> => ({
  progress: { ...state.progress },
  unlocked: [...new Set(state.unlocked ?? [])],
  unlockedAt: { ...state.unlockedAt },
});

export const unlockAchievement = <Id extends AchievementId>(
  state: AchievementState<Id>,
  id: Id,
  unlockedAt = Date.now()
): AchievementUnlockResult<Id> => {
  if (state.unlocked.includes(id)) {
    return {
      state: createAchievementState(state),
      unlocked: false,
    };
  }

  return {
    state: createAchievementState({
      ...state,
      unlocked: [...state.unlocked, id],
      unlockedAt: {
        ...state.unlockedAt,
        [id]: Math.max(0, Math.floor(unlockedAt)),
      } as Partial<Record<Id, number>>,
    }),
    unlocked: true,
  };
};

export const setAchievementProgress = <Id extends AchievementId>(
  definitions: readonly AchievementDefinition<Id>[],
  state: AchievementState<Id>,
  id: Id,
  current: number,
  unlockedAt = Date.now()
): AchievementProgressResult<Id> => {
  const definition = findAchievementDefinition(definitions, id);
  const goal = Math.max(0, Math.floor(definition.progressGoal ?? 1));
  const nextCurrent = Math.max(0, Math.floor(current));
  const progressState = createAchievementState({
    ...state,
    progress: {
      ...state.progress,
      [id]: goal > 0 ? Math.min(nextCurrent, goal) : nextCurrent,
    } as Partial<Record<Id, number>>,
  });
  const unlockResult =
    goal > 0 && nextCurrent >= goal
      ? unlockAchievement(progressState, id, unlockedAt)
      : { state: progressState, unlocked: false };
  const status = getAchievementStatus(definition, unlockResult.state);

  return {
    state: unlockResult.state,
    status,
    unlocked: unlockResult.unlocked,
  };
};

export const addAchievementProgress = <Id extends AchievementId>(
  definitions: readonly AchievementDefinition<Id>[],
  state: AchievementState<Id>,
  id: Id,
  amount = 1,
  unlockedAt = Date.now()
): AchievementProgressResult<Id> =>
  setAchievementProgress(
    definitions,
    state,
    id,
    Math.max(0, Math.floor(state.progress[id] ?? 0)) + amount,
    unlockedAt
  );

export const getAchievementStatuses = <Id extends AchievementId>(
  definitions: readonly AchievementDefinition<Id>[],
  state: AchievementState<Id>
): AchievementStatus<Id>[] =>
  definitions.map((definition) => getAchievementStatus(definition, state));

const findAchievementDefinition = <Id extends AchievementId>(
  definitions: readonly AchievementDefinition<Id>[],
  id: Id
): AchievementDefinition<Id> => {
  const definition = definitions.find((candidate) => candidate.id === id);

  if (!definition) {
    throw new Error(`Unknown achievement: ${id}`);
  }

  return definition;
};

const getAchievementStatus = <Id extends AchievementId>(
  definition: AchievementDefinition<Id>,
  state: AchievementState<Id>
): AchievementStatus<Id> => {
  const current = Math.max(0, Math.floor(state.progress[definition.id] ?? 0));
  const goal =
    definition.progressGoal === undefined
      ? undefined
      : Math.max(0, Math.floor(definition.progressGoal));

  return {
    ...definition,
    progress:
      goal === undefined
        ? undefined
        : {
            current: goal > 0 ? Math.min(current, goal) : current,
            goal,
          },
    unlocked: state.unlocked.includes(definition.id),
    unlockedAt: state.unlockedAt[definition.id],
  };
};
