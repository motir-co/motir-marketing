import { APP_ORIGIN } from '@/lib/appOrigin'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadChangelog, pagedTabHref } from '@/lib/publicProject'
import { SITE_HOST } from '@/lib/publicHost'

/*
 * The tab read (MOTIR-4116) — what it ASKS FOR.
 *
 * ⚠️ ONE READ LEFT (MOTIR-6743). The board, items, tree and roadmap tabs are
 * permanent redirects into the app now and read nothing; their request tests
 * left with them (`readPageRedirects.test.ts` asserts they read nothing at all).
 *
 * The shapes are the producing repository's to guard (`public-surface-hosts.md`
 * §3). What belongs here is the REQUEST: each tab's paging coordinate is a
 * different one, and getting any of them wrong produces a page that renders
 * fine and pages wrongly — the failure mode a type checker cannot see.
 */

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const pathOf = (call = 0) =>
  new URL(fetchMock.mock.calls[call]?.[0] as string).pathname +
  new URL(fetchMock.mock.calls[call]?.[0] as string).search

describe('the changelog reads its own endpoint', () => {
  it('changelog — cursor, same shape', async () => {
    await loadChangelog(APP_ORIGIN, 'ACME', 'c_9')
    expect(pathOf()).toBe('/api/public/p/ACME/changelog?cursor=c_9')
  })
})

describe('pagedTabHref — the no-JS pager’s target', () => {
  it('is a real URL on this site, carrying the coordinate', () => {
    expect(
      pagedTabHref(SITE_HOST, 'ACME', 'items', { cursor: 'wi_9' }, 'en'),
    ).toBe('/p/ACME/items?cursor=wi_9')
  })

  it('drops undefined parameters rather than emitting empty ones', () => {
    // `?parentId=&offset=3` would be an EMPTY parentId, which the endpoint reads
    // as the root level — so the pager would silently jump back to the top.
    expect(
      pagedTabHref(
        SITE_HOST,
        'ACME',
        'tree',
        {
          parentId: undefined,
          offset: '3',
        },
        'en',
      ),
    ).toBe('/p/ACME/tree?offset=3')
  })

  it('has no query string at all when nothing is carried', () => {
    expect(pagedTabHref(SITE_HOST, 'ACME', 'tree', {}, 'en')).toBe(
      '/p/ACME/tree',
    )
  })

  it('encodes the identifier and the values', () => {
    expect(
      pagedTabHref(SITE_HOST, 'A B', 'items', { cursor: 'a b' }, 'en'),
    ).toBe('/p/A%20B/items?cursor=a+b')
  })
})
