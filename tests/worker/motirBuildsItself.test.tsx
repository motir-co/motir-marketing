// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCALE_BCP47, LOCALES, type Locale } from '@/i18n/routing'
import { getCopy } from '@/lib/copy'
import { escapeHtml } from '@/lib/metadata'
import type {
  PublicChangelogPageDto,
  PublicProjectOverviewDto,
} from '@/lib/publicProject'
import type { Env } from '@/worker/env'
import { DYNAMIC_CACHE_CONTROL } from '@/worker/render/document'
import { resetShell } from '@/worker/render/shell'
import { route } from '@/worker/router'

/*
 * THE `buildsItself` SLOT (MOTIR-10756), driven through the router with a stub
 * public API on `fetch` and a stub assets binding.
 */

const APP = 'https://app.worker.test'
const SITE = 'https://motir.co'

const PROJECT = {
  id: 'p1',
  name: 'Motir',
  identifier: 'MOTIR',
  workspaceName: 'Motir',
  publicOverviewMd: '',
  publicTagline: 'Motir, in public',
  publicTags: [],
  stats: {
    publicRequests: 31,
    upvotes: 12345,
    planned: 400,
    shipped: 9876,
    inProgress: 2,
  },
  links: {},
  viewerCanManage: false,
  addresses: { primary: `${SITE}/p/MOTIR`, alternates: [] },
} satisfies PublicProjectOverviewDto

const CHANGELOG = {
  entries: Array.from({ length: 8 }, (_, n) => ({
    identifier: `MOTIR-${100 - n}`,
    key: 100 - n,
    title: `Shipped thing ${n + 1}`,
    kind: 'task',
    status: 'done',
    priority: 'medium',
    shippedAt: '2026-10-09T10:00:00.000Z',
    epic: null,
  })),
  nextCursor: null,
} satisfies PublicChangelogPageDto

type Answer = 'ok' | 'throw' | 500 | 404
let mode: { project: Answer; changelog: Answer }
let requested: string[]

function answer(kind: Answer, body: unknown): Response {
  if (kind === 'throw') throw new TypeError('fetch failed')
  if (kind === 'ok') return Response.json(body)
  return new Response('{}', { status: kind })
}

beforeEach(() => {
  resetShell()
  mode = { project: 'ok', changelog: 'ok' }
  requested = []
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal('fetch', async (input: Request | string | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    requested.push(url.toString())
    if (url.pathname.endsWith('/changelog'))
      return answer(mode.changelog, CHANGELOG)
    return answer(mode.project, PROJECT)
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

describe('/motir-builds-itself in every locale', () => {
  it.each(LOCALES)('answers under %s with its own head', async (locale) => {
    const b = (await getCopy(locale)).builtByMotirPage
    const { response, html } = await get(
      `${prefix(locale)}/motir-builds-itself`,
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(DYNAMIC_CACHE_CONTROL)
    expect(html).toContain(`<html lang="${LOCALE_BCP47[locale]}"`)
    expect(canonicalOf(html)).toBe(
      `${SITE}${prefix(locale)}/motir-builds-itself`,
    )
    expect(hreflangOf(html)).toHaveLength(LOCALES.length + 1)
    expect(html).toMatch(
      /<meta property="og:locale" content="[a-z]{2}_[A-Z]{2}"\/>/,
    )
    expect(html).toContain('<meta name="robots" content="noindex, follow"/>')
    expect(html).toContain(`<title>${escapeHtml(b.metaTitle)}</title>`)
    expect(html).toMatch(
      new RegExp(`<h1[^>]*>${escapeRegExp(escapeHtml(b.headline))}`),
    )
    // The live numbers, formatted for the locale.
    expect(html).toContain(`>${(9876).toLocaleString(locale)}<`)
    expect(html).toContain(`>${(12345).toLocaleString(locale)}<`)
    expect(html).toContain('data-island="HeroWaves"')
  })
})

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe('the live section', () => {
  it('reads the project and its changelog from the Worker’s app origin', async () => {
    await get('/motir-builds-itself', stubEnv('https://other.app.test'))
    expect(requested.sort()).toEqual([
      'https://other.app.test/api/public/p/MOTIR',
      'https://other.app.test/api/public/p/MOTIR/changelog',
    ])
  })

  it('shows the four stats and the six newest entries', async () => {
    const { html } = await get('/motir-builds-itself')
    const b = (await getCopy('en')).builtByMotirPage
    for (const label of Object.values(b.live.stats))
      expect(html).toContain(escapeHtml(label))
    for (const n of [1, 2, 3, 4, 5, 6])
      expect(html).toContain(`Shipped thing ${n}<`)
    expect(html).not.toContain('Shipped thing 7')
    expect(html).toContain('MOTIR-100')
    expect(html).not.toContain(escapeHtml(b.live.unavailable))
  })

  it.each([
    ['unreachable', 'throw' as Answer],
    ['answering 500', 500 as Answer],
    ['answering 404', 404 as Answer],
  ])('with the API %s: 200 and the unavailable sentence', async (_n, a) => {
    mode = { project: a, changelog: a }
    const { response, html } = await get('/de/motir-builds-itself')
    expect(response.status).toBe(200)
    const b = (await getCopy('de')).builtByMotirPage
    expect(html).toContain(escapeHtml(b.live.unavailable))
    expect(html).not.toContain(escapeHtml(b.live.recent))
  })

  it('a missing changelog alone drops the recent list', async () => {
    mode.changelog = 500
    const { html } = await get('/motir-builds-itself')
    const b = (await getCopy('en')).builtByMotirPage
    expect(html).toContain(`>${(9876).toLocaleString('en')}<`)
    expect(html).not.toContain(escapeHtml(b.live.recent))
  })
})
