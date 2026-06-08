import type { Meta } from "@storybook/html-vite";

import {
  ScreenDroplets as ScreenDropletsStory,
  ScreenFire as ScreenFireStory,
  ScreenFrost as ScreenFrostStory,
  ScreenLowHealth as ScreenLowHealthStory,
  ScreenPoison as ScreenPoisonStory,
} from "./systems-demos.js";

const meta = {
  title: "Engine/Systems/Screen Effects",
} satisfies Meta;

export default meta;

export const ScreenDroplets = ScreenDropletsStory;
export const ScreenFire = ScreenFireStory;
export const ScreenFrost = ScreenFrostStory;
export const ScreenPoison = ScreenPoisonStory;
export const ScreenLowHealth = ScreenLowHealthStory;
