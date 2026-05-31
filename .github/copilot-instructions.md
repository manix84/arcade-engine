# 🤖 Copilot Instructions

## 🔀 Pull Request Descriptions

When generating or updating a pull request summary, description, or body for
this repository, follow `.github/pull_request_template.md` exactly.

If `.github/pull_request_template.md` cannot be accessed, notify the user and
do not generate a PR description until the template is available.

- Pull request bodies are validated by `.github/workflows/pr-template-check.yml`.
- Output that replaces the template with a generic summary is invalid, even if
  the summary is accurate.
- Preserve the template headings, emoji, ordering, and checklist structure.
- Fill in each section with concise, concrete details from the pull request
  diff.
- Keep the `## 🧾 Summary` section as short bullets describing what changed.
- Use `## 🧱 Package Impact` for package, API, build, documentation,
  Storybook, workflow, or compatibility impact.
- In `## 🧪 Verification`, mark only commands that are explicitly mentioned as
  having been run in the PR description, commit messages, or comments. Leave
  all others unchecked.
- Use `## 📸 Screenshots` only for visual UI, Storybook, or canvas changes. If
  screenshots are not relevant, say `Not applicable.` under that heading.
- Do not replace the template with a generic Copilot summary.
- Do not delete empty template sections unless the template itself changes.

If there is not enough information to fill a section confidently, keep the
section and write a short, honest placeholder such as `Not verified.` or `Not
applicable.`.
