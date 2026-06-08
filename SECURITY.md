# 🛡️ Security

Arcade Engine is a browser-side TypeScript library. It does not run a backend,
store accounts, process payments, manage secrets, or intentionally transmit
runtime data.

## ✅ Supported Versions

Security fixes apply to the current published `arcade-engine` package line and
the default branch of this repository.

## 📬 Reporting A Vulnerability

Please report security issues privately to the project maintainer instead of
opening a public issue.

Include:

- A clear description of the problem.
- Steps to reproduce it.
- A minimal example if possible.
- The affected browser or runtime.
- The affected engine module or Storybook story, if known.
- Any known impact.

## 🧯 What Counts

Useful reports may include:

- Cross-site scripting risks introduced by engine APIs.
- Unsafe handling of caller-provided asset paths, text, colors, or sound URLs.
- Browser API misuse that could expose user data.
- Dependency vulnerabilities with a realistic impact on this package.
- Build or package configuration issues that could publish unintended files.

## 🚧 Out Of Scope

The following are usually out of scope for Arcade Engine itself:

- Vulnerabilities in games that consume the engine.
- Hosting, CDN, or server issues outside this repository.
- Browser autoplay, fullscreen, pointer, and media permission behavior that
  works as designed.
- Denial-of-service cases that only affect the local test suite or developer
  machine.
- Storybook-only visual glitches with no security impact.

## 🔐 Secrets

Do not commit secrets, tokens, private keys, production credentials, or private
asset URLs to this repository.
