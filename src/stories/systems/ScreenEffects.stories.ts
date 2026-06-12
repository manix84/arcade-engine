import type { Meta } from "@storybook/html-vite";

import {
  ScreenDroplets as ScreenDropletsStory,
  ScreenFire as ScreenFireStory,
  ScreenFrost as ScreenFrostStory,
  ScreenLowHealth as ScreenLowHealthStory,
  ScreenPoison as ScreenPoisonStory,
  ScreenShock as ScreenShockStory,
  ScreenSpeedBoost as ScreenSpeedBoostStory,
} from "./systems-demos.js";

const meta = {
  title: "Engine/Effects/Player",
} satisfies Meta;

export default meta;

export const ScreenDroplets = ScreenDropletsStory;
export const ScreenFire = ScreenFireStory;
export const ScreenFrost = ScreenFrostStory;
export const ScreenPoison = ScreenPoisonStory;
export const ScreenLowHealth = ScreenLowHealthStory;
export const ScreenShock = ScreenShockStory;
export const ScreenSpeedBoost = ScreenSpeedBoostStory;
