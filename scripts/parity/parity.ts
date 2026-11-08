/*
 * THE STATIC BUILD, AS SERVED, AGAINST THE NEXT BUILD AT b9ff37a (MOTIR-10648).
 *
 * The shared core of two scripts:
 *
 *   · `capture-next-baseline.ts` reads a running Next server of b9ff37a once
 *     and writes `baseline-next-b9ff37a.json` beside this file;
 *   · `check-parity.ts` serves `dist/` with `wrangler dev` (static assets
 *     alone, no Worker script), asks every address the baseline holds with
 *     redirects NOT followed, and diffs what comes back.
 *
 * Every fact is read the same way on both sides (`readPage`, `readSitemap`), so
 * a difference is a difference in what is served, never in how it was read.
 * The only differences allowed are {@link INTENDED_DIFFERENCES}, each with its
 * reason, and the report prints every one of them.
 */

import { JSDOM } from 'jsdom'
import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  LOCALES,
  type Locale,
} from '../../i18n/routing.ts'

/** The production origin every canonical, alternate and sitemap `<loc>` names. */
export const SITE_ORIGIN = 'https://motir.co'

/** The most files one Workers version may hold (Workers Paid). */
export const WORKERS_FILE_LIMIT = 100_000

/** What one address answers: its status, `Location`, type and body. */
export interface Answer {
  status: number
  location: string | null
  contentType: string | null
  body: string
}

/** Ask one path (`/de/price`) of a server, redirects not followed. */
export type Ask = (path: string) => Promise<Answer>

/** The head facts of one page, as a crawler reads them. */
export interface PageFacts {
  status: number
  location: string | null
  canonical: string | null
  /** hreflang → href, every `<link rel="alternate" hreflang>`. */
  hreflang: Record<string, string>
  ogLocale: string | null
  htmlLang: string | null
}

/** One `<url>` of a sitemap, `<lastmod>` left out (it is a build date). */
export interface SitemapEntry {
  loc: string
  alternates: Record<string, string>
  changefreq: string | null
  priority: string | null
}

/** A file served from the root: an icon or a share card. */
export interface AssetFacts {
  status: number
  contentType: string | null
}

/**
 * The locale a path is in: its first segment when that is a prefixed locale,
 * English otherwise.
 */
export function localeOfPath(address: string): Locale {
  const first = address.split('/')[1] ?? ''
  return (
    LOCALES.find((locale) => locale !== DEFAULT_LOCALE && locale === first) ??
    DEFAULT_LOCALE
  )
}

/** A not-found answer: its status and the language of the page it carries. */
export interface NotFoundFacts {
  status: number
  htmlLang: string | null
}

/** The committed baseline, `baseline-next-b9ff37a.json`. */
export interface Baseline {
  $comment: string[]
  commit: string
  command: string
  /** Every page the Next build's `/sitemap-site.xml` lists, by path. */
  pages: Record<string, PageFacts>
  robots: string
  sitemapIndex: string[]
  sitemapSite: SitemapEntry[]
  /** The icons the Next head links on `/`, `/favicon.ico` and the share cards. */
  assets: Record<string, AssetFacts>
  /** `/does-not-exist` and `/<locale>/does-not-exist`. */
  notFound: Record<string, NotFoundFacts>
  /** What the Next build answered where the static build answers differently on purpose. */
  intended: Record<string, AssetFacts & { location: string | null }>
}

/** The head of a page: parsed with an HTML parser, never matched with a regex. */
export function readPage(answer: Answer): PageFacts {
  const end = answer.body.indexOf('</head>')
  const head = end === -1 ? answer.body : answer.body.slice(0, end + 7)
  const { document } = new JSDOM(head).window
  const hreflang: Record<string, string> = {}
  for (const link of document.querySelectorAll(
    'link[rel="alternate"][hreflang]',
  )) {
    hreflang[link.getAttribute('hreflang')!] = link.getAttribute('href') ?? ''
  }
  return {
    status: answer.status,
    location: answer.location,
    canonical:
      document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
      null,
    hreflang,
    ogLocale:
      document
        .querySelector('meta[property="og:locale"]')
        ?.getAttribute('content') ?? null,
    htmlLang: document.documentElement.getAttribute('lang'),
  }
}

/** The `<html lang>` of a page, and nothing else. */
export function readLang(body: string): string | null {
  return readPage({ status: 0, location: null, contentType: null, body })
    .htmlLang
}

/** Every `<url>` of a urlset, or every `<sitemap>` `<loc>` of an index. */
export function readSitemap(xml: string): SitemapEntry[] {
  const { document } = new JSDOM(xml, { contentType: 'text/xml' }).window
  const text = (node: Element, name: string) =>
    node.getElementsByTagName(name)[0]?.textContent ?? null
  return [...document.querySelectorAll('url, sitemap')].map((node) => {
    const alternates: Record<string, string> = {}
    for (const link of node.getElementsByTagName('xhtml:link')) {
      alternates[link.getAttribute('hreflang')!] =
        link.getAttribute('href') ?? ''
    }
    return {
      loc: text(node, 'loc') ?? '',
      alternates,
      changefreq: text(node, 'changefreq'),
      priority: text(node, 'priority'),
    }
  })
}

/** The path of a site URL: `https://motir.co/de/price` → `/de/price`. */
export function pathOf(url: string): string {
  const { pathname, search } = new URL(url)
  return `${pathname}${search}`
}

/** A robots file with its whitespace collapsed, for an equality "apart from whitespace". */
export function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** The icon addresses a page's head links: `rel=icon` and `rel=apple-touch-icon`. */
export function iconLinks(body: string): string[] {
  const end = body.indexOf('</head>')
  const { document } = new JSDOM(end === -1 ? body : body.slice(0, end + 7))
    .window
  return [
    ...document.querySelectorAll(
      'link[rel="icon"], link[rel="apple-touch-icon"]',
    ),
  ].map((link) => link.getAttribute('href') ?? '')
}

/** One difference the check does NOT allow. */
export interface Difference {
  url: string
  fact: string
  expected: unknown
  served: unknown
}

/** A difference the check allows, and why. */
export interface IntendedDifference {
  id: string
  /** The paths it covers. */
  covers: (path: string) => boolean
  reason: string
  /** What the static build must answer instead, when it answers at all. */
  expect?: { status: number; location: string }
}

/**
 * THE DIFFERENCES THE STATIC BUILD MAKES ON PURPOSE, AND NO OTHERS. Adding one
 * is a reviewed change to this list, never a skip somewhere else.
 */
export const INTENDED_DIFFERENCES: readonly IntendedDifference[] = [
  {
    id: 'explore',
    covers: (path) => /^(\/[a-z]{2}(-[a-z]{2})?)?\/explore$/.test(path),
    reason:
      'The square renders per request from the public API: a Worker route (the Worker-routes story), so a static-only serve does not answer it. The sitemap lists it, as the Next sitemap did.',
  },
  {
    id: 'sitemap-projects',
    covers: (path) => path === '/sitemap-projects.xml',
    reason:
      'The project half of the sitemap renders per request: a Worker route (the Worker-routes story). /sitemap.xml names it, as the Next index did.',
  },
  {
    id: 'en-root',
    covers: (path) => path === '/en',
    reason:
      'English is unprefixed: /en is a 308 to / in the built _redirects (lib/redirects.ts), where Next answered it with the English page.',
    expect: { status: 308, location: '/' },
  },
  {
    id: 'en-prefix',
    covers: (path) => path === '/en/price',
    reason:
      'The same rule for every English page under /en: a 308 to the unprefixed address.',
    expect: { status: 308, location: '/price' },
  },
]

/** The intended difference that covers a path, if any. */
export function intendedFor(path: string): IntendedDifference | undefined {
  return INTENDED_DIFFERENCES.find((difference) => difference.covers(path))
}

/** What one intended difference looked like on this run. */
export interface IntendedHit {
  id: string
  url: string
  reason: string
  baseline: string
  served: string
}

export interface ParityResult {
  matched: number
  differences: Difference[]
  intended: IntendedHit[]
  fileCount: number
}

const sameRecord = (a: Record<string, string>, b: Record<string, string>) =>
  JSON.stringify(Object.entries(a).sort()) ===
  JSON.stringify(Object.entries(b).sort())

/** The `Location` of a redirect as a path, whatever origin it names. */
function locationPath(location: string | null): string | null {
  if (location === null) return null
  return new URL(location, SITE_ORIGIN).pathname
}

/** Run up to `limit` tasks at once, keeping their order. */
async function pool<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await task(items[index]!)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  )
  return results
}

/** Diff everything the baseline holds against a server. */
export async function compareParity(
  baseline: Baseline,
  ask: Ask,
  input: { fileCount: number; limit?: number },
): Promise<ParityResult> {
  const differences: Difference[] = []
  const intended: IntendedHit[] = []
  let matched = 0
  const differ = (
    url: string,
    fact: string,
    expected: unknown,
    served: unknown,
  ) => differences.push({ url, fact, expected, served })

  // 1 · every page the Next sitemap listed.
  const paths = Object.keys(baseline.pages)
  const answers = await pool(paths, 8, ask)
  paths.forEach((path, index) => {
    const answer = answers[index]!
    const expected = baseline.pages[path]!
    const allowed = intendedFor(path)
    if (allowed) {
      intended.push({
        id: allowed.id,
        url: path,
        reason: allowed.reason,
        baseline: String(expected.status),
        served: String(answer.status),
      })
      return
    }
    const served = readPage(answer)
    let same = true
    const check = (fact: string, a: unknown, b: unknown, equal = a === b) => {
      if (!equal) {
        same = false
        differ(path, fact, a, b)
      }
    }
    check('status', expected.status, served.status)
    check('location', expected.location, served.location)
    check('canonical', expected.canonical, served.canonical)
    check(
      'hreflang',
      expected.hreflang,
      served.hreflang,
      sameRecord(expected.hreflang, served.hreflang),
    )
    check('og:locale', expected.ogLocale, served.ogLocale)
    check('html lang', expected.htmlLang, served.htmlLang)
    if (same) matched += 1
  })

  // 2 · /sitemap-site.xml, as a set of entries keyed by <loc>.
  const site = await ask('/sitemap-site.xml')
  const servedEntries = new Map(
    readSitemap(site.body).map((entry) => [entry.loc, entry]),
  )
  for (const entry of baseline.sitemapSite) {
    const served = servedEntries.get(entry.loc)
    servedEntries.delete(entry.loc)
    if (!served) {
      differ('/sitemap-site.xml', `entry ${entry.loc}`, 'listed', 'absent')
      continue
    }
    for (const fact of ['changefreq', 'priority'] as const) {
      if (entry[fact] !== served[fact])
        differ(
          '/sitemap-site.xml',
          `${fact} of ${entry.loc}`,
          entry[fact],
          served[fact],
        )
    }
    if (!sameRecord(entry.alternates, served.alternates))
      differ(
        '/sitemap-site.xml',
        `alternates of ${entry.loc}`,
        entry.alternates,
        served.alternates,
      )
  }
  for (const loc of servedEntries.keys())
    differ('/sitemap-site.xml', `entry ${loc}`, 'absent', 'listed')

  // 3 · /sitemap.xml, the same children.
  const index = readSitemap((await ask('/sitemap.xml')).body).map((e) => e.loc)
  if (
    JSON.stringify([...index].sort()) !==
    JSON.stringify([...baseline.sitemapIndex].sort())
  )
    differ('/sitemap.xml', 'children', baseline.sitemapIndex, index)

  // 4 · robots.txt, apart from whitespace.
  const robots = await ask('/robots.txt')
  if (robots.status !== 200) differ('/robots.txt', 'status', 200, robots.status)
  if (collapse(robots.body) !== collapse(baseline.robots))
    differ(
      '/robots.txt',
      'text',
      collapse(baseline.robots),
      collapse(robots.body),
    )

  // 5 · the icons and the share cards: 200 from a file, the cards as PNGs.
  for (const [path, expected] of Object.entries(baseline.assets)) {
    const answer = await ask(path)
    if (answer.status !== expected.status)
      differ(path, 'status', expected.status, answer.status)
    if (path.endsWith('opengraph-image') && answer.contentType !== 'image/png')
      differ(path, 'content type', 'image/png', answer.contentType)
  }

  // 6 · the not-found answers: 404 with that locale's page. The language is
  // held to the locale's LOCALE_BCP47 tag rather than to the baseline: Next
  // streamed its not-found into an `<html id="__next_error__">` shell with no
  // `lang` at all (the baseline records that), and a static 404 page is a whole
  // document that says which language it is in.
  for (const [path, expected] of Object.entries(baseline.notFound)) {
    const answer = await ask(path)
    if (answer.status !== expected.status)
      differ(path, 'status', expected.status, answer.status)
    const want = LOCALE_BCP47[localeOfPath(path)]
    const lang = readLang(answer.body)
    if (lang !== want) differ(path, 'html lang', want, lang)
  }

  // 7 · the deliberate changes outside the sitemap.
  for (const [path, before] of Object.entries(baseline.intended)) {
    const allowed = intendedFor(path)
    const answer = await ask(path)
    if (!allowed) {
      differ(path, 'intended difference', 'on the list', 'not on the list')
      continue
    }
    const served = `${answer.status}${answer.location ? ` → ${locationPath(answer.location)}` : ''}`
    if (
      allowed.expect &&
      (answer.status !== allowed.expect.status ||
        locationPath(answer.location) !== allowed.expect.location)
    ) {
      differ(
        path,
        'redirect',
        `${allowed.expect.status} → ${allowed.expect.location}`,
        served,
      )
      continue
    }
    intended.push({
      id: allowed.id,
      url: path,
      reason: allowed.reason,
      baseline: `${before.status}${before.location ? ` → ${locationPath(before.location)}` : ''}`,
      served,
    })
  }

  // 8 · the output's size against one Workers version.
  if (input.fileCount >= WORKERS_FILE_LIMIT)
    differ('dist/', 'file count', `< ${WORKERS_FILE_LIMIT}`, input.fileCount)

  return { matched, differences, intended, fileCount: input.fileCount }
}

const show = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value)

/** The Markdown report the run attaches to its pull request. */
export function parityReport(baseline: Baseline, result: ParityResult): string {
  const pages = Object.keys(baseline.pages).length
  const lines = [
    '# Parity: the static build against the Next build at b9ff37a',
    '',
    `Baseline: \`${baseline.commit}\`, captured with \`${baseline.command}\`.`,
    '',
    `- **${result.matched} of ${pages}** sitemap URLs match on status, canonical, hreflang, og:locale and html lang.`,
    `- **${result.differences.length}** difference(s) not on the intended list.`,
    `- **${result.intended.length}** intended difference(s).`,
    `- **${result.fileCount}** files in the output (limit ${WORKERS_FILE_LIMIT}).`,
    '',
    '## Differences',
    '',
  ]
  if (result.differences.length === 0) lines.push('None.')
  else {
    lines.push('| URL | Fact | Next | Static |', '| --- | --- | --- | --- |')
    for (const d of result.differences)
      lines.push(
        `| ${d.url} | ${d.fact} | ${show(d.expected).replaceAll('|', '\\|')} | ${show(d.served).replaceAll('|', '\\|')} |`,
      )
  }
  lines.push('', '## Intended differences', '')
  for (const difference of INTENDED_DIFFERENCES) {
    const hits = result.intended.filter((hit) => hit.id === difference.id)
    if (hits.length === 0) continue
    lines.push(`- **${difference.id}** — ${difference.reason}`)
    for (const hit of hits)
      lines.push(
        `  - \`${hit.url}\`: Next ${hit.baseline}, static ${hit.served}`,
      )
  }
  return `${lines.join('\n')}\n`
}
