import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  LOCALES,
  OG_LOCALE,
} from '@/i18n/routing'
import { enterLocale } from '@/i18n/locale'

/*
 * THE LOCALE ROUTING (MOTIR-7948) — the shared list and its tables.
 *
 * What the site host does with a path is the Worker's now (MOTIR-10758):
 * `tests/worker/router.test.ts` measures the case and prefix redirects, the
 * bare-`/` language and the assets fallthrough, and
 * `e2e/specs/worker-edge-rules.spec.ts` drives them through `wrangler dev`.
 * The Next-router cases went with that router (MOTIR-10639). The locale layout's cases went with
 * `app/[locale]/layout.tsx`: each locale's pages are built by Astro, and
 * `tests/i18n/localeMetadataLive.test.ts` measures their og:locale and cards.
 */

describe('the locale list', () => {
  it('is the twelve, English first, and English is the default', () => {
    expect(LOCALES).toEqual([
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
    ])
    expect(DEFAULT_LOCALE).toBe('en')
  })

  it('keeps English unprefixed in the build, every other locale prefixed', () => {
    // `as-needed`, spelled for Astro: no published English URL moves.
    const config = readFileSync('astro.config.mjs', 'utf8')
    expect(config).toMatch(/prefixDefaultLocale:\s*false/)
    expect(config).toMatch(/defaultLocale:\s*DEFAULT_LOCALE/)
  })

  it('names an og:locale for every locale, language_TERRITORY', () => {
    // The pattern is derived from the code: `fr` → `fr_XX`, and a hyphenated
    // code names its own territory, `zh-tw` → `zh_TW` (MOTIR-9241).
    const ogLocalePattern = (code: string) => {
      const [language, region] = code.split('-')
      return new RegExp(
        `^${language}_${region ? region.toUpperCase() : '[A-Z]{2}'}$`,
      )
    }
    for (const locale of LOCALES) {
      expect(OG_LOCALE[locale], locale).toMatch(ogLocalePattern(locale))
    }
    const cases: [code: string, og: string, ok: boolean][] = [
      ['zh-tw', 'zh_TW', true],
      ['zh-tw', 'zh-tw_TW', false],
      ['zh-tw', 'zh_tw', false],
      ['zh-tw', 'zh_HK', false],
      ['fr', 'fr_FR', true],
    ]
    for (const [code, og, ok] of cases)
      expect(ogLocalePattern(code).test(og), `${code} → ${og}`).toBe(ok)
  })
})

describe('the BCP 47 tag of each locale (MOTIR-9249)', () => {
  it('is total over the locales, zh-TW for zh-tw and the code itself elsewhere', () => {
    expect(Object.keys(LOCALE_BCP47).sort()).toEqual([...LOCALES].sort())
    expect(LOCALE_BCP47['zh-tw']).toBe('zh-TW')
    for (const locale of LOCALES.filter((l) => l !== 'zh-tw'))
      expect(LOCALE_BCP47[locale], locale).toBe(locale)
  })
})

describe('enterLocale', () => {
  it('returns the page’s locale, and English for anything else', async () => {
    expect(await enterLocale(Promise.resolve({ locale: 'de' }))).toBe('de')
    expect(await enterLocale(Promise.resolve({ locale: 'xx' }))).toBe('en')
  })
})
