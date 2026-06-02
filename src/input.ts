export type InputActionBindings = Record<string, readonly string[]>;
export type InputActionState = Record<string, boolean>;
export type InputDeviceEvent =
  | Gamepad
  | KeyboardEvent
  | MouseEvent
  | PointerEvent
  | TouchEvent
  | string;

export interface GamepadInputOptions {
  axisThreshold?: number;
}

export interface InputController {
  getPressedInputs: () => string[];
  getState: () => InputActionState;
  isPressed: (action: string) => boolean;
  press: (input: string) => void;
  release: (input: string) => void;
  start: () => void;
  stop: () => void;
  updateGamepads: (gamepads?: readonly (Gamepad | null)[]) => void;
}

export type KeyboardInputController = InputController;

export interface InputControllerOptions {
  gamepad?: GamepadInputOptions;
  target?: EventTarget;
}

export type KeyboardInputControllerOptions = InputControllerOptions;

const mouseButtonCodes = ["MouseLeft", "MouseMiddle", "MouseRight"];
const gamepadAxisNames = ["LeftX", "LeftY", "RightX", "RightY"];

const getKeyboardInputCode = (input: KeyboardEvent): string => input.code || input.key;

const getPointerInputCode = (input: MouseEvent | PointerEvent): string => {
  const pointerType = "pointerType" in input ? input.pointerType : "mouse";

  if (pointerType === "touch") {
    return "TouchPrimary";
  }

  if (pointerType === "pen") {
    return "PenPrimary";
  }

  return mouseButtonCodes[input.button] ?? `MouseButton${input.button}`;
};

const getTouchInputCode = (input: TouchEvent): string =>
  input.touches.length > 1 || input.changedTouches.length > 1
    ? "TouchMulti"
    : "TouchPrimary";

const isKeyboardEvent = (input: InputDeviceEvent): input is KeyboardEvent =>
  typeof KeyboardEvent !== "undefined" && input instanceof KeyboardEvent;

const isPointerEvent = (input: InputDeviceEvent): input is PointerEvent =>
  typeof PointerEvent !== "undefined" && input instanceof PointerEvent;

const isMouseEvent = (input: InputDeviceEvent): input is MouseEvent =>
  typeof MouseEvent !== "undefined" && input instanceof MouseEvent;

const isTouchEvent = (input: InputDeviceEvent): input is TouchEvent =>
  typeof TouchEvent !== "undefined" && input instanceof TouchEvent;

const isGamepad = (input: InputDeviceEvent): input is Gamepad =>
  typeof input === "object" && "buttons" in input && "axes" in input;

export const getGamepadInputCodes = (
  gamepad: Gamepad,
  options: GamepadInputOptions = {}
): string[] => {
  const axisThreshold = options.axisThreshold ?? 0.5;
  const inputs: string[] = [];

  gamepad.buttons.forEach((button, index) => {
    if (button.pressed) {
      inputs.push(`Gamepad${index}`);
    }
  });

  gamepad.axes.forEach((axis, index) => {
    if (Math.abs(axis) < axisThreshold) {
      return;
    }

    const axisName = gamepadAxisNames[index] ?? `Axis${index}`;
    const direction = axis > 0 ? "Positive" : "Negative";

    inputs.push(`GamepadAxis${axisName}${direction}`);
  });

  return inputs;
};

export const getInputCode = (
  input: InputDeviceEvent,
  options: GamepadInputOptions = {}
): string => {
  if (typeof input === "string") {
    return input;
  }

  if (isKeyboardEvent(input)) {
    return getKeyboardInputCode(input);
  }

  if (isPointerEvent(input) || isMouseEvent(input)) {
    return getPointerInputCode(input);
  }

  if (isTouchEvent(input)) {
    return getTouchInputCode(input);
  }

  if (isGamepad(input)) {
    return getGamepadInputCodes(input, options)[0] ?? "";
  }

  return "";
};

export const getInputActions = (
  input: InputDeviceEvent,
  bindings: InputActionBindings,
  options: GamepadInputOptions = {}
): string[] => {
  const inputCodes = isGamepad(input)
    ? getGamepadInputCodes(input, options)
    : [getInputCode(input, options)];
  const inputSet = new Set(inputCodes);

  return Object.entries(bindings)
    .filter(([, inputs]) => inputs.some((boundInput) => inputSet.has(boundInput)))
    .map(([action]) => action);
};

export const getInputActionState = (
  bindings: InputActionBindings,
  pressedInputs: Iterable<string>
): InputActionState => {
  const pressed = new Set(pressedInputs);

  return Object.fromEntries(
    Object.entries(bindings).map(([action, inputs]) => [
      action,
      inputs.some((input) => pressed.has(input)),
    ])
  );
};

export const createInputController = (
  bindings: InputActionBindings,
  options: InputControllerOptions = {}
): InputController => {
  const target = options.target ?? window;
  const pressed = new Set<string>();
  const gamepadPressed = new Set<string>();
  let isStarted = false;

  const getAllPressedInputs = (): string[] => [
    ...new Set([...pressed, ...gamepadPressed]),
  ];

  const handleKeyDown = (event: Event): void => {
    pressed.add(getKeyboardInputCode(event as KeyboardEvent));
  };
  const handleKeyUp = (event: Event): void => {
    pressed.delete(getKeyboardInputCode(event as KeyboardEvent));
  };
  const handlePointerDown = (event: Event): void => {
    pressed.add(getPointerInputCode(event as PointerEvent));
  };
  const handlePointerUp = (event: Event): void => {
    pressed.delete(getPointerInputCode(event as PointerEvent));
  };
  const handleTouchStart = (event: Event): void => {
    pressed.add(getTouchInputCode(event as TouchEvent));
  };
  const handleTouchEnd = (): void => {
    pressed.delete("TouchPrimary");
    pressed.delete("TouchMulti");
  };

  const controller: InputController = {
    getPressedInputs: getAllPressedInputs,
    getState: () => getInputActionState(bindings, getAllPressedInputs()),
    isPressed: (action: string) =>
      Boolean(getInputActionState(bindings, getAllPressedInputs())[action]),
    press: (input: string) => {
      pressed.add(input);
    },
    release: (input: string) => {
      pressed.delete(input);
      gamepadPressed.delete(input);
    },
    start: () => {
      if (isStarted) {
        return;
      }

      target.addEventListener("keydown", handleKeyDown);
      target.addEventListener("keyup", handleKeyUp);
      target.addEventListener("pointerdown", handlePointerDown);
      target.addEventListener("pointerup", handlePointerUp);
      target.addEventListener("pointercancel", handlePointerUp);
      target.addEventListener("mousedown", handlePointerDown);
      target.addEventListener("mouseup", handlePointerUp);
      target.addEventListener("touchstart", handleTouchStart);
      target.addEventListener("touchend", handleTouchEnd);
      target.addEventListener("touchcancel", handleTouchEnd);
      isStarted = true;
    },
    stop: () => {
      if (!isStarted) {
        return;
      }

      target.removeEventListener("keydown", handleKeyDown);
      target.removeEventListener("keyup", handleKeyUp);
      target.removeEventListener("pointerdown", handlePointerDown);
      target.removeEventListener("pointerup", handlePointerUp);
      target.removeEventListener("pointercancel", handlePointerUp);
      target.removeEventListener("mousedown", handlePointerDown);
      target.removeEventListener("mouseup", handlePointerUp);
      target.removeEventListener("touchstart", handleTouchStart);
      target.removeEventListener("touchend", handleTouchEnd);
      target.removeEventListener("touchcancel", handleTouchEnd);
      pressed.clear();
      gamepadPressed.clear();
      isStarted = false;
    },
    updateGamepads: (gamepads?: readonly (Gamepad | null)[]) => {
      gamepadPressed.clear();
      const connectedGamepads =
        gamepads ?? navigator.getGamepads?.() ?? [];

      connectedGamepads.forEach((gamepad) => {
        if (!gamepad) {
          return;
        }

        getGamepadInputCodes(gamepad, options.gamepad).forEach((input) => {
          gamepadPressed.add(input);
        });
      });
    },
  };

  return controller;
};

export const createKeyboardInputController = createInputController;
