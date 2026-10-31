import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import {
  isOnPrimaryHost,
  publicUrlFor,
  readPublicHost,
  SITE_HOST,
  PUBLIC_ADDRESS_KIND_HEADER,
  PUBLIC_HOST_HEADER,
  PUBLIC_ORIGIN_HEADER,
} from '@/lib/publicHost'
import { resetHostResolutionCache, resolveHost } from '@/lib/hostResolution'
import { ProjectHeader } from '@/app/[locale]/p/[identifier]/_components/ProjectHeader'
import { ProjectJsonLd } from '@/app/[locale]/p/[identifier]/_components/JsonLd'
import type { PublicProjectOverviewDto } from '@/lib/publicProject'

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

const project = (primary: string): PublicProjectOverviewDto => ({
  id: 'proj_1',
  name: 'Acme Roadmap',
  identifier: 'ACME',
  workspaceName: 'moooon B.V.',
  publicOverviewMd: null,
  publicTagline: null,
  publicTags: [],
  stats: {
    publicRequests: 1,
    upvotes: 2,
    planned: 3,
    shipped: 4,
    inProgress: 5,
  },
  links: {},
  viewerCanManage: false,
  addresses: { primary, alternates: [] },
})

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

describe('a project-kind host, driven to a rendered tab page', () => {
  it('produces host-relative hrefs AND the canonical in ONE pass', async () => {
    // 1. the headers a page reads back — the page-side reader of the `project`
    // kind is MOTIR-9528's to retire, not the router's.
    const host = readPublicHost(
      new Headers({
        [PUBLIC_ADDRESS_KIND_HEADER]: 'project',
        [PUBLIC_HOST_HEADER]: 'roadmap.acme.com',
        [PUBLIC_ORIGIN_HEADER]: 'https://roadmap.acme.com',
      }),
    )

    // 3. the RENDERED page — links and canonical together, which is the join
    const subject = project('https://roadmap.acme.com')
    render(<ProjectHeader project={subject} current="changelog" host={host} />)
    const { container } = render(
      <ProjectJsonLd project={subject} fallbackDescription="" />,
    )

    const nav = screen.getAllByRole('navigation', { name: 'Project' })[0]!
    expect(within(nav).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(
      within(nav).getByRole('link', { name: 'Changelog' }),
    ).toHaveAttribute('href', '/changelog')

    const graph = JSON.parse(container.querySelector('script')!.innerHTML)
    expect(graph['@id']).toBe('https://roadmap.acme.com')
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

  it('includes on the host that owns the canonical and omits on the one that does not', async () => {
    // ⚠️ ONE ROW, TWO HOSTS, AND IT MUST APPEAR IN EXACTLY ONE. Asserted as a
    // pair rather than as two independent cases, because the failure that
    // matters is "in both" or "in neither" — either of which passes a
    // single-host test.
    const onSite = await sitemapAs({})
    const onTenant = await sitemapAs({
      [PUBLIC_ADDRESS_KIND_HEADER]: 'project',
      [PUBLIC_HOST_HEADER]: 'roadmap.acme.com',
      [PUBLIC_ORIGIN_HEADER]: 'https://roadmap.acme.com',
    })

    expect(onSite.some((u) => u.includes('ACME'))).toBe(false)
    expect(onTenant).toContain('https://roadmap.acme.com/')

    expect(onSite).toContain('https://motir.co/p/MOTIR')
    expect(onTenant.some((u) => u.includes('MOTIR'))).toBe(false)
  })

  it('and a host the contract knows nothing about lists nothing at all', async () => {
    // The arm neither code card's units reach: a sitemap asked as a host with
    // no projects. Empty is the answer — NOT this site's static pages, which
    // would attribute motir.co's content to somebody else's domain.
    expect(
      await sitemapAs({
        [PUBLIC_ADDRESS_KIND_HEADER]: 'project',
        [PUBLIC_HOST_HEADER]: 'stranger.example',
        [PUBLIC_ORIGIN_HEADER]: 'https://stranger.example',
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
  it('renders with today’s canonical and redirects NOWHERE', async () => {
    // ⚠️ A ROLLING DEPLOY IS A REAL STATE, not a hypothetical: the two
    // repositories deploy separately by decision (AMENDMENT 2 §E), so for the
    // length of one release this renderer talks to a motir-core that does not
    // send the field. `project.addresses.primary` on `undefined` is a TypeError
    // inside `generateMetadata`, which 500s the page instead of degrading it.
    const legacy = { identifier: 'ACME' }

    expect(publicUrlFor(legacy)).toBe('https://motir.co/p/ACME')
    expect(publicUrlFor(legacy, 'board')).toBe('https://motir.co/p/ACME/board')
    // Absent means "this host is canonical", so nothing redirects — a
    // missing-field redirect would send visitors somewhere chosen by a bug.
    expect(isOnPrimaryHost(legacy, SITE_HOST)).toBe(true)
  })
})
