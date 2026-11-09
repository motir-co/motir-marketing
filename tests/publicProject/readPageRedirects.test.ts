import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PROJECT_TABS, visitorViewUrl } from '@/lib/publicProject'
import type { Env } from '@/worker/env'
import { route } from '@/worker/router'

/**
 * THE RETIRED READ PAGES (MOTIR-6743, Story MOTIR-6171). motir.co's board,
 * items, tree, roadmap and item pages answer a PERMANENT redirect (308) to the
 * same path on the app, where the Visitor's live views are
 * (`app.motir.co/p/<identifier>/<view>`, behind sign-in and a one-time consent).
 * The roadmap is included on purpose: it was the public feature-request board,
 * which the owner retired (motir-core `docs/decisions/public-request-board-retired.md`).
 *
 * Re-included by MOTIR-10758: the Worker answers them (MOTIR-10753), so each
 * case asks the Worker's router for the address a visitor asks for, with the
 * app origin the Worker is given. `Location` is always absolute on that origin.
 */

const APP = 'https://app.test.motir.co'

const env: Env = {
  ASSETS: { fetch: async () => new Response('built') },
  MOTIR_APP_ORIGIN: APP,
  MOTIR_SITE_ORIGIN: 'https://motir.co',
}

const ask = (path: string, method = 'GET') =>
  route(new Request(`https://motir.co${path}`, { method }), env)

// ⚠️ NO HANDLER READS THE PUBLIC API: every test here runs with `fetch` stubbed
// to throw, so a handler that tried to read before redirecting would fail rather
// than pass.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('a retired read page must not read the public API')
    }),
  )
})
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('each retired read page answers 308 to the same path on the app', () => {
  it.each(['board', 'items', 'tree', 'roadmap'] as const)(
    '/p/MOTIR/%s',
    async (view) => {
      const res = await ask(`/p/MOTIR/${view}`)
      expect(res.status).toBe(308)
      expect(res.headers.get('location')).toBe(`${APP}/p/MOTIR/${view}`)
      expect(await res.text()).toBe('')
    },
  )

  it('/p/MOTIR/items/MOTIR-42 — the FULL identifier, passed through', async () => {
    const res = await ask('/p/MOTIR/items/MOTIR-42')
    expect(res.status).toBe(308)
    expect(res.headers.get('location')).toBe(`${APP}/p/MOTIR/items/MOTIR-42`)
  })

  it('HEAD answers the same redirect as GET', async () => {
    const head = await ask('/p/MOTIR/board', 'HEAD')
    expect(head.status).toBe(308)
    expect(head.headers.get('location')).toBe(`${APP}/p/MOTIR/board`)
    const itemHead = await ask('/p/MOTIR/items/MOTIR-1', 'HEAD')
    expect(itemHead.headers.get('location')).toBe(
      `${APP}/p/MOTIR/items/MOTIR-1`,
    )
  })

  it('drops the query string — this host’s cursors mean nothing in the app', async () => {
    const items = await ask('/p/MOTIR/items?cursor=abc')
    expect(items.headers.get('location')).toBe(`${APP}/p/MOTIR/items`)
    const roadmap = await ask('/p/MOTIR/roadmap?bucket=planned&cursor=x')
    expect(roadmap.headers.get('location')).toBe(`${APP}/p/MOTIR/roadmap`)
    const item = await ask('/p/MOTIR/items/MOTIR-42?activity=all')
    expect(item.headers.get('location')).toBe(`${APP}/p/MOTIR/items/MOTIR-42`)
  })

  it('encodes an identifier and a key exactly once', async () => {
    // The Worker decodes a segment once and encodes it once on the way out,
    // so a segment that needed encoding is never double-encoded.
    const res = await ask('/p/A%20B%2F%C3%87/board')
    expect(res.headers.get('location')).toBe(`${APP}/p/A%20B%2F%C3%87/board`)
    const item = await ask('/p/A%20B/items/A%20B-7')
    expect(item.headers.get('location')).toBe(`${APP}/p/A%20B/items/A%20B-7`)
  })

  it('redirects an unknown project too — the app answers its not-found', async () => {
    const res = await ask('/p/NOPE-XYZ/board')
    expect(res.status).toBe(308)
    expect(res.headers.get('location')).toBe(`${APP}/p/NOPE-XYZ/board`)
  })
})

describe('the tab list says who serves each tab', () => {
  it('marks Overview and Changelog site-served, the four read views app-served', () => {
    expect(PROJECT_TABS.map((t) => [t.segment, t.served])).toEqual([
      ['', 'site'],
      ['board', 'app'],
      ['items', 'app'],
      ['tree', 'app'],
      ['roadmap', 'app'],
      ['changelog', 'site'],
    ])
  })

  it('builds the app read-view URL in one place', () => {
    expect(visitorViewUrl(APP, 'MOTIR', 'board')).toBe(`${APP}/p/MOTIR/board`)
    expect(visitorViewUrl(APP, 'MOTIR', 'items', 'MOTIR-42')).toBe(
      `${APP}/p/MOTIR/items/MOTIR-42`,
    )
  })
})
