import type { Meta } from "@storybook/html-vite";

import {
  AtmosphericRain as AtmosphericRainStory,
  AtmosphericSnow as AtmosphericSnowStory,
} from "./systems-demos.js";

const meta = {
  title: "Engine/Systems/Atmospheric Effects",
} satisfies Meta;

export default meta;

export const Rain = AtmosphericRainStory;
export const Snow = AtmosphericSnowStory;
