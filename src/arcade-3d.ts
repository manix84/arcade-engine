import type { ViewportDimensions } from "./viewport.js";

export interface ArcadePoint3D {
  x: number;
  y: number;
  z: number;
}

export interface ArcadePoint2D {
  x: number;
  y: number;
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

export interface IsometricProjectionOptions {
  origin?: ArcadePoint2D;
  tileHeight?: number;
  tileWidth?: number;
  verticalScale?: number;
}

const defaultDepthScale = 28;
const defaultFocalLength = 360;
const defaultMinDepth = 0.35;
const defaultTileHeight = 34;
const defaultTileWidth = 68;

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

export const getDepthProgress = (depth: number, range: number): number => {
  if (range <= 0) {
    throw new Error("Depth range must be greater than 0.");
  }

  return Math.max(0, Math.min(1, 1 - depth / range));
};

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

export const projectIsometricPoint = (
  point: ArcadePoint3D,
  options: IsometricProjectionOptions = {}
): ArcadePoint2D => {
  const origin = options.origin ?? { x: 0, y: 0 };
  const tileWidth = options.tileWidth ?? defaultTileWidth;
  const tileHeight = options.tileHeight ?? defaultTileHeight;
  const verticalScale = options.verticalScale ?? tileHeight;

  return {
    x: origin.x + (point.x - point.z) * (tileWidth / 2),
    y: origin.y + (point.x + point.z) * (tileHeight / 2) - point.y * verticalScale,
  };
};

export const getIsometricTileCorners = (
  center: ArcadePoint2D,
  options: IsometricProjectionOptions = {}
): ArcadePoint2D[] => {
  const tileWidth = options.tileWidth ?? defaultTileWidth;
  const tileHeight = options.tileHeight ?? defaultTileHeight;

  return [
    { x: center.x, y: center.y },
    { x: center.x + tileWidth / 2, y: center.y + tileHeight / 2 },
    { x: center.x, y: center.y + tileHeight },
    { x: center.x - tileWidth / 2, y: center.y + tileHeight / 2 },
  ];
};

export const getIsometricWallSide = (
  tileCorners: ArcadePoint2D[],
  height: number,
  side: "left" | "right" = "left"
): ArcadePoint2D[] => {
  if (tileCorners.length < 4) {
    throw new Error("Isometric wall sides require four tile corners.");
  }

  const [, right, bottom, left] = tileCorners;
  const from = side === "left" ? left : right;

  return [
    from,
    bottom,
    { x: bottom.x, y: bottom.y + height },
    { x: from.x, y: from.y + height },
  ];
};
