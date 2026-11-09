/*
 * WHAT THE WORKER IS GIVEN (MOTIR-10752).
 *
 * `wrangler.jsonc` binds the built site as `ASSETS` and declares the two
 * origins under `vars`, so a Worker built once is pointed at the e2e stub in
 * the browser lane and at app.motir.co in production, with no rebuild. Every
 * handler receives this object through its context; nothing in the Worker
 * reads a Fly or Vercel variable, a tenant host or a forwarded-host header.
 */

/** The static-assets binding: the built site, served as Cloudflare serves it. */
export interface AssetsFetcher {
  fetch(request: Request | string | URL, init?: RequestInit): Promise<Response>
}

export interface Env {
  /** `astro build`'s `dist/`, with the not-found handling `wrangler.jsonc` sets. */
  ASSETS: AssetsFetcher
  /** motir-core's origin: the public API the live pages read, and the app's doors. */
  MOTIR_APP_ORIGIN: string
  /** motir.co's own origin: canonicals, hreflang and the project sitemap. */
  MOTIR_SITE_ORIGIN: string
}

/**
 * The part of Cloudflare's `ExecutionContext` a handler uses: work that may
 * finish after the response is sent (MOTIR-10755, the idea store's cache
 * write). A caller with no runtime context — a unit test — gets one that
 * lets the work run and drops its failure.
 */
export interface WaitUntil {
  waitUntil(promise: Promise<unknown>): void
}

export const DETACHED: WaitUntil = {
  waitUntil(promise) {
    promise.catch(() => {})
  },
}
