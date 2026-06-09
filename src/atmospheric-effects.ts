export interface AtmosphericEffectViewport {
  height: number;
  width: number;
}

export type AtmosphericRainDensity = "light" | "medium" | "heavy" | "storm";

export interface AtmosphericRainOptions {
  density?: AtmosphericRainDensity;
  maxDrops?: number;
  pixelSize?: number;
  random?: () => number;
  spawnRate?: number;
  wind?: number;
}

export type AtmosphericRainDrop = {
  length: number;
  speed: number;
  x: number;
  y: number;
};

export type AtmosphericRainSplash = {
  age: number;
  life: number;
  seed: number;
  x: number;
  y: number;
};

type NormalizedAtmosphericRainOptions = {
  density: AtmosphericRainDensity;
  maxDrops: number;
  pixelSize: number;
  random: () => number;
  spawnRate: number;
  wind: number;
};

const rainDensitySettings: Record<
  AtmosphericRainDensity,
  {
    maxDrops: number;
    spawnRate: number;
    speedMax: number;
    speedMin: number;
  }
> = {
  heavy: {
    maxDrops: 120,
    spawnRate: 150,
    speedMax: 520,
    speedMin: 310,
  },
  light: {
    maxDrops: 34,
    spawnRate: 38,
    speedMax: 330,
    speedMin: 210,
  },
  medium: {
    maxDrops: 72,
    spawnRate: 88,
    speedMax: 420,
    speedMin: 260,
  },
  storm: {
    maxDrops: 170,
    spawnRate: 220,
    speedMax: 680,
    speedMin: 390,
  },
};

const normalizeRainDensity = (
  value: AtmosphericRainDensity | undefined
): AtmosphericRainDensity => {
  if (value === "light" || value === "medium" || value === "heavy" || value === "storm") {
    return value;
  }

  return "medium";
};

const getFiniteNumber = (
  value: unknown,
  fallback: number,
  minimum = 0
): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(minimum, value);
};

const normalizeRainOptions = (
  options: AtmosphericRainOptions | undefined
): NormalizedAtmosphericRainOptions => {
  const density = normalizeRainDensity(options?.density);
  const densitySettings = rainDensitySettings[density];

  return {
    density,
    maxDrops: Math.max(
      1,
      Math.floor(getFiniteNumber(options?.maxDrops, densitySettings.maxDrops, 1))
    ),
    pixelSize: Math.max(1, Math.round(getFiniteNumber(options?.pixelSize, 2, 1))),
    random: typeof options?.random === "function" ? options.random : Math.random,
    spawnRate: getFiniteNumber(options?.spawnRate, densitySettings.spawnRate),
    wind: getFiniteNumber(options?.wind, 0, -Infinity),
  };
};

export class AtmosphericRainEffect {
  private readonly drops: AtmosphericRainDrop[] = [];
  private readonly splashes: AtmosphericRainSplash[] = [];
  private options: NormalizedAtmosphericRainOptions;
  private spawnAccumulator = 0;

  constructor(options?: AtmosphericRainOptions) {
    this.options = normalizeRainOptions(options);
  }

  clear(): void {
    this.drops.length = 0;
    this.splashes.length = 0;
    this.spawnAccumulator = 0;
  }

  getActiveDropCount(): number {
    return this.drops.length;
  }

  getActiveSplashCount(): number {
    return this.splashes.length;
  }

  setOptions(options: AtmosphericRainOptions): void {
    this.options = normalizeRainOptions({
      density: this.options.density,
      maxDrops: this.options.maxDrops,
      pixelSize: this.options.pixelSize,
      random: this.options.random,
      spawnRate: this.options.spawnRate,
      wind: this.options.wind,
      ...options,
    });

    if (this.drops.length > this.options.maxDrops) {
      this.drops.splice(0, this.drops.length - this.options.maxDrops);
    }
  }

  update(deltaTime: number, viewport: AtmosphericEffectViewport): void {
    const delta = Math.min(0.1, Math.max(0, deltaTime));

    if (viewport.width <= 0 || viewport.height <= 0 || delta <= 0) {
      return;
    }

    this.spawnAccumulator += delta * this.options.spawnRate;

    while (this.spawnAccumulator >= 1 && this.drops.length < this.options.maxDrops) {
      this.spawnDrop(viewport);
      this.spawnAccumulator -= 1;
    }

    for (let index = this.drops.length - 1; index >= 0; index -= 1) {
      const drop = this.drops[index];

      drop.x += this.options.wind * delta;
      drop.y += drop.speed * delta;

      if (drop.y >= viewport.height) {
        this.spawnSplash(drop, viewport);
        this.drops.splice(index, 1);
      }
    }

    for (let index = this.splashes.length - 1; index >= 0; index -= 1) {
      const splash = this.splashes[index];

      splash.age += delta;
      if (splash.age >= splash.life) {
        this.splashes.splice(index, 1);
      }
    }
  }

  render(
    context: CanvasRenderingContext2D,
    viewport: AtmosphericEffectViewport
  ): void {
    const pixel = this.options.pixelSize;

    context.save();
    context.imageSmoothingEnabled = false;

    for (const drop of this.drops) {
      this.renderDrop(context, drop, pixel);
    }

    for (const splash of this.splashes) {
      this.renderSplash(context, splash, viewport, pixel);
    }

    context.restore();
  }

  private spawnDrop(viewport: AtmosphericEffectViewport): void {
    const densitySettings = rainDensitySettings[this.options.density];
    const windLead = Math.max(0, Math.abs(this.options.wind) * 0.3);
    const x = this.getRandomRange(-windLead, viewport.width + windLead);
    const y = this.getRandomRange(-viewport.height * 0.18, -this.options.pixelSize);

    this.drops.push({
      length: this.getRandomRange(2, 8),
      speed: this.getRandomRange(densitySettings.speedMin, densitySettings.speedMax),
      x: this.snap(x),
      y: this.snap(y),
    });
  }

  private spawnSplash(
    drop: AtmosphericRainDrop,
    viewport: AtmosphericEffectViewport
  ): void {
    const chance = this.options.density === "light" ? 0.42 : 0.72;

    if (this.options.random() > chance) {
      return;
    }

    this.splashes.push({
      age: 0,
      life: this.getRandomRange(0.08, 0.18),
      seed: this.options.random(),
      x: this.snap(drop.x + this.options.wind * 0.02),
      y: this.snap(viewport.height - this.options.pixelSize * 2),
    });
  }

  private renderDrop(
    context: CanvasRenderingContext2D,
    drop: AtmosphericRainDrop,
    pixel: number
  ): void {
    const x = this.snap(drop.x);
    const y = this.snap(drop.y);
    const length = Math.max(2, Math.round(drop.length));
    const segments = Math.max(1, Math.ceil(length / pixel));
    const slant = Math.max(-pixel * 3, Math.min(pixel * 3, this.options.wind * 0.016));

    context.fillStyle = this.options.density === "storm"
      ? "rgba(156, 190, 210, 0.58)"
      : "rgba(142, 178, 198, 0.48)";

    for (let index = 0; index < segments; index += 1) {
      const progress = segments <= 1 ? 0 : index / (segments - 1);
      const segmentX = this.snap(x + slant * progress);
      const segmentY = this.snap(y + index * pixel);

      context.fillRect(segmentX, segmentY, pixel, pixel);
    }
  }

  private renderSplash(
    context: CanvasRenderingContext2D,
    splash: AtmosphericRainSplash,
    viewport: AtmosphericEffectViewport,
    pixel: number
  ): void {
    const progress = Math.min(1, splash.age / splash.life);
    const alpha = 1 - progress;
    const windStep = Math.sign(this.options.wind) * pixel;
    const spread = pixel * (1 + Math.round(progress * 2));
    const x = Math.max(0, Math.min(viewport.width - pixel, this.snap(splash.x)));
    const y = Math.max(0, Math.min(viewport.height - pixel, this.snap(splash.y)));

    context.fillStyle = `rgba(152, 190, 210, ${0.36 * alpha})`;
    context.fillRect(x, y, pixel, pixel);
    context.fillRect(x - spread + windStep, y + pixel, pixel, pixel);
    context.fillRect(x + spread + windStep, y + pixel, pixel, pixel);

    if (splash.seed > 0.5) {
      context.fillRect(x + windStep, y - pixel, pixel, pixel);
    }
  }

  private getRandomRange(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.options.random();
  }

  private snap(value: number): number {
    return Math.round(value / this.options.pixelSize) * this.options.pixelSize;
  }
}

export const createAtmosphericRainEffect = (
  options?: AtmosphericRainOptions
): AtmosphericRainEffect => new AtmosphericRainEffect(options);

export type AtmosphericSnowDensity = "light-flurry" | "snow" | "heavy-snow" | "blizzard";

export interface AtmosphericSnowOptions {
  accumulationEnabled?: boolean;
  accumulationLimit?: number;
  accumulationRate?: number;
  density?: AtmosphericSnowDensity;
  maxFlakes?: number;
  pixelSize?: number;
  random?: () => number;
  spawnRate?: number;
  wind?: number;
}

export type AtmosphericSnowFlake = {
  depth: number;
  seed: number;
  shape: number;
  size: number;
  speed: number;
  sway: number;
  x: number;
  y: number;
};

type NormalizedAtmosphericSnowOptions = {
  accumulationEnabled: boolean;
  accumulationLimit: number;
  accumulationRate: number;
  density: AtmosphericSnowDensity;
  maxFlakes: number;
  pixelSize: number;
  random: () => number;
  spawnRate: number;
  wind: number;
};

const snowDensitySettings: Record<
  AtmosphericSnowDensity,
  {
    maxFlakes: number;
    spawnRate: number;
    speedMax: number;
    speedMin: number;
    windBoost: number;
  }
> = {
  blizzard: {
    maxFlakes: 160,
    spawnRate: 150,
    speedMax: 150,
    speedMin: 62,
    windBoost: 110,
  },
  "heavy-snow": {
    maxFlakes: 115,
    spawnRate: 95,
    speedMax: 110,
    speedMin: 44,
    windBoost: 24,
  },
  "light-flurry": {
    maxFlakes: 34,
    spawnRate: 22,
    speedMax: 58,
    speedMin: 18,
    windBoost: 0,
  },
  snow: {
    maxFlakes: 68,
    spawnRate: 52,
    speedMax: 82,
    speedMin: 30,
    windBoost: 0,
  },
};

const normalizeSnowDensity = (
  value: AtmosphericSnowDensity | undefined
): AtmosphericSnowDensity => {
  if (
    value === "light-flurry" ||
    value === "snow" ||
    value === "heavy-snow" ||
    value === "blizzard"
  ) {
    return value;
  }

  return "snow";
};

const normalizeSnowOptions = (
  options: AtmosphericSnowOptions | undefined
): NormalizedAtmosphericSnowOptions => {
  const density = normalizeSnowDensity(options?.density);
  const densitySettings = snowDensitySettings[density];
  const windFallback = density === "blizzard" ? densitySettings.windBoost : 0;

  return {
    accumulationEnabled: options?.accumulationEnabled ?? false,
    accumulationLimit: getFiniteNumber(options?.accumulationLimit, 28),
    accumulationRate: getFiniteNumber(options?.accumulationRate, 0.7),
    density,
    maxFlakes: Math.max(
      1,
      Math.floor(getFiniteNumber(options?.maxFlakes, densitySettings.maxFlakes, 1))
    ),
    pixelSize: Math.max(1, Math.round(getFiniteNumber(options?.pixelSize, 2, 1))),
    random: typeof options?.random === "function" ? options.random : Math.random,
    spawnRate: getFiniteNumber(options?.spawnRate, densitySettings.spawnRate),
    wind: getFiniteNumber(options?.wind, windFallback, -Infinity),
  };
};

export class AtmosphericSnowEffect {
  private accumulation = 0;
  private readonly flakes: AtmosphericSnowFlake[] = [];
  private options: NormalizedAtmosphericSnowOptions;
  private spawnAccumulator = 0;
  private time = 0;

  constructor(options?: AtmosphericSnowOptions) {
    this.options = normalizeSnowOptions(options);
  }

  clear(): void {
    this.accumulation = 0;
    this.flakes.length = 0;
    this.spawnAccumulator = 0;
    this.time = 0;
  }

  getAccumulationHeight(): number {
    return this.accumulation;
  }

  getActiveFlakeCount(): number {
    return this.flakes.length;
  }

  setOptions(options: AtmosphericSnowOptions): void {
    this.options = normalizeSnowOptions({
      accumulationEnabled: this.options.accumulationEnabled,
      accumulationLimit: this.options.accumulationLimit,
      accumulationRate: this.options.accumulationRate,
      density: this.options.density,
      maxFlakes: this.options.maxFlakes,
      pixelSize: this.options.pixelSize,
      random: this.options.random,
      spawnRate: this.options.spawnRate,
      wind: this.options.wind,
      ...options,
    });

    if (this.flakes.length > this.options.maxFlakes) {
      this.flakes.splice(0, this.flakes.length - this.options.maxFlakes);
    }

    this.accumulation = Math.min(this.accumulation, this.options.accumulationLimit);
  }

  update(deltaTime: number, viewport: AtmosphericEffectViewport): void {
    const delta = Math.min(0.1, Math.max(0, deltaTime));

    if (viewport.width <= 0 || viewport.height <= 0 || delta <= 0) {
      return;
    }

    this.time += delta;
    this.spawnAccumulator += delta * this.options.spawnRate;

    while (this.spawnAccumulator >= 1 && this.flakes.length < this.options.maxFlakes) {
      this.spawnFlake(viewport);
      this.spawnAccumulator -= 1;
    }

    for (let index = this.flakes.length - 1; index >= 0; index -= 1) {
      const flake = this.flakes[index];
      const depthSpeed = 0.48 + flake.depth * 0.72;
      const sway = Math.sin(this.time * flake.sway + flake.seed * 12) * this.options.pixelSize;

      flake.x += (this.options.wind * (0.2 + flake.depth * 0.75) + sway * 8) * delta;
      flake.y += flake.speed * depthSpeed * delta;

      if (flake.y >= viewport.height - this.accumulation) {
        this.collectFlake(flake);
        this.flakes.splice(index, 1);
      } else if (flake.x < -viewport.width * 0.15 || flake.x > viewport.width * 1.15) {
        this.flakes.splice(index, 1);
      }
    }
  }

  render(
    context: CanvasRenderingContext2D,
    viewport: AtmosphericEffectViewport
  ): void {
    const pixel = this.options.pixelSize;

    context.save();
    context.imageSmoothingEnabled = false;

    for (const flake of this.flakes) {
      this.renderFlake(context, flake, pixel);
    }

    if (this.options.accumulationEnabled && this.accumulation > 0) {
      this.renderAccumulation(context, viewport, pixel);
    }

    context.restore();
  }

  private collectFlake(flake: AtmosphericSnowFlake): void {
    if (!this.options.accumulationEnabled) {
      return;
    }

    this.accumulation = Math.min(
      this.options.accumulationLimit,
      this.accumulation + this.options.accumulationRate * (0.35 + flake.depth)
    );
  }

  private renderAccumulation(
    context: CanvasRenderingContext2D,
    viewport: AtmosphericEffectViewport,
    pixel: number
  ): void {
    const height = Math.max(pixel, this.snap(this.accumulation));
    const top = viewport.height - height;

    context.fillStyle = "rgba(212, 230, 236, 0.72)";
    context.fillRect(0, top, viewport.width, height);

    context.fillStyle = "rgba(244, 252, 255, 0.8)";
    for (let x = 0; x < viewport.width; x += pixel * 4) {
      const capHeight = pixel * (1 + ((x / pixel + Math.round(this.accumulation)) % 2));

      context.fillRect(x, top - capHeight, pixel * 2, capHeight);
    }
  }

  private renderFlake(
    context: CanvasRenderingContext2D,
    flake: AtmosphericSnowFlake,
    pixel: number
  ): void {
    const x = this.snap(flake.x);
    const y = this.snap(flake.y);
    const alpha = 0.22 + flake.depth * 0.48;
    const size = Math.max(pixel, this.snap(flake.size));

    context.fillStyle = `rgba(230, 246, 250, ${alpha})`;

    if (flake.shape === 0) {
      context.fillRect(x, y, size, size);
      return;
    }

    if (flake.shape === 1) {
      context.fillRect(x, y + pixel, size + pixel, pixel);
      context.fillRect(x + pixel, y, pixel, size + pixel);
      return;
    }

    context.fillRect(x, y, pixel, pixel);
    context.fillRect(x + pixel, y, pixel, pixel);
    context.fillRect(x, y + pixel, pixel, pixel);

    if (flake.depth > 0.72) {
      context.fillRect(x + pixel, y + pixel, pixel, pixel);
    }
  }

  private spawnFlake(viewport: AtmosphericEffectViewport): void {
    const densitySettings = snowDensitySettings[this.options.density];
    const depth = this.options.random();
    const windLead = Math.max(0, Math.abs(this.options.wind) * 0.6);
    const x = this.getRandomRange(-windLead, viewport.width + windLead);
    const y = this.getRandomRange(-viewport.height * 0.16, -this.options.pixelSize);
    const baseSize = this.options.pixelSize * (depth > 0.66 ? 2 : 1);

    this.flakes.push({
      depth,
      seed: this.options.random(),
      shape: Math.floor(this.getRandomRange(0, depth > 0.45 ? 3 : 2)),
      size: baseSize,
      speed: this.getRandomRange(densitySettings.speedMin, densitySettings.speedMax),
      sway: this.getRandomRange(0.8, 2.2),
      x: this.snap(x),
      y: this.snap(y),
    });
  }

  private getRandomRange(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.options.random();
  }

  private snap(value: number): number {
    return Math.round(value / this.options.pixelSize) * this.options.pixelSize;
  }
}

export const createAtmosphericSnowEffect = (
  options?: AtmosphericSnowOptions
): AtmosphericSnowEffect => new AtmosphericSnowEffect(options);
