import { APP_ORIGIN } from '@/lib/appOrigin'
import { normaliseHost } from '@/lib/publicHost'
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/routing'

/**
 * THE ROUTER'S READ — `GET {APP_ORIGIN}/api/public/hosts/{host}`, its cache, and
 * the pure decision it feeds (Story MOTIR-3878 · MOTIR-4220).
 *
 * ── ⚠️ WHY THIS IS NOT IN `lib/publicProject.ts` ─────────────────────────
 *
 * That module's header says it "owns every fetch that surface makes", and it
 * does — every fetch a PAGE makes. This one is made by `proxy.ts`, before a page
 * exists, and it differs in four ways that would each be a wart over there:
 *
 *   • it runs in Next's PROXY bundle, a different runtime with no `next: {}`
 *     fetch cache to hand caching to;
 *   • it reads the RESPONSE HEADERS, because the contract states its own
 *     freshness in `Cache-Control` and this is the caller that honours it;
 *   • it is on the critical path of EVERY request to a tenant host, so it takes
 *     a hard timeout — a page data read can afford to wait where a router
 *     cannot;
 *   • its key is attacker-supplied (anyone can point a `Host` header at us), so
 *     its cache is BOUNDED. See the eviction note below.
 *
 * The shapes below mirror `motir-core`'s `lib/dto/publicAddresses.ts`. They are
 * RESTATED, not imported — the same seam rule `lib/publicProject.ts` records:
 * the contract is guarded in the PRODUCING repository, because a contract test
 * that lives only in the consumer reports the break after it has shipped.
 */

/* ── the contract shapes (motir-core `lib/dto/publicAddresses.ts`) ────────── */

/**
 * A live workspace subdomain with no application to serve yet (Story MOTIR-4528
 * · MOTIR-9512, the address decision MOTIR-9790). The bare workspace host
 * belongs to the workspace's default application; until the application record
 * exists, every live workspace host answers this. It lists no projects — they
 * live at `motir.co/p/<identifier>`.
 *
 * There is NO alias shape any more. ADR §8 Amendment 3 rule 2: a renamed or
 * released name stops answering at once, so the producer answers it the same
 * 404 as an unknown host and nothing here redirects.
 */
export interface PublicHostNoApplication {
  readonly kind: 'no_application'
  readonly workspace: { readonly name: string }
}

/**
 * Every answer this router serves — a workspace host, and nothing else.
 *
 * ⚠️ THERE IS NO CUSTOMER-DOMAIN SHAPE, AND THAT IS THE DECISION, NOT A GAP
 * (MOTIR-9521 · MOTIR-9527). An issued customer domain is answered by the
 * certificate edge, `motir-edge`, which forwards it to the application it names
 * or renders its own page. This repository neither resolves nor routes one: the
 * proxy turns away every host outside its own namespace before it asks, and a
 * `project`, `application` or `members_only_application` answer that reaches
 * {@link resolveHost} anyway lands on the unknown-kind 404 below.
 */
export type PublicHostResolution = PublicHostNoApplication

/** The kinds this router understands; anything else is a 404, never a guess. */
const KNOWN_KINDS: ReadonlySet<string> = new Set<PublicHostResolution['kind']>([
  'no_application',
])

/**
 * The same THREE outcomes `lib/publicProject.ts` splits, for the same reason and
 * with higher stakes: collapsing `failed` into `not-found` would 404 every
 * workspace host for as long as `app.motir.co` is restarting, and a 404 is
 * what a crawler acts on.
 */
export type HostRead =
  | { status: 'ok'; data: PublicHostResolution }
  | { status: 'not-found' }
  | { status: 'failed' }

/* ── the cache ────────────────────────────────────────────────────────────── */

/**
 * How long an answer with no usable `Cache-Control` is held.
 *
 * The contract sends `max-age=30` on a 200 (motir-core
 * `lib/publicAddresses/hostContractCache.ts`); this is only the floor for a
 * deployment that has stripped it. It is the producer's number on purpose: a
 * retired name may keep answering for at most that bound, and two caches in
 * series ADD their bounds, so a longer floor here would let a renamed or
 * released name answer past it.
 */
const DEFAULT_MAX_AGE_MS = 30_000

/**
 * ⚠️ THE CACHE IS BOUNDED, AND THE BOUND IS A SECURITY PROPERTY, NOT TIDINESS.
 * The key is the `Host` header, which ANY caller can set to any value — a
 * script pointing a million distinct hostnames at this app would otherwise grow
 * an unbounded `Map` in a 512 MB machine, and every one of those requests is a
 * 404 that costs nothing to re-derive.
 */
const MAX_ENTRIES = 1000

/** How long the router will wait for the contract before giving up. */
const REQUEST_TIMEOUT_MS = 3_000

interface CacheEntry {
  readonly read: HostRead
  readonly expiresAt: number
}

const cache = new Map<string, CacheEntry>()

/**
 * Drop every cached resolution. For tests — a module-level cache outlives one
 * test FILE, so a suite that stubs `fetch` and one that does not will otherwise
 * inherit each other's verdicts.
 */
export function resetHostResolutionCache(): void {
  cache.clear()
}

/**
 * Whether an answer may be remembered at all. The contract sends `no-store` on
 * a 404, so a name claimed moments after a refusal is not hidden by a cached one.
 */
export function isStorable(cacheControl: string | null): boolean {
  return !/(?:^|[\s,])no-store(?:$|[\s,])/i.test(cacheControl ?? '')
}

/** `public, max-age=30` → 30_000. */
export function maxAgeMs(cacheControl: string | null): number {
  const match = /(?:^|[\s,])max-age\s*=\s*(\d+)/i.exec(cacheControl ?? '')
  if (!match) return DEFAULT_MAX_AGE_MS
  return Number(match[1]) * 1000
}

function remember(
  host: string,
  read: HostRead,
  cacheControl: string | null,
): void {
  if (!isStorable(cacheControl)) return
  const ttlMs = maxAgeMs(cacheControl)
  // Insertion-ordered, so the first key is the oldest: one eviction per write
  // keeps the map at its bound without a sweep.
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next()
    if (!oldest.done) cache.delete(oldest.value)
  }
  cache.set(host, { read, expiresAt: Date.now() + ttlMs })
}

/**
 * Resolve a host through the public contract, with the in-process cache.
 *
 * ⚠️ `ok` AND `not-found` ARE CACHED FOR AS LONG AS THE CONTRACT SAYS; `failed`
 * IS NOT. The contract's own `Cache-Control` decides: `max-age=30` on a 200,
 * and `no-store` on a 404 (so a name claimed moments after a refusal is not
 * hidden by it). An outage is not an answer: pinning it would extend every
 * `app.motir.co` restart into tenant hosts showing the error state after the
 * API came back.
 */
export async function resolveHost(rawHost: string): Promise<HostRead> {
  const host = normaliseHost(rawHost)
  if (!host) return { status: 'not-found' }

  const hit = cache.get(host)
  if (hit && hit.expiresAt > Date.now()) return hit.read

  let res: Response
  try {
    res = await fetch(
      `${APP_ORIGIN}/api/public/hosts/${encodeURIComponent(host)}`,
      {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    )
  } catch {
    // A network error, a DNS failure, the timeout above — the API did not
    // answer. The visitor's page says so; it does not say the project is gone.
    return { status: 'failed' }
  }

  if (res.status === 404) {
    const read: HostRead = { status: 'not-found' }
    remember(host, read, res.headers.get('cache-control'))
    return read
  }
  if (!res.ok) return { status: 'failed' }

  let data: PublicHostResolution
  try {
    data = (await res.json()) as PublicHostResolution
  } catch {
    // A 200 that is not JSON is the API not answering in any useful sense — a
    // proxy's own error page, most likely. It is an outage, not a 404.
    return { status: 'failed' }
  }

  // ⚠️ A KIND THIS ROUTER DOES NOT KNOW IS A 404, NEVER A GUESS. A stale
  // producer still sending the retired `alias` outcome must not be redirected,
  // and a newer one sending a kind this build predates must not be drawn as a
  // shape it was not given. Not cached: it is a version skew, not an answer.
  if (!data || typeof data !== 'object' || !KNOWN_KINDS.has(data.kind)) {
    return { status: 'not-found' }
  }

  const read: HostRead = { status: 'ok', data }
  remember(host, read, res.headers.get('cache-control'))
  return read
}

/* ── the decision ─────────────────────────────────────────────────────────── */

/**
 * The paths the router itself produces. Recognising them is what makes
 * {@link routeForHost} IDEMPOTENT — see the ⚠️ on that function.
 */
export const ROUTER_PATHS = {
  /**
   * A live workspace host with no application yet (MOTIR-9512) — a localised,
   * `noindex` page in the site chrome that names the workspace.
   */
  noApplication: '/no-application',
  /**
   * No route matches it, so Next renders `app/not-found.tsx` with a 404.
   *
   * ⚠️ IT STAYS UNMATCHED, AND MOTIR-4430 BUILT THE ALTERNATIVE AND MEASURED IT
   * BACK OUT. Turning this into a real segment is the obvious way to hand the
   * 404 room the request's host — a `page.tsx` that calls `notFound()` beside a
   * `not-found.tsx` that reads the headers — and on `next@16.2.6` it does not
   * work: a NESTED `not-found.tsx` renders only while it is SYNCHRONOUS. Made
   * `async`, or given an async child, it silently produces an empty document
   * (measured in `next dev`: `/host-unknown` answered 404 with no chrome, no
   * room and no error in the log). `NextResponse.rewrite(dest, { status: 404 })`
   * was measured too and is IGNORED — the rewritten page answers 200, which is
   * the soft-404 this whole surface exists to avoid.
   *
   * So the room does not ask which host it is on. It spells every `motir.co`
   * path ABSOLUTELY on every host, which is correct on all of them and needs no
   * request read at all — `app/not-found.tsx` carries the full reasoning and
   * what the alternatives cost.
   */
  notFound: '/_host-unknown',
  /** A real route rendering the ERROR state — never a 404. */
  unavailable: '/host-unavailable',
} as const

/**
 * A router page target inside one locale's tree (MOTIR-7948) — `/en/no-application`,
 * `/en/host-unavailable`.
 *
 * Every PAGE lives under `app/[locale]` now, so a rewrite onto an unprefixed
 * `/p/<id>` would reach no route at all. The locale is a parameter rather than
 * a constant because the proxy detection card is the one that CHOOSES it; this
 * card always passes English.
 *
 * ⚠️ `notFound` IS NEVER PREFIXED. It stays unmatched on purpose (the ⚠️ on
 * {@link ROUTER_PATHS}`.notFound`), and under a prefix it would still be
 * unmatched — but by the LOCALE layout's 404 rather than the global one, which
 * is the room the 404 card owns. Unprefixed, it is a first segment that is not
 * a locale, and so lands on `app/not-found.tsx` exactly as it did.
 */
export function localisedPath(
  path: string,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return `/${locale}${path === '/' ? '' : path}`
}

/**
 * Split a leading locale segment off a path — `/en/p/ACME` → `['en', '/p/ACME']`
 * — or `null` when the first segment is not one of the twelve.
 */
function splitLocale(pathname: string): [Locale, string] | null {
  const [, first, ...rest] = pathname.split('/')
  const locale = LOCALES.find((l) => l === first)
  return locale ? [locale, `/${rest.join('/')}`] : null
}

/** What the router does with one request. */
export type HostRoute =
  /**
   * Serve the path as-is, with the host headers set on the forwarded request.
   *
   * ⚠️ THE HEADERS TRAVEL EVEN WHEN THE PATH DOES NOT, and that was not true
   * when this shipped (MOTIR-4220). `/sitemap.xml` and `/robots.txt` are
   * site-asset-shaped paths, so they took this arm — and MOTIR-4222 makes both
   * of them read the host, because a sitemap may only list URLs on its own.
   * Forwarding nothing meant they answered as `motir.co` on every tenant host.
   */
  | { action: 'forward' }
  /**
   * Rewrite one of the router's own pages onto the visitor's locale tree, with
   * the visitor's URL unchanged — a bare `/host-unavailable` typed on the host.
   */
  | { action: 'rewrite'; path: string }
  /**
   * A live workspace host's ROOT while it has no application to serve — the
   * locale's `/no-application` page.
   */
  | { action: 'no-application'; path: string }
  /** The site's not-found page, with a 404 status. */
  | { action: 'not-found' }

/**
 * A path that belongs to the SITE rather than to a project — `/motir-mark.svg`,
 * `/favicon.ico`, `/robots.txt`.
 *
 * ⚠️ IT EXISTS BECAUSE THE CHROME IS THE SAME CHROME. A workspace host's
 * `/no-application` page wears `SiteHeader` and `SiteFooter`, whose logo is
 * `/motir-mark.svg` at the ROOT — so a router that 404'd every path but `/`
 * would 404 the logo and the page would render with a hole in it.
 *
 * ONE segment, containing a dot. A project's tab paths are two segments or more
 * (`/ACME/changelog.xml`), and a project identifier cannot contain a dot — so
 * the test is unambiguous in both directions. `/_next/*` never reaches here at
 * all; `config.matcher` in `proxy.ts` excludes it.
 */
export function isSiteAssetPath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)
  return segments.length === 1 && segments[0]!.includes('.')
}

/**
 * ⚠️ THE ROUTER SEES ITS OWN REWRITE, AND THIS IS WHERE THAT IS HANDLED.
 *
 * MEASURED, not assumed. Next 16 dispatches an internal `NextResponse.rewrite`
 * back through the proxy, so one request to `acme.motir.site/` arrives here
 * TWICE — first as `/`, then as the `/en/no-application` this function just
 * produced. Without this branch the second pass is a locale-prefixed path the
 * host does not serve and answers 404, while every unit test over a single pass
 * stays green.
 *
 * ⚠️ AND IT IS RECOGNISED BY SHAPE, NOT BY A MARKER HEADER. A header saying
 * "the router already ran" would be settable by any caller. The router's own
 * pages are the only targets it recognises, and each is one a visitor may
 * request directly anyway, so there is nothing to forge.
 *
 * ⚠️ NO `/p/<identifier>` PATH IS EVER ONE OF THEM ANY MORE (MOTIR-9527). The
 * customer-domain arm that rewrote onto the project tree is gone, so `/p/…` on a
 * workspace host — bare or under a locale — is the one 404 like any other path.
 */
function alreadyRouted(pathname: string, locale: Locale): HostRoute | null {
  if (pathname === ROUTER_PATHS.notFound) return { action: 'forward' }

  // ⚠️ THE ROUTER'S OWN TARGETS CARRY A LOCALE (MOTIR-7948), so the second
  // pass arrives as `/en/no-application`. A path WITHOUT one is still
  // recognised — a visitor can type `/host-unavailable` on the host — but it is
  // rewritten onto the locale's tree rather than forwarded, because no route
  // serves it bare.
  const split = splitLocale(pathname)
  const bare = split ? split[1] : pathname
  const own = (route: string): HostRoute =>
    split
      ? { action: 'forward' }
      : { action: 'rewrite', path: localisedPath(route, locale) }

  if (bare === ROUTER_PATHS.unavailable || bare === ROUTER_PATHS.noApplication)
    return own(bare)
  // A locale-prefixed path that is none of the router's targets — `/en/`,
  // `/de/explore` or `/en/p/ACME` on a workspace host — is not an address this
  // host serves.
  return split ? { action: 'not-found' } : null
}

/**
 * The router's decision for a resolved workspace host, given where the visitor
 * asked to go. PURE — every arm is a unit test, and the proxy is the thin shell
 * that turns this into a `NextResponse`.
 *
 * ⚠️ IT TAKES NO RESOLUTION, ON PURPOSE (MOTIR-9527). The contract has one
 * shape this router serves, so a parameter could carry only one value — and a
 * one-valued parameter invites the next reader to restore the arm it implies.
 */
export function routeForHost(
  pathname: string,
  locale: Locale = DEFAULT_LOCALE,
): HostRoute {
  const routed = alreadyRouted(pathname, locale)
  if (routed) return routed

  // A live workspace host with no application yet. Its ROOT says so; every
  // other path is a 404 except a site asset the shared chrome needs. It serves
  // no project paths — public projects live at `motir.co/p/<identifier>`.
  if (pathname === '/') {
    return {
      action: 'no-application',
      path: localisedPath(ROUTER_PATHS.noApplication, locale),
    }
  }
  if (isSiteAssetPath(pathname)) return { action: 'forward' }
  return { action: 'not-found' }
}
