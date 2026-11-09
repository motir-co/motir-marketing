import { expect, test, type Page } from '@playwright/test'
import { SITE_ORIGIN } from '../stub/origin'

/*
 * THE PER-REQUEST HALF OF THE LEGAL ACCEPTANCE WALK (MOTIR-8090), held for the
 * Worker-routes story MOTIR-10635.
 *
 * `acceptance-legal-binding-english.spec.ts` walks the static pages. These are
 * the assertions it carried that only a per-request answer can satisfy, moved
 * here verbatim (MOTIR-10649): a French browser's arrival on `/` is detected
 * and sent to `/fr`, the note's `/en/legal/terms` link serves English, and the
 * next visit to `/` still opens in French.
 *
 * ⚠️ PORTED TO THE BUILT SITE (MOTIR-10758): `/en/…` is not an address any
 * more — `_redirects` answers it with a 308 to the unprefixed English page
 * (`lib/redirects.ts`), so the note's link lands on `/legal/terms`. The
 * Terms are still English there, and no language is chosen on the way.
 */

const html = (page: Page) => page.locator('html')
const note = (page: Page) => page.locator('[role="note"]')

const localeCookie = async (page: Page) =>
  (await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value

/** Every request the page makes from here on asks for `language`. */
async function browserLanguage(page: Page, language: string) {
  await page.unroute('**/*')
  await page.route('**/*', (route) =>
    route.continue({
      headers: { ...route.request().headers(), 'accept-language': language },
    }),
  )
}

test('a French browser lands in French, and the English Terms keep French chosen', async ({
  page,
}) => {
  await page.context().clearCookies()
  await browserLanguage(page, 'fr-FR,fr;q=0.9')

  const landing = await page.goto('/')
  expect(new URL(page.url()).pathname).toBe('/fr')
  expect(landing?.request().redirectedFrom()).not.toBeNull()
  await expect(html(page)).toHaveAttribute('lang', 'fr')

  await page.goto('/fr/legal/terms')
  const cookieBefore = await localeCookie(page)
  const link = note(page).getByRole('link')
  await expect(link).toHaveAttribute('href', '/en/legal/terms')
  await Promise.all([
    page.waitForURL(`${SITE_ORIGIN}/legal/terms`),
    link.click(),
  ])
  await expect(html(page)).toHaveAttribute('lang', 'en')
  await expect(note(page)).toHaveCount(0)
  expect(await localeCookie(page)).toBe(cookieBefore)

  // The next unprefixed motir.co page still opens in French. `page.request`
  // shares the context's cookies but not `page.route`, so it is handed the
  // browser's language explicitly.
  const bare = await page.request.get('/', {
    maxRedirects: 0,
    headers: { 'accept-language': 'fr-FR,fr;q=0.9' },
  })
  expect(bare.status()).toBe(307)
  expect(new URL(bare.headers()['location']!, SITE_ORIGIN).pathname).toBe('/fr')
  await page.goto('/')
  await expect(page).toHaveURL(`${SITE_ORIGIN}/fr`)
  await expect(html(page)).toHaveAttribute('lang', 'fr')
})
