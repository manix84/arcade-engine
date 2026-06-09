import { PerformanceSampler } from "./PerformanceSampler.js";
import type {
  DebugOverlayPosition,
  FpsOverlayLevel,
  FpsOverlayOptions,
  FpsOverlayRenderOptions,
  PerformanceHistoryPoint,
  PerformanceMetrics,
  PerformanceSamplerOptions,
} from "./types.js";

const levels: FpsOverlayLevel[] = ["minimal", "basic", "detailed", "graph"];

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const normalizeLevel = (value: FpsOverlayLevel | undefined): FpsOverlayLevel => {
  if (value === "minimal" || value === "basic" || value === "detailed" || value === "graph") {
    return value;
  }

  return "minimal";
};

const normalizePosition = (
  value: DebugOverlayPosition | undefined
): DebugOverlayPosition => {
  if (
    value === "top-left" ||
    value === "top-right" ||
    value === "bottom-left" ||
    value === "bottom-right"
  ) {
    return value;
  }

  return "top-left";
};

const getFiniteNumber = (
  value: number | undefined,
  fallback: number,
  minimum = 0
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minimum, value);
};

type NormalizedFpsOverlayOptions = Required<
  Pick<
    FpsOverlayOptions,
    "enabled" | "level" | "opacity" | "position" | "scale" | "targetFps"
  >
> &
  Required<Pick<PerformanceSamplerOptions, "historyMs" | "rollingWindowMs">>;

const normalizeOptions = (
  options: FpsOverlayOptions | undefined,
  enabledFallback = false
): NormalizedFpsOverlayOptions => ({
  enabled: options?.enabled ?? enabledFallback,
  historyMs: getFiniteNumber(options?.graphHistoryMs, 8000, 1000),
  level: normalizeLevel(options?.level),
  opacity: clamp(getFiniteNumber(options?.opacity, 0.85), 0, 1),
  position: normalizePosition(options?.position),
  rollingWindowMs: getFiniteNumber(options?.rollingWindowMs, 1000, 250),
  scale: getFiniteNumber(options?.scale, 1, 0.5),
  targetFps: getFiniteNumber(options?.targetFps, 60, 1),
});

export class FpsOverlay {
  private options: NormalizedFpsOverlayOptions;
  private readonly sampler: PerformanceSampler;

  constructor(options: FpsOverlayOptions = {}) {
    this.options = normalizeOptions(options);
    this.sampler = new PerformanceSampler({
      historyMs: this.options.historyMs,
      rollingWindowMs: this.options.rollingWindowMs,
    });
  }

  clear(): void {
    this.sampler.clear();
  }

  getMetrics(): PerformanceMetrics {
    return this.sampler.getMetrics();
  }

  getLevel(): FpsOverlayLevel {
    return this.options.level;
  }

  isEnabled(): boolean {
    return this.options.enabled;
  }

  nextLevel(): FpsOverlayLevel {
    const index = levels.indexOf(this.options.level);
    const nextLevel = levels[(index + 1) % levels.length] ?? "minimal";

    this.setLevel(nextLevel);

    return nextLevel;
  }

  render(
    context: CanvasRenderingContext2D,
    { viewport }: FpsOverlayRenderOptions
  ): void {
    if (!this.options.enabled || viewport.width <= 0 || viewport.height <= 0) {
      return;
    }

    const metrics = this.sampler.getMetrics();
    const scale = this.options.scale;
    const textSize = Math.round(10 * scale);
    const padding = Math.round(5 * scale);
    const margin = Math.round(6 * scale);
    const lineHeight = Math.round(12 * scale);
    const graphWidth = Math.round(208 * scale);
    const graphHeight = Math.round(48 * scale);
    const rows = this.getRows(metrics);
    const graphPanelWidth = Math.max(
      Math.round(118 * scale),
      Math.min(viewport.width - margin * 2, graphWidth + padding * 2)
    );
    const width =
      this.options.level === "graph"
        ? graphPanelWidth
        : Math.max(Math.round(58 * scale), this.getTextWidth(rows, textSize) + padding * 2);
    const height =
      this.options.level === "graph"
        ? padding * 3 + lineHeight * 4 + graphHeight
        : padding * 2 + lineHeight * rows.length;
    const x = this.getPanelX(viewport.width, width, margin);
    const y = this.getPanelY(viewport.height, height, margin);
    const containedGraphWidth = Math.max(Math.round(118 * scale), width - padding * 2);

    context.save();
    context.imageSmoothingEnabled = false;
    this.resetTransform(context);
    this.renderPanel(context, x, y, width, height);
    this.renderRows(context, rows, x + padding, y + padding, textSize, lineHeight);

    if (this.options.level === "graph") {
      this.renderGraph(
        context,
        x + padding,
        y + padding + lineHeight * 4 + padding,
        containedGraphWidth,
        graphHeight,
        scale
      );
    }

    context.restore();
  }

  setEnabled(enabled: boolean): void {
    this.options = {
      ...this.options,
      enabled,
    };
  }

  setLevel(level: FpsOverlayLevel): void {
    this.options = {
      ...this.options,
      level: normalizeLevel(level),
    };
  }

  setOptions(options: FpsOverlayOptions): void {
    this.options = normalizeOptions(
      {
        enabled: this.options.enabled,
        graphHistoryMs: this.options.historyMs,
        level: this.options.level,
        opacity: this.options.opacity,
        position: this.options.position,
        rollingWindowMs: this.options.rollingWindowMs,
        scale: this.options.scale,
        targetFps: this.options.targetFps,
        ...options,
      },
      this.options.enabled
    );
  }

  toggle(): boolean {
    this.setEnabled(!this.options.enabled);

    return this.options.enabled;
  }

  update(deltaMs: number, timestampMs?: number): PerformanceMetrics {
    if (!this.options.enabled) {
      return this.sampler.getMetrics();
    }

    return this.sampler.update(deltaMs, timestampMs);
  }

  private getPanelX(
    viewportWidth: number,
    panelWidth: number,
    margin: number
  ): number {
    return this.options.position === "top-right" || this.options.position === "bottom-right"
      ? Math.max(margin, viewportWidth - panelWidth - margin)
      : margin;
  }

  private getPanelY(
    viewportHeight: number,
    panelHeight: number,
    margin: number
  ): number {
    return this.options.position === "bottom-left" || this.options.position === "bottom-right"
      ? Math.max(margin, viewportHeight - panelHeight - margin)
      : margin;
  }

  private getRows(metrics: PerformanceMetrics): string[] {
    const fps = Math.round(metrics.currentFps);
    const average = Math.round(metrics.averageFps);
    const low = Math.round(metrics.lowFps);
    const high = Math.round(metrics.highFps);
    const frame = metrics.frameTimeMs.toFixed(1);
    const target = Math.round(this.options.targetFps);

    if (this.options.level === "minimal") {
      return [`FPS: ${fps}`];
    }

    if (this.options.level === "basic") {
      return [`FPS: ${fps} | AVG: ${average}`];
    }

    if (this.options.level === "graph") {
      return [
        `FPS: ${fps}`,
        `AVG: ${average}`,
        `TARGET: ${target}`,
        `FRAME: ${frame}ms`,
      ];
    }

    return [
      `FPS: ${fps}`,
      `AVG: ${average}`,
      `LOW 0.1%: ${low}`,
      `HIGH 99.9%: ${high}`,
      `FRAME: ${frame}ms`,
    ];
  }

  private getTextWidth(rows: string[], textSize: number): number {
    const longest = rows.reduce((length, row) => Math.max(length, row.length), 0);

    return Math.round(longest * textSize * 0.62);
  }

  private renderGraph(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    scale: number
  ): void {
    const history = this.sampler.getHistory();
    const pixel = Math.max(1, Math.round(scale));
    const maxFps = Math.max(30, this.options.targetFps * 1.2);

    context.fillStyle = "rgba(3, 8, 12, 0.7)";
    context.fillRect(x, y, width, height);

    if (history.length === 0) {
      return;
    }

    const step = Math.max(pixel * 2, Math.floor(width / Math.max(1, history.length)));
    const start = Math.max(0, history.length - Math.floor(width / step));

    this.renderTargetLine(context, x, y, width, height, maxFps, pixel);
    this.renderGraphSeries(context, history, start, x, y, width, height, step, maxFps, "lowFps", "#7e4c52", pixel);
    this.renderGraphSeries(context, history, start, x, y, width, height, step, maxFps, "highFps", "#527c58", pixel);
    this.renderGraphSeries(context, history, start, x, y, width, height, step, maxFps, "averageFps", undefined, pixel);
    this.renderGraphSeries(context, history, start, x, y, width, height, step, maxFps, "fps", undefined, pixel + 1);
  }

  private renderGraphSeries(
    context: CanvasRenderingContext2D,
    history: readonly PerformanceHistoryPoint[],
    start: number,
    x: number,
    y: number,
    width: number,
    height: number,
    step: number,
    maxFps: number,
    key: "averageFps" | "fps" | "highFps" | "lowFps",
    color: string | undefined,
    thickness: number
  ): void {
    let previousX = x + width - (history.length - start) * step;
    let previousY: number | undefined;

    for (let index = start; index < history.length; index += 1) {
      const point = history[index];

      if (!point) {
        continue;
      }

      const currentX = previousX + step;
      const fps = point[key];
      const currentY = this.getGraphY(y, height, maxFps, fps);

      context.fillStyle = color ?? this.getQualityColor(fps);

      if (previousY === undefined) {
        context.fillRect(Math.round(currentX), currentY, thickness, thickness);
      } else {
        const horizontalX = Math.round(Math.min(previousX, currentX));
        const horizontalWidth = Math.max(thickness, Math.round(Math.abs(currentX - previousX)));
        const verticalY = Math.min(previousY, currentY);
        const verticalHeight = Math.max(thickness, Math.abs(currentY - previousY) + thickness);

        context.fillRect(horizontalX, previousY, horizontalWidth, thickness);
        context.fillRect(Math.round(currentX), verticalY, thickness, verticalHeight);
      }

      previousX = currentX;
      previousY = currentY;
    }
  }

  private getGraphY(
    y: number,
    height: number,
    maxFps: number,
    fps: number
  ): number {
    const progress = clamp(fps / maxFps, 0, 1);

    return Math.round(y + height - progress * height);
  }

  private getQualityColor(fps: number): string {
    const ratio = fps / this.options.targetFps;

    if (ratio >= 0.95) {
      return "#8ef27f";
    }

    if (ratio >= 0.75) {
      return "#f4d35e";
    }

    if (ratio >= 0.5) {
      return "#f49a45";
    }

    return "#f05d5e";
  }

  private renderTargetLine(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    maxFps: number,
    pixel: number
  ): void {
    const targetY = this.getGraphY(y, height, maxFps, this.options.targetFps);

    context.fillStyle = "rgba(215, 237, 244, 0.28)";
    for (let lineX = x; lineX < x + width; lineX += pixel * 4) {
      context.fillRect(Math.round(lineX), targetY, pixel * 2, 1);
    }
  }

  private renderPanel(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    context.globalAlpha = this.options.opacity;
    context.fillStyle = "#05090d";
    context.fillRect(x, y, width, height);
    context.globalAlpha = 1;
    context.strokeStyle = "rgba(138, 171, 180, 0.55)";
    context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }

  private renderRows(
    context: CanvasRenderingContext2D,
    rows: string[],
    x: number,
    y: number,
    textSize: number,
    lineHeight: number
  ): void {
    context.fillStyle = "#d7edf4";
    context.font = `${textSize}px monospace`;
    context.textAlign = "left";
    context.textBaseline = "top";

    rows.forEach((row, index) => {
      context.fillText(row, x, y + index * lineHeight);
    });
  }

  private resetTransform(context: CanvasRenderingContext2D): void {
    const maybeContext = context as CanvasRenderingContext2D & {
      setTransform?: (
        a: number,
        b: number,
        c: number,
        d: number,
        e: number,
        f: number
      ) => void;
    };

    maybeContext.setTransform?.(1, 0, 0, 1, 0, 0);
  }
}
