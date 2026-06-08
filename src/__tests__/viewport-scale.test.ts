import { describe, expect, it } from "vitest";
import {
  clampZoomPercent,
  defaultZoomMaxPercent,
  defaultZoomMinPercent,
  defaultZoomPercent,
  defaultZoomStepPercent,
  formatZoomPercent,
  getManualViewportScale,
  getSteppedZoomPercent,
  getViewportScale,
  getZoomScale,
} from "../index.js";

describe("viewport scale helpers", () => {
  it("clamps, steps, formats, and converts manual zoom percentages", () => {
    expect(defaultZoomMinPercent).toBe(25);
    expect(defaultZoomMaxPercent).toBe(250);
    expect(defaultZoomPercent).toBe(100);
    expect(defaultZoomStepPercent).toBe(5);
    expect(clampZoomPercent(10)).toBe(25);
    expect(clampZoomPercent(275)).toBe(250);
    expect(getZoomScale(125)).toBe(1.25);
    expect(getSteppedZoomPercent(107)).toBe(105);
    expect(formatZoomPercent(104.6)).toBe("105%");
  });

  it("calculates clamped viewport scale from a reference size", () => {
    expect(
      getViewportScale(1600, 1200, {
        maxScale: 1.35,
        minScale: 0.72,
      })
    ).toBe(1.35);
    expect(
      getViewportScale(240, 320, {
        maxScale: 1.35,
        minScale: 0.72,
      })
    ).toBe(0.72);
    expect(
      getViewportScale(400, 300, {
        referenceHeight: 600,
        referenceWidth: 800,
      })
    ).toBe(0.5);
  });

  it("combines viewport scale with manual scale", () => {
    expect(
      getManualViewportScale(800, 600, {
        manualScale: 1.5,
        maxScale: 2,
        minScale: 0.5,
      })
    ).toBe(1.5);
  });
});
