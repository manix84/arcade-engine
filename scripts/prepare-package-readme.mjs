import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const action = process.argv[2];
const readmePath = "README.md";
const backupPath = ".readme.package-backup";

const getScreenshotRef = () => {
  if (process.env.PACKAGE_README_REF) {
    return process.env.PACKAGE_README_REF;
  }

  if (process.env.RELEASE_TAG) {
    return process.env.RELEASE_TAG;
  }

  if (process.env.GITHUB_REF_TYPE === "tag" && process.env.GITHUB_REF_NAME) {
    return process.env.GITHUB_REF_NAME;
  }

  return "main";
};

const replaceScreenshotLinks = (content) => {
  const screenshotBaseUrl =
    `https://raw.githubusercontent.com/manix84/arcade-engine/${getScreenshotRef()}/docs/screenshots/`;

  return content.replaceAll("](docs/screenshots/", `](${screenshotBaseUrl}`);
};

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
