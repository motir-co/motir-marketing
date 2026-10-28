/*
 * Every page, built ahead of time in every language (MOTIR-7967).
 *
 *     pnpm build && pnpm i18n:check-prerender
 *
 * Whether a route is static exists only in `next build`'s output, so this reads
 * the build's own manifests rather than the source:
 *
 *   .next/app-path-routes-manifest.json   every app route, by its URL pattern
 *   .next/prerender-manifest.json         every path the build prerendered,
 *                                         with the route it came from
 *
 * and fails, naming the route and what is missing, when
 *
 *   1. a page route under `[locale]` that the build prerendered at all lacks a
 *      path for one of `routing.locales` — for `products/[slug]` and
 *      `legal/[slug]` that is every slug in every locale; or
 *   2. a page route that was static BEFORE the story
 *      (`static-routes.base.json`, cut from `origin/main`'s pre-story build) is
 *      no longer prerendered in every locale; or
 *   3. a route renders per request and is not on `REQUEST_RENDERED_ALLOWLIST`
 *      (MOTIR-8842).
 *
 * The second is the guard that matters: the first cannot see a route that
 * turned dynamic, because a dynamic route prerenders nothing in any locale.
 *
 * Request-rendered routes are exempt from both, and they are an ALLOWLIST
 * (`REQUEST_RENDERED_ALLOWLIST`): a third check fails any route the build left
 * to render per request that is not on it (MOTIR-8842), so a page cannot turn
 * dynamic — or arrive dynamic — without somebody writing down why.
 *
 *     node scripts/i18n/check-prerender.ts --write-base <sha>
 *
 * writes the base list from the `.next` in the working directory — run it on a
 * pre-story checkout, never on this branch.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export interface AppPathRoutes {
  [file: string]: string
}

export interface PrerenderManifest {
  routes: Record<string, { srcRoute?: string | null }>
}

export interface BaseList {
  sha: string
  producedBy: string
  routes: string[]
}

const LOCALE_SEGMENT = '/[locale]'

/** One route the site is ALLOWED to render per request, and why. */
export interface RequestRenderedRoute {
  /** The route's URL pattern as `next build` names it, e.g. `/[locale]/w`. */
  pattern: RegExp
  /** What the route answers that a build cannot know. */
  why: string
  /**
   * True when `pattern` names the build manifest's spelling of a route that has
   * no source file by that name (a metadata route under a dynamic segment), so
   * the guard that every entry matches a file in `app/` skips it.
   */
  manifestOnly?: boolean
}

/**
 * THE ALLOWLIST (MOTIR-8842, per the MOTIR-8838 decision): the only routes that
 * may render in the serving process. Everything else is built by `next build`.
 *
 * It was a list of exemptions from the locale-coverage check; it is now the
 * other way round, and a route that renders per request and is not here fails
 * `pnpm i18n:check-prerender` (see {@link unlistedDynamicRoutes}) and the
 * source scan in `tests/i18n/requestRenderedAllowlist.test.ts`. Adding a line is
 * a decision about uptime, so it carries its reason.
 *
 * The first six are MOTIR-8838 §4's live surface. The last four are NOT in that
 * list and are recorded as deviations on MOTIR-8844: `ideas` and
 * `motir-builds-itself` render per request today, and the two tenant root files
 * are what `proxy.ts` rewrites a tenant host's `robots.txt` / `sitemap.xml` to.
 */
export const REQUEST_RENDERED_ALLOWLIST: readonly RequestRenderedRoute[] = [
  {
    pattern: /^\/\[locale\]\/explore(\/|$)/,
    why: 'the square: reads the public API per visitor, and a topic can 404',
  },
  {
    pattern: /^\/\[locale\]\/no-application$/,
    why: 'a live workspace host with no application yet — answers a HOST',
  },
  {
    pattern: /^\/\[locale\]\/host-unavailable$/,
    why: 'the outage page, rendered for a host that did not resolve',
  },
  {
    pattern: /^\/\[locale\]\/\[\.\.\.rest\]$/,
    why: 'the 404 catch-all: answers any path the site does not have',
  },
  {
    pattern: /^\/\[locale\]\/p(\/|$)/,
    why: 'a tenant’s public project, its changelog (page and Atom feed), request pages, read-view redirects and share card — all live data for a host',
  },
  {
    pattern: /^\/-\/p\/-\/opengraph-image$/,
    why: 'the project share card (the build names a metadata route under a dynamic segment this way)',
    manifestOnly: true,
  },
  {
    pattern: /^\/\[locale\]\/ideas$/,
    why: 'reads `searchParams` (filters, the open idea), so it is per request by construction — NOT in MOTIR-8838 §4',
  },
  {
    pattern: /^\/\[locale\]\/motir-builds-itself$/,
    why: 'live project numbers via `readPublic` (`revalidate: 0`); static needs a build-time read and a rebuild trigger first — NOT in MOTIR-8838 §4',
  },
  {
    pattern: /^\/robots-tenant\.txt$/,
    why: 'a tenant host’s robots.txt names its own host and sitemap',
  },
  {
    pattern: /^\/sitemap-projects\.xml$/,
    why: 'the per-host half of the sitemap: which projects have THIS host as canonical',
  },
]

/** The patterns alone — what the locale-coverage check exempts. */
export const REQUEST_RENDERED = REQUEST_RENDERED_ALLOWLIST.map((r) => r.pattern)

/**
 * Every route the build left to render per request that the allowlist does not
 * name: a route in the app manifest with no prerendered path.
 */
export function unlistedDynamicRoutes(
  appPathRoutes: AppPathRoutes,
  prerender: PrerenderManifest,
): string[] {
  const bySource = prerenderedBySource(prerender)
  return [...new Set(Object.values(appPathRoutes))]
    .filter(
      (route) =>
        !(bySource.get(route)?.length ?? 0) &&
        !REQUEST_RENDERED.some((r) => r.test(route)),
    )
    .sort()
}

/** The URL pattern of every PAGE (not route handler, not metadata file). */
export function pageRoutes(appPathRoutes: AppPathRoutes): string[] {
  return [
    ...new Set(
      Object.entries(appPathRoutes)
        .filter(([file]) => file.endsWith('/page'))
        .map(([, route]) => route),
    ),
  ].sort()
}

/** Every prerendered path, grouped by the route it was rendered from. */
export function prerenderedBySource(
  prerender: PrerenderManifest,
): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const [pathname, entry] of Object.entries(prerender.routes)) {
    const source = entry.srcRoute ?? pathname
    out.set(source, [...(out.get(source) ?? []), pathname])
  }
  return out
}

/** A pre-story route's pattern under the locale tree (`/` → `/[locale]`). */
export function underLocale(route: string): string {
  return route === '/' ? LOCALE_SEGMENT : `${LOCALE_SEGMENT}${route}`
}

/** The page routes a (pre-story) build prerendered — the base list's content. */
export function staticPageRoutes(
  appPathRoutes: AppPathRoutes,
  prerender: PrerenderManifest,
): string[] {
  const bySource = prerenderedBySource(prerender)
  return pageRoutes(appPathRoutes).filter(
    (route) =>
      !route.startsWith('/_') && (bySource.get(route)?.length ?? 0) > 0,
  )
}

/** Every problem, one line each; an empty list means the build is whole. */
export function checkPrerender(input: {
  appPathRoutes: AppPathRoutes
  prerender: PrerenderManifest
  locales: readonly string[]
  base: readonly string[]
}): { problems: string[]; checked: Map<string, number> } {
  const { appPathRoutes, prerender, locales, base } = input
  const bySource = prerenderedBySource(prerender)
  const problems: string[] = []
  const checked = new Map<string, number>()
  const exempt = (route: string) => REQUEST_RENDERED.some((r) => r.test(route))

  for (const route of unlistedDynamicRoutes(appPathRoutes, prerender))
    problems.push(
      `${route}: rendered per request and not on the request-rendered allowlist (scripts/i18n/check-prerender.ts)`,
    )

  for (const route of pageRoutes(appPathRoutes)) {
    if (!route.startsWith(LOCALE_SEGMENT) || exempt(route)) continue
    const paths = bySource.get(route) ?? []
    if (!paths.length) continue // a dynamic route; the base list judges it
    // `/ja/products/x` → rest `/products/x`; every rest needs every locale.
    const byRest = new Map<string, Set<string>>()
    for (const p of paths) {
      const [, locale = '', ...rest] = p.split('/')
      const key = `/${rest.join('/')}`
      byRest.set(key, (byRest.get(key) ?? new Set()).add(locale))
    }
    // Name the path only when the route has a segment of its own to fill.
    const hasSegment = route.slice(LOCALE_SEGMENT.length).includes('[')
    for (const [rest, have] of byRest) {
      const missing = locales.filter((l) => !have.has(l))
      if (missing.length)
        problems.push(
          `${route}: ${hasSegment ? `${rest} ` : ''}not prerendered for ${missing.join(', ')}`,
        )
    }
    checked.set(route, paths.length)
  }

  for (const route of base) {
    const moved = underLocale(route)
    if (!pageRoutes(appPathRoutes).includes(moved)) {
      problems.push(
        `${route}: static before the story, now no page at ${moved}`,
      )
    } else if (!bySource.get(moved)?.length) {
      problems.push(
        `${route}: static before the story, now not prerendered (${moved})`,
      )
    }
  }
  return { problems, checked }
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T
}

/** The command, over the `.next` and base list under `root`; the exit code. */
export async function main(
  argv: string[],
  root: string = process.cwd(),
): Promise<number> {
  const next = path.join(root, '.next')
  const appPathRoutes = readJson<AppPathRoutes>(
    path.join(next, 'app-path-routes-manifest.json'),
  )
  const prerender = readJson<PrerenderManifest>(
    path.join(next, 'prerender-manifest.json'),
  )
  const basePath = path.join(root, 'scripts', 'i18n', 'static-routes.base.json')

  const writeAt = argv.indexOf('--write-base')
  if (writeAt >= 0) {
    const sha = argv[writeAt + 1]
    if (!sha) throw new Error('--write-base <sha of the pre-story build>')
    const base: BaseList = {
      sha,
      producedBy:
        'next build on this sha, then `node scripts/i18n/check-prerender.ts --write-base <sha>`',
      routes: staticPageRoutes(appPathRoutes, prerender),
    }
    writeFileSync(basePath, `${JSON.stringify(base, null, 2)}\n`)
    console.log(`wrote ${base.routes.length} route(s) to ${basePath}`)
    return 0
  }

  const { LOCALES } = await import('../../i18n/routing.ts')
  const base = readJson<BaseList>(basePath)
  const { problems, checked } = checkPrerender({
    appPathRoutes,
    prerender,
    locales: LOCALES,
    base: base.routes,
  })
  for (const [route, count] of checked)
    console.log(`${route}: ${count} path(s)`)
  for (const line of problems) console.error(`MISSING ${line}`)
  console.log(
    `${checked.size} prerendered route(s) checked against ${LOCALES.length} locales and ${base.routes.length} base route(s) from ${base.sha}: ${problems.length ? `${problems.length} problem(s)` : 'whole'}`,
  )
  return problems.length ? 1 : 0
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  process.exitCode = await main(process.argv.slice(2))
}
