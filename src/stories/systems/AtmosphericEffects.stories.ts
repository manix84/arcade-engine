import type { Meta } from "@storybook/html-vite";

import {
  AtmosphericAshAndEmbers as AtmosphericAshAndEmbersStory,
  AtmosphericRain as AtmosphericRainStory,
  AtmosphericSnow as AtmosphericSnowStory,
} from "./systems-demos.js";

const meta = {
  title: "Engine/Effects/Atmospheric",
} satisfies Meta;

export default meta;

export const Rain = AtmosphericRainStory;
export const Snow = AtmosphericSnowStory;
export const AshAndEmbers = AtmosphericAshAndEmbersStory;
