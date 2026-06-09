import type { Meta } from "@storybook/html-vite";

import {
  EnvironmentFire as EnvironmentFireStory,
  EnvironmentFrost as EnvironmentFrostStory,
  EnvironmentHeat as EnvironmentHeatStory,
  EnvironmentUnderwater as EnvironmentUnderwaterStory,
} from "./systems-demos.js";

const meta = {
  title: "Engine/Systems/Environment Screen Effects",
} satisfies Meta;

export default meta;

export const Heat = EnvironmentHeatStory;
export const Frost = EnvironmentFrostStory;
export const Fire = EnvironmentFireStory;
export const Underwater = EnvironmentUnderwaterStory;
