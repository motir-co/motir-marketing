// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type satori from 'satori-worker/standalone'
import type { ReactElement } from 'react'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { OG_FONT_FAMILY, BRAND_GLYPH_HEX } from '@motir/brand'
import {
  OG_TEXT_HEX,
  OG_TEXT_SECONDARY_HEX,
  OG_WASH,
} from '@/app/_brand/ogColours'
import type { Env } from '@/worker/env'
import {
  FALLBACK_TAGLINE,
  projectCardElement,
  projectCardText,
} from '@/worker/share/drawProjectCard'
import { shareEngine, type ShareEngine } from '@/worker/share/engine'
import { resetShareFonts, SHARE_FONT_PATH } from '@/worker/share/fonts'
import { readProjectCard } from '@/worker/share/projectCardRead'
import {
  OG_CACHE_CONTROL,
  OG_CACHE_SECONDS,
  projectShareImageHandler,
  shareCardKey,
} from '@/worker/share/projectShareImage'
import type { RouteContext } from '@/worker/routes'
import { MemoryCache } from './ideasCache'

/*
 * THE `projectImage` SLOT (MOTIR-10757): the project share card, drawn with
 * the real satori and resvg (their wasm read from disk, as wrangler would
 * compile it), against a stub API, a stub assets binding serving the real
 * Inter faces and an in-memory edge cache on a controlled clock.
 */

const require = createRequire(import.meta.url)
const APP = 'https://app.worker.test'
const SITE = 'https://motir.co'
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

let engine: ShareEngine
beforeAll(async () => {
  // The Worker's own engine module: its `.wasm` imports are compiled as
  // wrangler compiles them (`vitest.config.mts`, `compiledWasm`).
  engine = await shareEngine()
})

const PROJECT = {
  name: 'Acme Rockets',
  identifier: 'ACME',
  workspaceName: 'Acme',
  publicTagline: 'Rockets, in public',
}

type Answer = 'ok' | 404 | 500 | 'throw' | 'hang'
let answer: Answer
let apiReads: string[]
let fontReads: string[]
let fontsBroken: boolean
let cache: MemoryCache
let draws: number

beforeEach(() => {
  answer = 'ok'
  apiReads = []
  fontReads = []
  fontsBroken = false
  draws = 0
  cache = new MemoryCache()
  resetShareFonts()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.stubGlobal('fetch', async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input))
    apiReads.push(url.toString())
    if (answer === 'throw') throw new TypeError('fetch failed')
    if (answer === 'hang')
      return new Promise<Response>((_resolve, reject) =>
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason),
        ),
      )
    if (answer !== 'ok') return new Response('{}', { status: answer })
    const identifier = decodeURIComponent(url.pathname.split('/').pop()!)
    return Response.json({ ...PROJECT, identifier })
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const env: Env = {
  ASSETS: {
    async fetch(input) {
      const url = new URL(input instanceof Request ? input.url : input)
      fontReads.push(url.pathname)
      if (fontsBroken) return new Response('gone', { status: 404 })
      const file = url.pathname.slice(SHARE_FONT_PATH.length)
      return new Response(
        readFileSync(require.resolve(`@motir/brand/fonts/${file}`)),
      )
    },
  },
  MOTIR_APP_ORIGIN: APP,
  MOTIR_SITE_ORIGIN: SITE,
}

const handler = projectShareImageHandler({ cache: null })

function countingHandler(withCache: MemoryCache | null = cache) {
  return projectShareImageHandler({
    cache: withCache,
    engine: async () => ({
      Resvg: engine.Resvg,
      satori: (async (...args: Parameters<typeof satori>) => {
        draws += 1
        return engine.satori(...args)
      }) as typeof satori,
    }),
  })
}

function context(path: string, locale = 'en' as RouteContext['locale']) {
  const prefix = locale === 'en' ? '' : `/${locale}`
  return {
    env,
    ctx: { waitUntil: () => {} },
    locale,
    path,
    url: new URL(`${SITE}${prefix}${path}`),
  } satisfies RouteContext
}

function dimensions(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

async function image(
  path = '/p/ACME/opengraph-image',
  locale: RouteContext['locale'] = 'en',
  h = countingHandler(),
) {
  const response = await h(new Request(`${SITE}${path}`), context(path, locale))
  return { response, bytes: new Uint8Array(await response.arrayBuffer()) }
}

describe('the drawn card', () => {
  it.each([
    ['en', '/p/ACME/opengraph-image'],
    ['de', '/p/ACME/opengraph-image-abc123'],
  ] as const)('answers a 1200 × 630 PNG under %s', async (locale, path) => {
    const { response, bytes } = await image(path, locale, handler)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toBe(OG_CACHE_CONTROL)
    expect([...bytes.slice(0, 8)]).toEqual(PNG_SIGNATURE)
    expect(dimensions(bytes)).toEqual({ width: 1200, height: 630 })
  })

  it('reads the project from the Worker’s app origin', async () => {
    await image('/p/ACME/opengraph-image', 'en', handler)
    expect(apiReads).toEqual([`${APP}/api/public/p/ACME`])
  })
})

describe('the element tree is the Next route’s', () => {
  type Node = ReactElement<{
    style?: Record<string, unknown>
    children?: unknown
    width?: number
    height?: number
    fill?: string
  }>
  const tree = projectCardElement(
    projectCardText('ACME', PROJECT as never),
  ) as Node
  const kids = (node: Node) => [node.props.children].flat() as Node[]

  it('canvas, padding, wash and family', () => {
    expect(tree.props.style).toMatchObject({
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      padding: '80px',
      background: OG_WASH,
      fontFamily: OG_FONT_FAMILY,
      justifyContent: 'space-between',
    })
  })

  it('glyph 72 and wordmark 30 / 700', () => {
    const [brand] = kids(tree)
    const [glyph, wordmark] = kids(brand)
    expect(glyph.props).toMatchObject({ width: 72, height: 72 })
    expect(kids(glyph)[0].props.fill).toBe(BRAND_GLYPH_HEX)
    expect(wordmark.props.style).toMatchObject({
      fontSize: 30,
      fontWeight: 700,
      color: OG_TEXT_HEX,
    })
    expect(wordmark.props.children).toBe('Motir')
  })

  it('eyebrow 24 / 600, headline 60 / 800 / 1.1, lede 28 at 920', () => {
    const [, words] = kids(tree)
    const [eyebrow, headline, lede] = kids(words)
    expect(eyebrow.props.style).toMatchObject({
      fontSize: 24,
      fontWeight: 600,
      color: OG_TEXT_SECONDARY_HEX,
    })
    expect(eyebrow.props.children).toBe('Acme')
    expect(headline.props.style).toMatchObject({
      fontSize: 60,
      fontWeight: 800,
      lineHeight: 1.1,
      color: OG_TEXT_HEX,
    })
    expect(headline.props.children).toBe('Acme Rockets')
    expect(lede.props.style).toMatchObject({
      fontSize: 28,
      maxWidth: 920,
      color: OG_TEXT_SECONDARY_HEX,
    })
    expect(lede.props.children).toBe('Rockets, in public')
  })

  it('falls back to the key and the fixed line', () => {
    expect(projectCardText('ACME', null)).toEqual({
      eyebrow: 'ACME',
      name: 'ACME',
      tagline: FALLBACK_TAGLINE,
    })
  })
})

describe('the fonts', () => {
  it('fetches the three Inter faces once per isolate', async () => {
    await image('/p/ACME/opengraph-image', 'en', handler)
    expect(fontReads).toEqual([
      '/_og/fonts/Inter-Regular.ttf',
      '/_og/fonts/Inter-Bold.ttf',
      '/_og/fonts/Inter-ExtraBold.ttf',
    ])
    await image('/p/BETA/opengraph-image', 'en', handler)
    expect(fontReads).toHaveLength(3)
  })

  it('a failed font read is not kept: 503 now, fetched again next time', async () => {
    fontsBroken = true
    const { response } = await image('/p/ACME/opengraph-image', 'en', handler)
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    fontsBroken = false
    const again = await image('/p/ACME/opengraph-image', 'en', handler)
    expect(again.response.status).toBe(200)
    expect(fontReads).toHaveLength(6)
  })
})

describe('one card per project per window', () => {
  it('draws once, then answers the same bytes from the cache', async () => {
    const first = await image()
    expect(apiReads).toHaveLength(1)
    expect(draws).toBe(1)
    const second = await image('/p/ACME/opengraph-image', 'de')
    expect(second.bytes).toEqual(first.bytes)
    expect(apiReads).toHaveLength(1)
    expect(draws).toBe(1)
    const stored = cache.entries.get(shareCardKey(SITE, 'ACME').url)
    expect(stored?.headers).toEqual(
      expect.arrayContaining([['cache-control', OG_CACHE_CONTROL]]),
    )
    expect(OG_CACHE_SECONDS).toBe(3600)
  })

  it('another project draws again, and so does the next window', async () => {
    await image()
    await image('/p/BETA/opengraph-image')
    expect(draws).toBe(2)
    cache.advance(OG_CACHE_SECONDS)
    await image()
    expect(draws).toBe(3)
    expect(apiReads).toHaveLength(3)
  })

  it('keys by the identifier alone, URL-encoded', () => {
    expect(shareCardKey(SITE, 'A B/C').url).toBe(`${SITE}/__og/p/A%20B%2FC`)
  })

  it('ten concurrent requests share one read and one draw', async () => {
    const h = countingHandler()
    const all = await Promise.all(
      Array.from({ length: 10 }, () =>
        image('/p/ACME/opengraph-image', 'en', h),
      ),
    )
    expect(apiReads).toHaveLength(1)
    expect(draws).toBe(1)
    expect(new Set(all.map((a) => a.bytes.length)).size).toBe(1)
  })

  it('draws different projects one at a time', async () => {
    let running = 0
    let peak = 0
    const h = projectShareImageHandler({
      cache: null,
      engine: async () => ({
        Resvg: engine.Resvg,
        satori: (async (...args: Parameters<typeof satori>) => {
          running += 1
          peak = Math.max(peak, running)
          await new Promise((r) => setTimeout(r, 5))
          try {
            return await engine.satori(...args)
          } finally {
            running -= 1
          }
        }) as typeof satori,
      }),
    })
    const all = await Promise.all(
      Array.from({ length: 10 }, (_, n) =>
        image(`/p/P${n}/opengraph-image`, 'en', h),
      ),
    )
    expect(peak).toBe(1)
    expect(all.every((a) => a.response.status === 200)).toBe(true)
  })

  it('a cache that fails is skipped', async () => {
    const broken = {
      match: async () => {
        throw new Error('down')
      },
      put: async () => {
        throw new Error('down')
      },
    }
    const h = projectShareImageHandler({
      cache: broken,
      engine: async () => engine,
    })
    const { response } = await image('/p/ACME/opengraph-image', 'en', h)
    expect(response.status).toBe(200)
  })
})

describe('when the project cannot be read', () => {
  it('a 404 draws the key card and keeps it', async () => {
    answer = 404
    const { response } = await image()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(OG_CACHE_CONTROL)
    expect(cache.entries.size).toBe(1)
  })

  it.each([
    ['a 5xx', 500 as Answer],
    ['a network error', 'throw' as Answer],
  ])('%s draws the key card, no-store, and keeps nothing', async (_n, a) => {
    answer = a
    const { response, bytes } = await image()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(dimensions(bytes)).toEqual({ width: 1200, height: 630 })
    expect(cache.entries.size).toBe(0)
    answer = 'ok'
    await image()
    expect(apiReads).toHaveLength(2)
  })

  it('a read that runs out of time is a failure', async () => {
    answer = 'hang'
    await expect(readProjectCard(APP, 'ACME', 10)).resolves.toEqual({
      status: 'failed',
    })
  })

  it('an undecodable identifier draws as it was written', async () => {
    const { response } = await image(
      '/p/%E0%A4%A/opengraph-image',
      'en',
      handler,
    )
    expect(response.status).toBe(200)
  })
})
