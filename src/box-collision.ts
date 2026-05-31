import type { Coordinates } from "./types.js";

export interface Box extends Coordinates {
  height: number;
  width: number;
}

export interface Velocity {
  velocityX?: number;
  velocityY?: number;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const moveBy = <T extends Coordinates & Velocity>(
  entity: T,
  delta = 1
): T => ({
  ...entity,
  posX: entity.posX + (entity.velocityX ?? 0) * delta,
  posY: entity.posY + (entity.velocityY ?? 0) * delta,
});

export const detectBoxCollision = (target: Box, origin: Box): boolean =>
  target.posX < origin.posX + origin.width &&
  target.posX + target.width > origin.posX &&
  target.posY < origin.posY + origin.height &&
  target.posY + target.height > origin.posY;

export const containsBox = (bounds: Box, target: Box): boolean =>
  target.posX >= bounds.posX &&
  target.posY >= bounds.posY &&
  target.posX + target.width <= bounds.posX + bounds.width &&
  target.posY + target.height <= bounds.posY + bounds.height;

export const keepBoxInside = <T extends Box>(target: T, bounds: Box): T => ({
  ...target,
  posX: clamp(target.posX, bounds.posX, bounds.posX + bounds.width - target.width),
  posY: clamp(target.posY, bounds.posY, bounds.posY + bounds.height - target.height),
});

export const getBoxCenter = (box: Box): Coordinates => ({
  posX: box.posX + box.width / 2,
  posY: box.posY + box.height / 2,
});
