import { defaultEdgeCache, type EdgeCache } from '../ideasStore'
import type { RouteContext } from '../routes'
import {
  drawProjectCard,
  projectCardText,
  type ProjectCardText,
} from './drawProjectCard'
import { shareEngine, type ShareEngine } from './engine'
import { shareFonts } from './fonts'
import { readProjectCard } from './projectCardRead'

/*
 * THE `projectImage` SLOT (MOTIR-10757): `/p/<identifier>/opengraph-image`, in
 * every locale — the project's 1200 × 630 social card, as a PNG.
 *
 * ⚠️ ONE DRAW PER PROJECT PER `OG_CACHE_SECONDS`, HELD IN THE EDGE CACHE. Every
 * project page advertises this card, so every crawler and unfurler that reads
 * one fetches it too, and a draw is the most expensive thing the site does
 * (drawn per request it took motir.co down on 2026-10-18). Under Next a
 * per-machine map held the drawn bytes for the hour (`app/_brand/
 * ogRenderGate.ts`); a Worker's isolates share no memory, so the bytes are
 * stored with the Cache API instead, under a synthetic key holding the
 * identifier alone — the card draws no locale-specific text, so `/p/ACME/…`
 * and `/de/p/ACME/…` are one card. A hit is answered without reading the API
 * or drawing.
 *
 * Within an isolate, requests for a project that is being drawn share that
 * draw (`pending`, a map of promises dropped as each settles — never a store
 * of cards), and draws of different projects take turns (`gate`), so one
 * isolate holds at most one raster at a time inside its 128 MB.
 *
 * WHEN THE PROJECT CANNOT BE READ, THE CARD STILL DRAWS, from the key, as the
 * Next route did. A 404 is the API saying something and its card is kept; a
 * card drawn because the read FAILED is answered `no-store` and not kept, so
 * the next request reads again — where Next answered it `max-age=3600`, which
 * let an unfurler hold the plain card for an hour after an outage.
 */

/** How long a drawn card is served before it is drawn again (Next's window). */
export const OG_CACHE_SECONDS = 3600

export const OG_CACHE_CONTROL = `public, max-age=${OG_CACHE_SECONDS}`

const PROJECT_IMAGE = /^\/p\/([^/]+)\/opengraph-image(?:-[A-Za-z0-9]+)?$/

export interface ShareImageDeps {
  cache?: EdgeCache | null
  engine?: () => Promise<ShareEngine>
}

interface Drawn {
  png: Uint8Array<ArrayBuffer>
  keep: boolean
}

const pending = new Map<string, Promise<Drawn>>()
let gate: Promise<unknown> = Promise.resolve()

/** Runs `work` after every draw already queued in this isolate. */
function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const turn = gate.then(work, work)
  gate = turn.catch(() => {})
  return turn
}

/** The cache key: the identifier alone, on a path no page has. */
export function shareCardKey(origin: string, identifier: string): Request {
  return new Request(`${origin}/__og/p/${encodeURIComponent(identifier)}`, {
    method: 'GET',
  })
}

function png(bytes: Uint8Array<ArrayBuffer>, keep: boolean): Response {
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': keep ? OG_CACHE_CONTROL : 'no-store',
    },
  })
}

export function projectShareImageHandler(deps: ShareImageDeps = {}) {
  return async function projectShareImage(
    _request: Request,
    context: RouteContext,
  ): Promise<Response> {
    const { env, path, url } = context
    const encoded = PROJECT_IMAGE.exec(path)?.[1] ?? ''
    let identifier: string
    try {
      identifier = decodeURIComponent(encoded)
    } catch {
      identifier = encoded
    }
    const cache = deps.cache === undefined ? defaultEdgeCache() : deps.cache
    const key = shareCardKey(url.origin, identifier)

    const hit = cache
      ? await cache.match(key).catch(() => undefined)
      : undefined
    if (hit) return hit

    let drawn = pending.get(identifier)
    if (!drawn) {
      drawn = (async (): Promise<Drawn> => {
        const read = await readProjectCard(env.MOTIR_APP_ORIGIN, identifier)
        const text: ProjectCardText = projectCardText(
          identifier,
          read.status === 'ok' ? read.data : null,
        )
        const [fonts, engine] = await Promise.all([
          shareFonts(env, url.origin),
          (deps.engine ?? shareEngine)(),
        ])
        const bytes = await oneAtATime(() =>
          drawProjectCard(text, fonts, engine),
        )
        const keep = read.status !== 'failed'
        // Stored before the draw is let go of, so a request that arrives once
        // it settles finds the card rather than drawing it again.
        if (keep && cache)
          await cache.put(key, png(bytes, true)).catch(() => {})
        return { png: bytes, keep }
      })().finally(() => pending.delete(identifier))
      pending.set(identifier, drawn)
    }

    try {
      const { png: bytes, keep } = await drawn
      return png(bytes, keep)
    } catch (error) {
      // The fonts or the engines could not be had: no card can be drawn, and
      // nothing is kept, so the next request tries again.
      console.error(
        JSON.stringify({
          msg: 'share card failed',
          identifier,
          error: String(error),
        }),
      )
      return new Response(null, {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
      })
    }
  }
}

export const projectShareImage = projectShareImageHandler()
