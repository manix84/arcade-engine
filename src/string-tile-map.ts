export type StringTileMapCell<TTile extends string = string> = {
  column: number;
  row: number;
  tile: TTile;
  x: number;
  z: number;
};

export type StringTileMap<TTile extends string = string> = {
  height: number;
  rows: TTile[][];
  text: string;
  width: number;
};

export type ParseStringTileMapOptions<TTile extends string = string> = {
  emptyTile?: TTile;
  normalizeTile?: (tile: string) => TTile;
};

export const parseStringTileMap = <TTile extends string = string>(
  text: string,
  options: ParseStringTileMapOptions<TTile> = {}
): StringTileMap<TTile> => {
  const emptyTile = options.emptyTile ?? (" " as TTile);
  const normalizeTile = options.normalizeTile ?? ((tile: string) => tile as TTile);
  const sourceRows = text
    .replace(/\t/g, "  ")
    .split("\n")
    .map((row) => row.replace(/\s+$/u, ""))
    .filter((row) => row.length > 0);
  const rows = sourceRows.length > 0 ? sourceRows : [""];
  const width = Math.max(...rows.map((row) => row.length), 1);
  const parsedRows = rows.map((row) =>
    Array.from({ length: width }, (_, column) => {
      const tile = row[column];

      return tile === undefined ? emptyTile : normalizeTile(tile);
    })
  );

  return {
    height: parsedRows.length,
    rows: parsedRows,
    text,
    width,
  };
};

export const getStringTileMapTile = <TTile extends string>(
  map: StringTileMap<TTile>,
  column: number,
  row: number
): TTile | undefined => map.rows[row]?.[column];

export const getStringTileMapCenteredPoint = (
  map: StringTileMap,
  column: number,
  row: number
): { x: number; z: number } => ({
  x: column - Math.floor(map.width / 2),
  z: row - Math.floor(map.height / 2),
});

export const getStringTileMapCellFromCenteredPoint = <TTile extends string>(
  map: StringTileMap<TTile>,
  x: number,
  z: number
): StringTileMapCell<TTile> | undefined => {
  const column = Math.floor(x + Math.floor(map.width / 2));
  const row = Math.floor(z + Math.floor(map.height / 2));
  const tile = getStringTileMapTile(map, column, row);

  if (tile === undefined) {
    return undefined;
  }

  return {
    column,
    row,
    tile,
    ...getStringTileMapCenteredPoint(map, column, row),
  };
};

export const findStringTileMapCells = <TTile extends string>(
  map: StringTileMap<TTile>,
  tile: TTile
): Array<StringTileMapCell<TTile>> =>
  map.rows.flatMap((rowTiles, row) =>
    rowTiles.flatMap((cellTile, column) => {
      if (cellTile !== tile) {
        return [];
      }

      return [
        {
          column,
          row,
          tile: cellTile,
          ...getStringTileMapCenteredPoint(map, column, row),
        },
      ];
    })
  );

export const findStringTileMapCell = <TTile extends string>(
  map: StringTileMap<TTile>,
  tile: TTile
): StringTileMapCell<TTile> | undefined => findStringTileMapCells(map, tile)[0];
