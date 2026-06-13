export type SeededIsoMapTiles = {
  chest: string;
  door: string;
  empty: string;
  enemy: string;
  floor: string;
  player: string;
  wall: string;
};

export type GeneratedRoom = {
  height: number;
  id: number;
  width: number;
  x: number;
  y: number;
};

export type GeneratedMap = {
  enemies: EnemySpawn[];
  height: number;
  numericSeed: number;
  rooms: GeneratedRoom[];
  rows: string[];
  seed: string;
  text: string;
  width: number;
};

export type EnemySpawn = {
  aggroRange: number;
  id: string;
  patrolRadius: number;
  spawnX: number;
  spawnY: number;
  x: number;
  y: number;
};

export type GenerateMapOptions = {
  chestChance?: number;
  enemyChance?: number;
  enemyDefaults?: Partial<Pick<EnemySpawn, "aggroRange" | "patrolRadius">>;
  height: number;
  maxAttempts?: number;
  maxEnemies?: number;
  maxRooms?: number;
  maxRoomSize?: number;
  minRooms?: number;
  minRoomSize?: number;
  tiles?: Partial<SeededIsoMapTiles>;
  width: number;
};

type Point = {
  x: number;
  y: number;
};

type RoomEdge = {
  from: number;
  to: number;
};

const defaultSeededIsoMapTiles = {
  chest: "C",
  door: "+",
  empty: " ",
  enemy: "E",
  floor: ".",
  player: "P",
  wall: "#",
} satisfies SeededIsoMapTiles;

const hashSeedText = (seed: string): number => {
  let hash = 2166136261;
  const text = seed.trim().length > 0 ? seed.trim() : "arcade";

  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 3266489909);
  hash ^= hash >>> 16;

  return hash >>> 0;
};

const createSeededRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const getRandomInt = (random: () => number, min: number, max: number): number =>
  Math.floor(random() * (max - min + 1)) + min;

const getRoomCenter = (room: GeneratedRoom): Point => ({
  x: Math.floor(room.x + room.width / 2),
  y: Math.floor(room.y + room.height / 2),
});

const isPointInsideRoom = (point: Point, room: GeneratedRoom): boolean =>
  point.x >= room.x &&
  point.x < room.x + room.width &&
  point.y >= room.y &&
  point.y < room.y + room.height;

const doRoomsOverlap = (room: GeneratedRoom, otherRoom: GeneratedRoom): boolean =>
  room.x < otherRoom.x + otherRoom.width + 2 &&
  room.x + room.width + 2 > otherRoom.x &&
  room.y < otherRoom.y + otherRoom.height + 2 &&
  room.y + room.height + 2 > otherRoom.y;

const createRoomGraph = (rooms: GeneratedRoom[]): RoomEdge[] => {
  const sortedRooms = rooms
    .slice()
    .sort((left, right) => getRoomCenter(left).x - getRoomCenter(right).x);

  return sortedRooms.slice(1).map((room, index) => ({
    from: sortedRooms[index].id,
    to: room.id,
  }));
};

const carveRect = (
  grid: string[][],
  room: GeneratedRoom,
  floor: string
): void => {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      grid[y][x] = floor;
    }
  }
};

const carveLine = (
  grid: string[][],
  from: Point,
  to: Point,
  floor: string
): void => {
  const minX = Math.min(from.x, to.x);
  const maxX = Math.max(from.x, to.x);
  const minY = Math.min(from.y, to.y);
  const maxY = Math.max(from.y, to.y);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      grid[y][x] = floor;
    }
  }
};

const carveCorridor = (
  grid: string[][],
  from: Point,
  to: Point,
  floor: string,
  horizontalFirst: boolean
): void => {
  const corner = horizontalFirst ? { x: to.x, y: from.y } : { x: from.x, y: to.y };

  carveLine(grid, from, corner, floor);
  carveLine(grid, corner, to, floor);
};

const getRoomExitPoint = (
  room: GeneratedRoom,
  target: Point,
  direction: "horizontal" | "vertical"
): Point => {
  const center = getRoomCenter(room);

  if (direction === "horizontal") {
    return {
      x: target.x >= center.x ? room.x + room.width - 1 : room.x,
      y: center.y,
    };
  }

  return {
    x: center.x,
    y: target.y >= center.y ? room.y + room.height - 1 : room.y,
  };
};

const placeIfFloor = (
  grid: string[][],
  point: Point,
  floor: string,
  tile: string
): boolean => {
  if (grid[point.y]?.[point.x] !== floor) {
    return false;
  }

  grid[point.y][point.x] = tile;
  return true;
};

const addWallsAroundWalkableTiles = (
  grid: string[][],
  tiles: SeededIsoMapTiles
): void => {
  const wallCandidates: Point[] = [];
  const walkableTiles = new Set([tiles.chest, tiles.door, tiles.enemy, tiles.floor, tiles.player]);

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (!walkableTiles.has(grid[y][x])) {
        continue;
      }

      for (const neighbor of getNeighbors({ x, y })) {
        if (grid[neighbor.y]?.[neighbor.x] === tiles.empty) {
          wallCandidates.push(neighbor);
        }
      }
    }
  }

  wallCandidates.forEach((point) => {
    if (grid[point.y]?.[point.x] === tiles.empty) {
      grid[point.y][point.x] = tiles.wall;
    }
  });
};

const isDoorConnectedToPassage = (
  grid: string[][],
  point: Point,
  walkableTiles: Set<string>
): boolean => {
  const left = walkableTiles.has(grid[point.y]?.[point.x - 1] ?? "");
  const right = walkableTiles.has(grid[point.y]?.[point.x + 1] ?? "");
  const up = walkableTiles.has(grid[point.y - 1]?.[point.x] ?? "");
  const down = walkableTiles.has(grid[point.y + 1]?.[point.x] ?? "");

  return (left && right) || (up && down);
};

const findRoomFloor = (
  grid: string[][],
  room: GeneratedRoom,
  floor: string,
  random: () => number
): Point | undefined => {
  const points: Point[] = [];

  for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
    for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
      if (grid[y][x] === floor) {
        points.push({ x, y });
      }
    }
  }

  return points[getRandomInt(random, 0, Math.max(0, points.length - 1))];
};

const getNeighbors = (point: Point): Point[] => [
  { x: point.x + 1, y: point.y },
  { x: point.x - 1, y: point.y },
  { x: point.x, y: point.y + 1 },
  { x: point.x, y: point.y - 1 },
];

const getReachableKeys = (
  grid: string[][],
  start: Point,
  walkableTiles: Set<string>
): Set<string> => {
  const visited = new Set<string>();
  const queue = [start];

  while (queue.length > 0) {
    const point = queue.shift();

    if (!point) {
      continue;
    }

    const key = `${point.x}:${point.y}`;

    if (visited.has(key) || !walkableTiles.has(grid[point.y]?.[point.x] ?? "")) {
      continue;
    }

    visited.add(key);
    queue.push(...getNeighbors(point));
  }

  return visited;
};

const validateGeneratedMap = (
  grid: string[][],
  rooms: GeneratedRoom[],
  tiles: SeededIsoMapTiles
): boolean => {
  const walkableTiles = new Set([tiles.chest, tiles.door, tiles.enemy, tiles.floor, tiles.player]);
  let spawn: Point | undefined;
  const requiredPoints: Point[] = [];

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];

      if (tile === tiles.player) {
        spawn = { x, y };
      }

      if (tile === tiles.chest || tile === tiles.door || tile === tiles.enemy) {
        requiredPoints.push({ x, y });
      }
    }
  }

  if (!spawn) {
    return false;
  }

  const reachable = getReachableKeys(grid, spawn, walkableTiles);

  if (requiredPoints.some((point) => !reachable.has(`${point.x}:${point.y}`))) {
    return false;
  }

  if (
    requiredPoints.some(
      (point) =>
        grid[point.y][point.x] === tiles.door &&
        !isDoorConnectedToPassage(grid, point, walkableTiles)
    )
  ) {
    return false;
  }

  return rooms.every((room) => {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (walkableTiles.has(grid[y][x]) && reachable.has(`${x}:${y}`)) {
          return true;
        }
      }
    }

    return false;
  });
};

const getReachableRoomDistance = (startRoom: GeneratedRoom, room: GeneratedRoom): number => {
  const start = getRoomCenter(startRoom);
  const center = getRoomCenter(room);

  return Math.abs(center.x - start.x) + Math.abs(center.y - start.y);
};

const hasPatrolTarget = (
  grid: string[][],
  point: Point,
  patrolRadius: number,
  floor: string
): boolean => {
  for (let y = point.y - patrolRadius; y <= point.y + patrolRadius; y++) {
    for (let x = point.x - patrolRadius; x <= point.x + patrolRadius; x++) {
      if (x === point.x && y === point.y) {
        continue;
      }

      if (Math.abs(x - point.x) + Math.abs(y - point.y) <= patrolRadius && grid[y]?.[x] === floor) {
        return true;
      }
    }
  }

  return false;
};

const placeEnemies = (
  grid: string[][],
  rooms: GeneratedRoom[],
  random: () => number,
  options: Required<Omit<GenerateMapOptions, "tiles" | "enemyDefaults">> & {
    enemyDefaults: Required<Pick<EnemySpawn, "aggroRange" | "patrolRadius">>;
    tiles: SeededIsoMapTiles;
  }
): EnemySpawn[] => {
  const startRoom = rooms[0];
  const candidateRooms = rooms
    .slice(1)
    .filter((room) => random() <= options.enemyChance)
    .sort(
      (left, right) =>
        getReachableRoomDistance(startRoom, right) -
        getReachableRoomDistance(startRoom, left)
    );
  const enemies: EnemySpawn[] = [];

  for (const room of candidateRooms) {
    if (enemies.length >= options.maxEnemies) {
      break;
    }

    const candidates: Point[] = [];

    for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
      for (let x = room.x + 1; x < room.x + room.width - 1; x++) {
        const point = { x, y };

        if (
          grid[y][x] === options.tiles.floor &&
          !isPointInsideRoom(point, startRoom) &&
          hasPatrolTarget(grid, point, options.enemyDefaults.patrolRadius, options.tiles.floor)
        ) {
          candidates.push(point);
        }
      }
    }

    if (candidates.length === 0) {
      continue;
    }

    const point = candidates[getRandomInt(random, 0, candidates.length - 1)];

    grid[point.y][point.x] = options.tiles.enemy;
    enemies.push({
      aggroRange: options.enemyDefaults.aggroRange,
      id: `enemy-${enemies.length + 1}`,
      patrolRadius: options.enemyDefaults.patrolRadius,
      spawnX: point.x,
      spawnY: point.y,
      x: point.x,
      y: point.y,
    });
  }

  return enemies;
};

const generateSeededIsoMapAttempt = (
  seed: string,
  options: Required<Omit<GenerateMapOptions, "tiles" | "enemyDefaults">> & {
    enemyDefaults: Required<Pick<EnemySpawn, "aggroRange" | "patrolRadius">>;
    tiles: SeededIsoMapTiles;
  }
): GeneratedMap | undefined => {
  const numericSeed = hashSeedText(seed);
  const random = createSeededRandom(numericSeed);
  const roomTarget = getRandomInt(random, options.minRooms, options.maxRooms);
  const rooms: GeneratedRoom[] = [];
  const grid = Array.from({ length: options.height }, () =>
    Array.from({ length: options.width }, () => options.tiles.empty)
  );

  for (let attempt = 0; attempt < roomTarget * 40 && rooms.length < roomTarget; attempt++) {
    const roomWidth = getRandomInt(random, options.minRoomSize, options.maxRoomSize);
    const roomHeight = getRandomInt(random, options.minRoomSize, options.maxRoomSize);
    const room = {
      height: roomHeight,
      id: rooms.length,
      width: roomWidth,
      x: getRandomInt(random, 2, options.width - roomWidth - 3),
      y: getRandomInt(random, 2, options.height - roomHeight - 3),
    };

    if (rooms.some((otherRoom) => doRoomsOverlap(room, otherRoom))) {
      continue;
    }

    rooms.push(room);
  }

  if (rooms.length < options.minRooms) {
    return undefined;
  }

  rooms.forEach((room) => {
    carveRect(grid, room, options.tiles.floor);
  });

  const roomById = new Map(rooms.map((room) => [room.id, room]));

  createRoomGraph(rooms).forEach((edge) => {
    const fromRoom = roomById.get(edge.from);
    const toRoom = roomById.get(edge.to);

    if (!fromRoom || !toRoom) {
      return;
    }

    const fromCenter = getRoomCenter(fromRoom);
    const toCenter = getRoomCenter(toRoom);
    const horizontalFirst = random() > 0.5;
    const fromDoor = getRoomExitPoint(fromRoom, toCenter, horizontalFirst ? "horizontal" : "vertical");
    const toDoor = getRoomExitPoint(toRoom, fromCenter, horizontalFirst ? "vertical" : "horizontal");

    carveCorridor(
      grid,
      fromCenter,
      toCenter,
      options.tiles.floor,
      horizontalFirst
    );

    grid[fromDoor.y][fromDoor.x] = options.tiles.door;
    grid[toDoor.y][toDoor.x] = options.tiles.door;
  });

  addWallsAroundWalkableTiles(grid, options.tiles);

  const spawn = getRoomCenter(rooms[0]);

  grid[spawn.y][spawn.x] = options.tiles.player;

  rooms.slice(1).forEach((room) => {
    if (random() > options.chestChance) {
      return;
    }

    const chestPoint = findRoomFloor(grid, room, options.tiles.floor, random);

    if (chestPoint) {
      placeIfFloor(grid, chestPoint, options.tiles.floor, options.tiles.chest);
    }
  });

  if (!validateGeneratedMap(grid, rooms, options.tiles)) {
    return undefined;
  }

  const enemies = placeEnemies(grid, rooms, random, options);

  if (!validateGeneratedMap(grid, rooms, options.tiles)) {
    return undefined;
  }

  const rows = grid.map((row) => row.join(""));

  return {
    enemies,
    height: options.height,
    numericSeed,
    rooms,
    rows,
    seed,
    text: rows.join("\n"),
    width: options.width,
  };
};

export const generateSeededIsoMap = (
  seed: string | number,
  options: GenerateMapOptions
): GeneratedMap => {
  const resolved = {
    chestChance: options.chestChance ?? 0.7,
    enemyChance: options.enemyChance ?? 0,
    enemyDefaults: {
      aggroRange: options.enemyDefaults?.aggroRange ?? 3,
      patrolRadius: options.enemyDefaults?.patrolRadius ?? 2,
    },
    height: options.height,
    maxAttempts: options.maxAttempts ?? 24,
    maxEnemies: options.maxEnemies ?? 6,
    maxRooms: options.maxRooms ?? 8,
    maxRoomSize: options.maxRoomSize ?? 8,
    minRooms: options.minRooms ?? 5,
    minRoomSize: options.minRoomSize ?? 4,
    tiles: { ...defaultSeededIsoMapTiles, ...options.tiles },
    width: options.width,
  };

  if (resolved.width < resolved.maxRoomSize * 2 || resolved.height < resolved.maxRoomSize * 2) {
    throw new Error("Seeded iso maps need enough width and height to place multiple rooms.");
  }

  if (resolved.minRooms > resolved.maxRooms) {
    throw new Error("minRooms must be less than or equal to maxRooms.");
  }

  const seedText = String(seed);

  for (let attempt = 0; attempt < resolved.maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? seedText : `${seedText}:attempt:${attempt}`;
    const generated = generateSeededIsoMapAttempt(attemptSeed, resolved);

    if (generated) {
      return generated;
    }
  }

  throw new Error(`Unable to generate a valid connected iso map for seed "${seedText}".`);
};
