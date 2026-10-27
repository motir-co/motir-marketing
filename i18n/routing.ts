import { defineRouting } from 'next-intl/routing'

/**
 * THE LOCALE LIST (Story MOTIR-7737 · MOTIR-7948) — the ONE place motir.co's
 * languages are named. Every sibling card imports {@link LOCALES} and
 * {@link Locale} from here rather than spelling the twelve again.
 *
 * ── `as-needed` ──────────────────────────────────────────────────────────
 *
 * English keeps every address it has today, unprefixed; the other eleven sit
 * under `/<locale>/…`. So no published link, crawler entry or test URL moves,
 * and `/en/…` is a redirect to the unprefixed spelling rather than a second
 * address for the same page.
 *
 * ── ⚠️ DETECTION AND THE COOKIE ARE OFF HERE, AND THAT IS A SCOPE LINE ───
 *
 * `localeDetection: false` and `localeCookie: false`, and they stay off: the
 * proxy does its own detection (`lib/localeDetection.ts`, MOTIR-7951), and the
 * header's switcher writes the remembered-choice cookie itself
 * (`lib/languageSwitch.ts`, MOTIR-7953). next-intl's middleware never runs on
 * a tenant host, so neither could be its job.
 */
export const LOCALES = [
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
] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  localeDetection: false,
  localeCookie: false,
})

/**
 * The OpenGraph `og:locale` for each locale — a language_TERRITORY pair, which
 * is the form the protocol defines. The territory is the market each catalogue
 * is written for: Simplified Chinese is `zh_CN`, Traditional Chinese is
 * Taiwan's (`zh_TW`), Portuguese is Brazil's.
 */
export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  'zh-tw': 'zh_TW',
  ja: 'ja_JP',
  ko: 'ko_KR',
  de: 'de_DE',
  fr: 'fr_FR',
  es: 'es_ES',
  it: 'it_IT',
  nl: 'nl_NL',
  pl: 'pl_PL',
  pt: 'pt_BR',
}

/**
 * Each language's name in its own script (MOTIR-7953) — what the header's
 * language switcher lists. NOT catalogue strings: 日本語 reads 日本語 on every
 * page, so these live once, beside the locale list, rather than in twelve
 * catalogues. With two Chinese scripts listed, `zh` is named 简体中文 and
 * `zh-tw` 繁體中文 (MOTIR-9249): a bare 中文 would name both. `Record<Locale, …>` makes the list total over the locales at
 * compile time.
 */
export const LOCALE_ENDONYMS: Record<Locale, string> = {
  en: 'English',
  zh: '简体中文',
  'zh-tw': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  pt: 'Português',
}

/**
 * THE HEADER'S GIVE-WAY LADDER, per locale (MOTIR-7947 revision 2 · MOTIR-7953).
 * The narrowest viewport, in px, at which each rung of the bar fits:
 *
 *   a — brand · nav · Copy setup prompt · Sign in · Start free · globe
 *   b — Copy setup prompt has left; below `b` the nav and Sign in fold into
 *       the Menu panel (brand · Start free · globe · Menu)
 *
 * Every language runs a different length, so the widths are MEASURED per
 * locale rather than set by shared breakpoints, which overflowed the English
 * bar between 768px and ~1100px. Each is the bar's own width in that locale's
 * catalogue, with the nav labels on one line, plus 16px to spare (re-measured
 * 2026-10-18, when "How Motir works" and "How to use" joined the nav, and
 * 2026-10-27, when "Price" did — MOTIR-8382). Change a nav label and
 * measure again: a bar narrower than its width wraps its labels.
 *
 * `app/_components/headerLadder.ts` turns these into the static class strings
 * Tailwind can see, and `tests/headerLadder.test.ts` holds the two together.
 */
export const HEADER_LADDER: Record<Locale, { a: number; b: number }> = {
  en: { a: 1541, b: 1324 },
  zh: { a: 1428, b: 1247 },
  // Measured with the zh-tw catalogue on 2026-10-27; it matches zh's to the pixel.
  'zh-tw': { a: 1428, b: 1247 },
  ja: { a: 1643, b: 1342 },
  ko: { a: 1420, b: 1226 },
  de: { a: 1721, b: 1428 },
  fr: { a: 1799, b: 1477 },
  es: { a: 1761, b: 1454 },
  it: { a: 1677, b: 1361 },
  nl: { a: 1637, b: 1370 },
  pl: { a: 1699, b: 1406 },
  pt: { a: 1721, b: 1418 },
}

/**
 * Each locale's BCP 47 language tag (MOTIR-9249) — what `<html lang>`, the
 * switcher's `lang` / `hrefLang`, JSON-LD's `inLanguage` and the `hreflang`
 * set carry. The URL code and the tag agree for every locale but `zh-tw`,
 * whose tag is `zh-TW`; URLs, the `NEXT_LOCALE` cookie, `localizedPath` and
 * `stripLocale` keep the URL code.
 */
export const LOCALE_BCP47: Record<Locale, string> = {
  en: 'en',
  zh: 'zh',
  'zh-tw': 'zh-TW',
  ja: 'ja',
  ko: 'ko',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  pt: 'pt',
}
