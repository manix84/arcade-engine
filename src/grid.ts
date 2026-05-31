import type { Coordinates } from "./types.js";

export interface GridDefinition {
  cellHeight: number;
  cellWidth: number;
  columns: number;
  originX?: number;
  originY?: number;
  rows: number;
}

export interface GridPosition {
  column: number;
  row: number;
}

export interface GridCell extends Coordinates, GridPosition {
  height: number;
  width: number;
}

const getOriginX = (grid: GridDefinition): number => grid.originX ?? 0;
const getOriginY = (grid: GridDefinition): number => grid.originY ?? 0;

export const getGridSize = (
  grid: GridDefinition
): { height: number; width: number } => ({
  height: grid.rows * grid.cellHeight,
  width: grid.columns * grid.cellWidth,
});

export const isInsideGrid = (
  grid: GridDefinition,
  position: GridPosition
): boolean =>
  position.column >= 0 &&
  position.column < grid.columns &&
  position.row >= 0 &&
  position.row < grid.rows;

export const clampGridPosition = (
  grid: GridDefinition,
  position: GridPosition
): GridPosition => ({
  column: Math.max(0, Math.min(grid.columns - 1, position.column)),
  row: Math.max(0, Math.min(grid.rows - 1, position.row)),
});

export const getGridCell = (
  grid: GridDefinition,
  position: GridPosition
): GridCell => ({
  column: position.column,
  height: grid.cellHeight,
  posX: getOriginX(grid) + position.column * grid.cellWidth,
  posY: getOriginY(grid) + position.row * grid.cellHeight,
  row: position.row,
  width: grid.cellWidth,
});

export const getGridCellCenter = (
  grid: GridDefinition,
  position: GridPosition
): Coordinates => {
  const cell = getGridCell(grid, position);

  return {
    posX: cell.posX + cell.width / 2,
    posY: cell.posY + cell.height / 2,
  };
};

export const getGridPosition = (
  grid: GridDefinition,
  coordinates: Coordinates
): GridPosition => ({
  column: Math.floor((coordinates.posX - getOriginX(grid)) / grid.cellWidth),
  row: Math.floor((coordinates.posY - getOriginY(grid)) / grid.cellHeight),
});

export const snapToGrid = (
  grid: GridDefinition,
  coordinates: Coordinates
): GridCell => getGridCell(grid, clampGridPosition(grid, getGridPosition(grid, coordinates)));
