// @vitest-environment node
import type { Metadata } from 'next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { languageAlternates, localizedPath } from '@/lib/localeMetadata'
import { siteUrl } from '@/lib/siteOrigin'

/*
 * CRAWL DATA PER LANGUAGE ON THE PER-REQUEST PAGES (MOTIR-7956).
 *
 * ⚠️ HELD FOR MOTIR-10635. The static arm is `localeMetadata.test.ts`. These
 * cases are the pages that render per request — `/explore`, its topics,
 * `/ideas` and `/motir-builds-itself` — moved here verbatim (MOTIR-10649) so
 * the Worker-routes story re-includes them with the pages they cover.
 */

type GenerateMetadata = (props: {
  params: Promise<Record<string, string>>
  searchParams?: Promise<Record<string, string>>
}) => Promise<Metadata>

const canonicalOf = (meta: Metadata) => String(meta.alternates?.canonical)

const PAGES: { module: string; path: string }[] = [
  {
    module: '@/app/[locale]/motir-builds-itself/page',
    path: '/motir-builds-itself',
  },
  { module: '@/app/[locale]/explore/page', path: '/explore' },
  { module: '@/app/[locale]/ideas/page', path: '/ideas' },
]

describe('every per-request page canonicalises to its own language address', () => {
  afterEach(() => vi.unstubAllGlobals())

  for (const { module, path } of PAGES) {
    for (const locale of ['en', 'fr'] as const) {
      it(`${module} under ${locale}`, async () => {
        // No page's metadata may depend on a network read succeeding; the
        // ones that read (a topic's label, an idea) fall back without one.
        vi.stubGlobal('fetch', async () => {
          throw new Error('ECONNREFUSED')
        })
        const { generateMetadata } = (await import(
          /* @vite-ignore */ module
        )) as { generateMetadata: GenerateMetadata }
        const meta = await generateMetadata({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({}),
        })
        expect(canonicalOf(meta)).toBe(siteUrl(localizedPath(locale, path)))
        expect(meta.alternates?.languages).toEqual(languageAlternates(path))
        expect(meta.title).toBeTruthy()
      })
    }
  }

  it('the explore canonical is the bare square, localised, whatever the filters', async () => {
    // `lib/crawlPolicy.ts`: a filter state is the same square re-sorted, and a
    // canonical per combination told crawlers to index every one of them.
    const { generateMetadata } = await import('@/app/[locale]/explore/page')
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'fr' }),
      searchParams: Promise.resolve({
        rank: 'recent',
        category: 'design',
        q: 'roadmap',
        cursor: 'abc',
      }),
    })
    expect(canonicalOf(meta)).toBe(siteUrl('/fr/explore'))
    expect((meta.alternates?.languages as Record<string, string>).ja).toBe(
      siteUrl('/ja/explore'),
    )
  })

  it('the topic canonical carries the slug', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED')
    })
    const { generateMetadata } =
      await import('@/app/[locale]/explore/topic/[slug]/page')
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'fr', slug: 'devtools' }),
      searchParams: Promise.resolve({ rank: 'popular', q: 'cli' }),
    })
    // The slug, and none of the filters — the same rule as the square's.
    expect(canonicalOf(meta)).toBe(siteUrl('/fr/explore/topic/devtools'))
  })
})
