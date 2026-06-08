import type { Meta } from "@storybook/html-vite";

import {
  Achievements as AchievementsStory,
  AchievementNotifications as AchievementNotificationsStory,
} from "./systems-demos.js";

const meta = {
  title: "Engine/Systems/Achievements",
} satisfies Meta;

export default meta;

export const Achievements = AchievementsStory;
export const AchievementNotifications = AchievementNotificationsStory;
