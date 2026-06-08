import { describe, expect, it, vi } from "vitest";
import {
  createRuntimeLogger,
  getNextRuntimeLogLevel,
  isRuntimeLogLevel,
  runtimeLogLevels,
  type RuntimeLogLevel,
} from "../index.js";

describe("runtime logger helpers", () => {
  it("recognizes and cycles supported log levels", () => {
    expect(runtimeLogLevels).toEqual([
      "off",
      "debug",
      "info",
      "warning",
      "error",
      "fatal",
    ]);
    expect(isRuntimeLogLevel("warning")).toBe(true);
    expect(isRuntimeLogLevel("verbose")).toBe(false);
    expect(getNextRuntimeLogLevel("fatal", 1)).toBe("off");
    expect(getNextRuntimeLogLevel("off", -1)).toBe("fatal");
  });

  it("suppresses logs below the active threshold", () => {
    let level: RuntimeLogLevel = "warning";
    const output = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
    };
    const logger = createRuntimeLogger({
      console: output,
      getLevel: () => level,
      prefix: "[Arcade]",
    });

    logger.info("hidden");
    logger.warning("visible", { scope: "scores" });
    expect(output.info).not.toHaveBeenCalled();
    expect(output.warn).toHaveBeenCalledWith("[Arcade] WARNING: visible", {
      scope: "scores",
    });

    level = "fatal";
    logger.error("hidden");
    logger.fatal("crashed");
    expect(output.error).toHaveBeenCalledTimes(1);
    expect(output.error).toHaveBeenCalledWith("[Arcade] FATAL: crashed");
  });

  it("can be disabled and exposes threshold checks", () => {
    const output = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      log: vi.fn(),
      warn: vi.fn(),
    };
    const logger = createRuntimeLogger({ console: output, level: "off" });

    logger.error("hidden");
    expect(logger.shouldLog("fatal")).toBe(false);
    expect(output.error).not.toHaveBeenCalled();
  });
});
