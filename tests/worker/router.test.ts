// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCALES } from '@/i18n/routing'
import type { Env } from '@/worker/env'
import { requestLogLine } from '@/worker/requestLog'
import { notFoundPage } from '@/worker/notFound'
import { LANGUAGE_VARY, readCookie, route, splitLocale } from '@/worker/router'
import {
  ROUTES,
  slotFor,
  type RouteContext,
  type RouteSlot,
} from '@/worker/routes'

/*
 * THE WORKER'S ROUTER (MOTIR-10752), driven with synthetic requests, a stub
 * assets binding that records what it was asked for, and stub handlers that
 * record every call — so a refusal can be shown to reach nothing at all.
 */

const ORIGIN = 'https://motir.co'

interface Calls {
  assets: string[]
  handlers: { slot: string; context: RouteContext }[]
}

function stubEnv(calls: Calls): Env {
  return {
    ASSETS: {
      async fetch(input) {
        const url = new URL(input instanceof Request ? input.url : input)
        calls.assets.push(url.pathname)
        if (url.pathname.endsWith('/404') || url.pathname === '/404')
          return new Response(`room ${url.pathname}`, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          })
        if (url.pathname === '/' || url.pathname === '/price')
          return new Response(`page ${url.pathname}`, {
            status: 200,
            headers: { 'Content-Type': 'text/html', Vary: 'Accept-Encoding' },
          })
        return new Response(null, { status: 404 })
      },
    },
    MOTIR_APP_ORIGIN: 'https://app.test.motir.co',
    MOTIR_SITE_ORIGIN: ORIGIN,
  }
}

function stubRoutes(calls: Calls): RouteSlot[] {
  return ROUTES.map((slot) => ({
    ...slot,
    handler: async (_request: Request, context: RouteContext) => {
      calls.handlers.push({ slot: slot.name, context })
      return new Response(`slot ${slot.name}`, { status: 200 })
    },
  }))
}

let calls: Calls
let logged: string[]

beforeEach(() => {
  calls = { assets: [], handlers: [] }
  logged = []
  vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
    logged.push(String(line))
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function get(
  path: string,
  headers: Record<string, string | undefined> = {},
): Request {
  const present = Object.entries(headers).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  )
  return new Request(`${ORIGIN}${path}`, { headers: present })
}

async function send(
  path: string,
  headers: Record<string, string | undefined> = {},
) {
  return route(get(path, headers), stubEnv(calls), stubRoutes(calls))
}

const LIVE = [
  '/p/ACME',
  '/p/ACME/changelog',
  '/p/ACME/opengraph-image',
  '/explore',
  '/explore/topic/devtools',
  '/ideas',
  '/motir-builds-itself',
]

const REFUSED =
  'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)'
const GOOGLEBOT =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const SLACKBOT = 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)'

describe('the crawler refusals', () => {
  it.each([
    ...LIVE,
    ...LIVE.map((path) => `/de${path}`),
    '/does-not-exist',
    '/sitemap-projects.xml',
  ])(
    'refuses a refused crawler on %s with a 403 that reaches nothing',
    async (path) => {
      const response = await send(path, { 'user-agent': REFUSED })
      expect(response.status).toBe(403)
      expect(calls.handlers).toHaveLength(0)
      expect(calls.assets).toHaveLength(0)
    },
  )

  it('still lets a refused crawler read robots.txt, as the Next router did', async () => {
    const response = await send('/robots.txt', { 'user-agent': REFUSED })
    expect(response.status).not.toBe(403)
    expect(calls.assets).toEqual(['/robots.txt', '/404'])
  })

  it.each([
    '/explore?category=devtools',
    '/explore/topic/devtools?sort=new',
    '/ideas?tag=planning',
    '/ja/ideas?tag=planning',
    '/fr/explore?q=board',
  ])(
    'refuses any crawler on the filter URL %s before a handler runs',
    async (path) => {
      const response = await send(path, { 'user-agent': GOOGLEBOT })
      expect(response.status).toBe(403)
      expect(calls.handlers).toHaveLength(0)
      expect(calls.assets).toHaveLength(0)
    },
  )

  it('serves a link previewer on the same filter URL', async () => {
    const response = await send('/ideas?tag=planning', {
      'user-agent': SLACKBOT,
    })
    expect(response.status).toBe(200)
    expect(calls.handlers.map((call) => call.slot)).toEqual(['ideas'])
  })

  it('serves a crawler on a live address with no query', async () => {
    const response = await send('/explore', { 'user-agent': GOOGLEBOT })
    expect(response.status).toBe(200)
    expect(calls.handlers.map((call) => call.slot)).toEqual(['explore'])
  })
})

describe('the /ideas trim', () => {
  const five = '?tag=a&tag=b&tag=a&tag=c&tag=d&tag=e&sort=new'

  it.each(['', '/de'])(
    'trims five tags to the first three distinct under "%s"',
    async (prefix) => {
      const response = await send(`${prefix}/ideas${five}`)
      expect(response.status).toBe(308)
      const location = new URL(response.headers.get('location')!)
      expect(location.pathname).toBe(`${prefix}/ideas`)
      expect(location.searchParams.getAll('tag')).toEqual(['a', 'b', 'c'])
      expect(location.searchParams.get('sort')).toBe('new')
      expect(calls.handlers).toHaveLength(0)
    },
  )

  it('leaves three tags alone', async () => {
    const response = await send('/ideas?tag=a&tag=b&tag=c')
    expect(response.status).toBe(200)
    expect(calls.handlers.map((call) => call.slot)).toEqual(['ideas'])
  })
})

describe('the request log', () => {
  it('writes exactly one line per request, with every field and no client address', async () => {
    await send('/explore?q=x', {
      'user-agent': 'Mozilla/5.0 test',
      'cf-connecting-ip': '203.0.113.9',
      'x-forwarded-for': '198.51.100.7',
      'x-real-ip': '192.0.2.44',
    })
    expect(logged).toHaveLength(1)
    const line = JSON.parse(logged[0]!) as Record<string, unknown>
    expect(line).toEqual({
      msg: 'request',
      method: 'GET',
      path: '/explore',
      query: '?q=x',
      ua: 'Mozilla/5.0 test',
      edge: null,
      refused: false,
    })
    for (const address of ['203.0.113.9', '198.51.100.7', '192.0.2.44'])
      expect(logged[0]).not.toContain(address)
  })

  it('marks a refused request', async () => {
    await send('/p/ACME', { 'user-agent': REFUSED })
    expect(logged).toHaveLength(1)
    expect(JSON.parse(logged[0]!).refused).toBe(true)
  })

  it.each(['/zh-TW/price', '/', '/does-not-exist', '/en/ideas'])(
    'logs a request it redirects or hands on (%s) once too',
    async (path) => {
      await send(path)
      expect(logged).toHaveLength(1)
    },
  )

  it('reads the edge from the Cloudflare data, lower-cased, and cuts long fields', () => {
    const request = get(`/ideas?${'q'.repeat(300)}`, {
      'user-agent': 'u'.repeat(300),
    })
    Object.defineProperty(request, 'cf', { value: { colo: 'AMS' } })
    const line = requestLogLine(request, false)
    expect(line.edge).toBe('ams')
    expect(line.query).toHaveLength(200)
    expect(line.ua).toHaveLength(200)
    expect(requestLogLine(get('/ideas'), false).ua).toBe('')
  })
})

describe('the bare / language', () => {
  it('sends a German browser to /de with a 307 that is never stored', async () => {
    const response = await send('/', {
      'accept-language': 'de-DE,de;q=0.9,en;q=0.5',
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${ORIGIN}/de`)
    expect(response.headers.get('vary')).toBe(LANGUAGE_VARY)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(calls.assets).toHaveLength(0)
  })

  it.each([{ 'accept-language': 'en-GB,en;q=0.9' }, {}])(
    'serves the built English page, marked as varying, for %j',
    async (headers) => {
      const response = await send('/', headers)
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('page /')
      expect(response.headers.get('vary')).toBe(
        `Accept-Encoding, ${LANGUAGE_VARY}`,
      )
      expect(calls.assets).toEqual(['/'])
    },
  )

  it('lets the remembered choice beat the browser', async () => {
    const response = await send('/', {
      cookie: 'other=1; NEXT_LOCALE=fr',
      'accept-language': 'de',
    })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${ORIGIN}/fr`)
  })

  it('serves English to a visitor who chose it, whatever the browser says', async () => {
    const response = await send('/', {
      cookie: 'NEXT_LOCALE=en',
      'accept-language': 'ja',
    })
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('page /')
  })

  it('skips a cookie that names no locale', async () => {
    const response = await send('/', {
      cookie: 'NEXT_LOCALE=xx',
      'accept-language': 'ko',
    })
    expect(response.headers.get('location')).toBe(`${ORIGIN}/ko`)
  })

  it('keeps the query on the redirect', async () => {
    const response = await send('/?ref=hn', { 'accept-language': 'ja' })
    expect(response.headers.get('location')).toBe(`${ORIGIN}/ja?ref=hn`)
  })

  it.each(['/price', '/explore', '/ideas', '/does-not-exist'])(
    'never moves %s to another language',
    async (path) => {
      for (const headers of [
        { 'accept-language': 'de' },
        { cookie: 'NEXT_LOCALE=de' },
      ]) {
        const response = await send(path, headers)
        expect([307, 308]).not.toContain(response.status)
      }
    },
  )
})

describe('the case and prefix redirects', () => {
  it.each([
    ['/zh-TW/price?x=1', '/zh-tw/price?x=1'],
    ['/DE/explore', '/de/explore'],
    ['/Ja', '/ja'],
  ])(
    'answers %s with a permanent redirect to %s and no Vary',
    async (from, to) => {
      const response = await send(from)
      expect(response.status).toBe(308)
      expect(response.headers.get('location')).toBe(`${ORIGIN}${to}`)
      expect(response.headers.get('vary')).toBeNull()
    },
  )

  it.each([
    ['/en/ideas', '/ideas'],
    ['/en/p/ACME', '/p/ACME'],
    ['/en/explore/topic/devtools?sort=new', '/explore/topic/devtools?sort=new'],
  ])('sends the English-prefixed live address %s to %s', async (from, to) => {
    const response = await send(from)
    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(`${ORIGIN}${to}`)
  })

  it('leaves other English-prefixed addresses to the assets rules', async () => {
    const response = await send('/en/price')
    expect(calls.assets[0]).toBe('/en/price')
    expect(response.status).toBe(404)
  })

  it('leaves a word that only looks like a locale alone', async () => {
    const response = await send('/Pricing')
    expect(response.status).toBe(404)
  })
})

describe('the assets fallthrough', () => {
  it.each([
    ['/de/does-not-exist', '/de/404', 'room /de/404'],
    ['/does-not-exist', '/404', 'room /404'],
    ['/explore/elsewhere', '/404', 'room /404'],
  ])(
    'answers %s with the built room %s and status 404',
    async (path, room, body) => {
      const response = await send(path)
      expect(calls.assets).toEqual([path, room])
      expect(response.status).toBe(404)
      expect(await response.text()).toBe(body)
      expect(calls.handlers).toHaveLength(0)
    },
  )

  it('returns what the assets answer for a file as it is', async () => {
    const response = await send('/price')
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('page /price')
    expect(calls.assets).toEqual(['/price'])
  })

  it('builds the room for a locale on its own', async () => {
    const response = await notFoundPage(
      new URL(`${ORIGIN}/x`),
      'pt',
      stubEnv(calls),
    )
    expect(response.status).toBe(404)
    expect(calls.assets).toEqual(['/pt/404'])
  })
})

describe('the route table', () => {
  it.each([
    ['/p/ACME', 'project'],
    ['/p/ACME/requests/new', 'project'],
    ['/p/ACME/opengraph-image', 'projectImage'],
    ['/explore', 'explore'],
    ['/explore/topic/ai', 'explore'],
    ['/ideas', 'ideas'],
    ['/motir-builds-itself', 'buildsItself'],
    ['/sitemap-projects.xml', 'projectSitemap'],
  ])(
    'sends %s to the %s slot, with the locale and the path',
    async (path, slot) => {
      await send(path)
      expect(calls.handlers.map((call) => call.slot)).toEqual([slot])
      const { context } = calls.handlers[0]!
      expect(context.locale).toBe('en')
      expect(context.path).toBe(path)
      expect(context.env.MOTIR_APP_ORIGIN).toBe('https://app.test.motir.co')
    },
  )

  it.each(LOCALES.filter((locale) => locale !== 'en'))(
    'strips the %s prefix before matching',
    async (locale) => {
      await send(`/${locale}/p/ACME/changelog`)
      const { context } = calls.handlers[0]!
      expect(context.locale).toBe(locale)
      expect(context.path).toBe('/p/ACME/changelog')
    },
  )

  it('keeps the project sitemap a root file', () => {
    expect(slotFor('/sitemap-projects.xml', 'de')).toBeUndefined()
    expect(slotFor('/sitemap-projects.xml', 'en')?.name).toBe('projectSitemap')
  })
})

describe('the helpers', () => {
  it('splits a locale prefix off a path', () => {
    expect(splitLocale('/zh-tw/ideas')).toEqual({
      locale: 'zh-tw',
      path: '/ideas',
      prefixed: true,
    })
    expect(splitLocale('/ideas')).toEqual({
      locale: 'en',
      path: '/ideas',
      prefixed: false,
    })
    expect(splitLocale('/de')).toEqual({
      locale: 'de',
      path: '/',
      prefixed: true,
    })
  })

  it('reads a cookie, decoded, and nothing when it is absent', () => {
    expect(readCookie('a=1; NEXT_LOCALE=zh-tw', 'NEXT_LOCALE')).toBe('zh-tw')
    expect(readCookie('NEXT_LOCALE=%E0%A4%A', 'NEXT_LOCALE')).toBe('%E0%A4%A')
    expect(readCookie('a=1', 'NEXT_LOCALE')).toBeNull()
    expect(readCookie(null, 'NEXT_LOCALE')).toBeNull()
  })
})

/*
 * THE REDIRECT ARM CANNOT COME BACK SILENTLY (Story MOTIR-4528 · MOTIR-9517).
 *
 * ADR §8 Amendment 3 rule 2: a retired workspace name stops answering and
 * NOTHING redirects. This source guard read the Next `proxy.ts` and
 * `lib/hostResolution.ts` in `tests/host/retiredHostGate.test.ts`; all three
 * went with the decommission (MOTIR-10639), so it reads the router that took
 * the request path over.
 */
describe('the redirect arm cannot come back silently', () => {
  it('worker/router.ts names no alias outcome and no redirect route', () => {
    const source = readFileSync('worker/router.ts', 'utf8')
    // Whole words: a locale hop is the site's own redirect, not this.
    for (const name of [
      /\bPublicHostAlias\b/,
      /\bredirectTo\b/,
      /action: 'redirect'/,
    ]) {
      expect(source, `worker/router.ts contains ${name}`).not.toMatch(name)
    }
  })
})
