import type { ViewportDimensions } from "./viewport.js";

export interface ProceduralStarfieldMotion {
  velocityX?: number;
  velocityY?: number;
  velocityZ?: number;
}

export interface ProceduralStarfieldOptions extends ProceduralStarfieldMotion {
  colors?: string[];
  depth?: number;
  minDepth?: number;
  pixelSize?: number;
  random?: () => number;
  spreadX?: number;
  spreadY?: number;
  starCount?: number;
  twinkle?: boolean;
}

export interface ProceduralStar {
  brightness: number;
  colorIndex: number;
  seed: number;
  size: number;
  x: number;
  y: number;
  z: number;
}

type NormalizedProceduralStarfieldOptions = Required<
  Omit<ProceduralStarfieldOptions, "colors">
> & {
  colors: string[];
};

const defaultStarColors = ["#f5f7fb", "#d6f3ff", "#fff2b8", "#9bd7ff"];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const finiteNumber = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeOptions = (
  options: ProceduralStarfieldOptions,
  previous?: NormalizedProceduralStarfieldOptions
): NormalizedProceduralStarfieldOptions => {
  const depth = Math.max(2, finiteNumber(options.depth, previous?.depth ?? 80));
  const minDepth = clamp(finiteNumber(options.minDepth, previous?.minDepth ?? 1), 0.1, depth - 0.1);
  const colors =
    options.colors && options.colors.length > 0
      ? options.colors.slice()
      : previous?.colors.slice() ?? defaultStarColors.slice();

  return {
    colors,
    depth,
    minDepth,
    pixelSize: Math.max(1, finiteNumber(options.pixelSize, previous?.pixelSize ?? 1)),
    random: options.random ?? previous?.random ?? Math.random,
    spreadX: Math.max(32, finiteNumber(options.spreadX, previous?.spreadX ?? 760)),
    spreadY: Math.max(32, finiteNumber(options.spreadY, previous?.spreadY ?? 460)),
    starCount: Math.max(0, Math.floor(finiteNumber(options.starCount, previous?.starCount ?? 120))),
    twinkle: options.twinkle ?? previous?.twinkle ?? true,
    velocityX: finiteNumber(options.velocityX, previous?.velocityX ?? 0),
    velocityY: finiteNumber(options.velocityY, previous?.velocityY ?? 0),
    velocityZ: finiteNumber(options.velocityZ, previous?.velocityZ ?? 26),
  };
};

const getDepthProgress = (
  star: ProceduralStar,
  options: NormalizedProceduralStarfieldOptions
): number => 1 - (star.z - options.minDepth) / Math.max(1, options.depth - options.minDepth);

export class ProceduralStarfield {
  private options: NormalizedProceduralStarfieldOptions;
  private readonly stars: ProceduralStar[] = [];
  private time = 0;

  constructor(options: ProceduralStarfieldOptions = {}) {
    this.options = normalizeOptions(options);
    this.reset();
  }

  getStars(): readonly ProceduralStar[] {
    return this.stars;
  }

  reset(): void {
    this.stars.length = 0;

    for (let index = 0; index < this.options.starCount; index += 1) {
      this.stars.push(this.createStar(this.getRandomRange(this.options.minDepth, this.options.depth)));
    }
  }

  setMotion(motion: ProceduralStarfieldMotion): void {
    this.options = normalizeOptions(motion, this.options);
  }

  setOptions(options: ProceduralStarfieldOptions): void {
    const previousCount = this.options.starCount;
    this.options = normalizeOptions(options, this.options);

    while (this.stars.length > this.options.starCount) {
      this.stars.pop();
    }

    while (this.stars.length < this.options.starCount) {
      this.stars.push(this.createStar(this.getRandomRange(this.options.minDepth, this.options.depth)));
    }

    if (previousCount === 0 && this.options.starCount > 0) {
      this.reset();
    }
  }

  update(deltaTime: number, _viewport: ViewportDimensions): void {
    const delta = Math.max(0, deltaTime);
    const halfSpreadX = this.options.spreadX / 2;
    const halfSpreadY = this.options.spreadY / 2;

    this.time += delta;

    for (const star of this.stars) {
      const depthProgress = clamp(getDepthProgress(star, this.options), 0, 1);
      const parallax = 0.24 + depthProgress * 1.18;

      star.x -= this.options.velocityX * parallax * delta;
      star.y -= this.options.velocityY * parallax * delta;
      star.z -= this.options.velocityZ * delta;

      if (star.x < -halfSpreadX) {
        star.x += this.options.spreadX;
      } else if (star.x > halfSpreadX) {
        star.x -= this.options.spreadX;
      }

      if (star.y < -halfSpreadY) {
        star.y += this.options.spreadY;
      } else if (star.y > halfSpreadY) {
        star.y -= this.options.spreadY;
      }

      if (star.z < this.options.minDepth) {
        this.respawnStar(star, this.options.depth);
      } else if (star.z > this.options.depth) {
        this.respawnStar(star, this.options.minDepth);
      }
    }
  }

  render(context: CanvasRenderingContext2D, viewport: ViewportDimensions): void {
    const previousSmoothing = context.imageSmoothingEnabled;
    const previousAlpha = context.globalAlpha;
    const centerX = Math.round(viewport.width / 2);
    const centerY = Math.round(viewport.height / 2);

    context.imageSmoothingEnabled = false;
    this.stars
      .slice()
      .sort((a, b) => b.z - a.z)
      .forEach((star) => {
        const projected = this.projectStar(star, centerX, centerY);

        if (
          projected.x < -8 ||
          projected.x > viewport.width + 8 ||
          projected.y < -8 ||
          projected.y > viewport.height + 8
        ) {
          return;
        }

        this.renderStar(context, star, projected.x, projected.y, centerX, centerY);
      });

    context.globalAlpha = previousAlpha;
    context.imageSmoothingEnabled = previousSmoothing;
  }

  private createStar(depth: number): ProceduralStar {
    const colorIndex = Math.floor(this.options.random() * this.options.colors.length);

    return {
      brightness: this.getRandomRange(0.45, 1),
      colorIndex: Math.min(this.options.colors.length - 1, colorIndex),
      seed: this.options.random() * Math.PI * 2,
      size: this.getRandomRange(0.85, 2.4),
      x: this.getRandomRange(-this.options.spreadX / 2, this.options.spreadX / 2),
      y: this.getRandomRange(-this.options.spreadY / 2, this.options.spreadY / 2),
      z: depth,
    };
  }

  private getRandomRange(min: number, max: number): number {
    return min + (max - min) * this.options.random();
  }

  private projectStar(
    star: ProceduralStar,
    centerX: number,
    centerY: number
  ): { scale: number; x: number; y: number } {
    const progress = clamp(getDepthProgress(star, this.options), 0, 1);
    const scale = 0.18 + progress * 2.15;

    return {
      scale,
      x: Math.round(centerX + star.x * scale),
      y: Math.round(centerY + star.y * scale),
    };
  }

  private renderStar(
    context: CanvasRenderingContext2D,
    star: ProceduralStar,
    x: number,
    y: number,
    centerX: number,
    centerY: number
  ): void {
    const progress = clamp(getDepthProgress(star, this.options), 0, 1);
    const twinkle = this.options.twinkle
      ? 0.78 + Math.sin(this.time * (2.6 + star.size) + star.seed) * 0.22
      : 1;
    const alpha = clamp(star.brightness * (0.28 + progress * 0.72) * twinkle, 0.12, 1);
    const size = Math.max(
      this.options.pixelSize,
      Math.round(this.options.pixelSize * star.size * (0.72 + progress * 1.35))
    );

    context.fillStyle = this.options.colors[star.colorIndex] ?? defaultStarColors[0];
    context.globalAlpha = alpha;
    this.renderDepthTrail(context, x, y, centerX, centerY, size, progress);
    context.globalAlpha = alpha;
    context.fillRect(Math.round(x), Math.round(y), size, size);
  }

  private renderDepthTrail(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    size: number,
    progress: number
  ): void {
    const velocityZ = this.options.velocityZ;
    const trailLength = Math.round(Math.min(10, Math.abs(velocityZ) * (0.02 + progress * 0.035)));

    if (trailLength <= 1) {
      return;
    }

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const direction = velocityZ >= 0 ? -1 : 1;
    const stepX = Math.round((dx / distance) * direction * this.options.pixelSize);
    const stepY = Math.round((dy / distance) * direction * this.options.pixelSize);

    for (let step = 1; step <= trailLength; step += 1) {
      context.globalAlpha *= 0.72;
      context.fillRect(
        Math.round(x + stepX * step),
        Math.round(y + stepY * step),
        Math.max(this.options.pixelSize, Math.floor(size * 0.7)),
        this.options.pixelSize
      );
    }
  }

  private respawnStar(star: ProceduralStar, depth: number): void {
    const replacement = this.createStar(depth);

    star.brightness = replacement.brightness;
    star.colorIndex = replacement.colorIndex;
    star.seed = replacement.seed;
    star.size = replacement.size;
    star.x = replacement.x;
    star.y = replacement.y;
    star.z = replacement.z;
  }
}

export const createProceduralStarfield = (
  options: ProceduralStarfieldOptions = {}
): ProceduralStarfield => new ProceduralStarfield(options);
