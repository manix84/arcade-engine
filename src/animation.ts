import type { SpriteFrame } from "./types.js";

export interface SpriteFrameIndexOptions {
  elapsedSeconds: number;
  fps: number;
  frameCount: number;
  loop?: boolean;
}

export interface SpriteSheetFrameOptions {
  columns: number;
  frameHeight: number;
  frameIndex: number;
  frameWidth: number;
  posX?: number;
  posY?: number;
  renderHeight?: number;
  renderWidth?: number;
}

export type AnimatedSpriteFrameOptions = Omit<
  SpriteSheetFrameOptions,
  "frameIndex"
> &
  SpriteFrameIndexOptions;

export const getSpriteFrameIndex = ({
  elapsedSeconds,
  fps,
  frameCount,
  loop = true,
}: SpriteFrameIndexOptions): number => {
  if (fps <= 0) {
    throw new Error("Sprite animation FPS must be greater than 0.");
  }

  if (frameCount <= 0) {
    throw new Error("Sprite animation frame count must be greater than 0.");
  }

  const frame = Math.max(0, Math.floor(elapsedSeconds * fps));

  return loop ? frame % frameCount : Math.min(frame, frameCount - 1);
};

export const getSpriteSheetFrame = ({
  columns,
  frameHeight,
  frameIndex,
  frameWidth,
  posX = 0,
  posY = 0,
  renderHeight,
  renderWidth,
}: SpriteSheetFrameOptions): SpriteFrame => {
  if (columns <= 0) {
    throw new Error("Sprite sheet columns must be greater than 0.");
  }

  const column = frameIndex % columns;
  const row = Math.floor(frameIndex / columns);

  return {
    frameHeight,
    frameWidth,
    frameX: column * frameWidth,
    frameY: row * frameHeight,
    posX,
    posY,
    renderHeight,
    renderWidth,
  };
};

export const getAnimatedSpriteFrame = ({
  elapsedSeconds,
  fps,
  frameCount,
  loop,
  ...frameOptions
}: AnimatedSpriteFrameOptions): SpriteFrame =>
  getSpriteSheetFrame({
    ...frameOptions,
    frameIndex: getSpriteFrameIndex({
      elapsedSeconds,
      fps,
      frameCount,
      loop,
    }),
  });
