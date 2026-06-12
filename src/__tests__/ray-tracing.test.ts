import { describe, expect, it } from "vitest";
import {
  createRayTracingRectangle,
  getRayTracingSegments,
  traceLightBounces,
  traceRay,
  traceVisibilityPolygon,
} from "../ray-tracing.js";

describe("ray tracing helpers", () => {
  it("creates clockwise rectangle polygons", () => {
    expect(createRayTracingRectangle(10, 20, 30, 40)).toEqual([
      { x: 10, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 60 },
      { x: 10, y: 60 },
    ]);
  });

  it("finds the nearest segment hit for a ray", () => {
    const hit = traceRay(
      { x: 10, y: 10 },
      0,
      getRayTracingSegments(
        { height: 100, width: 100 },
        [{ polygon: createRayTracingRectangle(40, 0, 10, 100), surfaceColor: "#884422" }]
      )
    );

    expect(hit?.x).toBeCloseTo(40);
    expect(hit?.y).toBeCloseTo(10);
    expect(hit?.distance).toBeCloseTo(30);
    expect(hit?.segment.from.x).toBe(40);
    expect(hit?.segment.surfaceColor).toBe("#884422");
  });

  it("returns sorted visibility hits clipped by bounds and occluders", () => {
    const hits = traceVisibilityPolygon(
      { x: 20, y: 50 },
      { height: 100, width: 100 },
      [createRayTracingRectangle(45, 35, 20, 30)]
    );
    const rightMostHit = hits.reduce((rightMost, hit) =>
      hit.x > rightMost.x ? hit : rightMost
    );

    expect(hits.length).toBeGreaterThan(4);
    expect(hits).toEqual([...hits].sort((a, b) => a.angle - b.angle));
    expect(rightMostHit.x).toBeLessThanOrEqual(100);
    expect(hits.some((hit) => hit.x >= 45 && hit.x <= 65 && hit.y >= 35 && hit.y <= 65)).toBe(
      true
    );
  });

  it("traces direct light and caps bounce layers at three", () => {
    const layers = traceLightBounces(
      { x: 20, y: 50 },
      { height: 100, width: 100 },
      [{ polygon: createRayTracingRectangle(45, 35, 20, 30), surfaceColor: "#804020" }],
      { bounces: 9, lightColor: "#ffffff", maxOriginsPerBounce: 2, surfaceColorMix: 0.5 }
    );

    expect(layers[0]?.level).toBe(0);
    expect(layers[0]?.color).toBe("#ffffff");
    expect(layers[0]?.intensity).toBe(1);
    expect(Math.max(...layers.map((layer) => layer.level))).toBe(3);
    expect(layers.some((layer) => layer.level === 1 && layer.intensity < 1)).toBe(true);
    expect(layers.some((layer) => layer.level === 1 && layer.color !== "#ffffff")).toBe(true);
  });
});
