import { describe, expect, it } from 'vitest'
import { LOCALES, type Locale } from '@/i18n/routing'
import { englishCopy, getCopy } from '@/lib/copy'
import {
  EXPLAINER_PHRASES,
  PER_USER_KEYS,
  SEATS_BEYOND_FIRST_KEY,
  explainerValues,
  placeholders,
} from './forbiddenPhrases'

/*
 * THE EXPLAINER'S WORDING GUARD (MOTIR-9693), over every locale in `LOCALES`
 * and the catalogue as the visitor gets it (`getCopy`, English filled in for a
 * missing key). A locale added later is covered with no edit here, and one with
 * no phrase list fails — it cannot pass by having nothing to look for.
 *
 * Numbers: a translated value may carry 0–3 (zero runs, one included seat,
 * Host's three accounts, the range's 1× and 2×) and the split's 50/50 and
 * 33/33/33 in its own key. Anything else is a figure that should have been a
 * placeholder.
 */

const CURRENCY = /[$€£¥￥₩]|\bUSD\b|\bEUR\b/
const ENTERPRISE = /enterprise/i
const SPLIT_KEY = 's2.split'
const SPLIT_SHARES = new Set(['33', '50'])

const english = explainerValues(englishCopy.explainer)

async function valuesOf(locale: Locale) {
  return explainerValues((await getCopy(locale)).explainer)
}

/** The numerals a value carries outside its `{placeholders}`. */
const numerals = (value: string) =>
  value.replace(/\{\w+\}/g, '').match(/\d+(?:[.,]\d+)*/g) ?? []

/** Pure: the wording problems of one locale's values. */
export function wordingProblems(
  locale: Locale,
  values: Map<string, string>,
): string[] {
  const problems: string[] = []
  const phrases = EXPLAINER_PHRASES[locale]
  for (const [key, value] of values) {
    const lower = value.toLowerCase()
    if (CURRENCY.test(value)) problems.push(`${key}: currency sign`)
    if (ENTERPRISE.test(value)) problems.push(`${key}: Enterprise`)
    for (const phrase of phrases.forbidden) {
      if (lower.includes(phrase.toLowerCase())) {
        problems.push(`${key}: "${phrase}"`)
      }
    }
    for (const n of numerals(value)) {
      const ok =
        ['0', '1', '2', '3'].includes(n) ||
        (key === SPLIT_KEY && SPLIT_SHARES.has(n))
      if (!ok) problems.push(`${key}: figure ${n}`)
    }
  }
  return problems
}

/** Pure: the keys whose value carries the locale's per-user or per-seat wording. */
export function perUserKeys(
  locale: Locale,
  values: Map<string, string>,
): string[] {
  const phrases = EXPLAINER_PHRASES[locale].perUser.map((p) => p.toLowerCase())
  return [...values]
    .filter(([, value]) =>
      phrases.some((phrase) => value.toLowerCase().includes(phrase)),
    )
    .map(([key]) => key)
}

describe('the explainer wording guard', () => {
  it('has a phrase list for every locale in LOCALES', () => {
    for (const locale of LOCALES) {
      const phrases = EXPLAINER_PHRASES[locale]
      expect(phrases, locale).toBeDefined()
      expect(phrases.forbidden.length, locale).toBeGreaterThan(0)
      expect(phrases.perUser.length, locale).toBeGreaterThan(0)
    }
  })

  it.each(LOCALES)(
    '%s carries no figure, currency, Enterprise or forbidden wording',
    async (locale) => {
      expect(wordingProblems(locale, await valuesOf(locale))).toEqual([])
    },
  )

  it.each(LOCALES)(
    '%s keeps per-user wording to the seats sentence',
    async (locale) => {
      const keys = perUserKeys(locale, await valuesOf(locale))
      expect(keys).toContain(SEATS_BEYOND_FIRST_KEY)
      for (const key of keys) expect(PER_USER_KEYS).toContain(key)
    },
  )

  it.each(LOCALES)(
    '%s keeps every placeholder of the English value',
    async (locale) => {
      const values = await valuesOf(locale)
      for (const [key, source] of english) {
        expect(placeholders(values.get(key) ?? ''), `${locale}:${key}`).toEqual(
          placeholders(source),
        )
      }
    },
  )

  it.each(LOCALES)(
    '%s gives every placeholder key a figure-free sibling',
    async (locale) => {
      const values = await valuesOf(locale)
      for (const [key, value] of values) {
        if (placeholders(value).length === 0) continue
        const group = key.slice(0, key.lastIndexOf('.'))
        const sibling = [`${key}FigureFree`, `${group}.figureFree`].find(
          (candidate) => (values.get(candidate) ?? '').length > 0,
        )
        expect(sibling, `${locale}:${key}`).toBeDefined()
        expect(placeholders(values.get(sibling!)!)).toEqual([])
      }
    },
  )

  describe('fires on what it guards', () => {
    const planted = (key: string, value: string) =>
      new Map([...english, [key, value]])

    it.each([
      ['a dollar figure', 's5.topUpFigureFree', 'A top-up costs $5.'],
      ['a typed pool', 's5.largerFromFigureFree', 'From 300000 credits.'],
      ['Enterprise', 's10.body', 'Ask about Enterprise.'],
      ['contact sales', 's10.body', 'Please contact sales.'],
      ['top-up only', 's5.body', 'Past Max ×2 the answer is top-up only.'],
    ])('%s', (_, key, value) => {
      expect(wordingProblems('en', planted(key, value))).not.toEqual([])
    })

    it('per-user wording in an AI-plan sentence', () => {
      expect(
        perUserKeys('en', planted('s7.organization', 'Priced per user.')),
      ).toContain('s7.organization')
    })
  })
})
