import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const rawTag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "";
const tagVersion = rawTag.replace(/^refs\/tags\//, "").replace(/^v/, "");

if (!rawTag) {
  console.error("Release tag is required.");
  process.exit(1);
}

if (tagVersion !== packageJson.version) {
  console.error(
    `Release tag ${rawTag} does not match package.json version ${packageJson.version}.`
  );
  process.exit(1);
}

console.log(`Release tag ${rawTag} matches package version ${packageJson.version}.`);
