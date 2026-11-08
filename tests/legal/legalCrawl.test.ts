import { beforeAll, describe, expect, it } from 'vitest'
import { siteSitemapEntries } from '@/lib/siteSitemap'
import type { SitemapEntry } from '@/lib/sitemapXml'
import { generateMetadata as generateDocumentMetadata } from '@/app/[locale]/legal/[slug]/LegalDocumentRoute'
import { generateMetadata as generateIndexMetadata } from '@/app/[locale]/legal/LegalIndexRoute'
import { format, getCopy } from '@/lib/copy'
import { getLegalDocument, legalDocumentSlugs } from '@/lib/legal/documents'
import {
  englishOnlyAlternates,
  englishOnlyCanonical,
  languageAlternates,
} from '@/lib/localeMetadata'
import { siteUrl } from '@/lib/siteOrigin'
import { DEFAULT_LOCALE, LOCALES, OG_LOCALE } from '@/i18n/routing'
import { localizedPath } from '@/i18n/localizedPath'

/*
 * MOTIR-8086 — a legal document's crawl data points at the English document.
 *
 * Its body, title, version and effective date are the same English in all
 * twelve language versions; only the chrome is translated. So every language
 * version, English included, is canonical to the unprefixed English address and
 * carries NO `hreflang` set, and the sitemap lists each document ONCE at that
 * address. The `/legal` INDEX is not an exception (its chrome is translated):
 * it keeps its own per-language canonical, thirteen alternates and twelve entries.
 *
 * Driven over the real `legalDocumentSlugs()` and `LOCALES`, never a fixture
 * list, so a document added to `content/legal/` is covered by existing.
 */

async function documentMetadata(locale: string, slug: string) {
  return generateDocumentMetadata({
    params: Promise.resolve({ locale, slug }),
  })
}

async function indexMetadata(locale: string) {
  return generateIndexMetadata({ params: Promise.resolve({ locale }) })
}

const SLUGS = legalDocumentSlugs()

describe('the population is real', () => {
  it('covers twelve locales and every document on disk', () => {
    expect(LOCALES).toHaveLength(12)
    expect(SLUGS.length).toBeGreaterThanOrEqual(7)
  })
})

describe('a legal document page head (every slug × every locale)', () => {
  const cases = SLUGS.flatMap((slug) =>
    LOCALES.map((locale) => [slug, locale] as const),
  )

  it.each(cases)(
    '/legal/%s under %s is canonical to the English document, with no hreflang',
    async (slug, locale) => {
      const meta = await documentMetadata(locale, slug)
      expect(meta.alternates?.canonical).toBe(siteUrl(`/legal/${slug}`))
      expect(meta.alternates?.canonical).toBe(
        englishOnlyCanonical(`/legal/${slug}`),
      )
      expect(meta.alternates).not.toHaveProperty('languages')
    },
  )

  it.each(cases)(
    '/legal/%s under %s keeps its own title, description and og:locale',
    async (slug, locale) => {
      const meta = await documentMetadata(locale, slug)
      const doc = getLegalDocument(slug)!
      const copy = await getCopy(locale as (typeof LOCALES)[number])
      expect(meta.title).toBe(doc.title)
      expect(meta.description).toBe(
        format(copy.legal.metaDocDescription, {
          title: doc.title,
          version: doc.version,
        }),
      )
      const og = meta.openGraph as {
        locale?: string
        alternateLocale?: string[]
        url?: string
      }
      expect(og.locale).toBe(OG_LOCALE[locale as (typeof LOCALES)[number]])
      expect(og.alternateLocale).toHaveLength(11)
      // The deliberate non-change: the share URL stays the page's own address.
      expect(og.url).toBe(
        siteUrl(
          localizedPath(locale as (typeof LOCALES)[number], `/legal/${slug}`),
        ),
      )
    },
  )

  it('an unknown slug still answers {}', async () => {
    expect(await documentMetadata('fr', 'does-not-exist')).toEqual({})
  })

  it('englishOnlyAlternates carries the canonical alone', () => {
    expect(englishOnlyAlternates('/legal/terms')).toEqual({
      canonical: siteUrl('/legal/terms'),
    })
    expect(englishOnlyCanonical('/legal/terms')).toBe(
      siteUrl(localizedPath(DEFAULT_LOCALE, '/legal/terms')),
    )
  })
})

describe('the /legal index head is unchanged', () => {
  it('under fr: its own language address and thirteen alternates', async () => {
    const meta = await indexMetadata('fr')
    expect(meta.alternates?.canonical).toBe(siteUrl('/fr/legal'))
    expect(Object.keys(meta.alternates?.languages ?? {})).toHaveLength(13)
    expect(meta.alternates?.languages).toEqual(languageAlternates('/legal'))
  })

  it('under en: the unprefixed address', async () => {
    const meta = await indexMetadata('en')
    expect(meta.alternates?.canonical).toBe(siteUrl('/legal'))
  })
})

describe('the sitemap', () => {
  let entries: SitemapEntry[]
  beforeAll(async () => {
    entries = siteSitemapEntries()
  })

  it.each(SLUGS)(
    'lists /legal/%s exactly once, at the English address, with no alternates',
    (slug) => {
      const matches = entries.filter((entry) =>
        entry.url.endsWith(`/legal/${slug}`),
      )
      expect(matches).toHaveLength(1)
      expect(matches[0]!.url).toBe(siteUrl(`/legal/${slug}`))
      expect(matches[0]!.alternates).toBeUndefined()
    },
  )

  it('lists no language-prefixed legal document', () => {
    const prefixed = new RegExp(
      `/(${LOCALES.filter((l) => l !== DEFAULT_LOCALE).join('|')})/legal/[^/]+$`,
    )
    expect(entries.filter((entry) => prefixed.test(entry.url))).toEqual([])
  })

  it('keeps the /legal index twelve times, each with thirteen alternates', () => {
    const index = entries.filter((entry) => /\/legal$/.test(entry.url))
    expect(index).toHaveLength(12)
    for (const entry of index) {
      expect(Object.keys(entry.alternates?.languages ?? {})).toHaveLength(13)
    }
  })

  it.each(SLUGS)(
    'agrees with the page head for /legal/%s — both spelled by englishOnlyCanonical',
    async (slug) => {
      const head = await documentMetadata('fr', slug)
      const entry = entries.find((e) => e.url.endsWith(`/legal/${slug}`))!
      const expected = englishOnlyCanonical(`/legal/${slug}`)
      expect(head.alternates?.canonical).toBe(expected)
      expect(entry.url).toBe(expected)
    },
  )
})
