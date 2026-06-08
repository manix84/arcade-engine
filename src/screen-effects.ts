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
  life: number;
  radius: number;
  stretch: number;
  velocityX: number;
  velocityY: number;
  wobbleOffset: number;
  x: number;
  y: number;
};

export interface ScreenDropletsConfig {
  fadeSpeed: number;
  maxDroplets: number;
  maxSize: number;
  minSize: number;
  random: () => number;
  slideSpeed: number;
  spawnRate: number;
  trailLength: number;
}

export const screenDropletsEffectId = "screen-droplets";

export const defaultScreenDropletsConfig: ScreenDropletsConfig = {
  fadeSpeed: 0.95,
  maxDroplets: 58,
  maxSize: 9,
  minSize: 3,
  random: Math.random,
  slideSpeed: 138,
  spawnRate: 14,
  trailLength: 14,
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
    maxDroplets: Math.max(
      1,
      Math.floor(getFiniteNumber(config.maxDroplets, defaultScreenDropletsConfig.maxDroplets, 1))
    ),
    maxSize: getFiniteNumber(config.maxSize, defaultScreenDropletsConfig.maxSize, 1),
    minSize: getFiniteNumber(config.minSize, defaultScreenDropletsConfig.minSize, 1),
    random: getOptionalRandom(config.random) ?? defaultScreenDropletsConfig.random,
    slideSpeed: getFiniteNumber(config.slideSpeed, defaultScreenDropletsConfig.slideSpeed),
    spawnRate: getFiniteNumber(config.spawnRate, defaultScreenDropletsConfig.spawnRate),
    trailLength: getFiniteNumber(config.trailLength, defaultScreenDropletsConfig.trailLength),
  };
};

class ScreenDropletsEffect implements ScreenEffectInstance {
  private readonly activeDroplets: ScreenDroplet[] = [];
  private readonly config: ScreenDropletsConfig;
  private readonly pool: ScreenDroplet[] = [];
  private spawnAccumulator = 0;

  constructor(options?: Record<string, unknown>) {
    this.config = normalizeScreenDropletsConfig(options);
  }

  destroy = (): void => {
    this.pool.push(...this.activeDroplets);
    this.activeDroplets.length = 0;
    this.spawnAccumulator = 0;
  };

  update = ({ deltaTime, intensity, viewport }: ScreenEffectUpdateState): void => {
    const normalizedDelta = Math.min(0.1, Math.max(0, deltaTime));
    const normalizedIntensity = clampScreenEffectIntensity(intensity);

    if (normalizedIntensity > 0 && viewport.width > 0 && viewport.height > 0) {
      this.spawnAccumulator +=
        normalizedDelta * this.config.spawnRate * (0.08 + normalizedIntensity * 1.12);

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
      const ageProgress = droplet.age / droplet.life;
      const wobble =
        Math.sin(droplet.age * 8.5 + droplet.wobbleOffset) *
        (8 + droplet.radius * 0.45) *
        normalizedDelta;

      droplet.age += normalizedDelta;
      droplet.x += (droplet.velocityX + wobble) * normalizedDelta;
      droplet.y += droplet.velocityY * normalizedDelta;
      droplet.velocityY += this.config.slideSpeed * 0.42 * normalizedDelta;
      droplet.stretch = 1 + Math.min(1.12, ageProgress * 1.25 + droplet.velocityY / 360);
      droplet.alpha = Math.max(
        0,
        Math.min(1, 1 - ageProgress * this.config.fadeSpeed) * normalizedIntensity
      );

      if (
        droplet.age >= droplet.life ||
        droplet.alpha <= 0.015 ||
        droplet.y - droplet.radius > viewport.height + this.config.trailLength
      ) {
        this.recycleDroplet(index);
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
    context.lineCap = "round";
    context.lineJoin = "round";

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
    return Math.max(3, Math.round(this.config.maxDroplets * (0.12 + intensity * 0.58)));
  }

  private getRandomRange(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.config.random();
  }

  private recycleDroplet(index: number): void {
    const [droplet] = this.activeDroplets.splice(index, 1);

    if (droplet) {
      this.pool.push(droplet);
    }
  }

  private spawnDroplet(viewport: ScreenEffectViewport, intensity: number): void {
    const sizeBoost = 0.72 + intensity * 0.45;
    const radius = this.getRandomRange(this.config.minSize, this.config.maxSize) * sizeBoost;
    const droplet = this.pool.pop() ?? {
      age: 0,
      alpha: 1,
      life: 1,
      radius,
      stretch: 1,
      velocityX: 0,
      velocityY: 0,
      wobbleOffset: 0,
      x: 0,
      y: 0,
    };

    droplet.x = this.getRandomRange(-radius, viewport.width + radius);
    droplet.y = this.getRandomRange(-radius * 0.5, viewport.height * 0.82);
    droplet.radius = radius;
    droplet.alpha = 1;
    droplet.velocityX = this.getRandomRange(-10, 10) * (0.35 + intensity);
    droplet.velocityY = this.config.slideSpeed * this.getRandomRange(0.28, 0.78 + intensity * 0.42);
    droplet.age = 0;
    droplet.life = this.getRandomRange(1.1, 3.2 - intensity * 0.45);
    droplet.stretch = 0.72;
    droplet.wobbleOffset = this.getRandomRange(0, Math.PI * 2);
    this.activeDroplets.push(droplet);
  }

  private renderDropletBody(
    context: CanvasRenderingContext2D,
    droplet: ScreenDroplet,
    alpha: number
  ): void {
    const radiusX = droplet.radius * (0.82 + droplet.stretch * 0.05);
    const radiusY = droplet.radius * droplet.stretch;

    context.beginPath();
    context.ellipse(droplet.x, droplet.y, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fillStyle = `rgba(124, 211, 255, ${0.075 * alpha})`;
    context.fill();

    context.beginPath();
    context.ellipse(droplet.x, droplet.y, radiusX * 0.55, radiusY * 0.62, 0, 0, Math.PI * 2);
    context.fillStyle = `rgba(5, 7, 10, ${0.028 * alpha})`;
    context.fill();
  }

  private renderDropletHighlight(
    context: CanvasRenderingContext2D,
    droplet: ScreenDroplet,
    alpha: number
  ): void {
    const highlightRadius = Math.max(1.2, droplet.radius * 0.22);

    context.beginPath();
    context.ellipse(
      droplet.x - droplet.radius * 0.28,
      droplet.y - droplet.radius * droplet.stretch * 0.38,
      highlightRadius,
      highlightRadius * 0.62,
      -0.35,
      0,
      Math.PI * 2
    );
    context.fillStyle = `rgba(255, 255, 255, ${0.62 * alpha})`;
    context.fill();
  }

  private renderDropletTrail(
    context: CanvasRenderingContext2D,
    droplet: ScreenDroplet,
    alpha: number
  ): void {
    if (this.config.trailLength <= 0 || droplet.velocityY <= 12) {
      return;
    }

    const length = Math.min(
      this.config.trailLength * droplet.stretch,
      droplet.velocityY * 0.34
    );

    context.beginPath();
    context.moveTo(droplet.x, droplet.y - droplet.radius * 0.35);
    context.lineTo(droplet.x - droplet.velocityX * 0.04, droplet.y - length);
    context.strokeStyle = `rgba(124, 211, 255, ${0.045 * alpha})`;
    context.lineWidth = Math.max(1, droplet.radius * 0.22);
    context.stroke();
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
