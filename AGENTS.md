# 🤖 Agent Guide

Use this file as the quick operating guide for automated agents working in this
repository. If something is not covered here, follow the existing code patterns
and keep changes focused.

## 🕹️ Project Shape

- Arcade Engine is a standalone browser arcade-game engine package.
- It is not Time-Pilot-specific, even though Time-Pilot uses or will use it.
- The public package entry point is `src/index.ts`.
- Package builds emit ESM JavaScript, source maps, declaration files, and
  declaration maps to `dist`.
- Storybook is documentation and demo output only. It builds to
  `storybook-static` and must not be part of the npm package `dist` output.

## 🧭 Working Rules

- Do not mass-stage files. The maintainer often has unrelated staged and
  unstaged work in progress.
- Check `git status --short` before and after meaningful edits.
- Preserve unrelated user changes. Never revert files unless explicitly asked.
- Prefer small, direct changes over broad refactors.
- Use existing helpers and story utilities before introducing new abstractions.
- Keep Markdown documentation consistent with the project style, including emoji
  in headings.

## 🧱 TypeScript

- Use TypeScript for source, tests, configs, and stories.
- Keep public APIs explicit and typed.
- Avoid `any`; prefer `unknown`, narrow interfaces, or generic constraints.
- Use ESM imports and exports.
- Keep browser-specific behavior isolated behind small, testable wrappers.
- Source files should stay ASCII unless the file is documentation or already has
  a clear reason for Unicode.

## 🎨 Storybook

- Stories should demo engine behavior visually, not just show changing numbers.
- Use the shared Arcade Engine branding and story helpers in
  `src/stories/story-utils.ts`.
- Use the shared top-down ship rendering for game-engine demos where a moving
  actor helps explain behavior.
- Do not add ships to purely mathematical helper demos when they make the
  concept less clear.
- Add controls, actions, and interactions when they make the story easier to
  explore or verify.
- Keep asset URLs relative so GitHub Pages works under a repository subpath.
- Do not add Storybook output to the npm package build.

## 🔊 Sound Demos

- Sounds should be pleasant and low-intensity. Avoid harsh raw tones.
- Audio playback must stay behind user gestures; do not autoplay sound in story
  `play` functions.
- Spatial audio demos should make listener, source, pan, and movement visually
  obvious.

## 🧪 Verification

Use the actual project scripts:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run build:storybook
npm run pack:dry-run
```

Run the checks relevant to the change before considering work complete:

- Source or public API changes: `npm run lint`, `npm run typecheck`,
  `npm test`, and `npm run build`.
- Story changes: `npm run lint`, `npm run typecheck`, `npm test`, and
  `npm run build:storybook`.
- Package metadata changes: `npm run build` and `npm run pack:dry-run`.
- Documentation-only changes: at least inspect formatting and links; tests are
  not usually required.

## 🪝 Git Hooks

- The pre-commit hook checks staged files only by creating a temporary snapshot
  of the index.
- It runs lint, typecheck, and tests before the smart version bump.
- Do not change the hook to inspect unstaged working-tree files.
- The smart version bump should run only after the other pre-commit checks pass.

## 📦 Package Publishing

- Keep npm package metadata complete and public.
- Keep `files` limited to package output and public documentation.
- Keep TypeScript declaration output and declaration maps working.
- Run `npm run pack:dry-run` after changing package metadata, exports, build
  config, or included files.

## 🔀 Pull Requests

- Use `.github/PULL_REQUEST_TEMPLATE.md` as the expected PR description shape.
- CI should not fail solely because Copilot generated a poor PR summary.
- PR checks to `main` should keep lint, typecheck, test, package build, and
  Storybook build as separate jobs.
- Dry-run build jobs should wait for lint, typecheck, and test jobs to pass.
