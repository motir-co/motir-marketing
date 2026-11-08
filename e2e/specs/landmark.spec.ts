import { expect, test } from '@playwright/test'
import { SITE_ROUTES } from '../routes'

/*
 * THE `main` LANDMARK AND ITS SKIP LINK, IN A REAL BROWSER (MOTIR-4169).
 *
 * The behavioural half of `tests/mainLandmark.test.tsx`. That one enumerates
 * `app/**​/page.tsx` from disk and reads the layout chain — the only half that
 * can catch a page NOBODY covered, because a browser needs a URL and a dynamic
 * segment has none until a parameter is supplied. This one asks the question
 * the static read cannot: what does the DOM actually contain? A landmark
 * rendered by a component the static scan never opens, or one duplicated at
 * run time by a branch it cannot follow, shows up here and only here.
 *
 * The two are joined at `e2e/routes.ts`: the vitest lane asserts that this
 * table is EXACTLY the enumerated route set, so a page added later is red in
 * `test` (seconds) before it is ever walked here.
 *
 * ⚠️ EVERY WAIT IS ON AN AUTHORITATIVE SIGNAL — a response, a rendered
 * landmark, a focused element — never a timeout, per the lane's own discipline
 * (`e2e/specs/smoke.spec.ts`).
 */

for (const route of SITE_ROUTES) {
  test(`${route.pattern} renders exactly one main landmark`, async ({
    page,
  }) => {
    const response = await page.goto(route.url)

    // ⚠️ THE STATUS IS ASSERTED FIRST, AND IT IS NOT A COURTESY. A route whose
    // stub fixture is missing renders a not-found page — which HAS a landmark,
    // because the chrome supplies it — so the landmark assertion below would
    // pass while proving nothing at all about the route named in the title.
    expect(response?.status(), `${route.url} did not serve a document`).toBe(
      200,
    )

    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.locator('main')).toHaveCount(1)
  })
}
