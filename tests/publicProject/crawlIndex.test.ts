import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  actHref,
  loadAllPublicProjects,
  loadChangelog,
  loadRequest,
} from '@/lib/publicProject'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { SITE_ORIGIN } from '@/lib/siteOrigin'

/*
 * The crawl index walk, the two detail reads, and the hand-off URL (MOTIR-4121).
 *
 * ⚠️ THE WALK IS WHERE THE INTERESTING BEHAVIOUR IS, and none of it is visible
 * from a page: it PAGES, it is BOUNDED, and it NEVER THROWS. Each of those is a
 * decision with a failure mode, and each is silent — a sitemap that stops after
 * one page, one that loops for ever, or one that 500s and costs the site its
 * crawl budget all look identical from a green build.
 */

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
})
const page = (n: number, next: string | null) =>
  ok({
    projects: [{ identifier: `P${n}`, updatedAt: '2026-09-02T00:00:00.000Z' }],
    nextCursor: next,
  })

describe('loadAllPublicProjects — the sitemap walk', () => {
  it('follows the cursor across pages and returns them all', async () => {
    fetchMock
      .mockResolvedValueOnce(page(1, 'c1'))
      .mockResolvedValueOnce(page(2, 'c2'))
      .mockResolvedValueOnce(page(3, null))

    const result = await loadAllPublicProjects(APP_ORIGIN)

    expect(result.projects.map((p) => p.identifier)).toEqual(['P1', 'P2', 'P3'])
    expect(result.complete).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('carries the cursor it was given, on every page but the first', async () => {
    fetchMock
      .mockResolvedValueOnce(page(1, 'c1'))
      .mockResolvedValueOnce(page(2, null))

    await loadAllPublicProjects(APP_ORIGIN)

    expect(fetchMock.mock.calls[0]?.[0]).not.toContain('cursor=')
    expect(fetchMock.mock.calls[1]?.[0]).toContain('cursor=c1')
  })

  it('is BOUNDED — it stops rather than following a cursor for ever', async () => {
    // A sitemap generator that followed the cursor without a bound turns one
    // misbehaving response into an unbounded request loop on every crawl.
    fetchMock.mockResolvedValue(page(9, 'always-more'))

    const result = await loadAllPublicProjects(APP_ORIGIN)

    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(20)
    // And it reports that it did NOT finish, rather than claiming a full set.
    expect(result.complete).toBe(false)
  })

  it('NEVER throws — a failed read returns what it has, mid-walk', async () => {
    // The sitemap emits its static entries alongside whatever this returns. A
    // sitemap that briefly loses its project pages is recoverable; one that 500s
    // is not — search engines back off, and the whole site's crawl budget goes.
    fetchMock
      .mockResolvedValueOnce(page(1, 'c1'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const result = await loadAllPublicProjects(APP_ORIGIN)

    expect(result.projects.map((p) => p.identifier)).toEqual(['P1'])
    expect(result.complete).toBe(false)
  })

  it('returns an empty, complete-less result when the FIRST read fails', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    })

    await expect(loadAllPublicProjects(APP_ORIGIN)).resolves.toEqual({
      projects: [],
      complete: false,
    })
  })
})

describe('the request detail read', () => {
  it('takes the FULL identifier and passes it through verbatim', async () => {
    // The segment is named `requestKey` and a DTO's `key` is the bare number —
    // two things with one name. Rebuilding `${id}-${key}` works on every fixture
    // anyone would write and breaks on a dashed project key. (The work-item
    // detail read left with its page — MOTIR-6743.)
    fetchMock.mockResolvedValue(ok({}))

    await loadRequest(APP_ORIGIN, 'OPEN-CORE', 'OPEN-CORE-3')
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      '/p/OPEN-CORE/requests/OPEN-CORE-3',
    )
  })

  it('maps a 404 to not-found, not to a failure', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    })

    await expect(loadRequest(APP_ORIGIN, 'ACME', 'ACME-1')).resolves.toEqual({
      status: 'not-found',
    })
  })
})

describe('loadChangelog — the cursor arm', () => {
  it('omits the cursor on the first page and carries it after', async () => {
    fetchMock.mockResolvedValue(ok({}))

    await loadChangelog(APP_ORIGIN, 'ACME')
    expect(fetchMock.mock.calls[0]?.[0]).not.toContain('cursor=')

    fetchMock.mockClear()
    await loadChangelog(APP_ORIGIN, 'ACME', 'c_9')
    expect(fetchMock.mock.calls[0]?.[0]).toContain('cursor=c_9')
  })
})

describe('actHref — the hand-off URL', () => {
  it('addresses the application, carries the intent and the subject', () => {
    const href = actHref(APP_ORIGIN, 'follow', 'ACME', '/p/ACME/roadmap')
    const url = new URL(href)

    expect(url.origin).toBe(APP_ORIGIN)
    expect(url.pathname).toBe('/act')
    expect(url.searchParams.get('intent')).toBe('follow')
    expect(url.searchParams.get('subject')).toBe('ACME')
  })

  it('sends an ABSOLUTE return on THIS site — what the app validates against', () => {
    // The application allow-lists the return against its configured public
    // origin and falls back otherwise. A relative path would be refused there
    // and the visitor would land on a dashboard having lost the hand-off.
    const url = new URL(actHref(APP_ORIGIN, 'vote', 'ACME', '/p/ACME/roadmap'))

    expect(url.searchParams.get('return')).toBe(`${SITE_ORIGIN}/p/ACME/roadmap`)
  })

  it('encodes every intent the amendment hands off', () => {
    for (const intent of [
      'follow',
      'vote',
      'upvote',
      'comment',
      'request',
    ] as const) {
      expect(
        new URL(
          actHref(APP_ORIGIN, intent, 'ACME', '/p/ACME'),
        ).searchParams.get('intent'),
      ).toBe(intent)
    }
  })
})
