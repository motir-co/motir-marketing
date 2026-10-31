import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { DEFAULT_LOCALE, LOCALES, routing } from '@/i18n/routing'
import { chooseLocale, LOCALE_COOKIE } from '@/lib/localeDetection'
import { SITE_ORIGIN } from '@/lib/siteOrigin'
import { TENANT_DOMAIN } from '@/lib/tenantDomain'
import {
  isCrawler,
  isFilterUrl,
  isRefusedCrawler,
  trimmedIdeasUrl,
} from '@/lib/crawlPolicy'
import { logRequest } from '@/lib/requestLog'
import {
  PUBLIC_ADDRESS_KIND_HEADER,
  PUBLIC_HOST_HEADER,
  PUBLIC_ORIGIN_HEADER,
  normaliseHost,
  type PublicAddressKind,
} from '@/lib/publicHost'
import {
  ROUTER_PATHS,
  isSiteAssetPath,
  localisedPath,
  resolveHost,
  routeForHost,
} from '@/lib/hostResolution'

/**
 * THE HOST ROUTER (Story MOTIR-3878 · MOTIR-4220) — this repository's first
 * proxy, and the reason `motir.co`'s renderer can answer for other hosts.
 *
 * Next 16 renamed the `middleware.ts` convention to `proxy.ts` and the export to
 * `proxy` (https://nextjs.org/docs/messages/middleware-to-proxy); `motir-core`'s
 * own file is the shape followed here, including `config.matcher`'s guard.
 *
 * ── WHAT IT DOES ─────────────────────────────────────────────────────────
 *
 * A request arrives on a workspace subdomain, `acme.motir.site`. The router
 * resolves it against the contract and REWRITES it onto one of its own pages —
 * the workspace's no-application page at the root, its two root files, or the
 * one 404 — with the URL bar unchanged. The headers it forwards are what a page
 * uses to emit links back at the host it is on (`lib/publicHost.ts`). A
 * customer's own domain is not this router's: the certificate edge answers it
 * (decision MOTIR-9521), and one whose DNS still points here gets the one 404
 * without a contract call (MOTIR-9527).
 *
 * ── ⚠️ `motir.co` NEVER CALLS THE CONTRACT, AND THAT IS ASSERTED ─────────
 *
 * The site's own host, `localhost` and the loopback addresses leave here on the
 * first branch, before any network hop. Every request to the marketing site —
 * the landing, `/explore`, `/docs`, `/legal` — would otherwise pay a round trip
 * to `app.motir.co` to be told it is not a tenant, on the host whose entire job
 * is to be fast and crawlable. `tests/host/hostRouter.test.ts` asserts the
 * absence with a spy rather than trusting the branch to stay first.
 *
 * ── ⚠️ AN OUTAGE IS NOT A 404 ────────────────────────────────────────────
 *
 * When the contract does not answer, the request is rewritten to
 * `/host-unavailable`, which renders the design's ERROR state
 * (`design/public-projects/` panel 12) in the site chrome. Answering 404 instead
 * would tell a crawler that a workspace address is gone every time
 * `app.motir.co` restarts — and a crawler acts on a 404. This is
 * `lib/publicProject.ts`'s three-outcome rule, applied one layer earlier.
 *
 * ── BOUNDARY ─────────────────────────────────────────────────────────────
 *
 * No canonical, `og:url`, sitemap or robots decision is made here: the pages
 * make them, over the headers this sets. And `motir.co/p/*` never redirects to
 * another host — the per-host canonical it once served a customer domain is
 * retired (MOTIR-9528).
 */

// The three paths the router itself produces live in `lib/hostResolution.ts`,
// beside the branch that has to RECOGNISE them — see `alreadyRouted`.
const { notFound: NOT_FOUND_PATH, unavailable: UNAVAILABLE_PATH } = ROUTER_PATHS

/**
 * The two root files that are motir.co's own, built once, and whose WORKSPACE
 * host answer therefore lives in a route handler of its own (MOTIR-8842): a
 * workspace host's `robots.txt` names its own host and sitemap, and its
 * `sitemap.xml` is the project half, which is empty there.
 *
 * ⚠️ READ ONLY ON A RESOLVED WORKSPACE REQUEST. The site branch serves its own
 * built files, and every other host is the one 404 before it gets here — a
 * customer's own domain included, which carries no robots or sitemap from
 * Motir (MOTIR-9528).
 */
const TENANT_ROOT_FILES: Readonly<Record<string, string>> = {
  '/robots.txt': '/robots-tenant.txt',
  '/sitemap.xml': '/sitemap-projects.xml',
}

/**
 * next-intl's locale router (MOTIR-7948), run on the SITE host only.
 *
 * With `as-needed` it rewrites an unprefixed path onto the English tree
 * (`/explore` → `/en/explore`, the visitor's URL unchanged); any other locale's
 * prefixed path passes straight through. Detection and the cookie are off in
 * `i18n/routing.ts`, so today it never moves a visitor between languages.
 *
 * ⚠️ THE ENGLISH TREE ITSELF NEVER REACHES IT, because its rewrite comes back.
 * Next 16 dispatches an internal rewrite back through this proxy (the same
 * second pass `alreadyRouted` handles for tenants), so `/explore` arrives again
 * as `/en/explore` — and next-intl, which cannot tell that from a visitor who
 * typed `/en/explore`, answers it with a redirect to `/explore`. Measured on the
 * standalone server: `/` answered 307 → `/`, forever, and the browser lane never
 * came up. So `/en` and `/en/…` are served as they are. A visitor who types one
 * gets the same page at a second address, which is a duplicate rather than a
 * fault, and the canonical link (MOTIR-7956) names the unprefixed one.
 *
 * ⚠️ IT RUNS INSIDE THE SITE BRANCH, NEVER AHEAD OF THE ROUTER. As a second
 * proxy, or as this proxy's first line, it would rewrite a tenant host's
 * `/MOTIR/board` to `/en/MOTIR/board` before the host was ever resolved — and
 * the site branch would stop being the one that makes no network hop.
 */
const intlMiddleware = createIntlMiddleware(routing)

/**
 * A ROOT metadata route whose address carries no dot — `/icon`, `/apple-icon`,
 * `/twitter-image` (Next may append a content hash: `/icon-1br99b`). They are
 * files at `app/`'s root, outside every locale's tree, so the locale router
 * must not prefix them: under `/en/icon` they would 404.
 */
const ROOT_METADATA_ROUTE =
  /^\/(twitter-image|icon|apple-icon)(-[A-Za-z0-9]+)?$/

/**
 * THE LANDING'S SHARE IMAGE, which lives INSIDE the locale tree (MOTIR-7972):
 * `app/[locale]/opengraph-image.tsx` answers `/<locale>/opengraph-image`.
 * A share image has no language to choose — crawlers send no cookie, and a
 * redirect would cost the unfurl — so neither form is ever detected or
 * redirected: the unprefixed English one is REWRITTEN onto `/en/…`, and a
 * prefixed one is served as it is, never through next-intl (whose `as-needed`
 * prefix would bounce `/en/…`).
 */
const OG_IMAGE_ROUTE = /^\/opengraph-image(-[A-Za-z0-9]+)?$/

/** `/opengraph-image` or `/ja/opengraph-image` → the path after the locale. */
function ogImagePath(pathname: string): { prefixed: boolean } | null {
  if (OG_IMAGE_ROUTE.test(pathname)) return { prefixed: false }
  const [, first = '', ...rest] = pathname.split('/')
  if (
    (LOCALES as readonly string[]).includes(first) &&
    OG_IMAGE_ROUTE.test(`/${rest.join('/')}`)
  )
    return { prefixed: true }
  return null
}

/** A site path the locale router leaves alone — a file or a root metadata route. */
function outsideLocaleTree(pathname: string): boolean {
  return isSiteAssetPath(pathname) || ROOT_METADATA_ROUTE.test(pathname)
}

/** `/en` or `/en/…` — the default locale's tree, which the rewrite produces. */
function inDefaultLocaleTree(pathname: string): boolean {
  return (
    pathname === `/${DEFAULT_LOCALE}` ||
    pathname.startsWith(`/${DEFAULT_LOCALE}/`)
  )
}

/** `/ja`, `/de/…` — any of the twelve as the first segment. */
function hasLocalePrefix(pathname: string): boolean {
  const first = pathname.split('/')[1] ?? ''
  return (LOCALES as readonly string[]).includes(first)
}

/**
 * `/zh-TW/…` → `/zh-tw/…` (MOTIR-9249): a locale segment spelled in another
 * case, answered with the URL code's own spelling. Without it the segment is
 * not a locale prefix, so the page 404s, or a zh-tw browser is sent to a
 * doubled `/zh-tw/zh-TW/…`.
 *
 * ⚠️ 308, UNLIKE THE LANGUAGE REDIRECT'S 307, AND NO `Vary`. The answer
 * depends on the path's spelling alone, never on the cookie or the browser's
 * languages, so it may be cached as the permanent normalisation it is.
 */
function normaliseLocaleCase(request: NextRequest): NextResponse | null {
  const [, first = '', ...rest] = request.nextUrl.pathname.split('/')
  const lower = first.toLowerCase()
  if (first === lower || !(LOCALES as readonly string[]).includes(lower))
    return null
  const destination = request.nextUrl.clone()
  destination.pathname = ['', lower, ...rest].join('/')
  return NextResponse.redirect(destination, 308)
}

/** The visitor's language for this request (MOTIR-7951). */
function visitorLocale(request: NextRequest) {
  return chooseLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get('accept-language'),
  })
}

/**
 * ⚠️ A RESPONSE THAT DEPENDS ON THE COOKIE AND THE BROWSER SAYS SO. Without
 * `Vary`, a shared cache in front of the site would store one visitor's
 * language and serve it to the next.
 */
const LANGUAGE_VARY = 'Cookie, Accept-Language'

function varyOnLanguage(response: NextResponse): NextResponse {
  response.headers.append('Vary', LANGUAGE_VARY)
  return response
}

/**
 * The first-visit move onto the visitor's language: same path, same query,
 * under `/<locale>`.
 *
 * ⚠️ 307, NEVER 301 OR 308. A permanent redirect is cached by the browser, so
 * a visitor who later chose English could never reach `/` again. And
 * `private, no-store`, so nothing between us and them keeps it either.
 */
function redirectToLocale(request: NextRequest, locale: string): NextResponse {
  const destination = new URL(request.nextUrl)
  destination.pathname = `/${locale}${
    request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname
  }`
  const response = varyOnLanguage(NextResponse.redirect(destination, 307))
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}

/**
 * Hosts this router steps aside for — the site itself and every local address.
 *
 * `127.0.0.1` and `[::1]` are here beside `localhost` because the browser lane
 * addresses the app by IP (`e2e/stub/origin.ts`), and a lane whose every request
 * tried to resolve `127.0.0.1` as a tenant would fail differently from
 * production for a reason that has nothing to do with the code under test.
 */
const LOCAL_HOSTS: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
  '[::1]',
])

/**
 * The deployment's own `*.vercel.app` address (`VERCEL_URL`, set on every
 * Vercel function) is the site too, so a release can be read before — and
 * apart from — the DNS that sends motir.co to it. The canonical URLs a page
 * prints still name `SITE_ORIGIN`.
 */
function isSiteHost(host: string): boolean {
  return (
    host === normaliseHost(new URL(SITE_ORIGIN).host) ||
    LOCAL_HOSTS.has(host) ||
    (!!process.env.VERCEL_URL && host === normaliseHost(process.env.VERCEL_URL))
  )
}

/**
 * The visitor's own origin — scheme, host AND port, all three from what the
 * proxy in front of us said rather than from the socket. See
 * `PublicHost.origin` for why the port and the scheme are carried rather than
 * assumed.
 */
function forwardedOrigin(request: NextRequest): string {
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    request.nextUrl.protocol.replace(':', '')
  const authority =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    request.nextUrl.host
  return `${proto}://${authority.trim().toLowerCase()}`
}

/**
 * Forward the request with the three host headers SET (never merged).
 *
 * ⚠️ EVERY BRANCH GOES THROUGH HERE NOW (MOTIR-4430). It used to have a
 * sibling, `rewriteTo(request, pathname)`, which set NOTHING — and the four
 * branches that took it were the four that end at the router's own two landing
 * pads, so `/host-unavailable` and the 404 room were the only surfaces in the
 * app told they were on `motir.co` when they were not. The sibling is DELETED
 * rather than narrowed: a helper that forwards a rewrite WITHOUT the host is a
 * helper the next branch will reach for.
 *
 * ⚠️ AND ONE OF THE TWO STILL CANNOT USE WHAT IT IS SENT, which is worth saying
 * here so the next reader does not conclude the headers are unused.
 * `/host-unavailable` is an ordinary route and reads them. The 404 room is
 * served by `app/not-found.tsx`, the GLOBAL not-found boundary, where a
 * `headers()` read makes the ENTIRE SITE dynamic — measured, and that file
 * carries the route tables. It links absolutely on every host instead. The
 * headers are still SET on that branch because they are the truth about the
 * request and because the day that boundary can read them, this router already
 * says the right thing.
 */
function forwardWithHost(
  request: NextRequest,
  kind: Exclude<PublicAddressKind, 'site'>,
  host: string,
  rewriteTo?: string,
): NextResponse {
  // Copied from the incoming request and then SET, so a client-supplied value is
  // overwritten rather than honoured — the rule `motir-core`'s proxy records for
  // `x-current-path`, and the reason a page may trust these two.
  const headers = new Headers(request.headers)
  headers.set(PUBLIC_ADDRESS_KIND_HEADER, kind)
  headers.set(PUBLIC_HOST_HEADER, host)
  headers.set(PUBLIC_ORIGIN_HEADER, forwardedOrigin(request))

  if (!rewriteTo) return NextResponse.next({ request: { headers } })

  const destination = new URL(request.nextUrl)
  destination.pathname = rewriteTo
  // Which locale tree a tenant page is rewritten onto follows the visitor's
  // cookie and browser (MOTIR-7951), so the response varies on both.
  return varyOnLanguage(
    NextResponse.rewrite(destination, { request: { headers } }),
  )
}

/**
 * Whether a host is in the namespace this router owns: the tenant base domain
 * or a label under it (`acme.motir.site`).
 *
 * ⚠️ EVERY OTHER HOST IS A CUSTOMER'S DOMAIN OR A STRANGER'S, AND NEITHER IS
 * OURS TO RESOLVE (MOTIR-9521 · MOTIR-9527). An issued customer domain is
 * answered by the certificate edge, `motir-edge`. One whose DNS still points
 * here gets the one 404 without a contract call. Asking would draw Motir's own
 * `no-application` page on the customer's domain whenever the contract answers
 * `no_application` for it, and that answer is right for the edge, not for this
 * router.
 */
function inTenantNamespace(host: string): boolean {
  return host === TENANT_DOMAIN || host.endsWith(`.${TENANT_DOMAIN}`)
}

/** The header next-intl's rewrite carries back into this proxy. */
const INTL_REWRITE_HEADER = 'x-next-intl-locale'

/**
 * The entry point: refuse the crawlers `lib/crawlPolicy.ts` names, and any
 * crawler on a filter URL, log the request (`lib/requestLog.ts`), then route
 * it.
 *
 * ⚠️ A REFUSED CRAWLER STILL GETS `robots.txt`. The 403 is for the ones that
 * ignore it; the ones that read it should find the `Disallow: /` that names
 * them, and stop asking.
 *
 * ⚠️ ONE LINE PER VISITOR REQUEST, NOT PER PASS. The English rewrite comes back
 * through this proxy as `/en/…` (see `inDefaultLocaleTree`), and the path
 * cannot tell it from a visitor who typed `/en/…` — both are served. What
 * marks the second pass is the request header next-intl sets on its rewrite,
 * `x-next-intl-locale` (read off a standalone build: absent on a visitor's
 * `/en/explore`, present on the rewritten one). That pass is not logged.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const host =
    normaliseHost(request.headers.get('x-forwarded-host')) ??
    normaliseHost(request.headers.get('host'))
  const agent = request.headers.get('user-agent')
  const { pathname, search } = request.nextUrl
  const refused =
    (isRefusedCrawler(agent) && pathname !== '/robots.txt') ||
    (isCrawler(agent) && isFilterUrl(pathname + search))
  if (!request.headers.has(INTL_REWRITE_HEADER)) {
    logRequest(request, host, refused)
  }
  if (refused) return new NextResponse(null, { status: 403 })
  return route(request)
}

async function route(request: NextRequest): Promise<NextResponse> {
  // ⚠️ THE FORWARDED VALUE WINS. Fly terminates TLS and proxies to the machine,
  // so `Host` is the internal address and `x-forwarded-host` is what the visitor
  // typed. Reading `Host` first would make every tenant request look like the
  // same internal host.
  const host =
    normaliseHost(request.headers.get('x-forwarded-host')) ??
    normaliseHost(request.headers.get('host'))

  // The site itself — and no network hop. See the note above. Its one job here
  // is the locale tree (MOTIR-7948): everything that is not a file or a root
  // metadata route goes through next-intl, which maps the address onto
  // `app/[locale]`.
  //
  // ⚠️ AN UNPREFIXED PAGE ADDRESS IS WHERE THE LANGUAGE IS CHOSEN (MOTIR-7951),
  // and nowhere else. A prefixed one (`/de/…`) is never moved, whatever the
  // cookie or the browser says — a shared German link stays German. A file or
  // a root metadata route has no language. And `/en/…` here is the English
  // rewrite coming back around (see `inDefaultLocaleTree`), never a choice.
  if (!host || isSiteHost(host)) {
    const fixed = normaliseLocaleCase(request)
    if (fixed) return fixed
    // An `/ideas` address with more tags than the page honours is answered
    // with the trimmed one before anything renders (`lib/crawlPolicy.ts`).
    const trimmed = trimmedIdeasUrl(request.nextUrl)
    if (trimmed) return NextResponse.redirect(trimmed, 308)
    const { pathname } = request.nextUrl
    const ogImage = ogImagePath(pathname)
    if (ogImage?.prefixed) return NextResponse.next()
    if (ogImage) {
      const english = request.nextUrl.clone()
      english.pathname = `/${DEFAULT_LOCALE}${pathname}`
      return NextResponse.rewrite(english)
    }
    if (outsideLocaleTree(pathname) || inDefaultLocaleTree(pathname))
      return NextResponse.next()
    if (hasLocalePrefix(pathname)) return intlMiddleware(request)
    const locale = visitorLocale(request)
    if (locale !== DEFAULT_LOCALE) return redirectToLocale(request, locale)
    return varyOnLanguage(intlMiddleware(request))
  }

  // ⚠️ THE THREE BRANCHES WITH NO RESOLUTION, AND THEY ARE `unresolved` RATHER
  // THAN SILENT (MOTIR-4430). None of them can say WHICH tenant this is — the
  // base domain is not one, and the other two are the contract declining or not
  // answering. But all three know the one thing a link depends on: the visitor
  // is not on `motir.co`. So they forward the host under the fourth kind, and
  // the two landing pads below spell every site path absolutely instead of
  // offering a lost visitor six doors that 404 where they are standing.

  // The base domain itself is not a tenant address (`lib/tenantDomain.ts`), and
  // a host outside the namespace is not this router's to resolve at all (see
  // `inTenantNamespace`). Neither costs a network hop.
  if (host === TENANT_DOMAIN || !inTenantNamespace(host)) {
    return forwardWithHost(request, 'unresolved', host, NOT_FOUND_PATH)
  }

  // The visitor's language picks which locale tree a tenant page is rewritten
  // onto; the address keeps its shape — no prefix, no redirect (MOTIR-7951).
  const locale = visitorLocale(request)

  const read = await resolveHost(host)
  if (read.status === 'failed') {
    // The OUTAGE — a real workspace address, rendered while `app.motir.co` is
    // restarting. Site-relative chrome would be wrong here, which is why
    // "SITE_HOST is fine on an unresolvable host" is not the disposition
    // MOTIR-4430 took.
    return forwardWithHost(
      request,
      'unresolved',
      host,
      localisedPath(UNAVAILABLE_PATH, locale),
    )
  }
  if (read.status === 'not-found') {
    return forwardWithHost(request, 'unresolved', host, NOT_FOUND_PATH)
  }

  const route = routeForHost(request.nextUrl.pathname, locale)

  switch (route.action) {
    case 'forward':
      // A workspace host's `robots.txt` and `sitemap.xml` are the two root
      // files answered per request, by route handlers: motir.co's own are built.
      if (TENANT_ROOT_FILES[request.nextUrl.pathname]) {
        return forwardWithHost(
          request,
          'workspace',
          host,
          TENANT_ROOT_FILES[request.nextUrl.pathname],
        )
      }
      // The router's own rewrite, coming back around. The headers are SET again
      // rather than assumed to have survived, so the page reads them whichever
      // pass produced the request it renders.
      return forwardWithHost(request, 'workspace', host)
    case 'not-found':
      // ⚠️ THE ONE 404 BRANCH THAT HOLDS A RESOLUTION, so it forwards the REAL
      // kind rather than `unresolved` (MOTIR-4430). `hey.motir.site/explore` is
      // a live workspace address serving a path it does not have — the host is
      // known, the path is not — and this is the branch the card's
      // reproduction takes.
      return forwardWithHost(request, 'workspace', host, NOT_FOUND_PATH)
    case 'no-application':
      // A live workspace host with no application to serve yet (MOTIR-9512).
      return forwardWithHost(request, 'workspace', host, route.path)
    default:
      return forwardWithHost(request, 'workspace', host, route.path)
  }
}

export const config = {
  /**
   * Everything except Next's own asset routes.
   *
   * ⚠️ NO BLANKET `.*\..*` EXCLUSION, and the difference is a real page:
   * `/ACME/changelog.xml` is a tenant host's Atom feed and contains a dot, so
   * the idiomatic "skip anything with an extension" matcher would leave the feed
   * unrouted and 404 on every tenant host — in people's feed readers. Site
   * assets are recognised by SHAPE instead, in `isSiteAssetPath`, which knows
   * that a project path is never one segment.
   */
  matcher: ['/((?!_next/static|_next/image).*)'],
}
