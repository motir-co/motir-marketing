import { defineConfig, devices } from '@playwright/test'
import { SKILLS_RELEASE_PIN } from './lib/skillsRelease'
import {
  SITE_ORIGIN,
  SITE_PORT,
  STUB_ORIGIN,
  STUB_PORT,
} from './e2e/stub/origin'

/**
 * THE BROWSER LANE (MOTIR-4112) — this repository's first.
 *
 * `vitest.config.mts` runs jsdom and `vitest.design.config.mts` drives a
 * headless chromium over `.mock.html` FILES. Neither loads the application: the
 * first cannot, and the second is a measuring instrument for design assets
 * rather than a test harness. This config is what lets a spec walk the site the
 * way a visitor does.
 *
 * ── ⚠️ THE BUILD IS PART OF THE `webServer` COMMAND, AND HAS TO BE ────────
 *
 * `astro build` renders every page ahead and inlines the origins into the
 * islands' bundle (`astro.config.mjs`, `define`), so pointing the site at the
 * stub is a BUILD-time act — setting a variable when starting the server over an
 * already-built `dist/` changes nothing. `lib/appOrigin.ts` throws at import when
 * the app origin is unset, which turns a silent mis-point into a failed build.
 * So the command below builds and then serves.
 *
 * The cost is honest and worth naming: this lane builds the app. It is why the
 * job has its own timeout in `ci.yml` and why it is a separate job rather than
 * a step inside `test`.
 *
 * ── ⚠️ NO ACCEPTANCE-VIDEO WORKFLOW — READ THIS BEFORE ADDING ONE ─────────
 *
 * MOTIR-4112 was authored on 2026-09-01 asking for a workflow mirroring
 * `motir-core`'s `.github/workflows/acceptance-video.yml` and its
 * `.github/actions/upload-acceptance-video` composite. **Both were DELETED from
 * `motir-core` on 2026-09-02** by MOTIR-4096, nineteen hours later:
 * `docs/decisions/acceptance-video.md`'s amendment of that date records the
 * decision as "CI NO LONGER UPLOADS THE RECORDING. THE AGENT PUBLISHES IT, over
 * the Motir MCP surface", and retires the uploader script, the composite action,
 * the `id-token: write` grant and the `MOTIR_UPLOAD_TOKEN` secret with it — on
 * the stated ground that "a credential with no consumer is one nobody thinks
 * about when deciding whether to rotate it".
 *
 * Mirroring the retired shape here would re-introduce, in a second repository,
 * exactly what that decision had just removed from the first — including the
 * credential. So this lane does the half the decision KEPT: it RECORDS. `video`
 * and `trace` are on, the artefacts land in the report, and the agent that runs
 * the acceptance spec publishes the clip onto the card itself (`attach_file` on
 * the MCP surface, which asserts `work_item:edit` — a key a dispatched run
 * already holds). `nextjs-prisma-vercel-starter` is having its copy retired the
 * same way under MOTIR-4097; this repository never grew one.
 *
 * ⚠️ CONSEQUENCE, STATED SO IT IS NOT REDISCOVERED: this lane needs NO new
 * environment variable and NO new secret. The card's provisioning clause is
 * therefore discharged by there being nothing to provision — not deferred.
 */

// The four constants live in `e2e/stub/origin.ts` so a SPEC can import the stub's
// address instead of reconstructing it from the environment — see the warning
// there; reconstructing it is how this lane briefly reached production.

export default defineConfig({
  testDir: './e2e/specs',
  /*
   * ⚠️ THE PER-REQUEST SPECS, LEFT OUT BY FILE NAME (MOTIR-10649).
   *
   * This lane serves the static build alone, so a spec whose subject renders
   * per request — `/p/**`, `/explore`, `/explore/topic/*`, `/ideas`,
   * `/motir-builds-itself`, `/sitemap-projects.xml` — or is the bare-`/`
   * language detection cannot pass here. Those routes are the Worker-routes
   * story's (MOTIR-10635), and it re-includes each file by deleting its entry. The `-live`
   * files are the per-request halves of specs whose static cases still run.
   */
  testIgnore: [
    'acceptance-ideas.spec.ts',
    'acceptance-ideas-categories.spec.ts',
    'acceptance-ideas-localized.spec.ts',
    'acceptance-public-project.spec.ts',
    'acceptance-read-pages-move.spec.ts',
    'acceptance-public-address.spec.ts',
    'project-acts.spec.ts',
    'project-crawl.spec.ts',
    'project-detail.spec.ts',
    'project-overview.spec.ts',
    'project-tabs.spec.ts',
    'acceptance-eleven-languages-live.spec.ts',
    'acceptance-docs-eleven-languages-live.spec.ts',
    'smoke-live.spec.ts',
    'locale-links-live.spec.ts',
    'not-found-live.spec.ts',
    'landmark-live.spec.ts',
    'languageSwitcher-live.spec.ts',
    'acceptance-legal-binding-english-live.spec.ts',
  ].map((file) => `**/${file}`),
  // ⚠️ A LANE THAT PASSES WITH NO TESTS IS NOT A LANE. The card asks for this in
  // terms — "the job fails if the spec is removed (no empty-suite pass)" — and
  // Playwright's default is to exit 0 on an empty run.
  forbidOnly: !!process.env['CI'],
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI']
    ? [['html', { open: 'never' }], ['list']]
    : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: SITE_ORIGIN,
    // The two artefacts a receipt is made of. `video: 'on'` rather than
    // `retain-on-failure`: the recording is the DELIVERABLE for an acceptance
    // spec, not a debugging aid, so a GREEN run is precisely the one whose clip
    // must exist. `trace` stays on-first-retry, which is the debugging half.
    video: 'on',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'node --experimental-strip-types e2e/stub/publicApiStub.ts',
      url: `${STUB_ORIGIN}/api/public/categories`,
      // ⚠️ LOCALLY THIS REUSES ANY SERVER ALREADY ON THE PORT, INCLUDING ONE YOU
      // STARTED BY HAND. A stub left running from an earlier session keeps its
      // OLD route table, so a spec for a route added since fails with a 404 that
      // looks exactly like a bug in the page — and the page is fine. It cost one
      // confusing red while MOTIR-4115 was being built. If a `/p/*` spec 404s,
      // check `pgrep -af publicApiStub` before reading the route. In CI the flag
      // is false and the lane always starts its own.
      reuseExistingServer: !process.env['CI'],
      timeout: 30_000,
      // The port is PASSED rather than left to the stub's own default, so
      // `e2e/stub/origin.ts` is the single authority even though the stub —
      // launched as native ESM by `--experimental-strip-types` — cannot import
      // it. `standingRules.test.ts` pins the stub's fallback to this constant.
      env: { MOTIR_PUBLIC_API_STUB_PORT: String(STUB_PORT) },
    },
    {
      // ⚠️ THE STATIC BUILD, SERVED AS CLOUDFLARE SERVES IT (MOTIR-10649).
      //
      // `astro build` renders every page ahead, and the pages that read an
      // artifact read it NOW: the docs (`/docs/api`, `/docs/cli`, `/docs/mcp`,
      // `/docs/mcp/tools`) fetch the OpenAPI spec, the CLI list and the MCP
      // catalogue, and `/price` and `/how-the-calculation-works` fetch the plan
      // ladder. So the build must read the STUB, and the stub must already be
      // listening: Playwright starts `webServer` entries one after another, in
      // this order, and waits for each one's `url` before starting the one after it, so the
      // entry above is up before this command runs. A build that reached no
      // stub fails loudly (a docs artifact that cannot be read fails the build,
      // `lib/docs.ts`), so it can never fall through to a live host — neither
      // origin below is ever left unset.
      //
      // `wrangler dev --assets dist` then serves `dist/` with the repository's
      // `wrangler.jsonc`: static assets only, no Worker script, so Cloudflare's
      // own trailing-slash, `_redirects`, `_headers` and 404-page handling is
      // what the specs measure. It needs no Cloudflare login, so the job needs
      // no secret.
      //
      // The specs whose subject is a per-request route are on `testIgnore`
      // above; the Worker-routes story serves them.
      command: [
        'pnpm build',
        `node_modules/.bin/wrangler dev --ip 127.0.0.1 --port ${SITE_PORT} --assets dist`,
      ].join(' && '),
      url: SITE_ORIGIN,
      reuseExistingServer: !process.env['CI'],
      timeout: 300_000,
      env: {
        NEXT_PUBLIC_MOTIR_APP_ORIGIN: STUB_ORIGIN,
        // /price and /how-the-calculation-works read motir-ai's plan ladder at
        // build, and the calculator reads the categories and the estimate from
        // the browser: both from the stub, never the live engine.
        NEXT_PUBLIC_MOTIR_AI_ORIGIN: STUB_ORIGIN,
        // ⚠️ SET EXPLICITLY RATHER THAN INHERITED (MOTIR-4220): `ci.yml` sets it
        // at workflow level, to the production base domain.
        NEXT_PUBLIC_MOTIR_TENANT_DOMAIN: 'localhost',
        // The docs install commands name the committed floor in this lane
        // (MOTIR-8802): `scripts/skills/resolve-release.ts` honours a value
        // already set, so the build never reaches GitHub and the spec's
        // expected tag cannot drift under it.
        SKILLS_RELEASE_TAG: SKILLS_RELEASE_PIN,
        WRANGLER_SEND_METRICS: 'false',
      },
    },
  ],
})
