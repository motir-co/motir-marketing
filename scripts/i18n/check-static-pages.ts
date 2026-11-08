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
 *      Workers Paid).
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
]

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
}): CheckResult {
  const {
    dir,
    pages = STATIC_PAGES,
    locales = LOCALES,
    limit = WORKERS_FILE_LIMIT,
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
    `${STATIC_PAGES.length} registered page(s), ${pagesChecked} HTML file(s) checked across ${LOCALES.length} locales; ${fileCount} file(s) in the output: ${problems.length ? `${problems.length} problem(s)` : 'whole'}`,
  )
  return problems.length ? 1 : 0
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  process.exitCode = main(process.argv.slice(2))
}
