import type { ArcadePoint2D } from "./arcade-3d.js";

export type RgbColor = [red: number, green: number, blue: number];

export const parseHexColor = (hex: string): RgbColor => {
  const normalized = hex.replace("#", "");

  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(normalized)) {
    throw new Error("Expected a 3 or 6 digit hex color.");
  }

  const value = Number.parseInt(
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => part + part)
          .join("")
      : normalized,
    16
  );

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

export const colorWithAlpha = (hex: string, alpha: number): string => {
  const [red, green, blue] = parseHexColor(hex);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const shadeHexColor = (hex: string, amount: number, alpha = 1): string => {
  const [red, green, blue] = parseHexColor(hex);
  const shade = (value: number): number =>
    Math.max(0, Math.min(255, Math.round(value * amount)));

  return `rgba(${shade(red)}, ${shade(green)}, ${shade(blue)}, ${alpha})`;
};

export const fillCanvasWithTrail = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  color: string,
  trailOpacity: number
): void => {
  const previousAlpha = context.globalAlpha;
  const fillAlpha = Math.max(0, Math.min(1, 1 - trailOpacity));

  context.globalAlpha = trailOpacity > 0 ? fillAlpha : previousAlpha;
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = previousAlpha;
};

export const drawCanvasLine = (
  context: CanvasRenderingContext2D,
  from: ArcadePoint2D,
  to: ArcadePoint2D,
  color: string,
  width = 1
): void => {
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
};

export const drawCanvasPolygon = (
  context: CanvasRenderingContext2D,
  points: ArcadePoint2D[],
  color: string,
  stroke?: string
): void => {
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
      return;
    }

    context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.fillStyle = color;
  context.fill();

  if (stroke) {
    context.strokeStyle = stroke;
    context.lineWidth = 1;
    context.stroke();
  }
};
