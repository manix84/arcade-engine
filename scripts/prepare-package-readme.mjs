import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const action = process.argv[2];
const readmePath = "README.md";
const backupPath = ".readme.package-backup";
const screenshotBaseUrl =
  "https://raw.githubusercontent.com/manix84/arcade-engine/main/docs/screenshots/";

const replaceScreenshotLinks = (content) =>
  content.replaceAll("](docs/screenshots/", `](${screenshotBaseUrl}`);

if (action === "apply") {
  if (!existsSync(backupPath)) {
    copyFileSync(readmePath, backupPath);
  }

  const original = readFileSync(readmePath, "utf8");
  const packaged = replaceScreenshotLinks(original);

  if (packaged !== original) {
    writeFileSync(readmePath, packaged);
  }

  console.log("Prepared README.md for npm package.");
} else if (action === "restore") {
  if (existsSync(backupPath)) {
    copyFileSync(backupPath, readmePath);
    rmSync(backupPath);
    console.log("Restored source README.md after npm package preparation.");
  }
} else {
  console.error("Usage: node scripts/prepare-package-readme.mjs <apply|restore>");
  process.exit(1);
}
