// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCALE_BCP47, LOCALES, type Locale } from '@/i18n/routing'
import { loadSquare, parseExploreSearchParams } from '@/lib/explore'
import type { Env } from '@/worker/env'
import { rawSearchParams } from '@/worker/explore/handler'
import { resetShell } from '@/worker/render/shell'
import { route } from '@/worker/router'

/*
 * THE `explore` SLOT (MOTIR-10754), driven through the router with a stub
 * public API on `fetch` and a stub assets binding.
 */

const APP = 'https://app.test.motir.co'
const SITE = 'https://motir.co'

const CATEGORIES = {
  categories: [
    { slug: 'developer-tools', label: 'Developer tools', projectCount: 2 },
    { slug: 'design', label: 'Design', projectCount: 1 },
  ],
}

const PAGE = {
  items: [
    {
      identifier: 'ACME',
      name: 'Acme Rockets',
      org: { name: 'Acme', slug: 'acme' },
      description: 'Rockets, in public',
      stats: { upvotes: 12, lastActivityAt: '2026-11-01T00:00:00.000Z' },
    },
  ],
  nextCursor: 'n2',
}

type Mode = 'ok' | 'throw' | 500
let mode: { explore: Mode; categories: Mode }
let requested: string[]

beforeEach(() => {
  resetShell()
  mode = { explore: 'ok', categories: 'ok' }
  requested = []
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal('fetch', async (input: string | URL) => {
    const url = new URL(String(input))
    requested.push(url.toString())
    const which = url.pathname.endsWith('/categories')
      ? 'categories'
      : 'explore'
    const answer = mode[which]
    if (answer === 'throw') throw new TypeError('fetch failed')
    if (answer === 500) return new Response('{}', { status: 500 })
    return Response.json(which === 'categories' ? CATEGORIES : PAGE)
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const BUILT = `<html><head><link rel="stylesheet" href="/_astro/s.css"></head><body>room /404<script type="module" src="/_astro/s.js"></script></body></html>`

function stubEnv(appOrigin = APP): Env {
  return {
    ASSETS: {
      async fetch(input) {
        const url = new URL(input instanceof Request ? input.url : input)
        if (url.pathname === '/404') return new Response(BUILT)
        return new Response(`room ${url.pathname}`)
      },
    },
    MOTIR_APP_ORIGIN: appOrigin,
    MOTIR_SITE_ORIGIN: SITE,
  }
}

async function get(path: string, env = stubEnv()) {
  const response = await route(new Request(`${SITE}${path}`), env)
  return { response, html: await response.text() }
}

const prefix = (locale: Locale) => (locale === 'en' ? '' : `/${locale}`)

const canonicalOf = (html: string) =>
  /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1]
const hreflangOf = (html: string) =>
  [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)"/g)].map(
    (m) => m[1],
  )

describe('the square', () => {
  it.each(LOCALES)(
    'answers /explore under %s with its own head',
    async (locale) => {
      const { response, html } = await get(`${prefix(locale)}/explore`)
      expect(response.status).toBe(200)
      expect(html).toContain(`<html lang="${LOCALE_BCP47[locale]}"`)
      expect(canonicalOf(html)).toBe(`${SITE}${prefix(locale)}/explore`)
      expect(hreflangOf(html)).toHaveLength(LOCALES.length + 1)
      expect(html).toMatch(
        /<meta property="og:locale" content="[a-z]{2}_[A-Z]{2}"\/>/,
      )
      expect(html).toContain('Acme Rockets')
      expect(html).toContain('Developer tools')
    },
  )

  it('reads the API with the query loadSquare sends, and draws locale links', async () => {
    const { html } = await get(
      '/de/explore?rank=popular&q=board&category=design&cursor=c1&window=day',
    )
    expect(requested).toEqual([
      `${APP}/api/public/explore?cursor=c1&rank=popular&q=board&category=design`,
      `${APP}/api/public/categories`,
    ])
    expect(canonicalOf(html)).toBe(`${SITE}/de/explore`)
    expect(html).toContain('href="/de/explore?')
    expect(html).not.toMatch(/href="\/explore[?"]/)
  })

  it.each<Mode>(['throw', 500])(
    'renders the unavailable state, not a 404, when the API is down (%s)',
    async (down) => {
      mode.explore = down
      const { response, html } = await get('/explore')
      expect(response.status).toBe(200)
      expect(response.headers.get('cache-control')).toContain('no-store')
      expect(html).not.toContain('Acme Rockets')
      expect(canonicalOf(html)).toBe(`${SITE}/explore`)
    },
  )

  it('follows the app origin it is given', async () => {
    await get('/explore', stubEnv('https://staging-app.motir.co'))
    expect(
      requested.every((url) =>
        url.startsWith('https://staging-app.motir.co/api/public/'),
      ),
    ).toBe(true)
  })
})

describe('a topic page', () => {
  it.each(['en', 'ja', 'pt'] as const)(
    'answers a known topic under %s',
    async (locale) => {
      const { response, html } = await get(
        `${prefix(locale)}/explore/topic/developer-tools?rank=recent`,
      )
      expect(response.status).toBe(200)
      expect(canonicalOf(html)).toBe(
        `${SITE}${prefix(locale)}/explore/topic/developer-tools`,
      )
      expect(hreflangOf(html)).toHaveLength(LOCALES.length + 1)
      expect(html).toContain('Developer tools')
      expect(html).toContain(`href="${prefix(locale)}/explore"`)
      expect(requested[0]).toBe(
        `${APP}/api/public/explore?rank=recent&category=developer-tools`,
      )
    },
  )

  it('searches within the topic', async () => {
    const { html } = await get('/explore/topic/design?q=kit')
    expect(html).toContain('kit')
  })

  it('answers an unknown topic with the locale room and 404', async () => {
    const { response, html } = await get('/fr/explore/topic/nope')
    expect(response.status).toBe(404)
    expect(html).toBe('room /fr/404')
  })

  it.each<Mode>(['throw', 500])(
    'renders the unavailable state for any slug when the API is down (%s)',
    async (down) => {
      mode.categories = down
      const { response, html } = await get('/explore/topic/nope')
      expect(response.status).toBe(200)
      expect(html).toContain('<title>')
      expect(html).toContain('nope')
    },
  )

  it('answers a slug that does not decode with 404 and no read', async () => {
    const { response } = await get('/explore/topic/%E0%A4%A')
    expect(response.status).toBe(404)
    expect(requested).toEqual([])
  })
})

describe('loadSquare', () => {
  it('reads the base it is given, fresh', async () => {
    const spy = vi.fn(async () => Response.json(CATEGORIES))
    vi.stubGlobal('fetch', spy)
    await loadSquare('https://elsewhere.motir.co', parseExploreSearchParams({}))
    expect(spy).toHaveBeenCalledWith(
      'https://elsewhere.motir.co/api/public/explore',
      { cache: 'no-store' },
    )
  })
})

describe('rawSearchParams', () => {
  it('keeps a repeated key as every value, and a single one as itself', () => {
    expect(
      rawSearchParams(new URL(`${SITE}/explore?q=a&rank=popular&q=b`)),
    ).toEqual({
      q: ['a', 'b'],
      rank: 'popular',
    })
  })
})
