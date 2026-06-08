import type { Meta } from "@storybook/html-vite";

import {
  DisplayFilters as DisplayFiltersStory,
  SpriteAnimationAndCamera as SpriteAnimationAndCameraStory,
} from "./systems-demos.js";

const meta = {
  title: "Engine/Systems/Presentation",
} satisfies Meta;

export default meta;

export const DisplayFilters = DisplayFiltersStory;
export const SpriteAnimationAndCamera = SpriteAnimationAndCameraStory;
