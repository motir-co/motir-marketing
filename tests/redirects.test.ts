// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/routing'
import {
  ENGLISH_PREFIX_RULES,
  productDocsRules,
  redirectRules,
  redirectsFile,
} from '@/lib/redirects'
import {
  PLACEHOLDER_PRODUCTS,
  PRODUCT_DOCS,
  PRODUCT_SLUGS,
  WRITTEN_PRODUCTS,
} from '@/lib/productAddresses'

/*
 * THE REDIRECTS THE BUILT SITE ANSWERS WITH NO WORKER (MOTIR-10643 ·
 * MOTIR-10644). Workers static assets answer `dist/_redirects` before any
 * file; the build writes it from `lib/redirects.ts`. `wrangler dev` over the
 * built output is the end-to-end check (How to test); this holds the rules.
 */

const DOCS_SLUGS = PRODUCT_SLUGS.filter((slug) => PRODUCT_DOCS[slug])

describe('the product slugs whose page is their documentation', () => {
  it('forward to the same locale’s docs page, in every locale, with a 308', () => {
    const rules = productDocsRules()
    expect(rules).toHaveLength(LOCALES.length * DOCS_SLUGS.length)
    expect(rules).toContainEqual({
      from: '/products/mcp',
      to: '/docs/mcp',
      status: 308,
    })
    expect(rules).toContainEqual({
      from: '/fr/products/sandbox',
      to: '/fr/docs/sandbox',
      status: 308,
    })
    for (const locale of LOCALES) {
      const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`
      for (const slug of DOCS_SLUGS) {
        expect(rules).toContainEqual({
          from: `${prefix}/products/${slug}`,
          to: `${prefix}${PRODUCT_DOCS[slug]}`,
          status: 308,
        })
      }
    }
  })

  it('are never built as a page, and every other product is', () => {
    for (const slug of DOCS_SLUGS) {
      expect(PLACEHOLDER_PRODUCTS).not.toContain(slug)
      expect(WRITTEN_PRODUCTS).not.toContain(slug)
    }
    expect(PLACEHOLDER_PRODUCTS).toEqual(['project-manager'])
    expect(
      [...WRITTEN_PRODUCTS, ...PLACEHOLDER_PRODUCTS, ...DOCS_SLUGS].sort(),
    ).toEqual([...PRODUCT_SLUGS].sort())
  })
})

describe('the /en rules', () => {
  it('send the prefixed English spelling to the unprefixed one', () => {
    expect(ENGLISH_PREFIX_RULES).toEqual([
      { from: '/en', to: '/', status: 308 },
      { from: '/en/*', to: '/:splat', status: 308 },
    ])
  })
})

describe('the _redirects file', () => {
  it('lists every rule, one per line, the /en rules first', () => {
    const lines = redirectsFile().trimEnd().split('\n')
    expect(lines[0]).toMatch(/^# .*lib\/redirects\.ts/)
    expect(lines.slice(1)).toEqual(
      redirectRules().map((r) => `${r.from} ${r.to} ${r.status}`),
    )
    expect(lines[1]).toBe('/en / 308')
    expect(lines[2]).toBe('/en/* /:splat 308')
    expect(lines).toContain('/de/products/cli /de/docs/cli 308')
  })

  it('stays inside the Workers static-redirect limit', () => {
    // Workers static assets take 2,000 static rules and 100 dynamic ones.
    const rules = redirectRules()
    expect(rules.filter((r) => /[*:]/.test(r.from)).length).toBeLessThan(100)
    expect(rules.length).toBeLessThan(2000)
  })

  it('writes the rules it is given', () => {
    expect(redirectsFile([{ from: '/a', to: '/b', status: 308 }])).toBe(
      '# Written by the build from lib/redirects.ts. Edit that, not this.\n/a /b 308\n',
    )
  })
})
