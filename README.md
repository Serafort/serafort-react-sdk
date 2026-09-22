# Serafort React SDK

React SDK for [Serafort](https://serafort.com) authentication: session
management, sign-in/sign-up, passkeys, SSO, and MFA — as headless hooks, or as
drop-in styled UI.

This is a pnpm workspace with two packages:

- **[`react-sdk`](react-sdk/README.md)** — `@serafort/react-sdk`, the headless
  core. Session state, background token refresh, and renderless
  sign-in/passkey/MFA state machines. No UI or styling dependency.
- **[`react-elements`](react-elements/README.md)** — `@serafort/react-elements`,
  Clerk-style drop-in styled components (`<SignIn/>`, `<LoginBox/>`,
  `<MfaChallenge/>`, `<UserProfile/>`) built on `react-sdk` + MUI v7.

Install whichever fits: `react-elements` alone if you want ready-made UI (it
re-exports the headless hooks you'll need too), or `react-sdk` alone if you're
building your own UI on top of the state machines.

## Install

```bash
npm install @serafort/react-sdk
# and/or
npm install @serafort/react-elements
```

See each package's README for quickstart usage.

## Development

This repo is a pnpm workspace.

```bash
pnpm install
pnpm run type-check   # tsc --noEmit, both packages
pnpm run lint          # eslint, both packages
pnpm run build          # tsc, both packages
pnpm run test            # vitest, both packages
```

## Contributing

Before committing, changes are checked with `pnpm run type-check && pnpm run lint`.
This is wired up two ways — pick whichever fits your setup:

- **Husky (npm-idiomatic, default for contributors who run `pnpm install`)**:
  the `prepare` script installs a Husky hook automatically, so once you've run
  `pnpm install` in a git checkout, `git commit` runs the checks for you.
- **`.githooks/` (portable, no Husky/Node required to install)**: run
  `git config core.hooksPath .githooks` once to point git directly at the
  checked-in `.githooks/pre-commit` script, which runs the same checks.

Both hooks run the same two commands, so pick one — you don't need both active
at once.

CI (`.github/workflows/ci.yml`) runs `type-check`, `lint`, `build`, and `test`
on every push to `main` and on every pull request.

## License

MIT — see [LICENSE](LICENSE).
