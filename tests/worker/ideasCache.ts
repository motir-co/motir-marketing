import type { EdgeCache } from '@/worker/ideasStore'

/*
 * AN IN-MEMORY STAND-IN FOR `caches.default` (MOTIR-10755), on a clock the
 * test moves. It keeps what Cloudflare's edge cache keeps: a response is held
 * for the `max-age` of its own `Cache-Control`, keyed by URL, and a response
 * marked otherwise is not held at all.
 */
export class MemoryCache implements EdgeCache {
  now = 0
  readonly entries = new Map<
    string,
    { body: ArrayBuffer; headers: [string, string][]; expires: number }
  >()

  async match(request: Request): Promise<Response | undefined> {
    const entry = this.entries.get(request.url)
    if (!entry || this.now >= entry.expires) return undefined
    return new Response(entry.body, { status: 200, headers: entry.headers })
  }

  async put(request: Request, response: Response): Promise<void> {
    const control = response.headers.get('cache-control') ?? ''
    const maxAge = /(?:^|,\s*)max-age=(\d+)/.exec(control)?.[1]
    if (!/\bpublic\b/.test(control) || maxAge === undefined) return
    this.entries.set(request.url, {
      body: await response.arrayBuffer(),
      headers: [...response.headers],
      expires: this.now + Number(maxAge) * 1000,
    })
  }

  /** Moves the clock on by `seconds`. */
  advance(seconds: number) {
    this.now += seconds * 1000
  }
}

/** A `ctx` whose deferred work the test can wait for. */
export function waitUntilRecorder() {
  const pending: Promise<unknown>[] = []
  return {
    ctx: {
      waitUntil: (promise: Promise<unknown>) => void pending.push(promise),
    },
    settle: () => Promise.all(pending.splice(0)),
    get count() {
      return pending.length
    },
  }
}
