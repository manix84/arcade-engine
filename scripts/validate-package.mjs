import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "README.md",
  "dist/high-scores.js",
  "dist/high-scores.js.map",
  "dist/high-scores.d.ts",
  "dist/high-scores.d.ts.map",
  "dist/index.js",
  "dist/index.js.map",
  "dist/index.d.ts",
  "dist/index.d.ts.map",
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));

if (missingFiles.length) {
  console.error(`Package validation missing required file(s): ${missingFiles.join(", ")}`);
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

if (packageJson.private) {
  console.error("Package cannot be published while package.json private is true.");
  process.exit(1);
}

if (packageJson.readmeFilename !== "README.md") {
  console.error(
    `Package readmeFilename must point at README.md; found ${JSON.stringify(
      packageJson.readmeFilename
    )}.`
  );
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

if (packageJson.exports?.["./high-scores"]?.types !== "./dist/high-scores.d.ts") {
  console.error(
    "Package high-scores export types must point at ./dist/high-scores.d.ts."
  );
  process.exit(1);
}

if (packageJson.exports?.["./high-scores"]?.import !== "./dist/high-scores.js") {
  console.error(
    "Package high-scores export import must point at ./dist/high-scores.js."
  );
  process.exit(1);
}

console.log("Package build output validated.");
