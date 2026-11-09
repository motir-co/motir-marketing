import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { LOCALE_BCP47, type Locale } from '../../i18n/routing'
import { SITE_ORIGIN } from '../stub/origin'
import { t } from '../support/catalogue'
import {
  beat,
  choose,
  ENDONYMS,
  firstFamily,
  freshVisitor,
  HAN,
  html,
  lede,
  noKeyNoEnglish,
  ORDER,
  TAGS,
} from '../support/elevenLanguages'
import {
  CJK_FAMILIES,
  DEFAULT_FAMILY,
  fetchedFamilies,
  settleFonts,
  siblingFamilies,
  typeface,
  watchFontRequests,
} from '../support/fontFaces'

/*
 * ⚠️ THE ACCEPTANCE WALK FOR TWELVE LANGUAGES (MOTIR-7968) — Story MOTIR-7737,
 * PACED FOR A PERSON TO WATCH. Traditional Chinese (Taiwan), `/zh-tw`, joined
 * as the twelfth in Story MOTIR-8937 (MOTIR-9253), with its own chapters. The
 * file keeps its name so history and anything linking it by path holds.
 *
 * The stories' Verification steps, in order, as one signed-out visitor:
 * ONE test, ONE context, ONE page, so the run yields ONE video. A new browser
 * language is the `Accept-Language` header and a fresh visit is
 * `clearCookies()` — the server decides only from the header and the cookie,
 * so that is the state a new browser profile gives, kept on one clip.
 *
 * ⚠️ THE HEADER IS SET ON THE ROUTE, NOT WITH `setExtraHTTPHeaders`. Chromium
 * writes its own `Accept-Language` (from the context's locale) over an extra
 * header of that name, so a page told `ja` still asked for `en-US` and was
 * never moved — measured on this lane. `route.continue` sends what it is given.
 *
 * Every expected string is read from `messages/<locale>.json` through
 * `e2e/support/catalogue.ts`. The only non-Latin text typed here is the
 * switcher's endonym list and the four Han characters the Han step draws.
 *
 * ⚠️ A URL CODE IS NOT A LANGUAGE TAG. `/zh-tw` is the URL code and the
 * cookie's value; the page, the switcher entry and the hreflang key say
 * `zh-TW`. `ORDER` is the codes, `TAGS` the tags, typed out so a wrong map in
 * `i18n/routing.ts` turns this red instead of moving the expectation.
 *
 * ⚠️ THE STATIC HALF (MOTIR-10649). The site is built ahead now, so the
 * journeys a static-only serve cannot answer — the bare-`/` detection, the
 * `/zh-TW/…` 308, `/fr/p/ROAD`, the remembered choice beating the browser, and
 * the per-request pages of the walk — moved verbatim to
 * `acceptance-eleven-languages-live.spec.ts`, on the lane's `testIgnore` list.
 * The case numbers below are the story's, so the gaps are those journeys.
 *
 * Every `beat()` is pacing, NOT a wait for state: each assertion waits on a
 * response, a URL, a rendered attribute or the font set settling.
 */

// Sixteen journeys at a watchable pace: set here so the other specs keep the
// lane's tighter budget, as the sibling acceptance specs do.
test.setTimeout(420_000)

/*
 * CHAPTERS ARE MEASURED, NEVER AUTHORED: `chapter()` stamps the real elapsed
 * time as the walk reaches each step, and `chapters.json` is written beside
 * the video so an index is never read against another run's recording.
 */
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

const LOCALES_WITH_PRODUCTS = ['fr', 'zh-tw'] as const

test('twelve languages on motir.co, as Stories MOTIR-7737 and MOTIR-8937 ask to be accepted', async ({
  page,
  context,
}) => {
  // ── 0 · THE ENGLISH LANDING, WHERE THE WALK STARTS (MOTIR-10649) ───────
  // The detection journeys (1–2) are per-request and run in
  // `acceptance-eleven-languages-live.spec.ts`; the static walk starts on the
  // English landing those journeys ended on.
  await freshVisitor(page, 'sv-SE,sv')
  await page.goto('/')
  await expect(html(page)).toHaveAttribute('lang', 'en')

  // ── 3 · SWITCH TO FRENCH ────────────────────────────────────────────────
  chapter('Switch to French')
  await page.locator('button[aria-controls="language-menu"]').click()
  const entries = page.locator('#language-menu a')
  await expect(entries).toHaveCount(12)
  await expect(entries).toHaveText(ENDONYMS)
  expect(
    await entries.evaluateAll((as) => as.map((a) => a.getAttribute('lang'))),
  ).toEqual(TAGS)
  // Each entry's address carries the URL code, never the tag.
  expect(
    await entries.evaluateAll((as) =>
      as.map((a) => new URL((a as HTMLAnchorElement).href).pathname),
    ),
  ).toEqual(ORDER.map((code) => (code === 'en' ? '/' : `/${code}`)))
  const traditional = page.locator('#language-menu a[lang="zh-TW"]')
  await expect(traditional).toHaveAttribute('hreflang', 'zh-TW')
  expect(
    new URL((await traditional.getAttribute('href'))!, SITE_ORIGIN).pathname,
  ).toBe('/zh-tw')
  await beat(page, 1400)
  await page.locator('#language-menu a[lang="fr"]').click()
  await expect(page).toHaveURL(`${SITE_ORIGIN}/fr`)
  await expect(html(page)).toHaveAttribute('lang', 'fr')
  const remembered = await context.cookies(SITE_ORIGIN)
  expect(remembered.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe('fr')
  await beat(page, 1200)

  // ── 4 · WALK THE SITE IN FRENCH ─────────────────────────────────────────
  chapter('Walk the site in French')
  // The build's own record of the product addresses (MOTIR-10649): every
  // product page `astro build` wrote under the locale, and every product address
  // its `_redirects` forwards to the docs. The Next build listed both in
  // `.next/prerender-manifest.json`.
  const dist = join(process.cwd(), 'dist')
  const prerendered = [
    ...LOCALES_WITH_PRODUCTS.flatMap((locale) =>
      readdirSync(join(dist, locale, 'products')).map(
        (file) => `/${locale}/products/${file.replace(/\.html$/, '')}`,
      ),
    ),
    ...readFileSync(join(dist, '_redirects'), 'utf8')
      .split('\n')
      .map((line) => line.split(' ')[0]!)
      .filter((from) => /^\/[a-z-]+\/products\//.test(from)),
  ]
  /** Every page of the walk in one language, each checked as case 4 asks. */
  const walkSite = async (locale: Locale) => {
    // Every product address the build prerendered in this language — the
    // build's own record of `products/*` and `products/[slug]`'s static params.
    const products = prerendered
      .filter((path) => path.startsWith(`/${locale}/products/`))
      .sort()
    expect(products.length).toBeGreaterThan(5)
    const walk = [...products, `/${locale}/how-it-works`, `/${locale}/design`]
    for (const path of walk) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(200)
      await expect(html(page)).toHaveAttribute('lang', LOCALE_BCP47[locale])
      // A product whose page IS its documentation forwards to the docs, whose
      // prose is outside this check (MOTIR-7739): no raw key, but no English
      // check either.
      const docs = new URL(page.url()).pathname.startsWith(`/${locale}/docs`)
      await noKeyNoEnglish(page, docs ? `${path} → docs` : path, !docs)
      await beat(page, 500)
    }
  }
  await walkSite('fr')

  // ── 5 · THE DESIGN AXES IN FRENCH ───────────────────────────────────────
  chapter('The design axes in French')
  await page.goto('/fr/design')
  const subline = page
    .getByRole('main')
    .getByText(t('fr', 'designShowcase.subline'), { exact: true })
  await expect(subline).toBeVisible()

  /** The paragraph's first family is a face the page loaded, not a system font. */
  const drawnInALoadedFace = async () => {
    await settleFonts(page)
    const family = firstFamily(
      await subline.evaluate((el) => getComputedStyle(el).fontFamily),
    )
    const loaded = await page.evaluate(
      (name) =>
        Array.from(document.fonts).some(
          (face) =>
            face.family.replace(/["']/g, '') === name &&
            face.status === 'loaded',
        ),
      family,
    )
    expect(loaded, `${family} is not a loaded FontFace`).toBe(true)
    await expect(subline).toHaveText(t('fr', 'designShowcase.subline'))
    return family
  }

  const pairings = page
    .getByRole('radiogroup', { name: t('fr', 'designShowcase.type.name') })
    .getByRole('radio')
  await expect(pairings).toHaveCount(10)
  const faces = new Set<string>()
  for (let index = 0; index < 10; index += 1) {
    await pairings.nth(index).click()
    await expect(pairings.nth(index)).toHaveAttribute('aria-checked', 'true')
    faces.add(await drawnInALoadedFace())
    await beat(page, 700)
  }
  // The pairings are not one face under ten names.
  expect(faces.size).toBeGreaterThan(1)

  const palettes = page
    .getByRole('radiogroup', { name: t('fr', 'designShowcase.palette.name') })
    .getByRole('radio')
  for (const index of [1, 0]) {
    await palettes.nth(index).click()
    await expect(palettes.nth(index)).toHaveAttribute('aria-checked', 'true')
    await drawnInALoadedFace()
    await beat(page, 700)
  }

  // ── 6 · THE FRENCH 404 ──────────────────────────────────────────────────
  chapter('The French 404')
  const missing = await page.goto('/fr/no-such-page')
  expect(missing?.status()).toBe(404)
  await expect(html(page)).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('main')).toContainText(t('fr', 'notFound.title'))
  const doors = page.getByRole('main').getByRole('link')
  await expect(doors).toHaveCount(2)
  const doorPaths = await doors.evaluateAll((as) =>
    as.map((a) => new URL((a as HTMLAnchorElement).href).pathname),
  )
  expect(doorPaths).toEqual(['/fr/explore', '/fr'])
  await beat(page, 1400)

  // ── 6a · THE SITE AND ITS 404 IN TRADITIONAL CHINESE (MOTIR-8937) ───────
  chapter('Walk the site in Traditional Chinese, and its 404')
  await walkSite('zh-tw')
  const missingTw = await page.goto('/zh-tw/no-such-page')
  expect(missingTw?.status()).toBe(404)
  await expect(html(page)).toHaveAttribute('lang', 'zh-TW')
  await expect(page.getByRole('main')).toContainText(
    t('zh-tw', 'notFound.title'),
  )
  expect(
    await page
      .getByRole('main')
      .getByRole('link')
      .evaluateAll((as) =>
        as.map((a) => new URL((a as HTMLAnchorElement).href).pathname),
      ),
  ).toEqual(['/zh-tw/explore', '/zh-tw'])
  await beat(page, 1400)

  // The walk ended on the Traditional 404; case 9 chooses from the landing
  // (case 8a, the per-request half, ended there).
  await page.goto('/zh-tw')

  // ── 9 · FOUR HAN SCRIPTS ────────────────────────────────────────────────
  chapter('Four Han scripts, each in its own face')
  const glyphs: Record<string, Buffer> = {}
  // ⚠️ EACH FONT REQUEST IS FILED UNDER THE DOCUMENT THAT MADE IT. The globe's
  // menu, opened on the previous page, draws the three CJK endonyms in their own
  // faces, and those requests are that page's, not the next one's.
  const byPage: { path: string; doc: string }[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (/\.woff2$/.test(url.pathname))
      byPage.push({ path: url.pathname, doc: new URL(page.url()).pathname })
  })
  for (const locale of ['zh', 'zh-tw', 'ja', 'ko'] as const) {
    await choose(page, locale)
    await expect(page).toHaveURL(`${SITE_ORIGIN}/${locale}`)
    await expect(lede(page)).toContainText(t(locale, 'landing.hero.lede'))
    // ⚠️ INJECTED UNTIL IT STAYS. The landing may still be hydrating when its
    // heading reads right, and hydration drops a node React did not render —
    // measured: one run in two lost the span before its screenshot. So the
    // line is (re)added and drawn until a screenshot of it succeeds.
    await expect(async () => {
      await page.evaluate(
        ({ text, lang }) => {
          if (document.querySelector('span[data-han]')) return
          const span = document.createElement('span')
          span.dataset['han'] = ''
          span.lang = lang
          span.textContent = text
          span.style.fontSize = '64px'
          span.style.display = 'inline-block'
          span.style.padding = '8px'
          document.querySelector('h1')!.after(span)
        },
        { text: HAN, lang: LOCALE_BCP47[locale] },
      )
      await settleFonts(page)
      glyphs[locale] = await page
        .locator('span[data-han]')
        .screenshot({ timeout: 2_000 })
    }).toPass({ timeout: 30_000 })

    const requested = byPage
      .filter(({ doc }) => doc === `/${locale}`)
      .map(({ path }) => path)
    const fetched = await fetchedFamilies(page, requested)
    expect(fetched, `/${locale} fetched its own face`).toContain(
      DEFAULT_FAMILY[locale],
    )
    const siblings = siblingFamilies(locale)
    expect([...fetched].filter((f) => siblings.includes(f))).toEqual([])
    await beat(page, 1400)
  }
  // The same four characters, drawn in their regional forms.
  expect(glyphs.zh!.equals(glyphs.ja!)).toBe(false)

  /*
   * ⚠️ NOT ON THE DEFAULT FACE. /zh and /zh-tw both draw in LXGW WenKai TC
   * with nothing picked, so their default-face screenshots are one face's
   * forms twice and could not tell Simplified from Traditional. The SANS of
   * each set is named explicitly instead — Noto Sans SC and Noto Sans TC draw
   * 直 and 骨 differently — on /zh-tw, where every face is declared.
   */
  await expect(page).toHaveURL(`${SITE_ORIGIN}/ko`)
  await choose(page, 'zh-tw')
  const sans = {
    'zh-TW': {
      family: 'Noto Sans TC',
      variable: '--font-set-zh-Hant-sans-noto-sans-tc',
    },
    zh: {
      family: 'Noto Sans SC',
      variable: '--font-set-zh-Hans-sans-noto-sans-sc',
    },
  } as const
  const regional: Record<string, Buffer> = {}
  for (const [lang, { family, variable }] of Object.entries(sans)) {
    const selector = `span[data-han-sans="${lang}"]`
    await expect(async () => {
      await page.evaluate(
        ({ text, lang, variable }) => {
          if (document.querySelector(`span[data-han-sans="${lang}"]`)) return
          const span = document.createElement('span')
          span.dataset['hanSans'] = lang
          span.lang = lang
          span.textContent = text
          span.style.fontFamily = `var(${variable})`
          span.style.fontSize = '64px'
          span.style.display = 'inline-block'
          span.style.padding = '8px'
          document.querySelector('h1')!.after(span)
        },
        { text: HAN, lang, variable },
      )
      await settleFonts(page)
      regional[lang] = await page
        .locator(selector)
        .screenshot({ timeout: 2_000 })
    }).toPass({ timeout: 30_000 })
    expect(
      typeface(
        firstFamily(
          await page
            .locator(selector)
            .evaluate((el) => getComputedStyle(el).fontFamily),
        ),
      ),
      `the ${lang} span's first family`,
    ).toBe(family)
    await beat(page, 900)
  }
  expect(regional['zh-TW']!.equals(regional.zh!)).toBe(false)
  expect(regional['zh-TW']!.equals(glyphs.ja!)).toBe(false)
  expect(regional['zh-TW']!.equals(glyphs.ko!)).toBe(false)

  // ── 10 · A SHARED GERMAN LINK STAYS GERMAN ──────────────────────────────
  chapter('A shared German link stays German')
  await freshVisitor(page, 'en-US,en')
  const german = await page.goto('/de')
  expect(german?.status()).toBe(200)
  expect(german?.request().redirectedFrom()).toBeNull()
  await expect(page).toHaveURL(`${SITE_ORIGIN}/de`)
  await expect(html(page)).toHaveAttribute('lang', 'de')
  await expect(lede(page)).toContainText(t('de', 'landing.hero.lede'))
  await beat(page, 1400)

  // ── 11 · CRAWL DATA ON THE JAPANESE AND zh-tw LANDINGS ──────────────────
  chapter('Crawl data on the Japanese and Traditional Chinese landings')
  const head = await (await page.request.get('/ja', { maxRedirects: 0 })).text()
  expect(head).toMatch(/<html[^>]*\slang="ja"/)
  expect(head).toMatch(/<meta property="og:locale" content="ja_JP"/)
  const canonicals = [
    ...head.matchAll(/<link rel="canonical" href="([^"]+)"/g),
  ].map((m) => new URL(m[1]!).pathname)
  expect(canonicals).toEqual(['/ja'])
  const alternates = Object.fromEntries(
    [
      ...head.matchAll(
        /<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/gi,
      ),
    ].map((m) => [m[1]!, m[2]!]),
  )
  expect(Object.keys(alternates).sort()).toEqual([...TAGS, 'x-default'].sort())
  expect(new URL(alternates['zh-TW']!).pathname).toBe('/zh-tw')
  expect(new URL(alternates['zh']!).pathname).toBe('/zh')
  expect(new URL(alternates['x-default']!).pathname).toBe('/')
  expect(alternates['x-default']).toBe(alternates['en'])
  // The Traditional landing's head: its tag, its OG locale, its own canonical,
  // and the same twelve alternates.
  const twHead = await (
    await page.request.get('/zh-tw', { maxRedirects: 0 })
  ).text()
  expect(twHead).toMatch(/<html[^>]*\slang="zh-TW"/)
  expect(twHead).toMatch(/<meta property="og:locale" content="zh_TW"/)
  expect(
    [...twHead.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map(
      (m) => new URL(m[1]!).pathname,
    ),
  ).toEqual(['/zh-tw'])
  expect(
    [
      ...twHead.matchAll(
        /<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/gi,
      ),
    ]
      .map((m) => m[1]!)
      .sort(),
  ).toEqual([...TAGS, 'x-default'].sort())
  // The receipt on screen, so the recording carries what was parsed.
  await page.setContent(
    `<main style="font:16px/1.6 system-ui;padding:32px"><h1>/ja — head</h1><ul>${[
      'lang="ja"',
      'og:locale ja_JP',
      `canonical ${canonicals[0]}`,
      ...Object.entries(alternates).map(([l, href]) => `${l} → ${href}`),
    ]
      .map((line) => `<li>${line.replace(/</g, '&lt;')}</li>`)
      .join('')}</ul></main>`,
  )
  await beat(page, 2400)

  // ── 12 · NO CJK FONT ON THE ENGLISH LANDING ─────────────────────────────
  chapter('No CJK font on the English landing')
  await freshVisitor(page, 'en')
  const english = watchFontRequests(page)
  await page.goto('/')
  await expect(html(page)).toHaveAttribute('lang', 'en')
  await expect(page.locator('#language-menu')).toHaveCount(0)
  await settleFonts(page)
  const fetched = await fetchedFamilies(page, english)
  expect(
    fetched.size,
    'the English landing loaded its own faces',
  ).toBeGreaterThan(0)
  expect([...fetched].filter((f) => CJK_FAMILIES.includes(f))).toEqual([])
  await beat(page, 1600)
})
