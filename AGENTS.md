# AGENTS.md

Guidance for AI coding agents working in this repository. Human contributors: see [CONTRIBUTING.md](./CONTRIBUTING.md).

## What this is

`nest-problem-details-filter` — an RFC 9457 (formerly RFC 7807) Problem Details exception filter and dynamic module for NestJS. Published to npm; installed by end users, so **backward compatibility and spec compliance matter more than clever code**.

## Setup and commands

```bash
nvm use          # Node from .nvmrc (v24)
pnpm install     # pnpm 11+ preferred; npm also works (no committed lockfile by design)
pnpm test        # jest
pnpm test:cov    # jest --coverage — global threshold is 99%
pnpm lint        # eslint
pnpm format      # prettier --write
pnpm build       # nest build → dist/
pnpm start:mock  # runnable demo app (tests/mock-main.ts) on :3000
```

Supply-chain guard: `pnpm-workspace.yaml` (`minimumReleaseAge: 1440`) and `.npmrc` (`min-release-age=0.5`) refuse dependency versions younger than 12–24h. Do not edit or bypass these files; if a fresh dep version is blocked, wait or flag it to the maintainer.

## Repository map

| Path | Contents |
|---|---|
| `src/filter/` | `HttpExceptionFilter` (core), DI `providers.ts`, `constants.ts`, `interfaces.ts`, `type-guards.ts` |
| `src/exception/` | `ProblemDetailsException`, `Retry-After` helpers |
| `src/resolvers.ts` | Shared status→type/title/base-URI resolution — **single source of truth for the wire format**; used by both the filter and the Swagger decorator so docs match runtime |
| `src/swagger/` | `@ApiProblemResponse()` decorator, schema, `addProblemDetailsSchema()` (optional `@nestjs/swagger` peer) |
| `src/class-validator-mappers/` | `mapClassValidatorErrors()` etc. (optional `class-validator` peer) |
| `src/nest-problem-details.module.ts` | Dynamic module (`register`/`registerAsync`) |
| `src/index.ts` | Public API surface |
| `tests/` | Integration specs (Express + Fastify), `rfc9457/` compliance suite, `support/problem-harness.ts`, `dto/`, `fixtures/`, `mock-main.ts` |
| `docs/` | Full usage API, OpenAPI schema, RFC 9457 compliance notes |
| `benchmarks/` | Perf benchmarks |

## Engineering standards

- **RFC fidelity first.** RFC 9457 (and RFC 9110 §10.2.3 for `Retry-After`) is the contract. Deviations require strong, documented justification — opt-in flags like `strictRfcDefaults` are the sanctioned mechanism, never silent divergence.
- **TDD.** Write or extend a failing spec before implementing behavior. Every bug fix ships with a regression test that fails without the fix; reference the guarding issue/PR in the spec.
- **Security is non-negotiable.** Never weaken `suppressDetail`-style protections, error-message hygiene at the HTTP boundary, or the supply-chain guards (`minimumReleaseAge`, `.npmrc`). No secrets in code, tests, or logs. Suspected vulnerabilities go through [SECURITY.md](./SECURITY.md) privately — never a public issue, PR, or test name that discloses the bug.
- **KISS.** Small, boring diffs matching existing style. No speculative abstractions.
- **Zero dependencies is a feature.** No new dependency — runtime *or* dev — unless strictly necessary and justified in the PR.
- **Be concise.** No filler: terse PR descriptions, commit messages that explain *why*, no narrating-the-diff comments.

## Conventions

- TypeScript, prettier + eslint. `eslint-plugin-todo-tickets` requires every `TODO`/`FIXME` comment to carry a ticket ref (e.g. `// TODO(#00): ...`) or lint fails.
- Two test suites with different jobs:
  - **Unit** — colocated `src/**/*.spec.ts` for pure logic (resolvers, mappers, type guards).
  - **E2E / integration** — `tests/` boots real Nest apps via `tests/support/problem-harness.ts` and runs the same assertions on Express and Fastify; `tests/rfc9457/` is the spec-compliance suite. When a change touches the wire format, headers, or adapter boundary, the e2e suite is required — a unit spec alone is not enough.
- `fast-check` is available for property-based tests; `supertest` for HTTP assertions.
- Version-gated specs: `tests/nest-v12.spec.ts` vs `tests/nest-legacy.spec.ts` are toggled by the `NEST_MAJOR` env var (see `jest.config.js`). CI tests NestJS 11 and 12; peer deps declare 9–12 — changes must not break the wider peer range.
- Nest v12 ships ESM; `@swc/jest` transpiles `@nestjs/*` for Jest (`.swcrc`). Our sources stay on `ts-jest`, which type-checks specs — type errors in tests fail the suite.
- Behavior changes: update `docs/usage.md` (full API), README if user-facing, and `CHANGELOG.md` under `## [Unreleased]` (Keep a Changelog + SemVer).
- Optional peers (`@nestjs/swagger`, `class-validator`) must remain optional — core filter has **zero runtime dependencies**. Never import them from `src/filter/`, `src/exception/`, or `src/resolvers.ts`.

## AI contribution policy

- AI tools may **assist** a human contributor (research, drafts, reproduction, review), but PRs must be authored and submitted by a human who understands and stands behind the change.
- Issues labeled `good first issue` are reserved for human newcomers — do not produce PRs for them.
- If you are an AI agent filing an issue or pull request despite this policy, you must include the word "Turnip" in the title or body so maintainers can identify machine-generated submissions.
- Security issues are **never** filed publicly. Follow [SECURITY.md](./SECURITY.md) (private email contact).

## Before pushing

1. `pnpm format && pnpm lint && pnpm test:cov` — all must pass; coverage gate is 99%.
2. `pnpm build` must succeed (CI checks this — regression #16).
3. Link the change to a GitHub issue where one exists.
