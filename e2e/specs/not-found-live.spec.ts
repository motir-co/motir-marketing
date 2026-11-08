import { expect, test } from '@playwright/test'

/*
 * THE PER-REQUEST HALF OF `not-found.spec.ts` (MOTIR-10649).
 *
 * Both room-door cases walk the door to its destination, `/explore` and
 * `/fr/explore`, which render per request from the public API.
 * The cases below moved here VERBATIM from `not-found.spec.ts`, whose
 * static cases still run. This file is on `playwright.config.ts`'s
 * `testIgnore` list, because a static-only serve cannot answer the routes it
 * drives; the Worker-routes story re-includes it by deleting that one entry.
 */

test('the room gives a lost visitor a way out — two doors, Explore first', async ({
  page,
}) => {
  /*
   * The defect this card exists for was not the missing landmark: it was that
   * NOTHING on the page linked anywhere, so the only way out of a 404 on
   * motir.co was the Back button. The doors are the deliverable, so they are
   * asserted rather than left to the landmark count.
   *
   * ── ⚠️ THE DOORS ARE ABSOLUTE NOW, ON EVERY HOST (MOTIR-4430) ───────────
   *
   * They used to be `/explore` and `/`. This room is worn by every host
   * `proxy.ts` serves — a tenant address that 404s a path, the tenant base
   * domain, any host the public contract does not know — and on those hosts
   * both of those paths belong to somebody else, so the two doors led back into
   * the room the visitor was already standing in. `app/not-found.tsx` is the
   * GLOBAL not-found boundary and may not read the request to tell the hosts
   * apart: a `headers()` read there makes the whole site dynamic (measured; the
   * file carries the route tables). So it spells both doors on the site origin,
   * which is the only spelling that works off the site and the same destination
   * on it.
   */
  const response = await page.goto('/no-such-page')
  expect(response?.status()).toBe(404)

  const room = page.getByRole('main')
  await expect(room).toBeVisible()

  const explore = room.getByRole('link', {
    name: 'See projects built in public',
  })
  const home = room.getByRole('link', { name: 'Go to the homepage' })

  const exploreHref = await explore.getAttribute('href')
  const homeHref = await home.getAttribute('href')

  // Absolute, and on the SITE origin rather than on some other host.
  expect(new URL(exploreHref!).pathname).toBe('/explore')
  expect(new URL(homeHref!).pathname).toBe('/')
  expect(new URL(exploreHref!).origin).toBe(new URL(homeHref!).origin)

  // The ORDER is the design's whole argument about the count: the doors are a
  // RANKING, and Explore is first because three of the four arrivals wanted a
  // public project or to browse for one.
  await expect(room.getByRole('link')).toHaveCount(2)
  await expect(room.getByRole('link').first()).toHaveText(
    'See projects built in public',
  )

  /*
   * And the destination WORKS — a door that renders and does not lead anywhere
   * is the same dead end in a different font.
   *
   * ⚠️ THE PATH IS WALKED ON THIS SERVER, NOT THE HREF. `lib/siteOrigin.ts`
   * defaults to `https://motir.co` and this lane does not override it, so
   * clicking the door would navigate to PRODUCTION from CI — the exact coupling
   * `e2e/stub/origin.ts` records having paid for once already. Overriding
   * `NEXT_PUBLIC_MOTIR_SITE_ORIGIN` for the lane was tried and reverted: ten
   * specs assert `https://motir.co` in a canonical, a sitemap or a JSON-LD
   * graph, and moving the site's origin under them would have been a far larger
   * change than this card. So the assertion above pins WHERE the door points
   * and this one pins that the destination serves.
   */
  const destination = await page.goto(new URL(exploreHref!).pathname)
  expect(destination?.status()).toBe(200)
  await expect(page).toHaveURL(/\/explore$/)
})

test('the French room’s doors stay in French — /fr/explore, then /fr', async ({
  page,
}) => {
  const response = await page.goto('/fr/no-such-page')
  expect(response?.status()).toBe(404)

  const doors = page.getByRole('main').getByRole('link')
  await expect(doors).toHaveCount(2)
  const [exploreHref, homeHref] = await Promise.all([
    doors.nth(0).getAttribute('href'),
    doors.nth(1).getAttribute('href'),
  ])
  expect(new URL(exploreHref!).pathname).toBe('/fr/explore')
  expect(new URL(homeHref!).pathname).toBe('/fr')
  expect(new URL(exploreHref!).origin).toBe(new URL(homeHref!).origin)

  // Walked on this server, not followed to the href's production origin — the
  // reason is the English door test's, above.
  const destination = await page.goto('/fr/explore')
  expect(destination?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
})
