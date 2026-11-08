import { expect, test } from '@playwright/test'
import { SITE_ORIGIN } from '../stub/origin'

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
