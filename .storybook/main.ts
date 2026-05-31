import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
  stories: ["../src/stories/**/*.stories.ts"],
  staticDirs: ["./public"],
};

export default config;
