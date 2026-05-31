import { spawnSync } from "node:child_process";

const checks = [
  ["npm", ["run", "lint"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["test"]],
  ["npm", ["run", "version:bump"]],
];

for (const [command, args] of checks) {
  const label = [command, ...args].join(" ");

  console.log(`\nPre-commit: ${label}`);

  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`\nPre-commit failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}
