import {
  createInputController,
  getInputActionState,
  type GamepadInputOptions,
  type InputActionBindings,
  type InputActionState,
  type InputController,
} from "./input.js";

export type MultiplayerMode = "co-op" | "versus";
export type MultiplayerConnection = "local" | "remote";
export type MultiplayerAuthority = "host" | "client" | "relay";
export type MultiplayerTeam = "shared" | "p1" | "p2" | string;

export interface MultiplayerPlayer {
  bindings: InputActionBindings;
  connection?: MultiplayerConnection;
  gamepadIndex?: number;
  id: string;
  name?: string;
  team?: MultiplayerTeam;
}

export interface LocalMultiplayerControllerOptions {
  gamepad?: GamepadInputOptions;
  target?: EventTarget;
}

export interface LocalMultiplayerController {
  getPlayerState: (playerId: string) => InputActionState;
  getState: () => Record<string, InputActionState>;
  isPressed: (playerId: string, action: string) => boolean;
  players: readonly MultiplayerPlayer[];
  press: (playerId: string, input: string) => void;
  release: (playerId: string, input: string) => void;
  start: () => void;
  stop: () => void;
  updateGamepads: (gamepads?: readonly (Gamepad | null)[]) => void;
}

export interface MultiplayerPeer {
  connection: MultiplayerConnection;
  id: string;
  isLocal?: boolean;
  playerId?: string;
  team?: MultiplayerTeam;
}

export interface MultiplayerSession {
  authority: MultiplayerAuthority;
  id: string;
  localPeerId?: string;
  maxPlayers: number;
  mode: MultiplayerMode;
  peers: readonly MultiplayerPeer[];
}

export interface MultiplayerSessionOptions {
  authority?: MultiplayerAuthority;
  id: string;
  localPeerId?: string;
  maxPlayers?: number;
  mode: MultiplayerMode;
  peers?: readonly MultiplayerPeer[];
}

export interface PlayerInputIntent {
  actions: InputActionState;
  playerId: string;
  sequence: number;
  tick?: number;
}

export interface PlayerInputIntentOptions {
  actions: InputActionState;
  playerId: string;
  sequence: number;
  tick?: number;
}

const assertPlayerExists = (
  controllers: Map<string, InputController>,
  playerId: string
): InputController => {
  const controller = controllers.get(playerId);

  if (!controller) {
    throw new Error(`Unknown multiplayer player: ${playerId}.`);
  }

  return controller;
};

export const createLocalMultiplayerController = (
  players: readonly MultiplayerPlayer[],
  options: LocalMultiplayerControllerOptions = {}
): LocalMultiplayerController => {
  const controllers = new Map(
    players.map((player) => [
      player.id,
      createInputController(player.bindings, {
        gamepad: options.gamepad,
        target: options.target,
      }),
    ])
  );

  return {
    getPlayerState: (playerId: string) => assertPlayerExists(controllers, playerId).getState(),
    getState: () =>
      Object.fromEntries(
        players.map((player) => [
          player.id,
          assertPlayerExists(controllers, player.id).getState(),
        ])
      ),
    isPressed: (playerId: string, action: string) =>
      assertPlayerExists(controllers, playerId).isPressed(action),
    players: [...players],
    press: (playerId: string, input: string) => {
      assertPlayerExists(controllers, playerId).press(input);
    },
    release: (playerId: string, input: string) => {
      assertPlayerExists(controllers, playerId).release(input);
    },
    start: () => {
      controllers.forEach((controller) => controller.start());
    },
    stop: () => {
      controllers.forEach((controller) => controller.stop());
    },
    updateGamepads: (gamepads?: readonly (Gamepad | null)[]) => {
      const connectedGamepads = gamepads ?? navigator.getGamepads?.() ?? [];

      players.forEach((player) => {
        const controller = assertPlayerExists(controllers, player.id);
        const playerGamepads =
          player.gamepadIndex === undefined
            ? connectedGamepads
            : [connectedGamepads[player.gamepadIndex] ?? null];

        controller.updateGamepads(playerGamepads);
      });
    },
  };
};

export const createMultiplayerSession = (
  options: MultiplayerSessionOptions
): MultiplayerSession => ({
  authority: options.authority ?? "host",
  id: options.id,
  localPeerId: options.localPeerId,
  maxPlayers: options.maxPlayers ?? Math.max(options.peers?.length ?? 0, 2),
  mode: options.mode,
  peers: [...(options.peers ?? [])],
});

export const createPlayerInputIntent = (
  options: PlayerInputIntentOptions
): PlayerInputIntent => ({
  actions: { ...options.actions },
  playerId: options.playerId,
  sequence: options.sequence,
  tick: options.tick,
});

export const getPlayerActionState = (
  player: MultiplayerPlayer,
  pressedInputs: Iterable<string>
): InputActionState => getInputActionState(player.bindings, pressedInputs);

export const mergePlayerInputIntent = (
  state: Record<string, InputActionState>,
  intent: PlayerInputIntent
): Record<string, InputActionState> => ({
  ...state,
  [intent.playerId]: { ...intent.actions },
});
