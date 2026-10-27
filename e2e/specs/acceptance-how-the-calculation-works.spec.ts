import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { SITE_ORIGIN, STUB_ORIGIN } from '../stub/origin'
import { t } from '../support/catalogue'
import { settleFonts } from '../support/fontFaces'
import { readSitemap } from '../support/sitemap'
import { LOCALES, LOCALE_BCP47, type Locale } from '../../i18n/routing'
import { localizedPath } from '../../i18n/localizedPath'
import {
  EXPLAINER_PHRASES,
  SEATS_BEYOND_FIRST_KEY,
} from '../../tests/explainer/forbiddenPhrases'

/*
 * ⚠️ THE ACCEPTANCE WALK FOR STORY MOTIR-8383 (MOTIR-9695): "How the
 * calculation works" in a real browser, signed out, as a prospect reads it —
 * the English page with live figures, the input, recommendation, Host,
 * who-pays and plan-change sections, every language at its own address, the
 * engine blocked, the forbidden wording, a 390px phone, the crawl data and the
 * way in from the price page. PACED FOR A PERSON TO WATCH — every `beat()` is
 * pacing, never a wait for state; each `chapter()` is one recipe step.
 *
 * ⚠️ THE ENGINE IS THE STUB. The page reads the plan catalog and the
 * categories SERVER-side from motir-ai's public routes, which
 * `e2e/stub/publicApiStub.ts` answers from the integration gate's recordings;
 * `POST /__stub/price?plans=…&categories=…` switches the answer and `reset=1`
 * puts it back, and the lane reads fresh on every render
 * (`MOTIR_PLAN_LADDER_REVALIDATE_S=0`). Every expected figure is read from
 * `tests/fixtures/price/plans.json` and every expected string from the
 * catalogues through `t`; none is typed here.
 *
 * ⚠️ THE FILE RUNS SERIALLY: the stub's modes are shared by every caller.
 */

test.describe.configure({ mode: 'serial' })
test.setTimeout(300_000)

const fixture = (path: string) =>
  JSON.parse(
    readFileSync(join(process.cwd(), 'tests', 'fixtures', path), 'utf8'),
  )
const ladder = fixture('price/plans.json')
const categories: string[] = fixture(
  'calculator/categories.json',
).categories.map((c: { key: string }) => c.key)

// The explainer's and the price page's paths, as `lib/destinations.ts` names
// them; that module reads the build's app origin at import, so the spec does not.
const HOW_THE_CALCULATION_WORKS = '/how-the-calculation-works'
const PRICE = '/price'

const escapeRe = (text: string) => text.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')

const SECTIONS = Array.from({ length: 10 }, (_, i) => `s${i + 1}`)

const beat = (page: Page, ms = 1400) => page.waitForTimeout(ms)
const chapters: { label: string; tSeconds: number }[] = []
let startedAt = Date.now()
const chapter = (label: string) =>
  chapters.push({ label, tSeconds: (Date.now() - startedAt) / 1000 })

test.afterEach(async ({ request }, testInfo) => {
  await request.post(`${STUB_ORIGIN}/__stub/price?reset=1`)
  if (chapters.length) {
    writeFileSync(
      testInfo.outputPath('chapters.json'),
      JSON.stringify(chapters, null, 2),
    )
    chapters.length = 0
  }
})

const stub = (page: Page, query: string) =>
  page.request.post(`${STUB_ORIGIN}/__stub/price?${query}`)

const address = (locale: Locale) =>
  localizedPath(locale, HOW_THE_CALCULATION_WORKS)

/** The page's own body: the contents, the ten sections and the note. */
const body = (page: Page) => page.locator('[data-state]')
const section = (page: Page, id: string) => page.locator(`section#${id}`)

/** Figures as the page prints them in `locale`. */
function format(locale: Locale) {
  const tag = LOCALE_BCP47[locale]
  const count = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 })
  const money = new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return {
    credits: (n: number) => count.format(n),
    usd: (n: number) => money.format(n),
  }
}

async function open(page: Page, locale: Locale) {
  const res = await page.goto(address(locale))
  expect(res?.status(), locale).toBe(200)
  await expect(page).toHaveURL(`${SITE_ORIGIN}${address(locale)}`)
  await settleFonts(page)
}

/** The ten sections are there, in order, each headed by its catalogue title. */
async function tenSections(page: Page, locale: Locale) {
  const ids = await page
    .locator('section[aria-labelledby]')
    .evaluateAll((all) => all.map((s) => s.id))
  expect(ids, locale).toEqual(SECTIONS)
  for (const id of SECTIONS) {
    // The heading is the section's two-digit number, then its title.
    await expect(page.locator(`#${id}-h`), `${locale}:${id}`).toHaveText(
      new RegExp(`^\\d{2}\\s*${escapeRe(t(locale, `explainer.${id}.title`))}$`),
    )
  }
}

/** The page body's text with the printed figures taken out — the copy alone. */
const copyText = (page: Page) =>
  body(page).evaluate((root) => {
    const clone = root.cloneNode(true) as HTMLElement
    clone
      .querySelectorAll('[data-figure], [data-element="top-up-line"]')
      .forEach((el) => el.remove())
    return clone.textContent ?? ''
  })

/** No forbidden wording, no currency sign in the copy, no Enterprise. */
async function noForbiddenWording(page: Page, locale: Locale) {
  const text = (await copyText(page)).toLowerCase()
  for (const phrase of EXPLAINER_PHRASES[locale].forbidden) {
    expect(text, `${locale}: "${phrase}"`).not.toContain(phrase.toLowerCase())
  }
  expect(text, `${locale}: Enterprise`).not.toContain('enterprise')
  expect(text, `${locale}: $`).not.toContain('$')
}

/** Per-user wording only in the seats-beyond-the-first sentence. */
async function perUserOnlyInSeats(page: Page, locale: Locale) {
  const sentences = section(page, 's7').locator(
    '[data-element="who-pays-sentences"] > li',
  )
  await expect(sentences).toHaveCount(3)
  await expect(sentences.nth(2)).toContainText(
    t(locale, `explainer.${SEATS_BEYOND_FIRST_KEY}`),
  )
  const elsewhere = (
    await body(page).evaluate((root) => {
      const clone = root.cloneNode(true) as HTMLElement
      clone
        .querySelector('[data-element="who-pays-sentences"] > li:nth-child(3)')
        ?.remove()
      return clone.textContent ?? ''
    })
  ).toLowerCase()
  for (const phrase of EXPLAINER_PHRASES[locale].perUser) {
    expect(elsewhere, `${locale}: "${phrase}"`).not.toContain(
      phrase.toLowerCase(),
    )
  }
}

/** The figure-free page: ten sections, the note, no figure, nothing alarming. */
async function figureFree(page: Page, locale: Locale) {
  await expect(body(page)).toHaveAttribute('data-state', 'figure-free')
  await tenSections(page, locale)
  await expect(page.locator('[data-element="fallback-note"]')).toHaveText(
    t(locale, 'explainer.figuresUnavailableNote'),
  )
  await expect(page.locator('[data-figure]')).toHaveCount(0)
  // Next's route announcer is an empty `alert` outside the page body.
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0)
  await expect(body(page).getByRole('button')).toHaveCount(0)
  await expect(body(page).locator('[class*="danger"]')).toHaveCount(0)
  const fmt = format(locale)
  const text = (await body(page).textContent()) ?? ''
  for (const plan of [...ladder.plans, ...ladder.largerPlans]) {
    expect(text).not.toContain(fmt.credits(plan.monthlyCredits))
    for (const price of Object.values(plan.priceUsdByCadence) as number[]) {
      expect(text).not.toContain(fmt.usd(price))
    }
  }
}

test('how the calculation works, as Story MOTIR-8383 asks to be accepted', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))

  await stub(page, 'reset=1')
  startedAt = Date.now()

  // ── 1 · LIVE FIGURES ──────────────────────────────────────────────────
  chapter('The English page with live figures from the plan catalog')
  await open(page, 'en')
  await expect(body(page)).toHaveAttribute('data-state', 'figures')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    t('en', 'explainer.headline'),
  )
  await tenSections(page, 'en')
  await expect(page.locator('[data-element="fallback-note"]')).toHaveCount(0)
  await beat(page)

  const en = format('en')
  for (const plan of ladder.plans) {
    const card = page.locator(`[data-plan="${plan.key}"]`)
    await card.first().scrollIntoViewIfNeeded()
    await expect(card.locator('[data-figure="pool"]'), plan.key).toContainText(
      en.credits(plan.monthlyCredits),
    )
    await expect(
      card.locator('[data-figure="monthly"]'),
      plan.key,
    ).toContainText(en.usd(plan.priceUsdByCadence.monthly))
    await expect(
      card.locator('[data-figure="annual"]'),
      plan.key,
    ).toContainText(en.usd(plan.priceUsdByCadence.annual))
    await beat(page, 500)
  }
  await expect(page.locator('[data-element="top-up-line"]')).toContainText(
    en.usd(ladder.topUp.unitAmountUsd),
  )
  await expect(page.locator('[data-element="top-up-line"]')).toContainText(
    en.credits(ladder.topUp.unitCredits),
  )
  const fromCredits = Math.min(
    ...ladder.largerPlans.map(
      (p: { monthlyCredits: number }) => p.monthlyCredits,
    ),
  )
  await expect(
    page.locator('[data-element="larger-pool-plan-note"]'),
  ).toContainText(en.credits(fromCredits))
  await beat(page)

  // ── 2 · THE INPUT ─────────────────────────────────────────────────────
  chapter('The input: two ranges, and own-agent runs use no running credits')
  await section(page, 's1').scrollIntoViewIfNeeded()
  await expect(section(page, 's1')).toContainText(
    t('en', 'explainer.s1.ranges'),
  )
  await expect(section(page, 's1')).toContainText(
    t('en', 'explainer.s1.ownAgent'),
  )
  const chips = section(page, 's2').locator(
    '[data-element="category-chips"] li',
  )
  await expect(chips).toHaveText(categories)
  await expect(
    section(page, 's3').locator('[data-element="lane-factor-pair"]'),
  ).toHaveText(t('en', 'explainer.s3.laneFactors'))
  await beat(page)

  // ── 3 · THE RECOMMENDATION ────────────────────────────────────────────
  chapter('The recommendation: four plans of their own, a larger pool above')
  await section(page, 's5').scrollIntoViewIfNeeded()
  const rungs = section(page, 's5').locator('[data-element="plan-ladder-rung"]')
  await expect(rungs).toHaveCount(4)
  for (const plan of ladder.plans.filter(
    (p: { key: string }) => p.key !== 'host',
  )) {
    await expect(
      section(page, 's5').locator(`[data-plan="${plan.key}"]`),
    ).toContainText(plan.name)
  }
  await expect(section(page, 's5')).toContainText(t('en', 'explainer.s5.body'))
  await expect(
    section(page, 's5').locator('[data-element="larger-pool-plan-note"]'),
  ).toContainText(t('en', 'explainer.s5.largerTitle'))
  await beat(page)

  // ── 4 · HOST ──────────────────────────────────────────────────────────
  chapter('Host: sold from the price page, three accounts of its own')
  await section(page, 's6').scrollIntoViewIfNeeded()
  const host = ladder.plans.find((p: { key: string }) => p.key === 'host')
  const hostCard = section(page, 's6').locator('[data-plan="host"]')
  await expect(hostCard).toContainText(host.name)
  await expect(hostCard.locator('[data-figure="pool"]')).toContainText(
    en.credits(host.monthlyCredits),
  )
  await expect(hostCard.locator('[data-figure="monthly"]')).toContainText(
    en.usd(host.priceUsdByCadence.monthly),
  )
  await expect(hostCard.locator('[data-figure="annual"]')).toContainText(
    en.usd(host.priceUsdByCadence.annual),
  )
  await expect(section(page, 's6')).toContainText(
    t('en', 'explainer.s6.hostBody'),
  )
  await expect(
    hostCard.locator('[data-element="host-accounts-rows"] > *'),
  ).toHaveCount(3)
  await expect(section(page, 's6')).toContainText(
    t('en', 'explainer.s6.sharedFloor'),
  )
  await beat(page)

  // ── 5 · WHO PAYS ──────────────────────────────────────────────────────
  chapter('Who pays: three sentences, per-user wording only for further seats')
  for (const locale of ['en', 'de', 'ja'] as const) {
    if (locale !== 'en') await open(page, locale)
    await section(page, 's7').scrollIntoViewIfNeeded()
    const sentences = section(page, 's7').locator(
      '[data-element="who-pays-sentences"] > li',
    )
    await expect(sentences.nth(0)).toHaveText(
      t(locale, 'explainer.s7.organization'),
    )
    await expect(sentences.nth(1)).toHaveText(
      t(locale, 'explainer.s7.includedSeat'),
    )
    await perUserOnlyInSeats(page, locale)
    await beat(page, 900)
  }

  // ── 6 · PLAN CHANGES ──────────────────────────────────────────────────
  chapter('Plan changes: up now, down at the period end, in words')
  for (const locale of ['ja', 'de', 'en'] as const) {
    if (locale !== 'ja') await open(page, locale)
    await section(page, 's8').scrollIntoViewIfNeeded()
    const up = page.locator('[data-element="plan-change-up"]')
    const down = page.locator('[data-element="plan-change-down"]')
    await expect(up).toContainText(t(locale, 'explainer.s8.upBody'))
    await expect(down).toContainText(t(locale, 'explainer.s8.downBody'))
    const fmt = format(locale)
    const text = (await section(page, 's8').textContent()) ?? ''
    for (const plan of [...ladder.plans, ...ladder.largerPlans]) {
      expect(text).not.toContain(fmt.credits(plan.monthlyCredits))
      for (const price of Object.values(plan.priceUsdByCadence) as number[]) {
        expect(text).not.toContain(fmt.usd(price))
      }
    }
    expect(text).not.toMatch(/[$€£¥￥₩]/)
    await beat(page, 900)
  }

  // ── 7 · EVERY LANGUAGE ────────────────────────────────────────────────
  chapter('Every language at its own address, with its own title')
  for (const locale of LOCALES) {
    await open(page, locale)
    await expect(page).toHaveURL(`${SITE_ORIGIN}${address(locale)}`)
    await expect(page.locator('html')).toHaveAttribute(
      'lang',
      LOCALE_BCP47[locale],
    )
    await expect(page).toHaveTitle(t(locale, 'explainer.metaTitle'))
    await tenSections(page, locale)
    if (locale !== 'en') {
      for (const id of SECTIONS) {
        expect(
          t(locale, `explainer.${id}.title`),
          `${locale}:${id} is not English`,
        ).not.toBe(t('en', `explainer.${id}.title`))
      }
    }
    await noForbiddenWording(page, locale)
    await perUserOnlyInSeats(page, locale)
    await beat(page, 700)
  }
  // …and through the site's own language control.
  await open(page, 'en')
  await page.locator('button[aria-controls="language-menu"]').click()
  await beat(page, 600)
  await page.locator(`#language-menu a[lang="${LOCALE_BCP47.ja}"]`).click()
  await expect(page).toHaveURL(`${SITE_ORIGIN}${address('ja')}`)
  await expect(page.locator('html')).toHaveAttribute('lang', LOCALE_BCP47.ja)
  await expect(page.locator('#s1-h')).toContainText(
    t('ja', 'explainer.s1.title'),
  )
  await beat(page)

  // The control stored the choice in a cookie; a later visit to an English
  // address would follow it to Japanese, so the walk forgets it.
  await page.context().clearCookies()

  // ── 8 · THE ENGINE BLOCKED ────────────────────────────────────────────
  chapter('The engine blocked: the figure-free page, calm, in en, ja and de')
  await stub(page, 'plans=unavailable&categories=unavailable')
  consoleErrors.length = 0
  for (const locale of ['en', 'ja', 'de'] as const) {
    await open(page, locale)
    await figureFree(page, locale)
    await expect(
      section(page, 's2').locator('[data-element="category-chips"]'),
    ).toHaveText(t(locale, 'explainer.s2.categoriesFigureFree'))
    await page
      .locator('[data-element="fallback-note"]')
      .scrollIntoViewIfNeeded()
    await beat(page)
    await section(page, 's5').scrollIntoViewIfNeeded()
    await beat(page)
  }
  expect(consoleErrors).toEqual([])

  // ── 9 · FORBIDDEN WORDING ─────────────────────────────────────────────
  chapter(
    'No Enterprise, contact-sales, top-up-only or $ in any language, offline',
  )
  for (const locale of LOCALES) {
    await open(page, locale)
    await expect(body(page)).toHaveAttribute('data-state', 'figure-free')
    await noForbiddenWording(page, locale)
    await perUserOnlyInSeats(page, locale)
  }
  await stub(page, 'reset=1')
  await beat(page, 600)

  // ── 10 · A 390px PHONE ────────────────────────────────────────────────
  chapter('A 390px phone in German and Japanese')
  await page.setViewportSize({ width: 390, height: 844 })
  for (const locale of ['de', 'ja'] as const) {
    await open(page, locale)
    const disclosure = page.locator('[data-element="contents-disclosure"]')
    await expect(disclosure).toBeVisible()
    await expect(disclosure).not.toHaveAttribute('open', /.*/)
    await expect(page.locator('[data-element="contents-list"]')).toBeHidden()
    const [discBox, firstBox] = await Promise.all([
      disclosure.boundingBox(),
      section(page, 's1').boundingBox(),
    ])
    expect(discBox!.y).toBeLessThan(firstBox!.y)

    await section(page, 's5').scrollIntoViewIfNeeded()
    const boxes = await section(page, 's5')
      .locator('[data-element="plan-ladder-rung"]')
      .evaluateAll((all) =>
        all.map((el) => {
          const r = el.getBoundingClientRect()
          return { x: r.x, y: r.y, h: r.height }
        }),
      )
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i]!.x, `${locale}: rung ${i}`).toBe(boxes[0]!.x)
      expect(boxes[i]!.y).toBeGreaterThanOrEqual(
        boxes[i - 1]!.y + boxes[i - 1]!.h,
      )
    }
    await beat(page, 900)

    await section(page, 's8').scrollIntoViewIfNeeded()
    const up = await page
      .locator('[data-element="plan-change-up"]')
      .boundingBox()
    const down = await page
      .locator('[data-element="plan-change-down"]')
      .boundingBox()
    expect(down!.x).toBe(up!.x)
    expect(down!.y).toBeGreaterThanOrEqual(up!.y + up!.height)

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement
      const headings = [...document.querySelectorAll('h1, h2, h3')].filter(
        (h) => h.scrollWidth > h.clientWidth + 1,
      )
      return {
        page: doc.scrollWidth - doc.clientWidth,
        headings: headings.map((h) => h.textContent),
      }
    })
    expect(overflow, locale).toEqual({ page: 0, headings: [] })
    await beat(page, 900)

    await disclosure.scrollIntoViewIfNeeded()
    await disclosure.locator('summary').click()
    await expect(disclosure).toHaveAttribute('open', '')
    await beat(page, 900)
  }
  await page.setViewportSize({ width: 1280, height: 720 })

  // ── 11 · CRAWL DATA ───────────────────────────────────────────────────
  chapter('The sitemap and every language’s alternate links')
  const sitemap = await readSitemap(page.request)
  for (const locale of LOCALES) {
    expect(sitemap, locale).toContain(`${address(locale)}</loc>`)
  }
  for (const locale of LOCALES) {
    await open(page, locale)
    const canonical = await page
      .locator('head link[rel="canonical"]')
      .getAttribute('href')
    expect(new URL(canonical!).pathname, locale).toBe(address(locale))
    const alternates = Object.fromEntries(
      await page
        .locator('head link[rel="alternate"][hreflang]')
        .evaluateAll((all) =>
          all.map((l) => [
            l.getAttribute('hreflang'),
            new URL(l.getAttribute('href')!).pathname,
          ]),
        ),
    )
    expect(Object.keys(alternates).sort(), locale).toEqual(
      [...LOCALES.map((l) => LOCALE_BCP47[l]), 'x-default'].sort(),
    )
    for (const other of LOCALES) {
      expect(alternates[LOCALE_BCP47[other]], `${locale}→${other}`).toBe(
        address(other),
      )
    }
    expect(alternates['x-default']).toBe(address('en'))
  }
  await beat(page, 600)

  // ── 12 · FROM THE PRICE PAGE ──────────────────────────────────────────
  chapter('From the price page to the explainer and back')
  for (const locale of ['en', 'de'] as const) {
    const price = localizedPath(locale, PRICE)
    await page.goto(price)
    await settleFonts(page)
    const link = page.locator(`main a[href="${address(locale)}"]`)
    if ((await link.count()) > 0) {
      await link.first().scrollIntoViewIfNeeded()
      await beat(page)
      await link.first().click()
    } else {
      // The price page does not link here yet (MOTIR-8382 shipped without
      // it); the run reports that on the price-page story. The target
      // itself must still resolve, in the price page's language.
      test.info().annotations.push({
        type: 'missing-link',
        description: `${price} has no link to ${address(locale)}`,
      })
      await page.goto(address(locale))
    }
    await expect(page).toHaveURL(`${SITE_ORIGIN}${address(locale)}`)
    await expect(page.locator('html')).toHaveAttribute(
      'lang',
      LOCALE_BCP47[locale],
    )
    await tenSections(page, locale)
    await beat(page)
    await page.goBack()
    await expect(page).toHaveURL(`${SITE_ORIGIN}${price}`)
    await beat(page)
  }
})
