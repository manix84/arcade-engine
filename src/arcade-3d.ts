import type { ViewportDimensions } from "./viewport.js";

export interface ArcadePoint3D {
  x: number;
  y: number;
  z: number;
}

export interface ArcadeProjectedPoint {
  depth: number;
  scale: number;
  x: number;
  y: number;
}

export interface PerspectiveProjectionOptions {
  cameraY?: number;
  centerX?: number;
  depthScale?: number;
  focalLength?: number;
  horizon?: number;
  minDepth?: number;
}

export interface LoopedDepthOptions {
  depth: number;
  elapsedSeconds: number;
  index?: number;
  offset?: number;
  spacing?: number;
  speed: number;
}

const defaultDepthScale = 28;
const defaultFocalLength = 360;
const defaultMinDepth = 0.35;

export const wrapDepth = (depth: number, range: number): number => {
  if (range <= 0) {
    throw new Error("Depth range must be greater than 0.");
  }

  return ((depth % range) + range) % range;
};

export const getLoopedDepth = ({
  depth,
  elapsedSeconds,
  index = 0,
  offset = 0,
  spacing = 1,
  speed,
}: LoopedDepthOptions): number =>
  wrapDepth(index * spacing + offset - elapsedSeconds * speed, depth);

export const getPerspectiveScale = (
  depth: number,
  options: PerspectiveProjectionOptions = {}
): number => {
  const focalLength = options.focalLength ?? defaultFocalLength;
  const depthScale = options.depthScale ?? defaultDepthScale;
  const clampedDepth = Math.max(options.minDepth ?? defaultMinDepth, depth);

  return focalLength / (focalLength + clampedDepth * depthScale);
};

export const projectPerspectivePoint = (
  point: ArcadePoint3D,
  viewport: ViewportDimensions,
  options: PerspectiveProjectionOptions = {}
): ArcadeProjectedPoint => {
  const depth = Math.max(options.minDepth ?? defaultMinDepth, point.z);
  const scale = getPerspectiveScale(depth, options);
  const centerX = options.centerX ?? viewport.width / 2;
  const horizon = options.horizon ?? viewport.height * 0.46;
  const cameraY = options.cameraY ?? 0;

  return {
    depth,
    scale,
    x: centerX + point.x * scale,
    y: horizon + (point.y - cameraY) * scale,
  };
};
