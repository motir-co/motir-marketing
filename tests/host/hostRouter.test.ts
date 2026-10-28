import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostRead } from '@/lib/hostResolution'

/*
 * THE ROUTER ITSELF (MOTIR-4220) — `proxy.ts`, over a stubbed contract.
 *
 * `tests/host/hostResolution.test.ts` covers the DECISION, which is pure. This
 * file covers the three things only the proxy can be asked: which host it reads,
 * what it does before it reads anything at all, and what a `NextResponse`
 * actually carries.
 *
 * ⚠️ THE ASSERTIONS NAME NEXT'S INTERNAL HEADERS, and that is unavoidable
 * rather than sloppy. A middleware response is not a document — a rewrite is
 * `x-middleware-rewrite`, a forwarded request header is
 * `x-middleware-request-<name>`, and a pass-through is `x-middleware-next`.
 * Read off `next@16.2.6` and pinned here so a version bump that changed them
 * turns THIS red rather than turning the router silently inert. The behavioural
 * half is `e2e/specs/tenant-host.spec.ts`, which walks a real tenant host.
 */

const resolveHost = vi.fn<(host: string) => Promise<HostRead>>()

// ⚠️ THE BASE DOMAIN IS STUBBED, because the default outside production is
// `localhost` — which the router already steps aside for as a LOCAL host, so
// the base-domain branch would be unreachable here and the test that covers it
// would be passing on the branch above. `motir.site` is the production value.
vi.mock('@/lib/tenantDomain', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tenantDomain')>()),
  TENANT_DOMAIN: 'motir.site',
}))

vi.mock('@/lib/hostResolution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hostResolution')>()),
  resolveHost,
}))

const { proxy } = await import('@/proxy')
const { NextRequest } = await import('next/server')
type NextRequestType = InstanceType<typeof NextRequest>

const WORKSPACE: HostRead = {
  status: 'ok',
  data: {
    kind: 'no_application',
    workspace: { name: 'Acme' },
  },
}
const CUSTOM: HostRead = {
  status: 'ok',
  data: {
    kind: 'project',
    project: { identifier: 'PROD', name: 'Prod' },
    primary: true,
  },
}

function request(
  url: string,
  headers: Record<string, string> = {},
): NextRequestType {
  const host = new URL(url).host
  return new NextRequest(url, { headers: { host, ...headers } })
}

const rewriteOf = (res: Response) =>
  res.headers.get('x-middleware-rewrite')
    ? new URL(res.headers.get('x-middleware-rewrite')!).pathname
    : null

const forwarded = (res: Response, name: string) =>
  res.headers.get(`x-middleware-request-${name}`)

beforeEach(() => resolveHost.mockReset())

describe('the site’s own host', () => {
  it('makes NO network hop — only the locale router runs there', async () => {
    // The landing, /explore, /docs and /legal would otherwise pay a round trip
    // to app.motir.co on every request, to be told they are not a tenant — on
    // the host whose whole job is to be fast and crawlable. Asserted with the
    // spy rather than trusted to the branch staying first.
    //
    // MOTIR-7948: what the branch does now is next-intl's `as-needed` mapping —
    // an unprefixed path is the ENGLISH tree, rewritten with the URL unchanged.
    for (const [url, to] of [
      ['https://motir.co/', '/en'],
      ['https://motir.co/explore', '/en/explore'],
      ['http://localhost:4318/docs', '/en/docs'],
      ['http://127.0.0.1:4318/p/MOTIR/board', '/en/p/MOTIR/board'],
    ]) {
      const res = await proxy(request(url))
      expect(rewriteOf(res), url).toBe(to)
    }
    expect(resolveHost).not.toHaveBeenCalled()
  })

  it('reads the FORWARDED host, which is what Fly sets', async () => {
    // Fly terminates TLS and proxies to the machine, so `Host` is the internal
    // address. Reading it first would make every tenant request look like the
    // same internal host — and the site branch above would swallow all of them.
    resolveHost.mockResolvedValue(WORKSPACE)
    const res = await proxy(
      request('https://motir.co/', {
        'x-forwarded-host': 'ACME.motir.site',
      }),
    )
    expect(resolveHost).toHaveBeenCalledWith('acme.motir.site')
    expect(rewriteOf(res)).toBe('/en/no-application')
  })
})

describe('a tenant host’s robots.txt and sitemap.xml (MOTIR-8842)', () => {
  // motir.co's `robots.txt` is a static file (`app/robots.ts`) and says
  // motir.co. A tenant host must name ITS OWN host and sitemap, which only a
  // request render can do — so the router sends it to `app/robots-tenant.txt`,
  // with the host headers set, once the host has resolved.
  it.each([
    ['a workspace subdomain', WORKSPACE, 'https://acme.motir.site'],
    ['a customer domain', CUSTOM, 'https://roadmap.acme.com'],
  ])('rewrites %s onto the tenant route', async (_label, read, origin) => {
    resolveHost.mockResolvedValue(read)
    const res = await proxy(request(`${origin}/robots.txt`))

    expect(rewriteOf(res)).toBe('/robots-tenant.txt')
    expect(forwarded(res, 'x-motir-public-origin')).toBe(origin)
    expect(forwarded(res, 'x-motir-public-host')).toBe(new URL(origin).host)
  })

  it.each([
    ['a workspace subdomain', WORKSPACE, 'https://acme.motir.site'],
    ['a customer domain', CUSTOM, 'https://roadmap.acme.com'],
  ])(
    'rewrites %s’s sitemap.xml onto its project half',
    async (_label, read, origin) => {
      resolveHost.mockResolvedValue(read)
      const res = await proxy(request(`${origin}/sitemap.xml`))

      expect(rewriteOf(res)).toBe('/sitemap-projects.xml')
      expect(forwarded(res, 'x-motir-public-origin')).toBe(origin)
    },
  )

  it('serves the tenant route itself as it is, so the rewrite does not loop', async () => {
    resolveHost.mockResolvedValue(WORKSPACE)
    const res = await proxy(
      request('https://acme.motir.site/robots-tenant.txt'),
    )

    expect(rewriteOf(res)).toBeNull()
    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(forwarded(res, 'x-motir-public-host')).toBe('acme.motir.site')
  })

  it.each(['/robots.txt', '/sitemap.xml'])(
    'leaves motir.co’s own %s to the built file',
    async (path) => {
      const res = await proxy(request(`https://motir.co${path}`))

      expect(rewriteOf(res)).toBeNull()
      expect(res.headers.get('x-middleware-next')).toBe('1')
      expect(resolveHost).not.toHaveBeenCalled()
    },
  )
})

describe('the base domain itself', () => {
  it('is not a tenant address, and is answered without a hop', async () => {
    // It has no row, so the contract would 404 it anyway — but answering here
    // means the answer does not depend on the ABSENCE of a row somebody could
    // create. `motir-core`'s own `resolveHost` refuses it for the same reason.
    const res = await proxy(request('https://motir.site/'))
    expect(resolveHost).not.toHaveBeenCalled()
    expect(rewriteOf(res)).toBe('/_host-unknown')
  })
})

/*
 * ⚠️ THE THREE BRANCHES THAT HOLD NO RESOLUTION (MOTIR-4430).
 *
 * They are asserted TOGETHER because the thing they share is the whole content
 * of the fourth `PublicAddressKind`: none of them can say WHICH tenant this is,
 * and all three know the one fact every link depends on — the visitor is not on
 * `motir.co`. Before this card each took a `rewriteTo` helper that forwarded
 * nothing, so the two landing pads were the only surfaces in the app told they
 * were on the site when they were not.
 *
 * ⚠️ AND THE KIND IS ASSERTED, NOT ONLY THE HOST. A test that checked
 * `x-motir-public-host` alone would pass on a router that forwarded the host
 * under `site`, which is exactly the answer the chrome must not be given:
 * `siteLinkFor` branches on the KIND.
 */
describe('a host with NO resolution is `unresolved`, not silent', () => {
  const UNRESOLVED = [
    [
      'the base domain itself',
      'https://motir.site/',
      'motir.site',
      '/_host-unknown',
      null,
    ],
    [
      'a host the contract does not know',
      'https://nope.example/',
      'nope.example',
      '/_host-unknown',
      { status: 'not-found' } as HostRead,
    ],
    [
      'a host the contract did not answer for',
      'https://roadmap.acme.com/board',
      'roadmap.acme.com',
      '/en/host-unavailable',
      { status: 'failed' } as HostRead,
    ],
  ] as const

  for (const [label, url, host, path, read] of UNRESOLVED) {
    it(`${label} — forwards ${host} as \`unresolved\` onto ${path}`, async () => {
      if (read) resolveHost.mockResolvedValue(read)
      const res = await proxy(request(url))

      expect(rewriteOf(res)).toBe(path)
      expect(forwarded(res, 'x-motir-address-kind')).toBe('unresolved')
      expect(forwarded(res, 'x-motir-public-host')).toBe(host)
      expect(forwarded(res, 'x-motir-public-origin')).toBe(`https://${host}`)
    })
  }

  it('OVERWRITES a client-supplied kind here too', async () => {
    // The same rule the resolved branches keep: a caller cannot talk the 404
    // room into spelling another host's links by sending its own header.
    resolveHost.mockResolvedValue({ status: 'not-found' })
    const res = await proxy(
      request('https://nope.example/', {
        'x-motir-address-kind': 'site',
        'x-motir-public-host': 'evil.example',
      }),
    )
    expect(forwarded(res, 'x-motir-address-kind')).toBe('unresolved')
    expect(forwarded(res, 'x-motir-public-host')).toBe('nope.example')
  })
})

describe('a live workspace host with no application', () => {
  beforeEach(() => resolveHost.mockResolvedValue(WORKSPACE))

  it('answers the no-application page at the root, carrying host and kind', async () => {
    const res = await proxy(request('https://acme.motir.site/'))

    expect(rewriteOf(res)).toBe('/en/no-application')
    expect(forwarded(res, 'x-motir-address-kind')).toBe('workspace')
    expect(forwarded(res, 'x-motir-public-host')).toBe('acme.motir.site')
    // Scheme AND port, from what the proxy in front of us said — the crawl
    // surface builds absolute URLs from it (MOTIR-4222).
    expect(forwarded(res, 'x-motir-public-origin')).toBe(
      'https://acme.motir.site',
    )
  })

  it('carries the FORWARDED scheme and port, not the socket’s', async () => {
    // Fly terminates TLS, so the request reaching the machine is http on an
    // internal port. A robots.txt built from that would advertise an address
    // no visitor can reach.
    resolveHost.mockResolvedValue(WORKSPACE)
    const res = await proxy(
      request('http://internal.fly.dev:8080/PROD', {
        'x-forwarded-host': 'acme.motir.site',
        'x-forwarded-proto': 'https',
      }),
    )
    expect(forwarded(res, 'x-motir-public-origin')).toBe(
      'https://acme.motir.site',
    )
  })

  it('serves NO project path — a published /<identifier> link is the 404 room', async () => {
    // MOTIR-9790 / MOTIR-9512: public projects live at motir.co/p/<identifier>,
    // and the bare workspace host belongs to the default application.
    for (const path of ['/PROD', '/PROD/board', '/w']) {
      const res = await proxy(request(`https://acme.motir.site${path}`))
      expect(rewriteOf(res), path).toBe('/_host-unknown')
    }
  })

  it('OVERWRITES a client-supplied kind rather than honouring it', async () => {
    const res = await proxy(
      request('https://acme.motir.site/PROD', {
        'x-motir-address-kind': 'project',
        'x-motir-public-host': 'evil.example',
      }),
    )
    expect(forwarded(res, 'x-motir-address-kind')).toBe('workspace')
    expect(forwarded(res, 'x-motir-public-host')).toBe('acme.motir.site')
  })

  it('404s any other path', async () => {
    const res = await proxy(request('https://acme.motir.site/OTHER'))
    expect(rewriteOf(res)).toBe('/_host-unknown')
  })

  it('CARRIES the host into the 404 room, because it HOLDS the resolution', async () => {
    /*
     * MOTIR-4430, and the branch its reproduction takes:
     * `hey.motir.site/explore` is a live workspace address serving a path it
     * does not have. The host is known and only the PATH is not, so
     * the room is told the real kind rather than `unresolved` — and it is told
     * anything at all, which is the defect. Until this card the branch went
     * through a header-less `rewriteTo`, so the room rendered `motir.co`'s
     * chrome and offered a lost visitor six doors that 404 where they stand.
     */
    const res = await proxy(request('https://acme.motir.site/OTHER'))

    expect(forwarded(res, 'x-motir-address-kind')).toBe('workspace')
    expect(forwarded(res, 'x-motir-public-host')).toBe('acme.motir.site')
    expect(forwarded(res, 'x-motir-public-origin')).toBe(
      'https://acme.motir.site',
    )
  })
})

describe('the router’s own rewrite, coming back around', () => {
  it('is forwarded WITH the headers rather than routed again', async () => {
    // Next re-enters the proxy with the rewritten path. The headers are set
    // again rather than assumed to have survived, so the page reads them
    // whichever pass produced the request it renders.
    resolveHost.mockResolvedValue(WORKSPACE)
    const res = await proxy(
      request('https://acme.motir.site/en/no-application'),
    )

    expect(res.headers.get('x-middleware-rewrite')).toBeNull()
    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(forwarded(res, 'x-motir-address-kind')).toBe('workspace')
    expect(forwarded(res, 'x-motir-public-host')).toBe('acme.motir.site')
  })
})

describe('a customer domain', () => {
  it('puts the project at the root and keeps the query', async () => {
    resolveHost.mockResolvedValue(CUSTOM)
    const res = await proxy(request('https://roadmap.acme.com/items?cursor=w9'))
    expect(rewriteOf(res)).toBe('/en/p/PROD/items')
    expect(
      new URL(res.headers.get('x-middleware-rewrite')!).search,
      'the pager coordinate must survive the rewrite',
    ).toBe('?cursor=w9')
    expect(forwarded(res, 'x-motir-address-kind')).toBe('project')
  })
})

describe('a retired subdomain', () => {
  it('is the 404 room like any unknown host — nothing redirects (ADR §8 Amendment 3 rule 2)', async () => {
    // The contract answers a renamed or released name the same 404 as an
    // unknown host, so there is no redirect branch left to take.
    resolveHost.mockResolvedValue({ status: 'not-found' })
    const res = await proxy(
      request('https://old.motir.site/PROD/items?cursor=w9'),
    )
    expect(res.status).not.toBe(301)
    expect(res.headers.get('location')).toBeNull()
    expect(rewriteOf(res)).toBe('/_host-unknown')
  })
})

describe('the two failures stay apart', () => {
  it('an unknown host is the site’s not-found page', async () => {
    resolveHost.mockResolvedValue({ status: 'not-found' })
    const res = await proxy(request('https://nope.example/'))
    expect(rewriteOf(res)).toBe('/_host-unknown')
  })

  it('an UNREACHABLE contract is the error state, NEVER a 404', async () => {
    // A crawler acts on a 404. Answering one while app.motir.co restarts would
    // tell it every customer domain had been deleted.
    resolveHost.mockResolvedValue({ status: 'failed' })
    const res = await proxy(request('https://roadmap.acme.com/board'))
    expect(rewriteOf(res)).toBe('/en/host-unavailable')
  })
})

/*
 * MOTIR-7948 — every PAGE the router targets is inside a locale's tree, and the
 * tree is English until the detection card chooses another. Each case drives
 * BOTH passes: the rewrite, then the proxy over its own rewrite, which must
 * step aside — the `alreadyRouted` rule, now with a locale segment in front.
 */
describe('the router targets the English tree, and recognises it coming back', () => {
  const twoPasses = async (url: string) => {
    const first = await proxy(request(url))
    const to = rewriteOf(first)
    const second = to
      ? await proxy(request(`${new URL(url).origin}${to}`))
      : null
    return { to, second }
  }

  it('a customer domain’s tab → /en/p/<id>/…, then forward', async () => {
    resolveHost.mockResolvedValue(CUSTOM)
    const { to, second } = await twoPasses('https://roadmap.acme.com/changelog')
    expect(to).toBe('/en/p/PROD/changelog')
    expect(rewriteOf(second!)).toBeNull()
    expect(second!.headers.get('x-middleware-next')).toBe('1')
  })

  it('a customer domain’s root → /en/p/<id>, then forward', async () => {
    resolveHost.mockResolvedValue(CUSTOM)
    const { to, second } = await twoPasses('https://roadmap.acme.com/')
    expect(to).toBe('/en/p/PROD')
    expect(second!.headers.get('x-middleware-next')).toBe('1')
  })

  it('a workspace root → /en/no-application, then forward', async () => {
    resolveHost.mockResolvedValue(WORKSPACE)
    const { to, second } = await twoPasses('https://acme.motir.site/')
    expect(to).toBe('/en/no-application')
    expect(second!.headers.get('x-middleware-next')).toBe('1')
    expect(forwarded(second!, 'x-motir-address-kind')).toBe('workspace')
  })

  it('a FORGED /en/p/OTHER is still the 404 room, never another project', async () => {
    resolveHost.mockResolvedValue(WORKSPACE)
    for (const path of ['/en/p/OTHER', '/de/p/OTHER/board', '/en/p/PROD']) {
      const res = await proxy(request(`https://acme.motir.site${path}`))
      expect(rewriteOf(res), path).toBe('/_host-unknown')
    }
  })

  it('the 404 target stays UNPREFIXED, so it still lands on the global room', async () => {
    const res = await proxy(request('https://motir.site/anything'))
    expect(rewriteOf(res)).toBe('/_host-unknown')
  })
})

/*
 * MOTIR-7951 — the visitor's language: the `NEXT_LOCALE` cookie, then
 * `Accept-Language`, then English. On the site it is a 307 to the prefixed
 * address; on a tenant host it picks the tree the router rewrites onto.
 */
describe('the first-visit language', () => {
  const ask = (url: string, headers: Record<string, string> = {}) =>
    proxy(request(url, headers))
  const locationOf = (res: Response) => {
    const to = res.headers.get('location')
    return to ? `${new URL(to).pathname}${new URL(to).search}` : null
  }
  const expectLanguageRedirect = (res: Response, to: string) => {
    expect(res.status).toBe(307)
    expect(locationOf(res)).toBe(to)
    expect(res.headers.get('vary')).toMatch(/Cookie/)
    expect(res.headers.get('vary')).toMatch(/Accept-Language/)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  }

  it('moves an unprefixed site address onto the browser’s language', async () => {
    expectLanguageRedirect(
      await ask('https://motir.co/', { 'accept-language': 'ja' }),
      '/ja',
    )
    expectLanguageRedirect(
      await ask('https://motir.co/explore?x=1', { 'accept-language': 'de-AT' }),
      '/de/explore?x=1',
    )
    expect(resolveHost).not.toHaveBeenCalled()
  })

  it('serves English when the browser asks for nothing it speaks', async () => {
    const res = await ask('https://motir.co/', { 'accept-language': 'sv' })
    expect(res.headers.get('location')).toBeNull()
    expect(rewriteOf(res)).toBe('/en')
    expect(res.headers.get('vary')).toMatch(/Accept-Language/)
  })

  it('takes the remembered choice over the browser', async () => {
    expectLanguageRedirect(
      await ask('https://motir.co/', {
        cookie: 'NEXT_LOCALE=fr',
        'accept-language': 'de',
      }),
      '/fr',
    )
    const english = await ask('https://motir.co/', {
      cookie: 'NEXT_LOCALE=en',
      'accept-language': 'ja',
    })
    expect(english.headers.get('location')).toBeNull()
    expect(rewriteOf(english)).toBe('/en')
  })

  it('never moves a prefixed address', async () => {
    const res = await ask('https://motir.co/de/', {
      cookie: 'NEXT_LOCALE=fr',
      'accept-language': 'ja',
    })
    expect(res.headers.get('location') ?? '').not.toMatch(/\/(fr|ja)\b/)
    expect(rewriteOf(res) ?? '/de').toMatch(/^\/de/)
  })

  it('never moves a file or a root metadata route', async () => {
    for (const path of [
      '/motir-mark.svg',
      '/robots.txt',
      '/sitemap.xml',
      '/icon',
    ]) {
      const res = await ask(`https://motir.co${path}`, {
        'accept-language': 'ja',
      })
      expect(res.headers.get('location'), path).toBeNull()
      expect(res.headers.get('x-middleware-next'), path).toBe('1')
    }
  })

  it('serves the share card under the locale tree, never redirected (MOTIR-7972)', async () => {
    // Crawlers send no cookie; a redirect would cost the unfurl. The English
    // card's unprefixed address is rewritten onto `/en/…`; a prefixed one
    // passes straight through.
    const english = await ask('https://motir.co/opengraph-image', {
      'accept-language': 'ja',
    })
    expect(english.headers.get('location')).toBeNull()
    expect(rewriteOf(english)).toBe('/en/opengraph-image')
    const ja = await ask('https://motir.co/ja/opengraph-image', {
      'accept-language': 'ja',
    })
    expect(ja.headers.get('location')).toBeNull()
    expect(rewriteOf(ja)).toBeNull()
    expect(ja.headers.get('x-middleware-next')).toBe('1')
  })

  it('rewrites a workspace host onto the chosen tree, address unchanged', async () => {
    resolveHost.mockResolvedValue(WORKSPACE)
    const fr = { 'accept-language': 'fr' }
    const root = await ask('https://acme.motir.site/', fr)
    expect(root.headers.get('location')).toBeNull()
    expect(rewriteOf(root)).toBe('/fr/no-application')
    expect(root.headers.get('vary')).toMatch(/Accept-Language/)

    const second = await ask('https://acme.motir.site/fr/no-application', fr)
    expect(rewriteOf(second)).toBeNull()
    expect(second.headers.get('x-middleware-next')).toBe('1')
  })

  it('lets a customer domain’s cookie beat the browser', async () => {
    resolveHost.mockResolvedValue(CUSTOM)
    const res = await ask('https://roadmap.acme.com/', {
      cookie: 'NEXT_LOCALE=ja',
      'accept-language': 'de',
    })
    expect(rewriteOf(res)).toBe('/ja/p/PROD')
  })

  it('puts the outage on the chosen tree, and leaves the 404 unprefixed', async () => {
    const fr = { 'accept-language': 'fr' }
    resolveHost.mockResolvedValue({ status: 'failed' })
    expect(rewriteOf(await ask('https://roadmap.acme.com/board', fr))).toBe(
      '/fr/host-unavailable',
    )
    resolveHost.mockResolvedValue({ status: 'not-found' })
    expect(rewriteOf(await ask('https://nope.example/', fr))).toBe(
      '/_host-unknown',
    )
  })
})
