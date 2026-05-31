import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const hooksPath = ".githooks";
const result = spawnSync("git", ["config", "core.hooksPath", hooksPath], {
  cwd: resolve("."),
  encoding: "utf8",
  stdio: "pipe",
});

if (result.status !== 0) {
  const message = [result.stdout, result.stderr].filter(Boolean).join("\n");

  console.warn(
    `Git hook setup skipped: ${message || "unable to configure core.hooksPath"}`
  );
  process.exit(0);
}

console.log(`Git hooks path set to ${hooksPath}.`);
