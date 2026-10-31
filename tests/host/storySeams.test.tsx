import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  publicUrlFor,
  PUBLIC_ADDRESS_KIND_HEADER,
  PUBLIC_HOST_HEADER,
  PUBLIC_ORIGIN_HEADER,
} from '@/lib/publicHost'
import { resetHostResolutionCache, resolveHost } from '@/lib/hostResolution'

/*
 * THE STORY'S SEAMS (MOTIR-4224) — the joins the two code cards' own units mock.
 *
 * ⚠️ WHAT MAKES THESE DIFFERENT FROM THE SUITES BESIDE THEM. `tests/host/
 * hostResolution.test.ts` stubs `fetch` and asks the decision function; `tests/
 * host/tenantLinks.test.tsx` hands a component a `PublicHost` and asks what it
 * emits. Each half can be right while the JOIN is wrong — a contract shape the
 * router parses into a resolution the renderer then reads differently is
 * invisible to both. So each case below starts from a RECORDED contract
 * payload, drives it through the real router code, and ends at a rendered DOM
 * or a real sitemap.
 *
 * ⚠️ THE FIXTURES ARE `e2e/fixtures/`'s SHAPES, RESTATED FOR NODE. The browser
 * lane's stub is an HTTP server started by Playwright; this lane is jsdom and
 * stubs `fetch` in-process, so it cannot reach that server. What it CAN share is
 * the shapes — and those are guarded in the PRODUCING repository
 * (`public-surface-hosts.md` §3), which is why nothing here asserts the contract
 * itself.
 */

const WORKSPACE_PAYLOAD = {
  kind: 'no_application',
  workspace: { name: 'moooon B.V.' },
}
const CUSTOM_PAYLOAD = {
  kind: 'project',
  project: { identifier: 'ACME', name: 'Acme Roadmap' },
  primary: true,
}
/** The retired never-released outcome a stale producer might still send. */
const ALIAS_PAYLOAD = { kind: 'alias', redirectTo: 'acme.motir.site' }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  resetHostResolutionCache()
})

/* ── seam (a): contract → router → rendered page ──────────────────────────── */

describe('a recorded workspace resolution, driven through the router', () => {
  it('answers the no-application page at the root and a 404 for a project path (MOTIR-9512)', async () => {
    resetHostResolutionCache()
    vi.stubGlobal('fetch', async () =>
      Response.json(WORKSPACE_PAYLOAD, {
        headers: { 'cache-control': 'public, max-age=30' },
      }),
    )

    const read = await resolveHost('acme.motir.site')
    expect(read.status).toBe('ok')
    if (read.status !== 'ok') return

    const { routeForHost } = await import('@/lib/hostResolution')
    expect(routeForHost('/')).toEqual({
      action: 'no-application',
      path: '/en/no-application',
    })
    expect(routeForHost('/ACME/board')).toEqual({
      action: 'not-found',
    })
  })
})

describe('a recorded customer-domain resolution, driven through the router', () => {
  it('is the 404 — the router serves no customer domain (MOTIR-9527)', async () => {
    // A customer domain is the certificate edge's. The retired `project` shape
    // is a kind this router does not know, so it never reaches a page.
    resetHostResolutionCache()
    vi.stubGlobal('fetch', async () =>
      Response.json(CUSTOM_PAYLOAD, {
        headers: { 'cache-control': 'public, max-age=30' },
      }),
    )
    expect(await resolveHost('roadmap.acme.com')).toEqual({
      status: 'not-found',
    })
  })
})

/* ── seam (b): the index's primaryHost → the sitemap ──────────────────────── */

describe('the crawl index’s primaryHost, driven into the sitemap', () => {
  const INDEX = {
    projects: [
      {
        identifier: 'MOTIR',
        updatedAt: '2026-09-02T00:00:00.000Z',
        primaryHost: 'motir.co',
      },
      {
        identifier: 'ACME',
        updatedAt: '2026-09-01T00:00:00.000Z',
        primaryHost: 'roadmap.acme.com',
      },
    ],
    nextCursor: null,
  }

  async function sitemapAs(headers: Record<string, string>) {
    vi.resetModules()
    vi.doMock('next/headers', () => ({
      headers: async () => new Headers(headers),
    }))
    vi.stubGlobal('fetch', async () => Response.json(INDEX))
    const sitemap = (await import('@/tests/helpers/sitemap')).default
    const entries = await sitemap()
    vi.doUnmock('next/headers')
    return entries.map((e) => e.url)
  }

  it('lists on motir.co only the projects whose canonical is motir.co', async () => {
    // A row whose primary is a customer's own domain is not listed anywhere
    // Motir serves (MOTIR-9528): that domain is the certificate edge's, and
    // motir.co is not its canonical.
    const onSite = await sitemapAs({})

    expect(onSite).toContain('https://motir.co/p/MOTIR')
    expect(onSite.some((u) => u.includes('ACME'))).toBe(false)
  })

  it('and a workspace host lists nothing at all', async () => {
    // Empty is the answer — NOT this site's static pages, which would
    // attribute motir.co's content to another host, and not a project, which
    // a workspace host does not serve (MOTIR-9512).
    expect(
      await sitemapAs({
        [PUBLIC_ADDRESS_KIND_HEADER]: 'workspace',
        [PUBLIC_HOST_HEADER]: 'acme.motir.site',
        [PUBLIC_ORIGIN_HEADER]: 'https://acme.motir.site',
      }),
    ).toEqual([])
  })
})

/* ── seam (c): a retired alias outcome → the 404 room, never a redirect ───── */

describe('a recorded alias resolution, driven through the router', () => {
  it('is the 404 room — a retired name never redirects (ADR §8 Amendment 3 rule 2)', async () => {
    resetHostResolutionCache()
    vi.stubGlobal('fetch', async () => Response.json(ALIAS_PAYLOAD))
    expect(await resolveHost('old.motir.site')).toEqual({ status: 'not-found' })

    vi.resetModules()
    const { proxy } = await import('@/proxy')
    const { NextRequest } = await import('next/server')
    const res = await proxy(
      new NextRequest('https://old.motir.site/ACME/items?cursor=w9', {
        headers: { host: 'old.motir.site' },
      }),
    )

    expect(res.status).not.toBe(301)
    expect(res.headers.get('location')).toBeNull()
    expect(new URL(res.headers.get('x-middleware-rewrite')!).pathname).toBe(
      '/_host-unknown',
    )
  })
})

/* ── the branch the cards' own units left ─────────────────────────────────── */

describe('a subject DTO from a motir-core that predates `addresses`', () => {
  it('renders with today’s canonical', async () => {
    // ⚠️ A ROLLING DEPLOY IS A REAL STATE, not a hypothetical: the two
    // repositories deploy separately by decision (AMENDMENT 2 §E), so for the
    // length of one release this renderer talks to a motir-core that does not
    // send the field. `project.addresses.primary` on `undefined` is a TypeError
    // inside `generateMetadata`, which 500s the page instead of degrading it.
    const legacy = { identifier: 'ACME' }

    expect(publicUrlFor(legacy)).toBe('https://motir.co/p/ACME')
    expect(publicUrlFor(legacy, 'board')).toBe('https://motir.co/p/ACME/board')
  })
})
