import { describe, expect, it } from "vitest";
import {
  clamp,
  clampGridPosition,
  containsBox,
  detectBoxCollision,
  getBoxCenter,
  getGridCell,
  getGridCellCenter,
  getGridPosition,
  getGridSize,
  isInsideGrid,
  keepBoxInside,
  moveBy,
  snapToGrid,
} from "../index.js";
import type { GridDefinition } from "../index.js";

describe("genre-neutral grid helpers", () => {
  const tetrisGrid: GridDefinition = {
    cellHeight: 24,
    cellWidth: 24,
    columns: 10,
    originX: 8,
    originY: 16,
    rows: 20,
  };

  it("calculates grid dimensions, cells, and cell centers", () => {
    expect(getGridSize(tetrisGrid)).toEqual({ height: 480, width: 240 });
    expect(getGridCell(tetrisGrid, { column: 3, row: 4 })).toEqual({
      column: 3,
      height: 24,
      posX: 80,
      posY: 112,
      row: 4,
      width: 24,
    });
    expect(getGridCellCenter(tetrisGrid, { column: 3, row: 4 })).toEqual({
      posX: 92,
      posY: 124,
    });
  });

  it("maps coordinates into cells and clamps positions to the board", () => {
    expect(getGridPosition(tetrisGrid, { posX: 83, posY: 119 })).toEqual({
      column: 3,
      row: 4,
    });
    expect(isInsideGrid(tetrisGrid, { column: 9, row: 19 })).toBe(true);
    expect(isInsideGrid(tetrisGrid, { column: 10, row: 19 })).toBe(false);
    expect(clampGridPosition(tetrisGrid, { column: 12, row: -3 })).toEqual({
      column: 9,
      row: 0,
    });
    expect(snapToGrid(tetrisGrid, { posX: 400, posY: -20 })).toEqual({
      column: 9,
      height: 24,
      posX: 224,
      posY: 16,
      row: 0,
      width: 24,
    });
  });
});

describe("genre-neutral box helpers", () => {
  it("detects axis-aligned collisions for bricks, paddles, enemies, and shots", () => {
    const ball = { height: 8, posX: 42, posY: 96, width: 8 };
    const brick = { height: 16, posX: 40, posY: 88, width: 48 };
    const missedBrick = { height: 16, posX: 90, posY: 88, width: 48 };

    expect(detectBoxCollision(ball, brick)).toBe(true);
    expect(detectBoxCollision(ball, missedBrick)).toBe(false);
  });

  it("moves entities by velocity and clamps them inside arena bounds", () => {
    const arena = { height: 240, posX: 0, posY: 0, width: 320 };
    const paddle = {
      height: 12,
      posX: 300,
      posY: 220,
      velocityX: 80,
      width: 56,
    };
    const moved = moveBy(paddle, 0.5);

    expect(moved).toEqual({
      height: 12,
      posX: 340,
      posY: 220,
      velocityX: 80,
      width: 56,
    });
    expect(keepBoxInside(moved, arena)).toEqual({
      height: 12,
      posX: 264,
      posY: 220,
      velocityX: 80,
      width: 56,
    });
    expect(containsBox(arena, { height: 12, posX: 264, posY: 220, width: 56 }))
      .toBe(true);
    expect(containsBox(arena, moved)).toBe(false);
  });

  it("provides direct scalar clamps and box centers", () => {
    expect(clamp(14, 0, 10)).toBe(10);
    expect(clamp(-2, 0, 10)).toBe(0);
    expect(clamp(6, 0, 10)).toBe(6);
    expect(getBoxCenter({ height: 12, posX: 10, posY: 20, width: 30 })).toEqual({
      posX: 25,
      posY: 26,
    });
  });
});
