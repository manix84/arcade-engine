import type { Meta } from "@storybook/html-vite";

import { SpatialAudioMath as SpatialAudioMathStory } from "./systems-demos.js";

const meta = {
  title: "Engine/Systems/Audio",
} satisfies Meta;

export default meta;

export const SpatialAudioMath = SpatialAudioMathStory;
