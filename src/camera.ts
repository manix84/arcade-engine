import type { Coordinates } from "./types.js";
import type { ViewportDimensions } from "./viewport.js";

export interface CameraBounds {
  height: number;
  width: number;
  x?: number;
  y?: number;
}

export interface FollowCameraOptions {
  current?: Coordinates;
  deadZone?: {
    height?: number;
    width?: number;
  };
  smoothing?: number;
  target: Coordinates;
  viewport: ViewportDimensions;
  worldBounds?: CameraBounds;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const getFollowCamera = ({
  current,
  deadZone,
  smoothing = 1,
  target,
  viewport,
  worldBounds,
}: FollowCameraOptions): Coordinates => {
  const deadZoneWidth = deadZone?.width ?? 0;
  const deadZoneHeight = deadZone?.height ?? 0;
  const currentX = current?.posX ?? target.posX - viewport.width / 2;
  const currentY = current?.posY ?? target.posY - viewport.height / 2;
  const targetScreenX = target.posX - currentX;
  const targetScreenY = target.posY - currentY;
  const minScreenX = viewport.width / 2 - deadZoneWidth / 2;
  const maxScreenX = viewport.width / 2 + deadZoneWidth / 2;
  const minScreenY = viewport.height / 2 - deadZoneHeight / 2;
  const maxScreenY = viewport.height / 2 + deadZoneHeight / 2;
  let desiredX = currentX;
  let desiredY = currentY;

  if (targetScreenX < minScreenX) {
    desiredX = target.posX - minScreenX;
  } else if (targetScreenX > maxScreenX) {
    desiredX = target.posX - maxScreenX;
  }

  if (targetScreenY < minScreenY) {
    desiredY = target.posY - minScreenY;
  } else if (targetScreenY > maxScreenY) {
    desiredY = target.posY - maxScreenY;
  }

  const amount = clamp(smoothing, 0, 1);
  let posX = currentX + (desiredX - currentX) * amount;
  let posY = currentY + (desiredY - currentY) * amount;

  if (worldBounds) {
    const worldX = worldBounds.x ?? 0;
    const worldY = worldBounds.y ?? 0;

    posX = clamp(posX, worldX, Math.max(worldX, worldX + worldBounds.width - viewport.width));
    posY = clamp(posY, worldY, Math.max(worldY, worldY + worldBounds.height - viewport.height));
  }

  return { posX, posY };
};
