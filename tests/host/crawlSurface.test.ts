import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PUBLIC_ADDRESS_KIND_HEADER,
  PUBLIC_HOST_HEADER,
  PUBLIC_ORIGIN_HEADER,
} from '@/lib/publicHost'

/*
 * THE PER-HOST CRAWL SURFACE (MOTIR-4222) — `app/sitemap.ts` and
 * `app/robots.ts`, asked as three different hosts.
 *
 * ⚠️ ONE SENTENCE IS THE WHOLE RULE: a sitemap may only list URLs on its own
 * host. Everything below is that rule at each address — so a project whose
 * canonical has moved DISAPPEARS from `motir.co`'s sitemap. Since MOTIR-9528
 * motir.co is the only host here that lists a project: a workspace host serves
 * none, and a customer domain is the certificate edge's, not this repository's.
 *
 * ⚠️ THE HOST IS SUPPLIED THROUGH `next/headers`, WHICH IS THE REAL SEAM. These
 * routes are functions with no arguments; the only thing that tells them which
 * host asked is the pair of headers `proxy.ts` forwards. Mocking the module is
 * how a test asks as somebody else — and it is also why the router's `forward`
 * arm exists at all: `/sitemap.xml` is a site-asset-shaped path, so before
 * MOTIR-4222 it was served with no headers and answered as `motir.co` on every
 * tenant host.
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

/** Load the two routes with a request scope and a stubbed public index. */
async function crawlSurfaceAs(headers: Record<string, string>) {
  vi.resetModules()
  vi.doMock('next/headers', () => ({
    headers: async () => new Headers(headers),
  }))
  vi.stubGlobal('fetch', async () => Response.json(INDEX))

  const sitemap = (await import('@/tests/helpers/sitemap')).default
  const robots = (await import('@/app/robots')).default
  const tenantRobots = (await import('@/app/robots-tenant.txt/route')).GET
  return {
    entries: await sitemap(),
    robots: robots(),
    tenantRobotsText: await (await tenantRobots()).text(),
  }
}

const asWorkspace = {
  [PUBLIC_ADDRESS_KIND_HEADER]: 'workspace',
  [PUBLIC_HOST_HEADER]: 'acme.motir.site',
}

afterEach(() => {
  vi.doUnmock('next/headers')
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('the sitemap on motir.co', () => {
  it('lists a project whose primary IS motir.co — its page and changelog only', async () => {
    const { entries } = await crawlSurfaceAs({})
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
    const { entries } = await crawlSurfaceAs({})
    const urls = entries.join(' ')

    expect(urls).not.toContain('PROD')
    expect(urls).not.toContain('ROAD')
  })

  it('and keeps the site’s own static pages, which belong to it alone', async () => {
    const { entries } = await crawlSurfaceAs({})
    const urls = entries.map((e) => e.url)

    expect(urls).toContain('https://motir.co/')
    expect(urls).toContain('https://motir.co/explore')
    expect(urls).toContain('https://motir.co/legal')
  })

  it('lists a motir.co project once per locale per served tab, with the alternates (MOTIR-7956)', async () => {
    const { entries } = await crawlSurfaceAs({})
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

describe('the sitemap on a workspace subdomain', () => {
  it('lists NOTHING — a workspace host serves no project (MOTIR-9512)', async () => {
    // Even when an index row still names the workspace host as a project's
    // canonical: `acme.motir.site/PROD` is a 404 since the address decision
    // MOTIR-9790, and a sitemap may only list pages that exist.
    const { entries } = await crawlSurfaceAs(asWorkspace)
    expect(entries).toEqual([])
  })
})

describe('the sitemap on a customer domain', () => {
  it('is not this repository’s — a retired `project` header reads as motir.co (MOTIR-9528)', async () => {
    // A customer domain is answered by the certificate edge, so no request
    // from one reaches these routes. A stale `project` header is the one way
    // the kind could still arrive, and it reads as the site: motir.co's own
    // projects, never a sitemap rooted on the customer's host.
    const { entries } = await crawlSurfaceAs({
      [PUBLIC_ADDRESS_KIND_HEADER]: 'project',
      [PUBLIC_HOST_HEADER]: 'roadmap.acme.com',
    })
    const urls = entries.map((e) => e.url)

    expect(urls).toContain('https://motir.co/p/MOTIR')
    expect(urls.some((u) => u.includes('roadmap.acme.com'))).toBe(false)
  })
})

describe('robots names THIS host’s sitemap', () => {
  it('motir.co serves a STATIC file that reads nothing from the request (MOTIR-8842)', async () => {
    // `app/robots.ts` is prerendered by `next build`, so it is called with no
    // request scope at all — no `next/headers` mock, nothing to read.
    vi.resetModules()
    const robots = (await import('@/app/robots')).default
    const result = robots()

    expect(result.sitemap).toBe('https://motir.co/sitemap.xml')
    expect(result.host).toBe('https://motir.co/')
    // The rule set itself is `tests/entitySignal.test.ts`'s; here, only that
    // every crawler is still let in at `/`.
    expect([result.rules].flat()).toContainEqual(
      expect.objectContaining({ userAgent: '*', allow: '/' }),
    )
    // MOTIR-6747: nor does it name a read path, allowed or disallowed — they
    // are redirects into the app, not pages of this host.
    expect(
      JSON.stringify(result).replaceAll('https://motir.co', ''),
    ).not.toMatch(/\/(board|items|tree|roadmap)\b/)
  })

  it.each([['a workspace subdomain', asWorkspace, 'https://acme.motir.site']])(
    '%s gets its own, from the tenant route',
    async (_label, headers, origin) => {
      // A tenant host whose robots.txt pointed at motir.co/sitemap.xml would
      // hand a crawler a document listing URLs on a host it did not ask about —
      // which the sitemap protocol refuses outright.
      const { tenantRobotsText } = await crawlSurfaceAs(headers)

      expect(tenantRobotsText).toBe(
        [
          'User-Agent: *',
          'Allow: /',
          '',
          `Host: ${origin}/`,
          `Sitemap: ${origin}/sitemap.xml`,
          '',
        ].join('\n'),
      )
      expect(tenantRobotsText.replaceAll(origin, '')).not.toMatch(
        /\/(board|items|tree|roadmap)\b/,
      )
    },
  )
})

describe('a failed index read', () => {
  it('leaves motir.co its static entries rather than 500ing', async () => {
    vi.resetModules()
    vi.doMock('next/headers', () => ({ headers: async () => new Headers() }))
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED')
    })
    const sitemap = (await import('@/tests/helpers/sitemap')).default
    const entries = await sitemap()

    expect(entries.map((e) => e.url)).toContain('https://motir.co/')
  })

  it('and leaves a tenant host an EMPTY sitemap, not the site’s pages', async () => {
    // Short is recoverable — a crawler re-reads it. Emitting motir.co's pages
    // under a tenant's host would not be.
    vi.resetModules()
    vi.doMock('next/headers', () => ({
      headers: async () => new Headers(asWorkspace),
    }))
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED')
    })
    const sitemap = (await import('@/tests/helpers/sitemap')).default

    expect(await sitemap()).toEqual([])
  })
})

describe('the origin the router carries', () => {
  it('is USED rather than reconstructed — scheme and port included', async () => {
    // ⚠️ THE CASE THAT MADE THIS A HEADER. The browser lane reaches the app at
    // `http://acme.localhost:4318`; a `robots.txt` built as `https://${host}`
    // names `https://acme.localhost/sitemap.xml`, which resolves nowhere — in
    // the one file whose entire job is to hand a crawler a working address.
    const { tenantRobotsText, entries } = await crawlSurfaceAs({
      [PUBLIC_ADDRESS_KIND_HEADER]: 'workspace',
      [PUBLIC_HOST_HEADER]: 'acme.localhost',
      [PUBLIC_ORIGIN_HEADER]: 'http://acme.localhost:4318',
    })

    expect(tenantRobotsText).toContain(
      'Sitemap: http://acme.localhost:4318/sitemap.xml',
    )
    expect(entries.map((e) => e.url)).toEqual([])
  })

  it('falls back to https for a tenant host that arrives without one', async () => {
    const { tenantRobotsText } = await crawlSurfaceAs({
      [PUBLIC_ADDRESS_KIND_HEADER]: 'workspace',
      [PUBLIC_HOST_HEADER]: 'acme.motir.site',
    })
    expect(tenantRobotsText).toContain(
      'Sitemap: https://acme.motir.site/sitemap.xml',
    )
  })

  it('and REFUSES a value that is not an origin', async () => {
    // The headers are overwritten on every request the router handles, but a
    // request it never handled arrives with whatever was sent — and this value
    // ends up in a robots.txt and a sitemap, where a malformed one is worse
    // than the fallback it replaced.
    const { tenantRobotsText } = await crawlSurfaceAs({
      [PUBLIC_ADDRESS_KIND_HEADER]: 'workspace',
      [PUBLIC_HOST_HEADER]: 'acme.motir.site',
      [PUBLIC_ORIGIN_HEADER]: 'javascript:alert(1)',
    })
    expect(tenantRobotsText).toContain(
      'Sitemap: https://acme.motir.site/sitemap.xml',
    )
  })
})
