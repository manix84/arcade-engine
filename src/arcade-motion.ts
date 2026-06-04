import type { ViewportDimensions } from "./viewport.js";

export interface ArcadeLookInput {
  x?: number;
  y?: number;
}

export interface FirstPersonCameraOptions {
  bobAmount?: number;
  bobSpeed?: number;
  centerDrift?: number;
  elapsedSeconds?: number;
  horizonDrift?: number;
  horizonRatio?: number;
  look?: ArcadeLookInput;
  speed?: number;
}

export interface FirstPersonCamera {
  centerX: number;
  horizon: number;
}

export interface LoopedScrollerPositionOptions {
  elapsedSeconds: number;
  index: number;
  offset?: number;
  range: number;
  spacing: number;
  speed: number;
}

export interface SideScrollerJumpOptions {
  elapsedSeconds: number;
  groundY: number;
  height?: number;
  phase?: number;
  speed: number;
}

export interface SideScrollerActorPositionOptions extends LoopedScrollerPositionOptions {
  viewportWidth: number;
  width?: number;
}

export interface SideScrollerActorPosition {
  isVisible: boolean;
  progress: number;
  x: number;
}

export interface SpatialAudioPanOptions {
  listenerRange: number;
  sourceX: number;
}

export interface SpatialAudioDepthOptions {
  baseDepth?: number;
  distanceScale?: number;
  sourceY: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const wrapRange = (value: number, range: number): number => {
  if (range <= 0) {
    throw new Error("Loop range must be greater than 0.");
  }

  return ((value % range) + range) % range;
};

export const getFirstPersonCamera = (
  viewport: ViewportDimensions,
  options: FirstPersonCameraOptions = {}
): FirstPersonCamera => {
  const look = options.look ?? {};
  const speed = options.speed ?? 1;
  const elapsedSeconds = options.elapsedSeconds ?? 0;
  const centerDrift = options.centerDrift ?? 0;
  const horizonRatio = options.horizonRatio ?? 0.5;
  const horizonDrift = options.horizonDrift ?? 0;
  const bobAmount = options.bobAmount ?? 0;
  const bobSpeed = options.bobSpeed ?? 1;

  return {
    centerX: viewport.width / 2 + (look.x ?? 0) * centerDrift,
    horizon:
      viewport.height * horizonRatio +
      Math.sin(elapsedSeconds * speed * bobSpeed) * bobAmount +
      (look.y ?? 0) * horizonDrift,
  };
};

export const getLoopedScrollerPosition = ({
  elapsedSeconds,
  index,
  offset = 0,
  range,
  spacing,
  speed,
}: LoopedScrollerPositionOptions): number =>
  wrapRange(index * spacing - elapsedSeconds * speed, range) + offset;

export const getSideScrollerJumpY = ({
  elapsedSeconds,
  groundY,
  height = 0,
  phase = 0,
  speed,
}: SideScrollerJumpOptions): number =>
  groundY - Math.max(0, Math.sin(elapsedSeconds * speed + phase)) * height;

export const getSideScrollerActorPosition = (
  options: SideScrollerActorPositionOptions
): SideScrollerActorPosition => {
  if (options.viewportWidth <= 0) {
    throw new Error("Viewport width must be greater than 0.");
  }

  const width = options.width ?? 0;

  if (width < 0) {
    throw new Error("Actor width must be greater than or equal to 0.");
  }

  const x = getLoopedScrollerPosition(options);
  const progress = clamp((x + width) / (options.viewportWidth + width), 0, 1);

  return {
    isVisible: x + width >= 0 && x <= options.viewportWidth,
    progress,
    x,
  };
};

export const getSpatialAudioPan = ({
  listenerRange,
  sourceX,
}: SpatialAudioPanOptions): number => {
  if (listenerRange <= 0) {
    throw new Error("Listener range must be greater than 0.");
  }

  return clamp(sourceX / listenerRange, -1, 1);
};

export const getSpatialAudioDepth = ({
  baseDepth = 0,
  distanceScale = 1,
  sourceY,
}: SpatialAudioDepthOptions): number => {
  if (distanceScale <= 0) {
    throw new Error("Distance scale must be greater than 0.");
  }

  return baseDepth + Math.abs(sourceY) / distanceScale;
};
