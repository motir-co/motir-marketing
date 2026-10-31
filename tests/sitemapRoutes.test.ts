// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { sitemapIndexXml, urlsetXml } from '@/lib/sitemapXml'

/*
 * MOTIR-8842 — the sitemap as three routes: an index and the site half, both
 * built, and the per-host project half. The entries themselves are asserted in
 * `tests/host/crawlSurface.test.ts`; this is the document they are written as.
 */

afterEach(() => {
  vi.doUnmock('next/headers')
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('urlsetXml', () => {
  it('writes loc, alternates, lastmod, changefreq and priority, escaped', () => {
    const xml = urlsetXml([
      {
        url: 'https://motir.co/a?x=1&y=2',
        lastModified: new Date('2026-09-02T00:00:00.000Z'),
        changeFrequency: 'daily',
        priority: 0.8,
        alternates: {
          languages: { en: 'https://motir.co/a', fr: 'https://motir.co/fr/a' },
        },
      },
    ])

    expect(xml).toContain('<loc>https://motir.co/a?x=1&amp;y=2</loc>')
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="fr" href="https://motir.co/fr/a" />',
    )
    expect(xml).toContain('<lastmod>2026-09-02T00:00:00.000Z</lastmod>')
    expect(xml).toContain('<changefreq>daily</changefreq>')
    expect(xml).toContain('<priority>0.8</priority>')
    expect(xml).toContain('xmlns:xhtml=')
  })

  it('takes a string lastModified, and leaves out what an entry does not carry', () => {
    const xml = urlsetXml([
      { url: 'https://acme.motir.site/PROD', lastModified: '2026-09-01' },
    ])

    expect(xml).toContain('<lastmod>2026-09-01T00:00:00.000Z</lastmod>')
    expect(xml).not.toContain('changefreq')
    expect(xml).not.toContain('priority')
    expect(xml).not.toContain('xmlns:xhtml')
  })

  it('is an empty urlset for no entries — a tenant with no projects', () => {
    expect(urlsetXml([])).toContain('<urlset')
    expect(urlsetXml([])).not.toContain('<url>')
  })
})

describe('sitemapIndexXml', () => {
  it('names each sitemap behind it', () => {
    const xml = sitemapIndexXml([
      'https://motir.co/a.xml',
      'https://motir.co/b.xml',
    ])
    expect(xml).toContain('<sitemapindex')
    expect(xml.match(/<sitemap>/g)).toHaveLength(2)
    expect(xml).toContain('<loc>https://motir.co/b.xml</loc>')
  })
})

describe('the three routes', () => {
  it('/sitemap.xml indexes the site half and the project half on motir.co', async () => {
    const { GET } = await import('@/app/sitemap.xml/route')
    const res = GET()

    expect(res.headers.get('content-type')).toBe('application/xml')
    const xml = await res.text()
    expect(xml).toContain('<loc>https://motir.co/sitemap-site.xml</loc>')
    expect(xml).toContain('<loc>https://motir.co/sitemap-projects.xml</loc>')
  })

  it('/sitemap-site.xml is motir.co’s own pages and reads no request', async () => {
    // No `next/headers` mock: the route is built, so it has no request scope.
    const { GET } = await import('@/app/sitemap-site.xml/route')
    const xml = await GET().text()

    expect(xml).toContain('<loc>https://motir.co/</loc>')
    expect(xml).toContain('<loc>https://motir.co/fr/explore</loc>')
    expect(xml).not.toContain('/p/MOTIR')
  })

  it('/sitemap-projects.xml lists the projects whose canonical is motir.co', async () => {
    vi.resetModules()
    vi.doMock('next/headers', () => ({ headers: async () => new Headers() }))
    vi.stubGlobal('fetch', async () =>
      Response.json({
        projects: [
          {
            identifier: 'MOTIR',
            updatedAt: '2026-09-02T00:00:00.000Z',
            primaryHost: 'motir.co',
          },
          {
            identifier: 'PROD',
            updatedAt: '2026-09-01T00:00:00.000Z',
            primaryHost: 'roadmap.acme.com',
          },
        ],
        nextCursor: null,
      }),
    )
    const { GET } = await import('@/app/sitemap-projects.xml/route')
    const xml = await (await GET()).text()

    expect(xml).toContain('<loc>https://motir.co/p/MOTIR/changelog</loc>')
    expect(xml).not.toContain('PROD')
  })
})
