import { writeFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { LOCALE_BCP47, type Locale } from '../../i18n/routing'
import { SITE_ORIGIN } from '../stub/origin'
import { t } from '../support/catalogue'
import {
  beat,
  browserLanguage,
  choose,
  freshVisitor,
  html,
  lede,
  noKeyNoEnglish,
} from '../support/elevenLanguages'

/*
 * THE PER-REQUEST HALF OF `acceptance-eleven-languages.spec.ts` (MOTIR-10649).
 *
 * The twelve-language walk's journeys a static-only serve cannot answer, moved
 * here VERBATIM: the bare-`/` language detection (cases 1, 1a, 1b and 2), the
 * `/zh-TW/…` 308 (1c), the French public project at `/fr/p/ROAD` (7), the
 * remembered choice beating the browser on `/` (8, 8a), and the per-request
 * pages of case 4's walk (`/motir-builds-itself`, `/ideas`, `/explore`,
 * `/explore/topic/*`). The static cases still run in
 * `acceptance-eleven-languages.spec.ts`. This file is on
 * `playwright.config.ts`'s `testIgnore` list; the Worker-routes story
 * re-includes it by deleting that one entry.
 */

test.setTimeout(420_000)

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

test('twelve languages on motir.co, per request, as Stories MOTIR-7737 and MOTIR-8937 ask to be accepted', async ({
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

  // ── 4 · THE PER-REQUEST PAGES OF THE FRENCH AND TRADITIONAL WALKS ───────
  chapter(
    'The per-request pages of the walk, in French and Traditional Chinese',
  )
  /** Case 4's checks over the walk's per-request pages in one language. */
  const walkSite = async (locale: Locale) => {
    const walk = [
      `/${locale}/motir-builds-itself`,
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
  await walkSite('zh-tw')

  // ── 7 · A FRENCH PUBLIC PROJECT AT ITS motir.co ADDRESS ─────────────────
  // A workspace host serves no project since MOTIR-9512, and a customer domain
  // serves none since MOTIR-9528: a project is read at motir.co/p/<identifier>.
  chapter('A French public project at its motir.co address')
  await freshVisitor(page, 'fr')
  const project = await page.goto(`${SITE_ORIGIN}/fr/p/ROAD`)
  expect(project?.status()).toBe(200)
  expect(project?.request().redirectedFrom()).toBeNull()
  await expect(page).toHaveURL(`${SITE_ORIGIN}/fr/p/ROAD`)
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
})
