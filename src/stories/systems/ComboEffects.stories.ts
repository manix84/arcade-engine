import type { Meta } from "@storybook/html-vite";

import {
  FireAshCombo as FireAshComboStory,
  FrostSnowCombo as FrostSnowComboStory,
  RainCombo as RainComboStory,
} from "./systems-demos.js";

const meta = {
  title: "Engine/Systems/Combo Effects",
} satisfies Meta;

export default meta;

export const RainCombo = RainComboStory;
export const FireAshCombo = FireAshComboStory;
export const FrostSnowCombo = FrostSnowComboStory;
