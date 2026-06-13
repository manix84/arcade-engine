import { afterEach, describe, expect, it, vi } from "vitest";
import GameArena from "../arena.js";
import helpers from "../helpers.js";
import Sound from "../Sound.js";
import Ticker from "../Ticker.js";

type MutableDocumentFullscreen = Document & {
  cancelFullScreen?: () => void;
  exitFullscreen?: () => void;
  fullscreenElement?: Element | null;
  mozCancelFullScreen?: () => void;
  mozFullScreenElement?: Element | null;
  mozFullScreenEnabled?: boolean;
  webkitCancelFullScreen?: () => void;
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
};

type MutableElementFullscreen = HTMLElement & {
  mozRequestFullScreen?: () => void;
  webkitRequestFullscreen?: (keyboardInput?: number) => void;
};

const createHost = (width = 320, height = 240): HTMLElement => {
  const host = document.createElement("div");

  Object.defineProperty(host, "clientWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(host, "clientHeight", {
    configurable: true,
    value: height,
  });

  return host;
};

const getSoundElement = (sound: Sound): HTMLAudioElement =>
  (sound as unknown as { _theSound: HTMLAudioElement })._theSound;

describe("coverage-focused engine branches", () => {
  afterEach(() => {
    Sound.destroyAll();
    Sound.configure();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("handles arena font setup, explicit resizing, position updates, grid drawing, and cleanup", () => {
    const host = createHost();
    const arena = new GameArena(host, {
      debugGridColor: "#123456",
      fontFamily: "Arcade",
      fontUrl: "/fonts/arcade.woff2",
    });
    const context = arena.getContext() as CanvasRenderingContext2D;
    const moveTo = vi.spyOn(context, "moveTo");
    const lineTo = vi.spyOn(context, "lineTo");
    const stroke = vi.spyOn(context, "stroke");

    arena.updatePosition(12, 34);
    arena.resize(640, 480);
    arena.setBackgroundColor("#010203");
    arena.clear();
    arena.drawDebugGrid(160, 120);

    expect(arena.posX).toBe(12);
    expect(arena.posY).toBe(34);
    expect(arena.width).toBe(640);
    expect(arena.height).toBe(480);
    expect(arena.getElement().style.background).toBe("rgb(1, 2, 3)");
    expect(host.querySelector("style")?.innerText).toContain("/fonts/arcade.woff2");
    expect(moveTo).toHaveBeenCalled();
    expect(lineTo).toHaveBeenCalled();
    expect(stroke).toHaveBeenCalled();

    arena.destroy();

    expect(host.querySelector("canvas")).toBeNull();
    expect(host.querySelector("style")).toBeNull();
  });

  it("covers arena text alignment, empty preloads, asset errors, and context failures", async () => {
    const host = createHost();
    const arena = new GameArena(host);
    const context = arena.getContext() as CanvasRenderingContext2D;
    const fillText = vi.spyOn(context, "fillText");
    const strokeText = vi.spyOn(context, "strokeText");
    const preloadProgress = vi.fn();

    arena.renderText("NO_SPACES", 80, 20, {
      align: "right",
      stroke: "#ffffff",
    });
    arena.renderText("A B", 100, 40, {
      align: "end",
    });
    arena.renderText("C D", 20, 60);
    arena.preloadAssets(preloadProgress);

    expect(fillText).toHaveBeenCalledWith("NO_SPACES", 80, 20);
    expect(strokeText).toHaveBeenCalledWith("NO_SPACES", 80, 20);
    expect(preloadProgress).toHaveBeenCalledWith({ loaded: 0, remaining: 0 });

    vi.stubGlobal(
      "Image",
      class {
        onerror: (() => void) | null = null;
        onload: (() => void) | null = null;

        set src(_value: string) {
          window.setTimeout(() => this.onerror?.(), 0);
        }
      }
    );

    arena.registerAssets("/broken.png");
    arena.preloadAssets(preloadProgress);
    await new Promise((resolve) => window.setTimeout(resolve, 5));

    expect(preloadProgress).toHaveBeenLastCalledWith({ loaded: 1, remaining: 0 });

    arena.registerAssets("/default-callback.png");
    arena.preloadAssets();
    await new Promise((resolve) => window.setTimeout(resolve, 5));

    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValueOnce(null);
    const brokenArena = new GameArena(createHost());

    expect(() => brokenArena.getContext()).toThrow("Unable to create canvas context.");

    getContext.mockRestore();

    const webglContext = { kind: "webgl" } as unknown as WebGLRenderingContext;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValueOnce(
      webglContext
    );
    const webglArena = new GameArena(createHost());

    expect(webglArena.getContext(3)).toBe(webglContext);

    arena.destroy();
    brokenArena.destroy();
    webglArena.destroy();
  });

  it("uses legacy fullscreen fallbacks and respects locked or disabled fullscreen states", () => {
    const doc = document as MutableDocumentFullscreen;
    const host = createHost() as MutableElementFullscreen;
    const arena = new GameArena(host);
    const mozRequestFullScreen = vi.fn();
    const webkitRequestFullscreen = vi.fn();
    const cancelFullScreen = vi.fn();
    const mozCancelFullScreen = vi.fn();
    const webkitCancelFullScreen = vi.fn();

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: false,
    });
    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(host, "mozRequestFullScreen", {
      configurable: true,
      value: mozRequestFullScreen,
    });
    Object.defineProperty(host, "webkitRequestFullscreen", {
      configurable: true,
      value: webkitRequestFullscreen,
    });
    Object.defineProperty(doc, "cancelFullScreen", {
      configurable: true,
      value: cancelFullScreen,
    });
    Object.defineProperty(doc, "mozCancelFullScreen", {
      configurable: true,
      value: mozCancelFullScreen,
    });
    Object.defineProperty(doc, "webkitCancelFullScreen", {
      configurable: true,
      value: webkitCancelFullScreen,
    });

    expect(arena.isFullScreenLocked()).toBe(true);
    expect(arena.canToggleFullScreen()).toBe(false);
    arena.toggleFullScreen();
    expect(mozRequestFullScreen).not.toHaveBeenCalled();

    Object.defineProperty(navigator, "standalone", {
      configurable: true,
      value: false,
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: query === "(display-mode: fullscreen)",
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      }))
    );

    expect(arena.isFullScreenLocked()).toBe(true);

    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        addEventListener: vi.fn(),
        addListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: vi.fn(),
        removeListener: vi.fn(),
      }))
    );

    arena.enterFullScreen();
    expect(mozRequestFullScreen).toHaveBeenCalledTimes(1);

    delete host.mozRequestFullScreen;
    arena.enterFullScreen();
    expect(webkitRequestFullscreen).toHaveBeenCalledTimes(1);

    delete doc.exitFullscreen;
    arena.exitFullScreen();
    expect(cancelFullScreen).toHaveBeenCalledTimes(1);

    delete doc.cancelFullScreen;
    arena.exitFullScreen();
    expect(mozCancelFullScreen).toHaveBeenCalledTimes(1);

    delete doc.mozCancelFullScreen;
    arena.exitFullScreen();
    expect(webkitCancelFullScreen).toHaveBeenCalledTimes(1);

    arena.destroy();
  });

  it("resizes arena on normal and fullscreen window changes", () => {
    const host = createHost(300, 200);
    const arena = new GameArena(host);
    let fullscreenElement: Element | null = null;

    Object.defineProperty(host, "clientWidth", {
      configurable: true,
      value: 360,
    });
    Object.defineProperty(host, "clientHeight", {
      configurable: true,
      value: 260,
    });

    window.dispatchEvent(new Event("resize"));
    expect(arena.width).toBe(360);
    expect(arena.height).toBe(260);

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(document, "webkitFullscreenElement", {
      configurable: true,
      get: () => null,
    });
    Object.defineProperty(document, "mozFullScreenElement", {
      configurable: true,
      get: () => null,
    });
    fullscreenElement = host;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 900,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 700,
    });
    Object.defineProperty(screen, "width", {
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(screen, "height", {
      configurable: true,
      value: 768,
    });

    document.dispatchEvent(new Event("fullscreenchange"));
    expect(arena.width).toBe(1024);
    expect(arena.height).toBe(768);

    window.dispatchEvent(new Event("resize"));
    expect(arena.width).toBe(900);
    expect(arena.height).toBe(700);

    fullscreenElement = null;
    document.dispatchEvent(new Event("fullscreenchange"));

    expect(arena.width).toBe(1024);
    expect(arena.height).toBe(768);

    arena.destroy();
  });

  it("covers helper default origins, array binding, legacy event APIs, and unbind-all", () => {
    const legacyTarget = {
      attachEvent: vi.fn(),
      detachEvent: vi.fn(),
    } as unknown as EventTarget & {
      attachEvent: (eventName: string, callback: EventListener) => void;
      detachEvent: (eventName: string, callback: EventListener) => void;
    };
    const callback = vi.fn();

    expect(helpers.detectCollision({ posX: 10, posY: 10, radius: 2 })).toBe(false);
    expect(helpers.detectAreaExit({ posX: 0, posY: 0 }, { posX: 3, posY: 4 }, 5)).toBe(true);

    vi.spyOn(Math, "random").mockReturnValue(0);
    const spawnCoords = helpers.getSpawnCoords(
      { heading: 0, posX: 10, posY: 10 },
      { spawnArc: 10, spawnRadius: 100 }
    );

    expect(spawnCoords.posX).toBeCloseTo(1.28443);
    expect(spawnCoords.posY).toBeCloseTo(-89.61947);

    helpers.bind(["alpha", "beta"], callback, legacyTarget);
    expect(legacyTarget.attachEvent).toHaveBeenCalledWith("onalpha", callback);
    expect(legacyTarget.attachEvent).toHaveBeenCalledWith("onbeta", callback);

    helpers.unbind();
    expect(legacyTarget.detachEvent).toHaveBeenCalledWith("onalpha", callback);
    expect(legacyTarget.detachEvent).toHaveBeenCalledWith("onbeta", callback);
  });

  it("covers ticker control branches and schedule removal", () => {
    const animationFrames: FrameRequestCallback[] = [];
    const requestAnimationFrameSpy = vi.mocked(window.requestAnimationFrame);

    requestAnimationFrameSpy.mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });

    expect(() => new Ticker({ fixedStepFps: 60, fps: 30 })).toThrow(
      "Ticker cannot use fixedStepFps and fps together."
    );
    expect(() => new Ticker({ fixedStepFps: 60 }).setFps(30)).toThrow(
      "Ticker cannot set fps while using fixedStepFps."
    );
    expect(() => new Ticker({ fps: 30 }).setFixedStepFps(60)).toThrow(
      "Ticker cannot set fixedStepFps while using fps."
    );

    const ticker = new Ticker({ fixedStepFps: 10, maxCatchUpFrames: 2 });
    const everyFrame = vi.fn();
    const everyOtherFrame = vi.fn();
    const removedId = ticker.addSchedule(everyFrame, 1);
    const keptId = ticker.addSchedule(everyOtherFrame, 2);

    expect(ticker.removeSchedule(removedId)).toBe(true);
    expect(ticker.removeSchedule(999)).toBe(true);

    ticker.start();
    ticker.start();
    expect(animationFrames).toHaveLength(1);

    animationFrames.shift()?.(0);
    animationFrames.shift()?.(0);
    animationFrames.shift()?.(350);

    expect(everyFrame).not.toHaveBeenCalled();
    expect(everyOtherFrame).toHaveBeenCalledTimes(1);
    expect(everyOtherFrame).toHaveBeenCalledWith(2);
    expect(ticker.getTicks()).toBe(2);
    expect(ticker.removeSchedule(keptId)).toBe(true);

    ticker.clearSchedule();
    ticker.stop();
    animationFrames.shift()?.(450);

    const stoppingTicker = new Ticker();
    const stopOnFrame = vi.fn(() => stoppingTicker.stop());

    stoppingTicker.addSchedule(stopOnFrame, 1);
    stoppingTicker.start();
    animationFrames.shift()?.(500);
    expect(stopOnFrame).toHaveBeenCalledTimes(1);

    const renderTicker = new Ticker({ fps: 30 });
    renderTicker.setFps(60);
    renderTicker.start();
    animationFrames.shift()?.(0);
    animationFrames.shift()?.(0);
    expect(renderTicker.getTicks()).toBe(0);
    renderTicker.stop();

    const fixedTicker = new Ticker();
    fixedTicker.setFixedStepFps(20);
  });

  it("covers sound muting, delayed canplay, immediate fades, stereo fallback, and cleanup errors", async () => {
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    const pause = vi.mocked(HTMLMediaElement.prototype.pause);
    const contextClose = vi.fn(() => Promise.reject(new Error("close failed")));
    const source = {
      connect: vi.fn(),
      disconnect: vi.fn(() => {
        throw new Error("disconnect failed");
      }),
    };
    const panner = {
      connect: vi.fn(() => ({})),
      disconnect: vi.fn(() => {
        throw new Error("disconnect failed");
      }),
      pan: { value: 0 },
    };
    const createMediaElementSource = vi.fn(
      (_mediaElement: HTMLMediaElement) =>
        source as unknown as MediaElementAudioSourceNode
    );

    source.connect.mockReturnValue(panner);

    class MockAudioContext {
      destination = {} as AudioDestinationNode;
      close = contextClose;
      createMediaElementSource = createMediaElementSource;
    }

    class MockStereoPannerNode {
      connect = panner.connect;
      disconnect = panner.disconnect;
      pan = panner.pan;
    }

    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("StereoPannerNode", MockStereoPannerNode);
    Reflect.deleteProperty(window, "PannerNode");

    Sound.configure({
      getVolume: (channel) => (channel === "music" ? 0.6 : 0.8),
    });
    Sound.setMuted(true);

    const effect = new Sound(["/effect.ogg", "/effect.mp3"], {
      autoplay: true,
      instantDestroy: true,
      loop: true,
    });
    const music = new Sound("/music.ogg", { autoplay: false, channel: "music" });
    const effectElement = getSoundElement(effect);
    const musicElement = getSoundElement(music);

    expect(effectElement.loop).toBe(false);
    expect(effectElement.autoplay).toBe(true);
    expect(effectElement.querySelectorAll("source")).toHaveLength(2);

    effect.play();
    expect(effectElement.volume).toBe(0);

    Sound.setMuted(false);
    effect.loop();
    expect(effectElement.loop).toBe(true);
    expect(effectElement.volume).toBe(0.8);

    effect.setPan(5);
    effect.setSpatialPosition(20, -30, 10, 15);
    expect(panner.pan.value).toBe(1);

    music.fadeInLoop(0);
    expect(musicElement.volume).toBe(0.6);
    music.pause();
    music.fadeInResume(0);
    expect(play).toHaveBeenCalled();

    effectElement.dispatchEvent(new Event("ended"));
    expect(pause).toHaveBeenCalled();

    effect.destroy();
    music.destroy();

    await Promise.resolve();
    expect(contextClose).toHaveBeenCalled();
  });

  it("covers sound constructor errors, current-time reset, and 3D spatial updates", async () => {
    const sourceDisconnect = vi.fn();
    const pannerDisconnect = vi.fn();
    const source = {
      connect: vi.fn(),
      disconnect: sourceDisconnect,
    };
    const panner = {
      connect: vi.fn(() => ({})),
      disconnect: pannerDisconnect,
      positionX: { value: 0 },
      positionY: { value: 0 },
      positionZ: { value: 0 },
    };
    const createMediaElementSource = vi.fn(
      (_mediaElement: HTMLMediaElement) =>
        source as unknown as MediaElementAudioSourceNode
    );

    source.connect.mockReturnValue(panner);

    class MockAudioContext {
      destination = {} as AudioDestinationNode;
      close = vi.fn(() => Promise.resolve());
      createMediaElementSource = createMediaElementSource;
    }

    class MockPannerNode {
      connect = panner.connect;
      disconnect = panner.disconnect;
      positionX = panner.positionX;
      positionY = panner.positionY;
      positionZ = panner.positionZ;
    }

    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("PannerNode", MockPannerNode);

    expect(() => new Sound(undefined as unknown as string)).toThrow(
      "You must set an audio url."
    );

    const sound = new Sound("/spatial.ogg", { autoplay: false });
    const element = getSoundElement(sound);

    Object.defineProperty(element, "currentTime", {
      configurable: true,
      writable: true,
      value: 12,
    });

    sound.play();
    sound.setSpatialPosition(50, -25, 100, 50);

    expect(panner.positionX.value).toBe(0.5);
    expect(panner.positionY.value).toBe(0.5);
    expect(panner.positionZ.value).toBe(0);

    sound.stop();
    expect(element.currentTime).toBe(0);

    sound.destroy();
    await Promise.resolve();
    expect(sourceDisconnect).toHaveBeenCalled();
    expect(pannerDisconnect).toHaveBeenCalled();
  });

  it("retries playback when canplay fires after a blocked play attempt", async () => {
    const play = vi.mocked(HTMLMediaElement.prototype.play);
    const onPlaybackBlocked = vi.fn();

    Sound.configure({
      onPlaybackBlocked,
    });
    play.mockClear();
    play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));

    const sound = new Sound("/delayed.ogg", { autoplay: false });
    const element = getSoundElement(sound);

    sound.play();
    await Promise.resolve();
    element.dispatchEvent(new Event("canplay"));

    expect(onPlaybackBlocked).toHaveBeenCalledTimes(1);
    expect(play).toHaveBeenCalledTimes(2);

    sound.destroy();
  });

  it("uses the initial default sound volume before configuration", async () => {
    vi.resetModules();
    const { default: FreshSound } = await import("../Sound.js");
    const sound = new FreshSound("/default-volume.ogg", { autoplay: false });
    const element = (sound as unknown as { _theSound: HTMLAudioElement })
      ._theSound;

    sound.play();

    expect(element.volume).toBe(1);

    sound.destroy();
    FreshSound.configure();
  });

  it("covers sound fade animation, immediate fade-out destroy, and spatial creation failures", () => {
    const animationFrames: FrameRequestCallback[] = [];
    const requestAnimationFrameSpy = vi.mocked(window.requestAnimationFrame);

    requestAnimationFrameSpy.mockImplementation((callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    });
    Object.defineProperty(performance, "now", {
      configurable: true,
      value: vi.fn(() => 0),
    });

    class ThrowingAudioContext {
      createMediaElementSource = vi.fn(() => {
        throw new Error("spatial failed");
      });
    }

    vi.stubGlobal("AudioContext", ThrowingAudioContext);

    Sound.configure({
      getVolume: () => 1,
    });

    const sound = new Sound("/fade.ogg", { autoplay: false });
    const element = getSoundElement(sound);

    sound.fadeInLoop(100);
    expect(element.volume).toBe(0);

    animationFrames.shift()?.(50);
    expect(element.volume).toBeCloseTo(0.5);

    sound.fadeOutAndDestroy(100);
    animationFrames.shift()?.(100);
    expect(element.volume).toBe(1);
    animationFrames.shift()?.(200);

    const inactive = new Sound("/inactive.ogg", { autoplay: false });
    inactive.fadeOutAndDestroy(0);

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  it("destroys all live sounds through the global registry", () => {
    const first = new Sound("/first.ogg", { autoplay: false });
    const second = new Sound("/second.ogg", { autoplay: false });
    const firstPause = vi.spyOn(getSoundElement(first), "pause");
    const secondPause = vi.spyOn(getSoundElement(second), "pause");

    Sound.destroyAll();

    expect(firstPause).toHaveBeenCalled();
    expect(secondPause).toHaveBeenCalled();
  });

  it("covers every random color hue sector", () => {
    const hueRandoms = [
      0.5 / 6,
      1.5 / 6,
      2.5 / 6,
      3.5 / 6,
      4.5 / 6,
      5.5 / 6,
    ];

    for (const hueRandom of hueRandoms) {
      vi.spyOn(Math, "random")
        .mockReturnValueOnce(hueRandom)
        .mockReturnValueOnce(0.5)
        .mockReturnValueOnce(0.5);

      expect(helpers.getRandomColor()).toMatch(/^#[0-9a-f]{6}$/);
      vi.restoreAllMocks();
    }
  });

  it("keeps the public package export surface deliberate", async () => {
    const engine = await import("../index.js");

    expect(Object.keys(engine).sort()).toEqual([
      "AchievementNotificationRenderer",
      "AtmosphericAshEmberEffect",
      "AtmosphericRainEffect",
      "AtmosphericSnowEffect",
      "FpsOverlay",
      "GameArena",
      "PerformanceSampler",
      "ProceduralStarfield",
      "ScreenEffectManager",
      "ScreenWakeLockController",
      "Sound",
      "Ticker",
      "achievementNotificationEventName",
      "addAchievementProgress",
      "appExitBlockedEventName",
      "applyGravity2D",
      "applyGravity3D",
      "areHighScoreTokenHashesEqual",
      "canLockOrientation",
      "canUseFullscreen",
      "canUseScreenWakeLock",
      "centerCubeCluster",
      "clamp",
      "clampGridPosition",
      "clampZoomPercent",
      "cloneCubeBlock",
      "colorWithAlpha",
      "containsBox",
      "createAchievementState",
      "createAtmosphericAshEmberEffect",
      "createAtmosphericRainEffect",
      "createAtmosphericSnowEffect",
      "createCubeClusterFromPattern",
      "createEnvironmentFireEffectDefinition",
      "createEnvironmentFrostEffectDefinition",
      "createEnvironmentHeatEffectDefinition",
      "createEnvironmentUnderwaterEffectDefinition",
      "createExplosionBlocks",
      "createHighScoreIntegrity",
      "createHighScoreManager",
      "createHighScoreRunToken",
      "createHighScoreServerRunReceipt",
      "createInputController",
      "createKeyboardInputController",
      "createLocalMultiplayerController",
      "createMultiplayerSession",
      "createPlasmaLinks",
      "createPlayerInputIntent",
      "createProceduralStarfield",
      "createRagdoll2D",
      "createRagdoll3D",
      "createRayTracingBoundsPolygon",
      "createRayTracingRectangle",
      "createRuntimeLogger",
      "createScreenDropletsEffectDefinition",
      "createScreenFireEffectDefinition",
      "createScreenFrostEffectDefinition",
      "createScreenLowHealthEffectDefinition",
      "createScreenPoisonEffectDefinition",
      "createScreenShockEffectDefinition",
      "createScreenSpeedBoostEffectDefinition",
      "createUserOptionsStore",
      "defaultAchievementNotificationLayout",
      "defaultAchievementNotificationTheme",
      "defaultAchievementNotificationTiming",
      "defaultCustomDisplayFilterSettings",
      "defaultDisplayFilterMode",
      "defaultDisplayFilterRuntimeBoosts",
      "defaultScreenDropletsConfig",
      "defaultZoomMaxPercent",
      "defaultZoomMinPercent",
      "defaultZoomPercent",
      "defaultZoomStepPercent",
      "detectBoxCollision",
      "displayFilterModeLabels",
      "displayFilterModes",
      "displayFilterPresets",
      "displayFilterSettingDescriptions",
      "displayFilterSettingKeys",
      "displayFilterSettingLabels",
      "drawCanvasLine",
      "drawCanvasPolygon",
      "drawDebugVectors",
      "enterImmersiveMode",
      "environmentFireEffectId",
      "environmentFrostEffectId",
      "environmentHeatEffectId",
      "environmentUnderwaterEffectId",
      "exitInstalledApp",
      "fillCanvasWithTrail",
      "findStringTileMapCell",
      "findStringTileMapCells",
      "formatZoomPercent",
      "generateSeededIsoMap",
      "getAchievementStatuses",
      "getAnimatedSpriteFrame",
      "getAvailableLocalStorage",
      "getBoxCenter",
      "getCubeClusterBounds",
      "getCubeClusterCenter",
      "getDepthProgress",
      "getDisplayFilterSettingsForMode",
      "getDistanceGain",
      "getFirstPersonCamera",
      "getFollowCamera",
      "getGamepadInputCodes",
      "getGridCell",
      "getGridCellCenter",
      "getGridPosition",
      "getGridSize",
      "getHighScorePlausibilityReasons",
      "getHighScoreStatValues",
      "getInputActionState",
      "getInputActions",
      "getInputCode",
      "getIsometricTileCorners",
      "getIsometricWallSide",
      "getLoopedDepth",
      "getLoopedScrollerPosition",
      "getManualViewportScale",
      "getNextRuntimeLogLevel",
      "getPerspectiveScale",
      "getPlayerActionState",
      "getRayTracingPolygonSegments",
      "getRayTracingSegments",
      "getScaledViewportLimit",
      "getSideScrollerActorPosition",
      "getSideScrollerJumpY",
      "getSpatialAudioDepth",
      "getSpatialAudioMix",
      "getSpatialAudioPan",
      "getSpriteFrameIndex",
      "getSpriteSheetFrame",
      "getSteppedZoomPercent",
      "getStringTileMapCellFromCenteredPoint",
      "getStringTileMapCenteredPoint",
      "getStringTileMapTile",
      "getVectorDistance",
      "getViewportAreaScale",
      "getViewportPaddedRadius",
      "getViewportRadius",
      "getViewportScale",
      "getVisibleExplosionBlocks",
      "getZoomScale",
      "hashHighScoreRunToken",
      "hashHighScoreText",
      "helpers",
      "isHighScoreEntry",
      "isHighScoreIntegrity",
      "isHighScorePlausible",
      "isHighScoreRunReceipt",
      "isHighScoreServerRunRecord",
      "isHighScoreServerRunRecordUsable",
      "isInsideGrid",
      "isRuntimeLogLevel",
      "keepBoxInside",
      "mergePlayerInputIntent",
      "moveBy",
      "normalizeDisplayFilterIntensity",
      "normalizeDisplayFilterSettings",
      "normalizeHighScoreName",
      "normalizeUserOptions",
      "normalizeVector",
      "parseHexColor",
      "parseStringTileMap",
      "projectIsometricPoint",
      "projectPerspectivePoint",
      "removeScoreStorageKeys",
      "removeStorageKeysMatching",
      "removeStorageNamespace",
      "runtimeLogLevels",
      "screenDropletsEffectId",
      "screenFireEffectId",
      "screenFrostEffectId",
      "screenLowHealthEffectId",
      "screenPoisonEffectId",
      "screenShockEffectId",
      "screenSpeedBoostEffectId",
      "setAchievementProgress",
      "shadeHexColor",
      "snapToGrid",
      "sortHighScores",
      "stepExplosionBlocks",
      "stepRagdoll2D",
      "stepRagdoll3D",
      "traceLightBounces",
      "traceRay",
      "traceVisibilityPolygon",
      "unlockAchievement",
      "userOptionsChangedEventName",
      "validateHighScoreIntegrity",
      "validateHighScoreServerRunReceipt",
      "validateHighScoreSubmission",
      "wrapDepth",
    ]);
  }, 30_000);
});
