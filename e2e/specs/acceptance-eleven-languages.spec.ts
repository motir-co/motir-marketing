import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { LOCALE_BCP47, type Locale } from '../../i18n/routing'
import { CUSTOM_ORIGIN, SITE_ORIGIN } from '../stub/origin'
import { catalogue, leaves, t } from '../support/catalogue'
import {
  CJK_FAMILIES,
  DEFAULT_FAMILY,
  fetchedFamilies,
  settleFonts,
  siblingFamilies,
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
 * Every `beat()` is pacing, NOT a wait for state: each assertion waits on a
 * response, a URL, a rendered attribute or the font set settling.
 */

// Sixteen journeys at a watchable pace: set here so the other specs keep the
// lane's tighter budget, as the sibling acceptance specs do.
test.setTimeout(420_000)

/** Pacing for the recording. NOT a wait for state — see the header. */
const beat = (page: Page, ms = 900) => page.waitForTimeout(ms)

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

/** The switcher's entries, in the order and the scripts the bar lists them. */
const ENDONYMS = [
  'English',
  '简体中文',
  '繁體中文',
  '日本語',
  '한국어',
  'Deutsch',
  'Français',
  'Español',
  'Italiano',
  'Nederlands',
  'Polski',
  'Português',
]
const ORDER = [
  'en',
  'zh',
  'zh-tw',
  'ja',
  'ko',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pl',
  'pt',
]
const TAGS = [
  'en',
  'zh',
  'zh-TW',
  'ja',
  'ko',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pl',
  'pt',
]

/** The four characters whose drawn form differs between the Han regions. */
const HAN = '直 化 骨 誤'

const html = (page: Page) => page.locator('html')
/** The landing's lede — the line that proves the language, now that the
 *  headline, "Vibe the project", is English in every catalogue. */
const lede = (page: Page) => page.locator('[data-hero-lede]')

/** Open the globe and choose a language by its URL code; the entry and the
 *  page are found by its tag. Waits on the page. */
async function choose(page: Page, locale: Locale) {
  const tag = LOCALE_BCP47[locale]
  await page.locator('button[aria-controls="language-menu"]').click()
  await beat(page, 600)
  await page.locator(`#language-menu a[lang="${tag}"]`).click()
  await expect(html(page)).toHaveAttribute('lang', tag)
}

/** A visit from a browser asking for `language`, with no cookie. */
async function freshVisitor(page: Page, language: string) {
  await page.context().clearCookies()
  await browserLanguage(page, language)
}

/** Every request the page makes from here on asks for `language`. */
async function browserLanguage(page: Page, language: string) {
  await page.unroute('**/*')
  await page.route('**/*', (route) =>
    route.continue({
      headers: { ...route.request().headers(), 'accept-language': language },
    }),
  )
}

/*
 * A raw key path is a dotted run whose first segment is one of the catalogue's
 * own namespaces. The card's pattern alone also matches a hostname the pages
 * print as text (`app.motir.co`), which is not a key, so a match counts only
 * when it starts with a namespace `en.json` has.
 */
const RAW_KEY = /\b[a-z]+(\.[a-zA-Z]+){2,}\b/g
const NAMESPACES = new Set(
  Object.keys(catalogue('en') as Record<string, unknown>),
)

/** Case 4's two checks over one page's text. */
async function noKeyNoEnglish(page: Page, path: string, english = true) {
  const text = await page.evaluate(() => document.body.innerText)
  const rawKeys = [...text.matchAll(RAW_KEY)]
    .map((m) => m[0])
    .filter((m) => NAMESPACES.has(m.split('.')[0]!))
  expect(rawKeys, `${path} renders a raw key`).toEqual([])
  if (!english) {
    console.log(`${path}: raw keys checked; documentation prose not checked`)
    return
  }

  const french = leaves('fr')
  let checked = 0
  let skipped = 0
  const left: string[] = []
  for (const [key, value] of leaves('en')) {
    if (value.length < 25) continue
    if (french.get(key) === value) {
      skipped += 1
      continue
    }
    checked += 1
    if (text.includes(value)) left.push(key)
  }
  console.log(
    `${path}: ${checked} en.json leaves checked, ${skipped} skipped (same in fr.json)`,
  )
  expect(left, `${path} still shows English`).toEqual([])
}

/** The first family of an element's computed stack, unquoted. */
const firstFamily = (stack: string) =>
  stack.split(',')[0]!.replace(/["']/g, '').trim()

test('twelve languages on motir.co, as Stories MOTIR-7737 and MOTIR-8937 ask to be accepted', async ({
  page,
  context,
}) => {
  // ── 1 · A JAPANESE FIRST VISIT ──────────────────────────────────────────
  chapter('A Japanese browser’s first visit')
  await freshVisitor(page, 'ja-JP,ja;q=0.9')
  await page.goto('/')
  await expect(page).toHaveURL(`${SITE_ORIGIN}/ja`)
  await expect(html(page)).toHaveAttribute('lang', 'ja')
  await expect(lede(page)).toContainText(t('ja', 'landing.hero.lede'))
  await expect(page.locator('body')).toContainText('Motir')
  await beat(page, 1600)

  // ── 1a · A TAIWAN FIRST VISIT (MOTIR-8937) ──────────────────────────────
  chapter('A Taiwan browser’s first visit')
  await freshVisitor(page, 'zh-TW,zh;q=0.9')
  await page.goto('/')
  await expect(page).toHaveURL(`${SITE_ORIGIN}/zh-tw`)
  await expect(html(page)).toHaveAttribute('lang', 'zh-TW')
  await expect(lede(page)).toContainText(t('zh-tw', 'landing.hero.lede'))
  await expect(page.locator('body')).toContainText('Motir')
  await beat(page, 1600)

  // ── 1b · EVERY TRADITIONAL BROWSER, AND ONLY THOSE ──────────────────────
  chapter('Hong Kong, Macau and zh-Hant browsers land on /zh-tw; zh-CN on /zh')
  for (const [language, locale] of [
    ['zh-HK', 'zh-tw'],
    ['zh-Hant-TW', 'zh-tw'],
    ['zh-MO', 'zh-tw'],
    ['zh-CN', 'zh'],
    ['zh-Hans', 'zh'],
  ] as const) {
    await freshVisitor(page, language)
    await page.goto('/')
    await expect(page, language).toHaveURL(`${SITE_ORIGIN}/${locale}`)
    await expect(html(page)).toHaveAttribute('lang', LOCALE_BCP47[locale])
    await beat(page, 700)
  }

  // ── 1c · THE TAG SPELLING IN A URL IS MOVED, NOT LOST ───────────────────
  chapter('/zh-TW/… answers 308 to the lower-case address')
  await freshVisitor(page, 'en')
  const spelled = await page.request.get('/zh-TW/docs/mcp?x=1', {
    maxRedirects: 0,
  })
  expect(spelled.status()).toBe(308)
  const moved = new URL(spelled.headers()['location']!, SITE_ORIGIN)
  expect(`${moved.pathname}${moved.search}`).toBe('/zh-tw/docs/mcp?x=1')
  const landed = await page.goto('/zh-TW/docs/mcp?x=1')
  expect(landed?.status()).toBe(200)
  await expect(page).toHaveURL(`${SITE_ORIGIN}/zh-tw/docs/mcp?x=1`)
  await expect(html(page)).toHaveAttribute('lang', 'zh-TW')
  await beat(page, 1400)

  // ── 2 · SWEDISH FALLS BACK TO ENGLISH ───────────────────────────────────
  chapter('Swedish falls back to English')
  await freshVisitor(page, 'sv-SE,sv')
  await page.goto('/')
  await expect(page).toHaveURL(`${SITE_ORIGIN}/`)
  await expect(html(page)).toHaveAttribute('lang', 'en')
  await expect(lede(page)).toContainText(t('en', 'landing.hero.lede'))
  await beat(page, 1400)

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
  const prerendered = Object.keys(
    (
      JSON.parse(
        readFileSync(
          join(process.cwd(), '.next', 'prerender-manifest.json'),
          'utf8',
        ),
      ) as { routes: Record<string, unknown> }
    ).routes,
  )
  /** Every page of the walk in one language, each checked as case 4 asks. */
  const walkSite = async (locale: Locale) => {
    // Every product address the build prerendered in this language — the
    // build's own record of `products/*` and `products/[slug]`'s static params.
    const products = prerendered
      .filter((path) => path.startsWith(`/${locale}/products/`))
      .sort()
    expect(products.length).toBeGreaterThan(5)
    const walk = [
      ...products,
      `/${locale}/how-it-works`,
      `/${locale}/motir-builds-itself`,
      `/${locale}/design`,
      `/${locale}/ideas`,
      `/${locale}/explore`,
      `/${locale}/explore/topic/developer-tools`,
    ]
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
  await expect(pairings).toHaveCount(6)
  const faces = new Set<string>()
  for (let index = 0; index < 6; index += 1) {
    await pairings.nth(index).click()
    await expect(pairings.nth(index)).toHaveAttribute('aria-checked', 'true')
    faces.add(await drawnInALoadedFace())
    await beat(page, 700)
  }
  // The pairings are not one face under six names.
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

  // ── 7 · A FRENCH PUBLIC PROJECT ON A TENANT HOST ────────────────────────
  // A customer domain since MOTIR-9512: a workspace host serves no project.
  chapter('A French public project on a customer domain')
  await freshVisitor(page, 'fr')
  const project = await page.goto(`${CUSTOM_ORIGIN}/`)
  expect(project?.status()).toBe(200)
  expect(project?.request().redirectedFrom()).toBeNull()
  await expect(page).toHaveURL(`${CUSTOM_ORIGIN}/`)
  await expect(html(page)).toHaveAttribute('lang', 'fr')
  const tabs = page.getByRole('navigation', {
    name: t('fr', 'publicProject.header.navAria'),
  })
  await expect(
    tabs.getByRole('link', { name: t('fr', 'publicProject.tabs.overview') }),
  ).toBeVisible()
  await expect(
    tabs.getByRole('link', { name: t('fr', 'publicProject.tabs.changelog') }),
  ).toBeVisible()
  // The project's own words are data, and stay exactly as the owner wrote them.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Acme Roadmap' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'What Motir is' }),
  ).toBeVisible()
  await beat(page, 1600)

  // ── 8 · THE CHOICE BEATS THE BROWSER ────────────────────────────────────
  chapter('The remembered choice beats a German browser')
  await browserLanguage(page, 'de-DE,de')
  // Case 7 cleared the cookie, so French is chosen again from a German page.
  await page.goto('/')
  await expect(html(page)).toHaveAttribute('lang', 'de')
  await choose(page, 'fr')
  await beat(page, 800)
  const back = await page.goto('/')
  const hop = back?.request().redirectedFrom()
  expect(hop, 'the bare address was not moved').toBeTruthy()
  expect((await hop!.response())?.status()).toBe(307)
  await expect(page).toHaveURL(`${SITE_ORIGIN}/fr`)
  await expect(lede(page)).toContainText(t('fr', 'landing.hero.lede'))
  await beat(page, 1400)

  // ── 8a · CHOOSING 繁體中文 REMEMBERS THE URL CODE ────────────────────────
  chapter('Choosing 繁體中文 is remembered as zh-tw, over a German browser')
  await choose(page, 'zh-tw')
  await expect(page).toHaveURL(`${SITE_ORIGIN}/zh-tw`)
  const rememberedTw = await context.cookies(SITE_ORIGIN)
  expect(rememberedTw.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe(
    'zh-tw',
  )
  const backTw = await page.goto('/')
  const hopTw = backTw?.request().redirectedFrom()
  expect(hopTw, 'the bare address was not moved').toBeTruthy()
  expect((await hopTw!.response())?.status()).toBe(307)
  await expect(page).toHaveURL(`${SITE_ORIGIN}/zh-tw`)
  await beat(page, 1400)

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
      firstFamily(
        await page
          .locator(selector)
          .evaluate((el) => getComputedStyle(el).fontFamily),
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
