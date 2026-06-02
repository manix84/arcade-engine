import { describe, expect, it, vi } from "vitest";
import {
  createInputController,
  createKeyboardInputController,
  getAnimatedSpriteFrame,
  getDistanceGain,
  getFollowCamera,
  getGamepadInputCodes,
  getInputCode,
  getInputActionState,
  getInputActions,
  getSpatialAudioMix,
  getSpriteFrameIndex,
  getSpriteSheetFrame,
} from "../index.js";

describe("game system helpers", () => {
  it("maps keyboard inputs to semantic actions", () => {
    const bindings = {
      fire: ["Space"],
      moveLeft: ["ArrowLeft", "KeyA"],
    };

    expect(getInputActions("KeyA", bindings)).toEqual(["moveLeft"]);
    expect(
      getInputActions(
        new KeyboardEvent("keydown", { code: "Space", key: " " }),
        bindings
      )
    ).toEqual(["fire"]);
    expect(getInputActionState(bindings, ["ArrowLeft", "Space"])).toEqual({
      fire: true,
      moveLeft: true,
    });
  });

  it("maps mouse, touch, and gamepad inputs to semantic actions", () => {
    const gamepad = {
      axes: [0.8, -0.7],
      buttons: [{ pressed: false }, { pressed: true }],
    } as unknown as Gamepad;
    const bindings = {
      confirm: ["MouseLeft", "TouchPrimary", "Gamepad1"],
      moveRight: ["GamepadAxisLeftXPositive"],
      moveUp: ["GamepadAxisLeftYNegative"],
    };

    expect(getInputCode(new MouseEvent("mousedown", { button: 0 }))).toBe(
      "MouseLeft"
    );
    expect(getInputActions(new MouseEvent("mousedown", { button: 0 }), bindings)).toEqual([
      "confirm",
    ]);
    expect(getInputCode(new TouchEvent("touchstart"))).toBe("TouchPrimary");
    expect(getInputActions(new TouchEvent("touchstart"), bindings)).toEqual([
      "confirm",
    ]);
    expect(getGamepadInputCodes(gamepad)).toEqual([
      "Gamepad1",
      "GamepadAxisLeftXPositive",
      "GamepadAxisLeftYNegative",
    ]);
    expect(getInputActions(gamepad, bindings)).toEqual([
      "confirm",
      "moveRight",
      "moveUp",
    ]);
  });

  it("tracks keyboard action state through a controller", () => {
    const target = document.createElement("button");
    const controller = createKeyboardInputController(
      {
        jump: ["Space"],
        moveRight: ["ArrowRight"],
      },
      { target }
    );

    controller.start();
    target.dispatchEvent(new KeyboardEvent("keydown", { code: "Space" }));

    expect(controller.isPressed("jump")).toBe(true);
    expect(controller.getPressedInputs()).toEqual(["Space"]);

    target.dispatchEvent(new KeyboardEvent("keyup", { code: "Space" }));
    expect(controller.isPressed("jump")).toBe(false);

    controller.press("ArrowRight");
    expect(controller.getState()).toEqual({
      jump: false,
      moveRight: true,
    });

    controller.stop();
    expect(controller.getPressedInputs()).toEqual([]);
  });

  it("tracks mouse, touch, and gamepad state through a controller", () => {
    const target = document.createElement("button");
    const controller = createInputController(
      {
        confirm: ["MouseLeft", "TouchPrimary", "Gamepad0"],
        moveLeft: ["GamepadAxisLeftXNegative"],
      },
      { target }
    );
    const gamepad = {
      axes: [-0.75],
      buttons: [{ pressed: true }],
    } as unknown as Gamepad;

    controller.start();
    target.dispatchEvent(new MouseEvent("mousedown", { button: 0 }));
    expect(controller.isPressed("confirm")).toBe(true);

    target.dispatchEvent(new MouseEvent("mouseup", { button: 0 }));
    expect(controller.isPressed("confirm")).toBe(false);

    target.dispatchEvent(new TouchEvent("touchstart"));
    expect(controller.isPressed("confirm")).toBe(true);

    target.dispatchEvent(new TouchEvent("touchend"));
    expect(controller.isPressed("confirm")).toBe(false);

    controller.updateGamepads([gamepad]);
    expect(controller.getState()).toEqual({
      confirm: true,
      moveLeft: true,
    });

    controller.stop();
    expect(controller.getPressedInputs()).toEqual([]);
  });

  it("calculates sprite animation frame indices", () => {
    expect(
      getSpriteFrameIndex({
        elapsedSeconds: 1.2,
        fps: 5,
        frameCount: 4,
      })
    ).toBe(2);
    expect(
      getSpriteFrameIndex({
        elapsedSeconds: 99,
        fps: 5,
        frameCount: 4,
        loop: false,
      })
    ).toBe(3);
    expect(() =>
      getSpriteFrameIndex({ elapsedSeconds: 0, fps: 0, frameCount: 1 })
    ).toThrow("Sprite animation FPS must be greater than 0.");
    expect(() =>
      getSpriteFrameIndex({ elapsedSeconds: 0, fps: 1, frameCount: 0 })
    ).toThrow("Sprite animation frame count must be greater than 0.");
  });

  it("creates sprite sheet frame data for GameArena rendering", () => {
    expect(
      getSpriteSheetFrame({
        columns: 4,
        frameHeight: 16,
        frameIndex: 6,
        frameWidth: 24,
        posX: 40,
        posY: 50,
        renderHeight: 32,
        renderWidth: 48,
      })
    ).toEqual({
      frameHeight: 16,
      frameWidth: 24,
      frameX: 48,
      frameY: 16,
      posX: 40,
      posY: 50,
      renderHeight: 32,
      renderWidth: 48,
    });
    expect(() =>
      getSpriteSheetFrame({
        columns: 0,
        frameHeight: 16,
        frameIndex: 0,
        frameWidth: 16,
      })
    ).toThrow("Sprite sheet columns must be greater than 0.");
  });

  it("creates animated sprite frame data in one call", () => {
    expect(
      getAnimatedSpriteFrame({
        columns: 3,
        elapsedSeconds: 0.75,
        fps: 4,
        frameCount: 6,
        frameHeight: 16,
        frameWidth: 16,
      })
    ).toMatchObject({
      frameX: 0,
      frameY: 16,
    });
  });

  it("follows a target with dead-zone, smoothing, and world bounds", () => {
    expect(
      getFollowCamera({
        current: { posX: 80, posY: 40 },
        deadZone: { height: 40, width: 60 },
        smoothing: 0.5,
        target: { posX: 260, posY: 120 },
        viewport: { height: 100, width: 200 },
        worldBounds: { height: 500, width: 600 },
      })
    ).toEqual({ posX: 105, posY: 45 });

    expect(
      getFollowCamera({
        target: { posX: -100, posY: -100 },
        viewport: { height: 100, width: 200 },
        worldBounds: { height: 300, width: 300 },
      })
    ).toEqual({ posX: 0, posY: 0 });
  });

  it("calculates spatial audio gain and mix", () => {
    expect(
      getDistanceGain({
        distance: 50,
        maxDistance: 100,
      })
    ).toBe(0.5);
    expect(
      getDistanceGain({
        distance: 50,
        maxDistance: 100,
        rolloff: 2,
      })
    ).toBe(0.25);
    expect(() =>
      getDistanceGain({ distance: 0, maxDistance: 10, minDistance: 10 })
    ).toThrow("Max distance must be greater than min distance.");

    expect(
      getSpatialAudioMix({
        listener: { posX: 10, posY: 10 },
        listenerRange: 100,
        maxDistance: 100,
        source: { posX: 40, posY: 50 },
      })
    ).toEqual({
      distance: 50,
      gain: 0.5,
      pan: 0.3,
    });
    expect(() =>
      getSpatialAudioMix({
        listenerRange: 0,
        maxDistance: 100,
        source: { posX: 0, posY: 0 },
      })
    ).toThrow("Listener range must be greater than 0.");
  });

  it("does not add duplicate controller listeners when started repeatedly", () => {
    const target = document.createElement("button");
    const addEventListener = vi.spyOn(target, "addEventListener");
    const controller = createKeyboardInputController({ jump: ["Space"] }, { target });

    controller.start();
    const initialListenerCount = addEventListener.mock.calls.length;
    controller.start();

    expect(addEventListener).toHaveBeenCalledTimes(initialListenerCount);

    controller.stop();
  });
});
