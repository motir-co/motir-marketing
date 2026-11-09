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
 * Each route names its host once, at the top — {@link SITE_HOST} on every page
 * the site builds, {@link UNKNOWN_HOST} in the 404 room — and everything under
 * that takes it as a parameter. (The Next `proxy.ts` used to resolve it per
 * request and hand it over in three `x-motir-*` headers; that router and its
 * tenant branch are gone, MOTIR-10113 · MOTIR-10639, and so are the headers and
 * their reader, MOTIR-10811.) The alternative — every leaf component reading
 * the request — was rejected for two reasons, and the second is the
 * load-bearing one:
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
 * Which SHAPE of address a page is rendered for.
 *
 * `site` is `motir.co` itself. There is no tenant kind: the `workspace` kind
 * (`acme.motir.site`) left with the Next `proxy.ts` that was its one producer
 * (MOTIR-10113 · MOTIR-10639 · MOTIR-10811), and there is no customer-domain
 * kind (MOTIR-9528) — a customer's own domain is the certificate edge's.
 *
 * ── ⚠️ `unresolved` IS "NOT THE SITE", AND IT IS NOT A TENANT (MOTIR-4430) ──
 *
 * It was the shape of a host that is neither this site nor an address the
 * contract could resolve — the tenant base domain, an unknown host, a host the
 * contract did not answer for — which the router rewrote onto the 404 room.
 * Before it existed the room rendered as {@link SITE_HOST}, so the shared
 * chrome spelled `/explore`, `/docs`, `/design` and the legal paths
 * ROOT-RELATIVE against a host that serves none of them.
 *
 * It survives the router because the 404 room is still a page that cannot
 * know which host serves it ({@link UNKNOWN_HOST}). The one thing that decides
 * every link there is **this may not be `motir.co`**, so `unresolved` reads as
 * "not the site" wherever a link is spelled ({@link siteLinkFor}) and as
 * nothing else — it is never a project address.
 */
export type PublicAddressKind = 'site' | 'unresolved'

/**
 * The address a page is rendered for.
 *
 * ⚠️ IT CARRIES ONLY THE KIND. The tenant `host` and `origin` it used to carry
 * were read off the router's headers and were `null` on every value this site
 * can still produce, so they went with their reader (MOTIR-10811). Every
 * consumer branches on `kind === 'site'` and nothing else.
 */
export interface PublicHost {
  readonly kind: PublicAddressKind
}

/** `motir.co` — every page the site builds. */
export const SITE_HOST: PublicHost = { kind: 'site' }

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
 * working one everywhere else.
 *
 * ⚠️ IT IS NOT A DEFAULT AND IT IS NOT `SITE_HOST`'s SIBLING. A page that CAN
 * read the request must read it: `app/host-unavailable/page.tsx` is its own
 * route and does, and every `/p/**` surface has since MOTIR-4372. This constant
 * exists for the one document whose asking is charged to every other page.
 */
export const UNKNOWN_HOST: PublicHost = { kind: 'unresolved' }

/**
 * The path of one public-project page.
 *
 * `path` is the suffix BELOW the project root, already URL-encoded and with no
 * leading slash — `''` for the overview, `'board'`, `'items/ACME-42'`,
 * `'changelog.xml'`. The identifier is encoded here, because it is a path
 * segment this function alone emits.
 *
 * ⚠️ ONE SHAPE FOR EVERY KIND (MOTIR-9528). A project page lives on the site
 * only, and the one other kind, `unresolved`, is the 404 room's, which is never
 * a project address (MOTIR-4430). No kind can produce a path at a host's root.
 * `host` stays a parameter so every caller keeps saying which host it renders
 * on, which {@link siteLinkFor} still needs.
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
 * that did not exist when it was written. Since the tenant kind left
 * (MOTIR-10811) `unresolved` — the 404 room's {@link UNKNOWN_HOST} — is the one
 * value that takes that arm.
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
