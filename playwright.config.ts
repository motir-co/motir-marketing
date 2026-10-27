import { join } from 'node:path'
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
 * `NEXT_PUBLIC_MOTIR_APP_ORIGIN` is inlined by `next build`, so pointing the app
 * at the stub is a BUILD-time act — setting the variable when starting an
 * already-built server changes nothing, because the literal is in the bundle.
 * `lib/appOrigin.ts` explains why it works that way and throws at import when
 * the variable is unset, which is the guard that turns this from a silent
 * mis-point into a failed build. So the command below builds and then starts,
 * with the origin set for both.
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
      // Build AND start, with the origin set for both — see the note above.
      //
      // ⚠️ IT RUNS THE STANDALONE SERVER, NOT `next start`, AND THAT IS THE
      // POINT OF THE LANE. `next.config.ts` sets `output: 'standalone'` because
      // the host implies it, and Next says outright that `next start` "does not
      // work with 'output: standalone'" — it warns and serves something else. A
      // browser lane exercising a server the release never runs is a lane that
      // can be green while the image is broken, which is the one failure this
      // job exists to prevent.
      //
      // The two `cp`s are the Dockerfile's, in the same order and for the same
      // reason: the standalone bundle carries its own minimal `node_modules` and
      // NOT `.next/static` or `public`, so a server started without them answers
      // documents whose every asset 404s. Keeping this command in step with
      // `Dockerfile`'s final stage is the maintenance cost, and it is the cost
      // of testing what ships.
      command: [
        'pnpm build',
        'cp -r .next/static .next/standalone/.next/static',
        'cp -r public .next/standalone/public',
        'node .next/standalone/server.js',
      ].join(' && '),
      url: SITE_ORIGIN,
      reuseExistingServer: !process.env['CI'],
      timeout: 300_000,
      env: {
        NEXT_PUBLIC_MOTIR_APP_ORIGIN: STUB_ORIGIN,
        // ⚠️ SET EXPLICITLY RATHER THAN INHERITED (MOTIR-4220). `ci.yml` sets
        // this at WORKFLOW level, to the production base domain, because
        // `build` and `deploy` need it there — and a lane that inherited it
        // would be testing a different namespace from the one its tenant host
        // (`acme.localhost`) belongs to. Same rule, same reason, as the origin
        // above; `e2e/stub/origin.ts` carries the full note.
        NEXT_PUBLIC_MOTIR_TENANT_DOMAIN: 'localhost',
        // /price reads motir-ai's public routes (MOTIR-8382): the stub here,
        // never the live engine — and every read fresh, so a spec can switch
        // the stub's answer between page loads.
        NEXT_PUBLIC_MOTIR_AI_ORIGIN: STUB_ORIGIN,
        MOTIR_PLAN_LADDER_REVALIDATE_S: '0',
        NEXT_TELEMETRY_DISABLED: '1',
        // The docs install commands name the committed floor in this lane
        // (MOTIR-8802): `scripts/skills/resolve-release.ts` honours a value
        // already set, so the build never reaches GitHub and the spec's
        // expected tag cannot drift under it.
        SKILLS_RELEASE_TAG: SKILLS_RELEASE_PIN,
        // ⚠️ THE LANE READS /docs FROM THE REPOSITORY, PER REQUEST (MOTIR-8072).
        // Set for the build AND the server, like the origin above: at build time
        // it turns every /docs page dynamic (`DocsDocument` calls `connection()`
        // when it is set), and at run time it points the standalone server — which
        // `chdir`s into `.next/standalone` and would read the copy traced there —
        // at the repository's own `content/docs`. So the acceptance walk's step 8
        // can edit `sentry/en.md` and see `/de/docs/sentry` go stale. The image and
        // CI's `build` job never set it, so production stays prerendered; this is
        // the one place the lane deliberately renders /docs differently from what
        // ships, and `lib/docsDocuments.ts` (`liveDocsContentRoot`) says why.
        // `process.cwd()` is the repository root, as for `e2e/support/catalogue.ts`.
        MOTIR_DOCS_LIVE_CONTENT_ROOT: join(process.cwd(), 'content', 'docs'),
        // The standalone server reads its own port and host; `next start`'s
        // `--port` flag does not reach it.
        PORT: String(SITE_PORT),
        HOSTNAME: '127.0.0.1',
      },
    },
  ],
})
