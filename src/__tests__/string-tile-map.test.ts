import { describe, expect, it } from "vitest";

import {
  findStringTileMapCell,
  findStringTileMapCells,
  getStringTileMapCellFromCenteredPoint,
  getStringTileMapCenteredPoint,
  getStringTileMapTile,
  parseStringTileMap,
} from "../string-tile-map.js";

describe("string tile maps", () => {
  it("parses and pads multiline string maps", () => {
    const map = parseStringTileMap("##\n#S#");

    expect(map.width).toBe(3);
    expect(map.height).toBe(2);
    expect(map.rows).toEqual([
      ["#", "#", " "],
      ["#", "S", "#"],
    ]);
  });

  it("normalizes tiles", () => {
    const map = parseStringTileMap<"#" | " ">("#!", {
      emptyTile: " ",
      normalizeTile: (tile) => (tile === "#" ? "#" : " "),
    });

    expect(map.rows[0]).toEqual(["#", " "]);
  });

  it("finds cells and converts centered coordinates", () => {
    const map = parseStringTileMap("###\n#S#\n###");
    const spawn = findStringTileMapCell(map, "S");

    expect(spawn).toEqual({ column: 1, row: 1, tile: "S", x: 0, z: 0 });
    expect(findStringTileMapCells(map, "#")).toHaveLength(8);
    expect(getStringTileMapCenteredPoint(map, 2, 0)).toEqual({ x: 1, z: -1 });
    expect(getStringTileMapCellFromCenteredPoint(map, 0, 0)).toEqual(spawn);
    expect(getStringTileMapTile(map, 2, 2)).toBe("#");
  });
});
