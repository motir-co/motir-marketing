import { expect, test, type Page } from '@playwright/test'
import { SITE_ORIGIN } from '../stub/origin'

/*
 * THE PER-REQUEST HALF OF `languageSwitcher.spec.ts` (MOTIR-10649).
 *
 * Two of the switcher's assertions are per-request behaviour: the query kept
 * across the switch on `/explore` (a page that renders per request), and the
 * remembered `NEXT_LOCALE` choice beating the browser's languages on the bare
 * `/` (a 307 the request-time language detection answers). The case that holds
 * them moved here VERBATIM; `languageSwitcher.spec.ts` runs the rest of it on a
 * static page. This file is on `playwright.config.ts`'s `testIgnore` list,
 * because a static-only serve answers neither; the Worker-routes story
 * re-includes it by deleting that one entry.
 */

// By the menu it controls, not by its name: the name is the catalogue's, so
// it reads « Langue : Français » on a French page now that fr.json exists.
const globe = (page: Page) =>
  page.locator('header button[aria-controls="language-menu"]')
const entry = (page: Page, name: string) =>
  page.locator('#language-menu').getByRole('link', { name, exact: true })

test('choosing Français moves to the same page in French and remembers it', async ({
  page,
  context,
}) => {
  await page.goto(`${SITE_ORIGIN}/explore?q=plan`)
  await globe(page).click()
  await entry(page, 'Français').click()
  await expect(page).toHaveURL(`${SITE_ORIGIN}/fr/explore?q=plan`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')

  const cookies = await context.cookies(SITE_ORIGIN)
  expect(cookies.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe('fr')

  // And the remembered choice beats a German browser on the bare address.
  const root = await page.request.get(`${SITE_ORIGIN}/`, {
    maxRedirects: 0,
    headers: { 'Accept-Language': 'de' },
  })
  expect(root.status()).toBe(307)
  expect(new URL(root.headers()['location']!, SITE_ORIGIN).pathname).toBe('/fr')
})
