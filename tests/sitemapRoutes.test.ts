// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { siteSitemapEntries } from '@/lib/siteSitemap'
import { sitemapIndexXml, urlsetXml } from '@/lib/sitemapXml'

/*
 * MOTIR-8842 — the sitemap as three routes: an index and the site half, both
 * built (by `astro build` since MOTIR-10646), and the per-host project half.
 * The site entries themselves are asserted in `tests/entitySignal.test.ts`;
 * this is the document they are written as.
 */

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

describe('the two built routes', () => {
  // Astro endpoints, written once by `astro build` (MOTIR-10646). The project
  // half, `/sitemap-projects.xml`, is a Worker route; its case waits in
  // `tests/sitemapProjectsRoute.test.ts` for the Worker-routes story.
  it('/sitemap.xml indexes the site half and the project half on motir.co', async () => {
    const { GET } = await import('@/src/pages/sitemap.xml')
    const res = await GET({} as never)

    expect(res.headers.get('content-type')).toBe('application/xml')
    const xml = await res.text()
    expect(xml).toContain('<sitemapindex')
    expect([...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1])).toEqual([
      'https://motir.co/sitemap-site.xml',
      'https://motir.co/sitemap-projects.xml',
    ])
  })

  it('/sitemap-site.xml is motir.co’s own pages and reads no request', async () => {
    const { GET } = await import('@/src/pages/sitemap-site.xml')
    const res = await GET({} as never)
    const xml = await res.text()

    expect(res.headers.get('content-type')).toBe('application/xml')
    expect(xml).toBe(urlsetXml(siteSitemapEntries()))
    expect(xml).toContain('<loc>https://motir.co/</loc>')
    expect(xml).toContain('<loc>https://motir.co/fr/explore</loc>')
    expect(xml).not.toContain('/p/MOTIR')
    expect(xml).not.toContain('/products/')
  })
})
