export interface AchievementNotificationDetails {
  description: string;
  icon?: AchievementNotificationIcon;
  name: string;
}

export interface AchievementNotificationIcon {
  frameHeight?: number;
  frameWidth?: number;
  frameX?: number;
  frameY?: number;
  image?: CanvasImageSource;
}

export interface AchievementNotificationViewport {
  height: number;
  width: number;
}

export interface AchievementNotificationTheme {
  background: string;
  border: string;
  descriptionText: string;
  iconBackground: string;
  iconBorder: string;
  titleText: string;
}

export interface AchievementNotificationLayout {
  bottomOffset: number;
  height: number;
  iconSize: number;
  margin: number;
  slideDistance: number;
  width: number;
}

export interface AchievementNotificationTiming {
  exitMs: number;
  holdMs: number;
  slideMs: number;
}

export interface AchievementNotificationRenderOptions {
  context: CanvasRenderingContext2D;
  eventName?: string;
  eventTarget?: EventTarget | null;
  getViewport?: () => AchievementNotificationViewport;
  layout?: Partial<AchievementNotificationLayout>;
  now?: () => number;
  scale?: number | (() => number);
  theme?: Partial<AchievementNotificationTheme>;
  timing?: Partial<AchievementNotificationTiming>;
}

interface QueuedAchievementNotification {
  achievement: AchievementNotificationDetails;
  startedAt: number;
}

export const achievementNotificationEventName =
  "arcade-engine:achievementUnlocked";

export const defaultAchievementNotificationLayout: AchievementNotificationLayout = {
  bottomOffset: 42,
  height: 48,
  iconSize: 40,
  margin: 6,
  slideDistance: 28,
  width: 250,
};

export const defaultAchievementNotificationTheme: AchievementNotificationTheme = {
  background: "rgba(5, 7, 10, 0.94)",
  border: "#f6e05e",
  descriptionText: "#cbd5e1",
  iconBackground: "#243241",
  iconBorder: "#4fd1c5",
  titleText: "#f6e05e",
};

export const defaultAchievementNotificationTiming: AchievementNotificationTiming = {
  exitMs: 220,
  holdMs: 2600,
  slideMs: 260,
};

export class AchievementNotificationRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly eventName: string;
  private readonly eventTarget: EventTarget | null;
  private readonly getViewport: () => AchievementNotificationViewport;
  private readonly layout: AchievementNotificationLayout;
  private readonly now: () => number;
  private readonly queue: QueuedAchievementNotification[] = [];
  private readonly scale: number | (() => number);
  private readonly theme: AchievementNotificationTheme;
  private readonly timing: AchievementNotificationTiming;

  private readonly handleAchievementUnlocked = (event: Event): void => {
    const achievement = (event as CustomEvent<AchievementNotificationDetails>)
      .detail;

    if (achievement) {
      this.enqueue(achievement);
    }
  };

  constructor(options: AchievementNotificationRenderOptions) {
    this.context = options.context;
    this.eventName = options.eventName ?? achievementNotificationEventName;
    this.eventTarget = options.eventTarget ?? null;
    this.getViewport =
      options.getViewport ??
      (() => ({
        height: this.context.canvas?.height ?? 0,
        width: this.context.canvas?.width ?? 0,
      }));
    this.layout = {
      ...defaultAchievementNotificationLayout,
      ...options.layout,
    };
    this.now = options.now ?? performance.now.bind(performance);
    this.scale = options.scale ?? 1;
    this.theme = {
      ...defaultAchievementNotificationTheme,
      ...options.theme,
    };
    this.timing = {
      ...defaultAchievementNotificationTiming,
      ...options.timing,
    };

    this.eventTarget?.addEventListener(
      this.eventName,
      this.handleAchievementUnlocked
    );
  }

  destroy = (): void => {
    this.eventTarget?.removeEventListener(
      this.eventName,
      this.handleAchievementUnlocked
    );
    this.queue.length = 0;
  };

  enqueue = (achievement: AchievementNotificationDetails): void => {
    this.queue.push({
      achievement,
      startedAt: this.now(),
    });
  };

  getQueueLength = (): number => this.queue.length;

  render = (): boolean => {
    const notification = this.queue[0];

    if (!notification) {
      return false;
    }

    const elapsed = this.now() - notification.startedAt;
    const totalDuration =
      this.timing.slideMs + this.timing.holdMs + this.timing.exitMs;

    if (elapsed >= totalDuration) {
      this.queue.shift();
      return this.render();
    }

    const viewport = this.getViewport();
    const scale = this.getScale();
    const uiWidth = viewport.width / scale;
    const uiHeight = viewport.height / scale;
    const progress = this.easeOutCubic(this.getAnimationProgress(elapsed));
    const visibleX = uiWidth - this.layout.margin - this.layout.width;
    const hiddenX = uiWidth + this.layout.slideDistance;
    const x = visibleX + (hiddenX - visibleX) * (1 - progress);
    const y = uiHeight - this.layout.bottomOffset - this.layout.height;

    this.context.save();
    this.context.scale(scale, scale);
    this.context.globalAlpha *= this.getOpacity(elapsed);
    this.renderPopup(notification.achievement, x, y);
    this.context.restore();

    return true;
  };

  private renderPopup = (
    achievement: AchievementNotificationDetails,
    x: number,
    y: number
  ): void => {
    const iconPadding = (this.layout.height - this.layout.iconSize) / 2;
    const iconX = x + iconPadding;
    const iconY = y + iconPadding;
    const textX = iconX + this.layout.iconSize + 8;
    const textWidth = this.layout.width - (textX - x) - 10;

    this.context.fillStyle = this.theme.background;
    this.context.fillRect(x, y, this.layout.width, this.layout.height);
    this.context.strokeStyle = this.theme.border;
    this.context.lineWidth = 2;
    this.context.strokeRect(x, y, this.layout.width, this.layout.height);

    this.renderIcon(achievement.icon, iconX, iconY);
    this.renderText(achievement.name, textX, y + 7, 8, this.theme.titleText);

    this.wrapText(achievement.description, Math.max(12, Math.floor(textWidth / 5)))
      .slice(0, 2)
      .forEach((line, index) => {
        this.renderText(
          line,
          textX,
          y + 20 + index * 9,
          6,
          this.theme.descriptionText
        );
      });
  };

  private renderIcon = (
    icon: AchievementNotificationIcon | undefined,
    x: number,
    y: number
  ): void => {
    if (!icon?.image) {
      this.renderIconPlaceholder(x, y);
      return;
    }

    try {
      const frameWidth = icon.frameWidth ?? this.layout.iconSize;
      const frameHeight = icon.frameHeight ?? this.layout.iconSize;

      this.context.drawImage(
        icon.image,
        icon.frameX ?? 0,
        icon.frameY ?? 0,
        frameWidth,
        frameHeight,
        x,
        y,
        this.layout.iconSize,
        this.layout.iconSize
      );
    } catch {
      this.renderIconPlaceholder(x, y);
    }
  };

  private renderIconPlaceholder = (x: number, y: number): void => {
    const centerX = x + this.layout.iconSize / 2;
    const centerY = y + this.layout.iconSize / 2;

    this.context.fillStyle = this.theme.iconBackground;
    this.context.fillRect(x, y, this.layout.iconSize, this.layout.iconSize);
    this.context.strokeStyle = this.theme.iconBorder;
    this.context.lineWidth = 2;
    this.context.strokeRect(x, y, this.layout.iconSize, this.layout.iconSize);
    this.context.beginPath();
    this.context.arc(centerX, centerY, this.layout.iconSize / 2 - 5, 0, Math.PI * 2);
    this.context.stroke();
  };

  private renderText = (
    text: string,
    x: number,
    y: number,
    size: number,
    color: string
  ): void => {
    this.context.fillStyle = color;
    this.context.font = `${size}px sans-serif`;
    this.context.textAlign = "left";
    this.context.textBaseline = "top";
    this.context.fillText(text, x, y);
  };

  private getAnimationProgress = (elapsed: number): number => {
    if (elapsed < this.timing.slideMs) {
      return elapsed / this.timing.slideMs;
    }

    if (elapsed < this.timing.slideMs + this.timing.holdMs) {
      return 1;
    }

    return (
      1 -
      (elapsed - this.timing.slideMs - this.timing.holdMs) / this.timing.exitMs
    );
  };

  private getOpacity = (elapsed: number): number => {
    if (elapsed < this.timing.slideMs) {
      return Math.max(0.3, elapsed / this.timing.slideMs);
    }

    if (elapsed < this.timing.slideMs + this.timing.holdMs) {
      return 1;
    }

    return Math.max(
      0,
      1 - (elapsed - this.timing.slideMs - this.timing.holdMs) / this.timing.exitMs
    );
  };

  private easeOutCubic = (progress: number): number => {
    const clamped = Math.max(0, Math.min(1, progress));

    return 1 - Math.pow(1 - clamped, 3);
  };

  private getScale = (): number => {
    const scale = typeof this.scale === "function" ? this.scale() : this.scale;

    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  };

  private wrapText = (text: string, maxLength: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    words.forEach((word) => {
      const nextLine = line ? `${line} ${word}` : word;

      if (nextLine.length > maxLength && line) {
        lines.push(line);
        line = word;
        return;
      }

      line = nextLine;
    });

    if (line) {
      lines.push(line);
    }

    return lines;
  };
}
