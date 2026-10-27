import { describe, expect, it } from 'vitest'
import { LOCALES } from '@/i18n/routing'
import { englishCopy, getCopy } from '@/lib/copy'
import { flattenCatalogue } from '@/scripts/i18n/sourceRecord'

/*
 * The wording guard over the price page's copy in all twelve catalogues
 * (MOTIR-8382 · MOTIR-9686). Parity of the key set is `catalogueParity`'s; this
 * holds what a loose translation could quietly change.
 */

const KEPT = ['Motir', 'MCP', 'CLI', 'AWS', 'Stripe']

const priceStrings = (copy: unknown) =>
  Object.entries(
    flattenCatalogue({ pricePage: (copy as typeof englishCopy).pricePage }),
  ) as [string, string][]

const placeholders = (s: string) =>
  [...s.matchAll(/\{(\w+)[,}]/g)].map((m) => m[1]).sort()

describe.each(LOCALES)('the price copy in %s', (locale) => {
  it('keeps every placeholder, the untranslated terms, and states no figure the English does not', async () => {
    const copy = await getCopy(locale)
    const english = new Map(priceStrings(englishCopy))
    for (const [key, text] of priceStrings(copy)) {
      const source = english.get(key)!
      expect(placeholders(text), key).toEqual(placeholders(source))
      for (const term of KEPT) {
        if (new RegExp(`\\b${term}\\b`).test(source)) {
          expect(text, `${key} keeps ${term}`).toContain(term)
        }
      }
      // A digit the English does not carry would be a retyped amount or pool.
      const digits = (s: string) =>
        (s.replace(/\{[^}]*\}/g, '').match(/\d+/g) ?? []).sort()
      expect(digits(text), key).toEqual(digits(source))
    }
  })

  it('names no Enterprise tier and no sales contact', async () => {
    const copy = await getCopy(locale)
    for (const [key, text] of priceStrings(copy)) {
      expect(text, key).not.toMatch(
        /enterprise|entreprise|empresa|unternehmen|企业|企業|엔터프라이즈/i,
      )
      expect(text, key).not.toMatch(
        /sales|vertrieb|ventes|ventas|vendite|verkoop|sprzedaż|vendas/i,
      )
    }
  })

  it('carries the nav and footer Price entries', async () => {
    const copy = await getCopy(locale)
    expect(copy.nav.price.length).toBeGreaterThan(0)
    expect(copy.footer.price).toBe(copy.nav.price)
  })
})
