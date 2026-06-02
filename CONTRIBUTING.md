# 🤝 Contributing

Thanks for taking the time to improve Arcade Engine.

Arcade Engine is a standalone browser arcade-game engine package. The package is
being modernized from older JavaScript modules into a typed ESM package, so
small, focused changes are easier to review and safer to ship.

## 🧭 Before You Start

- Check the current package status in [README.md](README.md).
- Read the local folder README when working inside a documented subsection.
- Keep changes scoped to one concern.
- Prefer existing helpers and story utilities before adding a new abstraction.
- Avoid broad formatting-only rewrites while legacy modules are still being
  reviewed.
- Do not remove legacy files unless the replacement path is clear, documented,
  and tested.

## 🛠️ Local Setup

Install dependencies:

```sh
npm install
```

Run the main checks:

```sh
npm run lint
npm run typecheck
npm test
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

- Public exports from `src/index.ts`.
- Canvas rendering behavior.
- Ticker timing or fixed-step behavior.
- Sound lifecycle, channel volume, fades, or spatial audio.
- Geometry, collision, heading, viewport, grid, or box helper behavior.
- 2.5D projection or 3D cube-cluster helper behavior.
- Migration decisions that remove or replace legacy modules.

For documentation-only changes, tests are not usually required. Inspect links,
headings, examples, and formatting; run `git diff --check` before finishing.

## 📚 Documentation Expectations

Documentation should make the package easier to use, not just list symbols.
When adding or changing docs:

- Explain what the user is looking at.
- Mention the engine APIs involved.
- Include a small usage example when it helps.
- Keep Storybook docs tied to visible behavior in the demo.
- Keep root README content package-level; put detailed subsection guidance in
  the nearest folder README.
- Keep asset paths relative so Storybook still works on GitHub Pages.

## ✍️ Code Style

- Prefer TypeScript for new engine code, tests, configs, and stories.
- Keep public APIs explicit and typed.
- Avoid `any`; prefer `unknown`, narrow interfaces, or generic constraints.
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
- Update local folder documentation when package responsibilities move.

## 📖 Storybook Guidance

Stories should demo engine behavior visually. A user should be able to open a
story and understand the API through movement, sound, controls, telemetry, or
interaction.

Use shared Storybook helpers from `src/stories/story-utils.ts` where possible.
Add controls, actions, and interactions when they make behavior easier to
explore or verify.

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
