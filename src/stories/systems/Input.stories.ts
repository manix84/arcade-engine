import type { Meta } from "@storybook/html-vite";

import { InputActions as InputActionsStory, LocalMultiplayer as LocalMultiplayerStory } from "./systems-demos.js";

const meta = {
  title: "Engine/Input",
} satisfies Meta;

export default meta;

export const InputActions = InputActionsStory;
export const LocalMultiplayer = LocalMultiplayerStory;
