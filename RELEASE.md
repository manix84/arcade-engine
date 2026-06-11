# 📦 Release Process

This project automatically publishes the `arcade-engine` package to npmjs and
the scoped `@manix84/arcade-engine` package to GitHub Packages through the
`NPM Release` GitHub Actions workflow.

The workflow is intentionally gated. It publishes automatically from pushes to
`main`, can also publish a selected tag through manual dispatch, and verifies
the package before running `npm publish`.

## 🔐 Required Publishing Setup

Configure npm trusted publishing for `arcade-engine` on npmjs.com:

- Publisher: GitHub Actions.
- Organization or user: `manix84`.
- Repository: `arcade-engine`.
- Workflow: `npm-release.yml`.
- Environment: leave blank unless the workflow is later moved into a GitHub
  environment.
- Allowed action: `npm publish`.

Trusted publishing uses GitHub OIDC instead of a long-lived npm token, so npmjs
publishing does not need an `NPM_TOKEN` secret or a one-time password in CI.

GitHub Packages publishing uses the workflow `GITHUB_TOKEN`. The workflow grants
`packages: write`, writes a temporary GitHub Packages npm config during the
publish step, and passes that config directly to npm so it can publish
`@manix84/arcade-engine` to `https://npm.pkg.github.com`.

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
npm publish ./release-artifacts/arcade-engine-X.Y.Z.tgz --access public
```

The package build validates that `dist` contains the package entry point,
JavaScript output, source maps, declaration files, and declaration maps.

The dry-run pack confirms that npm receives only the package files listed in
`package.json`, including `dist`, public package docs, and metadata.
Storybook output remains documentation/demo output and is not included in the
npm package. `pack:release` rewrites README screenshot links to GitHub raw URLs
for the tarball, then restores the source README afterward; screenshot files
are not bundled into the npm tarball. For direct local `npm pack` calls, the
same transform runs through the `prepack` and `postpack` lifecycle scripts.

The release pack creates a tarball in `release-artifacts`, such as:

```txt
release-artifacts/arcade-engine-X.Y.Z.tgz
```

The workflow passes `--ignore-scripts` through to npm pack because the package
build has already produced and validated `dist` before packing. The
`pack:release` wrapper still applies and restores the package README transform
around the pack command.

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

The npmjs publish step runs with trusted publishing:

```sh
npm publish ./release-artifacts/arcade-engine-X.Y.Z.tgz --access public
```

Npm automatically generates provenance when trusted publishing is used from a
public GitHub Actions workflow.

The GitHub Packages publish step rewrites the built package name to
`@manix84/arcade-engine` in a temporary unpacked tarball, configures
`https://npm.pkg.github.com` through a temporary npmrc, and publishes with the
workflow `GITHUB_TOKEN`.

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

If the workflow cannot upload the tarball to an existing GitHub Release because
the release is already published or immutable, it warns and continues to package
publishing. Delete the incomplete GitHub Release later if the tarball asset is
required.

If either registry publish succeeds but a later step fails, do not reuse the
same version. Bump the package version and publish a new release.
