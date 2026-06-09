import type {
  PerformanceHistoryPoint,
  PerformanceMetrics,
  PerformanceSamplerOptions,
} from "./types.js";

const defaultRollingWindowMs = 1000;
const defaultHistoryMs = 8000;
const defaultMaxFps = 240;
const minimumDeltaMs = 0.1;

const clampPositiveNumber = (
  value: number | undefined,
  fallback: number,
  minimum = 1
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minimum, value);
};

const getPercentile = (
  sortedValues: number[],
  percentile: number
): number => {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.round((sortedValues.length - 1) * percentile))
  );

  return sortedValues[index] ?? 0;
};

export class PerformanceSampler {
  private readonly deltaSamples: Float64Array;
  private readonly fpsSamples: Float64Array;
  private readonly history: PerformanceHistoryPoint[];
  private readonly historyMs: number;
  private index = 0;
  private lastMetrics: PerformanceMetrics = {
    averageFps: 0,
    currentFps: 0,
    frameTimeMs: 0,
    highFps: 0,
    lowFps: 0,
    sampleCount: 0,
  };
  private readonly maxFps: number;
  private readonly now: () => number;
  private readonly rollingWindowMs: number;
  private sampleCount = 0;

  constructor(options: PerformanceSamplerOptions = {}) {
    this.rollingWindowMs = clampPositiveNumber(
      options.rollingWindowMs,
      defaultRollingWindowMs
    );
    this.historyMs = clampPositiveNumber(options.historyMs, defaultHistoryMs);
    this.maxFps = clampPositiveNumber(options.maxFps, defaultMaxFps);
    this.now = options.now ?? (() => performance.now());

    const capacity = Math.max(30, Math.ceil(this.historyMs / minimumDeltaMs));

    this.deltaSamples = new Float64Array(capacity);
    this.fpsSamples = new Float64Array(capacity);
    this.history = [];
  }

  clear(): void {
    this.deltaSamples.fill(0);
    this.fpsSamples.fill(0);
    this.history.length = 0;
    this.index = 0;
    this.sampleCount = 0;
    this.lastMetrics = {
      averageFps: 0,
      currentFps: 0,
      frameTimeMs: 0,
      highFps: 0,
      lowFps: 0,
      sampleCount: 0,
    };
  }

  getHistory(): readonly PerformanceHistoryPoint[] {
    return this.history;
  }

  getMetrics(): PerformanceMetrics {
    return this.lastMetrics;
  }

  update(deltaMs: number, timestampMs = this.now()): PerformanceMetrics {
    const frameTimeMs = Math.max(minimumDeltaMs, deltaMs);
    const fps = Math.min(this.maxFps, 1000 / frameTimeMs);

    this.deltaSamples[this.index] = frameTimeMs;
    this.fpsSamples[this.index] = fps;
    this.index = (this.index + 1) % this.deltaSamples.length;
    this.sampleCount = Math.min(this.sampleCount + 1, this.deltaSamples.length);

    this.lastMetrics = this.calculateMetrics(frameTimeMs, fps);
    this.pushHistory(timestampMs, this.lastMetrics);

    return this.lastMetrics;
  }

  private calculateMetrics(frameTimeMs: number, fps: number): PerformanceMetrics {
    const windowSamples = this.getRollingWindowSamples();

    if (windowSamples.length === 0) {
      return {
        averageFps: fps,
        currentFps: fps,
        frameTimeMs,
        highFps: fps,
        lowFps: fps,
        sampleCount: this.sampleCount,
      };
    }

    const frameTotal = windowSamples.reduce((total, value) => total + value, 0);
    const averageFrameMs = frameTotal / windowSamples.length;
    const sortedFrameTimes = [...windowSamples].sort((a, b) => a - b);
    const fastestFrameMs = getPercentile(sortedFrameTimes, 0.001);
    const slowestFrameMs = getPercentile(sortedFrameTimes, 0.999);

    return {
      averageFps: Math.min(this.maxFps, 1000 / Math.max(minimumDeltaMs, averageFrameMs)),
      currentFps: fps,
      frameTimeMs,
      highFps: Math.min(this.maxFps, 1000 / Math.max(minimumDeltaMs, fastestFrameMs)),
      lowFps: Math.min(this.maxFps, 1000 / Math.max(minimumDeltaMs, slowestFrameMs)),
      sampleCount: windowSamples.length,
    };
  }

  private getRollingWindowSamples(): number[] {
    const samples: number[] = [];
    let elapsedMs = 0;

    for (let offset = 1; offset <= this.sampleCount; offset += 1) {
      const sampleIndex =
        (this.index - offset + this.deltaSamples.length) % this.deltaSamples.length;
      const deltaMs = this.deltaSamples[sampleIndex] ?? 0;

      if (deltaMs <= 0) {
        continue;
      }

      elapsedMs += deltaMs;
      if (elapsedMs > this.rollingWindowMs && samples.length > 0) {
        break;
      }

      samples.push(deltaMs);
    }

    return samples;
  }

  private pushHistory(
    timestampMs: number,
    metrics: PerformanceMetrics
  ): void {
    const lastPoint = this.history[this.history.length - 1];

    if (lastPoint && timestampMs - lastPoint.timestampMs < 100) {
      lastPoint.averageFps = metrics.averageFps;
      lastPoint.fps = metrics.currentFps;
      lastPoint.highFps = metrics.highFps;
      lastPoint.lowFps = metrics.lowFps;
    } else {
      this.history.push({
        averageFps: metrics.averageFps,
        fps: metrics.currentFps,
        highFps: metrics.highFps,
        lowFps: metrics.lowFps,
        timestampMs,
      });
    }

    const oldestAllowed = timestampMs - this.historyMs;

    while (
      this.history.length > 0 &&
      (this.history[0]?.timestampMs ?? timestampMs) < oldestAllowed
    ) {
      this.history.shift();
    }
  }
}
