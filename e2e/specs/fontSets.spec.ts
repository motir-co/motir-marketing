import { expect, test, type Page } from '@playwright/test'
import { LOCALE_BCP47 } from '../../i18n/routing'
import { t } from '../support/catalogue'
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
 * EACH LOCALE FETCHES ONLY ITS OWN SCRIPT'S FACES (MOTIR-7952).
 *
 * `app/fonts.ts` declares every CJK face on every page, and the claim that
 * this costs an English page nothing is a claim about the BROWSER: a face's
 * `unicode-range` slice is fetched only when an element's `font-family` names
 * the family AND a rendered character falls in the slice, and the installed
 * `theme.css` names a CJK family only under that locale's `:lang()` block. A
 * source read cannot prove that, so this spec watches the network.
 *
 * ⚠️ THE PAGES CARRY NO CJK TEXT YET, SO THE SPEC SUPPLIES A PROBE LINE. Until
 * the catalogue cards land, `/ja` renders English words, and English words are
 * drawn by the pairing's Latin face in front of the set's — so an unprobed
 * `/ja` fetches nothing at all and would prove nothing. The probe mixes all
 * three scripts (the five Han characters MOTIR-7880 named, kana and hangul),
 * so a page that drew a sibling locale's face for any of them would fetch it
 * here. It is added under `<main>`, so it inherits the page's `lang` exactly
 * as real copy will.
 *
 * Every wait is on an authoritative signal — a FontFace reaching `loaded`, a
 * `document.fonts.ready` after a layout — never a timeout.
 */

const PROBE = '的 色 了 过 直 ひらがな カタカナ 한국어'

/** Add the probe line under `<main>` and let the browser lay it out. */
async function renderProbe(page: Page): Promise<void> {
  await page.evaluate((text) => {
    const probe = document.createElement('p')
    probe.dataset['fontProbe'] = ''
    probe.textContent = text
    document.querySelector('main')!.prepend(probe)
  }, PROBE)
  await settleFonts(page)
}

test('the English landing fetches no CJK file, even for CJK characters', async ({
  page,
}) => {
  const requested = watchFontRequests(page)
  await page.goto('/')
  await expect(page.getByRole('main')).toBeVisible()
  await renderProbe(page)

  const fetched = await fetchedFamilies(page, requested)
  expect([...fetched].filter((f) => CJK_FAMILIES.includes(f))).toEqual([])
})

for (const locale of ['zh', 'zh-tw', 'ja', 'ko'] as const) {
  test(`/${locale} fetches its own set's face and neither sibling's`, async ({
    page,
  }) => {
    const requested = watchFontRequests(page)
    await page.goto(`/${locale}`)
    // The page's tag, not its URL code: /zh-tw is `lang="zh-TW"`.
    await expect(page.locator('html')).toHaveAttribute(
      'lang',
      LOCALE_BCP47[locale],
    )
    await renderProbe(page)

    const own = DEFAULT_FAMILY[locale]
    // The positive signal first: the language's default face actually loaded.
    await expect
      .poll(async () =>
        (
          await page.evaluate(() =>
            Array.from(document.fonts)
              .filter((face) => face.status === 'loaded')
              .map((face) => face.family),
          )
        ).some((family) => typeface(family) === own),
      )
      .toBe(true)

    const fetched = await fetchedFamilies(page, requested)
    expect(fetched).toContain(own)
    // The two Chinese sets share LXGW WenKai TC, so a family that is also
    // this locale's own is no sibling's.
    const siblings = siblingFamilies(locale)
    expect([...fetched].filter((f) => siblings.includes(f))).toEqual([])
  })
}

test('/zh still fetches no Traditional sans or serif now the zh-tw set exists', async ({
  page,
}) => {
  const requested = watchFontRequests(page)
  await page.goto('/zh')
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh')
  await renderProbe(page)

  const fetched = await fetchedFamilies(page, requested)
  expect(fetched).toContain('LXGW WenKai TC')
  expect(fetched).not.toContain('Noto Sans TC')
  expect(fetched).not.toContain('Noto Serif TC')
})

test('/ja/design offers the three Japanese fonts by name, and each draws headings and body', async ({
  page,
}) => {
  await page.goto('/ja/design')
  const fonts = page
    // The group's name is the catalogue's, so it reads in Japanese here.
    .getByRole('radiogroup', { name: t('ja', 'designShowcase.type.name') })
    .getByRole('radio')
  // Japanese fonts named directly, in place of the six Latin pairings
  // (Yue, 2026-10-09).
  await expect(fonts).toHaveText([
    /Noto Sans JP/,
    /M PLUS Rounded 1c/,
    /Noto Serif JP/,
  ])

  const main = page.getByRole('main')
  const familyOf = (selector: string) =>
    main
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element).fontFamily)
  for (const [index, family] of [
    'Noto Sans JP',
    'M PLUS Rounded 1c',
    'Noto Serif JP',
  ].entries()) {
    const font = fonts.nth(index)
    await font.click()
    await expect(font).toHaveAttribute('aria-checked', 'true')
    // The pick is the script face of BOTH roles, so the heading and the body
    // are drawn in it alike.
    await expect.poll(() => familyOf('h1')).toContain(family)
    await expect.poll(() => familyOf('p')).toContain(family)
  }
})

test('/zh-tw/design offers the three Traditional fonts by name, and each draws headings and body', async ({
  page,
}) => {
  await page.goto('/zh-tw/design')
  const fonts = page
    .getByRole('radiogroup', { name: t('zh-tw', 'designShowcase.type.name') })
    .getByRole('radio')
  const families = ['Noto Sans TC', 'Noto Serif TC', 'LXGW WenKai TC']
  await expect(fonts).toHaveText(families.map((family) => new RegExp(family)))

  const main = page.getByRole('main')
  const familyOf = (selector: string) =>
    main
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element).fontFamily)
  for (const [index, family] of families.entries()) {
    const font = fonts.nth(index)
    await font.click()
    await expect(font).toHaveAttribute('aria-checked', 'true')
    await expect.poll(() => familyOf('h1')).toContain(family)
    await expect.poll(() => familyOf('p')).toContain(family)
  }
})

test('a Simplified pick on /zh is not carried to /zh-tw', async ({ page }) => {
  await page.goto('/zh/design')
  const fonts = page
    .getByRole('radiogroup', { name: t('zh', 'designShowcase.type.name') })
    .getByRole('radio')
  const serif = fonts.filter({ hasText: 'Noto Serif SC' })
  await serif.click()
  await expect(serif).toHaveAttribute('aria-checked', 'true')

  // Through the language menu in the same tab, where a stored pick would carry.
  await page.locator('button[aria-controls="language-menu"]').click()
  await page.locator('#language-menu a[lang="zh-TW"]').click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW')
  const first = await page
    .getByRole('heading', { level: 1 })
    .first()
    .evaluate((element) =>
      getComputedStyle(element).fontFamily.split(',')[0]!.replace(/["']/g, ''),
    )
  expect(typeface(first)).not.toBe('Noto Serif SC')
})

test('a Polish heading is drawn in the pairing face, as an English one is', async ({
  page,
}) => {
  const headingFamily = () =>
    page
      .getByRole('heading', { level: 1 })
      .first()
      .evaluate((element) => getComputedStyle(element).fontFamily)

  await page.goto('/')
  const english = await headingFamily()
  await page.goto('/pl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
  const polish = await headingFamily()

  expect(polish).toBe(english)
  for (const family of CJK_FAMILIES) expect(polish).not.toContain(family)
})
