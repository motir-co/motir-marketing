import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  isSiteAssetPath,
  localisedPath,
  isStorable,
  maxAgeMs,
  resetHostResolutionCache,
  resolveHost,
  routeForHost,
  type PublicHostResolution,
} from '@/lib/hostResolution'
import { APP_ORIGIN } from '@/lib/appOrigin'

/*
 * THE ROUTER'S READ AND THE ROUTER'S DECISION (MOTIR-4220).
 *
 * Split from `proxy.ts` on purpose: the decision is pure, so every arm is a
 * unit test here rather than four `NextRequest` fixtures over there.
 */

const WORKSPACE: PublicHostResolution = {
  kind: 'no_application',
  workspace: { name: 'Acme' },
}

/* ── the read ─────────────────────────────────────────────────────────────── */

function answer(
  body: unknown,
  init: { status?: number; cacheControl?: string } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json',
      ...(init.cacheControl ? { 'cache-control': init.cacheControl } : {}),
    },
  })
}

describe('resolveHost', () => {
  beforeEach(() => {
    // ⚠️ THE CACHE IS MODULE STATE AND OUTLIVES A TEST FILE. Without this the
    // suite inherits verdicts from whichever file ran first — the coupling
    // `tests/publicProject/` met once already, on `allowedOrigins`.
    resetHostResolutionCache()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('calls the contract on the APP origin, host-encoded', async () => {
    const fetchMock = vi.fn((url: string) => {
      expect(url).toBe(`${APP_ORIGIN}/api/public/hosts/acme.motir.site`)
      return Promise.resolve(answer(WORKSPACE))
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(resolveHost('acme.motir.site')).resolves.toEqual({
      status: 'ok',
      data: WORKSPACE,
    })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${APP_ORIGIN}/api/public/hosts/acme.motir.site`,
    )
  })

  it('maps a 404 to not-found and anything else unreadable to failed', async () => {
    vi.stubGlobal('fetch', async () =>
      answer({ code: 'NOT_FOUND' }, { status: 404 }),
    )
    await expect(resolveHost('nope.example')).resolves.toEqual({
      status: 'not-found',
    })

    resetHostResolutionCache()
    vi.stubGlobal('fetch', async () => answer({}, { status: 500 }))
    await expect(resolveHost('nope.example')).resolves.toEqual({
      status: 'failed',
    })

    resetHostResolutionCache()
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED')
    })
    await expect(resolveHost('nope.example')).resolves.toEqual({
      status: 'failed',
    })
  })

  it('reads a 200 that is not JSON as an outage, not as a 404', async () => {
    // A proxy's own error page, most likely. It is not the contract SAYING the
    // host is unknown, so it must not become a 404 a crawler acts on.
    vi.stubGlobal(
      'fetch',
      async () => new Response('<html>502</html>', { status: 200 }),
    )
    await expect(resolveHost('acme.motir.site')).resolves.toEqual({
      status: 'failed',
    })
  })

  it('CACHES an answer for the contract’s own max-age', async () => {
    const fetchMock = vi.fn(async () =>
      answer(WORKSPACE, { cacheControl: 'public, max-age=30' }),
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()
    try {
      await resolveHost('acme.motir.site')
      await resolveHost('acme.motir.site')
      expect(fetchMock).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(29_000)
      await resolveHost('acme.motir.site')
      expect(fetchMock).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(2_000)
      await resolveHost('acme.motir.site')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('holds an answer with no Cache-Control for 30 seconds, the producer’s own bound', async () => {
    // A retired name may keep answering for at most the contract's max-age (ADR
    // §8 Amendment 3 rule 2). Two caches in series add their bounds, so a floor
    // longer than the producer's would let a renamed name answer past it.
    const fetchMock = vi.fn(async () => answer(WORKSPACE))
    vi.stubGlobal('fetch', fetchMock)
    vi.useFakeTimers()
    try {
      await resolveHost('acme.motir.site')
      vi.advanceTimersByTime(29_000)
      await resolveHost('acme.motir.site')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(2_000)
      await resolveHost('acme.motir.site')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('caches a 404 the contract lets it cache', async () => {
    const fetchMock = vi.fn(async () =>
      answer({}, { status: 404, cacheControl: 'max-age=30' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await resolveHost('nope.example')
    await resolveHost('nope.example')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does NOT remember a no-store 404 — a name claimed a moment later must answer', async () => {
    const fetchMock = vi.fn(async () =>
      answer({}, { status: 404, cacheControl: 'no-store' }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await resolveHost('fresh.motir.site')
    await resolveHost('fresh.motir.site')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reads a kind it does not know as not-found — a retired alias never redirects', async () => {
    // A stale producer still sending the retired never-released `alias` outcome
    // must 404 like an unknown host (rule 2), and a newer kind this build
    // predates must not be drawn as a shape it was not given.
    for (const body of [
      { kind: 'alias', redirectTo: 'acme.motir.site' },
      { kind: 'workspace', workspace: { name: 'Acme' }, projects: [] },
      { kind: 'application' },
      // MOTIR-9527: the customer-domain kinds are the edge's, never this router's.
      {
        kind: 'project',
        project: { identifier: 'PROD', name: 'Prod' },
        primary: true,
      },
      { kind: 'members_only_application', workspace: { name: 'Acme' } },
      null,
    ]) {
      resetHostResolutionCache()
      vi.stubGlobal('fetch', async () => answer(body))
      await expect(resolveHost('old.motir.site')).resolves.toEqual({
        status: 'not-found',
      })
    }
  })

  it('does NOT cache an outage — a restart must not become a minute of it', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    })
    vi.stubGlobal('fetch', fetchMock)

    await resolveHost('acme.motir.site')
    await resolveHost('acme.motir.site')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('normalises the key, so a port or a capital is not a second cache entry', async () => {
    const fetchMock = vi.fn(async () => answer(WORKSPACE))
    vi.stubGlobal('fetch', fetchMock)

    await resolveHost('ACME.motir.site:443')
    await resolveHost('acme.motir.site')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('answers not-found for an empty host without calling anything', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(resolveHost('')).resolves.toEqual({ status: 'not-found' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('is BOUNDED — the key is attacker-supplied', async () => {
    // 1000 entries is the bound. Filling past it must evict rather than grow:
    // a script pointing distinct hostnames at this app would otherwise be an
    // unbounded Map in a 512 MB machine.
    const fetchMock = vi.fn(async () => answer({}, { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    for (let i = 0; i < 1001; i += 1) await resolveHost(`h${i}.example`)
    expect(fetchMock).toHaveBeenCalledTimes(1001)

    // The FIRST key was evicted and is re-fetched; a recent one is still held.
    await resolveHost('h0.example')
    expect(fetchMock).toHaveBeenCalledTimes(1002)
    await resolveHost('h1000.example')
    expect(fetchMock).toHaveBeenCalledTimes(1002)
  })
})

describe('maxAgeMs', () => {
  it('reads the contract’s directive', () => {
    expect(maxAgeMs('public, max-age=30')).toBe(30_000)
    expect(maxAgeMs('max-age=5')).toBe(5_000)
  })

  it('falls back to the producing route’s own number when there is none', () => {
    expect(maxAgeMs(null)).toBe(30_000)
  })

  it('does not mistake s-maxage for max-age', () => {
    expect(maxAgeMs('s-maxage=1')).toBe(30_000)
  })
})

describe('isStorable', () => {
  it('is false only for no-store', () => {
    expect(isStorable('no-store')).toBe(false)
    expect(isStorable('private, no-store')).toBe(false)
    expect(isStorable('public, max-age=30')).toBe(true)
    expect(isStorable(null)).toBe(true)
  })
})

/* ── the decision ─────────────────────────────────────────────────────────── */

describe('routeForHost — a live workspace host with no application', () => {
  it('answers the no-application page at the root', () => {
    expect(routeForHost('/')).toEqual({
      action: 'no-application',
      path: '/en/no-application',
    })
  })

  it('serves NO project path — public projects live at motir.co/p/<identifier>', () => {
    // MOTIR-9790 / MOTIR-9512: the bare workspace host belongs to the default
    // application. The `/<identifier>` rewrite is gone, so a published link to
    // `acme.motir.site/PROD` is a 404 rather than a project page.
    for (const path of [
      '/PROD',
      '/PROD/board',
      '/PROD/items/PROD-42',
      '/PROD/changelog.xml',
      '/OTHER/board',
      '/w',
      '/explore',
    ]) {
      expect(routeForHost(path), path).toEqual({
        action: 'not-found',
      })
    }
  })

  it('lets a site asset through — the chrome’s logo is at the ROOT', () => {
    expect(routeForHost('/motir-mark.svg')).toEqual({
      action: 'forward',
    })
    expect(routeForHost('/favicon.ico')).toEqual({
      action: 'forward',
    })
  })

  it('and the CRAWL SURFACE takes that arm too, with the host attached', () => {
    // ⚠️ `forward`, NOT `pass`: `/sitemap.xml` and `/robots.txt` are
    // site-asset-SHAPED and must still know which host asked (MOTIR-4222).
    expect(routeForHost('/sitemap.xml')).toEqual({
      action: 'forward',
    })
    expect(routeForHost('/robots.txt')).toEqual({ action: 'forward' })
  })
})

describe('routeForHost — no customer-domain arm (MOTIR-9527)', () => {
  it('rewrites no path onto the project tree, bare or under a locale', () => {
    // The customer domain's `/p/<identifier>` rewrite is gone: a customer
    // domain is the edge's, so no path on a host this router serves is ever
    // turned into a project page.
    for (const path of [
      '/p/PROD',
      '/p/PROD/board',
      '/p/',
      '/en/p/PROD',
      '/ja/p/PROD/items/PROD-1',
    ]) {
      expect(routeForHost(path), path).toEqual({ action: 'not-found' })
    }
  })
})

describe('routeForHost is IDEMPOTENT — Next re-enters on its own rewrite', () => {
  /*
   * ⚠️ THE FINDING THIS SUITE EXISTS FOR, and it was found in the browser lane
   * rather than here. Next 16 dispatches an internal `NextResponse.rewrite`
   * back through the proxy, so `/` arrives, becomes `/en/no-application` — and
   * then arrives AGAIN as `/en/no-application`. A second pass that read that as
   * a locale tree the host does not serve would 404 every workspace root while
   * every single-pass unit test stayed green.
   */
  it('forwards the no-application page back to itself, and rewrites it bare', () => {
    expect(routeForHost('/en/no-application')).toEqual({
      action: 'forward',
    })
    expect(routeForHost('/no-application')).toEqual({
      action: 'rewrite',
      path: '/en/no-application',
    })
    expect(routeForHost('/no-application', 'de')).toEqual({
      action: 'rewrite',
      path: '/de/no-application',
    })
  })

  it('refuses a locale tree that is none of its targets', () => {
    expect(routeForHost('/en/explore')).toEqual({
      action: 'not-found',
    })
    expect(routeForHost('/en/')).toEqual({ action: 'not-found' })
  })

  it('passes its own two landing pads through untouched', () => {
    // Anything else here is a redirect loop. The 404 pad is never prefixed.
    expect(routeForHost('/_host-unknown')).toEqual({
      action: 'forward',
    })
    expect(routeForHost('/en/host-unavailable')).toEqual({
      action: 'forward',
    })
    expect(routeForHost('/host-unavailable', 'ja')).toEqual({
      action: 'rewrite',
      path: '/ja/host-unavailable',
    })
  })

  it('emits the locale it is given, defaulting to English', () => {
    expect(routeForHost('/', 'ko')).toEqual({
      action: 'no-application',
      path: '/ko/no-application',
    })
  })
})

describe('localisedPath', () => {
  it('prefixes a router target, and the root has no trailing slash', () => {
    expect(localisedPath('/no-application')).toBe('/en/no-application')
    expect(localisedPath('/host-unavailable', 'pt')).toBe(
      '/pt/host-unavailable',
    )
    expect(localisedPath('/', 'de')).toBe('/de')
  })
})

describe('isSiteAssetPath', () => {
  it('is ONE segment with a dot, and nothing else', () => {
    expect(isSiteAssetPath('/robots.txt')).toBe(true)
    expect(isSiteAssetPath('/sitemap.xml')).toBe(true)
    expect(isSiteAssetPath('/PROD')).toBe(false)
    expect(isSiteAssetPath('/')).toBe(false)
    expect(isSiteAssetPath('/PROD/changelog.xml')).toBe(false)
  })
})
