import { describe, expect, it } from "vitest";
import {
  colorWithAlpha,
  getDepthProgress,
  getIsometricTileCorners,
  getIsometricWallSide,
  getLoopedDepth,
  getPerspectiveScale,
  parseHexColor,
  projectIsometricPoint,
  projectPerspectivePoint,
  shadeHexColor,
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

  it("calculates normalized depth progress", () => {
    expect(getDepthProgress(0, 20)).toBe(1);
    expect(getDepthProgress(10, 20)).toBe(0.5);
    expect(getDepthProgress(30, 20)).toBe(0);
    expect(() => getDepthProgress(1, 0)).toThrow(
      "Depth range must be greater than 0."
    );
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

  it("projects isometric points and creates tile geometry", () => {
    const center = projectIsometricPoint(
      { x: 2, y: 1, z: 1 },
      {
        origin: { x: 100, y: 50 },
        tileHeight: 20,
        tileWidth: 40,
        verticalScale: 12,
      }
    );

    expect(center).toEqual({ x: 120, y: 68 });
    expect(getIsometricTileCorners(center, { tileHeight: 20, tileWidth: 40 })).toEqual(
      [
        { x: 120, y: 68 },
        { x: 140, y: 78 },
        { x: 120, y: 88 },
        { x: 100, y: 78 },
      ]
    );
  });

  it("creates an extruded isometric wall side", () => {
    expect(
      getIsometricWallSide(
        [
          { x: 10, y: 10 },
          { x: 20, y: 15 },
          { x: 10, y: 20 },
          { x: 0, y: 15 },
        ],
        8
      )
    ).toEqual([
      { x: 0, y: 15 },
      { x: 10, y: 20 },
      { x: 10, y: 28 },
      { x: 0, y: 23 },
    ]);
    expect(() => getIsometricWallSide([], 8)).toThrow(
      "Isometric wall sides require four tile corners."
    );
  });

  it("formats arcade canvas colors", () => {
    expect(parseHexColor("#4fd1c5")).toEqual([79, 209, 197]);
    expect(parseHexColor("#abc")).toEqual([170, 187, 204]);
    expect(colorWithAlpha("#000", 0.25)).toBe("rgba(0, 0, 0, 0.25)");
    expect(shadeHexColor("#808080", 0.5, 0.75)).toBe(
      "rgba(64, 64, 64, 0.75)"
    );
    expect(() => parseHexColor("nope")).toThrow(
      "Expected a 3 or 6 digit hex color."
    );
  });
});
