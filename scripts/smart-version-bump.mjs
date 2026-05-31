import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const VALID_BUMPS = new Set(["major", "minor", "patch", "none"]);
const override = process.env.ARCADE_ENGINE_VERSION_BUMP;

if (override && !VALID_BUMPS.has(override)) {
  console.error(
    `Invalid ARCADE_ENGINE_VERSION_BUMP=${override}. Use major, minor, patch, or none.`
  );
  process.exit(1);
}

function git(args, options = {}) {
  const result = spawnSync("git", args, { encoding: "utf8", ...options });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  return result.stdout.trim();
}

function gitWithInput(args, input) {
  return git(args, { input });
}

function readStagedFile(path) {
  return git(["show", `:${path}`]);
}

function readHeadFile(path) {
  const result = spawnSync("git", ["show", `HEAD:${path}`], {
    encoding: "utf8",
  });

  return result.status === 0 ? result.stdout : undefined;
}

function getPackageVersion(content) {
  return JSON.parse(content).version;
}

function stageFileContent(path, content) {
  const indexEntry = git(["ls-files", "-s", "--", path]);

  if (!indexEntry) {
    throw new Error(`Cannot stage version bump for untracked file: ${path}`);
  }

  const [mode] = indexEntry.split(/\s+/);
  const blob = gitWithInput(["hash-object", "-w", "--stdin"], content);

  git(["update-index", "--cacheinfo", mode, blob, path]);
}

function updatePackageVersion(content, nextVersion) {
  const packageJson = JSON.parse(content);

  packageJson.version = nextVersion;

  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

function updatePackageLockVersion(content, nextVersion) {
  const packageLock = JSON.parse(content);

  packageLock.version = nextVersion;

  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = nextVersion;
  }

  return `${JSON.stringify(packageLock, null, 2)}\n`;
}

function stagedNameStatus() {
  const output = git(["diff", "--cached", "--name-status"]);

  if (!output) {
    return [];
  }

  return output.split("\n").map((line) => {
    const [status, ...paths] = line.split(/\s+/);
    const path = paths.at(-1) ?? "";
    const previousPath = paths.length > 1 ? paths[0] : undefined;

    return { status, path, previousPath };
  });
}

function stagedDiff(paths) {
  if (!paths.length) {
    return "";
  }

  return git(["diff", "--cached", "--", ...paths]);
}

function isDocsOnly(changes) {
  return changes.every(
    ({ path }) =>
      /^(CODE_OF_CONDUCT|CONTRIBUTING|LICENSE|PRIVACY|README|SECURITY|SUPPORT|WHATSNEW|CHANGELOG)(\.md)?$/i.test(
        path
      ) ||
      /^docs\//.test(path) ||
      /^\.github\//.test(path) ||
      /\.md$/i.test(path)
  );
}

function classifyChange(changes) {
  if (override) {
    return override;
  }

  if (!changes.length || isDocsOnly(changes)) {
    return "none";
  }

  const paths = changes.map(({ path }) => path);
  const diff = stagedDiff(paths);
  const touchesPublicApi = paths.some((path) =>
    ["src/index.ts", "src/types.ts"].includes(path)
  );
  const hasDeletion = changes.some(({ status }) => status.startsWith("D"));
  const removesExport =
    /^-\s*export\s+(class|function|interface|type|const|default|\{)/m.test(
      diff
    );
  const explicitBreakingSignal =
    /BREAKING CHANGE|breaking change|@breaking|major bump/i.test(diff);

  if (
    explicitBreakingSignal ||
    (touchesPublicApi && (hasDeletion || removesExport))
  ) {
    return "major";
  }

  const hasNewSource = changes.some(
    ({ status, path }) =>
      status.startsWith("A") && /^src\/.+\.(ts|mts|cts)$/.test(path)
  );
  const touchesSource = paths.some((path) => /^src\/.+\.(ts|mts|cts)$/.test(path));
  const touchesDependencies = paths.some((path) =>
    ["package.json", "package-lock.json"].includes(path)
  );
  const addsExport =
    /^\+\s*export\s+(class|function|interface|type|const|default|\{)/m.test(
      diff
    );

  if (hasNewSource || touchesDependencies || addsExport) {
    return "minor";
  }

  if (touchesSource) {
    return "patch";
  }

  return "none";
}

function versionAlreadyStaged() {
  const packageChange = changes.find(({ path }) => path === "package.json");

  if (!packageChange) {
    return false;
  }

  const stagedVersion = getPackageVersion(readStagedFile("package.json"));
  const headPackage = readHeadFile("package.json");

  if (!headPackage) {
    return stagedVersion !== "0.0.0";
  }

  return stagedVersion !== getPackageVersion(headPackage);
}

function bumpVersion(version, bump) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);

  if (!match) {
    throw new Error(`Unsupported package version: ${version}`);
  }

  const [, major, minor, patch, suffix] = match;
  let nextMajor = Number(major);
  let nextMinor = Number(minor);
  let nextPatch = Number(patch);

  if (bump === "major") {
    nextMajor += 1;
    nextMinor = 0;
    nextPatch = 0;
  } else if (bump === "minor") {
    nextMinor += 1;
    nextPatch = 0;
  } else if (bump === "patch") {
    nextPatch += 1;
  }

  return `${nextMajor}.${nextMinor}.${nextPatch}${suffix}`;
}

const changes = stagedNameStatus();
const bump = classifyChange(changes);

if (bump === "none") {
  console.log("Version bump skipped: staged changes do not require a release bump.");
  process.exit(0);
}

if (!override && versionAlreadyStaged()) {
  console.log("Version bump skipped: package.json already has a staged version change.");
  process.exit(0);
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const currentVersion = packageJson.version;
const nextVersion = bumpVersion(currentVersion, bump);

if (currentVersion === nextVersion) {
  console.log(`Version remains ${currentVersion}.`);
  process.exit(0);
}

const nextPackageJson = updatePackageVersion(
  readFileSync("package.json", "utf8"),
  nextVersion
);

writeFileSync("package.json", nextPackageJson);
stageFileContent("package.json", updatePackageVersion(readStagedFile("package.json"), nextVersion));

if (existsSync("package-lock.json")) {
  const nextPackageLock = updatePackageLockVersion(
    readFileSync("package-lock.json", "utf8"),
    nextVersion
  );

  writeFileSync("package-lock.json", nextPackageLock);
  stageFileContent(
    "package-lock.json",
    updatePackageLockVersion(readStagedFile("package-lock.json"), nextVersion)
  );
}

console.log(`Version bumped ${currentVersion} -> ${nextVersion} (${bump}).`);
