import { describe, expect, it } from "vitest";
import {
  centerCubeCluster,
  cloneCubeBlock,
  createCubeClusterFromPattern,
  createExplosionBlocks,
  createPlasmaLinks,
  getCubeClusterBounds,
  getCubeClusterCenter,
  getVectorDistance,
  getVisibleExplosionBlocks,
  normalizeVector,
  stepExplosionBlocks,
} from "../index.js";

describe("cube cluster helpers", () => {
  it("builds a 3D cube cluster from layered character patterns", () => {
    const cluster = createCubeClusterFromPattern(
      [
        ["# #", "###"],
        [".#.", " # "],
      ],
      {
        color: "#4fd1c5",
        gap: 0.25,
        layerGap: 0.5,
        origin: { x: 1, y: 2, z: 3 },
        size: 1,
      }
    );

    expect(cluster.blocks).toHaveLength(7);
    expect(cluster.blocks[0]).toEqual({
      color: "#4fd1c5",
      id: "0:0:0",
      size: 1,
      x: 1,
      y: 2,
      z: 3,
    });
    expect(cluster.blocks[4]).toMatchObject({
      id: "0:1:2",
      x: 3.5,
      y: 0.75,
      z: 3,
    });
    expect(cluster.blocks[5]).toMatchObject({
      id: "1:0:1",
      x: 2.25,
      y: 2,
      z: 4.5,
    });
    expect(cluster.links.length).toBeGreaterThan(0);
  });

  it("calculates plasma links, bounds, centers, and centered block positions", () => {
    const cluster = createCubeClusterFromPattern([["##"]], {
      gap: 0.2,
      size: 1,
    });
    const links = createPlasmaLinks(cluster.blocks, 1.25);
    const bounds = getCubeClusterBounds(cluster.blocks);

    expect(links).toEqual([
      {
        from: "0:0:0",
        strength: expect.closeTo(0.04),
        to: "0:0:1",
      },
    ]);
    expect(bounds).toEqual({
      max: { x: 2.2, y: 1, z: 1 },
      min: { x: 0, y: 0, z: 0 },
    });
    expect(getCubeClusterCenter(cluster.blocks)).toEqual({
      x: 1.1,
      y: 0.5,
      z: 0.5,
    });
    const centered = centerCubeCluster(cluster.blocks);

    expect(centered[0]).toMatchObject({
      id: "0:0:0",
      size: 1,
      x: -1.1,
      y: -0.5,
      z: -0.5,
    });
    expect(centered[1]?.id).toBe("0:0:1");
    expect(centered[1]?.x).toBeCloseTo(0.1);
    expect(centered[1]?.y).toBe(-0.5);
    expect(centered[1]?.z).toBe(-0.5);
  });

  it("handles empty clusters and vector utilities", () => {
    expect(getCubeClusterBounds([])).toEqual({
      max: { x: 0, y: 0, z: 0 },
      min: { x: 0, y: 0, z: 0 },
    });
    expect(getCubeClusterCenter([])).toEqual({ x: 0, y: 0, z: 0 });
    expect(normalizeVector({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
    expect(normalizeVector({ x: 3, y: 4, z: 0 })).toEqual({
      x: 0.6,
      y: 0.8,
      z: 0,
    });
    expect(
      getVectorDistance({ x: 0, y: 0, z: 0 }, { x: 2, y: 3, z: 6 })
    ).toBe(7);
    expect(cloneCubeBlock({ id: "a", x: 1, y: 2, z: 3 })).toEqual({
      id: "a",
      x: 1,
      y: 2,
      z: 3,
    });
  });

  it("creates deterministic cube explosion motion and fades invisible blocks", () => {
    const cluster = createCubeClusterFromPattern([["##"]], {
      gap: 0,
      size: 1,
    });
    const randomValues = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    const explosion = createExplosionBlocks(cluster.blocks, {
      force: 2,
      random: () => randomValues.shift() ?? 0.5,
      spin: 0,
    });

    expect(explosion).toEqual([
      {
        id: "0:0:0",
        opacity: 1,
        size: 1,
        velocity: { x: -2, y: 0, z: 0 },
        x: 0,
        y: 0,
        z: 0,
      },
      {
        id: "0:0:1",
        opacity: 1,
        size: 1,
        velocity: { x: 2, y: 0, z: 0 },
        x: 1,
        y: 0,
        z: 0,
      },
    ]);

    const stepped = stepExplosionBlocks(explosion, 0.5, {
      drag: 0.5,
      fadeSpeed: 3,
      gravity: -2,
    });

    expect(stepped).toEqual([
      {
        id: "0:0:0",
        opacity: 0,
        size: 1,
        velocity: { x: -1, y: -0.5, z: 0 },
        x: -1,
        y: 0,
        z: 0,
      },
      {
        id: "0:0:1",
        opacity: 0,
        size: 1,
        velocity: { x: 1, y: -0.5, z: 0 },
        x: 2,
        y: 0,
        z: 0,
      },
    ]);
    expect(getVisibleExplosionBlocks(stepped)).toEqual([]);
  });
});
