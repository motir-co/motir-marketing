// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { siteMetadata } from '@/app/_components/siteMetadata'
import { LOCALES } from '@/i18n/routing'
import { getCopy } from '@/lib/copy'
import { englishOnlyAlternates, localeMetadata } from '@/lib/localeMetadata'
import {
  absoluteUrl,
  escapeHtml,
  headTags,
  resolveMetadata,
  type Metadata,
} from '@/lib/metadata'

/*
 * A PAGE'S HEAD WITHOUT NEXT (MOTIR-10643).
 *
 * `lib/metadata.ts` writes the tags Next wrote, in Next's order and spelling,
 * because the parity check (MOTIR-10648) holds every page's canonical,
 * hreflang set, `og:locale` and `<html lang>` to the Next build at `b9ff37a`.
 * The expectations below are that build's `de/price.html`, tag for tag.
 */

const BASE = new URL('https://motir.co')

describe('resolveMetadata', () => {
  it('lets a later layer replace an earlier key whole, as Next merged segments', () => {
    const merged = resolveMetadata(
      { title: 'Site', openGraph: { siteName: 'Motir', title: 'Site' } },
      undefined,
      { openGraph: { title: 'Page' }, description: undefined },
    )
    expect(merged).toEqual({
      title: 'Site',
      openGraph: { title: 'Page' },
      description: undefined,
    })
  })
})

describe('the spelling helpers', () => {
  it('escapes as React escaped an attribute', () => {
    expect(escapeHtml(`"Pläne" & <'x'>`)).toBe(
      '&quot;Pläne&quot; &amp; &lt;&#x27;x&#x27;&gt;',
    )
  })

  it('writes a bare origin without its slash, and resolves a relative URL', () => {
    expect(absoluteUrl('/', BASE)).toBe('https://motir.co')
    expect(absoluteUrl('/de/opengraph-image', BASE)).toBe(
      'https://motir.co/de/opengraph-image',
    )
    expect(absoluteUrl('https://motir.co/?q=1', undefined)).toBe(
      'https://motir.co/?q=1',
    )
  })
})

describe('the head a German page wears', () => {
  it('is the Next build’s, tag for tag and in order', async () => {
    const copy = await getCopy('de')
    const meta = resolveMetadata(
      siteMetadata('de', copy),
      localeMetadata({
        locale: 'de',
        copy,
        path: '/price',
        title: 'Motir AI – Pläne & Abonnement',
        description: undefined as unknown as string,
      }),
    )
    const alt = copy.meta.title
    expect(headTags(meta)).toEqual([
      '<title>Motir AI – Pläne &amp; Abonnement</title>',
      '<link rel="canonical" href="https://motir.co/de/price"/>',
      ...[
        ['en', '/price'],
        ['zh', '/zh/price'],
        ['zh-TW', '/zh-tw/price'],
        ['ja', '/ja/price'],
        ['ko', '/ko/price'],
        ['de', '/de/price'],
        ['fr', '/fr/price'],
        ['es', '/es/price'],
        ['it', '/it/price'],
        ['nl', '/nl/price'],
        ['pl', '/pl/price'],
        ['pt', '/pt/price'],
        ['x-default', '/price'],
      ].map(
        ([lang, path]) =>
          `<link rel="alternate" hrefLang="${lang}" href="https://motir.co${path}"/>`,
      ),
      '<meta property="og:title" content="Motir AI – Pläne &amp; Abonnement"/>',
      '<meta property="og:url" content="https://motir.co/de/price"/>',
      '<meta property="og:site_name" content="Motir"/>',
      '<meta property="og:locale" content="de_DE"/>',
      '<meta property="og:image" content="https://motir.co/de/opengraph-image"/>',
      '<meta property="og:image:type" content="image/png"/>',
      '<meta property="og:image:width" content="1200"/>',
      '<meta property="og:image:height" content="630"/>',
      `<meta property="og:image:alt" content="${escapeHtml(alt)}"/>`,
      ...[
        'en_US',
        'zh_CN',
        'zh_TW',
        'ja_JP',
        'ko_KR',
        'fr_FR',
        'es_ES',
        'it_IT',
        'nl_NL',
        'pl_PL',
        'pt_BR',
      ].map(
        (locale) =>
          `<meta property="og:locale:alternate" content="${locale}"/>`,
      ),
      '<meta property="og:type" content="website"/>',
      '<meta name="twitter:card" content="summary_large_image"/>',
      '<meta name="twitter:title" content="Motir AI – Pläne &amp; Abonnement"/>',
      '<meta name="twitter:image" content="https://motir.co/de/opengraph-image"/>',
      `<meta name="twitter:image:alt" content="${escapeHtml(alt)}"/>`,
      '<meta name="twitter:image:type" content="image/png"/>',
      '<meta name="twitter:image:width" content="1200"/>',
      '<meta name="twitter:image:height" content="630"/>',
    ])
  })

  it('names thirteen alternates on every localised page', async () => {
    for (const locale of LOCALES) {
      const copy = await getCopy(locale)
      const tags = headTags(
        resolveMetadata(
          siteMetadata(locale, copy),
          localeMetadata({
            locale,
            copy,
            path: '/docs',
            title: 'T',
            description: 'D',
          }),
        ),
      )
      expect(tags.filter((tag) => tag.includes('hrefLang'))).toHaveLength(13)
    }
  })
})

describe('the rest of the keys', () => {
  it('writes description, robots and verification where a layer sets them', () => {
    const meta: Metadata = {
      metadataBase: BASE,
      title: 'T',
      description: 'D',
      robots: { index: false, follow: true },
      verification: { google: 'token' },
      twitter: { card: 'summary', title: 'TT', description: 'TD' },
    }
    expect(headTags(meta)).toEqual([
      '<title>T</title>',
      '<meta name="description" content="D"/>',
      '<meta name="robots" content="noindex, follow"/>',
      '<meta name="google-site-verification" content="token"/>',
      '<meta name="twitter:card" content="summary"/>',
      '<meta name="twitter:title" content="TT"/>',
      '<meta name="twitter:description" content="TD"/>',
    ])
  })

  it('writes `noindex` alone for the not-found room, and no robots tag for an empty one', () => {
    expect(headTags({ robots: { index: false } })).toEqual([
      '<meta name="robots" content="noindex"/>',
    ])
    expect(headTags({ robots: { index: true, follow: false } })).toEqual([
      '<meta name="robots" content="index, nofollow"/>',
    ])
    expect(headTags({ robots: {} })).toEqual([])
    expect(headTags({})).toEqual([])
  })

  it('falls back to the page’s own title and description in Open Graph and Twitter', () => {
    expect(
      headTags({
        title: 'T',
        description: 'D',
        openGraph: {},
        twitter: {},
      }),
    ).toEqual([
      '<title>T</title>',
      '<meta name="description" content="D"/>',
      '<meta property="og:title" content="T"/>',
      '<meta property="og:description" content="D"/>',
      '<meta name="twitter:title" content="T"/>',
      '<meta name="twitter:description" content="D"/>',
    ])
  })

  it('gives a legal page its English canonical and no other language', () => {
    const tags = headTags({
      metadataBase: BASE,
      alternates: englishOnlyAlternates('/legal/terms'),
    })
    expect(tags[0]).toBe(
      '<link rel="canonical" href="https://motir.co/legal/terms"/>',
    )
    expect(tags.filter((tag) => tag.includes('hrefLang'))).toEqual([])
  })
})
