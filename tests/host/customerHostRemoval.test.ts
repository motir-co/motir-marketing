import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as publicHostModule from '@/lib/publicHost'
import {
  PUBLIC_ADDRESS_KIND_HEADER,
  PUBLIC_HOST_HEADER,
  PUBLIC_ORIGIN_HEADER,
  publicPathFor,
  readPublicHost,
  SITE_HOST,
  type PublicHost,
} from '@/lib/publicHost'
import {
  resetHostResolutionCache,
  resolveHost,
  routeForHost,
  ROUTER_PATHS,
} from '@/lib/hostResolution'
import { projectSitemapEntries } from '@/lib/sitemapEntries'

/*
 * THE CUSTOMER-HOST REMOVAL, ASSEMBLED (MOTIR-9531 · Story MOTIR-4533).
 *
 * MOTIR-9527 took the customer-domain arm out of the router and MOTIR-9528
 * took the `project` address kind and the per-host redirect out of the pages.
 * Both SHRANK the suites beside this one to stay green, so nothing compared the
 * pair. This file is that comparison, and it changes no production file.
 *
 * ⚠️ THE CLAIM IS A NEGATIVE ONE, SO EVERY ABSENCE IS READ THREE WAYS. A
 * response status cannot prove "this host was not resolved": an unmatched
 * route, an empty page and a correct 404 all answer 404. So a case asserts the
 * contract FETCH that did not happen (a counter on the stub), the rewrite
 * TARGET the router chose, and the address KIND it announced. A reverted arm
 * typically keeps one of the three and loses another.
 *
 * ⚠️ AND IT ASSERTS NO FORWARD. A customer domain is answered by the
 * certificate edge, outside this repository (decision MOTIR-9521), so there is
 * no onward hop here to prove. The one thing left unproven from here, named so
 * that silence is not read as a pass: that production traffic for such a host
 * actually reaches the edge. That is DNS and a running machine, which a unit
 * case cannot read.
 *
 * The page half — a project whose `addresses.primary` names another host still
 * rendering on motir.co — is `tests/host/readPagesMoveGate.test.tsx`'s, because
 * that file already drives the four kept pages through their real modules.
 */

// ⚠️ THE BASE DOMAIN IS STUBBED, as in `hostRouter.test.ts`: outside production
// it defaults to `localhost`, which the router steps aside for as a LOCAL host,
// so every tenant-namespace case would be passing on the site branch.
vi.mock('@/lib/tenantDomain', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tenantDomain')>()),
  TENANT_DOMAIN: 'motir.site',
}))

const { proxy } = await import('@/proxy')
const { NextRequest } = await import('next/server')

const CUSTOMER = 'roadmap.acme.com'

/** Every contract URL asked for, in order — the counter absence is read on. */
let asked: string[] = []

/** Stub the contract with one answer for every call, and count the calls. */
function stubContract(answer: () => Response | Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      asked.push(String(input instanceof Request ? input.url : input))
      return answer()
    }),
  )
}

const NO_APPLICATION = {
  kind: 'no_application',
  workspace: { name: 'Acme' },
}

const json = (body: unknown, cacheControl = 'public, max-age=30') =>
  Response.json(body, { headers: { 'cache-control': cacheControl } })

const request = (url: string) =>
  new NextRequest(url, { headers: { host: new URL(url).host } })

/** The path the router rewrote onto, read the one way every case reads it. */
const rewriteOf = (res: Response) => {
  const to = res.headers.get('x-middleware-rewrite')
  return to ? new URL(to).pathname : null
}

const forwarded = (res: Response, name: string) =>
  res.headers.get(`x-middleware-request-${name}`)

beforeEach(() => {
  asked = []
  resetHostResolutionCache()
})
afterEach(() => {
  vi.unstubAllGlobals()
  resetHostResolutionCache()
})

/* ── 1 · a customer host is neither resolved nor rewritten ─────────────────── */

describe('a customer host, on any path', () => {
  it.each(['/', '/any/path?x=1', '/p/ACME', '/robots.txt', '/sitemap.xml'])(
    '%s → the one 404 room, unresolved, with no contract call',
    async (path) => {
      stubContract(() => json(NO_APPLICATION))
      const res = await proxy(request(`https://${CUSTOMER}${path}`))

      expect(asked).toEqual([])
      expect(rewriteOf(res)).toBe(ROUTER_PATHS.notFound)
      expect(forwarded(res, PUBLIC_ADDRESS_KIND_HEADER)).toBe('unresolved')
      expect(rewriteOf(res)).not.toMatch(/^\/p\//)
      expect(rewriteOf(res)).not.toContain(ROUTER_PATHS.unavailable)
    },
  )

  it('stays the 404 room even with a resolution remembered for it', async () => {
    // ⚠️ THE CASE A CACHE-FIRST REORDERING OF `proxy.ts` BREAKS while every
    // other case stays green. Prime the cache through the contract itself, then
    // ask the router: the tenant-namespace predicate sits UPSTREAM of the
    // cache, so no remembered answer can decide a customer host may be served.
    stubContract(() => json(NO_APPLICATION))
    expect(await resolveHost(CUSTOMER)).toEqual({
      status: 'ok',
      data: NO_APPLICATION,
    })
    expect(asked).toHaveLength(1)

    const res = await proxy(request(`https://${CUSTOMER}/`))

    expect(asked).toHaveLength(1)
    expect(rewriteOf(res)).toBe(ROUTER_PATHS.notFound)
    expect(forwarded(res, PUBLIC_ADDRESS_KIND_HEADER)).toBe('unresolved')
  })

  it('treats the tenant base domain itself as no tenant — the 404 room, not an outage', async () => {
    stubContract(() => json(NO_APPLICATION))
    const res = await proxy(request('https://motir.site/'))

    expect(asked).toEqual([])
    expect(rewriteOf(res)).toBe(ROUTER_PATHS.notFound)
    expect(forwarded(res, PUBLIC_ADDRESS_KIND_HEADER)).toBe('unresolved')
  })
})

/* ── 2 · the contract's answers, as the router reads them ─────────────────── */

describe('a kind this router does not serve', () => {
  it.each([
    ['project', 'a.motir.site'],
    ['application', 'b.motir.site'],
    ['members_only_application', 'c.motir.site'],
    ['a_kind_no_build_names', 'd.motir.site'],
  ])('`%s` is not-found, and is not remembered', async (kind, host) => {
    // A `project` or `application` kind re-admitted to `KNOWN_KINDS` is what
    // this catches: it would resolve, and be cached for max-age.
    stubContract(() => json({ kind, project: { identifier: 'ACME' } }))

    expect(await resolveHost(host)).toEqual({ status: 'not-found' })
    expect(await resolveHost(host)).toEqual({ status: 'not-found' })
    expect(asked).toHaveLength(2)
  })
})

describe('a contract 404, by its cache header', () => {
  it('`no-store` is asked again — a name claimed after a refusal is not hidden', async () => {
    stubContract(
      () =>
        new Response(null, {
          status: 404,
          headers: { 'cache-control': 'no-store' },
        }),
    )
    expect(await resolveHost('fresh.motir.site')).toEqual({
      status: 'not-found',
    })
    expect(await resolveHost('fresh.motir.site')).toEqual({
      status: 'not-found',
    })
    expect(asked).toHaveLength(2)
  })

  it('`max-age=30` is served from the cache', async () => {
    stubContract(
      () =>
        new Response(null, {
          status: 404,
          headers: { 'cache-control': 'public, max-age=30' },
        }),
    )
    expect(await resolveHost('stale.motir.site')).toEqual({
      status: 'not-found',
    })
    expect(await resolveHost('stale.motir.site')).toEqual({
      status: 'not-found',
    })
    expect(asked).toHaveLength(1)
  })

  it('and a second host never inherits the first one’s verdict', async () => {
    stubContract(() => json(NO_APPLICATION))
    await resolveHost('one.motir.site')
    await resolveHost('two.motir.site')
    expect(asked).toHaveLength(2)
  })
})

describe('the contract not answering', () => {
  const OUTAGES: [string, () => Response | Promise<Response>][] = [
    [
      'a network error',
      () => {
        throw new TypeError('fetch failed')
      },
    ],
    [
      'a timeout',
      () => {
        throw new DOMException('The operation timed out.', 'TimeoutError')
      },
    ],
    ['a 503', () => new Response('down', { status: 503 })],
    [
      'a 200 that is not JSON',
      () =>
        new Response('<html>bad gateway</html>', {
          headers: { 'content-type': 'text/html' },
        }),
    ],
  ]

  it.each(OUTAGES)(
    '%s is failed, never not-found, and is not remembered',
    async (_label, answer) => {
      stubContract(answer)
      expect(await resolveHost('down.motir.site')).toEqual({
        status: 'failed',
      })
      expect(await resolveHost('down.motir.site')).toEqual({
        status: 'failed',
      })
      expect(asked).toHaveLength(2)
    },
  )

  it.each(OUTAGES)(
    '%s sends the visitor to the error state, not the 404 a crawler drops',
    async (_label, answer) => {
      stubContract(answer)
      const res = await proxy(request('https://down.motir.site/'))

      expect(rewriteOf(res)).toBe(`/en${ROUTER_PATHS.unavailable}`)
      expect(rewriteOf(res)).not.toBe(ROUTER_PATHS.notFound)
    },
  )
})

/* ── 3 · the workspace arm, still standing ────────────────────────────────── */

describe('a workspace host, end to end', () => {
  const ORIGIN = 'https://acme.motir.site'
  beforeEach(() => stubContract(() => json(NO_APPLICATION)))

  it('answers its root with the no-application page', async () => {
    const res = await proxy(request(`${ORIGIN}/`))
    expect(rewriteOf(res)).toBe(`/en${ROUTER_PATHS.noApplication}`)
    expect(forwarded(res, PUBLIC_ADDRESS_KIND_HEADER)).toBe('workspace')
  })

  it.each([
    ['/robots.txt', '/robots-tenant.txt'],
    ['/sitemap.xml', '/sitemap-projects.xml'],
  ])('rewrites %s onto %s', async (path, to) => {
    const res = await proxy(request(`${ORIGIN}${path}`))
    expect(rewriteOf(res)).toBe(to)
    expect(forwarded(res, PUBLIC_ADDRESS_KIND_HEADER)).toBe('workspace')
  })

  it('forwards a site asset into this app with the host headers set', async () => {
    const res = await proxy(request(`${ORIGIN}/motir-mark.svg`))

    expect(rewriteOf(res)).toBeNull()
    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(forwarded(res, PUBLIC_ADDRESS_KIND_HEADER)).toBe('workspace')
    expect(forwarded(res, PUBLIC_HOST_HEADER)).toBe('acme.motir.site')
    expect(forwarded(res, PUBLIC_ORIGIN_HEADER)).toBe(ORIGIN)
  })

  it.each(['/explore', '/ACME/board'])(
    'answers %s with the one 404 room',
    async (path) => {
      const res = await proxy(request(`${ORIGIN}${path}`))
      expect(rewriteOf(res)).toBe(ROUTER_PATHS.notFound)
    },
  )

  it('never rewrites anywhere but back into this app', async () => {
    for (const path of ['/', '/robots.txt', '/motir-mark.svg', '/ACME']) {
      const to = (await proxy(request(`${ORIGIN}${path}`))).headers.get(
        'x-middleware-rewrite',
      )
      if (to) expect(new URL(to).origin).toBe(ORIGIN)
    }
  })
})

describe('routeForHost, as the router card leaves it', () => {
  it('takes no resolution, and serves no project path', () => {
    expect(routeForHost('/')).toEqual({
      action: 'no-application',
      path: `/en${ROUTER_PATHS.noApplication}`,
    })
    expect(routeForHost('/motir-mark.svg')).toEqual({ action: 'forward' })
    for (const path of ['/explore', '/p/ACME', '/en/p/ACME']) {
      expect(routeForHost(path), path).toEqual({ action: 'not-found' })
    }
  })

  it('returns no route that carries a /p/ path', () => {
    for (const path of ['/', '/motir-mark.svg', '/explore', '/p/ACME']) {
      expect(JSON.stringify(routeForHost(path)), path).not.toContain('/p/')
    }
  })
})

/* ── 4 · the site, untouched ──────────────────────────────────────────────── */

describe('the site’s own host', () => {
  it.each(['https://motir.co/explore', 'http://localhost:4318/explore'])(
    '%s makes no contract call and enters the locale tree',
    async (url) => {
      stubContract(() => json(NO_APPLICATION))
      const res = await proxy(request(url))

      expect(asked).toEqual([])
      expect(rewriteOf(res)).toBe('/en/explore')
      expect(forwarded(res, PUBLIC_ADDRESS_KIND_HEADER)).toBeNull()
    },
  )
})

/* ── 5 · the address vocabulary cannot spell a customer host ──────────────── */

describe('lib/publicHost.ts', () => {
  it('exports neither page-redirect helper', () => {
    // Read off the module's bindings, not its source, so a re-export under
    // another file's name still fails here.
    const exported = Object.keys(publicHostModule)
    expect(exported).not.toContain('redirectIfNotPrimary')
    expect(exported).not.toContain('isOnPrimaryHost')
  })

  it('reads exactly three address kinds, and a `project` header as the site', () => {
    // `KINDS` is module-private; `readPublicHost` is the one reader of it, so
    // a fourth member would surface here as a header that no longer reads as
    // the site.
    const read = (kind: string) =>
      readPublicHost(
        new Headers({
          [PUBLIC_ADDRESS_KIND_HEADER]: kind,
          [PUBLIC_HOST_HEADER]: CUSTOMER,
        }),
      ).kind
    expect(read('workspace')).toBe('workspace')
    expect(read('unresolved')).toBe('unresolved')
    expect(read('site')).toBe('site')
    expect(read('project')).toBe('site')
  })

  it.each<PublicHost>([
    SITE_HOST,
    { kind: 'workspace', host: 'acme.motir.site', origin: null },
    { kind: 'unresolved', host: CUSTOMER, origin: null },
  ])('spells the site path on a $kind host', (host) => {
    expect(publicPathFor(host, 'A B', 'changelog', 'fr')).toBe(
      '/fr/p/A%20B/changelog',
    )
    expect(publicPathFor(host, 'ACME', '', 'en')).toBe('/p/ACME')
  })
})

describe('projectSitemapEntries', () => {
  const INDEX = {
    projects: [
      {
        identifier: 'MOTIR',
        updatedAt: '2026-09-02T00:00:00.000Z',
        primaryHost: 'motir.co',
      },
      {
        identifier: 'ACME',
        updatedAt: '2026-09-01T00:00:00.000Z',
        primaryHost: CUSTOMER,
      },
    ],
    nextCursor: null,
  }

  it.each<PublicHost>([
    { kind: 'workspace', host: 'acme.motir.site', origin: null },
    { kind: 'unresolved', host: CUSTOMER, origin: null },
  ])('is empty on a $kind host, without reading the index', async (host) => {
    stubContract(() => json(INDEX))
    expect(await projectSitemapEntries(host)).toEqual([])
    expect(asked).toEqual([])
  })

  it('lists on the site only the projects whose canonical is the site', async () => {
    stubContract(() => json(INDEX))
    const urls = (await projectSitemapEntries(SITE_HOST)).map((e) => e.url)

    expect(asked).toHaveLength(1)
    expect(urls).toContain('https://motir.co/p/MOTIR')
    expect(urls).toContain('https://motir.co/p/MOTIR/changelog')
    expect(urls.some((u) => u.includes('ACME'))).toBe(false)
  })
})
