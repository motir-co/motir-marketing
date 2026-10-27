# motir-marketing

The public marketing site for **Motir** — the AI planning, project-management and
agent orchestration platform — served at [motir.co](https://motir.co).

The application itself lives at [app.motir.co](https://app.motir.co) and is built
from [`motir-core`](https://github.com/motir-co/motir-core). This repository is
the marketing site only; it holds no application code and reaches no database.

## Where it runs

A Vercel project, `motir-marketing`, functions in `iad1` — beside `motir-core`
and `motir-ai` on Fly. It moved off Fly on 2026-10-27: shared-CPU steal and
crawler bursts made two small machines slow, and the site needs no long-running
process. The decision is recorded in `motir-core`'s
[`docs/decisions/marketing-site-hosting.md`](https://github.com/motir-co/motir-core/blob/main/docs/decisions/marketing-site-hosting.md).

A push to `main` that passes lint, typecheck, build and test is deployed by
`.github/workflows/ci.yml` (`vercel build` on the runner, `vercel deploy
--prebuilt`). Vercel's Git integration is off (`vercel.json`), so there are no
preview deployments, deliberately.

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Requires Node 22+ and pnpm 11.

### The one environment variable

`NEXT_PUBLIC_MOTIR_APP_ORIGIN` — the motir-core origin the landing's three
cross-origin doors are built from. **The build FAILS with a named error when it
is unset** (`lib/appOrigin.ts` → `MotirAppOriginError`), which is deliberate:
`NEXT_PUBLIC_*` is inlined at build time, so an unset value cannot be caught at
runtime — by then a page whose every button leads nowhere has already shipped.

It is supplied in three places, one per context, and they must agree:

| context                        | supplied by                                                |
| ------------------------------ | ---------------------------------------------------------- |
| local development              | `.env.local`, from `.env.example`                          |
| CI's `Build` and `Test` checks | the workflow-level `env:` in `ci.yml`                      |
| the release                    | the same workflow-level `env:` — `vercel build` runs in CI |

It is **not** a Vercel environment variable and cannot be one: the release is
built on the runner (`vercel build`) and only its output is uploaded.

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`pnpm test` is vitest (`vitest.config.mts`) over `tests/` — node plus jsdom,
no database, seconds to run. There is no coverage gate and no E2E lane; per
`ci.yml`'s own header, a gate is added to `deploy`'s `needs` when its job
exists, not before.

## Status

The landing is built (MOTIR-1152), from MOTIR-1143's design and MOTIR-1144's
copy, on `@motir/design-system` and `@motir/brand` installed from npm.

**It is not yet indexable.** `app/robots.ts` still says `disallow: /`, and
flipping it — along with the `Organization` + `WebSite` JSON-LD, the root OG
image and the sitemap — is MOTIR-1154 (8.3.7). The landing shipping and the
landing being indexable are two different events.

The directory-badge slots are drawn and empty; MOTIR-1156 (8.3.9) owns the
listings and their wording.

## Licence

GPL-3.0-only, matching `motir-core`. © moooon B.V.
