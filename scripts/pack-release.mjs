import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

mkdirSync("release-artifacts", { recursive: true });

const npmCli = process.env.npm_execpath;
const npmArgs = [
  "pack",
  "--pack-destination",
  "release-artifacts",
  ...process.argv.slice(2),
];
const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const commandArgs = npmCli ? [npmCli, ...npmArgs] : npmArgs;
const result = spawnSync(command, commandArgs, { stdio: "inherit" });

process.exit(result.status ?? 1);
