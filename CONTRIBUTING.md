# 🤝 Contributing

Thanks for taking the time to improve Arcade Engine.

This repository is being modernized from the older JavaScript engine into a
standalone TypeScript package, so small, focused changes are preferred.

## 🧭 Before You Start

- Check the current package status in [README.md](README.md).
- Keep changes scoped to one concern.
- Avoid broad formatting-only rewrites while legacy modules are still being
  reviewed.
- Do not remove legacy files unless the replacement path is clear and tested.

## 🛠️ Local Setup

Install dependencies:

```sh
npm install
```

Run type checks:

```sh
npm run typecheck
```

Run tests:

```sh
npm test
```

Build the publishable package output:

```sh
npm run build
```

Preview the npm tarball:

```sh
npm run pack:dry-run
```

Run Storybook:

```sh
npm run storybook
```

Build Storybook:

```sh
npm run build:storybook
```

Install the tracked Git hooks locally:

```sh
npm run hooks:install
```

The pre-commit hook checks the staged index only. It creates a temporary
snapshot from staged files, runs lint/type/test checks against that snapshot,
then runs the smart version bump after those checks pass. Unstaged work should
not affect the commit.

## 🧪 Testing Expectations

Add or update tests when a change affects:

- Public exports.
- Canvas rendering behavior.
- Ticker timing.
- Sound lifecycle behavior.
- Geometry, collision, heading, or viewport helper behavior.
- Migration decisions that remove or replace legacy modules.

For very small documentation-only changes, tests are not required.

## ✍️ Code Style

- Prefer TypeScript for new engine code.
- Keep public APIs explicit and typed.
- Keep browser-specific behavior behind small, testable wrappers.
- Prefer existing module patterns over new abstractions.
- Keep comments short and useful.
- Use ASCII in source files unless a file already has a reason to use Unicode.
- Use emoji in Markdown headings and documentation, matching the project style.

## 🧱 Migration Guidance

When porting legacy modules:

- Preserve behavior before changing design.
- Add tests around behavior before deleting the old file.
- Keep compatibility notes in `WHATSNEW.md`.
- Prefer consolidating behavior into the new TypeScript package surface instead
  of recreating every old AMD module one-for-one.

## 🔀 Pull Requests

Pull requests should include:

- A short summary of the change.
- Any package or compatibility impact.
- Test commands run.
- Build or package verification when package metadata or public exports change.
- Storybook verification when demos or public behavior examples change.
- Screenshots only if visual behavior changes.

The repository license applies to contributions. By submitting a contribution,
you agree it may be used in this project under [LICENSE.md](LICENSE.md).
