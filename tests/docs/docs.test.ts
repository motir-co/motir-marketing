// @vitest-environment node
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  McpToolCatalogueShapeError,
  catalogueTextLocale,
  countCatalogueTools,
  fetchMcpToolCatalogue,
  listOperations,
  parseMcpToolCatalogue,
  type McpToolCatalogue,
  type OpenApiDocument,
} from '@/lib/docs'

/*
 * The /docs drift guard (MOTIR-4046, widened by MOTIR-4180).
 *
 * `/docs` is generated from TWO of motir-core's registries, and each half is
 * guarded on its own terms.
 *
 * The API reference consumes motir-core's PUBLISHED OpenAPI document — served
 * at the versioned, public `/api/openapi/v1.json`, assembled from compile-time
 * declarations — rather than a copied spec. So the guard is two-fold: the spec
 * is fetched from the published URL (never a committed copy), and the parse the
 * reference renders through is asserted against a fixture, so a shape change in
 * motir-core's registry that breaks the parse fails here rather than silently
 * rendering an empty reference.
 *
 * The MCP TOOL registry is now consumed the same way (MOTIR-4194 / MOTIR-4195).
 * motir-core publishes the catalogue at `/api/docs/mcp-tools.json` — anonymous,
 * derived from the permission registry that gates the tools — and this repository
 * fetches it at request time. MOTIR-4046 had shipped a hand COPY instead: 24 of
 * 55 tools in five invented groups, with no reader and no checker, which is the
 * outcome its own acceptance criterion had already called unacceptable. MOTIR-4180
 * removed it, and the guard below asserts the ABSENCE of any copy.
 *
 * ⚠️ THAT GUARD IS UNCHANGED AND STILL THE POINT. Rendering the catalogue did not
 * weaken it: the names arrive over the wire and are never written into the page
 * source, so the same detector still finds nothing. If it ever goes red, a copy
 * has come back — and the fix is the implementation, never the guard.
 *
 * Both readers are guarded on the same two axes: the URL they fetch is the
 * published one (never a committed file), and the parse each page renders through
 * is pinned against a fixture, so a shape change in motir-core's registry fails
 * here rather than silently rendering an empty page.
 */

const fixture: OpenApiDocument = {
  openapi: '3.1.0',
  info: { title: 'Motir API', version: '1' },
  paths: {
    '/api/public/explore': {
      get: { operationId: 'listDirectory', summary: 'List the square' },
    },
    '/api/v1/projects/{key}': {
      get: { operationId: 'getProject', summary: 'Read a project' },
      patch: { operationId: 'updateProject', summary: 'Update a project' },
    },
  },
}

describe('listOperations', () => {
  it('flattens the spec paths into a sorted operation list', () => {
    // ⚠️ WIDENED BY MOTIR-4391 — the operation now carries its parameters, its
    // request body and its responses, because the page renders them. The three
    // heads below are unchanged; what is added is the detail the reference
    // fetched and discarded for the whole life of this page.
    expect(listOperations(fixture)).toEqual([
      {
        method: 'GET',
        path: '/api/public/explore',
        operationId: 'listDirectory',
        summary: 'List the square',
        description: undefined,
        permission: undefined,
        parameters: [],
        requestBody: undefined,
        responses: [],
      },
      {
        method: 'GET',
        path: '/api/v1/projects/{key}',
        operationId: 'getProject',
        summary: 'Read a project',
        description: undefined,
        permission: undefined,
        parameters: [],
        requestBody: undefined,
        responses: [],
      },
      {
        method: 'PATCH',
        path: '/api/v1/projects/{key}',
        operationId: 'updateProject',
        summary: 'Update a project',
        description: undefined,
        permission: undefined,
        parameters: [],
        requestBody: undefined,
        responses: [],
      },
    ])
  })

  it('ignores methods that carry no operation', () => {
    const doc: OpenApiDocument = {
      openapi: '3.1.0',
      info: { title: 'x', version: '1' },
      paths: { '/api/x': { get: { summary: 'only get' } } },
    }
    expect(listOperations(doc).map((o) => o.method)).toEqual(['GET'])
  })
})

describe('the reference consumes the published spec, never a copied one', () => {
  it('fetches the versioned public endpoint on the app origin', () => {
    // The spec URL is assembled from the ONE configured app origin and the
    // stable, public `/api/openapi/v1.json` path — a client generator hard-codes
    // it, so this repository must not drift onto a hand-copied file.
    const source = readFileSync('lib/docs.ts', 'utf8')
    expect(source).toContain('/api/openapi/v1.json')
    expect(source).toContain('APP_ORIGIN')
  })

  it('commits no copied spec artifact under content/docs/', () => {
    expect(contentDocsStrays()).toEqual([])
  })

  it('allows a hyphenated locale’s document and nothing looser (MOTIR-9241)', () => {
    expect(CONTENT_DOCS_FILE.test('quickstart/zh-tw.md')).toBe(true)
    expect(CONTENT_DOCS_FILE.test('quickstart/fr.md')).toBe(true)
    expect(CONTENT_DOCS_FILE.test('quickstart/zh-tw.txt')).toBe(false)
    expect(CONTENT_DOCS_FILE.test('quickstart/zhtw.md')).toBe(false)
    expect(CONTENT_DOCS_FILE.test('quickstart/zh_tw.md')).toBe(false)
  })
})

/*
 * MOTIR-8032 amends the two "no copied artifact under content/docs/" assertions
 * on the record. `content/docs/` now holds the per-language DOCUMENTS (the
 * authored prose, `<slug>/<locale>.md`), their ledgers (`<slug>/revisions.json`)
 * and one README. What the assertions exist to forbid is unchanged: a copied
 * OpenAPI document or a copied command / tool catalogue. So they now assert that
 * nothing else lives there, which is stricter about content and no longer
 * breaks on the document form.
 */
/** A file `content/docs/` may hold: a `<locale>.md` (`fr.md`, `zh-tw.md`) or a ledger. */
const CONTENT_DOCS_FILE = /(^|\/)([a-z]{2}(-[a-z]{2})?\.md|revisions\.json)$/

function contentDocsStrays(dir = 'content/docs', prefix = ''): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = `${prefix}${entry.name}`
    if (entry.isDirectory())
      return contentDocsStrays(`${dir}/${entry.name}`, `${rel}/`)
    const allowed = rel === 'README.md' || CONTENT_DOCS_FILE.test(rel)
    return allowed ? [] : [rel]
  })
}

/*
 * ── The MCP tool catalogue (MOTIR-4195) ────────────────────────────────────
 *
 * The fixture is motir-core's document SHAPE, with two invented groups and three
 * invented tool names. It is not a copy of the registry and cannot become one:
 * nothing asserts the real catalogue's contents, which this repository has no way
 * to know. What it pins is the PARSE — so a rename, a dropped array or a changed
 * nesting over there fails this suite rather than rendering a page that looks
 * finished and is short.
 */
const catalogueFixture = {
  endpoint: '/api/mcp',
  toolCount: 3,
  groups: [
    {
      permission: 'thing:browse',
      label: 'Browse things',
      gates: 'Read things and their detail.',
      grantedByDefault: true,
      tools: [
        {
          name: 'alphaTool',
          permission: 'thing:browse',
          summary: 'Read one thing.',
        },
        {
          name: 'betaTool',
          permission: 'thing:browse',
          summary: 'List the things.',
        },
      ],
    },
    {
      permission: 'thing:edit',
      label: 'Edit things',
      gates: 'Create and change things.',
      grantedByDefault: false,
      tools: [
        {
          name: 'gammaTool',
          permission: 'thing:edit',
          summary: 'Change one thing.',
        },
      ],
    },
  ],
}

const catalogueWithout = (mutate: (doc: Record<string, unknown>) => void) => {
  const doc = JSON.parse(JSON.stringify(catalogueFixture)) as Record<
    string,
    unknown
  >
  mutate(doc)
  return doc
}

describe('parseMcpToolCatalogue', () => {
  it('reads the document motir-core serves, groups and tools in its order', () => {
    const parsed = parseMcpToolCatalogue(catalogueFixture)

    expect(parsed.endpoint).toBe('/api/mcp')
    expect(parsed.groups.map((g) => g.label)).toEqual([
      'Browse things',
      'Edit things',
    ])
    expect(parsed.groups[0]!.grantedByDefault).toBe(true)
    expect(parsed.groups[1]!.grantedByDefault).toBe(false)
    expect(parsed.groups.flatMap((g) => g.tools.map((t) => t.name))).toEqual([
      'alphaTool',
      'betaTool',
      'gammaTool',
    ])
    expect(parsed.groups[0]!.tools[0]!.summary).toBe('Read one thing.')
  })

  it('tolerates fields it does not know — the producer may add them', () => {
    // The published document is UNVERSIONED and explicitly licensed to grow new
    // fields. A parse that rejected one would turn this page red on a change
    // motir-core is entitled to make without notice.
    const grown = catalogueWithout((doc) => {
      doc.generatedAt = '2026-09-03'
      ;(doc.groups as Record<string, unknown>[])[0]!.icon = 'eye'
    })

    expect(parseMcpToolCatalogue(grown).groups[0]!.label).toBe('Browse things')
  })

  for (const [what, mutate] of [
    ['the document is not an object', () => undefined],
    ['`groups` is missing', (doc) => delete doc.groups],
    [
      '`groups` is renamed',
      (doc) => {
        doc.toolGroups = doc.groups
        delete doc.groups
      },
    ],
    [
      '`groups` is empty',
      (doc) => {
        doc.groups = []
      },
    ],
    ['`toolCount` is missing', (doc) => delete doc.toolCount],
    ['`endpoint` is missing', (doc) => delete doc.endpoint],
    [
      'a group has lost its `tools` array',
      (doc) => {
        delete (doc.groups as Record<string, unknown>[])[0]!.tools
      },
    ],
    [
      'a group has lost its `label`',
      (doc) => {
        delete (doc.groups as Record<string, unknown>[])[1]!.label
      },
    ],
    [
      'a group has lost `grantedByDefault`',
      (doc) => {
        delete (doc.groups as Record<string, unknown>[])[0]!.grantedByDefault
      },
    ],
    [
      'a tool has lost its `name`',
      (doc) => {
        delete (
          (doc.groups as Record<string, unknown>[])[0]!.tools as Record<
            string,
            unknown
          >[]
        )[1]!.name
      },
    ],
    [
      'a tool has lost its `summary`',
      (doc) => {
        delete (
          (doc.groups as Record<string, unknown>[])[1]!.tools as Record<
            string,
            unknown
          >[]
        )[0]!.summary
      },
    ],
  ] as [string, (doc: Record<string, unknown>) => void][]) {
    it(`throws, rather than rendering a short page, when ${what}`, () => {
      const doc =
        what === 'the document is not an object'
          ? 'not a document'
          : catalogueWithout(mutate)

      expect(() => parseMcpToolCatalogue(doc)).toThrow(
        McpToolCatalogueShapeError,
      )
    })
  }
})

interface LocaleDoc {
  locale?: unknown
  groups: { textLocale?: unknown; tools: { summaryLocale?: unknown }[] }[]
}

describe('parseMcpToolCatalogue locale fields (MOTIR-8050)', () => {
  const localized = () => {
    const doc = structuredClone(catalogueFixture) as LocaleDoc
    doc.locale = 'ko'
    doc.groups[0].textLocale = 'en'
    doc.groups[0].tools[0].summaryLocale = 'ko'
    return doc
  }

  it('keeps the three fields when present', () => {
    const parsed = parseMcpToolCatalogue(localized())
    expect(parsed.locale).toBe('ko')
    expect(parsed.groups[0]!.textLocale).toBe('en')
    expect(parsed.groups[0]!.tools[0]!.summaryLocale).toBe('ko')
  })

  it('leaves them absent when absent', () => {
    const parsed = parseMcpToolCatalogue(catalogueFixture)
    expect('locale' in parsed).toBe(false)
    expect('textLocale' in parsed.groups[0]!).toBe(false)
    expect('summaryLocale' in parsed.groups[0]!.tools[0]!).toBe(false)
  })

  it.each([
    ['locale', (d: LocaleDoc) => (d.locale = 5), 'document.locale'],
    [
      'textLocale',
      (d: LocaleDoc) => (d.groups[0].textLocale = ''),
      'groups[0].textLocale',
    ],
    [
      'summaryLocale',
      (d: LocaleDoc) => (d.groups[0].tools[0].summaryLocale = null),
      'groups[0].tools[0].summaryLocale',
    ],
  ])(
    'throws a shape error naming the path for a bad %s',
    (_n, break_, path) => {
      const doc = localized()
      break_(doc)
      expect(() => parseMcpToolCatalogue(doc)).toThrow(
        McpToolCatalogueShapeError,
      )
      expect(() => parseMcpToolCatalogue(doc)).toThrow(path)
    },
  )

  it('catalogueTextLocale returns the served value, else en', () => {
    expect(catalogueTextLocale('ko', 'ko')).toBe('ko')
    expect(catalogueTextLocale(undefined, 'ko')).toBe('en')
  })
})

describe('countCatalogueTools', () => {
  it('counts the rows the page is about to render, not the served scalar', () => {
    // The producer computes `toolCount` the same way and the two agree. Counting
    // here is what makes it impossible for the number a reader sees to disagree
    // with the list beneath it.
    const parsed = parseMcpToolCatalogue(
      catalogueWithout((doc) => {
        doc.toolCount = 99
      }),
    ) as McpToolCatalogue

    expect(countCatalogueTools(parsed)).toBe(3)
  })
})

describe('the catalogue is consumed, never copied', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('fetches the published catalogue path on the app origin', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => catalogueFixture,
    })

    await expect(fetchMcpToolCatalogue()).resolves.toMatchObject({
      endpoint: '/api/mcp',
    })
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      'https://app.test.motir.co/api/docs/mcp-tools.json',
    )
  })

  it('requests the English URL with no query, and ?locale= for another locale — each URL once', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => catalogueFixture,
    })
    const base = 'https://app.test.motir.co/api/docs/mcp-tools.json'
    await fetchMcpToolCatalogue()
    await fetchMcpToolCatalogue('en')
    await fetchMcpToolCatalogue('ko')
    await fetchMcpToolCatalogue('ko')
    // `undefined` and `'en'` are the same URL, read once for the build
    // (MOTIR-10645); a plain fetch, with none of Next's cache options.
    expect(fetchMock.mock.calls).toEqual([[base], [`${base}?locale=ko`]])
  })

  it('THROWS when the artifact is unreachable — there is no fallback list', async () => {
    // The one thing this page must never do. A committed default rendered here
    // would be stale exactly when it is displayed and unreachable by every guard,
    // because a guard runs on the path where the fetch works.
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    })

    await expect(fetchMcpToolCatalogue()).rejects.toThrow(
      'could not read the MCP tool catalogue at https://app.test.motir.co/api/docs/mcp-tools.json: HTTP 503',
    )
  })

  it('THROWS when the artifact is served but is not the shape it renders', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ endpoint: '/api/mcp', toolCount: 0, groups: [] }),
    })

    await expect(fetchMcpToolCatalogue()).rejects.toThrow(
      McpToolCatalogueShapeError,
    )
  })

  it('commits no catalogue artifact under content/docs/', () => {
    // The same assertion the spec limb makes, for the second registry: neither
    // published document may arrive as a file in this repository.
    expect(contentDocsStrays()).toEqual([])
  })

  it('reads the published catalogue path out of the ONE configured origin', () => {
    const source = readFileSync('lib/docs.ts', 'utf8')
    expect(source).toContain('/api/docs/mcp-tools.json')
    expect(source).toContain('APP_ORIGIN')
  })
})

/*
 * A lowercase snake_case identifier is the shape every Motir MCP tool name has
 * (`get_work_item`, `add_plan_items`, `link_pull_request`), and nothing else in
 * these pages is written that way — the Tailwind tokens are kebab-case, the
 * routes are slash-separated, and the motir-core symbols cited in the comments
 * are UPPER_SNAKE. So it is a precise detector for a reintroduced tool list,
 * and it does not depend on knowing which tools exist, which is exactly the
 * thing this repository cannot know.
 */
export function toolNameLiterals(source: string): string[] {
  return source.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) ?? []
}

describe('the MCP pages name no tools, because nothing here could check them', () => {
  // The detector is proved to FIRE before it is trusted to pass: perturb the
  // sample by putting one real tool name back, and it must be reported by name.
  it('reports a tool name that has been put back', () => {
    const perturbed =
      "const GROUPS = [{ name: 'Work items', tools: ['get_work_item'] }]"
    expect(toolNameLiterals(perturbed)).toContain('get_work_item')
  })

  it('ignores the kebab-case tokens and slash-separated routes the pages do use', () => {
    const shipped =
      '<code className="rounded-(--radius-kbd) bg-(--el-muted)">tools/list</code> /api/mcp TOOL_PERMISSIONS'
    expect(toolNameLiterals(shipped)).toEqual([])
  })

  for (const page of [
    'app/[locale]/docs/(guides)/mcp/tools/McpToolsRoute.tsx',
    'app/[locale]/docs/(guides)/mcp/McpRoute.tsx',
  ]) {
    it(`names no tool in ${page}`, () => {
      expect(toolNameLiterals(readFileSync(page, 'utf8'))).toEqual([])
    })
  }

  // MOTIR-8037 / MOTIR-8055: the pages' prose is a document per language now, so
  // the guard follows it there. Every `content/docs/mcp/*.md` and
  // `content/docs/mcp/tools/*.md` — the English source and any translation — is
  // scanned by glob, so a translation that types a tool name (or a vendor key
  // with the same shape, which `lib/mcpWiring.ts` hands over as a value) fails
  // exactly as the page source would.
  for (const dir of ['content/docs/mcp', 'content/docs/mcp/tools']) {
    const documents = readdirSync(dir).filter((name) => name.endsWith('.md'))
    it(`finds the ${dir} documents it is meant to scan`, () => {
      expect(documents).toContain('en.md')
    })
    for (const name of documents) {
      it(`names no tool in ${dir}/${name}`, () => {
        expect(
          toolNameLiterals(readFileSync(`${dir}/${name}`, 'utf8')),
        ).toEqual([])
      })
    }
  }
})

describe('the generated reference pages are built ahead, never rendered in the serving process', () => {
  // A request-time render of these pages is what took motir.co down on
  // 2026-10-16/17 (MOTIR-8842). They are static pages now (MOTIR-10645): each
  // artifact is read once per build (`lib/docs.ts`, measured in
  // `buildReads.test.tsx`), and a failed read fails the build — so no page
  // catches one and renders an "unreachable" state into a 200.
  const PAGES = [
    'app/[locale]/docs/api/ApiReferenceRoute.tsx',
    'app/[locale]/docs/api/DocsApiLayout.tsx',
    'app/[locale]/docs/api/getting-started/GettingStartedRoute.tsx',
    'app/[locale]/docs/(guides)/mcp/McpRoute.tsx',
    'app/[locale]/docs/(guides)/mcp/tools/McpToolsRoute.tsx',
    'app/[locale]/docs/(guides)/cli/CliRoute.tsx',
  ]

  it.each(PAGES)('%s catches no failed read', (page) => {
    const source = readFileSync(page, 'utf8')
    expect(source).not.toMatch(/\bcatch\b/)
    expect(source).not.toMatch(
      /apiUnreachable|mcpToolsUnreachable|parts\.unreachable/,
    )
  })

  it('reads no Next cache option and no Next build phase', () => {
    const source = readFileSync('lib/docs.ts', 'utf8')
    expect(source).not.toMatch(/force-cache|revalidate|NEXT_PHASE/)
    expect(source).not.toMatch(/docsFetchInit|failBuildIfPrerendering/)
  })
})
