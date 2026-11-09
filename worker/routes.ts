import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/routing'
import type { Env } from './env'
import { exploreHandler } from './explore/handler'
import { projectHandler } from './project/handler'

/*
 * THE LIVE SURFACE'S ROUTE TABLE, AND THE LIST THAT BRINGS THE WORKER IN
 * (MOTIR-10752).
 *
 * motir.co is a built site. Cloudflare answers a request for a built page from
 * the static assets and never runs this Worker for it; the Worker runs for
 * the addresses `run_worker_first` names and for a request no file matches.
 * The addresses it names are the live surface — the pages that show what is
 * true at the moment someone asks — and the bare `/`, where the first visit
 * chooses its language.
 *
 * Each slot below is one of those pages. A slot's matcher reads the path with
 * its locale prefix removed (`/de/p/ACME` → `/p/ACME`), and its handler gets
 * the request and a context carrying `env`, the locale, that remaining path
 * and the parsed URL. The router (`worker/router.ts`) has already refused a
 * crawler, logged the request and answered the redirects by the time a
 * handler runs, so a handler only renders.
 *
 * ⚠️ `RUN_WORKER_FIRST` IS BUILT HERE AND PASTED INTO `wrangler.jsonc`.
 * `tests/worker/runWorkerFirst.test.ts` holds the two to the same list and
 * the list to the registered page set (`scripts/i18n/check-static-pages.ts`),
 * so a built page can never be pulled onto the Worker and a live route can
 * never be left off it.
 */

/** What a handler is told about the request beyond the request itself. */
export interface RouteContext {
  env: Env
  /** The locale the address is under; English when it carries no prefix. */
  locale: Locale
  /** The path with the locale prefix removed — `/p/ACME/changelog`. */
  path: string
  url: URL
}

export type RouteHandler = (
  request: Request,
  context: RouteContext,
) => Promise<Response>

export type SlotName =
  | 'project'
  | 'projectImage'
  | 'explore'
  | 'ideas'
  | 'buildsItself'
  | 'projectSitemap'

export interface RouteSlot {
  name: SlotName
  /** Whether this slot answers `path` (locale prefix removed) under `locale`. */
  matches: (path: string, locale: Locale) => boolean
  handler: RouteHandler
}

/**
 * A slot no card has filled yet: 501, never cached, and no body that could
 * be mistaken for a page.
 */
export function placeholder(name: SlotName): RouteHandler {
  return async () =>
    new Response(null, {
      status: 501,
      headers: { 'Cache-Control': 'no-store', 'X-Motir-Slot': name },
    })
}

const PROJECT_IMAGE = /^\/p\/[^/]+\/opengraph-image(-[A-Za-z0-9]+)?$/
const PROJECT = /^\/p\/[^/]+(\/.*)?$/
const EXPLORE = /^\/explore(\/topic\/[^/]+)?$/

/**
 * The slots, most specific first: a project's share image is under the
 * project prefix, so it is matched before the project pages.
 */
export const ROUTES: readonly RouteSlot[] = [
  {
    name: 'projectImage',
    matches: (path) => PROJECT_IMAGE.test(path),
    handler: placeholder('projectImage'),
  },
  {
    name: 'project',
    matches: (path) => PROJECT.test(path),
    handler: projectHandler,
  },
  {
    name: 'explore',
    matches: (path) => EXPLORE.test(path),
    handler: exploreHandler,
  },
  {
    name: 'ideas',
    matches: (path) => path === '/ideas',
    handler: placeholder('ideas'),
  },
  {
    name: 'buildsItself',
    matches: (path) => path === '/motir-builds-itself',
    handler: placeholder('buildsItself'),
  },
  {
    // The project half of the sitemap index is a root file: English only,
    // never under a locale prefix.
    name: 'projectSitemap',
    matches: (path, locale) =>
      locale === DEFAULT_LOCALE && path === '/sitemap-projects.xml',
    handler: placeholder('projectSitemap'),
  },
]

/** The slot answering `path` under `locale`, or none. */
export function slotFor(
  path: string,
  locale: Locale,
  routes: readonly RouteSlot[] = ROUTES,
): RouteSlot | undefined {
  return routes.find((slot) => slot.matches(path, locale))
}

/**
 * The live surface per locale, as `run_worker_first` patterns (`*` is any run
 * of characters, slashes included). Only the explore TOPIC prefix is a
 * wildcard: a mistyped `/explore/…` falls to the assets and gets the built 404
 * without a Worker run.
 */
export const LIVE_PATTERNS: readonly string[] = [
  '/p/*',
  '/explore',
  '/explore/topic/*',
  '/ideas',
  '/motir-builds-itself',
]

/**
 * The list `wrangler.jsonc` carries: the bare `/`, the project sitemap, the
 * live surface unprefixed and under each of the eleven other locales, and
 * under the English prefix — a live address there is answered with a 308 to
 * the unprefixed one, and no asset would otherwise bring the Worker in.
 * 2 + 5 + 11 × 5 + 5 = 67 entries, inside Cloudflare's 100.
 */
export const RUN_WORKER_FIRST: readonly string[] = [
  '/',
  '/sitemap-projects.xml',
  ...LIVE_PATTERNS,
  ...LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).flatMap((locale) =>
    LIVE_PATTERNS.map((pattern) => `/${locale}${pattern}`),
  ),
  ...LIVE_PATTERNS.map((pattern) => `/${DEFAULT_LOCALE}${pattern}`),
]
