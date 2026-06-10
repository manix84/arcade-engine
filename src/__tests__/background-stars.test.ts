import { describe, expect, it, vi } from "vitest";
import { createProceduralStarfield, ProceduralStarfield } from "../index.js";

const createRepeatingRandom = (values: number[]): (() => number) => {
  let index = 0;

  return () => {
    const value = values[index % values.length] ?? 0.5;
    index += 1;
    return value;
  };
};

describe("procedural background stars", () => {
  it("creates deterministic generated stars", () => {
    const starfield = createProceduralStarfield({
      depth: 40,
      random: createRepeatingRandom([0.25, 0.5, 0.75, 0.2, 0.4, 0.6]),
      spreadX: 400,
      spreadY: 200,
      starCount: 3,
    });

    expect(starfield).toBeInstanceOf(ProceduralStarfield);
    expect(starfield.getStars()).toHaveLength(3);
    expect(starfield.getStars()[0]).toMatchObject({
      colorIndex: 2,
      x: 40,
      y: -50,
      z: 10.75,
    });
  });

  it("moves laterally opposite the configured player velocity", () => {
    const starfield = createProceduralStarfield({
      random: () => 0.5,
      spreadX: 400,
      spreadY: 300,
      starCount: 1,
      velocityX: 10,
      velocityY: -6,
      velocityZ: 0,
    });
    const [star] = starfield.getStars();

    starfield.update(1, { height: 240, width: 320 });

    expect(star.x).toBeCloseTo(-8.3);
    expect(star.y).toBeCloseTo(4.98);
  });

  it("wraps stars through depth when flying forward or backward", () => {
    const forward = createProceduralStarfield({
      depth: 10,
      minDepth: 1,
      random: () => 0.5,
      starCount: 1,
      velocityZ: 20,
    });
    const backward = createProceduralStarfield({
      depth: 10,
      minDepth: 1,
      random: () => 0.5,
      starCount: 1,
      velocityZ: -20,
    });

    forward.update(1, { height: 240, width: 320 });
    backward.update(1, { height: 240, width: 320 });

    expect(forward.getStars()[0]?.z).toBe(10);
    expect(backward.getStars()[0]?.z).toBe(1);
  });

  it("renders pixel-snapped stars and restores canvas state", () => {
    const starfield = createProceduralStarfield({
      random: () => 0.5,
      starCount: 2,
      velocityZ: 80,
    });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    const fillRect = vi.spyOn(context, "fillRect");

    context.globalAlpha = 0.4;
    context.imageSmoothingEnabled = true;
    starfield.render(context, { height: 240, width: 320 });

    expect(fillRect).toHaveBeenCalled();
    expect(context.globalAlpha).toBe(0.4);
    expect(context.imageSmoothingEnabled).toBe(true);
  });
});
