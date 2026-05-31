import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type TestProjectConfiguration } from "vitest/config";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));
const isCoverageRun = process.argv.some(
  (argument) => argument === "--coverage" || argument.startsWith("--coverage.")
);
const hasExplicitProject = process.argv.some(
  (argument, index, args) =>
    argument === "--project" ||
    argument.startsWith("--project=") ||
    args[index - 1] === "--project"
);
const unitProject: TestProjectConfiguration = {
  extends: true,
  test: {
    name: "unit",
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
  },
};
const storybookProject: TestProjectConfiguration = {
  extends: true,
  plugins: [
    // The plugin will run tests for the stories defined in your Storybook config.
    storybookTest({
      configDir: path.join(dirname, ".storybook"),
    }),
  ],
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      instances: [
        {
          browser: "chromium",
        },
      ],
    },
  },
};

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  resolve: {
    preserveSymlinks: true,
  },
  test: {
    coverage: {
      thresholds: {
        statements: 100,
        functions: 100,
        lines: 100,
      },
    },
    projects:
      isCoverageRun && !hasExplicitProject
        ? [unitProject]
        : [unitProject, storybookProject],
  },
});
