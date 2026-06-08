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

export class ScreenEffectManager {
  private readonly activeEffects = new Map<string, ActiveScreenEffect>();
  private readonly definitions = new Map<string, ScreenEffectDefinition>();

  constructor(options: ScreenEffectManagerOptions = {}) {
    if (options.registerBuiltIns ?? true) {
      this.register(screenDropletsEffectId, createScreenDropletsEffectDefinition());
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
