# 🛡️ Security

Arcade Engine is a browser-side TypeScript library. It does not run a backend,
store accounts, process payments, or manage secrets.

## ✅ Supported Versions

The project is currently pre-release and private while modernization work is in
progress.

Security fixes apply to the current `master` branch unless a published release
line is created later.

## 📬 Reporting A Vulnerability

Please report security issues privately to the project maintainer instead of
opening a public issue.

Include:

- A clear description of the problem.
- Steps to reproduce it.
- A minimal example if possible.
- The affected browser or runtime.
- Any known impact.

## 🧯 What Counts

Useful reports may include:

- Cross-site scripting risks introduced by engine APIs.
- Unsafe handling of caller-provided asset paths or text.
- Browser API misuse that could expose user data.
- Dependency vulnerabilities with a realistic impact on this package.
- Build or package configuration issues that could publish unintended files.

## 🚧 Out Of Scope

The following are usually out of scope for Arcade Engine itself:

- Vulnerabilities in games that consume the engine.
- Hosting, CDN, or server issues outside this repository.
- Browser autoplay, fullscreen, and media permission behavior that works as
  designed.
- Denial-of-service cases that only affect the local test suite or developer
  machine.

## 🔐 Secrets

Do not commit secrets, tokens, private keys, production credentials, or private
asset URLs to this repository.
