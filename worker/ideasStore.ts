import { IDEAS_REVALIDATE_SECONDS, type IdeasSource } from '@/lib/ideas'
import type { Env, WaitUntil } from './env'

/*
 * THE IDEA STORE'S HOUR, HELD IN CLOUDFLARE'S EDGE CACHE (MOTIR-10755).
 *
 * Under Next the three store reads carried `next: { revalidate: 3600 }`: one
 * read per hour per server, the window in which a retired idea may linger. A
 * Worker runs in many isolates with no memory they share, so a module-level
 * map would be an hour per isolate — which is no window at all. The hour is
 * therefore held where every request on a data centre sees it: the Cache API
 * (`caches.default`), keyed by the full store URL. That URL already carries
 * `locale=` and every filter (`lib/ideas.ts`), so each locale and each view is
 * its own entry. The key is spelled on the SITE's origin, like the share
 * card's (`shareCardKey`): Cloudflare's Cache API keeps only keys on the
 * zone the Worker runs on, and the store is on the app's.
 *
 *  • A HIT is answered from the cache, and the store is not read.
 *  • A MISS reads the store. A 200 is answered and a copy is stored, through
 *    `waitUntil` so the page does not wait on the write, marked
 *    `public, max-age=IDEAS_REVALIDATE_SECONDS` — the edge cache honours the
 *    stored response's own `Cache-Control`, so the window is ours, whatever
 *    the store's header says.
 *  • ANYTHING ELSE IS NEVER STORED: a 5xx, a 404 (an unknown or retired idea),
 *    a network failure. An outage ends the moment the store answers again.
 *  • A CACHE THAT FAILS is skipped: the read goes to the store, live. The page
 *    never fails because the cache did.
 *
 * In production the hour is per Cloudflare data centre, which the story
 * accepts; under `wrangler dev` it is per process.
 */

/** The part of the Cache API this uses — `caches.default`, or a test's stand-in. */
export interface EdgeCache {
  match(request: Request): Promise<Response | undefined>
  put(request: Request, response: Response): Promise<void>
}

/** What the store answer is stored as. */
export const IDEAS_CACHE_CONTROL = `public, max-age=${IDEAS_REVALIDATE_SECONDS}`

/** Cloudflare's per-data-centre cache, when the runtime has one. */
export function defaultEdgeCache(): EdgeCache | null {
  const storage = (globalThis as { caches?: { default?: EdgeCache } }).caches
  return storage?.default ?? null
}

/**
 * The cache key for one store read: the full store URL, carried on a path no
 * page has, under the site's own origin.
 */
export function ideasCacheKey(siteOrigin: string, url: string): Request {
  return new Request(`${siteOrigin}/__ideas?u=${encodeURIComponent(url)}`, {
    method: 'GET',
  })
}

export interface IdeasSourceDeps {
  cache?: EdgeCache | null
  fetch?: (request: Request) => Promise<Response>
}

/** A copy of a 200 that the edge cache keeps for exactly the hour. */
function storable(response: Response): Response {
  const headers = new Headers()
  const type = response.headers.get('content-type')
  if (type) headers.set('content-type', type)
  headers.set('cache-control', IDEAS_CACHE_CONTROL)
  return new Response(response.clone().body, { status: 200, headers })
}

export function ideasSource(
  env: Env,
  ctx: WaitUntil,
  deps: IdeasSourceDeps = {},
): IdeasSource {
  const cache = deps.cache === undefined ? defaultEdgeCache() : deps.cache
  const live = deps.fetch ?? ((request: Request) => fetch(request))
  return {
    origin: env.MOTIR_APP_ORIGIN,
    async fetch(url) {
      const key = ideasCacheKey(env.MOTIR_SITE_ORIGIN, url)
      if (cache) {
        const hit = await cache.match(key).catch(() => undefined)
        if (hit) return hit
      }
      const response = await live(new Request(url, { method: 'GET' }))
      if (cache && response.status === 200)
        ctx.waitUntil(cache.put(key, storable(response)).catch(() => {}))
      return response
    },
  }
}
