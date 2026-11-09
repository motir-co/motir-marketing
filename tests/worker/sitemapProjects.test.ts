// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCALES } from '@/i18n/routing'
import type { PublicProjectIndexEntryDto } from '@/lib/publicProject'
import { SITEMAP_HEADERS } from '@/lib/sitemapXml'
import type { Env } from '@/worker/env'
import { route } from '@/worker/router'

/*
 * THE `projectSitemap` SLOT (MOTIR-10756): `/sitemap-projects.xml`, driven
 * through the router with a stub public index on `fetch`.
 */

const APP = 'https://app.worker.test'
const SITE = 'https://motir.co'

const ACME: PublicProjectIndexEntryDto = {
  identifier: 'ACME',
  updatedAt: '2026-10-09T10:00:00.000Z',
  primaryHost: 'motir.co',
}
const ELSEWHERE: PublicProjectIndexEntryDto = {
  identifier: 'ELSE',
  updatedAt: '2026-10-09T10:00:00.000Z',
  primaryHost: 'other.example',
}

/** The index the stub answers, one entry per page; a page may fail. */
let pages: Array<PublicProjectIndexEntryDto[] | 'throw' | 500>
let requested: string[]

beforeEach(() => {
  pages = [[ACME, ELSEWHERE]]
  requested = []
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal('fetch', async (input: Request | string | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    requested.push(url.toString())
    const index = Number(url.searchParams.get('cursor') ?? '0')
    const page = pages[index]
    if (page === 'throw') throw new TypeError('fetch failed')
    if (page === 500) return new Response('{}', { status: 500 })
    return Response.json({
      projects: page,
      nextCursor: index + 1 < pages.length ? String(index + 1) : null,
    })
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function stubEnv(overrides: Partial<Env> = {}): Env {
  return {
    ASSETS: { fetch: async () => new Response('built') },
    MOTIR_APP_ORIGIN: APP,
    MOTIR_SITE_ORIGIN: SITE,
    ...overrides,
  }
}

async function get(env = stubEnv()) {
  const response = await route(new Request(`${SITE}/sitemap-projects.xml`), env)
  return { response, xml: await response.text() }
}

const locs = (xml: string) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

describe('/sitemap-projects.xml', () => {
  it('lists each site project’s page and changelog in every language', async () => {
    const { response, xml } = await get()
    expect(response.status).toBe(200)
    expect(Object.fromEntries(response.headers)).toEqual(
      Object.fromEntries(
        Object.entries(SITEMAP_HEADERS).map(([k, v]) => [k.toLowerCase(), v]),
      ),
    )
    const urls = locs(xml)
    expect(urls).toHaveLength(LOCALES.length * 2)
    expect(urls).toContain(`${SITE}/p/ACME`)
    expect(urls).toContain(`${SITE}/de/p/ACME/changelog`)
    expect(
      urls.every((u) => !/requests|board|items|tree|roadmap/.test(u)),
    ).toBe(true)
    expect(urls.some((u) => u.includes('ELSE'))).toBe(false)
    expect(xml).not.toContain('motir-builds-itself')
    // Each entry carries the hreflang set, its lastmod, frequency and priority.
    const first = xml.slice(xml.indexOf('<url>'), xml.indexOf('</url>'))
    expect(first.match(/<xhtml:link rel="alternate"/g)).toHaveLength(
      LOCALES.length + 1,
    )
    expect(first).toContain('<lastmod>2026-10-09T10:00:00.000Z</lastmod>')
    expect(first).toContain('<changefreq>daily</changefreq>')
    expect(xml).toContain('<priority>0.8</priority>')
    expect(xml).toContain('<priority>0.5</priority>')
  })

  it('reads the index from the Worker’s app origin', async () => {
    await get(stubEnv({ MOTIR_APP_ORIGIN: 'https://other.app.test' }))
    expect(requested).toEqual(['https://other.app.test/api/public/projects'])
  })

  it('filters by the host MOTIR_SITE_ORIGIN names', async () => {
    const { xml } = await get(
      stubEnv({ MOTIR_SITE_ORIGIN: 'https://other.example' }),
    )
    const urls = locs(xml)
    expect(urls.some((u) => u.includes('/p/ELSE'))).toBe(true)
    expect(urls.some((u) => u.includes('/p/ACME'))).toBe(false)
  })

  it.each([
    ['unreachable', 'throw' as const],
    ['answering 5xx', 500 as const],
  ])('with the index %s: an empty urlset and a 200', async (_n, page) => {
    pages = [page]
    const { response, xml } = await get()
    expect(response.status).toBe(200)
    expect(xml).toContain('<urlset')
    expect(locs(xml)).toEqual([])
  })

  it('a failure on a later page lists what was read', async () => {
    pages = [[ACME], 500]
    const { response, xml } = await get()
    expect(response.status).toBe(200)
    expect(locs(xml)).toHaveLength(LOCALES.length * 2)
  })

  it('reads twenty pages and no more', async () => {
    pages = Array.from({ length: 25 }, (_, n) => [
      { ...ACME, identifier: `P${n}` },
    ])
    const { xml } = await get()
    expect(requested).toHaveLength(20)
    expect(locs(xml)).toHaveLength(20 * LOCALES.length * 2)
  })

  it('is English only: a locale-prefixed spelling is not this slot', async () => {
    const response = await route(
      new Request(`${SITE}/de/sitemap-projects.xml`),
      stubEnv({
        ASSETS: { fetch: async () => new Response('missing', { status: 404 }) },
      }),
    )
    expect(response.status).toBe(404)
    expect(requested).toEqual([])
  })
})
