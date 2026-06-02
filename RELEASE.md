# 📦 Release Process

This project automatically publishes the `arcade-engine` package to npm through
the `NPM Release` GitHub Actions workflow.

The workflow is intentionally gated. It only publishes from a release tag, and
it verifies the package before running `npm publish`.

## 🔐 Required npm Secret

Add a GitHub Actions repository secret named `NPM_TOKEN`.

Use an npm access token that can publish `arcade-engine` to
`https://registry.npmjs.org`. The workflow passes this token to npm as
`NODE_AUTH_TOKEN`.

## 🏷️ Version And Tag Rules

The release tag must match `package.json` exactly:

- Package version `X.Y.Z` must use tag `vX.Y.Z`.
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
```

The package build validates that `dist` contains the package entry point,
JavaScript output, source maps, declaration files, and declaration maps.

The dry-run pack confirms that npm receives only the package files listed in
`package.json`, including `dist`, public package docs, and metadata.
Storybook output remains documentation/demo output and is not included in the
npm package.

## 🚀 Publishing From A Tag

Create and push a release tag after the release commit is ready:

```sh
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

Pushing the tag starts the `NPM Release` workflow. If all checks pass, it runs:

```sh
npm publish --provenance --access public
```

## ▶️ Manual Workflow Dispatch

The workflow can also be run manually from GitHub Actions.

Use the `tag` input to select the release tag, for example:

```txt
vX.Y.Z
```

Manual dispatch still checks out the tag, verifies it against `package.json`,
runs the full verification suite, and publishes only if everything passes.

## 🧯 Failed Releases

If the workflow fails before publishing, fix the issue, create a new commit if
needed, and tag the corrected version.

If npm publish succeeds but a later step fails, do not reuse the same version.
Bump the package version and publish a new release.
