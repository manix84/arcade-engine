export type ScreenWakeLockSentinel = EventTarget & {
  release: () => Promise<void>;
  released?: boolean;
};

export type ScreenWakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<ScreenWakeLockSentinel>;
  };
};

export type ScreenOrientationLock =
  | "any"
  | "landscape"
  | "landscape-primary"
  | "landscape-secondary"
  | "natural"
  | "portrait"
  | "portrait-primary"
  | "portrait-secondary";

export type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: ScreenOrientationLock) => Promise<void>;
};

export type LockableScreen = Screen & {
  orientation?: LockableScreenOrientation;
};

export interface ScreenWakeLockControllerOptions {
  document?: Document;
  navigator?: Navigator;
}

export interface ImmersiveModeOptions {
  document?: Document;
  element?: Element & {
    requestFullscreen?: () => Promise<void>;
  };
  orientation?: ScreenOrientationLock;
  screen?: LockableScreen;
}

export interface ImmersiveModeResult {
  fullscreen: boolean;
  orientation: boolean;
}

export interface InstalledAppExitOptions {
  blockedDelayMs?: number;
  document?: Document;
  eventName?: string;
  window?: Window;
}

export const appExitBlockedEventName = "arcade-engine:appExitBlocked";

export const canUseScreenWakeLock = (
  navigatorRef: Navigator = navigator
): boolean =>
  typeof (navigatorRef as ScreenWakeLockNavigator).wakeLock?.request ===
  "function";

export class ScreenWakeLockController {
  private readonly documentRef: Document;
  private readonly navigatorRef: Navigator;
  private isRequested = false;
  private sentinel: ScreenWakeLockSentinel | null = null;

  constructor(options: ScreenWakeLockControllerOptions = {}) {
    this.documentRef = options.document ?? document;
    this.navigatorRef = options.navigator ?? navigator;
    this.documentRef.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
  }

  setActive = (active: boolean): void => {
    this.isRequested = active;

    if (active) {
      void this.acquire();
      return;
    }

    void this.release();
  };

  destroy = (): void => {
    this.documentRef.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
    this.isRequested = false;
    void this.release();
  };

  private handleVisibilityChange = (): void => {
    if (this.documentRef.visibilityState !== "visible") {
      void this.release();
      return;
    }

    if (this.isRequested) {
      void this.acquire();
    }
  };

  private acquire = async (): Promise<void> => {
    if (
      this.sentinel ||
      this.documentRef.visibilityState !== "visible" ||
      !canUseScreenWakeLock(this.navigatorRef)
    ) {
      return;
    }

    try {
      const sentinel = await (
        this.navigatorRef as ScreenWakeLockNavigator
      ).wakeLock!.request("screen");

      if (!this.isRequested || this.documentRef.visibilityState !== "visible") {
        try {
          await sentinel.release();
        } catch {
          // Releasing is best effort; the browser may have already released it.
        }
        return;
      }

      this.sentinel = sentinel;
      sentinel.addEventListener("release", this.handleSentinelRelease, {
        once: true,
      });
    } catch {
      // Wake lock is optional; unsupported or denied requests should not stop play.
    }
  };

  private release = async (): Promise<void> => {
    const sentinel = this.sentinel;

    this.sentinel = null;

    if (!sentinel || sentinel.released) {
      return;
    }

    try {
      await sentinel.release();
    } catch {
      // Releasing is best effort; the browser may have already released it.
    }
  };

  private handleSentinelRelease = (): void => {
    this.sentinel = null;

    if (this.isRequested && this.documentRef.visibilityState === "visible") {
      void this.acquire();
    }
  };
}

export const canUseFullscreen = (
  element: Element & { requestFullscreen?: () => Promise<void> } =
    document.documentElement
): boolean => typeof element.requestFullscreen === "function";

export const canLockOrientation = (
  screenRef: LockableScreen = screen
): boolean =>
  typeof screenRef.orientation?.lock === "function";

export const enterImmersiveMode = async (
  options: ImmersiveModeOptions = {}
): Promise<ImmersiveModeResult> => {
  const documentRef = options.document ?? document;
  const element = options.element ?? documentRef.documentElement;
  const screenRef = options.screen ?? screen;
  const orientation = options.orientation ?? "landscape";
  let fullscreen = Boolean(documentRef.fullscreenElement);
  let orientationLocked = false;

  try {
    if (!documentRef.fullscreenElement && canUseFullscreen(element)) {
      await element.requestFullscreen!();
      fullscreen = true;
    }
  } catch {
    fullscreen = Boolean(documentRef.fullscreenElement);
  }

  try {
    const orientationApi = screenRef.orientation as
      | LockableScreenOrientation
      | undefined;

    if (typeof orientationApi?.lock === "function") {
      await orientationApi.lock(orientation);
      orientationLocked = true;
    }
  } catch {
    orientationLocked = false;
  }

  return {
    fullscreen,
    orientation: orientationLocked,
  };
};

export const exitInstalledApp = (
  options: InstalledAppExitOptions = {}
): void => {
  const windowRef = options.window ?? window;
  const documentRef = options.document ?? windowRef.document;
  const eventName = options.eventName ?? appExitBlockedEventName;
  const blockedDelayMs = options.blockedDelayMs ?? 300;

  try {
    windowRef.close();
  } finally {
    windowRef.setTimeout(() => {
      if (documentRef.visibilityState === "hidden") {
        return;
      }

      windowRef.dispatchEvent(new CustomEvent(eventName));
    }, blockedDelayMs);
  }
};
