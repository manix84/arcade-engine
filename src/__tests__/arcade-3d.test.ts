import { describe, expect, it } from "vitest";
import {
  getLoopedDepth,
  getPerspectiveScale,
  projectPerspectivePoint,
  wrapDepth,
} from "../index.js";

describe("arcade 3D helpers", () => {
  it("wraps positive and negative depths into a playable range", () => {
    expect(wrapDepth(25, 10)).toBe(5);
    expect(wrapDepth(-2, 10)).toBe(8);
    expect(wrapDepth(10, 10)).toBe(0);
  });

  it("rejects invalid depth ranges", () => {
    expect(() => wrapDepth(1, 0)).toThrow("Depth range must be greater than 0.");
  });

  it("creates repeatable depth positions for looping arcade scenery", () => {
    expect(
      getLoopedDepth({
        depth: 20,
        elapsedSeconds: 2,
        index: 3,
        offset: 1,
        spacing: 4,
        speed: 5,
      })
    ).toBe(3);
  });

  it("calculates perspective scale from depth", () => {
    expect(getPerspectiveScale(0, { focalLength: 100, minDepth: 1 })).toBeCloseTo(
      100 / 128
    );
    expect(getPerspectiveScale(10, { depthScale: 10, focalLength: 100 })).toBe(
      0.5
    );
  });

  it("projects 3D points into viewport coordinates", () => {
    const projected = projectPerspectivePoint(
      { x: 100, y: 50, z: 10 },
      { height: 300, width: 400 },
      {
        cameraY: 10,
        depthScale: 10,
        focalLength: 100,
        horizon: 120,
      }
    );

    expect(projected).toEqual({
      depth: 10,
      scale: 0.5,
      x: 250,
      y: 140,
    });
  });
});
