import { SITE_ORIGIN, siteUrl } from '@/lib/siteOrigin'
import { localizedPath } from '@/i18n/localizedPath'
import type { Locale } from '@/i18n/routing'

/**
 * THE ONE PLACE THAT KNOWS WHAT A LINK LOOKS LIKE ON THIS HOST
 * (Story MOTIR-3878 · MOTIR-4220).
 *
 * A project page has ONE shape of address, the site's: `motir.co/p/ACME/board`,
 * under a locale prefix where the page is not English. A customer's own domain
 * is answered by the certificate edge (`motir-edge`, decision MOTIR-9521), never
 * by this repository, and a workspace host serves no project (MOTIR-9790). Every
 * href under `app/p/**` still goes through {@link publicPathFor}, so the locale
 * prefix is spelled in one place and a grep for a `/p/` string literal in that
 * tree finds none.
 *
 * ── ⚠️ THE HOST IS A PROP, NOT AN AMBIENT READ, AND THAT IS DELIBERATE ────
 *
 * `requestPublicHost()` below reads it from the request once, in the async
 * component at the top of each route; everything under that takes it as a
 * parameter. The alternative — every leaf component awaiting `headers()` — was
 * rejected for two reasons, and the second is the load-bearing one:
 *
 *   1. It makes the rows, `ErrorState` and the tab bar async Server
 *      Components, which `@testing-library/react` cannot render at all. The
 *      component tests that assert what these emit would have had to be deleted
 *      and replaced by end-to-end walks — a strictly worse trade for the exact
 *      behaviour this card is about.
 *   2. A component whose output depends on a value it did not receive is a
 *      component whose test can pass while the page is wrong. Passing it makes
 *      the dependency visible in the type, so a caller that forgets it is a
 *      compile error rather than a link that is wrong on two hosts out of three.
 *
 * The default is {@link SITE_HOST}, which is what an unrouted request already
 * is — `motir.co` is not a special case, it is the `site` kind.
 */

/**
 * Which SHAPE of address this request arrived on.
 *
 * `site` is `motir.co` itself. `workspace` is a live workspace subdomain
 * (`acme.motir.site`), the one tenant case the router serves. There is no
 * customer-domain kind (MOTIR-9528): a customer's own domain is the certificate
 * edge's, and this repository answers it with the one 404 as `unresolved`.
 *
 * ── ⚠️ `unresolved` IS THE FOURTH SHAPE, AND IT IS NOT A TENANT (MOTIR-4430) ─
 *
 * A request can arrive on a host that is neither this site nor an address the
 * contract could resolve. There are exactly three of them and `proxy.ts` names
 * each one:
 *
 *   • the tenant BASE DOMAIN itself (`motir.site`), which has no row by
 *     construction and is answered without a hop;
 *   • a host the contract says it does NOT know (`read.status === 'not-found'`);
 *   • a host the contract did not ANSWER for (`read.status === 'failed'`) — the
 *     outage, while `app.motir.co` restarts.
 *
 * A host outside the tenant namespace — a customer's domain whose DNS still
 * points here — is answered the same way as the base domain, without a hop
 * (MOTIR-9527).
 *
 * Before this kind existed those three rendered the 404 room and
 * `/host-unavailable` as {@link SITE_HOST}, so the shared chrome spelled
 * `/explore`, `/docs`, `/design` and the legal paths ROOT-RELATIVE — against a
 * host that serves none of them. The one thing all three know for certain is
 * the thing that decides every link: **this is not `motir.co`**. So `unresolved`
 * reads as "not the site" wherever a link is spelled ({@link siteLinkFor}) and
 * as nothing else — it is never a project address, and no page under `app/p/**`
 * is ever reached with it, because the router rewrites all three to one of its
 * own two landing pads.
 *
 * It carries `host` and `origin` like a tenant kind, because the router knows
 * both from the request itself — they are read off the forwarded headers rather
 * than from the contract, so an unresolvable host has them exactly as a resolved
 * one does.
 */
export type PublicAddressKind = 'site' | 'workspace' | 'unresolved'

/** The request's address, as the router resolved it. */
export interface PublicHost {
  readonly kind: PublicAddressKind
  /** The tenant host, lowercased and without a port; `null` on the site. */
  readonly host: string | null
  /**
   * The tenant's full ORIGIN — scheme, host and port; `null` on the site.
   *
   * ⚠️ IT IS CARRIED RATHER THAN DERIVED, and the two things it removes are
   * both guesses. A tenant address always serves over https in production, so
   * `https://${host}` looks safe — but the browser lane reaches the app at
   * `http://acme.localhost:4318`, and a `robots.txt` there would name
   * `https://acme.localhost/sitemap.xml`: a URL that resolves nowhere, in the
   * one file whose entire job is to hand a crawler a working address. The
   * router knows the scheme (`x-forwarded-proto`) and the port (the forwarded
   * host), so it says so instead of leaving each consumer to assume.
   */
  readonly origin: string | null
}

/** `motir.co` — and every request the router stepped aside for. */
export const SITE_HOST: PublicHost = { kind: 'site', host: null, origin: null }

/**
 * FOR A DOCUMENT THAT CANNOT ASK WHICH HOST IT IS ON (MOTIR-4430).
 *
 * There is exactly one such surface and it is the 404 room. `app/not-found.tsx`
 * is the GLOBAL not-found boundary, so it sits in every route's tree — and a
 * `headers()` read there makes the entire application dynamic. Measured on a
 * clean `pnpm build`: `/`, `/design`, `/docs`, `/docs/mcp`,
 * `/docs/public-address`, `/docs/sandbox`, `/legal` and `/_not-found` all moved
 * `○ (Static)` → `ƒ (Dynamic)`, and `/legal/[slug]` lost its seven SSG paths.
 * `export const dynamic = 'force-dynamic'` does not scope it; that was measured
 * too. Every alternative that would have let the room ask was measured and
 * failed — see `app/not-found.tsx`.
 *
 * So the room takes THIS, and the answer it gets is right on every host: the
 * `kind` is not `site`, so {@link siteLinkFor} spells every `motir.co` path
 * ABSOLUTELY, which resolves to the same page on `motir.co` and to the only
 * working one everywhere else. `host` and `origin` are null because nothing
 * knows them — and nothing on that page reads them.
 *
 * ⚠️ IT IS NOT A DEFAULT AND IT IS NOT `SITE_HOST`'s SIBLING. A page that CAN
 * read the request must read it: `app/host-unavailable/page.tsx` is its own
 * route and does, and every `/p/**` surface has since MOTIR-4372. This constant
 * exists for the one document whose asking is charged to every other page.
 */
export const UNKNOWN_HOST: PublicHost = {
  kind: 'unresolved',
  host: null,
  origin: null,
}

/**
 * The two request headers the router sets, read back by
 * {@link requestPublicHost}.
 *
 * ⚠️ SET ON THE FORWARDED REQUEST, NEVER ON THE RESPONSE — nothing about a
 * route's caching changes. And OVERWRITTEN on every request the router handles,
 * so a client that sends its own `x-motir-address-kind` cannot talk a page into
 * emitting another host's links. A request the router did NOT handle carries
 * neither header and reads as {@link SITE_HOST}, which is the correct answer for
 * it — the headers are never an authorization input, only a link shape.
 */
export const PUBLIC_HOST_HEADER = 'x-motir-public-host'
export const PUBLIC_ADDRESS_KIND_HEADER = 'x-motir-address-kind'
/** Scheme, host and port — see {@link PublicHost.origin}. */
export const PUBLIC_ORIGIN_HEADER = 'x-motir-public-origin'

const KINDS: ReadonlySet<string> = new Set<PublicAddressKind>([
  'site',
  'workspace',
  'unresolved',
])

/**
 * A `Host` / `x-forwarded-host` value reduced to a comparable hostname:
 * lowercased, trimmed, with the port removed.
 *
 * ⚠️ IPv6 LITERALS KEEP THEIR BRACKETS AND LOSE ONLY THE PORT. `[::1]:4318`
 * has colons inside the address as well as before the port, so splitting on the
 * first colon would truncate it to `[` — a host that matches nothing and is not
 * obviously wrong when read in a log.
 */
export function normaliseHost(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim().toLowerCase()
  if (!value) return null
  if (value.startsWith('[')) {
    const close = value.indexOf(']')
    return close === -1 ? value : value.slice(0, close + 1)
  }
  const colon = value.indexOf(':')
  const host = colon === -1 ? value : value.slice(0, colon)
  return host || null
}

/**
 * The path of one public-project page.
 *
 * `path` is the suffix BELOW the project root, already URL-encoded and with no
 * leading slash — `''` for the overview, `'board'`, `'items/ACME-42'`,
 * `'changelog.xml'`. The identifier is encoded here, because it is a path
 * segment this function alone emits.
 *
 * ⚠️ ONE SHAPE FOR EVERY KIND (MOTIR-9528). A project page lives on the site
 * only: a workspace host serves no project (MOTIR-9790, its root is the
 * no-application page) and an `unresolved` host reaches only the router's own
 * two landing pads (MOTIR-4430). No kind can produce a path at a host's root.
 * `host` stays a parameter so every caller keeps saying which host it renders
 * on, which {@link siteLinkFor} and the canonical still need.
 *
 * ⚠️ THE LOCALE IS A REQUIRED PARAMETER (MOTIR-7971). On motir.co a project
 * page has twelve addresses — `/p/ACME` and `/fr/p/ACME` and the rest — and a
 * tab bar on the French page must link to the French tabs, or every click is a
 * hop through the proxy back to French (or, for a visitor with no cookie, a
 * silent move into English). Required rather than defaulted so a forgotten
 * caller is a compile error, not a link that is wrong in eleven languages out
 * of twelve.
 */
export function publicPathFor(
  host: PublicHost,
  identifier: string,
  path: string,
  locale: Locale,
): string {
  const rest = path ? `/${path}` : ''
  return localizedPath(locale, `/p/${encodeURIComponent(identifier)}${rest}`)
}

/** The same path with a query string appended, dropping empty values. */
export function publicPathWithQuery(
  host: PublicHost,
  identifier: string,
  path: string,
  params: Record<string, string | undefined>,
  locale: Locale,
): string {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v)
  const qs = search.toString()
  return `${publicPathFor(host, identifier, path, locale)}${qs ? `?${qs}` : ''}`
}

/**
 * A link to one of THIS SITE's OWN pages, spelled for the host it is rendered
 * on (MOTIR-4372).
 *
 * `publicPathFor` above answers the mirror question — where does a PROJECT's
 * page live — and the two together are the whole of the per-host address
 * model. A tenant host serves none of the site's pages, so `/explore`, `/docs`,
 * `/design` and `/legal` are 404 there: **a tenant host is not a copy of the
 * marketing site**.
 *
 * ⚠️ THE FAILURE IT REMOVES IS NOT ONLY A DEAD CLICK. These paths are rendered
 * into the shared chrome, which every tenant page wears, and Next RSC-prefetches
 * a same-origin `next/link` on render — so before MOTIR-4372 every tenant page
 * load spent three 404s on `?_rsc=` fetches nobody had clicked. That is why a
 * caller must also drop `next/link` for a plain `<a>` off the site: an absolute
 * cross-origin href is what stops the prefetch, and the helper cannot do that
 * half for it.
 *
 * ⚠️ AND THE SITE ARM RETURNS THE PATH UNCHANGED, DELIBERATELY. `motir.co`'s
 * own chrome keeps exactly the hrefs it has always had — no absolute URLs, no
 * redirect hop, no `next/link` lost — so this function is a no-op on the host
 * where the links were already right, and every change it makes is on a host
 * where the old answer was a 404.
 *
 * ⚠️ AND THE TEST IS `=== 'site'`, NOT A LIST OF TENANT KINDS (MOTIR-4430).
 * That is what makes the fourth kind free: `unresolved` — the base domain, an
 * unknown host, a host the contract could not answer for — is not the site, so
 * it takes the absolute arm, which is the only arm that can work. A predicate
 * written as a list of tenant kinds would have answered "relative" for a shape
 * that did not exist when it was written.
 *
 * ⚠️ AND IT CARRIES THE PAGE'S LOCALE, ON EVERY HOST (MOTIR-7971). The site is
 * served in twelve languages, English unprefixed, and a link that dropped the
 * prefix sent a French reader to the English page — a proxy hop back to French
 * when they had the cookie, a silent move into English when they had arrived on
 * a shared `/fr/…` link without one. Off the site the link is absolute AND
 * prefixed (`https://motir.co/fr/docs`), so a French reader on a tenant host
 * lands on French docs without detection guessing. The locale is REQUIRED, with
 * no default: a dependency in the type makes a forgotten caller a compile
 * error, not a link that is wrong in eleven languages out of twelve. English
 * output is byte-identical to what it was.
 *
 * `path` is root-relative and starts with a slash: `'/'`, `'/explore'`,
 * `'/legal/terms'`, and may carry a query.
 */
export function siteLinkFor(
  host: PublicHost,
  path: string,
  locale: Locale,
): string {
  const localized = localizedPath(locale, path)
  return host.kind === 'site' ? localized : siteUrl(localized)
}

/** Read the router's two headers off a `Headers`. Pure, so a test can call it. */
export function readPublicHost(headers: Headers): PublicHost {
  const kind = headers.get(PUBLIC_ADDRESS_KIND_HEADER)
  if (!kind || !KINDS.has(kind) || kind === 'site') return SITE_HOST
  const host = normaliseHost(headers.get(PUBLIC_HOST_HEADER))
  const origin = headers.get(PUBLIC_ORIGIN_HEADER)
  return {
    kind: kind as PublicAddressKind,
    host,
    // A value that is not an origin is treated as absent rather than passed on:
    // it ends up in a `robots.txt` and a sitemap, where a malformed one is worse
    // than the https guess it replaced.
    origin: origin && /^https?:\/\/[^/\s]+$/.test(origin) ? origin : null,
  }
}

/**
 * This request's address, for the async component at the top of a route.
 *
 * ⚠️ `next/headers` IS IMPORTED LAZILY, and that is not a style choice. This
 * module is also imported by `proxy.ts`, which runs in Next's proxy bundle where
 * `next/headers` is not available — a top-level import would throw there at
 * import time, before a single line of routing ran. The same lazy-import shape
 * `motir-core`'s CORS module needed for the same class of reason.
 *
 * ⚠️ AND IT DOES NOT CATCH. `headers()` throws outside a request scope, which is
 * also how Next reports a route being PRERENDERED when it needs to be dynamic —
 * so a fallback to {@link SITE_HOST} here would make a test harness and a real
 * static-render bug look identical, and the second one ships a `robots.txt`
 * frozen to whichever host built the image. A test that calls a route function
 * directly supplies the scope instead (`vi.mock('next/headers', …)`), which is
 * also what lets it choose which host it is asking as.
 */
export async function requestPublicHost(): Promise<PublicHost> {
  const { headers } = await import('next/headers')
  return readPublicHost(await headers())
}

/* ── the CANONICAL address (MOTIR-4222 · MOTIR-9528) ───────────────────────── */

/**
 * Everything below needs only these two fields, so that is what it asks for —
 * which is also what lets a test call it with a two-line object instead of a
 * whole `PublicProjectOverviewDto`.
 */
export interface AddressedProject {
  readonly identifier: string
  /**
   * ⚠️ OPTIONAL IN THE TYPE, AND THAT IS A DEPLOY-ORDER FACT RATHER THAN
   * PESSIMISM. `addresses` arrives from `motir-core`, which deploys on its own
   * clock: `public-surface-hosts.md` AMENDMENT 2 §E splits the two repositories'
   * CI precisely because they are separate deployments. So for the length of one
   * rolling deploy this renderer talks to a motir-core that does not send the
   * field yet — and a `project.addresses.primary` on `undefined` is a TypeError
   * inside `generateMetadata`, which 500s the page rather than degrading it.
   *
   * Absent means `motir.co/p/<identifier>` is the canonical, which is what
   * motir-core sends anyway since MOTIR-9525.
   */
  readonly addresses?: { readonly primary: string }
}

/** The primary, or the pre-story canonical when the field has not arrived. */
function primaryOf(project: AddressedProject): string {
  return (
    project.addresses?.primary ??
    `${SITE_ORIGIN}/p/${encodeURIComponent(project.identifier)}`
  )
}

/** The host this request is on — `SITE_ORIGIN`'s when the router stepped aside. */
export function currentHost(host: PublicHost): string {
  return host.host ?? new URL(SITE_ORIGIN).host
}

/**
 * The absolute origin of the host this request is on.
 *
 * The router's own value where there is one, `https://<host>` as the fallback
 * for a tenant host that somehow arrived without it (a tenant address serves
 * only once its certificate is ISSUED, and the host redirects http to https), and
 * `SITE_ORIGIN` on the site itself.
 */
export function currentOrigin(host: PublicHost): string {
  if (host.origin) return host.origin
  return host.host ? `https://${host.host}` : SITE_ORIGIN
}

/**
 * The ONE canonical URL for a project, and the only place `/p/` is spelled into
 * an absolute URL (MOTIR-4222).
 *
 * `addresses.primary` already carries the project's own path —
 * `motir.co/p/PROD` — so a tab hangs below it. Every `<link rel="canonical">`,
 * `og:url`, JSON-LD `@id` and sitemap entry is built from this, which is what
 * makes them agree by construction rather than by four files being edited
 * together.
 *
 * ⚠️ IT NAMES THE CANONICAL AND NOTHING REDIRECTS TO IT (MOTIR-9528). The page
 * that used to 308 a visitor onto the primary host is gone with the customer
 * domain it existed for: every public page renders the page it was asked
 * for.
 */
export function publicUrlFor(
  project: AddressedProject,
  path = '',
  search = '',
): string {
  const base = primaryOf(project).replace(/\/$/, '')
  return `${base}${path ? `/${path}` : ''}${search}`
}
