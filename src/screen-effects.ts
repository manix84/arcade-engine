export interface ScreenEffectViewport {
  height: number;
  width: number;
}

export interface ScreenEffectUpdateState {
  deltaTime: number;
  intensity: number;
  viewport: ScreenEffectViewport;
}

export interface ScreenEffectRenderState {
  intensity: number;
}

export interface ScreenEffectInstance {
  destroy?: () => void;
  render: (
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    state: ScreenEffectRenderState
  ) => void;
  update: (state: ScreenEffectUpdateState) => void;
}

export interface ScreenEffectDefinition {
  create: (options?: Record<string, unknown>) => ScreenEffectInstance;
  priority?: number;
}

export interface ScreenEffectEnableOptions {
  fadeMs?: number;
  intensity?: number;
  priority?: number;
  settings?: Record<string, unknown>;
}

export interface ScreenEffectManagerOptions {
  registerBuiltIns?: boolean;
}

export interface ScreenEffectRegistration {
  effectId: string;
  isActive: boolean;
  priority: number;
}

interface ActiveScreenEffect {
  definition: ScreenEffectDefinition;
  effect: ScreenEffectInstance;
  fadeMs: number;
  intensity: number;
  isDisabling: boolean;
  priority: number;
  targetIntensity: number;
}

export type ScreenDroplet = {
  age: number;
  alpha: number;
  behaviour: ScreenDropletBehaviour;
  holdTime: number;
  life: number;
  radius: number;
  slideAge: number;
  stretch: number;
  trail: ScreenDropletTrailPoint[];
  trailAlpha: number;
  velocityX: number;
  velocityY: number;
  weight: number;
  x: number;
  y: number;
};

export type ScreenDropletBehaviour = "bead" | "stuck" | "slider" | "heavy-slider";

export type ScreenDropletFocusMode = "arcade" | "fps" | "top-down";

export type ScreenDropletTrailPoint = {
  alpha: number;
  x: number;
  y: number;
};

export type PixelScreenEffectKind =
  | "fire"
  | "frost"
  | "low-health"
  | "poison"
  | "shock"
  | "speed-boost";

export type EnvironmentScreenEffectKind = "heat" | "frost" | "fire" | "underwater";

export type PixelScreenEffectParticle = {
  age: number;
  alpha: number;
  life: number;
  seed: number;
  size: number;
  speed: number;
  x: number;
  y: number;
};

export interface ScreenDropletsConfig {
  fadeSpeed: number;
  focusMode: ScreenDropletFocusMode;
  gravity: number;
  maxDroplets: number;
  maxSize: number;
  mergeEnabled: boolean;
  minSize: number;
  pixelSize: number;
  random: () => number;
  slideChance: number;
  slideSpeed: number;
  trailFadeSpeed: number;
  spawnRate: number;
  trailLength: number;
  wind: number;
}

export const screenDropletsEffectId = "screen-droplets";
export const screenFireEffectId = "screen-fire";
export const screenFrostEffectId = "screen-frost";
export const screenPoisonEffectId = "screen-poison";
export const screenLowHealthEffectId = "screen-low-health";
export const screenShockEffectId = "screen-shock";
export const screenSpeedBoostEffectId = "screen-speed-boost";
export const environmentHeatEffectId = "environment-heat";
export const environmentFrostEffectId = "environment-frost";
export const environmentFireEffectId = "environment-fire";
export const environmentUnderwaterEffectId = "environment-underwater";

export const defaultScreenDropletsConfig: ScreenDropletsConfig = {
  fadeSpeed: 0.95,
  focusMode: "arcade",
  gravity: 92,
  maxDroplets: 58,
  maxSize: 9,
  mergeEnabled: true,
  minSize: 3,
  pixelSize: 0,
  random: Math.random,
  slideChance: 0.54,
  slideSpeed: 138,
  trailFadeSpeed: 4.8,
  spawnRate: 2,
  trailLength: 14,
  wind: 0,
};

const clampScreenEffectIntensity = (value: number | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(1, Math.max(0, value));
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

const getOptionalRandom = (value: unknown): (() => number) | undefined => {
  if (typeof value === "function") {
    return value as () => number;
  }

  return undefined;
};

const normalizeScreenDropletsConfig = (
  options: Record<string, unknown> | undefined
): ScreenDropletsConfig => {
  const config = {
    ...defaultScreenDropletsConfig,
    ...options,
  };

  return {
    fadeSpeed: getFiniteNumber(config.fadeSpeed, defaultScreenDropletsConfig.fadeSpeed),
    focusMode:
      config.focusMode === "fps" || config.focusMode === "top-down" || config.focusMode === "arcade"
        ? config.focusMode
        : defaultScreenDropletsConfig.focusMode,
    gravity: getFiniteNumber(config.gravity, defaultScreenDropletsConfig.gravity),
    maxDroplets: Math.max(
      1,
      Math.floor(getFiniteNumber(config.maxDroplets, defaultScreenDropletsConfig.maxDroplets, 1))
    ),
    maxSize: getFiniteNumber(config.maxSize, defaultScreenDropletsConfig.maxSize, 1),
    mergeEnabled:
      typeof config.mergeEnabled === "boolean"
        ? config.mergeEnabled
        : defaultScreenDropletsConfig.mergeEnabled,
    minSize: getFiniteNumber(config.minSize, defaultScreenDropletsConfig.minSize, 1),
    pixelSize: getFiniteNumber(config.pixelSize, defaultScreenDropletsConfig.pixelSize),
    random: getOptionalRandom(config.random) ?? defaultScreenDropletsConfig.random,
    slideChance: Math.min(
      1,
      getFiniteNumber(config.slideChance, defaultScreenDropletsConfig.slideChance)
    ),
    slideSpeed: getFiniteNumber(config.slideSpeed, defaultScreenDropletsConfig.slideSpeed),
    trailFadeSpeed: getFiniteNumber(
      config.trailFadeSpeed,
      defaultScreenDropletsConfig.trailFadeSpeed
    ),
    spawnRate: getFiniteNumber(config.spawnRate, defaultScreenDropletsConfig.spawnRate),
    trailLength: getFiniteNumber(config.trailLength, defaultScreenDropletsConfig.trailLength),
    wind: getFiniteNumber(config.wind, defaultScreenDropletsConfig.wind, -Infinity),
  };
};

class ScreenDropletsEffect implements ScreenEffectInstance {
  private readonly activeDroplets: ScreenDroplet[] = [];
  private readonly config: ScreenDropletsConfig;
  private readonly pool: ScreenDroplet[] = [];
  private mergeCooldown = 0;
  private spawnAccumulator = 0;

  constructor(options?: Record<string, unknown>) {
    this.config = normalizeScreenDropletsConfig(options);
  }

  destroy = (): void => {
    this.pool.push(...this.activeDroplets);
    this.activeDroplets.length = 0;
    this.mergeCooldown = 0;
    this.spawnAccumulator = 0;
  };

  update = ({ deltaTime, intensity, viewport }: ScreenEffectUpdateState): void => {
    const normalizedDelta = Math.min(0.1, Math.max(0, deltaTime));
    const normalizedIntensity = clampScreenEffectIntensity(intensity);

    if (normalizedIntensity > 0 && viewport.width > 0 && viewport.height > 0) {
      this.spawnAccumulator +=
        normalizedDelta * this.getSpawnRate(normalizedIntensity);

      while (
        this.spawnAccumulator >= 1 &&
        this.activeDroplets.length < this.getMaxActiveDroplets(normalizedIntensity)
      ) {
        this.spawnDroplet(viewport, normalizedIntensity);
        this.spawnAccumulator -= 1;
      }
    }

    for (let index = this.activeDroplets.length - 1; index >= 0; index -= 1) {
      const droplet = this.activeDroplets[index];
      const canSlide =
        droplet.behaviour === "slider" || droplet.behaviour === "heavy-slider";
      const hasStartedSliding = canSlide && droplet.age >= droplet.holdTime;

      droplet.age += normalizedDelta;
      if (hasStartedSliding) {
        droplet.slideAge += normalizedDelta;
        droplet.velocityX +=
          (this.config.wind + this.getRandomRange(-5, 5) * droplet.weight) *
          normalizedDelta;
        droplet.velocityY += this.config.gravity * droplet.weight * normalizedDelta;
        droplet.x += droplet.velocityX * normalizedDelta;
        droplet.y += droplet.velocityY * normalizedDelta;
        this.addTrailPoint(droplet);
      }
      droplet.stretch = hasStartedSliding
        ? 1 + Math.min(1.9, droplet.slideAge * 0.9 + droplet.velocityY / 260)
        : 1;
      this.updateTrail(droplet, normalizedDelta);

      const fadeAge = hasStartedSliding ? droplet.slideAge : Math.max(0, droplet.age - droplet.holdTime);
      const fadeProgress = fadeAge / droplet.life;
      droplet.alpha = Math.max(
        0,
        Math.min(1, 1 - fadeProgress * this.config.fadeSpeed) * normalizedIntensity
      );

      if (
        fadeAge >= droplet.life ||
        (droplet.alpha <= 0.015 && droplet.trail.length === 0) ||
        droplet.y - droplet.radius > viewport.height + this.config.trailLength
      ) {
        this.recycleDroplet(index);
      }
    }

    if (this.config.mergeEnabled) {
      this.mergeCooldown -= normalizedDelta;
      if (this.mergeCooldown <= 0) {
        this.mergeNearbyDroplets();
        this.mergeCooldown = 0.18;
      }
    }
  };

  render = (
    context: CanvasRenderingContext2D,
    _viewport: ScreenEffectViewport,
    state: ScreenEffectRenderState
  ): void => {
    const intensity = clampScreenEffectIntensity(state.intensity);

    if (intensity <= 0 || this.activeDroplets.length === 0) {
      return;
    }

    context.save();
    context.imageSmoothingEnabled = false;

    for (const droplet of this.activeDroplets) {
      const alpha = droplet.alpha * intensity;

      if (alpha <= 0.01) {
        continue;
      }

      this.renderDropletTrail(context, droplet, alpha);
      this.renderDropletBody(context, droplet, alpha);
      this.renderDropletHighlight(context, droplet, alpha);
    }

    context.restore();
  };

  private getMaxActiveDroplets(intensity: number): number {
    return Math.max(3, Math.round(this.config.maxDroplets * (0.08 + intensity * 0.72)));
  }

  private getSpawnRate(intensity: number): number {
    const rate = this.config.spawnRate * intensity;

    return Math.min(50, rate);
  }

  private getRandomRange(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.config.random();
  }

  private getDropletBehaviour(intensity: number): ScreenDropletBehaviour {
    const roll = this.config.random();
    const slideChance = Math.min(1, this.config.slideChance * (0.55 + intensity * 0.7));

    if (roll > slideChance) {
      return roll > 0.82 ? "stuck" : "bead";
    }

    return roll < 0.18 + intensity * 0.18 ? "heavy-slider" : "slider";
  }

  private getHoldTime(behaviour: ScreenDropletBehaviour): number {
    if (behaviour === "bead") {
      return this.getRandomRange(1.8, 4.2);
    }

    if (behaviour === "stuck") {
      return this.getRandomRange(2.4, 5.8);
    }

    if (behaviour === "heavy-slider") {
      return this.getRandomRange(0.36, 0.9);
    }

    return this.getRandomRange(0.28, 0.72);
  }

  private getLife(behaviour: ScreenDropletBehaviour, intensity: number): number {
    if (behaviour === "bead") {
      return this.getRandomRange(2.2, 5.2);
    }

    if (behaviour === "stuck") {
      return this.getRandomRange(3.4, 7.4);
    }

    if (behaviour === "heavy-slider") {
      return this.getRandomRange(2.4, 4.8 - intensity * 0.5);
    }

    return this.getRandomRange(1.7, 3.8 - intensity * 0.35);
  }

  private recycleDroplet(index: number): void {
    const [droplet] = this.activeDroplets.splice(index, 1);

    if (droplet) {
      droplet.trail.length = 0;
      this.pool.push(droplet);
    }
  }

  private spawnDroplet(viewport: ScreenEffectViewport, intensity: number): void {
    const behaviour = this.getDropletBehaviour(intensity);
    const sizeBoost = this.getSizeBoost(behaviour, intensity);
    const radius = this.getRandomRange(this.config.minSize, this.config.maxSize) * sizeBoost;
    const droplet = this.pool.pop() ?? {
      age: 0,
      alpha: 1,
      behaviour,
      holdTime: 0,
      life: 1,
      radius,
      slideAge: 0,
      stretch: 1,
      trail: [],
      trailAlpha: 0,
      velocityX: 0,
      velocityY: 0,
      weight: 1,
      x: 0,
      y: 0,
    };
    const position = this.getSpawnPosition(viewport, radius);

    droplet.x = position.x;
    droplet.y = position.y;
    droplet.behaviour = behaviour;
    droplet.radius = radius;
    droplet.alpha = 1;
    droplet.velocityX = this.config.wind + this.getRandomRange(-5, 5) * (0.35 + intensity);
    droplet.velocityY =
      behaviour === "heavy-slider"
        ? this.config.slideSpeed * this.getRandomRange(0.18, 0.34)
        : this.config.slideSpeed * this.getRandomRange(0.08, 0.22);
    droplet.age = 0;
    droplet.holdTime = this.getHoldTime(behaviour);
    droplet.life = this.getLife(behaviour, intensity);
    droplet.slideAge = 0;
    droplet.stretch = 1;
    droplet.trail.length = 0;
    droplet.trailAlpha = behaviour === "heavy-slider" ? 1 : 0.62;
    droplet.weight = behaviour === "heavy-slider" ? 1.35 : behaviour === "slider" ? 1 : 0.55;
    this.activeDroplets.push(droplet);
  }

  private getSizeBoost(behaviour: ScreenDropletBehaviour, intensity: number): number {
    const focusBoost =
      this.config.focusMode === "fps" ? 1.12 : this.config.focusMode === "top-down" ? 0.82 : 1;
    const behaviourBoost =
      behaviour === "heavy-slider" ? 1.25 : behaviour === "slider" ? 1 : behaviour === "stuck" ? 0.86 : 0.58;

    return focusBoost * behaviourBoost * (0.86 + intensity * 0.22);
  }

  private getSpawnPosition(viewport: ScreenEffectViewport, radius: number): { x: number; y: number } {
    const edgeBias = this.config.random();
    const topBias = this.config.random();
    const preferEdges =
      this.config.focusMode === "top-down" ? 0.78 : this.config.focusMode === "fps" ? 0.34 : 0.52;

    if (edgeBias < preferEdges) {
      const side = this.config.random();

      if (topBias < 0.62) {
        return {
          x: this.getRandomRange(-radius, viewport.width + radius),
          y: this.getRandomRange(-radius * 0.5, viewport.height * 0.26),
        };
      }

      if (side < 0.5) {
        return {
          x: this.getRandomRange(-radius, viewport.width * 0.18),
          y: this.getRandomRange(-radius, viewport.height * 0.82),
        };
      }

      return {
        x: this.getRandomRange(viewport.width * 0.82, viewport.width + radius),
        y: this.getRandomRange(-radius, viewport.height * 0.82),
      };
    }

    const centreInset = this.config.focusMode === "top-down" ? 0.22 : 0.08;

    return {
      x: this.getRandomRange(viewport.width * centreInset, viewport.width * (1 - centreInset)),
      y: this.getRandomRange(-radius * 0.5, viewport.height * 0.72),
    };
  }

  private addTrailPoint(droplet: ScreenDroplet): void {
    const pixelSize = this.getPixelSize(droplet);
    const lastPoint = droplet.trail[droplet.trail.length - 1];

    if (
      lastPoint &&
      Math.abs(lastPoint.x - droplet.x) < pixelSize &&
      Math.abs(lastPoint.y - droplet.y) < pixelSize * 1.5
    ) {
      return;
    }

    droplet.trail.push({
      alpha: droplet.trailAlpha,
      x: droplet.x,
      y: droplet.y - droplet.radius * 0.24,
    });

    const maxTrailPoints = Math.max(2, Math.round(this.config.trailLength / pixelSize));
    if (droplet.trail.length > maxTrailPoints) {
      droplet.trail.splice(0, droplet.trail.length - maxTrailPoints);
    }
  }

  private updateTrail(droplet: ScreenDroplet, deltaTime: number): void {
    for (let index = droplet.trail.length - 1; index >= 0; index -= 1) {
      const point = droplet.trail[index];

      point.alpha -= this.config.trailFadeSpeed * deltaTime;
      if (point.alpha <= 0) {
        droplet.trail.splice(index, 1);
      }
    }
  }

  private mergeNearbyDroplets(): void {
    for (let index = this.activeDroplets.length - 1; index >= 0; index -= 1) {
      const droplet = this.activeDroplets[index];

      for (let otherIndex = index - 1; otherIndex >= 0; otherIndex -= 1) {
        const otherDroplet = this.activeDroplets[otherIndex];
        const distanceX = droplet.x - otherDroplet.x;
        const distanceY = droplet.y - otherDroplet.y;
        const mergeDistance = Math.max(droplet.radius, otherDroplet.radius) * 0.9;

        if (distanceX * distanceX + distanceY * distanceY > mergeDistance * mergeDistance) {
          continue;
        }

        const largerDroplet = droplet.radius >= otherDroplet.radius ? droplet : otherDroplet;
        const smallerIndex = largerDroplet === droplet ? otherIndex : index;
        const smallerDroplet = largerDroplet === droplet ? otherDroplet : droplet;

        largerDroplet.radius = Math.min(this.config.maxSize * 1.35, largerDroplet.radius + smallerDroplet.radius * 0.18);
        largerDroplet.weight = Math.min(1.8, largerDroplet.weight + smallerDroplet.weight * 0.12);
        largerDroplet.velocityY = Math.max(largerDroplet.velocityY, smallerDroplet.velocityY * 0.85);
        largerDroplet.trailAlpha = Math.min(1.2, largerDroplet.trailAlpha + 0.16);
        this.recycleDroplet(smallerIndex);
        break;
      }
    }
  }

  private renderDropletBody(
    context: CanvasRenderingContext2D,
    droplet: ScreenDroplet,
    alpha: number
  ): void {
    const pixelSize = this.getPixelSize(droplet);
    const width = Math.max(
      pixelSize * 2,
      Math.round((droplet.radius * (1.28 - Math.min(0.28, droplet.stretch * 0.08))) / pixelSize) *
        pixelSize
    );
    const height = Math.max(
      pixelSize * 2,
      Math.round((droplet.radius * (1.12 + Math.max(0, droplet.stretch - 1) * 1.3)) / pixelSize) *
        pixelSize
    );
    const x = this.snapToPixel(droplet.x - width / 2, pixelSize);
    const y = this.snapToPixel(droplet.y - height / 2, pixelSize);

    context.fillStyle = `rgba(124, 211, 255, ${0.075 * alpha})`;
    context.fillRect(x + pixelSize, y, width - pixelSize * 2, pixelSize);
    context.fillRect(x, y + pixelSize, width, height - pixelSize * 2);
    context.fillRect(x + pixelSize, y + height - pixelSize, width - pixelSize * 2, pixelSize);

    context.fillStyle = `rgba(5, 7, 10, ${0.028 * alpha})`;
    context.fillRect(
      x + pixelSize,
      y + pixelSize * 2,
      Math.max(pixelSize, width - pixelSize * 2),
      Math.max(pixelSize, height - pixelSize * 3)
    );
  }

  private renderDropletHighlight(
    context: CanvasRenderingContext2D,
    droplet: ScreenDroplet,
    alpha: number
  ): void {
    const pixelSize = this.getPixelSize(droplet);
    const x = this.snapToPixel(droplet.x - droplet.radius * 0.34, pixelSize);
    const y = this.snapToPixel(
      droplet.y - droplet.radius * droplet.stretch * 0.48,
      pixelSize
    );

    context.fillStyle = `rgba(255, 255, 255, ${0.62 * alpha})`;
    context.fillRect(x, y, pixelSize, pixelSize);
    context.fillRect(x + pixelSize, y, pixelSize, pixelSize);
  }

  private renderDropletTrail(
    context: CanvasRenderingContext2D,
    droplet: ScreenDroplet,
    alpha: number
  ): void {
    if (this.config.trailLength <= 0 || droplet.trail.length === 0) {
      return;
    }

    const pixelSize = this.getPixelSize(droplet);
    const blockSize = Math.max(1, pixelSize - 1);

    for (const point of droplet.trail) {
      const pointAlpha = Math.min(alpha, point.alpha) * 0.09;

      if (pointAlpha <= 0.004) {
        continue;
      }

      context.fillStyle = `rgba(150, 190, 220, ${pointAlpha})`;
      context.fillRect(
        this.snapToPixel(point.x, pixelSize),
        this.snapToPixel(point.y, pixelSize),
        blockSize,
        blockSize
      );
    }
  }

  private getPixelSize(droplet: ScreenDroplet): number {
    return Math.max(2, Math.round(droplet.radius / 3));
  }

  private snapToPixel(value: number, pixelSize: number): number {
    return Math.round(value / pixelSize) * pixelSize;
  }
}

export interface PixelScreenEffectConfig {
  kind: PixelScreenEffectKind;
  maxParticles: number;
  pixelSize: number;
  random: () => number;
  spawnRate: number;
}

const defaultPixelScreenEffectConfigs: Record<PixelScreenEffectKind, PixelScreenEffectConfig> = {
  fire: {
    kind: "fire",
    maxParticles: 42,
    pixelSize: 6,
    random: Math.random,
    spawnRate: 26,
  },
  frost: {
    kind: "frost",
    maxParticles: 32,
    pixelSize: 5,
    random: Math.random,
    spawnRate: 12,
  },
  "low-health": {
    kind: "low-health",
    maxParticles: 28,
    pixelSize: 7,
    random: Math.random,
    spawnRate: 10,
  },
  poison: {
    kind: "poison",
    maxParticles: 38,
    pixelSize: 6,
    random: Math.random,
    spawnRate: 18,
  },
  shock: {
    kind: "shock",
    maxParticles: 22,
    pixelSize: 5,
    random: Math.random,
    spawnRate: 34,
  },
  "speed-boost": {
    kind: "speed-boost",
    maxParticles: 44,
    pixelSize: 5,
    random: Math.random,
    spawnRate: 38,
  },
};

const normalizePixelScreenEffectConfig = (
  kind: PixelScreenEffectKind,
  options: Record<string, unknown> | undefined
): PixelScreenEffectConfig => {
  const defaults = defaultPixelScreenEffectConfigs[kind];
  const config = {
    ...defaults,
    ...options,
  };

  return {
    kind,
    maxParticles: Math.max(
      1,
      Math.floor(getFiniteNumber(config.maxParticles, defaults.maxParticles, 1))
    ),
    pixelSize: Math.max(2, Math.round(getFiniteNumber(config.pixelSize, defaults.pixelSize, 2))),
    random: getOptionalRandom(config.random) ?? defaults.random,
    spawnRate: getFiniteNumber(config.spawnRate, defaults.spawnRate),
  };
};

class PixelScreenEffect implements ScreenEffectInstance {
  private readonly config: PixelScreenEffectConfig;
  private readonly particles: PixelScreenEffectParticle[] = [];
  private readonly pool: PixelScreenEffectParticle[] = [];
  private spawnAccumulator = 0;
  private time = 0;

  constructor(kind: PixelScreenEffectKind, options?: Record<string, unknown>) {
    this.config = normalizePixelScreenEffectConfig(kind, options);
  }

  destroy = (): void => {
    this.pool.push(...this.particles);
    this.particles.length = 0;
    this.spawnAccumulator = 0;
    this.time = 0;
  };

  update = ({ deltaTime, intensity, viewport }: ScreenEffectUpdateState): void => {
    const normalizedDelta = Math.min(0.1, Math.max(0, deltaTime));
    const normalizedIntensity = clampScreenEffectIntensity(intensity);

    this.time += normalizedDelta;

    if (normalizedIntensity > 0 && viewport.width > 0 && viewport.height > 0) {
      this.spawnAccumulator += normalizedDelta * this.config.spawnRate * (0.35 + normalizedIntensity);
      const maxParticles = Math.max(
        2,
        Math.round(this.config.maxParticles * (0.22 + normalizedIntensity * 0.78))
      );

      while (this.spawnAccumulator >= 1 && this.particles.length < maxParticles) {
        this.spawnParticle(viewport, normalizedIntensity);
        this.spawnAccumulator -= 1;
      }
    }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];

      particle.age += normalizedDelta;
      this.moveParticle(particle, normalizedDelta, viewport);
      particle.alpha = Math.max(0, 1 - particle.age / particle.life);

      if (particle.alpha <= 0 || this.isParticleOutside(particle, viewport)) {
        this.recycleParticle(index);
      }
    }
  };

  render = (
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    state: ScreenEffectRenderState
  ): void => {
    const intensity = clampScreenEffectIntensity(state.intensity);

    if (intensity <= 0) {
      return;
    }

    context.save();
    context.imageSmoothingEnabled = false;

    if (this.config.kind === "fire") {
      this.renderFire(context, viewport, intensity);
    } else if (this.config.kind === "frost") {
      this.renderFrost(context, viewport, intensity);
    } else if (this.config.kind === "low-health") {
      this.renderLowHealth(context, viewport, intensity);
    } else if (this.config.kind === "poison") {
      this.renderPoison(context, viewport, intensity);
    } else if (this.config.kind === "shock") {
      this.renderShock(context, viewport, intensity);
    } else {
      this.renderSpeedBoost(context, viewport, intensity);
    }

    context.restore();
  };

  private spawnParticle(viewport: ScreenEffectViewport, intensity: number): void {
    const particle = this.pool.pop() ?? {
      age: 0,
      alpha: 1,
      life: 1,
      seed: 0,
      size: this.config.pixelSize,
      speed: 0,
      x: 0,
      y: 0,
    };
    const edge = this.config.random();
    const edgeInset = this.config.kind === "low-health" ? 0.09 : 0.17;
    const edgePosition = this.config.random();

    particle.age = 0;
    particle.alpha = 1;
    particle.life = this.getRandomRange(0.7, 1.8 + intensity * 1.4);
    particle.seed = this.config.random();
    particle.size =
      this.config.pixelSize *
      Math.max(1, Math.round(this.getRandomRange(1, this.config.kind === "frost" ? 3 : 4)));
    particle.speed = this.getRandomRange(18, 56 + intensity * 80);

    if (this.config.kind === "fire") {
      particle.x = this.snap(this.getRandomRange(0, viewport.width));
      particle.y = this.snap(viewport.height - this.getRandomRange(0, viewport.height * 0.2));
    } else if (this.config.kind === "speed-boost") {
      particle.x = this.snap(viewport.width * this.getRandomRange(0.34, 0.66));
      particle.y = this.snap(viewport.height * this.getRandomRange(0.32, 0.68));
    } else if (edge < 0.25) {
      particle.x = this.snap(edgePosition * viewport.width);
      particle.y = this.snap(this.getRandomRange(0, viewport.height * edgeInset));
    } else if (edge < 0.5) {
      particle.x = this.snap(edgePosition * viewport.width);
      particle.y = this.snap(viewport.height - this.getRandomRange(0, viewport.height * edgeInset));
    } else if (edge < 0.75) {
      particle.x = this.snap(this.getRandomRange(0, viewport.width * edgeInset));
      particle.y = this.snap(edgePosition * viewport.height);
    } else {
      particle.x = this.snap(viewport.width - this.getRandomRange(0, viewport.width * edgeInset));
      particle.y = this.snap(edgePosition * viewport.height);
    }

    this.particles.push(particle);
  }

  private moveParticle(
    particle: PixelScreenEffectParticle,
    deltaTime: number,
    viewport: ScreenEffectViewport
  ): void {
    const wobble = Math.round(Math.sin((this.time + particle.seed * 8) * 7) * this.config.pixelSize);

    if (this.config.kind === "fire") {
      particle.y -= particle.speed * deltaTime;
      particle.x += wobble * deltaTime * 5;
      return;
    }

    if (this.config.kind === "frost") {
      const centreX = viewport.width / 2;
      const centreY = viewport.height / 2;
      particle.x += Math.sign(centreX - particle.x) * particle.speed * deltaTime * 0.18;
      particle.y += Math.sign(centreY - particle.y) * particle.speed * deltaTime * 0.18;
      return;
    }

    if (this.config.kind === "poison") {
      particle.x += (particle.seed < 0.5 ? -1 : 1) * particle.speed * deltaTime * 0.26 + wobble;
      particle.y -= particle.speed * deltaTime * 0.12;
      return;
    }

    if (this.config.kind === "shock") {
      particle.x += wobble * deltaTime * 7;
      particle.y += Math.sin((this.time + particle.seed) * 24) * this.config.pixelSize * deltaTime * 4;
      return;
    }

    if (this.config.kind === "speed-boost") {
      const centreX = viewport.width / 2;
      const centreY = viewport.height / 2;
      const dx = particle.x - centreX || (particle.seed < 0.5 ? -1 : 1);
      const dy = particle.y - centreY || (particle.seed < 0.25 ? -1 : 1);
      const distance = Math.max(1, Math.hypot(dx, dy));
      const speed = particle.speed * (1.1 + particle.seed * 0.9);

      particle.x += (dx / distance) * speed * deltaTime;
      particle.y += (dy / distance) * speed * deltaTime;
      return;
    }

    particle.x += wobble * deltaTime * 3;
    particle.y += Math.sin(this.time * 5 + particle.seed * 4) * this.config.pixelSize * deltaTime;
  }

  private isParticleOutside(
    particle: PixelScreenEffectParticle,
    viewport: ScreenEffectViewport
  ): boolean {
    const margin = this.config.pixelSize * 8;

    return (
      particle.x < -margin ||
      particle.x > viewport.width + margin ||
      particle.y < -margin ||
      particle.y > viewport.height + margin
    );
  }

  private recycleParticle(index: number): void {
    const [particle] = this.particles.splice(index, 1);

    if (particle) {
      this.pool.push(particle);
    }
  }

  private renderFire(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const pixel = this.config.pixelSize;
    const pulse = this.getPulse(5, 0.16);
    const bandHeight = this.snap(viewport.height * (0.06 + intensity * 0.11));

    context.fillStyle = `rgba(92, 23, 8, ${0.12 * intensity})`;
    this.fillEdgeBands(context, viewport, pixel, bandHeight);

    for (let x = 0; x < viewport.width; x += pixel * 3) {
      const height = this.snap(pixel * (2 + ((x / pixel + Math.round(this.time * 7)) % 5)));
      const alpha = (0.13 + pulse) * intensity;

      context.fillStyle = `rgba(255, 103, 24, ${alpha})`;
      context.fillRect(x, viewport.height - height, pixel * 2, height);
      context.fillStyle = `rgba(255, 205, 84, ${alpha * 0.65})`;
      context.fillRect(x + pixel, viewport.height - Math.max(pixel, height - pixel * 2), pixel, pixel * 2);
    }

    for (const particle of this.particles) {
      const alpha = particle.alpha * intensity;

      context.fillStyle = particle.seed > 0.42
        ? `rgba(255, 188, 67, ${0.28 * alpha})`
        : `rgba(255, 72, 24, ${0.2 * alpha})`;
      context.fillRect(this.snap(particle.x), this.snap(particle.y), particle.size, particle.size);
    }
  }

  private renderFrost(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const pixel = this.config.pixelSize;
    const bandHeight = this.snap(viewport.height * (0.05 + intensity * 0.13));

    context.fillStyle = `rgba(162, 226, 255, ${0.12 * intensity})`;
    this.fillEdgeBands(context, viewport, pixel, bandHeight);

    for (let step = 0; step < 7 + Math.round(intensity * 6); step += 1) {
      const branch = pixel * (step + 1);
      const length = this.snap(pixel * (2 + ((step + Math.round(this.time * 2)) % 4)));

      context.fillStyle = `rgba(230, 250, 255, ${0.22 * intensity})`;
      context.fillRect(branch, bandHeight - pixel, length, pixel);
      context.fillRect(viewport.width - branch - length, bandHeight - pixel, length, pixel);
      context.fillRect(branch, viewport.height - bandHeight, length, pixel);
      context.fillRect(viewport.width - branch - length, viewport.height - bandHeight, length, pixel);
      context.fillRect(bandHeight - pixel, branch, pixel, length);
      context.fillRect(viewport.width - bandHeight, branch, pixel, length);
    }

    for (const particle of this.particles) {
      const alpha = particle.alpha * intensity;

      context.fillStyle = `rgba(210, 244, 255, ${0.24 * alpha})`;
      context.fillRect(this.snap(particle.x), this.snap(particle.y), particle.size, pixel);
      context.fillRect(this.snap(particle.x), this.snap(particle.y), pixel, particle.size);
    }
  }

  private renderPoison(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const pixel = this.config.pixelSize;
    const pulse = 0.68 + this.getPulse(2.1, 0.32);
    const bandHeight = this.snap(viewport.height * (0.05 + intensity * 0.1));
    const drift = this.snap(Math.sin(this.time * 2.4) * pixel * 2);

    context.fillStyle = `rgba(72, 138, 43, ${0.08 * intensity * pulse})`;
    this.fillEdgeBands(context, viewport, pixel, bandHeight);
    context.fillStyle = `rgba(86, 39, 126, ${0.055 * intensity * pulse})`;
    this.fillEdgeBands(context, viewport, pixel, Math.max(pixel, bandHeight - pixel * 2));

    for (let y = bandHeight; y < viewport.height - bandHeight; y += pixel * 6) {
      context.fillStyle = `rgba(132, 220, 76, ${0.07 * intensity * pulse})`;
      context.fillRect(0, y + drift, pixel * 2, pixel * 2);
      context.fillRect(viewport.width - pixel * 2, y - drift, pixel * 2, pixel * 2);
      context.fillStyle = `rgba(142, 78, 190, ${0.06 * intensity * pulse})`;
      context.fillRect(pixel, y - drift, pixel, pixel);
      context.fillRect(viewport.width - pixel * 2, y + drift, pixel, pixel);
    }

    for (const particle of this.particles) {
      const alpha = particle.alpha * intensity;
      const size = Math.max(pixel, particle.size - pixel);

      context.fillStyle = `rgba(151, 234, 86, ${0.2 * alpha * pulse})`;
      context.fillRect(this.snap(particle.x), this.snap(particle.y), size, pixel);
      context.fillRect(this.snap(particle.x + pixel), this.snap(particle.y + pixel), pixel, size);
      context.fillStyle = particle.seed > 0.55
        ? `rgba(151, 76, 190, ${0.12 * alpha * pulse})`
        : `rgba(48, 88, 35, ${0.11 * alpha * pulse})`;
      context.fillRect(this.snap(particle.x + pixel), this.snap(particle.y), pixel, pixel);
    }

    for (let index = 0; index < 18 * intensity; index += 1) {
      const x = this.snap((index * 47 + Math.round(this.time * 18) * 13) % viewport.width);
      const y = this.snap((index * 31 + Math.round(this.time * 11) * 17) % viewport.height);
      const nearEdge =
        x < bandHeight ||
        x > viewport.width - bandHeight ||
        y < bandHeight ||
        y > viewport.height - bandHeight;

      if (nearEdge) {
        context.fillStyle = index % 3 === 0
          ? `rgba(168, 94, 206, ${0.12 * intensity})`
          : `rgba(150, 235, 96, ${0.1 * intensity})`;
        context.fillRect(x, y, pixel, pixel);
      }
    }
  }

  private renderLowHealth(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const pixel = this.config.pixelSize;
    const heartbeat = Math.max(0, Math.sin(this.time * 4.2));
    const pulse = heartbeat * heartbeat * (0.16 + intensity * 0.2);
    const bandHeight = this.snap(viewport.height * (0.04 + intensity * 0.13 + pulse * 0.04));
    const alpha = (0.08 + pulse) * intensity;

    context.fillStyle = `rgba(136, 16, 24, ${alpha})`;
    this.fillEdgeBands(context, viewport, pixel, bandHeight);
    context.fillStyle = `rgba(16, 4, 7, ${pulse * 0.28 * intensity})`;
    this.fillEdgeBands(context, viewport, pixel, Math.max(pixel, bandHeight - pixel));

    for (let x = pixel; x < viewport.width; x += pixel * 5) {
      const height = pixel * (1 + ((x / pixel + Math.round(this.time * 4)) % 3));

      context.fillStyle = `rgba(255, 72, 80, ${(0.08 + pulse * 0.4) * intensity})`;
      context.fillRect(x, bandHeight - pixel, pixel * 2, height);
      context.fillRect(viewport.width - x - pixel * 2, viewport.height - bandHeight, pixel * 2, height);
    }

    for (const particle of this.particles) {
      const particleAlpha = particle.alpha * intensity;

      context.fillStyle = particle.seed > 0.7
        ? `rgba(255, 150, 138, ${0.2 * particleAlpha})`
        : `rgba(190, 30, 42, ${0.24 * particleAlpha})`;
      context.fillRect(this.snap(particle.x), this.snap(particle.y), particle.size, pixel);
      context.fillRect(this.snap(particle.x), this.snap(particle.y + pixel), pixel, particle.size);
    }
  }

  private renderShock(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const pixel = this.config.pixelSize;
    const burstProgress = (this.time * (3.8 + intensity * 2.4)) % 1;
    const burst = burstProgress < 0.18 ? (1 - burstProgress / 0.18) * intensity : 0;
    const bandHeight = this.snap(viewport.height * (0.035 + burst * 0.06));

    if (burst > 0) {
      this.renderGlitchSlices(context, viewport, burst);
      context.fillStyle = `rgba(172, 225, 255, ${0.12 * burst})`;
      this.fillEdgeBands(context, viewport, pixel, Math.max(pixel, bandHeight));
      context.fillStyle = `rgba(255, 255, 255, ${0.05 * burst})`;
      context.fillRect(0, 0, viewport.width, viewport.height);
    }

    const arcCount = 4 + Math.round(intensity * 6);

    for (let index = 0; index < arcCount; index += 1) {
      const side = index % 4;
      const offset = this.snap((index * 37 + Math.round(this.time * 32) * 9) % 120);
      const length = pixel * (2 + ((index + Math.round(this.time * 20)) % 5));
      const alpha = (0.16 + burst * 0.42) * intensity;
      let x = side === 1 ? viewport.width - pixel * 2 : pixel * 2;
      let y = side === 2 ? viewport.height - pixel * 2 : pixel * 2;

      if (side < 2) {
        y = this.snap(offset + viewport.height * 0.12);
      } else {
        x = this.snap(offset + viewport.width * 0.15);
      }

      context.fillStyle = `rgba(94, 202, 255, ${alpha})`;
      context.fillRect(x, y, length, pixel);
      context.fillRect(x + length - pixel, y + pixel, pixel, length);
      context.fillStyle = `rgba(245, 252, 255, ${alpha * 0.78})`;
      context.fillRect(x + pixel, y, Math.max(pixel, length - pixel * 2), pixel);
    }

    for (const particle of this.particles) {
      const alpha = particle.alpha * intensity * (0.45 + burst);

      context.fillStyle = particle.seed > 0.45
        ? `rgba(255, 255, 255, ${0.28 * alpha})`
        : `rgba(80, 190, 255, ${0.24 * alpha})`;
      context.fillRect(this.snap(particle.x), this.snap(particle.y), pixel, pixel);
      context.fillRect(this.snap(particle.x + pixel), this.snap(particle.y), pixel, pixel);
    }
  }

  private renderSpeedBoost(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const pixel = this.config.pixelSize;
    const centreX = viewport.width / 2;
    const centreY = viewport.height / 2;
    const pulse = 0.55 + this.getPulse(7 + intensity * 5, 0.45);
    const band = this.snap(Math.min(viewport.width, viewport.height) * (0.03 + intensity * 0.04));

    context.fillStyle = `rgba(64, 196, 220, ${0.035 * intensity * pulse})`;
    this.fillEdgeBands(context, viewport, pixel, band);

    for (const particle of this.particles) {
      const dx = particle.x - centreX;
      const dy = particle.y - centreY;
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      const alpha = particle.alpha * intensity * pulse;
      const length = Math.max(pixel * 2, this.snap(particle.size * (2 + intensity * 3)));
      const x = this.snap(particle.x);
      const y = this.snap(particle.y);

      context.fillStyle = particle.seed > 0.58
        ? `rgba(238, 254, 255, ${0.2 * alpha})`
        : `rgba(64, 213, 238, ${0.18 * alpha})`;

      if (horizontal) {
        const startX = dx < 0 ? x - length : x;

        context.fillRect(startX, y, length, pixel);
        context.fillRect(startX + (dx < 0 ? 0 : length - pixel), y - pixel, pixel, pixel);
      } else {
        const startY = dy < 0 ? y - length : y;

        context.fillRect(x, startY, pixel, length);
        context.fillRect(x - pixel, startY + (dy < 0 ? 0 : length - pixel), pixel, pixel);
      }
    }
  }

  private renderGlitchSlices(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const canvas = context.canvas;

    if (!canvas || canvas.width <= 0 || canvas.height <= 0) {
      return;
    }

    const pixel = this.config.pixelSize;

    for (let index = 0; index < 4; index += 1) {
      const y = this.snap((index * 53 + Math.round(this.time * 60) * 7) % viewport.height);
      const height = pixel * (1 + (index % 2));
      const offset = (index % 2 === 0 ? 1 : -1) * pixel * (1 + Math.round(intensity * 2));

      context.drawImage(canvas, 0, y, viewport.width, height, offset, y, viewport.width, height);
    }
  }

  private fillEdgeBands(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    pixel: number,
    bandHeight: number
  ): void {
    const bandWidth = this.snap(viewport.width * 0.1);

    context.fillRect(0, 0, viewport.width, bandHeight);
    context.fillRect(0, viewport.height - bandHeight, viewport.width, bandHeight);
    context.fillRect(0, bandHeight, bandWidth, Math.max(pixel, viewport.height - bandHeight * 2));
    context.fillRect(
      viewport.width - bandWidth,
      bandHeight,
      bandWidth,
      Math.max(pixel, viewport.height - bandHeight * 2)
    );
  }

  private getPulse(speed: number, amount: number): number {
    return (0.5 + Math.sin(this.time * speed) * 0.5) * amount;
  }

  private getRandomRange(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.config.random();
  }

  private snap(value: number): number {
    return Math.round(value / this.config.pixelSize) * this.config.pixelSize;
  }
}

export interface EnvironmentScreenEffectConfig {
  kind: EnvironmentScreenEffectKind;
  maxParticles: number;
  pixelSize: number;
  random: () => number;
  spawnRate: number;
}

const defaultEnvironmentScreenEffectConfigs: Record<
  EnvironmentScreenEffectKind,
  EnvironmentScreenEffectConfig
> = {
  fire: {
    kind: "fire",
    maxParticles: 46,
    pixelSize: 6,
    random: Math.random,
    spawnRate: 24,
  },
  frost: {
    kind: "frost",
    maxParticles: 42,
    pixelSize: 5,
    random: Math.random,
    spawnRate: 13,
  },
  heat: {
    kind: "heat",
    maxParticles: 24,
    pixelSize: 6,
    random: Math.random,
    spawnRate: 10,
  },
  underwater: {
    kind: "underwater",
    maxParticles: 44,
    pixelSize: 5,
    random: Math.random,
    spawnRate: 16,
  },
};

const normalizeEnvironmentScreenEffectConfig = (
  kind: EnvironmentScreenEffectKind,
  options: Record<string, unknown> | undefined
): EnvironmentScreenEffectConfig => {
  const defaults = defaultEnvironmentScreenEffectConfigs[kind];
  const config = {
    ...defaults,
    ...options,
  };

  return {
    kind,
    maxParticles: Math.max(
      1,
      Math.floor(getFiniteNumber(config.maxParticles, defaults.maxParticles, 1))
    ),
    pixelSize: Math.max(2, Math.round(getFiniteNumber(config.pixelSize, defaults.pixelSize, 2))),
    random: getOptionalRandom(config.random) ?? defaults.random,
    spawnRate: getFiniteNumber(config.spawnRate, defaults.spawnRate),
  };
};

class EnvironmentScreenEffect implements ScreenEffectInstance {
  private readonly config: EnvironmentScreenEffectConfig;
  private readonly particles: PixelScreenEffectParticle[] = [];
  private readonly pool: PixelScreenEffectParticle[] = [];
  private spawnAccumulator = 0;
  private time = 0;

  constructor(kind: EnvironmentScreenEffectKind, options?: Record<string, unknown>) {
    this.config = normalizeEnvironmentScreenEffectConfig(kind, options);
  }

  destroy = (): void => {
    this.pool.push(...this.particles);
    this.particles.length = 0;
    this.spawnAccumulator = 0;
    this.time = 0;
  };

  update = ({ deltaTime, intensity, viewport }: ScreenEffectUpdateState): void => {
    const normalizedDelta = Math.min(0.1, Math.max(0, deltaTime));
    const normalizedIntensity = clampScreenEffectIntensity(intensity);

    this.time += normalizedDelta;

    if (normalizedIntensity > 0 && viewport.width > 0 && viewport.height > 0) {
      this.spawnAccumulator += normalizedDelta * this.config.spawnRate * (0.3 + normalizedIntensity);
      const maxParticles = Math.max(
        2,
        Math.round(this.config.maxParticles * (0.18 + normalizedIntensity * 0.82))
      );

      while (this.spawnAccumulator >= 1 && this.particles.length < maxParticles) {
        this.spawnParticle(viewport, normalizedIntensity);
        this.spawnAccumulator -= 1;
      }
    }

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];

      particle.age += normalizedDelta;
      this.moveParticle(particle, normalizedDelta);
      particle.alpha = Math.max(0, 1 - particle.age / particle.life);

      if (particle.alpha <= 0 || this.isParticleOutside(particle, viewport)) {
        this.recycleParticle(index);
      }
    }
  };

  render = (
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    state: ScreenEffectRenderState
  ): void => {
    const intensity = clampScreenEffectIntensity(state.intensity);

    if (intensity <= 0) {
      return;
    }

    context.save();
    context.imageSmoothingEnabled = false;

    if (this.config.kind === "heat") {
      this.renderHeat(context, viewport, intensity);
    } else if (this.config.kind === "frost") {
      this.renderFrost(context, viewport, intensity);
    } else if (this.config.kind === "fire") {
      this.renderFire(context, viewport, intensity);
    } else {
      this.renderUnderwater(context, viewport, intensity);
    }

    context.restore();
  };

  private spawnParticle(viewport: ScreenEffectViewport, intensity: number): void {
    const particle = this.pool.pop() ?? {
      age: 0,
      alpha: 1,
      life: 1,
      seed: 0,
      size: this.config.pixelSize,
      speed: 0,
      x: 0,
      y: 0,
    };
    const pixel = this.config.pixelSize;
    const edge = this.config.random();

    particle.age = 0;
    particle.alpha = 1;
    particle.life = this.getRandomRange(1.1, 2.8 + intensity * 1.4);
    particle.seed = this.config.random();
    particle.size = pixel * Math.max(1, Math.round(this.getRandomRange(1, 4)));
    particle.speed = this.getRandomRange(12, 48 + intensity * 58);

    if (this.config.kind === "underwater") {
      particle.x = this.snap(this.getRandomRange(0, viewport.width));
      particle.y = this.snap(viewport.height + this.getRandomRange(0, viewport.height * 0.16));
    } else if (this.config.kind === "heat" || this.config.kind === "fire") {
      particle.x = this.snap(this.getRandomRange(0, viewport.width));
      particle.y = this.snap(viewport.height - this.getRandomRange(0, viewport.height * 0.25));
    } else if (edge < 0.25) {
      particle.x = this.snap(this.getRandomRange(0, viewport.width));
      particle.y = this.snap(this.getRandomRange(0, viewport.height * 0.16));
    } else if (edge < 0.5) {
      particle.x = this.snap(this.getRandomRange(0, viewport.width));
      particle.y = this.snap(viewport.height - this.getRandomRange(0, viewport.height * 0.16));
    } else if (edge < 0.75) {
      particle.x = this.snap(this.getRandomRange(0, viewport.width * 0.16));
      particle.y = this.snap(this.getRandomRange(0, viewport.height));
    } else {
      particle.x = this.snap(viewport.width - this.getRandomRange(0, viewport.width * 0.16));
      particle.y = this.snap(this.getRandomRange(0, viewport.height));
    }

    this.particles.push(particle);
  }

  private moveParticle(particle: PixelScreenEffectParticle, deltaTime: number): void {
    const pixel = this.config.pixelSize;
    const wobble = this.snap(Math.sin(this.time * 2 + particle.seed * 9) * pixel);

    if (this.config.kind === "underwater") {
      particle.y -= particle.speed * deltaTime * 0.46;
      particle.x += wobble * deltaTime * 3;
      return;
    }

    if (this.config.kind === "frost") {
      particle.x += Math.sign(0.5 - particle.seed) * pixel * deltaTime * 2;
      particle.y += Math.sin(this.time + particle.seed * 6) * pixel * deltaTime;
      return;
    }

    particle.y -= particle.speed * deltaTime;
    particle.x += wobble * deltaTime * (this.config.kind === "heat" ? 2 : 4);
  }

  private isParticleOutside(
    particle: PixelScreenEffectParticle,
    viewport: ScreenEffectViewport
  ): boolean {
    const margin = this.config.pixelSize * 10;

    return (
      particle.x < -margin ||
      particle.x > viewport.width + margin ||
      particle.y < -margin ||
      particle.y > viewport.height + margin
    );
  }

  private recycleParticle(index: number): void {
    const [particle] = this.particles.splice(index, 1);

    if (particle) {
      this.pool.push(particle);
    }
  }

  private renderHeat(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const pixel = this.config.pixelSize;

    this.renderHorizontalSliceDistortion(context, viewport, intensity, 0.38, 5);
    context.fillStyle = `rgba(255, 177, 83, ${0.045 * intensity})`;
    context.fillRect(0, 0, viewport.width, viewport.height);

    for (let y = pixel * 3; y < viewport.height - pixel * 3; y += pixel * 7) {
      const offset = this.snap(Math.sin(this.time * 3 + y * 0.04) * pixel);

      context.fillStyle = `rgba(255, 221, 145, ${0.055 * intensity})`;
      context.fillRect(Math.max(0, offset), y, viewport.width - Math.abs(offset), pixel);
    }

    for (const particle of this.particles) {
      const alpha = particle.alpha * intensity;

      context.fillStyle = `rgba(255, 216, 130, ${0.12 * alpha})`;
      context.fillRect(this.snap(particle.x), this.snap(particle.y), particle.size * 2, pixel);
      context.fillRect(this.snap(particle.x + pixel), this.snap(particle.y - pixel), particle.size, pixel);
    }

    this.renderEdgeGlow(context, viewport, `rgba(255, 212, 135, ${0.08 * intensity + this.getPulse(4, 0.045) * intensity})`);
  }

  private renderFrost(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const pixel = this.config.pixelSize;
    const growth = this.snap(viewport.height * (0.05 + intensity * 0.16));

    context.fillStyle = `rgba(158, 221, 255, ${0.055 * intensity})`;
    context.fillRect(0, 0, viewport.width, viewport.height);
    context.fillStyle = `rgba(190, 237, 255, ${0.16 * intensity})`;
    this.fillIrregularEdges(context, viewport, growth);

    for (let index = 0; index < 10 + intensity * 14; index += 1) {
      const cornerX = index % 2 === 0 ? pixel * (1 + index) : viewport.width - pixel * (3 + index);
      const cornerY = index % 3 === 0 ? pixel * (1 + index) : viewport.height - pixel * (3 + index);
      const branch = pixel * (2 + (index % 4));

      context.fillStyle = `rgba(235, 252, 255, ${0.18 * intensity})`;
      context.fillRect(this.snap(cornerX), this.snap(cornerY), branch, pixel);
      context.fillRect(this.snap(cornerX), this.snap(cornerY), pixel, branch);
    }

    for (const particle of this.particles) {
      const alpha = particle.alpha * intensity;

      context.fillStyle = `rgba(220, 247, 255, ${0.13 * alpha})`;
      context.fillRect(this.snap(particle.x), this.snap(particle.y), particle.size * 2, pixel * 2);
    }
  }

  private renderFire(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const pixel = this.config.pixelSize;
    const flameHeight = this.snap(viewport.height * (0.04 + intensity * 0.1));

    this.renderHorizontalSliceDistortion(context, viewport, intensity, 0.2, 7);
    context.fillStyle = `rgba(120, 28, 9, ${0.075 * intensity + this.getPulse(6, 0.04) * intensity})`;
    this.fillEdgeBands(context, viewport, flameHeight);

    for (let x = 0; x < viewport.width; x += pixel * 4) {
      const height = pixel * (2 + ((x / pixel + Math.round(this.time * 8)) % 4));

      context.fillStyle = `rgba(242, 78, 28, ${0.2 * intensity})`;
      context.fillRect(x, viewport.height - height, pixel * 2, height);
      context.fillStyle = `rgba(255, 188, 61, ${0.14 * intensity})`;
      context.fillRect(x + pixel, viewport.height - Math.max(pixel, height - pixel * 2), pixel, pixel * 2);
    }

    for (const particle of this.particles) {
      const alpha = particle.alpha * intensity;
      const isSmoke = particle.seed < 0.22;

      context.fillStyle = isSmoke
        ? `rgba(66, 63, 58, ${0.11 * alpha})`
        : `rgba(255, 156, 58, ${0.24 * alpha})`;
      context.fillRect(this.snap(particle.x), this.snap(particle.y), particle.size, isSmoke ? pixel * 2 : pixel);
    }
  }

  private renderUnderwater(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number
  ): void {
    const pixel = this.config.pixelSize;

    this.renderHorizontalSliceDistortion(context, viewport, intensity, 0.32, 12);
    context.fillStyle = `rgba(45, 151, 157, ${0.085 * intensity})`;
    context.fillRect(0, 0, viewport.width, viewport.height);

    for (let y = pixel * 4; y < viewport.height; y += pixel * 9) {
      const offset = this.snap(Math.sin(this.time * 1.4 + y * 0.025) * pixel * 1.5);

      context.fillStyle = `rgba(121, 224, 214, ${0.055 * intensity})`;
      context.fillRect(Math.max(0, offset), y, viewport.width - Math.abs(offset), pixel);
    }

    for (const particle of this.particles) {
      const alpha = particle.alpha * intensity;
      const isBubble = particle.seed > 0.34;

      context.fillStyle = isBubble
        ? `rgba(187, 246, 255, ${0.18 * alpha})`
        : `rgba(25, 73, 68, ${0.14 * alpha})`;
      context.fillRect(this.snap(particle.x), this.snap(particle.y), particle.size, pixel);
      if (isBubble) {
        context.fillRect(this.snap(particle.x + pixel), this.snap(particle.y - pixel), pixel, pixel);
      }
    }

    context.fillStyle = `rgba(2, 18, 24, ${0.12 * intensity})`;
    this.fillEdgeBands(context, viewport, this.snap(viewport.height * (0.07 + intensity * 0.09)));
  }

  private renderHorizontalSliceDistortion(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    intensity: number,
    scale: number,
    spacing: number
  ): void {
    const source = context.canvas;
    const pixel = this.config.pixelSize;

    if (!source || viewport.width <= 0 || viewport.height <= 0) {
      return;
    }

    for (let y = pixel * 2; y < viewport.height - pixel * 2; y += pixel * spacing) {
      const rawOffset = Math.sin(this.time * spacing + y * 0.03) * pixel * scale * intensity;

      if (Math.abs(rawOffset) < 0.4) {
        continue;
      }

      const offset =
        Math.sign(rawOffset) * Math.max(pixel, Math.abs(this.snap(rawOffset)));

      if (offset === 0) {
        continue;
      }

      context.drawImage(source, 0, y, viewport.width, pixel * 2, offset, y, viewport.width, pixel * 2);
    }
  }

  private fillEdgeBands(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    bandHeight: number
  ): void {
    const bandWidth = this.snap(viewport.width * 0.09);

    context.fillRect(0, 0, viewport.width, bandHeight);
    context.fillRect(0, viewport.height - bandHeight, viewport.width, bandHeight);
    context.fillRect(0, bandHeight, bandWidth, Math.max(this.config.pixelSize, viewport.height - bandHeight * 2));
    context.fillRect(
      viewport.width - bandWidth,
      bandHeight,
      bandWidth,
      Math.max(this.config.pixelSize, viewport.height - bandHeight * 2)
    );
  }

  private fillIrregularEdges(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    growth: number
  ): void {
    const pixel = this.config.pixelSize;

    for (let x = 0; x < viewport.width; x += pixel * 2) {
      const topGrowth = this.snap(growth * (0.45 + ((x / pixel) % 5) * 0.12));
      const bottomGrowth = this.snap(growth * (0.4 + ((x / pixel + 2) % 6) * 0.1));

      context.fillRect(x, 0, pixel * 2, topGrowth);
      context.fillRect(x, viewport.height - bottomGrowth, pixel * 2, bottomGrowth);
    }

    for (let y = 0; y < viewport.height; y += pixel * 2) {
      const leftGrowth = this.snap(growth * (0.38 + ((y / pixel + 1) % 5) * 0.11));
      const rightGrowth = this.snap(growth * (0.42 + ((y / pixel + 3) % 6) * 0.09));

      context.fillRect(0, y, leftGrowth, pixel * 2);
      context.fillRect(viewport.width - rightGrowth, y, rightGrowth, pixel * 2);
    }
  }

  private renderEdgeGlow(
    context: CanvasRenderingContext2D,
    viewport: ScreenEffectViewport,
    color: string
  ): void {
    context.fillStyle = color;
    this.fillEdgeBands(context, viewport, this.snap(viewport.height * 0.055));
  }

  private getPulse(speed: number, amount: number): number {
    return (0.5 + Math.sin(this.time * speed) * 0.5) * amount;
  }

  private getRandomRange(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.config.random();
  }

  private snap(value: number): number {
    return Math.round(value / this.config.pixelSize) * this.config.pixelSize;
  }
}

export const createScreenDropletsEffectDefinition = (
  options?: Partial<ScreenDropletsConfig>
): ScreenEffectDefinition => ({
  create: (runtimeOptions) =>
    new ScreenDropletsEffect({
      ...options,
      ...runtimeOptions,
    }),
  priority: 40,
});

const createPixelScreenEffectDefinition = (
  kind: PixelScreenEffectKind,
  options?: Partial<PixelScreenEffectConfig>,
  priority = 50
): ScreenEffectDefinition => ({
  create: (runtimeOptions) =>
    new PixelScreenEffect(kind, {
      ...options,
      ...runtimeOptions,
    }),
  priority,
});

export const createScreenFireEffectDefinition = (
  options?: Partial<PixelScreenEffectConfig>
): ScreenEffectDefinition => createPixelScreenEffectDefinition("fire", options, 52);

export const createScreenFrostEffectDefinition = (
  options?: Partial<PixelScreenEffectConfig>
): ScreenEffectDefinition => createPixelScreenEffectDefinition("frost", options, 48);

export const createScreenPoisonEffectDefinition = (
  options?: Partial<PixelScreenEffectConfig>
): ScreenEffectDefinition => createPixelScreenEffectDefinition("poison", options, 50);

export const createScreenLowHealthEffectDefinition = (
  options?: Partial<PixelScreenEffectConfig>
): ScreenEffectDefinition => createPixelScreenEffectDefinition("low-health", options, 58);

export const createScreenShockEffectDefinition = (
  options?: Partial<PixelScreenEffectConfig>
): ScreenEffectDefinition => createPixelScreenEffectDefinition("shock", options, 60);

export const createScreenSpeedBoostEffectDefinition = (
  options?: Partial<PixelScreenEffectConfig>
): ScreenEffectDefinition => createPixelScreenEffectDefinition("speed-boost", options, 54);

const createEnvironmentScreenEffectDefinition = (
  kind: EnvironmentScreenEffectKind,
  options?: Partial<EnvironmentScreenEffectConfig>,
  priority = 44
): ScreenEffectDefinition => ({
  create: (runtimeOptions) =>
    new EnvironmentScreenEffect(kind, {
      ...options,
      ...runtimeOptions,
    }),
  priority,
});

export const createEnvironmentHeatEffectDefinition = (
  options?: Partial<EnvironmentScreenEffectConfig>
): ScreenEffectDefinition => createEnvironmentScreenEffectDefinition("heat", options, 42);

export const createEnvironmentFrostEffectDefinition = (
  options?: Partial<EnvironmentScreenEffectConfig>
): ScreenEffectDefinition => createEnvironmentScreenEffectDefinition("frost", options, 44);

export const createEnvironmentFireEffectDefinition = (
  options?: Partial<EnvironmentScreenEffectConfig>
): ScreenEffectDefinition => createEnvironmentScreenEffectDefinition("fire", options, 46);

export const createEnvironmentUnderwaterEffectDefinition = (
  options?: Partial<EnvironmentScreenEffectConfig>
): ScreenEffectDefinition => createEnvironmentScreenEffectDefinition("underwater", options, 40);

export class ScreenEffectManager {
  private readonly activeEffects = new Map<string, ActiveScreenEffect>();
  private readonly definitions = new Map<string, ScreenEffectDefinition>();

  constructor(options: ScreenEffectManagerOptions = {}) {
    if (options.registerBuiltIns ?? true) {
      this.register(screenDropletsEffectId, createScreenDropletsEffectDefinition());
      this.register(screenFireEffectId, createScreenFireEffectDefinition());
      this.register(screenFrostEffectId, createScreenFrostEffectDefinition());
      this.register(screenPoisonEffectId, createScreenPoisonEffectDefinition());
      this.register(screenLowHealthEffectId, createScreenLowHealthEffectDefinition());
      this.register(screenShockEffectId, createScreenShockEffectDefinition());
      this.register(screenSpeedBoostEffectId, createScreenSpeedBoostEffectDefinition());
      this.register(environmentHeatEffectId, createEnvironmentHeatEffectDefinition());
      this.register(environmentFrostEffectId, createEnvironmentFrostEffectDefinition());
      this.register(environmentFireEffectId, createEnvironmentFireEffectDefinition());
      this.register(environmentUnderwaterEffectId, createEnvironmentUnderwaterEffectDefinition());
    }
  }

  clear(): void {
    for (const activeEffect of this.activeEffects.values()) {
      activeEffect.effect.destroy?.();
    }

    this.activeEffects.clear();
  }

  disable(effectId: string, options: Pick<ScreenEffectEnableOptions, "fadeMs"> = {}): void {
    const activeEffect = this.activeEffects.get(effectId);

    if (!activeEffect) {
      return;
    }

    activeEffect.fadeMs = getFiniteNumber(options.fadeMs, activeEffect.fadeMs);
    activeEffect.isDisabling = true;
    activeEffect.targetIntensity = 0;
  }

  enable(effectId: string, options: ScreenEffectEnableOptions = {}): void {
    const definition = this.definitions.get(effectId);

    if (!definition) {
      throw new Error(`Screen effect "${effectId}" has not been registered.`);
    }

    const targetIntensity = clampScreenEffectIntensity(options.intensity);
    const existingEffect = this.activeEffects.get(effectId);

    if (existingEffect) {
      existingEffect.fadeMs = getFiniteNumber(options.fadeMs, existingEffect.fadeMs);
      existingEffect.isDisabling = false;
      existingEffect.priority = options.priority ?? definition.priority ?? existingEffect.priority;
      existingEffect.targetIntensity = targetIntensity;
      return;
    }

    this.activeEffects.set(effectId, {
      definition,
      effect: definition.create(options.settings),
      fadeMs: getFiniteNumber(options.fadeMs, 180),
      intensity: 0,
      isDisabling: false,
      priority: options.priority ?? definition.priority ?? 0,
      targetIntensity,
    });
  }

  getActiveEffects(): ScreenEffectRegistration[] {
    return [...this.activeEffects.entries()]
      .map(([effectId, activeEffect]) => ({
        effectId,
        isActive: activeEffect.intensity > 0,
        priority: activeEffect.priority,
      }))
      .sort((first, second) => first.priority - second.priority);
  }

  getRegisteredEffects(): string[] {
    return [...this.definitions.keys()].sort();
  }

  isEnabled(effectId: string): boolean {
    return this.activeEffects.has(effectId);
  }

  register(effectId: string, definition: ScreenEffectDefinition): void {
    if (!effectId.trim()) {
      throw new Error("Screen effect id is required.");
    }

    this.definitions.set(effectId, definition);
  }

  render(context: CanvasRenderingContext2D, viewport: ScreenEffectViewport): void {
    const effects = [...this.activeEffects.values()].sort(
      (first, second) => first.priority - second.priority
    );

    for (const activeEffect of effects) {
      if (activeEffect.intensity > 0) {
        context.imageSmoothingEnabled = false;
        activeEffect.effect.render(context, viewport, {
          intensity: activeEffect.intensity,
        });
      }
    }
  }

  setIntensity(effectId: string, intensity: number, fadeMs?: number): void {
    const activeEffect = this.activeEffects.get(effectId);

    if (!activeEffect) {
      return;
    }

    activeEffect.fadeMs = getFiniteNumber(fadeMs, activeEffect.fadeMs);
    activeEffect.targetIntensity = clampScreenEffectIntensity(intensity);
    activeEffect.isDisabling = false;
  }

  update(deltaTime: number, viewport: ScreenEffectViewport): void {
    const normalizedDelta = Math.max(0, deltaTime);

    for (const [effectId, activeEffect] of this.activeEffects) {
      activeEffect.intensity = this.getNextIntensity(activeEffect, normalizedDelta);
      activeEffect.effect.update({
        deltaTime: normalizedDelta,
        intensity: activeEffect.intensity,
        viewport,
      });

      if (activeEffect.isDisabling && activeEffect.intensity <= 0) {
        activeEffect.effect.destroy?.();
        this.activeEffects.delete(effectId);
      }
    }
  }

  unregister(effectId: string): void {
    this.disable(effectId, { fadeMs: 0 });
    this.update(0, { height: 0, width: 0 });
    this.definitions.delete(effectId);
  }

  private getNextIntensity(activeEffect: ActiveScreenEffect, deltaTime: number): number {
    if (activeEffect.fadeMs <= 0) {
      return activeEffect.targetIntensity;
    }

    const fadeSeconds = activeEffect.fadeMs / 1000;
    const step = fadeSeconds <= 0 ? 1 : deltaTime / fadeSeconds;

    if (activeEffect.intensity < activeEffect.targetIntensity) {
      return Math.min(activeEffect.targetIntensity, activeEffect.intensity + step);
    }

    if (activeEffect.intensity > activeEffect.targetIntensity) {
      return Math.max(activeEffect.targetIntensity, activeEffect.intensity - step);
    }

    return activeEffect.intensity;
  }
}
