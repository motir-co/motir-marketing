// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchIdea,
  fetchIdeas,
  fetchIdeaTags,
  IDEAS_REVALIDATE_SECONDS,
} from '@/lib/ideas'
import type { Env } from '@/worker/env'
import {
  defaultEdgeCache,
  IDEAS_CACHE_CONTROL,
  ideasSource,
  type EdgeCache,
} from '@/worker/ideasStore'
import ideasFixture from '../../e2e/fixtures/ideas.json'
import tagsFixture from '../../e2e/fixtures/ideas-tags.json'
import ideaFixture from '../../e2e/fixtures/idea-stop-returns-before-they-happen.json'
import { MemoryCache, waitUntilRecorder } from './ideasCache'

/*
 * THE IDEA STORE'S HOUR (MOTIR-10755): `ideasSource` on its own, against an
 * in-memory `caches.default` on a controlled clock.
 */

const APP = 'https://app.worker.test'
const env = { MOTIR_APP_ORIGIN: APP } as Env
const LIST = `${APP}/api/public/ideas?locale=en`

afterEach(() => {
  vi.unstubAllGlobals()
})

function origin(answer: () => Response | Promise<Response>) {
  const reads: string[] = []
  const fetch = vi.fn(async (request: Request) => {
    reads.push(request.url)
    return answer()
  })
  return { fetch, reads }
}

function setup(
  answer: () => Response | Promise<Response> = () =>
    Response.json(ideasFixture),
) {
  const cache = new MemoryCache()
  const store = origin(answer)
  const recorder = waitUntilRecorder()
  const source = ideasSource(env, recorder.ctx, { cache, fetch: store.fetch })
  return { cache, store, recorder, source }
}

describe('ideasSource', () => {
  it('reads from the app origin the Worker names', () => {
    expect(ideasSource(env, waitUntilRecorder().ctx).origin).toBe(APP)
  })

  it('reads the store once per window, then again after it', async () => {
    const { cache, store, recorder, source } = setup()
    await fetchIdeas({ tags: [] }, 'en', source)
    await recorder.settle()
    await fetchIdeas({ tags: [] }, 'en', source)
    expect(store.reads).toEqual([LIST])

    cache.advance(IDEAS_REVALIDATE_SECONDS - 1)
    await fetchIdeas({ tags: [] }, 'en', source)
    expect(store.reads).toHaveLength(1)

    cache.advance(1)
    const list = await fetchIdeas({ tags: [] }, 'en', source)
    expect(store.reads).toEqual([LIST, LIST])
    expect(list.total).toBe(ideasFixture.total)
  })

  it('serves a hit with the same body the store answered', async () => {
    const { recorder, source } = setup()
    const first = await fetchIdeas({ tags: [] }, 'en', source)
    await recorder.settle()
    expect(await fetchIdeas({ tags: [] }, 'en', source)).toEqual(first)
  })

  it('stores the copy for the hour, whatever the store said', async () => {
    const { cache, recorder, source } = setup(() =>
      Response.json(ideasFixture, {
        headers: { 'cache-control': 'private, no-store', 'set-cookie': 'a=b' },
      }),
    )
    await fetchIdeas({ tags: [] }, 'en', source)
    await recorder.settle()
    const stored = cache.entries.get(LIST)
    expect(stored?.headers).toEqual(
      expect.arrayContaining([['cache-control', IDEAS_CACHE_CONTROL]]),
    )
    expect(stored?.headers.map(([name]) => name)).not.toContain('set-cookie')
    expect(IDEAS_CACHE_CONTROL).toBe(
      `public, max-age=${IDEAS_REVALIDATE_SECONDS}`,
    )
  })

  it('keys every read by its full store URL: per locale and per filter', async () => {
    const { store, recorder, source } = setup(() => Response.json(ideasFixture))
    await fetchIdeas({ tags: [] }, 'en', source)
    await fetchIdeas({ tags: [] }, 'de', source)
    await fetchIdeas({ tags: ['smb'], category: 'ecommerce' }, 'en', source)
    await recorder.settle()
    await fetchIdeas({ tags: [] }, 'de', source)
    await fetchIdeas({ tags: ['smb'], category: 'ecommerce' }, 'en', source)
    expect(store.reads).toEqual([
      LIST,
      `${APP}/api/public/ideas?locale=de`,
      `${APP}/api/public/ideas?category=ecommerce&tag=smb&locale=en`,
    ])
  })

  it('caches the tag and single-idea reads under their own keys', async () => {
    const cache = new MemoryCache()
    const recorder = waitUntilRecorder()
    const reads: string[] = []
    const source = ideasSource(env, recorder.ctx, {
      cache,
      fetch: async (request) => {
        reads.push(request.url)
        return request.url.includes('/tags')
          ? Response.json(tagsFixture)
          : Response.json(ideaFixture)
      },
    })
    await fetchIdeaTags('ja', source)
    await fetchIdea('stop-returns-before-they-happen', 'ja', source)
    await recorder.settle()
    await fetchIdeaTags('ja', source)
    await fetchIdea('stop-returns-before-they-happen', 'ja', source)
    expect(reads).toEqual([
      `${APP}/api/public/ideas/tags?locale=ja`,
      `${APP}/api/public/ideas/stop-returns-before-they-happen?locale=ja`,
    ])
  })

  it.each([
    ['a 5xx', () => new Response('{}', { status: 503 })],
    ['a 404', () => new Response('{}', { status: 404 })],
  ])('never stores %s', async (_name, answer) => {
    const { cache, store, recorder, source } = setup(answer)
    await source.fetch(LIST)
    await source.fetch(LIST)
    expect(recorder.count).toBe(0)
    expect(cache.entries.size).toBe(0)
    expect(store.reads).toEqual([LIST, LIST])
  })

  it('a 404 for one idea is null, read again next time', async () => {
    const { store, source } = setup(() => new Response('{}', { status: 404 }))
    await expect(fetchIdea('gone', 'en', source)).resolves.toBeNull()
    await expect(fetchIdea('gone', 'en', source)).resolves.toBeNull()
    expect(store.reads).toHaveLength(2)
  })

  it('a network failure is the unavailable error, and is not remembered', async () => {
    let down = true
    const { store, recorder, source } = setup(() => {
      if (down) throw new TypeError('fetch failed')
      return Response.json(ideasFixture)
    })
    await expect(fetchIdeas({ tags: [] }, 'en', source)).rejects.toMatchObject({
      name: 'IdeasUnavailableError',
      status: null,
    })
    down = false
    await expect(fetchIdeas({ tags: [] }, 'en', source)).resolves.toMatchObject(
      { total: ideasFixture.total },
    )
    await recorder.settle()
    expect(store.reads).toEqual([LIST, LIST])
  })

  it('a cache that throws on read falls through to a live read', async () => {
    const broken: EdgeCache = {
      match: async () => {
        throw new Error('cache down')
      },
      put: async () => {
        throw new Error('cache down')
      },
    }
    const store = origin(() => Response.json(ideasFixture))
    const recorder = waitUntilRecorder()
    const source = ideasSource(env, recorder.ctx, {
      cache: broken,
      fetch: store.fetch,
    })
    await expect(fetchIdeas({ tags: [] }, 'en', source)).resolves.toMatchObject(
      { total: ideasFixture.total },
    )
    await expect(recorder.settle()).resolves.toBeDefined()
    await fetchIdeas({ tags: [] }, 'en', source)
    expect(store.reads).toEqual([LIST, LIST])
  })

  it('reads live when the runtime has no cache', async () => {
    const store = origin(() => Response.json(ideasFixture))
    const recorder = waitUntilRecorder()
    const source = ideasSource(env, recorder.ctx, {
      cache: null,
      fetch: store.fetch,
    })
    await fetchIdeas({ tags: [] }, 'en', source)
    await fetchIdeas({ tags: [] }, 'en', source)
    expect(recorder.count).toBe(0)
    expect(store.reads).toHaveLength(2)
  })

  it('uses the global fetch and caches.default by default', async () => {
    const cache = new MemoryCache()
    const fetch = vi.fn(async () => Response.json(ideasFixture))
    vi.stubGlobal('caches', { default: cache })
    vi.stubGlobal('fetch', fetch)
    const recorder = waitUntilRecorder()
    const source = ideasSource(env, recorder.ctx)
    await fetchIdeas({ tags: [] }, 'en', source)
    await recorder.settle()
    await fetchIdeas({ tags: [] }, 'en', source)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(cache.entries.has(LIST)).toBe(true)
  })
})

describe('defaultEdgeCache', () => {
  it('is caches.default where the runtime has it, else none', () => {
    const cache = new MemoryCache()
    vi.stubGlobal('caches', undefined)
    expect(defaultEdgeCache()).toBeNull()
    vi.stubGlobal('caches', {})
    expect(defaultEdgeCache()).toBeNull()
    vi.stubGlobal('caches', { default: cache })
    expect(defaultEdgeCache()).toBe(cache)
  })
})
