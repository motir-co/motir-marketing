import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/routing'
import {
  isCrawler,
  isFilterUrl,
  isRefusedCrawler,
  trimmedIdeasUrl,
} from '@/lib/crawlPolicy'
import { chooseLocale, LOCALE_COOKIE } from '@/lib/localeDetection'
import type { Env } from './env'
import { notFoundPage } from './notFound'
import { logRequest } from './requestLog'
import { ROUTES, slotFor, type RouteSlot } from './routes'

/*
 * THE WORKER'S FRONT DOOR (MOTIR-10752), ported from the site branch of
 * `proxy.ts` at `main` `b9ff37a`.
 *
 * Every request the Worker is invoked for passes through `route`, in the
 * order `proxy.ts` used, minus the tenant branch (MOTIR-10113 took motir.site
 * off this site):
 *
 *   1. decide `refused` — a crawler `lib/crawlPolicy.ts` refuses everywhere,
 *      or any crawler on a filter URL — and write the one log line;
 *   2. answer 403 when refused, before anything else runs;
 *   3. a locale segment spelled in another case: 308 to the lower case;
 *   4. an `/ideas` address with more tags than the page honours: 308 to the
 *      trimmed address;
 *   5. a live-surface address under the English prefix: 308 to the
 *      unprefixed address, as `lib/redirects.ts` answers for built pages;
 *   6. the bare `/`: the first visit's language;
 *   7. a live-surface route: its slot's handler;
 *   8. anything else: the static assets; a path they have no file for is
 *      answered with the locale's built 404 page and status 404.
 *
 * ⚠️ TWO NARROWINGS AGAINST `proxy.ts`, BOTH THE STORY'S. Language detection
 * runs on the bare `/` only — every other unprefixed address is a built
 * English page and is never moved — and nothing here reads a tenant host, a
 * forwarded host or a Fly or Vercel variable.
 *
 * A pure function of the request, `env` and the route table, so the unit
 * test drives it with a stub assets binding and stub handlers.
 */

/** A response that depends on the cookie and the browser says so. */
export const LANGUAGE_VARY = 'Cookie, Accept-Language'

function isRefused(request: Request, url: URL): boolean {
  const agent = request.headers.get('user-agent')
  return (
    (isRefusedCrawler(agent) && url.pathname !== '/robots.txt') ||
    (isCrawler(agent) && isFilterUrl(url.pathname + url.search))
  )
}

function redirect(location: URL, status: 307 | 308): Response {
  return new Response(null, {
    status,
    headers: { Location: location.toString() },
  })
}

/**
 * `/zh-TW/…` → `/zh-tw/…` (MOTIR-9249). 308 and no `Vary`: the answer
 * depends on the path's spelling alone, so it may be cached as the permanent
 * normalisation it is.
 */
function normaliseLocaleCase(url: URL): Response | null {
  const [, first = '', ...rest] = url.pathname.split('/')
  const lower = first.toLowerCase()
  if (first === lower || !(LOCALES as readonly string[]).includes(lower))
    return null
  const destination = new URL(url)
  destination.pathname = ['', lower, ...rest].join('/')
  return redirect(destination, 308)
}

/** The locale an address is under, and the path with that prefix removed. */
export function splitLocale(pathname: string): {
  locale: Locale
  path: string
  prefixed: boolean
} {
  const [, first = '', ...rest] = pathname.split('/')
  const locale = LOCALES.find((candidate) => candidate === first)
  if (locale === undefined)
    return { locale: DEFAULT_LOCALE, path: pathname, prefixed: false }
  return { locale, path: `/${rest.join('/')}`, prefixed: true }
}

/** Reads one cookie off the header, as a browser sent it. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key !== name) continue
    try {
      return decodeURIComponent(value.join('='))
    } catch {
      return value.join('=')
    }
  }
  return null
}

/**
 * The first visit's language, on the bare `/` only (MOTIR-7951, narrowed by
 * the story). A non-English choice is a 307 — never permanent, so a visitor
 * who later picks English can reach `/` again — and `private, no-store`; the
 * English page is the built one, marked as varying on what chose it.
 */
async function rootLanguage(
  request: Request,
  url: URL,
  env: Env,
): Promise<Response> {
  const locale = chooseLocale({
    cookie: readCookie(request.headers.get('cookie'), LOCALE_COOKIE),
    acceptLanguage: request.headers.get('accept-language'),
  })
  if (locale !== DEFAULT_LOCALE) {
    const destination = new URL(url)
    destination.pathname = `/${locale}`
    const response = redirect(destination, 307)
    response.headers.set('Vary', LANGUAGE_VARY)
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }
  const page = await env.ASSETS.fetch(request)
  const response = new Response(page.body, page)
  response.headers.append('Vary', LANGUAGE_VARY)
  return response
}

/** The redirects that answer before any page: steps 3 to 5. */
function redirectFor(url: URL, routes: readonly RouteSlot[]): Response | null {
  const fixed = normaliseLocaleCase(url)
  if (fixed) return fixed
  const trimmed = trimmedIdeasUrl(url)
  if (trimmed) return redirect(trimmed, 308)
  const [, first = '', ...rest] = url.pathname.split('/')
  if (first !== DEFAULT_LOCALE) return null
  const path = `/${rest.join('/')}`
  if (!slotFor(path, DEFAULT_LOCALE, routes)) return null
  const destination = new URL(url)
  destination.pathname = path
  return redirect(destination, 308)
}

/**
 * Step 8: the request, unchanged, to the static assets. What they answer is
 * returned as it is — a file, or a `_redirects` rule — except a 404, which
 * becomes the localized not-found room.
 */
async function fromAssets(
  request: Request,
  url: URL,
  locale: Locale,
  env: Env,
): Promise<Response> {
  const response = await env.ASSETS.fetch(request)
  if (response.status !== 404) return response
  return notFoundPage(url, locale, env)
}

export async function route(
  request: Request,
  env: Env,
  routes: readonly RouteSlot[] = ROUTES,
): Promise<Response> {
  const url = new URL(request.url)
  const refused = isRefused(request, url)
  logRequest(request, refused)
  if (refused) return new Response(null, { status: 403 })

  const redirected = redirectFor(url, routes)
  if (redirected) return redirected
  if (url.pathname === '/') return rootLanguage(request, url, env)

  const { locale, path } = splitLocale(url.pathname)
  const slot = slotFor(path, locale, routes)
  if (slot) return slot.handler(request, { env, locale, path, url })
  return fromAssets(request, url, locale, env)
}
