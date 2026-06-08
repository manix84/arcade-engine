export const runtimeLogLevels = [
  "off",
  "debug",
  "info",
  "warning",
  "error",
  "fatal",
] as const;

export type RuntimeLogLevel = (typeof runtimeLogLevels)[number];
export type ActiveRuntimeLogLevel = Exclude<RuntimeLogLevel, "off">;

export interface RuntimeLogger {
  debug: (message: string, ...details: unknown[]) => void;
  error: (message: string, ...details: unknown[]) => void;
  fatal: (message: string, ...details: unknown[]) => void;
  info: (message: string, ...details: unknown[]) => void;
  shouldLog: (level: ActiveRuntimeLogLevel) => boolean;
  warning: (message: string, ...details: unknown[]) => void;
}

export interface RuntimeLoggerOptions {
  console?: Pick<Console, "debug" | "error" | "info" | "log" | "warn">;
  getLevel?: () => RuntimeLogLevel;
  level?: RuntimeLogLevel;
  prefix?: string;
}

const runtimeLogPriority: Record<RuntimeLogLevel, number> = {
  off: Number.POSITIVE_INFINITY,
  debug: 10,
  info: 20,
  warning: 30,
  error: 40,
  fatal: 50,
};

const runtimeConsoleMethod: Record<
  ActiveRuntimeLogLevel,
  "debug" | "error" | "info" | "warn"
> = {
  debug: "debug",
  info: "info",
  warning: "warn",
  error: "error",
  fatal: "error",
};

export const isRuntimeLogLevel = (value: unknown): value is RuntimeLogLevel =>
  typeof value === "string" &&
  (runtimeLogLevels as readonly string[]).includes(value);

export const getNextRuntimeLogLevel = (
  current: RuntimeLogLevel,
  direction: -1 | 1
): RuntimeLogLevel => {
  const currentIndex = runtimeLogLevels.indexOf(current);
  const nextIndex =
    (currentIndex + direction + runtimeLogLevels.length) %
    runtimeLogLevels.length;

  return runtimeLogLevels[nextIndex];
};

export const createRuntimeLogger = (
  options: RuntimeLoggerOptions = {}
): RuntimeLogger => {
  const output = options.console ?? console;
  const getLevel = options.getLevel ?? (() => options.level ?? "off");
  const formatMessage = (level: ActiveRuntimeLogLevel, message: string): string =>
    `${options.prefix ? `${options.prefix} ` : ""}${level.toUpperCase()}: ${message}`;

  const shouldLog = (level: ActiveRuntimeLogLevel): boolean =>
    runtimeLogPriority[level] >= runtimeLogPriority[getLevel()];

  const writeLog = (
    level: ActiveRuntimeLogLevel,
    message: string,
    ...details: unknown[]
  ): void => {
    if (!shouldLog(level)) {
      return;
    }

    const method = runtimeConsoleMethod[level];
    const writer = output[method] ?? output.log;

    writer.call(output, formatMessage(level, message), ...details);
  };

  return {
    debug: (message, ...details) => writeLog("debug", message, ...details),
    error: (message, ...details) => writeLog("error", message, ...details),
    fatal: (message, ...details) => writeLog("fatal", message, ...details),
    info: (message, ...details) => writeLog("info", message, ...details),
    shouldLog,
    warning: (message, ...details) => writeLog("warning", message, ...details),
  };
};
