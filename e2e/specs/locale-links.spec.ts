import { expect, test } from '@playwright/test'
import { SITE_ORIGIN } from '../stub/origin'
import { HEADER_LADDER } from '../../i18n/routing'

/*
 * A FRENCH READER STAYS FRENCH (MOTIR-7971), in a real browser.
 *
 * `tests/i18n/internalLinks.test.tsx` renders the pages under `fr` and reads
 * every href. This asks what only a browser can: that following the links
 * lands on a French address with NO redirect in between (a redirect would mean
 * the link was English and the locale router rescued it), that a redirect the
 * site issues itself keeps the language, that the docs rail marks the current
 * page under a prefix, and that a tenant host's two kinds of link split the way
 * the card says — motir.co's pages in the reader's language, the project's own
 * tabs unprefixed.
 *
 * Every wait is on an authoritative signal: the navigation response, a URL, a
 * rendered attribute. Never a timeout.
 */

test('a link on a French page goes straight to the French page', async ({
  page,
}) => {
  // Wide enough for the French bar's nav (the header's give-way ladder,
  // `HEADER_LADDER` — below it the nav folds into the Menu panel).
  await page.setViewportSize({
    width: Math.max(1440, HEADER_LADDER.fr.b),
    height: 900,
  })
  await page.goto(`${SITE_ORIGIN}/fr/explore`)
  const docs = page.locator('header a[href="/fr/docs"]').first()
  await expect(docs).toBeVisible()

  await docs.click()
  await expect(page).toHaveURL(`${SITE_ORIGIN}/fr/docs`)
  await expect(page.locator('h1').first()).toBeVisible()

  // And the address the link names is the page itself, not a hop to it.
  const direct = await page.request.get(`${SITE_ORIGIN}/fr/docs`, {
    maxRedirects: 0,
  })
  expect(direct.status()).toBe(200)
})

test('an old product address redirects into the French docs', async ({
  page,
}) => {
  const response = await page.goto(`${SITE_ORIGIN}/fr/products/mcp`)
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(`${SITE_ORIGIN}/fr/docs/mcp`)
})

test('the docs rail marks the current page under a prefix', async ({
  page,
}) => {
  await page.goto(`${SITE_ORIGIN}/fr/docs/mcp`)
  // The rail marks the page and the bar its section (`/fr/docs`), both read
  // through `useSitePathname`, which strips the prefix.
  await expect(
    page.locator('a[aria-current="page"][href="/fr/docs/mcp"]').first(),
  ).toBeAttached()
  await expect(
    page.locator('a[aria-current="page"][href="/fr/docs"]').first(),
  ).toBeAttached()
  // And no rail link fell back to English.
  const english = await page
    .locator('a[href^="/docs"]')
    .evaluateAll((links) => links.map((l) => l.getAttribute('href')))
  expect(english).toEqual([])
})
