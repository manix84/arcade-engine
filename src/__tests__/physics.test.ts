import { describe, expect, it } from "vitest";
import {
  applyGravity2D,
  applyGravity3D,
  createRagdoll2D,
  createRagdoll3D,
  stepRagdoll2D,
  stepRagdoll3D,
} from "../index.js";

describe("physics helpers", () => {
  it("applies 2D gravity, floor clamping, and bounce", () => {
    expect(
      applyGravity2D(
        { posX: 10, posY: 20, velocityX: 4, velocityY: 2 },
        { delta: 0.5, gravity: 10 }
      )
    ).toEqual({
      posX: 12,
      posY: 23.5,
      velocityX: 4,
      velocityY: 7,
    });
    expect(
      applyGravity2D(
        { posX: 0, posY: 95, velocityY: 20 },
        { bounce: 0.5, delta: 1, floorY: 100, gravity: 10 }
      )
    ).toMatchObject({
      posY: 100,
      velocityY: -15,
    });
  });

  it("applies 3D gravity while preserving depth velocity", () => {
    expect(
      applyGravity3D(
        { posX: 0, posY: 0, posZ: 10, velocityZ: -2 },
        { delta: 2, gravity: 5, maxFallSpeed: 8 }
      )
    ).toMatchObject({
      posY: 16,
      posZ: 6,
      velocityY: 8,
    });
  });

  it("creates and steps 2D ragdolls", () => {
    const ragdoll = createRagdoll2D({ posX: 100, posY: 100 }, { pinnedHead: true });
    const stepped = stepRagdoll2D(ragdoll, {
      delta: 1 / 60,
      floorY: 180,
      gravity: 1200,
      iterations: 6,
    });
    const head = stepped.points.find((point) => point.id === "head");
    const foot = stepped.points.find((point) => point.id === "leftFoot");

    expect(ragdoll.points).toHaveLength(7);
    expect(ragdoll.constraints.length).toBeGreaterThan(0);
    expect(head).toMatchObject({ pinned: true, posX: 100, posY: 58 });
    expect(foot?.posY).toBeGreaterThan(140);
    expect(foot?.posY).toBeLessThanOrEqual(180);
  });

  it("creates and steps 3D ragdolls", () => {
    const ragdoll = createRagdoll3D({ posX: 0, posY: 0, posZ: 20 }, { scale: 1.2 });
    const stepped = stepRagdoll3D(ragdoll, {
      delta: 1 / 30,
      floorY: 80,
      gravity: 900,
      iterations: 6,
    });
    const chest = stepped.points.find((point) => point.id === "chest");

    expect(ragdoll.points.every((point) => typeof point.posZ === "number")).toBe(true);
    expect(chest?.posY).toBeGreaterThan(-22);
    expect(chest?.posZ).not.toBe(20);
  });
});
