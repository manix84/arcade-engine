import type { Meta } from "@storybook/html-vite";

import { HighScores as HighScoresStory, UserOptions as UserOptionsStory } from "./systems-demos.js";

const meta = {
  title: "Engine/Player Data",
} satisfies Meta;

export default meta;

export const HighScores = HighScoresStory;
export const UserOptions = UserOptionsStory;
