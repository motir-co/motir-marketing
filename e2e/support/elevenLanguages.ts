import { expect, type Page } from '@playwright/test'
import { LOCALE_BCP47, type Locale } from '../../i18n/routing'
import { catalogue, leaves } from './catalogue'

/*
 * THE TWELVE-LANGUAGE WALK'S HELPERS (MOTIR-7968), shared since MOTIR-10649 by
 * `e2e/specs/acceptance-eleven-languages.spec.ts` (the static pages) and
 * `e2e/specs/acceptance-eleven-languages-live.spec.ts` (the per-request
 * journeys). Moved here unchanged; the spec headers say what each walks.
 */

/** Pacing for the recording. NOT a wait for state — see the specs' header. */
export const beat = (page: Page, ms = 900) => page.waitForTimeout(ms)

/** The switcher's entries, in the order and the scripts the bar lists them. */
export const ENDONYMS = [
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
export const ORDER = [
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
export const TAGS = [
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
export const HAN = '直 化 骨 誤'

export const html = (page: Page) => page.locator('html')
/** The landing's lede — the line that proves the language, now that the
 *  headline, "Vibe the project", is English in every catalogue. */
export const lede = (page: Page) => page.locator('[data-hero-lede]')

/** Open the globe and choose a language by its URL code; the entry and the
 *  page are found by its tag. Waits on the page. */
export async function choose(page: Page, locale: Locale) {
  const tag = LOCALE_BCP47[locale]
  await page.locator('button[aria-controls="language-menu"]').click()
  await beat(page, 600)
  await page.locator(`#language-menu a[lang="${tag}"]`).click()
  await expect(html(page)).toHaveAttribute('lang', tag)
}

/** A visit from a browser asking for `language`, with no cookie. */
export async function freshVisitor(page: Page, language: string) {
  await page.context().clearCookies()
  await browserLanguage(page, language)
}

/** Every request the page makes from here on asks for `language`. */
export async function browserLanguage(page: Page, language: string) {
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
export const RAW_KEY = /\b[a-z]+(\.[a-zA-Z]+){2,}\b/g
export const NAMESPACES = new Set(
  Object.keys(catalogue('en') as Record<string, unknown>),
)

/** Case 4's two checks over one page's text. */
export async function noKeyNoEnglish(page: Page, path: string, english = true) {
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
export const firstFamily = (stack: string) =>
  stack.split(',')[0]!.replace(/["']/g, '').trim()
