import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

mkdirSync("release-artifacts", { recursive: true });

const run = (args) =>
  spawnSync(process.execPath, args, {
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
