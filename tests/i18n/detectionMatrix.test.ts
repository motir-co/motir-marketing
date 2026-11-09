// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCALES } from '@/i18n/routing'
import type { Env } from '@/worker/env'
import { LANGUAGE_VARY, route } from '@/worker/router'
import { ROUTES, type RouteSlot } from '@/worker/routes'

/*
 * THE DETECTION MATRIX (MOTIR-7967, case 4), on the Worker (MOTIR-10758): the
 * first visit's language for every one of the twelve, through the REAL
 * `route()`. The story narrowed detection to the bare `/` (MOTIR-10635), so
 * this table walks that one address; every other address is shown never to
 * move. `tests/worker/router.test.ts` proves each branch with a representative
 * row; this file walks the whole table, so a thirteenth locale or a regional
 * tag the matcher stops folding fails here by name.
 *
 * The Next-router matrix (tenant hosts, every unprefixed address) went with
 * that router (MOTIR-10639).
 */

const ORIGIN = 'https://motir.co'
let assets: string[]

const env: Env = {
  ASSETS: {
    async fetch(input) {
      const url = new URL(input instanceof Request ? input.url : input)
      assets.push(url.pathname)
      return new Response(`page ${url.pathname}`, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    },
  },
  MOTIR_APP_ORIGIN: 'https://app.test.motir.co',
  MOTIR_SITE_ORIGIN: ORIGIN,
}

const routes: RouteSlot[] = ROUTES.map((slot) => ({
  ...slot,
  handler: async () => new Response(`slot ${slot.name}`, { status: 200 }),
}))

const ask = (path: string, headers: Record<string, string> = {}) =>
  route(new Request(`${ORIGIN}${path}`, { headers }), env, routes)

const NON_ENGLISH = LOCALES.filter((l) => l !== 'en')

/** A redirect onto a language, with every header the move promises. */
function expectMovedTo(res: Response, to: string) {
  expect(res.status).toBe(307)
  expect(res.headers.get('location')).toBe(`${ORIGIN}${to}`)
  expect(res.headers.get('vary')).toBe(LANGUAGE_VARY)
  expect(res.headers.get('cache-control')).toBe('private, no-store')
}

/** Served where it stands: no language move, whatever else happens. */
function expectNotMoved(res: Response) {
  expect(res.status).not.toBe(307)
  expect(res.headers.get('location')).toBeNull()
}

beforeEach(() => {
  assets = []
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('the bare /, no cookie', () => {
  it('covers all twelve, so a thirteenth locale joins this table', () => {
    expect(LOCALES).toHaveLength(12)
  })

  it.each(NON_ENGLISH)('Accept-Language: %s → /%s', async (l) => {
    expectMovedTo(await ask('/?q=x', { 'accept-language': l }), `/${l}?q=x`)
    expect(assets).toHaveLength(0)
  })

  it('Accept-Language: en is the built English page', async () => {
    const res = await ask('/', { 'accept-language': 'en' })
    expectNotMoved(res)
    expect(assets).toEqual(['/'])
  })

  it.each([
    ['de-AT', 'de'],
    ['pt-BR', 'pt'],
    ['pt-PT', 'pt'],
    ['zh-TW', 'zh-tw'],
    ['zh-Hant', 'zh-tw'],
    ['zh-HK', 'zh-tw'],
    ['zh-Hant-HK', 'zh-tw'],
    ['zh-CN', 'zh'],
    ['ja-JP', 'ja'],
  ])('a regional %s reads as %s', async (tag, l) => {
    expectMovedTo(await ask('/', { 'accept-language': tag }), `/${l}`)
  })

  it.each(['sv', '*'])('%s alone is English', async (tag) => {
    const res = await ask('/', { 'accept-language': tag })
    expectNotMoved(res)
    expect(assets).toEqual(['/'])
  })
})

describe('the order: cookie, then browser, then English', () => {
  it.each(NON_ENGLISH)(
    'a remembered %s beats a browser asking for en',
    async (l) => {
      expectMovedTo(
        await ask('/', { cookie: `NEXT_LOCALE=${l}`, 'accept-language': 'en' }),
        `/${l}`,
      )
    },
  )

  it('a remembered en beats a browser asking for ja', async () => {
    const res = await ask('/', {
      cookie: 'NEXT_LOCALE=en',
      'accept-language': 'ja',
    })
    expectNotMoved(res)
    expect(assets).toEqual(['/'])
  })

  it('a cookie that is not one of the twelve is skipped, not read as English', async () => {
    expectMovedTo(
      await ask('/', { cookie: 'NEXT_LOCALE=xx', 'accept-language': 'ja' }),
      '/ja',
    )
  })
})

describe('never moved', () => {
  it.each([
    '/de',
    '/explore?q=x',
    '/ideas',
    '/p/MOTIR',
    '/price',
    '/motir-mark.svg',
    '/robots.txt',
    '/sitemap.xml',
  ])('%s, under a remembered fr and a Japanese browser', async (path) => {
    expectNotMoved(
      await ask(path, { cookie: 'NEXT_LOCALE=fr', 'accept-language': 'ja' }),
    )
  })
})
