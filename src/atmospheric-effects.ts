export interface AtmosphericEffectViewport {
  height: number;
  width: number;
}

export interface AtmosphericPlayerMotion {
  enabled?: boolean;
  influence?: number;
  turnVelocity?: number;
  velocityX?: number;
  velocityY?: number;
  velocityZ?: number;
}

type NormalizedAtmosphericPlayerMotion = {
  enabled: boolean;
  influence: number;
  turnVelocity: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
};

export type AtmosphericRainDensity = "light" | "medium" | "heavy" | "storm";

export interface AtmosphericRainOptions {
  density?: AtmosphericRainDensity;
  maxDrops?: number;
  pixelSize?: number;
  playerMotion?: AtmosphericPlayerMotion;
  random?: () => number;
  spawnRate?: number;
  wind?: number;
}

export type AtmosphericRainDrop = {
  depth: number;
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
  playerMotion: NormalizedAtmosphericPlayerMotion;
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

const normalizePlayerMotion = (
  motion: AtmosphericPlayerMotion | undefined,
  previous?: NormalizedAtmosphericPlayerMotion
): NormalizedAtmosphericPlayerMotion => ({
  enabled: motion?.enabled ?? previous?.enabled ?? false,
  influence: getFiniteNumber(motion?.influence, previous?.influence ?? 1),
  turnVelocity: getFiniteNumber(motion?.turnVelocity, previous?.turnVelocity ?? 0, -Infinity),
  velocityX: getFiniteNumber(motion?.velocityX, previous?.velocityX ?? 0, -Infinity),
  velocityY: getFiniteNumber(motion?.velocityY, previous?.velocityY ?? 0, -Infinity),
  velocityZ: getFiniteNumber(motion?.velocityZ, previous?.velocityZ ?? 0, -Infinity),
});

type AtmosphericMotionParticle = {
  depth: number;
  x: number;
  y: number;
};

const applyPlayerMotionToParticle = (
  particle: AtmosphericMotionParticle,
  motion: NormalizedAtmosphericPlayerMotion,
  viewport: AtmosphericEffectViewport,
  delta: number,
  depthMultiplier = 1
): void => {
  if (!motion.enabled || motion.influence <= 0) {
    return;
  }

  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const depth = Math.max(0.01, Math.min(1.9, particle.depth));
  const parallax = (0.12 + depth * 1.18) * depthMultiplier * motion.influence;
  const forwardScale = motion.velocityZ * 0.012 * parallax * delta;

  particle.x += (particle.x - centerX) * forwardScale;
  particle.y += (particle.y - centerY) * forwardScale * 0.18;
  particle.x -= motion.velocityX * 0.62 * parallax * delta;
  particle.y -= motion.velocityY * 0.46 * parallax * delta;
  particle.x -= motion.turnVelocity * (0.72 + depth * 1.15) * depthMultiplier * motion.influence * delta;
  particle.depth = Math.max(
    0.01,
    Math.min(1.9, particle.depth + motion.velocityZ * 0.0055 * depthMultiplier * motion.influence * delta)
  );
};

const getMotionVisibleDepth = (depth: number): number =>
  Math.max(0, (depth - 0.08) / 0.58);

const getMotionSpawnSpread = (
  motion: NormalizedAtmosphericPlayerMotion,
  viewport: AtmosphericEffectViewport,
  multiplier = 1
): number => {
  if (!motion.enabled || motion.velocityZ <= 0) {
    return 0;
  }

  return viewport.width * multiplier + Math.max(0, motion.velocityZ) * 0.9 * motion.influence;
};

const getMotionDensityBoost = (
  motion: NormalizedAtmosphericPlayerMotion,
  maximumBoost = 1.1,
  forwardScale = 0.0022,
  turnScale = 0.0012
): number => {
  if (!motion.enabled || motion.influence <= 0) {
    return 1;
  }

  const forwardBoost = Math.max(0, motion.velocityZ) * forwardScale;
  const turnBoost = Math.abs(motion.turnVelocity) * turnScale;

  return 1 + Math.min(maximumBoost, (forwardBoost + turnBoost) * motion.influence);
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
    playerMotion: normalizePlayerMotion(options?.playerMotion),
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
    const playerMotion = normalizePlayerMotion(options.playerMotion, this.options.playerMotion);

    this.options = normalizeRainOptions({
      density: this.options.density,
      pixelSize: this.options.pixelSize,
      random: this.options.random,
      wind: this.options.wind,
      ...options,
      playerMotion,
    });

    if (this.drops.length > this.options.maxDrops) {
      this.drops.splice(0, this.drops.length - this.options.maxDrops);
    }
  }

  setPlayerMotion(motion: AtmosphericPlayerMotion): void {
    this.options = {
      ...this.options,
      playerMotion: normalizePlayerMotion(motion, this.options.playerMotion),
    };
  }

  update(deltaTime: number, viewport: AtmosphericEffectViewport): void {
    const delta = Math.min(0.1, Math.max(0, deltaTime));

    if (viewport.width <= 0 || viewport.height <= 0 || delta <= 0) {
      return;
    }

    const densityBoost = getMotionDensityBoost(this.options.playerMotion);
    const maxDrops = Math.ceil(this.options.maxDrops * densityBoost);

    this.spawnAccumulator += delta * this.options.spawnRate * densityBoost;

    while (this.spawnAccumulator >= 1 && this.drops.length < maxDrops) {
      this.spawnDrop(viewport);
      this.spawnAccumulator -= 1;
    }

    for (let index = this.drops.length - 1; index >= 0; index -= 1) {
      const drop = this.drops[index];
      const motionFallSpeed = this.options.playerMotion.enabled
        ? Math.max(0, this.options.playerMotion.velocityZ) *
          (0.28 + drop.depth * 1.45) *
          this.options.playerMotion.influence
        : 0;

      drop.x += this.options.wind * delta;
      drop.y += (drop.speed + motionFallSpeed) * delta;
      applyPlayerMotionToParticle(drop, this.options.playerMotion, viewport, delta);

      if (drop.y >= viewport.height) {
        this.spawnSplash(drop, viewport);
        this.drops.splice(index, 1);
      } else if (this.isDropOutside(drop, viewport)) {
        this.drops.splice(index, 1);
      }
    }

    for (let index = this.splashes.length - 1; index >= 0; index -= 1) {
      const splash = this.splashes[index];

      if (this.options.playerMotion.enabled) {
        splash.x -=
          (this.options.playerMotion.velocityX * 0.28 +
            this.options.playerMotion.turnVelocity * 0.48) *
          this.options.playerMotion.influence *
          delta;
      }

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
    const motion = this.options.playerMotion;
    const backgroundSpawn = motion.enabled && motion.velocityZ > 0;
    const farSpawn = backgroundSpawn && this.options.random() < 0.34;
    const motionSpread = getMotionSpawnSpread(motion, viewport, 1.35);
    const windLead = Math.max(0, Math.abs(this.options.wind) * 0.3);
    const x = farSpawn
      ? this.getRandomRange(
          viewport.width / 2 - motionSpread,
          viewport.width / 2 + motionSpread
        )
      : this.getRandomRange(-windLead, viewport.width + windLead);
    const y = farSpawn
      ? this.getRandomRange(-viewport.height * 1.35, viewport.height * 0.28)
      : backgroundSpawn
        ? this.getRandomRange(-viewport.height * 0.18, viewport.height * 0.98)
        : this.getRandomRange(-viewport.height * 0.18, -this.options.pixelSize);
    const depth = farSpawn
      ? this.getRandomRange(0.01, 0.18)
      : backgroundSpawn
        ? this.getRandomRange(0.34, 1.02)
        : this.getRandomRange(0.08, 0.92);

    this.drops.push({
      depth,
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
    const motion = this.options.playerMotion;
    const visibleDepth = motion.enabled ? getMotionVisibleDepth(drop.depth) : 1;

    if (motion.enabled && visibleDepth <= 0) {
      return;
    }

    const forwardStretch = motion.enabled
      ? Math.min(4.2, Math.abs(motion.velocityZ) * 0.01 * drop.depth)
      : 0;
    const depthScale = motion.enabled ? 0.65 + drop.depth * 1.25 + forwardStretch : 1;
    const length = Math.max(2, Math.round(drop.length * depthScale));
    const segments = Math.max(1, Math.ceil(length / pixel));
    const motionSlant = motion.enabled
      ? -motion.turnVelocity * 0.01 - motion.velocityX * 0.006
      : 0;
    const slant = Math.max(
      -pixel * 6,
      Math.min(pixel * 6, this.options.wind * 0.016 + motionSlant)
    );
    const alphaBoost = motion.enabled
      ? Math.min(0.36, drop.depth * 0.18 + Math.abs(motion.velocityZ) * 0.00055)
      : 0;
    const depthFade = motion.enabled ? Math.min(1, visibleDepth) : 1;

    context.fillStyle =
      this.options.density === "storm"
        ? `rgba(156, 190, 210, ${(0.58 + alphaBoost) * depthFade})`
        : `rgba(142, 178, 198, ${(0.48 + alphaBoost) * depthFade})`;

    for (let index = 0; index < segments; index += 1) {
      const progress = segments <= 1 ? 0 : index / (segments - 1);
      const segmentX = this.snap(x + slant * progress);
      const segmentY = this.snap(y + index * pixel);

      context.fillRect(segmentX, segmentY, pixel, pixel);
    }
  }

  private isDropOutside(
    drop: AtmosphericRainDrop,
    viewport: AtmosphericEffectViewport
  ): boolean {
    const motion = this.options.playerMotion;
    const margin = motion.enabled
      ? Math.max(this.options.pixelSize * 12, getMotionSpawnSpread(motion, viewport, 1.55))
      : this.options.pixelSize * 12;

    return (
      drop.x < -margin ||
      drop.x > viewport.width + margin ||
      drop.y < (motion.enabled ? -viewport.height * 4 : -viewport.height * 0.3) ||
      (motion.enabled && motion.velocityZ < 0 && drop.depth <= 0.05)
    );
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
  playerMotion?: AtmosphericPlayerMotion;
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
  playerMotion: NormalizedAtmosphericPlayerMotion;
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
    playerMotion: normalizePlayerMotion(options?.playerMotion),
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
    const playerMotion = normalizePlayerMotion(options.playerMotion, this.options.playerMotion);

    this.options = normalizeSnowOptions({
      accumulationEnabled: this.options.accumulationEnabled,
      accumulationLimit: this.options.accumulationLimit,
      accumulationRate: this.options.accumulationRate,
      density: this.options.density,
      pixelSize: this.options.pixelSize,
      random: this.options.random,
      wind: this.options.wind,
      ...options,
      playerMotion,
    });

    if (this.flakes.length > this.options.maxFlakes) {
      this.flakes.splice(0, this.flakes.length - this.options.maxFlakes);
    }

    this.accumulation = Math.min(this.accumulation, this.options.accumulationLimit);
  }

  setPlayerMotion(motion: AtmosphericPlayerMotion): void {
    this.options = {
      ...this.options,
      playerMotion: normalizePlayerMotion(motion, this.options.playerMotion),
    };
  }

  update(deltaTime: number, viewport: AtmosphericEffectViewport): void {
    const delta = Math.min(0.1, Math.max(0, deltaTime));

    if (viewport.width <= 0 || viewport.height <= 0 || delta <= 0) {
      return;
    }

    this.time += delta;
    const densityBoost = getMotionDensityBoost(this.options.playerMotion, 1.85, 0.0032, 0.0017);
    const maxFlakes = Math.ceil(this.options.maxFlakes * densityBoost);

    this.spawnAccumulator += delta * this.options.spawnRate * densityBoost;

    while (this.spawnAccumulator >= 1 && this.flakes.length < maxFlakes) {
      this.spawnFlake(viewport);
      this.spawnAccumulator -= 1;
    }

    for (let index = this.flakes.length - 1; index >= 0; index -= 1) {
      const flake = this.flakes[index];
      const depthSpeed = 0.48 + flake.depth * 0.72;
      const sway = Math.sin(this.time * flake.sway + flake.seed * 12) * this.options.pixelSize;
      const motionFallSpeed = this.options.playerMotion.enabled
        ? Math.max(0, this.options.playerMotion.velocityZ) *
          (0.08 + flake.depth * 0.62) *
          this.options.playerMotion.influence
        : 0;

      flake.x += (this.options.wind * (0.2 + flake.depth * 0.75) + sway * 8) * delta;
      flake.y += (flake.speed * depthSpeed + motionFallSpeed) * delta;
      applyPlayerMotionToParticle(flake, this.options.playerMotion, viewport, delta, 0.75);

      if (flake.y >= viewport.height - this.accumulation) {
        this.collectFlake(flake);
        this.flakes.splice(index, 1);
      } else if (this.isFlakeOutside(flake, viewport)) {
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
    const motion = this.options.playerMotion;
    const visibleDepth = motion.enabled ? getMotionVisibleDepth(flake.depth) : 1;

    if (motion.enabled && visibleDepth <= 0) {
      return;
    }

    const alpha = (0.22 + flake.depth * 0.48) * Math.min(1, visibleDepth);
    const motionSize = motion.enabled ? 0.8 + flake.depth * 0.65 : 1;
    const size = Math.max(pixel, this.snap(flake.size * motionSize));

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
    const motion = this.options.playerMotion;
    const backgroundSpawn = motion.enabled && motion.velocityZ > 0;
    const farSpawn = backgroundSpawn && this.options.random() < 0.24;
    const depth = farSpawn
      ? this.getRandomRange(0.01, 0.16)
      : backgroundSpawn
        ? this.getRandomRange(0.32, 1.05)
        : this.options.random();
    const motionSpread = getMotionSpawnSpread(motion, viewport, 1.45);
    const windLead = Math.max(0, Math.abs(this.options.wind) * 0.6);
    const x = farSpawn
      ? this.getRandomRange(
          viewport.width / 2 - motionSpread,
          viewport.width / 2 + motionSpread
        )
      : this.getRandomRange(-windLead, viewport.width + windLead);
    const y = farSpawn
      ? this.getRandomRange(-viewport.height * 0.95, viewport.height * 0.42)
      : backgroundSpawn
        ? this.getRandomRange(-viewport.height * 0.16, viewport.height * 0.96)
        : this.getRandomRange(-viewport.height * 0.16, -this.options.pixelSize);
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

  private isFlakeOutside(
    flake: AtmosphericSnowFlake,
    viewport: AtmosphericEffectViewport
  ): boolean {
    if (!this.options.playerMotion.enabled) {
      return flake.x < -viewport.width * 0.15 || flake.x > viewport.width * 1.15;
    }

    const margin = this.options.pixelSize * 18;
    const motionMargin = getMotionSpawnSpread(this.options.playerMotion, viewport, 1.55);
    const horizontalMargin = Math.max(margin, motionMargin);

    return (
      flake.x < -horizontalMargin ||
      flake.x > viewport.width + horizontalMargin ||
      flake.y < -viewport.height * 3 ||
      (this.options.playerMotion.velocityZ < 0 && flake.depth <= 0.05)
    );
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

export type AtmosphericAshEmberIntensity = "smolder" | "burning" | "wildfire" | "inferno";

export interface AtmosphericAshEmberOptions {
  emberRatio?: number;
  intensity?: AtmosphericAshEmberIntensity;
  maxParticles?: number;
  pixelSize?: number;
  playerMotion?: AtmosphericPlayerMotion;
  random?: () => number;
  spawnRate?: number;
  wind?: number;
}

export type AtmosphericAshEmberParticle = {
  age: number;
  depth: number;
  kind: "ash" | "ember";
  life: number;
  seed: number;
  size: number;
  speed: number;
  x: number;
  y: number;
};

type NormalizedAtmosphericAshEmberOptions = {
  emberRatio: number;
  intensity: AtmosphericAshEmberIntensity;
  maxParticles: number;
  pixelSize: number;
  playerMotion: NormalizedAtmosphericPlayerMotion;
  random: () => number;
  spawnRate: number;
  wind: number;
};

const ashEmberIntensitySettings: Record<
  AtmosphericAshEmberIntensity,
  {
    emberRatio: number;
    maxParticles: number;
    spawnRate: number;
    wind: number;
  }
> = {
  burning: {
    emberRatio: 0.24,
    maxParticles: 78,
    spawnRate: 46,
    wind: 18,
  },
  inferno: {
    emberRatio: 0.36,
    maxParticles: 140,
    spawnRate: 94,
    wind: 50,
  },
  smolder: {
    emberRatio: 0.1,
    maxParticles: 42,
    spawnRate: 20,
    wind: 10,
  },
  wildfire: {
    emberRatio: 0.3,
    maxParticles: 108,
    spawnRate: 68,
    wind: 34,
  },
};

const normalizeAshEmberIntensity = (
  value: AtmosphericAshEmberIntensity | undefined
): AtmosphericAshEmberIntensity => {
  if (
    value === "smolder" ||
    value === "burning" ||
    value === "wildfire" ||
    value === "inferno"
  ) {
    return value;
  }

  return "burning";
};

const normalizeAshEmberOptions = (
  options: AtmosphericAshEmberOptions | undefined
): NormalizedAtmosphericAshEmberOptions => {
  const intensity = normalizeAshEmberIntensity(options?.intensity);
  const intensitySettings = ashEmberIntensitySettings[intensity];
  const emberRatio = getFiniteNumber(options?.emberRatio, intensitySettings.emberRatio);

  return {
    emberRatio: Math.max(0, Math.min(1, emberRatio)),
    intensity,
    maxParticles: Math.max(
      1,
      Math.floor(getFiniteNumber(options?.maxParticles, intensitySettings.maxParticles, 1))
    ),
    pixelSize: Math.max(1, Math.round(getFiniteNumber(options?.pixelSize, 2, 1))),
    playerMotion: normalizePlayerMotion(options?.playerMotion),
    random: typeof options?.random === "function" ? options.random : Math.random,
    spawnRate: getFiniteNumber(options?.spawnRate, intensitySettings.spawnRate),
    wind: getFiniteNumber(options?.wind, intensitySettings.wind, -Infinity),
  };
};

export class AtmosphericAshEmberEffect {
  private options: NormalizedAtmosphericAshEmberOptions;
  private readonly particles: AtmosphericAshEmberParticle[] = [];
  private spawnAccumulator = 0;
  private time = 0;

  constructor(options?: AtmosphericAshEmberOptions) {
    this.options = normalizeAshEmberOptions(options);
  }

  clear(): void {
    this.particles.length = 0;
    this.spawnAccumulator = 0;
    this.time = 0;
  }

  getActiveAshCount(): number {
    return this.particles.filter((particle) => particle.kind === "ash").length;
  }

  getActiveEmberCount(): number {
    return this.particles.filter((particle) => particle.kind === "ember").length;
  }

  getActiveParticleCount(): number {
    return this.particles.length;
  }

  setOptions(options: AtmosphericAshEmberOptions): void {
    const playerMotion = normalizePlayerMotion(options.playerMotion, this.options.playerMotion);

    this.options = normalizeAshEmberOptions({
      intensity: this.options.intensity,
      pixelSize: this.options.pixelSize,
      random: this.options.random,
      wind: this.options.wind,
      ...options,
      playerMotion,
    });

    if (this.particles.length > this.options.maxParticles) {
      this.particles.splice(0, this.particles.length - this.options.maxParticles);
    }
  }

  setPlayerMotion(motion: AtmosphericPlayerMotion): void {
    this.options = {
      ...this.options,
      playerMotion: normalizePlayerMotion(motion, this.options.playerMotion),
    };
  }

  update(deltaTime: number, viewport: AtmosphericEffectViewport): void {
    const delta = Math.min(0.1, Math.max(0, deltaTime));

    if (viewport.width <= 0 || viewport.height <= 0 || delta <= 0) {
      return;
    }

    this.time += delta;
    const densityBoost = getMotionDensityBoost(this.options.playerMotion, 1.75, 0.003, 0.0016);
    const maxParticles = Math.ceil(this.options.maxParticles * densityBoost);

    this.spawnAccumulator += delta * this.options.spawnRate * densityBoost;

    while (this.spawnAccumulator >= 1 && this.particles.length < maxParticles) {
      this.spawnParticle(viewport);
      this.spawnAccumulator -= 1;
    }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      const wobble =
        Math.sin(this.time * (1.4 + particle.depth) + particle.seed * 18) *
        this.options.pixelSize;

      particle.age += delta;

      if (particle.kind === "ember") {
        particle.y -= particle.speed * (0.72 + particle.depth * 0.5) * delta;
        particle.x += (this.options.wind * (0.35 + particle.depth * 0.6) + wobble * 11) * delta;
      } else {
        particle.y += Math.sin(this.time * 0.9 + particle.seed * 9) * particle.speed * 0.08 * delta;
        particle.x += (this.options.wind * (0.18 + particle.depth * 0.34) + wobble * 7) * delta;
      }
      if (this.options.playerMotion.enabled) {
        particle.y +=
          Math.max(0, this.options.playerMotion.velocityZ) *
          (0.04 + particle.depth * 0.34) *
          this.options.playerMotion.influence *
          delta;
      }
      applyPlayerMotionToParticle(particle, this.options.playerMotion, viewport, delta, 0.72);

      if (particle.age >= particle.life || this.isOutside(particle, viewport)) {
        this.particles.splice(index, 1);
      }
    }
  }

  render(
    context: CanvasRenderingContext2D,
    _viewport: AtmosphericEffectViewport
  ): void {
    const pixel = this.options.pixelSize;

    context.save();
    context.imageSmoothingEnabled = false;

    for (const particle of this.particles) {
      if (particle.kind === "ash") {
        this.renderAsh(context, particle, pixel);
      }
    }

    for (const particle of this.particles) {
      if (particle.kind === "ember") {
        this.renderEmber(context, particle, pixel);
      }
    }

    context.restore();
  }

  private isOutside(
    particle: AtmosphericAshEmberParticle,
    viewport: AtmosphericEffectViewport
  ): boolean {
    const margin = this.options.playerMotion.enabled
      ? Math.max(
          this.options.pixelSize * 18,
          getMotionSpawnSpread(this.options.playerMotion, viewport, 1.5)
        )
      : this.options.pixelSize * 8;

    return (
      particle.x < -margin ||
      particle.x > viewport.width + margin ||
      particle.y < (this.options.playerMotion.enabled ? -viewport.height * 3 : -margin) ||
      particle.y > viewport.height + margin ||
      (this.options.playerMotion.enabled &&
        this.options.playerMotion.velocityZ < 0 &&
        particle.depth <= 0.05)
    );
  }

  private renderAsh(
    context: CanvasRenderingContext2D,
    particle: AtmosphericAshEmberParticle,
    pixel: number
  ): void {
    const progress = Math.min(1, particle.age / particle.life);
    const visibleDepth = this.options.playerMotion.enabled
      ? getMotionVisibleDepth(particle.depth)
      : 1;

    if (this.options.playerMotion.enabled && visibleDepth <= 0) {
      return;
    }

    const alpha = (1 - progress) * (0.18 + particle.depth * 0.22) * Math.min(1, visibleDepth);
    const x = this.snap(particle.x);
    const y = this.snap(particle.y);
    const size = this.options.playerMotion.enabled && particle.depth > 1.05 ? pixel * 2 : pixel;

    context.fillStyle = `rgba(74, 76, 76, ${alpha})`;
    context.fillRect(x, y, size, pixel);

    if (particle.seed > 0.34) {
      context.fillRect(x + pixel, y, pixel, pixel);
    }

    if (particle.seed > 0.68) {
      context.fillRect(x, y + pixel, pixel, pixel);
    }
  }

  private renderEmber(
    context: CanvasRenderingContext2D,
    particle: AtmosphericAshEmberParticle,
    pixel: number
  ): void {
    const progress = Math.min(1, particle.age / particle.life);
    const flicker = 0.58 + Math.sin(this.time * 18 + particle.seed * 20) * 0.28;
    const visibleDepth = this.options.playerMotion.enabled
      ? getMotionVisibleDepth(particle.depth)
      : 1;

    if (this.options.playerMotion.enabled && visibleDepth <= 0) {
      return;
    }

    const alpha =
      Math.max(0, 1 - progress) *
      (0.35 + particle.depth * 0.35) *
      flicker *
      Math.min(1, visibleDepth);
    const x = this.snap(particle.x);
    const y = this.snap(particle.y);
    const motionSize = this.options.playerMotion.enabled ? 0.85 + particle.depth * 0.8 : 1;
    const size = Math.max(pixel, this.snap(particle.size * motionSize));

    context.fillStyle = `rgba(236, 76, 28, ${alpha})`;
    context.fillRect(x, y, size, pixel);
    context.fillStyle = `rgba(255, 166, 52, ${alpha * 0.78})`;
    context.fillRect(x, y, pixel, pixel);

    if (particle.depth > 0.62) {
      context.fillStyle = `rgba(255, 218, 92, ${alpha * 0.58})`;
      context.fillRect(x + pixel, y - pixel, pixel, pixel);
    }
  }

  private spawnParticle(viewport: AtmosphericEffectViewport): void {
    const isEmber = this.options.random() < this.options.emberRatio;
    const motion = this.options.playerMotion;
    const backgroundSpawn = motion.enabled && motion.velocityZ > 0;
    const farSpawn = backgroundSpawn && this.options.random() < 0.22;
    const depth = isEmber
      ? farSpawn
        ? this.getRandomRange(0.01, 0.18)
        : backgroundSpawn
          ? this.getRandomRange(0.42, 1.08)
          : this.getRandomRange(0.45, 1)
      : farSpawn
        ? this.getRandomRange(0.01, 0.16)
        : backgroundSpawn
          ? this.getRandomRange(0.3, 0.9)
          : this.getRandomRange(0.05, 0.72);
    const pixel = this.options.pixelSize;
    const motionSpread = getMotionSpawnSpread(motion, viewport, 1.4);
    const windLead = Math.max(0, Math.abs(this.options.wind) * 0.3);
    const x = farSpawn
      ? this.getRandomRange(
          viewport.width / 2 - motionSpread,
          viewport.width / 2 + motionSpread
        )
      : this.getRandomRange(-windLead, viewport.width + windLead);
    const y = isEmber
      ? farSpawn
        ? this.getRandomRange(viewport.height * 0.05, viewport.height + pixel * 10)
        : this.getRandomRange(viewport.height * 0.65, viewport.height + pixel * 6)
      : farSpawn
        ? this.getRandomRange(-viewport.height * 0.85, viewport.height * 1.1)
        : this.getRandomRange(0, viewport.height);

    this.particles.push({
      age: 0,
      depth,
      kind: isEmber ? "ember" : "ash",
      life: isEmber
        ? this.getRandomRange(0.75, 1.8) * (farSpawn ? 1.8 : 1)
        : this.getRandomRange(2.4, 5.2) * (farSpawn ? 1.45 : 1),
      seed: this.options.random(),
      size: pixel * (isEmber && depth > 0.72 ? 2 : 1),
      speed: isEmber
        ? this.getRandomRange(42, 110)
        : this.getRandomRange(8, 28),
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

export const createAtmosphericAshEmberEffect = (
  options?: AtmosphericAshEmberOptions
): AtmosphericAshEmberEffect => new AtmosphericAshEmberEffect(options);
