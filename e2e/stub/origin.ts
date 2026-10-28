/*
 * The lane's two ports, in ONE place — imported by `playwright.config.ts`, by
 * the stub server and by any spec that needs to address the stub directly.
 *
 * ⚠️ IT EXISTS BECAUSE A SPEC MUST NEVER READ `NEXT_PUBLIC_MOTIR_APP_ORIGIN`.
 * `ci.yml` sets that variable at WORKFLOW level, to production, because the
 * `build` and `deploy` jobs need it there. A spec that read it with a local
 * fallback — `process.env[...] ?? 'http://127.0.0.1:4319'` — therefore behaved
 * completely differently in the two places: locally the variable is unset and
 * the fallback took it to the stub, while in CI it resolved to
 * `https://app.motir.co` and the spec REACHED PRODUCTION. It failed with a
 * confusing diff (`PROJECT_NOT_FOUND` where the stub answers `STUB_NO_FIXTURE`),
 * and the confusing diff was the lucky part: a spec shaped slightly differently
 * would have gone green against the live API and nobody would have known this
 * lane was making cross-repository network calls on every pull request — the
 * exact coupling `public-surface-hosts.md` AMENDMENT 2 §E splits its jobs to
 * avoid.
 *
 * The app under test is unaffected either way: `playwright.config.ts` passes
 * `NEXT_PUBLIC_MOTIR_APP_ORIGIN: STUB_ORIGIN` explicitly into the webServer's
 * build, which overrides the ambient value. Only the RUNNER's environment was
 * ever wrong, which is why 43 of 44 specs passed.
 */

/** The stub's port. One literal, read by the stub and by the app's origin. */
export const STUB_PORT = 4319

/** The site's own port under test — not 3000, so a `pnpm dev` can stay running. */
export const SITE_PORT = 4318

export const STUB_ORIGIN = `http://127.0.0.1:${STUB_PORT}`
export const SITE_ORIGIN = `http://127.0.0.1:${SITE_PORT}`

/**
 * THE LANE'S TENANT HOST (MOTIR-4220).
 *
 * ⚠️ NO `/etc/hosts` EDIT, AND NONE IS NEEDED. Every label under `.localhost`
 * resolves to loopback in Chromium (and in Node's resolver), so `acme.localhost`
 * reaches the same standalone server `SITE_ORIGIN` does — while arriving with a
 * DIFFERENT `Host` header, which is the only thing the router reads. That is
 * what makes a tenant host testable in a lane that has no DNS of its own.
 *
 * `playwright.config.ts` sets `NEXT_PUBLIC_MOTIR_TENANT_DOMAIN=localhost` for
 * the build, so this really is a subdomain of the configured base domain rather
 * than an arbitrary host that happens to route — and the base domain itself,
 * `localhost`, is one of the addresses the router steps aside for, so the site's
 * own specs are untouched.
 *
 * The stub answers `/api/public/hosts/acme.localhost` from
 * `e2e/fixtures/host-workspace.json`: a live workspace host with no application
 * yet (MOTIR-9512), which serves no project.
 */
export const TENANT_HOST = 'acme.localhost'

export const TENANT_ORIGIN = `http://${TENANT_HOST}:${SITE_PORT}`

/**
 * The other three addresses the acceptance walk needs (MOTIR-4226) — a
 * customer domain, a retired subdomain, and a host whose resolution FAILS.
 *
 * All four are labels under `.localhost`, so all five reach the same server with
 * a different `Host` header, which is the only thing the router reads. The stub
 * decides what each one IS (`e2e/stub/publicApiStub.ts`), so the whole address
 * matrix is one fixture table rather than four deployments.
 */
export const CUSTOM_HOST = 'roadmap.localhost'
export const CUSTOM_ORIGIN = `http://${CUSTOM_HOST}:${SITE_PORT}`

/** A retired subdomain — a 404 like any unknown host; it redirects nowhere. */
export const ALIAS_HOST = 'old.localhost'
export const ALIAS_ORIGIN = `http://${ALIAS_HOST}:${SITE_PORT}`

/** A host whose resolution answers 500 — the OUTAGE, which is never a 404. */
export const BROKEN_HOST = 'broken.localhost'
export const BROKEN_ORIGIN = `http://${BROKEN_HOST}:${SITE_PORT}`
