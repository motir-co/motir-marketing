import { writeFileSync } from 'node:fs'
import { readSitemap } from '../support/sitemap'
import { expect, test, type Page } from '@playwright/test'
import { SITE_ORIGIN } from '../stub/origin'
import { t } from '../support/catalogue'
import { settleFonts } from '../support/fontFaces'

/*
 * ⚠️ THE ACCEPTANCE WALK FOR LEGAL PAGES THAT STAY ENGLISH (MOTIR-8090) —
 * Story MOTIR-7740, PACED FOR A PERSON TO WATCH.
 *
 * The story's seven Verification steps, in order, as one signed-out visitor:
 * ONE test, ONE context, ONE page, so the run yields ONE video.
 *
 *   1. French Terms from the footer, under its French note, title and body English.
 *   2. The note's link opens English Terms with no note — and the reader's
 *      language is still French afterwards.
 *   3. /legal in Japanese, through the switcher, then Privacy.
 *   4. /legal and Privacy in Polish.
 *   5. No note in English.
 *   6. The French Terms page SOURCE: <html lang="fr">, lang="en" on the English
 *      text, a canonical at the English document, no hreflang.
 *   7. /sitemap.xml lists Terms once, unprefixed.
 *   8. A French 404.
 *
 * Every expected sentence is read from `messages/<locale>.json` through
 * `e2e/support/catalogue.ts`; none is typed here. The note's sentence carries
 * an ICU `<link>` tag, which is stripped before comparing.
 *
 * ⚠️ THE BROWSER LANGUAGE IS SET ON THE ROUTE, NOT WITH `setExtraHTTPHeaders`
 * (the sibling acceptance specs' note): Chromium writes its own
 * `Accept-Language` over an extra header of that name.
 *
 * Every `beat()` is pacing, NOT a wait for state: each assertion waits on a
 * response, a URL, a rendered attribute or the font set settling.
 */

test.setTimeout(240_000)

/**
 * Crawl data (canonicals, the sitemap) names the PUBLIC site, whatever address
 * the lane serves it from — `e2e/specs/project-crawl.spec.ts` asserts it the same.
 */
const CRAWL_ORIGIN = 'https://motir.co'

/** Pacing for the recording. NOT a wait for state — see the header. */
const beat = (page: Page, ms = 900) => page.waitForTimeout(ms)

/* CHAPTERS ARE MEASURED, NEVER AUTHORED. */
const chapters: { label: string; tSeconds: number }[] = []
const startedAt = Date.now()
const chapter = (label: string) => {
  chapters.push({ label, tSeconds: (Date.now() - startedAt) / 1000 })
}

test.afterEach(({}, testInfo) => {
  writeFileSync(
    testInfo.outputPath('chapters.json'),
    JSON.stringify(chapters, null, 2),
  )
})

const html = (page: Page) => page.locator('html')
const note = (page: Page) => page.locator('[role="note"]')
/** A catalogue sentence as the page shows it: its one `<link>` tag stripped. */
const plain = (sentence: string) => sentence.replace(/<\/?link>/g, '')

/** Every request the page makes from here on asks for `language`. */
async function browserLanguage(page: Page, language: string) {
  await page.unroute('**/*')
  await page.route('**/*', (route) =>
    route.continue({
      headers: { ...route.request().headers(), 'accept-language': language },
    }),
  )
}

/** Open the globe and choose a language, by its `lang`; waits on the page. */
async function choose(page: Page, locale: string) {
  await page.locator('button[aria-controls="language-menu"]').click()
  await beat(page, 600)
  await page.locator(`#language-menu a[lang="${locale}"]`).click()
  await expect(html(page)).toHaveAttribute('lang', locale)
}

const localeCookie = async (page: Page) =>
  (await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value

test('legal pages stay English, as Story MOTIR-7740 asks to be accepted', async ({
  page,
}) => {
  await page.context().clearCookies()
  await browserLanguage(page, 'fr-FR,fr;q=0.9')

  // ── 1 ─────────────────────────────────────────────────────────────────────
  chapter('1 · French Terms from the footer, under its note')
  // A French browser's arrival on `/` is request-time detection, which the
  // Worker routes own: `acceptance-legal-binding-english-live.spec.ts` walks
  // it. The static walk opens the French landing itself (MOTIR-10649).
  await page.goto('/fr')
  await expect(html(page)).toHaveAttribute('lang', 'fr')
  const terms = page
    .locator('footer')
    .getByRole('link', { name: t('fr', 'footer.terms') })
  await terms.scrollIntoViewIfNeeded()
  await beat(page)
  await terms.click()
  await expect(page).toHaveURL(`${SITE_ORIGIN}/fr/legal/terms`)
  await expect(html(page)).toHaveAttribute('lang', 'fr')
  await expect(
    page.getByRole('link', { name: t('fr', 'legal.allDocuments') }),
  ).toBeVisible()
  await expect(note(page)).toHaveCount(1)
  await expect(note(page)).toHaveText(
    plain(t('fr', 'legal.bindingNote.document')),
  )
  await expect(note(page)).not.toHaveText(
    plain(t('en', 'legal.bindingNote.document')),
  )
  const h1 = page.locator('h1')
  await expect(h1).toHaveText('Terms of Service')
  await expect(h1).toHaveAttribute('lang', 'en')
  // Panel A: the note sits before the English title.
  expect(
    await note(page).evaluate(
      (el, title) =>
        Boolean(
          el.compareDocumentPosition(title!) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      await h1.elementHandle(),
    ),
  ).toBe(true)
  const frenchBody = await page
    .locator('h1 ~ * , header + div')
    .last()
    .innerText()
  await settleFonts(page)
  await beat(page, 1500)

  // ── 2 ─────────────────────────────────────────────────────────────────────
  chapter('2 · The link opens English Terms, and French stays chosen')
  const cookieBefore = await localeCookie(page)
  const link = note(page).getByRole('link')
  await expect(link).toHaveAttribute('href', '/en/legal/terms')
  await link.hover()
  await beat(page)
  // `/en/*` answers 308 to the unprefixed address in the static build
  // (`lib/redirects.ts`), so the link lands on `/legal/terms`, the same
  // English document.
  await Promise.all([
    page.waitForURL(`${SITE_ORIGIN}/legal/terms`),
    link.click(),
  ])
  await expect(html(page)).toHaveAttribute('lang', 'en')
  await expect(note(page)).toHaveCount(0)
  await expect(h1).toHaveText('Terms of Service')
  const englishBody = await page
    .locator('h1 ~ * , header + div')
    .last()
    .innerText()
  expect(englishBody).toBe(frenchBody)
  expect(await localeCookie(page)).toBe(cookieBefore)
  await beat(page, 1500)
  // The next unprefixed page opening in French is the remembered language
  // beating the bare address, a per-request answer: the `-live` file has it.
  await page.goto('/fr')
  await expect(html(page)).toHaveAttribute('lang', 'fr')
  await beat(page, 1200)

  // ── 3 ─────────────────────────────────────────────────────────────────────
  chapter('3 · /legal and Privacy in Japanese')
  await choose(page, 'ja')
  await page.goto('/ja/legal')
  await expect(html(page)).toHaveAttribute('lang', 'ja')
  await expect(page.locator('h1')).toHaveText(t('ja', 'legal.indexTitle'))
  await expect(note(page)).toHaveText(t('ja', 'legal.bindingNote.index'))
  const titles = page.locator('ul li a > span:first-child')
  await expect(titles).toHaveCount(7)
  for (const title of await titles.all())
    await expect(title).toHaveAttribute('lang', 'en')
  await expect(titles.first()).toHaveText('Terms of Service')
  await settleFonts(page)
  await beat(page, 1500)
  await page.getByRole('link', { name: /Privacy Policy/ }).click()
  await expect(page).toHaveURL(`${SITE_ORIGIN}/ja/legal/privacy`)
  await expect(note(page)).toHaveText(
    plain(t('ja', 'legal.bindingNote.document')),
  )
  await expect(page.locator('h1')).toHaveText('Privacy Policy')
  await settleFonts(page)
  await beat(page, 1500)

  // ── 4 ─────────────────────────────────────────────────────────────────────
  chapter('4 · /legal and Privacy in Polish')
  await choose(page, 'pl')
  await page.goto('/pl/legal')
  await expect(page.locator('h1')).toHaveText(t('pl', 'legal.indexTitle'))
  await expect(note(page)).toHaveText(t('pl', 'legal.bindingNote.index'))
  await expect(titles.first()).toHaveAttribute('lang', 'en')
  await beat(page, 1200)
  await page.getByRole('link', { name: /Privacy Policy/ }).click()
  await expect(page).toHaveURL(`${SITE_ORIGIN}/pl/legal/privacy`)
  await expect(note(page)).toHaveText(
    plain(t('pl', 'legal.bindingNote.document')),
  )
  await expect(page.locator('h1')).toHaveText('Privacy Policy')
  await settleFonts(page)
  await beat(page, 1500)

  // ── 5 ─────────────────────────────────────────────────────────────────────
  chapter('5 · No note in English')
  await choose(page, 'en')
  for (const path of ['/legal/terms', '/legal']) {
    await page.goto(path)
    await expect(html(page)).toHaveAttribute('lang', 'en')
    await expect(note(page)).toHaveCount(0)
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))
    expect(
      hrefs.filter((h) => /^\/en(\/|$)/.test(h)),
      path,
    ).toEqual([])
    await beat(page, 1200)
  }

  // ── 6 ─────────────────────────────────────────────────────────────────────
  chapter('6 · The French Terms page source')
  const source = await (await page.request.get('/fr/legal/terms')).text()
  expect(source).toMatch(/<html[^>]*\blang="fr"/)
  expect(source).toMatch(/<h1[^>]*\blang="en"/)
  expect(source).toMatch(/<div[^>]*\blang="en"/)
  expect(source).toContain(
    `<link rel="canonical" href="${CRAWL_ORIGIN}/legal/terms"/>`,
  )
  expect(source).not.toMatch(/<link rel="alternate" hrefLang=/i)
  // The index is translated chrome, so it keeps its own canonical and alternates.
  const indexSource = await (await page.request.get('/fr/legal')).text()
  expect(indexSource).toContain(
    `<link rel="canonical" href="${CRAWL_ORIGIN}/fr/legal"/>`,
  )
  expect(indexSource).toMatch(/<link rel="alternate" hrefLang="ja"/i)
  await page
    .goto('view-source:' + SITE_ORIGIN + '/fr/legal/terms')
    .catch(() => undefined)
  await beat(page, 2500)

  // ── 7 ─────────────────────────────────────────────────────────────────────
  chapter('7 · The sitemap lists Terms once, at its English address')
  const sitemap = await page.goto('/sitemap.xml')
  expect(sitemap?.status()).toBe(200)
  // motir.co's `/sitemap.xml` is an index since MOTIR-8842: the page above is
  // the index, and the Terms entries live in the site half it points at.
  const xml = await readSitemap(page.request)
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!)
  expect(locs.filter((loc) => loc.endsWith('/legal/terms'))).toEqual([
    `${CRAWL_ORIGIN}/legal/terms`,
  ])
  expect(
    locs.filter((loc) => /\/[a-z]{2}(-[a-z]{2})?\/legal\/[^/]+$/.test(loc)),
  ).toEqual([])
  expect(locs).toContain(`${CRAWL_ORIGIN}/fr/legal`)
  await beat(page, 2000)

  // ── 8 ─────────────────────────────────────────────────────────────────────
  chapter('8 · A French 404')
  // The sitemap has no switcher: back to an English page, and choose French.
  await page.goto('/legal')
  await choose(page, 'fr')
  const missing = await page.goto('/fr/legal/does-not-exist')
  expect(missing?.status()).toBe(404)
  await expect(page.getByText(t('fr', 'notFound.title'))).toBeVisible()
  await expect(note(page)).toHaveCount(0)
  await beat(page, 2000)
})
