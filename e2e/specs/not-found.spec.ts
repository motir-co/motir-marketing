import { expect, test } from '@playwright/test'

/*
 * THE 404 ROOM, IN A REAL BROWSER (MOTIR-4193).
 *
 * ── ⚠️ WHY THIS IS ITS OWN SPEC AND NOT A ROW IN `e2e/routes.ts` ──────────
 *
 * `tests/mainLandmark.test.tsx` asserts that `SITE_ROUTES` is EXACTLY the set
 * of `app/**​/page.tsx` patterns it enumerates from disk. `app/not-found.tsx`
 * is not a `page.tsx` and serves no route pattern, so adding a 404 row to that
 * table would turn the `test` job red on the very assertion that keeps the
 * table honest. The 404 needs its own entry in the lane — which is this file —
 * and the design asset says so in as many words
 * (`motir-core/design/public-site/design-notes.md`, the second of MOTIR-4193's
 * two ordering traps).
 *
 * ── THE STATUS AND THE LANDMARK COUNT ARE TWO INDEPENDENT FAILURES ────────
 *
 * Before this card the page was `404` with **zero** `main` elements; a room
 * that rendered its own `<main>` inside `SiteShell` would give **two**. Only
 * the COUNT catches the second, and only the status catches the first — which
 * is the failure a `loading.tsx` introduced above any route that calls
 * `notFound()` would produce: the response head flushes at 200 and the 404
 * becomes a page that merely looks like one (MOTIR-3491, on the other host).
 * So both are asserted, on every arrival.
 *
 * ⚠️ Every wait is on an authoritative signal — the navigation response and a
 * rendered landmark — never a timeout, per the lane's own discipline.
 */

/*
 * THE FOUR ARRIVALS the design asset derives the room's doors from, and they
 * are not interchangeable: three of them throw `notFound()` from INSIDE a
 * segment whose layout renders its own `SiteShell`, and the fourth matches no
 * route at all. The nested three are the ones that would expose a second
 * landmark if Next kept the segment's layout around the boundary, so walking
 * only `/no-such-page` would assert the easy case and prove nothing about the
 * three URLs a real visitor actually arrives on.
 */
const ARRIVALS = [
  {
    what: 'a mistyped URL — no route matches at all',
    url: '/no-such-page',
  },
  {
    what: 'an unknown legal slug — notFound() under app/legal/layout.tsx',
    url: '/legal/no-such-document',
  },
  {
    what: 'an unlisted topic — notFound() under app/explore/layout.tsx',
    url: '/explore/topic/no-such-topic',
  },
  {
    what: 'a project that is not public — notFound() under app/p/[identifier]/layout.tsx',
    // The stub answers `STUB_NO_FIXTURE` (404) for an identifier it has no
    // fixture for, which is exactly the read the page turns into `notFound()`.
    url: '/p/NO-SUCH-PROJECT',
  },
] as const

for (const arrival of ARRIVALS) {
  test(`${arrival.url} — ${arrival.what}`, async ({ page }) => {
    const response = await page.goto(arrival.url)

    // A REAL 404, not a page that renders like one.
    expect(response?.status(), `${arrival.url} did not answer 404`).toBe(404)

    // The chrome supplies the landmark, and supplies exactly one of it.
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.locator('main')).toHaveCount(1)
  })
}

test('the chrome is there, and no nav item claims to be the current page', async ({
  page,
}) => {
  await page.goto('/no-such-page')

  // The header and footer the stock screen has none of.
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()

  // `isCurrent()` matches `/explore` and `/docs` and their prefixes; a 404 URL
  // is neither, so the accent treatment is absent BY DERIVATION. Asserted so a
  // later edit does not "fix" it by marking one.
  await expect(page.locator('[aria-current="page"]')).toHaveCount(0)
})

/*
 * THE ROOM IN THE PAGE'S LANGUAGE (MOTIR-7955).
 *
 * The same four arrivals under `/fr`. Each must still be a REAL 404 with one
 * landmark, and now inside `<html lang="fr">` — the locale boundary
 * (`app/[locale]/not-found.tsx`) rather than the global English one. No French
 * catalogue exists yet, so the room's WORDS are English through the fallback
 * and are asserted in `tests/notFoundRoom.test.tsx` against its own fixture
 * catalogue; here the assertions are the language attribute and the doors.
 */
for (const arrival of ARRIVALS) {
  const url = `/fr${arrival.url}`
  test(`${url} — the French room for ${arrival.what}`, async ({ page }) => {
    const response = await page.goto(url)

    expect(response?.status(), `${url} did not answer 404`).toBe(404)
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.locator('main')).toHaveCount(1)
  })
}

test('the English room still says lang="en" — the unprefixed miss reaches the en tree', async ({
  page,
}) => {
  const response = await page.goto('/no-such-page')
  expect(response?.status()).toBe(404)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})
