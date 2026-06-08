import type { Meta } from "@storybook/html-vite";

import { Gravity, Ragdoll2D, Ragdoll3D } from "./systems-demos.js";

const meta = {
  title: "Engine/Systems/Physics",
} satisfies Meta;

export default meta;

export { Gravity, Ragdoll2D, Ragdoll3D };
