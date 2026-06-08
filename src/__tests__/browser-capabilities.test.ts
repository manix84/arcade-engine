import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appExitBlockedEventName,
  canLockOrientation,
  canUseFullscreen,
  canUseScreenWakeLock,
  enterImmersiveMode,
  exitInstalledApp,
  type LockableScreen,
  ScreenWakeLockController,
  type ScreenWakeLockSentinel,
} from "../index.js";

type MutableDocument = Document & {
  visibilityState: DocumentVisibilityState;
};

const setVisibilityState = (
  documentRef: Document,
  visibilityState: DocumentVisibilityState
): void => {
  Object.defineProperty(documentRef, "visibilityState", {
    configurable: true,
    value: visibilityState,
  });
};

describe("browser capability helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reports wake lock, fullscreen, and orientation support", () => {
    const navigatorRef = {
      wakeLock: {
        request: vi.fn(),
      },
    } as unknown as Navigator;
    const element = {
      requestFullscreen: vi.fn(),
    } as unknown as Element & { requestFullscreen: () => Promise<void> };
    const screenRef = {
      orientation: {
        lock: vi.fn(),
      },
    } as unknown as LockableScreen;

    expect(canUseScreenWakeLock(navigatorRef)).toBe(true);
    expect(canUseFullscreen(element)).toBe(true);
    expect(canLockOrientation(screenRef)).toBe(true);
  });

  it("acquires, releases, and reacquires a screen wake lock", async () => {
    const documentRef = document.implementation.createHTMLDocument(
      "wake-lock"
    ) as MutableDocument;
    const sentinel = new EventTarget() as ScreenWakeLockSentinel;
    const release = vi.fn(async () => {
      sentinel.released = true;
    });
    const request = vi.fn(async () => sentinel);
    const navigatorRef = {
      wakeLock: {
        request,
      },
    } as unknown as Navigator;

    sentinel.released = false;
    sentinel.release = release;
    setVisibilityState(documentRef, "visible");

    const controller = new ScreenWakeLockController({
      document: documentRef,
      navigator: navigatorRef,
    });

    controller.setActive(true);
    await Promise.resolve();

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("screen");

    documentRef.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();

    expect(request).toHaveBeenCalledTimes(1);

    sentinel.dispatchEvent(new Event("release"));
    await Promise.resolve();

    expect(request).toHaveBeenCalledTimes(2);

    controller.setActive(false);
    await Promise.resolve();

    expect(release).toHaveBeenCalled();

    controller.destroy();
  });

  it("releases wake locks when hidden and skips denied requests", async () => {
    const documentRef = document.implementation.createHTMLDocument(
      "wake-lock-hidden"
    ) as MutableDocument;
    const sentinel = new EventTarget() as ScreenWakeLockSentinel;
    const release = vi.fn(async () => undefined);
    const request = vi.fn(async () => sentinel);
    const navigatorRef = {
      wakeLock: {
        request,
      },
    } as unknown as Navigator;

    sentinel.release = release;
    setVisibilityState(documentRef, "visible");

    const controller = new ScreenWakeLockController({
      document: documentRef,
      navigator: navigatorRef,
    });

    controller.setActive(true);
    await Promise.resolve();

    setVisibilityState(documentRef, "hidden");
    documentRef.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();

    expect(release).toHaveBeenCalledTimes(1);

    controller.destroy();

    const denied = new ScreenWakeLockController({
      document: documentRef,
      navigator: {
        wakeLock: {
          request: vi.fn(async () => {
            throw new Error("denied");
          }),
        },
      } as unknown as Navigator,
    });

    setVisibilityState(documentRef, "visible");
    denied.setActive(true);
    await Promise.resolve();
    denied.destroy();
  });

  it("releases a wake lock that resolves after deactivation", async () => {
    const documentRef = document.implementation.createHTMLDocument(
      "wake-lock-race"
    ) as MutableDocument;
    const sentinel = new EventTarget() as ScreenWakeLockSentinel;
    const release = vi.fn(async () => {
      sentinel.released = true;
    });
    let resolveRequest: (sentinel: ScreenWakeLockSentinel) => void = () => {};
    const request = vi.fn(
      () =>
        new Promise<ScreenWakeLockSentinel>((resolve) => {
          resolveRequest = resolve;
        })
    );
    const navigatorRef = {
      wakeLock: {
        request,
      },
    } as unknown as Navigator;

    sentinel.released = false;
    sentinel.release = release;
    setVisibilityState(documentRef, "visible");

    const controller = new ScreenWakeLockController({
      document: documentRef,
      navigator: navigatorRef,
    });

    controller.setActive(true);
    controller.setActive(false);
    resolveRequest(sentinel);
    await Promise.resolve();
    await Promise.resolve();

    expect(release).toHaveBeenCalledTimes(1);

    sentinel.dispatchEvent(new Event("release"));
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);

    controller.destroy();
  });

  it("enters immersive mode with fullscreen and orientation lock when available", async () => {
    const documentRef = document.implementation.createHTMLDocument("immersive");
    const element = {
      requestFullscreen: vi.fn(async () => undefined),
    } as unknown as Element & { requestFullscreen: () => Promise<void> };
    const screenRef = {
      orientation: {
        lock: vi.fn(async () => undefined),
      },
    } as unknown as LockableScreen;

    Object.defineProperty(documentRef, "fullscreenElement", {
      configurable: true,
      value: null,
    });

    await expect(
      enterImmersiveMode({
        document: documentRef,
        element,
        orientation: "landscape-primary",
        screen: screenRef,
      })
    ).resolves.toEqual({
      fullscreen: true,
      orientation: true,
    });
    expect(element.requestFullscreen).toHaveBeenCalled();
    expect(screenRef.orientation.lock).toHaveBeenCalledWith("landscape-primary");
  });

  it("returns partial immersive mode results when browser requests fail", async () => {
    const documentRef = document.implementation.createHTMLDocument("blocked");
    const element = {
      requestFullscreen: vi.fn(async () => {
        throw new Error("blocked");
      }),
    } as unknown as Element & { requestFullscreen: () => Promise<void> };
    const screenRef = {
      orientation: {
        lock: vi.fn(async () => {
          throw new Error("blocked");
        }),
      },
    } as unknown as LockableScreen;

    Object.defineProperty(documentRef, "fullscreenElement", {
      configurable: true,
      value: null,
    });

    await expect(
      enterImmersiveMode({ document: documentRef, element, screen: screenRef })
    ).resolves.toEqual({
      fullscreen: false,
      orientation: false,
    });
  });

  it("dispatches an app-exit blocked event when the document remains visible", () => {
    const windowRef = new EventTarget() as Window;
    const documentRef = {
      visibilityState: "visible",
    } as Document;
    const close = vi.fn();
    const listener = vi.fn();

    Object.assign(windowRef, {
      close,
      document: documentRef,
      setTimeout: (callback: () => void) => {
        callback();
        return 1;
      },
    });
    windowRef.addEventListener(appExitBlockedEventName, listener);

    exitInstalledApp({
      blockedDelayMs: 25,
      document: documentRef,
      window: windowRef,
    });

    expect(close).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch app-exit blocked events after the document is hidden", () => {
    const windowRef = new EventTarget() as Window;
    const documentRef = {
      visibilityState: "hidden",
    } as Document;
    const listener = vi.fn();

    Object.assign(windowRef, {
      close: vi.fn(),
      document: documentRef,
      setTimeout: (callback: () => void) => {
        callback();
        return 1;
      },
    });
    windowRef.addEventListener(appExitBlockedEventName, listener);

    exitInstalledApp({
      blockedDelayMs: 25,
      document: documentRef,
      window: windowRef,
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
