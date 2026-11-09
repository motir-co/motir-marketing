// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { languageAlternates, localizedPath } from '@/lib/localeMetadata'
import { SITE_ORIGIN, siteUrl } from '@/lib/siteOrigin'
import type { Env } from '@/worker/env'
import { resetShell } from '@/worker/render/shell'
import { route } from '@/worker/router'

/*
 * CRAWL DATA PER LANGUAGE ON THE PER-REQUEST PAGES (MOTIR-7956).
 *
 * The static arm is `localeMetadata.test.ts`. These are the pages the Worker
 * answers per request — `/explore`, its topics, `/ideas` and
 * `/motir-builds-itself` — asked through `route()` (MOTIR-10758): the head is
 * read back out of the document the Worker serves, so what is checked is what
 * a crawler is sent.
 */

const ENV: Env = {
  ASSETS: {
    fetch: async () =>
      new Response(
        '<html><head><link rel="stylesheet" href="/_astro/s.css"></head><body><script type="module" src="/_astro/s.js"></script></body></html>',
      ),
  },
  MOTIR_APP_ORIGIN: APP_ORIGIN,
  MOTIR_SITE_ORIGIN: SITE_ORIGIN,
}

/** The head of the document the Worker answers for `path`. */
async function head(path: string) {
  const response = await route(new Request(`${SITE_ORIGIN}${path}`), ENV)
  const html = await response.text()
  const languages: Record<string, string> = {}
  for (const [, lang, href] of html.matchAll(
    /<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g,
  ))
    languages[lang!] = href!
  return {
    status: response.status,
    canonical: /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1],
    title: /<title>([^<]*)<\/title>/.exec(html)?.[1],
    languages,
  }
}

beforeEach(() => {
  resetShell()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  // No page's head may depend on a network read succeeding; the ones that
  // read (a topic's label, an idea) fall back without one.
  vi.stubGlobal('fetch', async () => {
    throw new Error('ECONNREFUSED')
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const PAGES = ['/motir-builds-itself', '/explore', '/ideas']

describe('every per-request page canonicalises to its own language address', () => {
  for (const path of PAGES) {
    for (const locale of ['en', 'fr'] as const) {
      it(`${path} under ${locale}`, async () => {
        const meta = await head(localizedPath(locale, path))
        expect(meta.canonical).toBe(siteUrl(localizedPath(locale, path)))
        expect(meta.languages).toEqual(languageAlternates(path))
        expect(meta.title).toBeTruthy()
      })
    }
  }

  it('the explore canonical is the bare square, localised, whatever the filters', async () => {
    // `lib/crawlPolicy.ts`: a filter state is the same square re-sorted, and a
    // canonical per combination told crawlers to index every one of them.
    const meta = await head(
      '/fr/explore?rank=recent&category=design&q=roadmap&cursor=abc',
    )
    expect(meta.canonical).toBe(siteUrl('/fr/explore'))
    expect(meta.languages.ja).toBe(siteUrl('/ja/explore'))
  })

  it('the topic canonical carries the slug', async () => {
    const meta = await head('/fr/explore/topic/devtools?rank=popular&q=cli')
    // The slug, and none of the filters — the same rule as the square's.
    expect(meta.canonical).toBe(siteUrl('/fr/explore/topic/devtools'))
  })
})
