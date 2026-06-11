import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

mkdirSync("release-artifacts", { recursive: true });

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageReadmeRef =
  process.env.PACKAGE_README_REF ?? process.env.RELEASE_TAG ?? `v${packageJson.version}`;

const run = (args) =>
  spawnSync(process.execPath, args, {
    env: {
      ...process.env,
      PACKAGE_README_REF: packageReadmeRef,
    },
    stdio: "inherit",
  });

const npmCli = process.env.npm_execpath;
const npmArgs = [
  "pack",
  "--pack-destination",
  "release-artifacts",
  ...process.argv.slice(2),
];
const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const commandArgs = npmCli ? [npmCli, ...npmArgs] : npmArgs;

let status = 1;

try {
  const prepareResult = run(["scripts/prepare-package-readme.mjs", "apply"]);

  if (prepareResult.status !== 0) {
    status = prepareResult.status ?? 1;
  } else {
    const result = spawnSync(command, commandArgs, { stdio: "inherit" });
    status = result.status ?? 1;
  }
} finally {
  const restoreResult = run(["scripts/prepare-package-readme.mjs", "restore"]);

  if (status === 0 && restoreResult.status !== 0) {
    status = restoreResult.status ?? 1;
  }
}

process.exit(status);
