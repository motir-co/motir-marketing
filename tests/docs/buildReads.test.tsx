// @vitest-environment node
import { renderToReadableStream } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DocsLayout from '@/app/[locale]/docs/DocsLayout'
import DocsGuidesLayout from '@/app/[locale]/docs/(guides)/DocsGuidesLayout'
import DocsApiLayout from '@/app/[locale]/docs/api/DocsApiLayout'
import { localeParams } from '@/i18n/locale'
import { localizedPath } from '@/i18n/localizedPath'
import { LOCALES, type Locale } from '@/i18n/routing'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { getCopy } from '@/lib/copy'
import { DocsArtifactUnavailableError } from '@/lib/docs'
import { resolveDocsDocument, splitParts } from '@/lib/docsDocuments'
import { PageRoot, type LayoutComponent } from '@/lib/pageRoot'
import {
  loadPage,
  NEUTRAL_CLI_COMMANDS,
  NEUTRAL_MCP_TOOLS,
  pageFileOf,
} from '@/tests/helpers/docsRoutes'

/*
 * THE DOCS BUILD READS EACH ARTIFACT ONCE (MOTIR-10645).
 *
 * The five pages that read a published artifact are rendered here the way
 * `astro build` renders them — through the page root, inside the docs layouts
 * their `.astro` page names, in all twelve locales, in ONE process — and the
 * fetches are counted: the OpenAPI spec once for `/docs/api`,
 * `/docs/api/getting-started` and the API rail together, the MCP tool
 * catalogue once per locale URL, the CLI command list once. A failed read
 * fails every page that needs it, naming the artifact, and a built page never
 * carries the "unreachable" paragraph a request-time render used to show.
 */

type Params = { locale: string }
const SPEC = `${APP_ORIGIN}/api/openapi/v1.json`
const CATALOGUE = `${APP_ORIGIN}/api/docs/mcp-tools.json`
const CLI = `${APP_ORIGIN}/api/docs/cli-commands.json`

/** A spec with three operations in two groups, so the rail has rows to link. */
const OPENAPI = {
  openapi: '3.1.0',
  info: { title: 'Motir API', version: '9.9.9' },
  paths: {
    '/api/v1/zqthings': {
      get: { operationId: 'listZqthings', summary: 'List the zqthings.' },
      post: { operationId: 'createZqthing', summary: 'Create a zqthing.' },
    },
    '/api/v1/zqwidgets/{key}': {
      get: { operationId: 'getZqwidget', summary: 'Read one zqwidget.' },
    },
  },
}

const DOCUMENTS = new Map<string, unknown>([
  [SPEC, OPENAPI],
  [CATALOGUE, NEUTRAL_MCP_TOOLS],
  [CLI, NEUTRAL_CLI_COMMANDS],
])

/** The pages that read an artifact, with the sub-area layout their page names. */
const READERS: { route: string; area: LayoutComponent<Params> }[] = [
  { route: '/docs/api', area: DocsApiLayout as LayoutComponent<Params> },
  {
    route: '/docs/api/getting-started',
    area: DocsApiLayout as LayoutComponent<Params>,
  },
  {
    route: '/docs/api/stability',
    area: DocsApiLayout as LayoutComponent<Params>,
  },
  { route: '/docs/mcp', area: DocsGuidesLayout as LayoutComponent<Params> },
  {
    route: '/docs/mcp/tools',
    area: DocsGuidesLayout as LayoutComponent<Params>,
  },
  { route: '/docs/cli', area: DocsGuidesLayout as LayoutComponent<Params> },
]

/** Serve the documents, failing the ones named; returns the fetch spy. */
function stubArtifacts(failing: readonly string[] = []) {
  const fetch = vi.fn(async (input: unknown) => {
    const url = String(input)
    const base = url.split('?')[0]!
    if (failing.includes(base)) return new Response('down', { status: 503 })
    const document = DOCUMENTS.get(base)
    if (document === undefined) throw new Error(`no fixture for ${url}`)
    return new Response(JSON.stringify(document), { status: 200 })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => vi.unstubAllGlobals())

/** One built page: the route's module in its layouts, as `SitePage` renders it. */
async function build(route: string, locale: Locale): Promise<string> {
  const reader = READERS.find((entry) => entry.route === route)!
  const page = (await loadPage(pageFileOf(route))).default
  const stream = await renderToReadableStream(
    <PageRoot
      value={{
        locale,
        copy: await getCopy(locale),
        pathname: localizedPath(locale, route),
      }}
      page={page as never}
      layouts={[DocsLayout as LayoutComponent<Params>, reader.area]}
      params={localeParams(locale) as Promise<Params>}
    />,
  )
  await stream.allReady
  return new Response(stream).text()
}

/** Every page of `routes` in every locale, one after another, as one build. */
async function buildAll(routes: readonly string[]) {
  const pages = new Map<string, string>()
  for (const locale of LOCALES)
    for (const route of routes)
      pages.set(`${locale} ${route}`, await build(route, locale))
  return pages
}

// Seventy-two pages rendered in one go: a build, measured, takes a while.
describe('a build of every locale', { timeout: 60_000 }, () => {
  it('fetches the spec once, the catalogue once per locale URL, and the CLI list once', async () => {
    const fetch = stubArtifacts()
    const pages = await buildAll(READERS.map((reader) => reader.route))
    expect(pages.size).toBe(READERS.length * LOCALES.length)

    const counts = new Map<string, number>()
    for (const [url] of fetch.mock.calls) {
      counts.set(String(url), (counts.get(String(url)) ?? 0) + 1)
    }
    expect(counts.get(SPEC)).toBe(1)
    expect(counts.get(CLI)).toBe(1)
    const catalogueUrls = [...counts.keys()].filter((url) =>
      url.startsWith(CATALOGUE),
    )
    expect(catalogueUrls.sort()).toEqual(
      LOCALES.map((locale) =>
        locale === 'en' ? CATALOGUE : `${CATALOGUE}?locale=${locale}`,
      ).sort(),
    )
    for (const url of catalogueUrls) expect(counts.get(url), url).toBe(1)
    expect(fetch).toHaveBeenCalledTimes(1 + 1 + LOCALES.length)
  })

  it('links every operation from the rail to the section the page renders for it', async () => {
    stubArtifacts()
    for (const locale of ['en', 'de'] as const) {
      const html = await build('/docs/api', locale)
      const prefix = localizedPath(locale, '/docs/api')
      const linked = [
        ...html.matchAll(new RegExp(`href="${prefix}#([^"]+)"`, 'g')),
      ].map((match) => match[1]!)
      const sections = [...html.matchAll(/<section id="([^"]+)"/g)].map(
        (match) => match[1]!,
      )
      expect(sections).toHaveLength(3)
      expect([...linked].sort()).toEqual([...sections].sort())
    }
  })

  it('never builds a page carrying an "unreachable" paragraph', async () => {
    stubArtifacts()
    const pages = await buildAll(READERS.map((reader) => reader.route))
    for (const locale of LOCALES) {
      const { docs } = await getCopy(locale)
      const sentences = [
        docs.apiUnreachable,
        docs.mcpToolsUnreachable,
        ...['cli', 'mcp'].map((slug) =>
          splitParts(resolveDocsDocument(slug, locale).document.markdown)
            .find((part) => part.name === 'unreachable')!
            .text.trim(),
        ),
      ].map(
        // The longest run of plain words: markup and placeholders are not text.
        (sentence) =>
          sentence
            .split(/[<>{}`[\]()*]/)
            .map((run) => run.trim())
            .sort((a, b) => b.length - a.length)[0]!
            .slice(0, 30),
      )
      for (const route of READERS.map((reader) => reader.route)) {
        const html = pages.get(`${locale} ${route}`)!
        for (const sentence of sentences) {
          expect(sentence.length, sentence).toBeGreaterThan(10)
          expect(html, `${locale} ${route}`).not.toContain(sentence)
        }
      }
    }
  })
})

describe('a failed read fails the build, naming the artifact', () => {
  for (const [url, artifact, routes] of [
    [
      SPEC,
      'the OpenAPI spec',
      ['/docs/api', '/docs/api/getting-started', '/docs/api/stability'],
    ],
    [CATALOGUE, 'the MCP tool catalogue', ['/docs/mcp', '/docs/mcp/tools']],
    [CLI, 'the CLI command catalogue', ['/docs/cli']],
  ] as const) {
    it(`fails every page that reads ${artifact}, in every locale`, async () => {
      const fetch = stubArtifacts([url])
      for (const locale of ['en', 'ja'] as const)
        for (const route of routes) {
          const built = build(route, locale)
          await expect(built, `${locale} ${route}`).rejects.toThrow(
            DocsArtifactUnavailableError,
          )
          await expect(build(route, locale)).rejects.toThrow(
            `could not read ${artifact} at ${url}`,
          )
        }
      // The failure is read once too: every page after the first gets it back.
      const reads = fetch.mock.calls.filter(
        ([called]) => String(called).split('?')[0] === url,
      )
      expect(reads.length).toBe(url === CATALOGUE ? 2 : 1)
    })
  }

  it('says why when the fetch itself throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('getaddrinfo ENOTFOUND')
      }),
    )
    await expect(build('/docs/cli', 'en')).rejects.toThrow(
      `could not read the CLI command catalogue at ${CLI}: getaddrinfo ENOTFOUND`,
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw 'refused'
      }),
    )
    await expect(build('/docs/mcp', 'de')).rejects.toThrow(
      `could not read the MCP tool catalogue at ${CATALOGUE}: refused`,
    )
  })
})
