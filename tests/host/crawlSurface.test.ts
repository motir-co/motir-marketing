import { afterEach, describe, expect, it, vi } from 'vitest'

/*
 * THE PROJECT HALF OF MOTIR.CO'S SITEMAP (MOTIR-4222, MOTIR-6743, MOTIR-7956).
 *
 * `/sitemap-projects.xml` renders per request in the Worker (MOTIR-10756);
 * these are the motir.co cases of the Next tree's file, kept verbatim and
 * re-included by MOTIR-10758. The tenant-host cases are gone with the tenant
 * branch (MOTIR-10113), and the static half (robots, `/sitemap-site.xml`) is
 * `tests/robots.test.ts` and `tests/sitemapRoutes.test.ts`.
 */

const INDEX = {
  projects: [
    {
      identifier: 'MOTIR',
      updatedAt: '2026-09-02T00:00:00.000Z',
      primaryHost: 'motir.co',
    },
    {
      identifier: 'PROD',
      updatedAt: '2026-09-01T00:00:00.000Z',
      primaryHost: 'acme.motir.site',
    },
    {
      identifier: 'ROAD',
      updatedAt: '2026-08-31T00:00:00.000Z',
      primaryHost: 'roadmap.acme.com',
    },
  ],
  nextCursor: null,
}

/** Load the sitemap as motir.co, with a stubbed public index. */
async function sitemapOnMotirCo() {
  vi.resetModules()
  vi.stubGlobal('fetch', async () => Response.json(INDEX))
  const sitemap = (await import('@/tests/helpers/sitemap')).default
  return { entries: await sitemap() }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('the sitemap on motir.co', () => {
  it('lists a project whose primary IS motir.co — its page and changelog only', async () => {
    const { entries } = await sitemapOnMotirCo()
    const urls = entries.map((e) => e.url)

    expect(urls).toContain('https://motir.co/p/MOTIR')
    expect(urls).toContain('https://motir.co/p/MOTIR/changelog')
    // MOTIR-6743 — the board, items, tree and roadmap are permanent redirects
    // into the app now, and a sitemap must not list an address that redirects.
    for (const view of ['/board', '/items', '/tree', '/roadmap']) {
      expect(
        urls.join(' '),
        `a read page (${view}) is not a page on this host`,
      ).not.toContain(view)
    }
  })

  it('OMITS a project whose primary is elsewhere — the card’s first criterion', async () => {
    const { entries } = await sitemapOnMotirCo()
    const urls = entries.map((e) => e.url).join(' ')

    expect(urls).not.toContain('PROD')
    expect(urls).not.toContain('ROAD')
  })

  it('and keeps the site’s own static pages, which belong to it alone', async () => {
    const { entries } = await sitemapOnMotirCo()
    const urls = entries.map((e) => e.url)

    expect(urls).toContain('https://motir.co/')
    expect(urls).toContain('https://motir.co/explore')
    expect(urls).toContain('https://motir.co/legal')
  })

  it('lists a motir.co project once per locale per served tab, with the alternates (MOTIR-7956)', async () => {
    const { entries } = await sitemapOnMotirCo()
    const project = entries.filter((e) => /\/p\/MOTIR(\/|$)/.test(e.url))

    // Two served tabs (the page and its changelog) × twelve locales.
    expect(project).toHaveLength(2 * 12)
    expect(project.map((e) => e.url)).toContain('https://motir.co/fr/p/MOTIR')
    expect(project.map((e) => e.url)).toContain(
      'https://motir.co/ja/p/MOTIR/changelog',
    )
    for (const entry of project) {
      const languages = entry.alternates?.languages as Record<string, string>
      expect(Object.keys(languages), entry.url).toHaveLength(13)
      expect(Object.values(languages)).toContain(entry.url)
    }
  })
})

describe('a failed index read', () => {
  it('leaves motir.co its static entries rather than 500ing', async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED')
    })
    const sitemap = (await import('@/tests/helpers/sitemap')).default
    const entries = await sitemap()

    expect(entries.map((e) => e.url)).toContain('https://motir.co/')
  })
})
