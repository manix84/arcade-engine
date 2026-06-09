export type FpsOverlayLevel = "minimal" | "basic" | "detailed" | "graph";

export type DebugOverlayPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface FpsOverlayOptions {
  enabled?: boolean;
  graphHistoryMs?: number;
  level?: FpsOverlayLevel;
  opacity?: number;
  position?: DebugOverlayPosition;
  rollingWindowMs?: number;
  scale?: number;
  targetFps?: number;
}

export interface DebugOptions {
  enabled?: boolean;
  fps?: FpsOverlayOptions;
}

export interface PerformanceFrameSample {
  deltaMs: number;
  fps: number;
  timestampMs: number;
}

export interface PerformanceMetrics {
  averageFps: number;
  currentFps: number;
  frameTimeMs: number;
  highFps: number;
  lowFps: number;
  sampleCount: number;
}

export interface PerformanceHistoryPoint {
  averageFps: number;
  fps: number;
  highFps: number;
  lowFps: number;
  timestampMs: number;
}

export interface PerformanceSamplerOptions {
  historyMs?: number;
  maxFps?: number;
  now?: () => number;
  rollingWindowMs?: number;
}

export interface FpsOverlayViewport {
  height: number;
  width: number;
}

export interface FpsOverlayRenderOptions {
  viewport: FpsOverlayViewport;
}
