import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/routing'

/*
 * WHICH LANGUAGE A FIRST VISIT GETS (MOTIR-7951) — one pure, Next-free choice
 * the proxy makes on both of its branches: the remembered-choice cookie, then
 * the best `Accept-Language` match, then English.
 *
 * ⚠️ ONE RULE FOR BOTH SITES. The matcher RESTATES motir-core's
 * `lib/i18n/acceptLanguage.ts` (MOTIR-7743) rather than importing it — the two
 * live in separate repositories — so a browser that reads app.motir.co in
 * German reads motir.co in German too. A change to the rule is made in both.
 * The Worker's router runs this matcher on the bare `/` (`worker/router.ts`);
 * no library's own detection is involved.
 */

/**
 * The remembered-choice cookie — app.motir.co's name for it, so one choice can
 * later travel across both sites. The switcher writes it; the proxy reads it.
 */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

interface WeightedRange {
  tag: string
  q: number
  order: number
}

/**
 * The header's ranges, best first: q order, header order on ties. `q=0` means
 * "not this one" and `*` says nothing about WHICH language, so both are
 * dropped, and so is a tag that is not a language tag at all.
 */
function parse(header: string): WeightedRange[] {
  const ranges: WeightedRange[] = []
  header.split(',').forEach((part, order) => {
    const [rawTag, ...params] = part.trim().split(';')
    const tag = rawTag?.trim().toLowerCase() ?? ''
    if (!tag || tag === '*' || !/^[a-z]{1,8}(-[a-z0-9]{1,8})*$/.test(tag)) {
      return
    }
    let q = 1
    for (const param of params) {
      const [name, value] = param.trim().split('=')
      if (name?.trim().toLowerCase() !== 'q') continue
      const parsed = Number(value?.trim())
      q = Number.isFinite(parsed) ? parsed : 0
    }
    if (q <= 0) return
    ranges.push({ tag, q, order })
  })
  return ranges.sort((a, b) => b.q - a.q || a.order - b.order)
}

/** Ranges a Traditional-Chinese reader sends: Taiwan, Hong Kong, Macau, or the Hant script. */
function isTraditionalChinese(tag: string): boolean {
  return (
    tag === 'zh-tw' ||
    tag === 'zh-hk' ||
    tag === 'zh-mo' ||
    tag === 'zh-hant' ||
    tag.startsWith('zh-hant-')
  )
}

/**
 * The best match among the twelve, or `null`. For each range in turn an exact
 * match wins; then the Traditional-Chinese rule (MOTIR-9250, core's
 * MOTIR-9240): `zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant` and any `zh-Hant-*` read
 * as `zh-tw` when the locale set holds it; then a BASE-language match:
 * `de-AT` reads as `de`, `pt-BR` and `pt-PT` as `pt`, and `zh-CN`, `zh-SG`
 * and any `zh-Hans-*` (even `zh-Hans-TW`, which names the script) as `zh`.
 */
export function matchAcceptLanguage(
  header: string | null | undefined,
): Locale | null {
  if (!header) return null
  for (const { tag } of parse(header)) {
    const exact = LOCALES.find((locale) => locale === tag)
    if (exact) return exact
    if (isTraditionalChinese(tag)) {
      const traditional = LOCALES.find((locale) => locale === 'zh-tw')
      if (traditional) return traditional
    }
    const base = tag.split('-')[0]
    const byBase = LOCALES.find((locale) => locale === base)
    if (byBase) return byBase
  }
  return null
}

function isLocale(value: string | null | undefined): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? '')
}

/**
 * The visitor's language. A cookie that is not one of the twelve — edited by
 * hand, or a code since retired — is SKIPPED, so the browser's own preference
 * still gets its say; it is never read as English.
 */
export function chooseLocale({
  cookie,
  acceptLanguage,
}: {
  cookie: string | null | undefined
  acceptLanguage: string | null | undefined
}): Locale {
  if (isLocale(cookie)) return cookie
  return matchAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE
}
