import type { Meta } from "@storybook/html-vite";

import {
  Gravity as GravityStory,
  Ragdoll2D as Ragdoll2DStory,
  Ragdoll3D as Ragdoll3DStory,
} from "./systems-demos.js";

const meta = {
  title: "Engine/Systems/Physics",
} satisfies Meta;

export default meta;

export const Gravity = GravityStory;
export const Ragdoll2D = Ragdoll2DStory;
export const Ragdoll3D = Ragdoll3DStory;
