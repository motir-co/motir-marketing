import { expect, test } from '@playwright/test'
import { STUB_ORIGIN } from '../stub/origin'

// THE LANE'S SUBJECT (MOTIR-4112).
//
// One spec, deliberately small, and it exists so the job cannot be
// green-because-empty. The `/p/*` walk is MOTIR-4122's; what is asserted here is
// that the harness itself works end to end — the app builds against the stub,
// starts, serves a document, and the stub answers the reads a server component
// makes before the browser has anything to render.
//
// ⚠️ EVERY WAIT IS ON AN AUTHORITATIVE SIGNAL — a response, a URL, a rendered
// landmark — never a timeout. That is `motir-core/CLAUDE.md`'s E2E discipline
// and it applies to this repository from its first spec rather than from the
// first flake.

test('the landing page serves a document with a main landmark', async ({
  page,
}) => {
  const response = await page.goto('/')

  expect(response?.status(), 'the site did not serve the landing page').toBe(
    200,
  )
  await expect(page.getByRole('main')).toBeVisible()
})

test('a page the stub has NO fixture for fails loudly rather than looking empty', async ({
  page,
}) => {
  // The stub's own contract, asserted once. An unfixtured path answers 404 with
  // `STUB_NO_FIXTURE`, so a spec that renders an empty state because the stub
  // was never taught a route can be told apart from one rendering an empty
  // state because the product does. Checked at the stub rather than through a
  // page, because the point is the stub's behaviour.
  //
  // ⚠️ THE ORIGIN IS IMPORTED, NEVER READ FROM THE ENVIRONMENT. This line used
  // to be `process.env['NEXT_PUBLIC_MOTIR_APP_ORIGIN'] ?? <the stub>`, which
  // resolved to the stub locally and to PRODUCTION in CI — `ci.yml` sets that
  // variable at workflow level. See `e2e/stub/origin.ts`.
  const res = await page.request.get(`${STUB_ORIGIN}/api/public/p/NOPE`)

  expect(res.status()).toBe(404)
  expect(await res.json()).toMatchObject({ code: 'STUB_NO_FIXTURE' })
})
