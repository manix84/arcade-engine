import type { Meta } from "@storybook/html-vite";

import {
  HyperspaceGate as HyperspaceGateStory,
  NeonVectorRacer as NeonVectorRacerStory,
  StarfighterRun as StarfighterRunStory,
} from "./arcade-camera-demos.js";

const meta = {
  title: "Engine/Demos/Arcade Camera Styles/Pseudo 3D",
} satisfies Meta;

export default meta;

export const HyperspaceGate = HyperspaceGateStory;
export const NeonVectorRacer = NeonVectorRacerStory;
export const StarfighterRun = StarfighterRunStory;
