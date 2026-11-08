/*
 * EVERY PAGE, BUILT AHEAD OF TIME IN EVERY LANGUAGE (MOTIR-7967 · MOTIR-10643).
 *
 *     pnpm build && pnpm i18n:check-static-pages
 *
 * The built site is the files in `dist/`, and nothing else answers a request
 * for a page, so this reads the OUTPUT rather than the source — what ships is
 * what the story promises. It replaces `check-prerender.ts`, which read the
 * manifests `next build` wrote. It fails, naming the route and the locale, when
 *
 *   1. a page in {@link STATIC_PAGES} has no HTML file in one of the twelve
 *      `LOCALES` — every slug in every locale, for a route with slugs;
 *   2. a page's `<html lang>` is not its locale's `LOCALE_BCP47` tag (the
 *      document says which language it is in, MOTIR-9249);
 *   3. any file in the output names a Google Fonts host — every face is served
 *      from the build itself (`app/fonts.css`);
 *   4. the output holds more files than one Workers version may (100,000 on
 *      Workers Paid);
 *   5. a root file in {@link ROOT_FILES} — `robots.txt` and the two sitemaps —
 *      is missing (MOTIR-10646);
 *   6. `sitemap-site.xml` lists a URL that is not a registered page present in
 *      the output for the locale the URL is in. The one exception is
 *      {@link WORKER_ROUTES}: `/explore`, which the sitemap lists and a Worker
 *      answers. The sitemap is a hand-ordered list, not this registry, so this
 *      is what stops it naming a page the build does not write.
 *
 * and it prints the output's file count, which the story's pull request
 * states.
 *
 * ⚠️ THE REGISTRY IS WHAT A PAGE CARD APPENDS TO. A page added without its
 * line is unchecked, and a line added without the page fails Build in all
 * twelve locales — so each card that ports a page registers it in the same
 * change, with its slug list for a dynamic route.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  LOCALES,
  type Locale,
} from '../../i18n/routing.ts'
import { DOCS_ROUTES } from '../../lib/docsSurfaces.ts'
import { legalSlugsIn } from '../../lib/legal/slugs.ts'
import {
  PLACEHOLDER_PRODUCTS,
  WRITTEN_PRODUCTS,
} from '../../lib/productAddresses.ts'

/** One page the build must write in every locale. */
export interface StaticPage {
  /** The English address, unprefixed: `/`, `/price`, `/legal/[slug]`. */
  route: string
  /** For a route with a `[slug]` segment, every slug it is built for. */
  slugs?: readonly string[]
}

/** THE REGISTRY: every page built ahead of time. */
export const STATIC_PAGES: readonly StaticPage[] = [
  // The not-found room, one per locale (`src/pages/[...locale]/404.astro`).
  { route: '/404' },
  // The content pages (MOTIR-10644). The slug lists are the ones the pages
  // are built from — `lib/productAddresses.ts` and the `content/legal/` glob —
  // never typed out here.
  { route: '/' },
  { route: '/price' },
  { route: '/how-it-works' },
  { route: '/how-to-use' },
  { route: '/how-the-calculation-works' },
  { route: '/design' },
  ...WRITTEN_PRODUCTS.map((slug) => ({ route: `/products/${slug}` })),
  { route: '/products/[slug]', slugs: PLACEHOLDER_PRODUCTS },
  { route: '/legal' },
  { route: '/legal/[slug]', slugs: legalSlugsIn() },
  // The docs (MOTIR-10645): the index, the guides and the API reference, read
  // off the one list the rail and the index draw.
  ...DOCS_ROUTES.map((route) => ({ route })),
]

/**
 * The files the build writes at the root of the output, locale-less: the
 * Astro endpoints under `src/pages/` (MOTIR-10646).
 */
export const ROOT_FILES: readonly string[] = [
  'robots.txt',
  'sitemap.xml',
  'sitemap-site.xml',
]

/** The sitemap whose every URL must be a built page. */
export const SITE_SITEMAP = 'sitemap-site.xml'

/**
 * Paths the site sitemap lists that a Worker answers rather than a built file
 * — the square, which renders per request (the Worker-routes story).
 */
export const WORKER_ROUTES: readonly string[] = ['/explore']

/** The most files one Workers version may hold (Workers Paid). */
export const WORKERS_FILE_LIMIT = 100_000

/** Hosts a built page must never load a face from. */
export const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']

/** Every concrete address a page stands for: one per slug, or itself. */
export function addressesOf(page: StaticPage): string[] {
  if (!page.route.includes('[slug]')) return [page.route]
  if (!page.slugs || page.slugs.length === 0) {
    throw new Error(`${page.route} has a [slug] segment and no slugs`)
  }
  return page.slugs.map((slug) => page.route.replace('[slug]', slug))
}

/**
 * The output file one address is in one locale, as `build.format: 'file'`
 * writes it: `/price` → `price.html`, `/de` + `/price` → `de/price.html`, and
 * the root → `index.html` / `de.html`.
 */
export function htmlFileFor(locale: Locale, address: string): string {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`
  const full = `${prefix}${address === '/' ? '' : address}`
  return full === '' ? 'index.html' : `${full.slice(1)}.html`
}

/** Every file under `dir`, relative to it, with `/` separators. */
export function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) =>
      path
        .relative(dir, path.join(entry.parentPath, entry.name))
        .split(path.sep)
        .join('/'),
    )
    .sort()
}

/**
 * The locale and the English address a site URL is in: `/de/docs/mcp` is
 * `de` + `/docs/mcp`, `/zh-tw` is `zh-tw` + `/`, `/legal/terms` is English.
 */
export function addressOfUrl(
  url: string,
  locales: readonly Locale[] = LOCALES,
): { locale: Locale; address: string } {
  const pathname = new URL(url).pathname
  const [first = '', ...rest] = pathname.split('/').filter(Boolean)
  const locale = locales.find(
    (candidate) => candidate !== DEFAULT_LOCALE && candidate === first,
  )
  if (locale === undefined) return { locale: DEFAULT_LOCALE, address: pathname }
  return { locale, address: `/${rest.join('/')}` }
}

/** Every `<loc>` of a sitemap document, unescaped. */
export function sitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) =>
    match[1]!
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&apos;', "'")
      .replaceAll('&amp;', '&'),
  )
}

const TEXT =
  /\.(html|css|js|mjs|json|xml|txt|svg|webmanifest)$|^_redirects$|^_headers$/

export interface CheckResult {
  problems: string[]
  pagesChecked: number
  fileCount: number
}

export function checkStaticPages(input: {
  dir: string
  pages?: readonly StaticPage[]
  locales?: readonly Locale[]
  limit?: number
  rootFiles?: readonly string[]
}): CheckResult {
  const {
    dir,
    pages = STATIC_PAGES,
    locales = LOCALES,
    limit = WORKERS_FILE_LIMIT,
    rootFiles = ROOT_FILES,
  } = input
  const files = listFiles(dir)
  const present = new Set(files)
  const problems: string[] = []
  let pagesChecked = 0

  for (const page of pages) {
    for (const address of addressesOf(page)) {
      for (const locale of locales) {
        const file = htmlFileFor(locale, address)
        if (!present.has(file)) {
          problems.push(`${address} [${locale}]: no ${file} in the build`)
          continue
        }
        pagesChecked += 1
        const html = readFileSync(path.join(dir, file), 'utf8')
        const lang = /<html[^>]*\slang="([^"]*)"/i.exec(html)?.[1]
        if (lang !== LOCALE_BCP47[locale]) {
          problems.push(
            `${address} [${locale}]: <html lang="${lang ?? ''}">, not "${LOCALE_BCP47[locale]}"`,
          )
        }
      }
    }
  }

  for (const file of rootFiles) {
    if (!present.has(file)) problems.push(`${file}: not in the build`)
  }

  if (present.has(SITE_SITEMAP)) {
    const registered = new Set(
      pages.flatMap((page) =>
        addressesOf(page).flatMap((address) =>
          locales.map((locale) => htmlFileFor(locale, address)),
        ),
      ),
    )
    const xml = readFileSync(path.join(dir, SITE_SITEMAP), 'utf8')
    for (const url of sitemapLocations(xml)) {
      const { locale, address } = addressOfUrl(url, locales)
      if (WORKER_ROUTES.includes(address)) continue
      const file = htmlFileFor(locale, address)
      if (!registered.has(file)) {
        problems.push(
          `${address} [${locale}]: ${SITE_SITEMAP} lists ${url}, which is not a registered static page`,
        )
      } else if (!present.has(file)) {
        problems.push(
          `${address} [${locale}]: ${SITE_SITEMAP} lists ${url}, and the build has no ${file}`,
        )
      }
    }
  }

  for (const file of files) {
    if (!TEXT.test(path.basename(file))) continue
    const text = readFileSync(path.join(dir, file), 'utf8')
    for (const host of FONT_HOSTS) {
      if (text.includes(host)) problems.push(`${file}: names ${host}`)
    }
  }

  if (files.length > limit) {
    problems.push(`the output holds ${files.length} files, over ${limit}`)
  }

  return { problems, pagesChecked, fileCount: files.length }
}

export function main(argv: readonly string[]): number {
  const at = argv.indexOf('--dir')
  const dir = path.resolve(at === -1 ? 'dist' : (argv[at + 1] ?? 'dist'))
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`no build at ${dir} — run \`pnpm build\` first`)
    return 1
  }
  const { problems, pagesChecked, fileCount } = checkStaticPages({ dir })
  for (const line of problems) console.error(`FAIL ${line}`)
  console.log(
    `${STATIC_PAGES.length} registered page(s), ${pagesChecked} HTML file(s) checked across ${LOCALES.length} locales, ${ROOT_FILES.length} root file(s); ${fileCount} file(s) in the output: ${problems.length ? `${problems.length} problem(s)` : 'whole'}`,
  )
  return problems.length ? 1 : 0
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  process.exitCode = main(process.argv.slice(2))
}
