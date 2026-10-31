import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'

/*
 * THE STORY'S motir-marketing GATE (MOTIR-6747, Story MOTIR-6171).
 *
 * Each code card shipped its own tests: the redirect handlers alone
 * (`tests/publicProject/readPageRedirects.test.ts`), the header alone
 * (`tests/host/tenantLinks.test.tsx`). This file asks what neither can: whether
 * the ASSEMBLED surface — the real `proxy()`, its rewrite, its SECOND look at
 * its own rewrite (`alreadyRouted`), then the route handler — still lands every
 * old read link in the app, on all three host kinds.
 *
 * ⚠️ BOTH PASSES ARE DRIVEN. The router rewrites `acme.motir.site/ACME/board`
 * onto `/p/ACME/board`, and Next then runs the proxy again over that rewritten
 * path. A matrix that called only the handler, or the proxy once, stays green
 * while a second pass that answered `not-found` 404s every tenant link — the
 * shape that has broken tenant hosts before.
 *
 * ⚠️ `fetch` IS THE ONE STUB, and it answers only the contract: the host read
 * and the project, changelog and request reads the surviving pages make. It is
 * a router over URLs rather than a queue of answers, so a module that started
 * reading a board or an item would hit the `404 — unexpected read` arm rather
 * than being fed something plausible.
 */

vi.mock('@/lib/tenantDomain', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tenantDomain')>()),
  TENANT_DOMAIN: 'motir.site',
}))

const headerScope = vi.hoisted(() => ({ current: new Headers() }))
vi.mock('next/headers', () => ({
  headers: async () => headerScope.current,
}))

const { proxy } = await import('@/proxy')
const { NextRequest } = await import('next/server')
const { resetHostResolutionCache, ROUTER_PATHS } =
  await import('@/lib/hostResolution')
const boardRoute = await import('@/app/[locale]/p/[identifier]/board/route')
const itemsRoute = await import('@/app/[locale]/p/[identifier]/items/route')
const treeRoute = await import('@/app/[locale]/p/[identifier]/tree/route')
const roadmapRoute = await import('@/app/[locale]/p/[identifier]/roadmap/route')
const itemRoute =
  await import('@/app/[locale]/p/[identifier]/items/[key]/route')
const OverviewPage = (await import('@/app/[locale]/p/[identifier]/page'))
  .default
const ChangelogPage = (
  await import('@/app/[locale]/p/[identifier]/changelog/page')
).default
const IntakePage = (
  await import('@/app/[locale]/p/[identifier]/requests/new/page')
).default
const RequestPage = (
  await import('@/app/[locale]/p/[identifier]/requests/[requestKey]/page')
).default

const APP = 'https://app.test.motir.co'
const fixture = (name: string) =>
  JSON.parse(readFileSync(`e2e/fixtures/${name}`, 'utf8'))

/* ── the three host kinds ─────────────────────────────────────────────────── */

interface HostCase {
  label: string
  origin: string
  /** The address a reader types for `<view>` of ACME on this host. */
  path: (view: string) => string
  /** What `proxy.ts` forwards to a page on this host. */
  headers: Record<string, string>
  /** The project's primary, so the page does not redirect to another host. */
  primary: string
}

const SITE: HostCase = {
  label: 'motir.co',
  origin: 'https://motir.co',
  path: (view) => `/p/ACME${view ? `/${view}` : ''}`,
  headers: {},
  primary: 'https://motir.co/p/ACME',
}
const CUSTOM: HostCase = {
  label: 'a custom domain',
  origin: 'https://roadmap.acme.com',
  path: (view) => (view ? `/${view}` : '/'),
  headers: {},
  primary: 'https://roadmap.acme.com',
}
// A workspace host serves no project since MOTIR-9512, and the router serves
// no customer domain since MOTIR-9527 (the certificate edge answers it), so
// motir.co is the one host whose read links the router still routes; both
// refusals are asserted below.
const ROUTED_HOSTS = [SITE]
// ⚠️ A PROJECT WHOSE PRIMARY IS ANOTHER HOST STILL RENDERS ON motir.co
// (MOTIR-9528). Its `addresses.primary` names the customer's own domain, and
// the page used to redirect there; that redirect retired with the customer
// domain leaving this repository, so the page now renders in place — a thrown
// NEXT_REDIRECT would fail every case below.
const PRIMARY_ELSEWHERE: HostCase = {
  ...SITE,
  label: 'motir.co, for a project whose primary is another host',
  primary: CUSTOM.primary,
}
const HOSTS = [SITE, PRIMARY_ELSEWHERE]

const HOST_READS: Record<string, unknown> = {
  'acme.motir.site': {
    kind: 'no_application',
    workspace: { name: 'Acme' },
  },
  'old.motir.site': { kind: 'alias', redirectTo: 'acme.motir.site' },
}

/** Every URL the contract was asked for, in order. */
let asked: string[] = []

function stubContract(primary: string) {
  asked = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input)
      asked.push(url)
      const path = url.replace(`${APP}/api/public`, '')
      const host = /^\/hosts\/([^/?]+)$/.exec(path)?.[1]
      if (host) {
        const read = HOST_READS[decodeURIComponent(host)]
        return read ? Response.json(read) : new Response(null, { status: 404 })
      }
      if (path === '/p/ACME') {
        return Response.json({
          ...fixture('project.json'),
          identifier: 'ACME',
          name: 'Acme Roadmap',
          addresses: { primary, alternates: [] },
        })
      }
      if (path.startsWith('/p/ACME/changelog')) {
        return Response.json(fixture('changelog.json'))
      }
      if (path === '/p/ACME/requests/ACME-4051') {
        return Response.json({
          ...fixture('request-detail.json'),
          identifier: 'ACME-4051',
        })
      }
      return new Response('unexpected read', { status: 404 })
    }),
  )
}

beforeEach(() => {
  resetHostResolutionCache()
  stubContract(SITE.primary)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  headerScope.current = new Headers()
})

const request = (url: string) =>
  new NextRequest(url, { headers: { host: new URL(url).host } })

const rewriteOf = (res: Response) => {
  const to = res.headers.get('x-middleware-rewrite')
  return to ? new URL(to).pathname : null
}

/**
 * Drive one URL the way Next does: the proxy, then — when it rewrote — the
 * proxy AGAIN over its own rewrite, and return the path that reaches the app.
 */
async function route(url: string): Promise<string> {
  const origin = new URL(url).origin
  const first = await proxy(request(url))
  const rewritten = rewriteOf(first)
  if (!rewritten) {
    expect(first.headers.get('x-middleware-next'), url).toBe('1')
    return new URL(url).pathname
  }
  const second = await proxy(request(`${origin}${rewritten}`))
  // The second pass recognises its own rewrite and steps aside. A rewrite here
  // would mean the router re-routed `/p/ACME/…` as if a reader had typed it —
  // and on the site host, a redirect would mean `/en/…` bounced back to the
  // unprefixed address it came from, forever (MOTIR-7948, measured).
  expect(rewriteOf(second), `second pass over ${rewritten}`).toBeNull()
  expect(second.headers.get('x-middleware-next'), rewritten).toBe('1')
  return rewritten
}

/** Call the route handler Next would match for an app path. */
async function handle(path: string): Promise<Response> {
  // Every page target is inside a locale's tree now (MOTIR-7948): `/en/p/…`.
  const [, locale, p, identifier, view, key] = path.split('/')
  expect(locale).toBe('en')
  expect(p).toBe('p')
  const req = new Request(`https://motir.co${path}`)
  if (view === 'items' && key) {
    return itemRoute.GET(req, {
      params: Promise.resolve({
        identifier: decodeURIComponent(identifier!),
        key: decodeURIComponent(key),
      }),
    })
  }
  const handler = {
    board: boardRoute,
    items: itemsRoute,
    tree: treeRoute,
    roadmap: roadmapRoute,
  }[view!]!
  return handler.GET(req, {
    params: Promise.resolve({ identifier: decodeURIComponent(identifier!) }),
  })
}

/* ── 1 · the redirect matrix ──────────────────────────────────────────────── */

const READ_PATHS = ['board', 'items', 'tree', 'roadmap', 'items/ACME-42']

describe.each(ROUTED_HOSTS)(
  '$label — every old read link lands in the app',
  (h) => {
    it.each(READ_PATHS)(
      '%s → 308 to the same view on APP_ORIGIN',
      async (view) => {
        const url = `${h.origin}${h.path(view)}`
        const reached = await route(url)
        expect(reached).toBe(`/en/p/ACME/${view}`)

        const res = await handle(reached)
        expect(res.status, url).toBe(308)
        expect(res.headers.get('location'), url).toBe(`${APP}/p/ACME/${view}`)
      },
    )
  },
)

describe('the matrix is five cases, not fewer', () => {
  it('one routed host × five read paths', () => {
    expect(ROUTED_HOSTS.length * READ_PATHS.length).toBe(5)
  })

  it('and no case read the contract for anything but a HOST', async () => {
    for (const h of ROUTED_HOSTS) {
      for (const view of READ_PATHS) {
        await handle(await route(`${h.origin}${h.path(view)}`))
      }
    }
    expect(asked.filter((u) => !u.includes('/api/public/hosts/'))).toEqual([])
  })
})

/* ── 2 · the router's refusals, unchanged by the story ────────────────────── */

describe('the router still refuses what it refused before', () => {
  it('a workspace host asked for any project path → not-found, never a redirect', async () => {
    for (const path of [
      '/p/OTHER/board',
      '/OTHER/board',
      '/p/OTHER/items/OTHER-1',
      // MOTIR-9512: not even a project of its own workspace.
      '/ACME/board',
      '/p/ACME/board',
    ]) {
      const res = await proxy(request(`https://acme.motir.site${path}`))
      expect(rewriteOf(res), path).toBe(ROUTER_PATHS.notFound)
      expect(res.headers.get('location'), path).toBeNull()
    }
  })

  it('a retired alias outcome → not-found, never a redirect (ADR §8 Amendment 3 rule 2)', async () => {
    const res = await proxy(request('https://old.motir.site/ACME/board'))
    expect(res.status).not.toBe(301)
    expect(res.headers.get('location')).toBeNull()
    expect(rewriteOf(res)).toBe(ROUTER_PATHS.notFound)
  })

  it('a custom domain’s old read link → not-found, without asking the contract (MOTIR-9527)', async () => {
    for (const view of READ_PATHS) {
      const res = await proxy(request(`${CUSTOM.origin}${CUSTOM.path(view)}`))
      expect(rewriteOf(res), view).toBe(ROUTER_PATHS.notFound)
      expect(res.headers.get('location'), view).toBeNull()
    }
    expect(asked).toEqual([])
  })

  it('the tenant base domain → not-found, without asking the contract', async () => {
    const res = await proxy(request('https://motir.site/ACME/board'))
    expect(rewriteOf(res)).toBe(ROUTER_PATHS.notFound)
    expect(asked).toEqual([])
  })
})

/* ── 3 · the pages that stay, on each host ────────────────────────────────── */

/** A same-host href to a read page — which would 308 off this host. */
const READ_HREF = /\/(board|items|tree|roadmap)(\/|\?|$)/

async function renderPage(h: HostCase, page: () => Promise<React.ReactNode>) {
  headerScope.current = new Headers(h.headers)
  stubContract(h.primary)
  const { container } = render(<>{await page()}</>)
  return [...container.querySelectorAll('a[href]')].map((a) =>
    a.getAttribute('href')!,
  )
}

const PAGES: [string, () => Promise<React.ReactNode>][] = [
  [
    'the overview',
    () => OverviewPage({ params: Promise.resolve({ identifier: 'ACME' }) }),
  ],
  [
    'the changelog',
    () =>
      ChangelogPage({
        params: Promise.resolve({ identifier: 'ACME' }),
        searchParams: Promise.resolve({}),
      }),
  ],
  [
    'the request doorway',
    () => IntakePage({ params: Promise.resolve({ identifier: 'ACME' }) }),
  ],
  [
    'a request page',
    () =>
      RequestPage({
        params: Promise.resolve({
          identifier: 'ACME',
          requestKey: 'ACME-4051',
        }),
      }),
  ],
]

describe.each(HOSTS)('$label — the pages that stay still render', (h) => {
  it.each(PAGES)('%s links no read path on this host', async (_label, page) => {
    const hrefs = await renderPage(h, page)
    expect(hrefs.length).toBeGreaterThan(3)

    // Every read-view link is the APP's, absolute; none is a path here.
    const reads = hrefs.filter((href) => READ_HREF.test(href.split('#')[0]!))
    for (const href of reads) {
      const onThisSite =
        href.startsWith('/') ||
        href.startsWith(`${h.origin}/`) ||
        href.startsWith('https://motir.co/')
      // The hand-offs to `app/act` carry a `return` — it names a page here,
      // never a read path, so the whole href is judged by its own pathname.
      expect(onThisSite ? href : new URL(href).origin, href).toBe(
        onThisSite ? '(no same-host read link)' : APP,
      )
    }
    // And no hand-off sends a reader back to a read path on return.
    for (const href of hrefs.filter((x) => x.includes('return='))) {
      const back = new URL(href).searchParams.get('return')!
      expect(READ_HREF.test(new URL(back).pathname), href).toBe(false)
    }
  })
})
