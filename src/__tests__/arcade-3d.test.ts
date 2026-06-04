import { describe, expect, it, vi } from "vitest";
import {
  colorWithAlpha,
  fillCanvasWithTrail,
  getDepthProgress,
  getFirstPersonCamera,
  getIsometricTileCorners,
  getIsometricWallSide,
  getLoopedScrollerPosition,
  getLoopedDepth,
  getPerspectiveScale,
  getSideScrollerActorPosition,
  getSideScrollerJumpY,
  getSpatialAudioDepth,
  getSpatialAudioPan,
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

  it("creates repeatable side-scroller positions", () => {
    expect(
      getLoopedScrollerPosition({
        elapsedSeconds: 2,
        index: 3,
        offset: -70,
        range: 900,
        spacing: 116,
        speed: 150,
      })
    ).toBe(-22);
    expect(() =>
      getLoopedScrollerPosition({
        elapsedSeconds: 0,
        index: 0,
        range: 0,
        spacing: 1,
        speed: 1,
      })
    ).toThrow("Loop range must be greater than 0.");
  });

  it("calculates first-person camera framing from viewport and look input", () => {
    expect(
      getFirstPersonCamera(
        { height: 300, width: 400 },
        {
          bobAmount: 6,
          bobSpeed: 1.5,
          centerDrift: 78,
          elapsedSeconds: Math.PI / 3,
          horizonDrift: 34,
          horizonRatio: 0.47,
          look: { x: 0.5, y: -0.25 },
          speed: 1,
        }
      )
    ).toEqual({
      centerX: 239,
      horizon: 138.5,
    });
  });

  it("calculates side-scroller jump arcs", () => {
    expect(
      getSideScrollerJumpY({
        elapsedSeconds: Math.PI / 10,
        groundY: 220,
        height: 54,
        speed: 5,
      })
    ).toBe(166);
    expect(
      getSideScrollerJumpY({
        elapsedSeconds: Math.PI / 5,
        groundY: 220,
        height: 54,
        speed: 5,
      })
    ).toBe(220);
  });

  it("calculates side-scroller actor positions and visibility", () => {
    expect(
      getSideScrollerActorPosition({
        elapsedSeconds: 2,
        index: 3,
        offset: -70,
        range: 900,
        spacing: 116,
        speed: 150,
        viewportWidth: 640,
        width: 80,
      })
    ).toEqual({
      isVisible: true,
      progress: 0.08055555555555556,
      x: -22,
    });
    expect(
      getSideScrollerActorPosition({
        elapsedSeconds: 0,
        index: 0,
        offset: -180,
        range: 900,
        spacing: 1,
        speed: 1,
        viewportWidth: 640,
        width: 80,
      })
    ).toMatchObject({
      isVisible: false,
      x: -180,
    });
    expect(() =>
      getSideScrollerActorPosition({
        elapsedSeconds: 0,
        index: 0,
        range: 900,
        spacing: 1,
        speed: 1,
        viewportWidth: 0,
      })
    ).toThrow("Viewport width must be greater than 0.");
    expect(() =>
      getSideScrollerActorPosition({
        elapsedSeconds: 0,
        index: 0,
        range: 900,
        spacing: 1,
        speed: 1,
        viewportWidth: 640,
        width: -640,
      })
    ).toThrow("Actor width must be greater than or equal to 0.");
  });

  it("calculates spatial audio pan and visual depth", () => {
    expect(getSpatialAudioPan({ listenerRange: 300, sourceX: 150 })).toBe(0.5);
    expect(getSpatialAudioPan({ listenerRange: 300, sourceX: 999 })).toBe(1);
    expect(getSpatialAudioPan({ listenerRange: 300, sourceX: -999 })).toBe(-1);
    expect(() =>
      getSpatialAudioPan({ listenerRange: 0, sourceX: 10 })
    ).toThrow("Listener range must be greater than 0.");
    expect(
      getSpatialAudioDepth({ baseDepth: 7, distanceScale: 12, sourceY: -144 })
    ).toBe(19);
    expect(() =>
      getSpatialAudioDepth({ distanceScale: 0, sourceY: 10 })
    ).toThrow("Distance scale must be greater than 0.");
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

  it("fills canvas trails with any valid canvas color string", () => {
    let alphaDuringFill = 0;
    const context = {
      fillRect: vi.fn(),
      fillStyle: "",
      globalAlpha: 0.8,
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      height: 60,
      width: 80,
    } as HTMLCanvasElement;

    vi.mocked(context.fillRect).mockImplementation(() => {
      alphaDuringFill = context.globalAlpha;
    });

    fillCanvasWithTrail(context, canvas, "hsl(180 70% 50%)", 0.25);

    expect(context.fillStyle).toBe("hsl(180 70% 50%)");
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 80, 60);
    expect(alphaDuringFill).toBe(0.75);
    expect(context.globalAlpha).toBe(0.8);
  });
});
