import { describe, expect, it } from "vitest";

import { parseStringTileMap } from "../string-tile-map.js";
import { generateSeededIsoMap } from "../seeded-iso-map.js";

const getReachableTiles = (
  rows: string[],
  start: { x: number; y: number },
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
    const tile = rows[point.y]?.[point.x];

    if (visited.has(key) || !walkableTiles.has(tile ?? "")) {
      continue;
    }

    visited.add(key);
    queue.push(
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 }
    );
  }

  return visited;
};

describe("seeded iso map generation", () => {
  it("generates the same map for the same seed", () => {
    const options = { height: 24, width: 32 };
    const first = generateSeededIsoMap("abc123", options);
    const second = generateSeededIsoMap("abc123", options);

    expect(second).toEqual(first);
    expect(generateSeededIsoMap("forest-1", options).text).not.toBe(first.text);
  });

  it("generates connected playable maps", () => {
    const map = generateSeededIsoMap("connected", {
      chestChance: 1,
      height: 26,
      maxRooms: 8,
      minRooms: 6,
      width: 36,
    });
    const spawn = map.rows.flatMap((row, y) => {
      const x = row.indexOf("P");

      return x === -1 ? [] : [{ x, y }];
    })[0];

    expect(spawn).toBeDefined();

    const reachable = getReachableTiles(map.rows, spawn, new Set([".", "+", "C", "E", "P"]));

    expect(map.rooms.length).toBeGreaterThanOrEqual(6);
    expect(map.rows.some((row) => row.includes("+"))).toBe(true);
    expect(map.rows.some((row) => row.includes("C"))).toBe(true);

    map.rows.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        if (tile === "+" || tile === "C") {
          expect(reachable.has(`${x}:${y}`)).toBe(true);
        }
      });
    });

    for (const room of map.rooms) {
      let reachableRoomTile = false;

      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          reachableRoomTile ||= reachable.has(`${x}:${y}`);
        }
      }

      expect(reachableRoomTile).toBe(true);
    }
  });

  it("supports dungeon story tile characters and the existing string map parser", () => {
    const map = generateSeededIsoMap("abc+lvl1", {
      height: 27,
      tiles: {
        chest: "C",
        door: "D",
        empty: "_",
        enemy: "E",
        floor: " ",
        player: "S",
        wall: "#",
      },
      width: 35,
    });
    const parsed = parseStringTileMap(map.text);

    expect(parsed.width).toBe(35);
    expect(parsed.height).toBe(27);
    expect(map.text).toContain("S");
    expect(map.text).toContain("D");
    expect(map.text).toContain("C");
    expect(map.text).toContain("_");

    map.rows.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        if (tile !== "D") {
          return;
        }

        const walkableDungeonTiles = [" ", "S", "C", "E"];
        const horizontalPassage = walkableDungeonTiles.includes(row[x - 1] ?? "") && walkableDungeonTiles.includes(row[x + 1] ?? "");
        const verticalPassage =
          walkableDungeonTiles.includes(map.rows[y - 1]?.[x] ?? "") &&
          walkableDungeonTiles.includes(map.rows[y + 1]?.[x] ?? "");

        expect(horizontalPassage || verticalPassage).toBe(true);
      });
    });
  });

  it("places deterministic reachable enemy spawns away from the starting room", () => {
    const options = {
      chestChance: 1,
      enemyChance: 1,
      height: 28,
      maxEnemies: 4,
      minRooms: 7,
      width: 38,
    };
    const map = generateSeededIsoMap("enemy-seed", options);
    const repeated = generateSeededIsoMap("enemy-seed", options);
    const spawn = map.rows.flatMap((row, y) => {
      const x = row.indexOf("P");

      return x === -1 ? [] : [{ x, y }];
    })[0];
    const reachable = getReachableTiles(map.rows, spawn, new Set([".", "+", "C", "E", "P"]));
    const startRoom = map.rooms[0];

    expect(map.enemies).toEqual(repeated.enemies);
    expect(map.enemies.length).toBeGreaterThan(0);
    expect(map.enemies.length).toBeLessThanOrEqual(4);

    map.enemies.forEach((enemy) => {
      expect(enemy).toMatchObject({
        aggroRange: 3,
        patrolRadius: 2,
        spawnX: enemy.x,
        spawnY: enemy.y,
      });
      expect(reachable.has(`${enemy.x}:${enemy.y}`)).toBe(true);
      expect(map.rows[enemy.y][enemy.x]).toBe("E");
      expect(
        enemy.x >= startRoom.x &&
          enemy.x < startRoom.x + startRoom.width &&
          enemy.y >= startRoom.y &&
          enemy.y < startRoom.y + startRoom.height
      ).toBe(false);

      let hasPatrolTarget = false;

      for (let y = enemy.y - enemy.patrolRadius; y <= enemy.y + enemy.patrolRadius; y++) {
        for (let x = enemy.x - enemy.patrolRadius; x <= enemy.x + enemy.patrolRadius; x++) {
          if (Math.abs(x - enemy.x) + Math.abs(y - enemy.y) <= enemy.patrolRadius && map.rows[y]?.[x] === ".") {
            hasPatrolTarget = true;
          }
        }
      }

      expect(hasPatrolTarget).toBe(true);
    });
  });
});
