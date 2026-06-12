import type { Meta } from "@storybook/html-vite";

import {
  DisplayFilters as DisplayFiltersStory,
  ProceduralStars as ProceduralStarsStory,
  RayTracedApartment as RayTracedApartmentStory,
  SpriteAnimationAndCamera as SpriteAnimationAndCameraStory,
} from "./systems-demos.js";

const meta = {
  title: "Engine/Rendering",
} satisfies Meta;

export default meta;

export const DisplayFilters = DisplayFiltersStory;
export const ProceduralStars = ProceduralStarsStory;
export const RayTracedApartment = RayTracedApartmentStory;
export const SpriteAnimationAndCamera = SpriteAnimationAndCameraStory;
