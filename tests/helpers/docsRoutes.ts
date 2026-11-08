import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { vi } from 'vitest'
import { type Locale } from '@/i18n/routing'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { getCopy } from '@/lib/copy'
import { localizedPath } from '@/i18n/localizedPath'
import { renderHydrated } from '@/tests/helpers/withCopy'
import { resolveAsync } from '@/tests/helpers/resolveAsync'

/*
 * THE /docs CENSUS AND THE RENDER OF ONE ROUTE IN ONE LOCALE (MOTIR-8051).
 *
 * Three guards (`terminology.test.tsx`, `localeCoverage.test.ts`,
 * `localeRender.test.tsx`) walk the same pages, feed them the same three
 * fetched documents and render them the same way. They share this file so the
 * census cannot disagree between them: a page one of them walks is a page all
 * of them walk.
 */

const DOCS_ROOT = join(process.cwd(), 'app', '[locale]', 'docs')

/**
 * Every page module under `app/[locale]/docs` — a `<Name>Route.tsx`, which a
 * page under `src/pages/[...locale]/docs` renders (MOTIR-10645) — found rather
 * than listed.
 */
export function docsPages(dir: string = DOCS_ROOT): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return docsPages(full)
    return /^[A-Z]\w*Route\.tsx$/.test(entry) ? [full] : []
  })
}

/** `app/[locale]/docs/(guides)/sandbox/SandboxRoute.tsx` → `/docs/sandbox`. Route groups add no segment. */
export function routeOf(file: string): string {
  const segments = relative(join(process.cwd(), 'app', '[locale]'), file)
    .split(sep)
    .slice(0, -1)
    .filter((segment) => !/^\(.*\)$/.test(segment))
  return `/${segments.join('/')}`
}

/** The page file serving `route`, from the walk. */
export function pageFileOf(route: string): string {
  const file = docsPages().find((page) => routeOf(page) === route)
  if (!file) throw new Error(`no page under app/[locale]/docs serves ${route}`)
  return file
}

/** `/docs/mcp/tools` → `mcp/tools`; the index is `null` (it has no document). */
export function slugOf(route: string): string | null {
  return route === '/docs' ? null : route.replace(/^\/docs\//, '')
}

/*
 * ── The documents the async pages fetch ────────────────────────────────────
 * Keyed on the URL WITHOUT its query, so `…/mcp-tools.json?locale=ko` is
 * answered by the same document as the English address (the recorded fixture
 * has no locale fields: the older-server case). An unserved URL is recorded and
 * throws, so the page degrades and the caller can fail the case naming it.
 *
 * ⚠️ THE DEFAULT FIXTURES ARE INVENTED AND DELIBERATELY NEUTRAL — the `zq`
 * prefix convention `tests/docs/inlineSpacing.test.tsx` uses — because a served
 * fixture lands in the text a sweep reads, and one carrying a banned word would
 * fail a page for a sentence nobody in this repository wrote.
 */
export const NEUTRAL_OPENAPI = {
  openapi: '3.1.0',
  info: { title: 'Motir API', version: '9.9.9' },
  paths: {
    '/api/public/zqthings': {
      get: { operationId: 'listZqthings', summary: 'List the zqthings.' },
    },
  },
}

export const NEUTRAL_MCP_TOOLS = {
  endpoint: '/api/mcp',
  toolCount: 1,
  groups: [
    {
      permission: 'zqthing:browse',
      label: 'Browse zqthings',
      gates: 'Read zqthings and their detail.',
      grantedByDefault: true,
      tools: [
        { name: 'zqAlpha', permission: 'zqthing:browse', summary: 'Read one.' },
      ],
    },
  ],
}

export const NEUTRAL_CLI_COMMANDS = {
  packageName: '@zq/cli-fixture',
  packageVersion: '9.9.9',
  installCommand: 'npm install -g @zq/cli-fixture',
  nodeRequirement: '>=22',
  defaultServer: 'https://zq-fixture.test',
  commandCount: 1,
  commands: [
    {
      path: 'zqlogin',
      signature: '',
      invocation: 'motir zqlogin',
      description: 'Connect this terminal.',
      helpGroup: 'SETUP COMMANDS:',
      options: [],
    },
  ],
}

export interface DocsFixtures {
  openapi: unknown
  mcpTools: unknown
  cliCommands: unknown
}

export const NEUTRAL_FIXTURES: DocsFixtures = {
  openapi: NEUTRAL_OPENAPI,
  mcpTools: NEUTRAL_MCP_TOOLS,
  cliCommands: NEUTRAL_CLI_COMMANDS,
}

export interface FetchLedger {
  /** URLs a page fetched that no fixture answers. */
  unserved: string[]
  /** URLs a fixture answered. */
  served: string[]
}

/** Stub `fetch` with the three documents; returns the ledgers it fills. */
export function stubDocsFetch(
  fixtures: DocsFixtures = NEUTRAL_FIXTURES,
): FetchLedger {
  const ledger: FetchLedger = { unserved: [], served: [] }
  const documents = new Map<string, unknown>([
    [`${APP_ORIGIN}/api/openapi/v1.json`, fixtures.openapi],
    [`${APP_ORIGIN}/api/docs/mcp-tools.json`, fixtures.mcpTools],
    [`${APP_ORIGIN}/api/docs/cli-commands.json`, fixtures.cliCommands],
  ])
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown) => {
      const url = String(input)
      const document = documents.get(url.split('?')[0]!)
      if (document === undefined) {
        ledger.unserved.push(url)
        throw new Error(`no fixture for ${url}`)
      }
      ledger.served.push(url)
      return new Response(JSON.stringify(document), { status: 200 })
    }),
  )
  return ledger
}

/** Every fetch fails — the state each async page's fallback arm renders for. */
export function stubDocsUnreachable(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('unreachable')
    }),
  )
}

type PageModule = { default: (props: PageProps) => unknown }
type PageProps = { params: Promise<{ locale: string }> }

/** The props a page under `app/[locale]` receives in `locale`. */
export const pageProps = (locale: Locale): PageProps => ({
  params: Promise.resolve({ locale }),
})

/** Import a page by its path — the walk is the one census, so there is no second list. */
export function loadPage(file: string): Promise<PageModule> {
  return import(/* @vite-ignore */ pathToFileURL(file).href)
}

/** Tags replaced by a space: the second reading `terminology.test.tsx` sweeps. */
export function spacedText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ')
}

export interface RenderedRoute {
  container: HTMLElement
  /** `container.textContent`. */
  text: string
  /** `container.innerHTML` with every tag spaced out. */
  spaced: string
  unmount: () => void
}

/**
 * Render a page in a locale inside that locale's catalogue. The caller owns the
 * fetch stub (`stubDocsFetch`) and unmounts. An async Server Component under the
 * page (`<DocsDocument/>`) is resolved first, or this would read an empty page
 * and every check would pass for free.
 */
export async function renderDocsRoute(
  file: string,
  locale: Locale,
): Promise<RenderedRoute> {
  const Page = (await loadPage(file)).default
  const tree = (await resolveAsync(
    (await Page(pageProps(locale))) as React.ReactNode,
  )) as React.ReactElement
  // Hydrated, as the built page is in a browser, so what a check clicks is the
  // island (MOTIR-10645) at the page's own address.
  const { container, unmount } = await renderHydrated(tree, {
    locale,
    messages: await getCopy(locale),
    pathname: localizedPath(locale, routeOf(file)),
  })
  // An island's props are JSON in an attribute, never text a reader sees.
  const shown = container.cloneNode(true) as HTMLElement
  for (const island of shown.querySelectorAll('[data-props]'))
    island.removeAttribute('data-props')
  return {
    container,
    text: container.textContent ?? '',
    spaced: spacedText(shown.innerHTML),
    unmount,
  }
}

/** The first index at which two lists differ (a length difference counts), or -1. */
export function firstDifference(
  a: readonly unknown[],
  b: readonly unknown[],
): number {
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    if (a[index] !== b[index]) return index
  }
  return -1
}

/**
 * What is wrong with a page that fell back to English (stale or missing
 * translation), per the design's rule: the localized *being updated* note comes
 * first, and the document beneath it (its headings are the tell) sits inside an
 * element marked `lang="en"`. An empty list is an honest fallback.
 */
export function fallbackProblems(
  container: HTMLElement,
  noteText: string,
): string[] {
  const problems: string[] = []
  const note = container.querySelector('[role="note"]')
  if (!note) return ['no *being updated* note']
  if (note.textContent !== noteText)
    problems.push(
      `the note reads ${JSON.stringify(note.textContent)}, not the localized ${JSON.stringify(noteText)}`,
    )
  const english = container.querySelector('[lang="en"]')
  if (!english) return [...problems, 'no element marked lang="en"']
  if (
    !(note.compareDocumentPosition(english) & Node.DOCUMENT_POSITION_FOLLOWING)
  )
    problems.push('the English body is not beneath the note')
  // The page's own `h1` is the page's language; every heading beneath it is the
  // document's, and a fallback document is English throughout.
  for (const heading of container.querySelectorAll('h2, h3, h4')) {
    if (note.contains(heading) || heading.closest('[lang="en"]')) continue
    problems.push(
      `heading outside lang="en": ${JSON.stringify((heading.textContent ?? '').slice(0, 80))}`,
    )
  }
  return problems
}
