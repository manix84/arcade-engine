# 📦 Release Process

This project automatically publishes the `arcade-engine` package to npmjs and
the scoped `@manix84/arcade-engine` package to GitHub Packages through the
`NPM Release` GitHub Actions workflow.

The workflow is intentionally gated. It publishes automatically from pushes to
`main`, can also publish a selected tag through manual dispatch, and verifies
the package before running `npm publish`.

## 🔐 Required Secrets And Permissions

Add a GitHub Actions repository secret named `NPM_TOKEN`.

Use an npm access token that can publish `arcade-engine` to
`https://registry.npmjs.org`. The workflow passes this token to npm as
`NODE_AUTH_TOKEN`.

GitHub Packages publishing uses the workflow `GITHUB_TOKEN`. The workflow grants
`packages: write` so it can publish `@manix84/arcade-engine` to
`https://npm.pkg.github.com`.

## 🏷️ Version And Tag Rules

The release tag must match `package.json` exactly:

- Package version `X.Y.Z` must use tag `vX.Y.Z`.
- Pushes to `main` derive the release tag from `package.json` automatically.
- The workflow runs `node scripts/verify-release-tag.mjs` before publishing.
- If the tag and package version do not match, the workflow fails before any
  package is published.

## ✅ What The Workflow Checks

Before publishing, the workflow runs:

```sh
npm ci
node scripts/verify-release-tag.mjs vX.Y.Z
npm run lint
npm run typecheck
npm test
npm run build
npm run build:storybook
npm run pack:dry-run
npm run pack:release -- --ignore-scripts
```

The package build validates that `dist` contains the package entry point,
JavaScript output, source maps, declaration files, and declaration maps.

The dry-run pack confirms that npm receives only the package files listed in
`package.json`, including `dist`, public package docs, and metadata.
Storybook output remains documentation/demo output and is not included in the
npm package.

The release pack creates a tarball in `release-artifacts`, such as:

```txt
release-artifacts/arcade-engine-X.Y.Z.tgz
```

The workflow passes `--ignore-scripts` to `pack:release` because the package
build has already produced and validated `dist` before packing.

The workflow creates the GitHub Release for the tag if it does not already
exist, then uploads the tarball as a release asset.

## 🚀 Publishing From Main

Push the release commit to `main` after the version is ready:

```sh
git push origin main
```

Pushing to `main` starts the `NPM Release` workflow. The workflow derives the
release tag from `package.json`, creates the GitHub Release for that version if
needed, uploads the tarball, publishes `arcade-engine` to npmjs, and publishes
`@manix84/arcade-engine` to GitHub Packages.

Both package registries are immutable for a version. If the current package
version has already been published, bump the version before pushing to `main`.

## 🏷️ Manual Publishing From A Tag

Create and push a release tag after the release commit is ready if you need a
manual tag-based release:

```sh
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

Run the workflow manually from GitHub Actions and pass the tag as the `tag`
input. If all checks pass, it:

1. Builds the package.
2. Builds Storybook.
3. Dry-runs the npm package.
4. Builds the release tarball.
5. Uploads the tarball to the GitHub Release for the tag.
6. Publishes to npmjs.
7. Publishes to GitHub Packages.

The npmjs publish step runs:

```sh
npm publish --provenance --access public
```

The GitHub Packages publish step rewrites the built package name to
`@manix84/arcade-engine` in a temporary unpacked tarball, configures
`https://npm.pkg.github.com`, and publishes with the workflow `GITHUB_TOKEN`.

Install the GitHub Packages build with:

```sh
npm install @manix84/arcade-engine --registry=https://npm.pkg.github.com
```

## ▶️ Manual Workflow Dispatch

The workflow can also be run manually from GitHub Actions.

Use the `tag` input to select the release tag, for example:

```txt
vX.Y.Z
```

Manual dispatch still checks out the tag, verifies it against `package.json`,
runs the full verification suite, and publishes to both registries only if
everything passes.

## 🧯 Failed Releases

If the workflow fails before publishing, fix the issue, create a new commit if
needed, and tag the corrected version.

If the workflow fails while uploading the tarball to a GitHub Release, check
whether the npmjs or GitHub Packages publish steps ran. If neither package
registry published the version, delete the incomplete GitHub Release and rerun
the workflow for the same version. If either registry published the version,
bump the package version and publish a new release.

If either registry publish succeeds but a later step fails, do not reuse the
same version. Bump the package version and publish a new release.
