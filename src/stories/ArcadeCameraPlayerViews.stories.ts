import type { Meta } from "@storybook/html-vite";

import {
  FirstPersonPlayer as FirstPersonPlayerStory,
  IsometricDungeonRoom as IsometricDungeonRoomStory,
} from "./arcade-camera-demos.js";

const meta = {
  title: "Engine/Demos/Arcade Camera Styles/Player Views",
} satisfies Meta;

export default meta;

export const FirstPersonPlayer = FirstPersonPlayerStory;
export const IsometricDungeonRoom = IsometricDungeonRoomStory;
