import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "dist/index.js",
  "dist/index.js.map",
  "dist/index.d.ts",
  "dist/index.d.ts.map",
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));

if (missingFiles.length) {
  console.error(`Build output missing: ${missingFiles.join(", ")}`);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

if (packageJson.private) {
  console.error("Package cannot be published while package.json private is true.");
  process.exit(1);
}

if (packageJson.exports?.["."]?.types !== "./dist/index.d.ts") {
  console.error("Package export types must point at ./dist/index.d.ts.");
  process.exit(1);
}

if (packageJson.exports?.["."]?.import !== "./dist/index.js") {
  console.error("Package export import must point at ./dist/index.js.");
  process.exit(1);
}

console.log("Package build output validated.");
