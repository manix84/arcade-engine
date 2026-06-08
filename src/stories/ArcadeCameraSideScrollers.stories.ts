import type { Meta } from "@storybook/html-vite";

import {
  SideScroller2_5D as SideScroller2_5DStory,
  SideScroller2D as SideScroller2DStory,
} from "./arcade-camera-demos.js";

const meta = {
  title: "Engine/Demos/Arcade Camera Styles/Side Scrollers",
} satisfies Meta;

export default meta;

export const SideScroller2_5D = SideScroller2_5DStory;
export const SideScroller2D = SideScroller2DStory;
