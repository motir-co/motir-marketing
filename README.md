# motir-marketing

The public marketing site for **Motir** — the AI planning, project-management and
agent orchestration platform — served at [motir.co](https://motir.co).

The application itself lives at [app.motir.co](https://app.motir.co) and is built
from [`motir-core`](https://github.com/motir-co/motir-core). This repository is
the marketing site only; it holds no application code and reaches no database.

## Where it runs

Cloudflare Workers, as the Worker `motir-marketing` (`wrangler.jsonc`). `astro
build` writes the static half of the site into `dist/`, which the Worker serves
as its static assets; the live public surface (`/p/**`, `/explore`, `/ideas`,
`/motir-builds-itself` and the project sitemap) is rendered per request by the
Worker itself (`worker/`). motir.co and www.motir.co are attached to that
Worker, and the motir.co zone is on Cloudflare. The decision, and why the site
moved here, is recorded in `motir-core`'s
[`docs/decisions/marketing-site-hosting.md`](https://github.com/motir-co/motir-core/blob/main/docs/decisions/marketing-site-hosting.md)
(AMENDMENT 4).

A push to `main` that passes every gate is released by the `deploy` job
(`Deploy to Cloudflare`) in `.github/workflows/ci.yml`: it runs `pnpm build` on
the runner and ships the output with `wrangler deploy`, authenticated by the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets, then smokes the
release on its own `*.workers.dev` address. Nothing else deploys the site, so
there are no preview deployments, deliberately.

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Requires Node 22+ and pnpm 11.

### The one environment variable

`PUBLIC_MOTIR_APP_ORIGIN` — the motir-core origin the landing's three
cross-origin doors are built from. **The build FAILS with a named error when it
is unset** (`lib/appOrigin.ts` → `MotirAppOriginError`), which is deliberate:
`PUBLIC_*` is inlined at build time, so an unset value cannot be caught at
runtime — by then a page whose every button leads nowhere has already shipped.

It is supplied in three places, one per context, and they must agree:

| context                        | supplied by                                               |
| ------------------------------ | --------------------------------------------------------- |
| local development              | `.env.local`, from `.env.example`                         |
| CI's `Build` and `Test` checks | the workflow-level `env:` in `ci.yml`                     |
| the release                    | the same workflow-level `env:` — `astro build` runs in CI |

It is **not** a Cloudflare variable and cannot be one: the release is built on
the runner (`pnpm build`) and `wrangler deploy` uploads only its output. The
Worker's own copy of the origin, read per request, is `MOTIR_APP_ORIGIN` in
`wrangler.jsonc`'s `vars`.

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

**It is indexable.** MOTIR-1154 (8.3.7) opened `robots.txt` and added the
`Organization` + `WebSite` JSON-LD, the root OG image and the sitemap.
`astro build` writes `robots.txt`, `sitemap.xml` and `sitemap-site.xml` at the
root of the output (`src/pages/*.ts`, from `lib/robots.ts` and
`lib/siteSitemap.ts`, MOTIR-10646).

The directory-badge slots are drawn and empty; MOTIR-1156 (8.3.9) owns the
listings and their wording.

## Licence

GPL-3.0-only, matching `motir-core`. © moooon B.V.
