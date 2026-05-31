import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

addons.setConfig({
  theme: create({
    base: "dark",
    brandTitle: "Arcade Engine",
    brandUrl: "https://github.com/manix84/arcade-engine",
    brandImage: "/arcade-engine-logo.svg",
    brandTarget: "_self",
    colorPrimary: "#4fd1c5",
    colorSecondary: "#f6e05e",
    appBg: "#0b0f14",
    appContentBg: "#111318",
    appPreviewBg: "#05070a",
    barBg: "#111318",
    barSelectedColor: "#f6e05e",
    barTextColor: "#cbd5e1",
    inputBg: "#0f1720",
    inputBorder: "#2d3a4a",
    inputTextColor: "#f5f7fb",
    textColor: "#f5f7fb",
    textMutedColor: "#94a3b8",
  }),
});
