import type { Page } from '@playwright/test'

/*
 * WHICH FACE A FONT FILE BELONGS TO (MOTIR-7952, shared by MOTIR-7968).
 *
 * The build self-hosts each face under a hashed file name, so a request URL does
 * not name its family. The page's own `@font-face` rules do: each `src` url maps
 * to the `font-family` it declares. `fontSets.spec.ts` and the twelve-languages
 * acceptance walk both read requests through this.
 */

/**
 * A declared family as the typeface it names (MOTIR-10649). The Astro build
 * declares a variable face under Fontsource's name, `Noto Sans JP Variable`,
 * where `next/font` declared `Noto Sans JP`; the file is the same typeface, so
 * the specs compare typefaces and every assertion keeps its meaning — an
 * expectation that a face was NOT fetched would otherwise pass vacuously.
 */
export const typeface = (family: string): string =>
  family
    .replace(/["']/g, '')
    .trim()
    .replace(/ Variable$/, '')

/** Each CJK set's faces, by typeface. */
export const SET_FAMILIES = {
  zh: ['Noto Sans SC', 'Noto Serif SC', 'LXGW WenKai TC'],
  'zh-tw': ['Noto Sans TC', 'Noto Serif TC', 'LXGW WenKai TC'],
  ja: ['Noto Sans JP', 'M PLUS Rounded 1c', 'Noto Serif JP'],
  ko: ['Noto Sans KR', 'Nanum Gothic', 'Noto Serif KR'],
} as const

/** The face each language draws in with nothing picked (`lib/cjkFaces.ts`). */
export const DEFAULT_FAMILY = {
  zh: 'LXGW WenKai TC',
  'zh-tw': 'LXGW WenKai TC',
  ja: 'Noto Sans JP',
  ko: 'Noto Sans KR',
} as const

/** Every CJK family once: LXGW WenKai TC is a member of both Chinese sets. */
export const CJK_FAMILIES: readonly string[] = [
  ...new Set<string>(Object.values(SET_FAMILIES).flat()),
]

/**
 * The families of every OTHER set, less this locale's own. The two Chinese
 * sets share LXGW WenKai TC (MOTIR-8937), so a family that is also this
 * locale's own is no sibling's: without the subtraction /zh would count its
 * own default face as a leak from zh-tw's set, and /zh-tw likewise.
 */
export function siblingFamilies(locale: keyof typeof SET_FAMILIES): string[] {
  const own: readonly string[] = SET_FAMILIES[locale]
  return CJK_FAMILIES.filter((family) => !own.includes(family))
}

/** Record every font file the page requests, as a same-origin pathname. */
export function watchFontRequests(page: Page): string[] {
  const requested: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (/\.woff2$/.test(url.pathname)) requested.push(url.pathname)
  })
  return requested
}

/** `@font-face` src pathname → family, read from the page's own stylesheets. */
export async function fontFaceFamilies(
  page: Page,
): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const map: Record<string, string> = {}
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList
      try {
        rules = sheet.cssRules
      } catch {
        continue
      }
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSFontFaceRule)) continue
        const family = rule.style
          .getPropertyValue('font-family')
          .replace(/["']/g, '')
          .trim()
        const src = rule.style.getPropertyValue('src')
        // ⚠️ AGAINST THE STYLESHEET, NOT THE PAGE. A Turbopack build writes
        // `url(../media/….woff2)`, relative to the CSS file; resolved against
        // the page it names a path nothing fetched. Webpack (what `pnpm build`
        // runs) writes absolute urls, which resolve the same either way.
        const base = sheet.href ?? location.href
        for (const [, href] of src.matchAll(/url\("?([^")]+)"?\)/g)) {
          map[new URL(href!, base).pathname] = family
        }
      }
    }
    return map
  })
}

/** The families of every font file the page fetched. */
export async function fetchedFamilies(
  page: Page,
  requested: string[],
): Promise<Set<string>> {
  const families = await fontFaceFamilies(page)
  return new Set(
    requested
      .map((path) => families[path])
      .filter((f) => f !== undefined)
      .map(typeface),
  )
}

/** Let the browser lay out what was just added and settle every font load. */
export async function settleFonts(page: Page): Promise<void> {
  // A layout, then the font set settling: every load the new text triggered
  // has started by the frame after it rendered, and `ready` waits for them all.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            void document.fonts.ready.then(() => resolve())
          }),
        ),
      ),
  )
}
