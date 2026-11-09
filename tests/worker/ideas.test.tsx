// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCALE_BCP47, LOCALES, type Locale } from '@/i18n/routing'
import { getCopy } from '@/lib/copy'
import { IDEAS_REVALIDATE_SECONDS } from '@/lib/ideas'
import { escapeHtml } from '@/lib/metadata'
import type { Env } from '@/worker/env'
import { IDEAS_DOCUMENT_CACHE_CONTROL } from '@/worker/ideas/handler'
import { resetShell } from '@/worker/render/shell'
import { route } from '@/worker/router'
import ideasFixture from '../../e2e/fixtures/ideas.json'
import tagsFixture from '../../e2e/fixtures/ideas-tags.json'
import ideaFixture from '../../e2e/fixtures/idea-stop-returns-before-they-happen.json'
import { MemoryCache, waitUntilRecorder } from './ideasCache'

/*
 * THE `ideas` SLOT (MOTIR-10755), driven through the router with a stub idea
 * store on `fetch`, an in-memory `caches.default` on a controlled clock and a
 * stub assets binding.
 */

const APP = 'https://app.worker.test'
const SITE = 'https://motir.co'
const OPEN = 'stop-returns-before-they-happen'

type Answer = 'ok' | 'throw' | 500 | 'empty' | 'bad'
let mode: { list: Answer; tags: Answer; idea: Answer }
let reads: string[]
let cache: MemoryCache
let recorder: ReturnType<typeof waitUntilRecorder>

function answer(kind: Answer, body: unknown): Response {
  if (kind === 'throw') throw new TypeError('fetch failed')
  if (kind === 500) return new Response('{}', { status: 500 })
  if (kind === 'bad') return Response.json({})
  return Response.json(body)
}

beforeEach(() => {
  resetShell()
  mode = { list: 'ok', tags: 'ok', idea: 'ok' }
  reads = []
  cache = new MemoryCache()
  recorder = waitUntilRecorder()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal('caches', { default: cache })
  vi.stubGlobal('fetch', async (input: Request | string | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    reads.push(url.pathname + url.search)
    if (url.pathname === '/api/public/ideas/tags')
      return answer(mode.tags, tagsFixture)
    if (url.pathname === '/api/public/ideas') {
      if (mode.list === 'empty')
        return Response.json({ ...ideasFixture, items: [], total: 0 })
      // A filtered list that leaves the open idea out, as a narrowed view does.
      const narrowed = url.searchParams.has('category')
      return answer(
        mode.list,
        narrowed
          ? {
              ...ideasFixture,
              items: ideasFixture.items.filter((i) => i.slug !== OPEN),
            }
          : ideasFixture,
      )
    }
    if (url.pathname === `/api/public/ideas/${OPEN}`)
      return answer(mode.idea, ideaFixture)
    return new Response('{}', { status: 404 })
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const BUILT = `<html><head><link rel="stylesheet" href="/_astro/s.css"></head><body>room /404<script type="module" src="/_astro/s.js"></script></body></html>`

function stubEnv(): Env {
  return {
    ASSETS: {
      async fetch(input) {
        const url = new URL(input instanceof Request ? input.url : input)
        if (url.pathname === '/404') return new Response(BUILT)
        return new Response(`room ${url.pathname}`)
      },
    },
    MOTIR_APP_ORIGIN: APP,
    MOTIR_SITE_ORIGIN: SITE,
  }
}

async function get(path: string, headers: Record<string, string> = {}) {
  const response = await route(
    new Request(`${SITE}${path}`, { headers }),
    stubEnv(),
    undefined,
    recorder.ctx,
  )
  const html = await response.text()
  await recorder.settle()
  return { response, html }
}

const prefix = (locale: Locale) => (locale === 'en' ? '' : `/${locale}`)
const canonicalOf = (html: string) =>
  /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1]
const hreflangOf = (html: string) =>
  [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)"/g)].map(
    (m) => m[1],
  )
const titleOf = (html: string) => /<title>([^<]*)<\/title>/.exec(html)?.[1]
const descriptionOf = (html: string) =>
  /<meta name="description" content="([^"]*)"/.exec(html)?.[1]
const storeReads = () => reads.filter((r) => r.startsWith('/api/public/ideas'))

describe('/ideas in every locale', () => {
  it.each(LOCALES)('answers under %s with its own head', async (locale) => {
    const copy = (await getCopy(locale)).ideas
    const { response, html } = await get(`${prefix(locale)}/ideas`)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(
      IDEAS_DOCUMENT_CACHE_CONTROL,
    )
    expect(html).toContain(`<html lang="${LOCALE_BCP47[locale]}"`)
    expect(canonicalOf(html)).toBe(`${SITE}${prefix(locale)}/ideas`)
    expect(hreflangOf(html)).toHaveLength(LOCALES.length + 1)
    expect(html).toMatch(
      /<meta property="og:locale" content="[a-z]{2}_[A-Z]{2}"\/>/,
    )
    expect(html).toContain('<meta name="robots" content="noindex, follow"/>')
    expect(titleOf(html)).toBe(escapeHtml(copy.metaTitle))
    expect(descriptionOf(html)).toBe(escapeHtml(copy.metaDescription))
    expect(html).toContain(escapeHtml(copy.headline))
    expect(html).toContain(escapeHtml(copy.rulesHeadline))
    expect(storeReads()).toEqual([
      `/api/public/ideas?locale=${locale}`,
      `/api/public/ideas/tags?locale=${locale}`,
    ])
  })
})

describe('the page', () => {
  it('draws the controls, then the products Motir buys before the directions', async () => {
    const { html } = await get('/ideas')
    expect(html).toContain('id="find-h"')
    expect(html).toContain('<details')
    // Category chips carry their counts.
    expect(html).toMatch(/Legal[\s\S]{0,400}?>1</)
    const buys = html.indexOf('id="list-h"')
    const more = html.indexOf('id="more-h"')
    expect(buys).toBeGreaterThan(0)
    expect(more).toBeGreaterThan(buys)
    expect(html).toContain('data-island="IdeasNavigator"')
    expect(html).toContain('data-ideas-results=""')
    expect(html).not.toContain('data-idea-sheet')
    // Every link the page draws for itself is its own locale's address.
    const { html: de } = await get('/de/ideas')
    expect(de).toContain('action="/de/ideas"')
    expect(de).not.toMatch(/href="\/ideas[?"]/)
  })

  it('reads the list with the view’s filters', async () => {
    const { html } = await get(
      '/ideas?category=ecommerce&tag=smb&q=returns&kind=direction',
    )
    expect(storeReads()[0]).toBe(
      '/api/public/ideas?category=ecommerce&tag=smb&q=returns&kind=direction&locale=en',
    )
    expect(canonicalOf(html)).toBe(
      `${SITE}/ideas?category=ecommerce&amp;tag=smb&amp;q=returns&amp;kind=direction`,
    )
  })

  it('draws the empty state when no idea matches', async () => {
    mode.list = 'empty'
    const { response, html } = await get('/ideas')
    expect(response.status).toBe(200)
    expect(html).toContain(escapeHtml((await getCopy('en')).ideas.empty.title))
  })
})

describe('the idea open in place', () => {
  it('opens a listed idea from the list, with no read of its own', async () => {
    const { html } = await get(`/ideas?idea=${OPEN}`)
    expect(html).toContain(`data-idea-sheet="${OPEN}"`)
    expect(html).toContain('data-island="IdeaSheet"')
    expect(titleOf(html)).toBe(
      escapeHtml(
        `${ideaFixture.title} · ${(await getCopy('en')).ideas.metaTitle}`,
      ),
    )
    expect(descriptionOf(html)).toBe(escapeHtml(ideaFixture.pitch))
    expect(canonicalOf(html)).toBe(`${SITE}/ideas?idea=${OPEN}`)
    expect(storeReads()).toHaveLength(2)
  })

  it('reads an idea outside the filters by its slug', async () => {
    const { html } = await get(`/ideas?category=legal&idea=${OPEN}`)
    expect(storeReads()).toContain(`/api/public/ideas/${OPEN}?locale=en`)
    expect(html).toContain(`data-idea-sheet="${OPEN}"`)
  })

  it.each([
    ['unknown or retired (404)', 'no-such-idea', 'ok' as Answer],
    ['unreadable', OPEN, 500 as Answer],
    ['unreachable', OPEN, 'throw' as Answer],
  ])('an idea %s opens no sheet', async (_name, slug, answerWith) => {
    mode.idea = answerWith
    const { response, html } = await get(`/ideas?category=legal&idea=${slug}`)
    expect(response.status).toBe(200)
    expect(html).not.toContain('data-idea-sheet')
    expect(titleOf(html)).toBe(
      escapeHtml((await getCopy('en')).ideas.metaTitle),
    )
    expect(canonicalOf(html)).toBe(`${SITE}/ideas?category=legal`)
  })

  it('names the idea in the head but opens no sheet over an unread list', async () => {
    mode.list = 500
    const { html } = await get(`/ideas?idea=${OPEN}`)
    expect(titleOf(html)).toContain(escapeHtml(ideaFixture.title))
    expect(html).not.toContain('data-idea-sheet')
  })
})

describe('when the store does not answer', () => {
  it.each([
    ['answers 5xx', 500 as Answer],
    ['refuses the connection', 'throw' as Answer],
  ])('the list read %s: the unavailable state, never a 404', async (_n, a) => {
    mode.list = a
    const { response, html } = await get('/de/ideas?tag=smb')
    expect(response.status).toBe(200)
    const error = (await getCopy('de')).ideas.error
    expect(html).toContain(escapeHtml(error.title))
    expect(html).toContain('href="/de/ideas?tag=smb"')
    expect(html).not.toContain('id="find-h"')
  })

  it('the tag read fails: the page without its tag filters', async () => {
    mode.tags = 500
    const { response, html } = await get('/ideas')
    expect(response.status).toBe(200)
    expect(html).toContain('id="find-h"')
    expect(html).not.toContain('<details')
  })

  it('a list answer that is not the contract is a bug, and propagates', async () => {
    mode.list = 'bad'
    await expect(
      route(new Request(`${SITE}/ideas`), stubEnv(), undefined, recorder.ctx),
    ).rejects.toThrow()
  })
})

describe('the store’s hour', () => {
  it('reads each store URL once per window, and again after it', async () => {
    await get('/ideas')
    await get('/ideas')
    expect(storeReads()).toEqual([
      '/api/public/ideas?locale=en',
      '/api/public/ideas/tags?locale=en',
    ])
    await get('/ja/ideas')
    expect(storeReads()).toHaveLength(4)
    cache.advance(IDEAS_REVALIDATE_SECONDS)
    await get('/ideas')
    expect(storeReads()).toHaveLength(6)
  })

  it('caches an open idea read under its own key', async () => {
    await get(`/ideas?category=legal&idea=${OPEN}`)
    await get(`/ideas?category=legal&idea=${OPEN}`)
    expect(
      storeReads().filter((r) => r.startsWith(`/api/public/ideas/${OPEN}`)),
    ).toHaveLength(1)
  })

  it('an outage is never served from the cache once the store is back', async () => {
    mode.list = 500
    await get('/ideas')
    mode.list = 'ok'
    const { html } = await get('/ideas')
    expect(html).toContain('id="find-h"')
    expect(
      storeReads().filter((r) => r === '/api/public/ideas?locale=en'),
    ).toHaveLength(2)
  })

  it('a crawler on a filter URL is refused before any read', async () => {
    const { response } = await get('/ideas?tag=smb', {
      'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
    })
    expect(response.status).toBe(403)
    expect(storeReads()).toEqual([])
  })
})
