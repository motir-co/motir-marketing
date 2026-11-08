import { expect, test } from '@playwright/test'

/*
 * THE PER-REQUEST HALF OF `smoke.spec.ts` (MOTIR-10649).
 *
 * `/explore` renders per request from the public API. The cases below are
 * moved here VERBATIM from `smoke.spec.ts`, whose static cases still run. This
 * file is on `playwright.config.ts`'s `testIgnore` list: a static-only serve
 * cannot answer the route it drives, and the Worker-routes story re-includes
 * it by deleting that one entry.
 */

test('the explore directory renders the projects the stub serves', async ({
  page,
}) => {
  // The half a `page.route()` stub could never reach: `lib/explore.ts` fetches
  // from a SERVER component, so this assertion passing is the proof that the
  // build was pointed at the stub rather than at app.motir.co.
  //
  // ⚠️ THE ASSERTION IS ON THE SECOND FIXTURE, NOT THE FIRST, and deliberately.
  // "Motir" appears in the page's own heading, its banner and its footer, so a
  // spec asserting it would pass with the API unreachable and the empty state
  // rendered — the exact failure this spec exists to catch. "Acme Inc" appears
  // nowhere on this site except in a card built from the fixture.
  await page.goto('/explore')

  await expect(
    page.getByRole('heading', { name: /Projects built in public/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Acme', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Acme Inc')).toBeVisible()
})
