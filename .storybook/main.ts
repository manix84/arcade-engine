import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },

  stories: ["../src/stories/**/*.stories.ts"],
  staticDirs: ["./public"],
  addons: [
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
  viteFinal: (config) => ({
    ...config,
    server: {
      ...config.server,
      headers: {
        ...config.server?.headers,
        "X-Clacks-Overhead": "GNU Terry Pratchett",
      },
    },
  }),
};

export default config;
