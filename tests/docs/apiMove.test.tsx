import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ApiPage from '@/app/[locale]/docs/api/ApiReferenceRoute'
import GettingStartedPage from '@/app/[locale]/docs/api/getting-started/GettingStartedRoute'
import StabilityPage from '@/app/[locale]/docs/api/stability/StabilityRoute'
import McpToolsPage from '@/app/[locale]/docs/(guides)/mcp/tools/McpToolsRoute'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LOCALES } from '@/i18n/routing'
import { englishCopy, formatIcu, getCopy } from '@/lib/copy'
import {
  listOperations,
  operationAnchorId,
  type OpenApiDocument,
} from '@/lib/docs'
import { documentInvariants } from '@/lib/docsDocuments'
import baseline from './fixtures/api-move-baseline.json'
import {
  CATALOGUE,
  PRODUCTION_CATALOGUE,
  SPEC,
  capture,
  stubFetch,
} from './fixtures/apiMoveCases'

/*
 * MOTIR-8037 — /docs/api, /docs/api/getting-started, /docs/api/stability and
 * /docs/mcp/tools move from JSX prose to `content/docs/<slug>/en.md`.
 *
 * ── The snapshot ────────────────────────────────────────────────────────────
 * `fixtures/api-move-baseline.json` is the four pages as they rendered at the
 * card's base (the parent branch at 10a309e, before any file of this change
 * existed). It was captured with the same `capture()` this file uses
 * (`fixtures/apiMoveCases.ts`: `render(await resolveAsync(await Page(EN_PAGE)))`
 * over the fixtures defined there, the vitest env's app origin) by a temporary
 * test that was deleted afterwards: for each state of each page, the container's
 * `innerHTML` with every tag replaced by a space and whitespace-normalised, every
 * element `id` in document order, and the text of every <pre>. States: `api` and
 * `getting-started` with the spec served, `*-unreachable` with the fetch failing
 * (a state no built page has since MOTIR-10645, kept here as the record),
 * `stability`, `mcp-tools` over a small catalogue (a tool with arguments, one
 * that takes none, one from a server that publishes no schemas, hints, a group
 * granted by default), `mcp-tools-production` over the recorded production
 * catalogue (78 tools) and `mcp-tools-unreachable`. Do not regenerate it to make
 * a red test green: the move is meant to be invisible, and a changed word is the
 * finding.
 *
 * ── What is allowed to differ, and nothing else ─────────────────────────────
 *  · the whitespace normalisation `normalise` states;
 *  · the three rewordings the card names (REWORDINGS below), each asserted to
 *    occur in the snapshot exactly where it is applied;
 *  · the step numeral, which was a monospace span beside the title and is now the
 *    heading's text, `1. Mint a token` (the same id);
 *  · getting-started's new `host` block, which is one more <pre>.
 */

afterEach(() => vi.unstubAllGlobals())

const fixture = baseline as Record<
  string,
  { text: string; ids: string[]; payloads: string[] }
>

const NEW_VERSION_SENTENCE =
  'If the block above shows a placeholder instead of a version, the specification was unreachable when this page was rendered, and API reference reads the current version straight off the document.'

/** before → after, applied to the snapshot's text for the named state. */
const REWORDINGS: Record<string, [string, string][]> = {
  'getting-started': [
    [
      `Every path is relative to the application host, which for this build is ${APP_ORIGIN}. The requests below are written against it, so you can copy one as it stands.`,
      `Every path is relative to the application host this build points at, shown below. The requests are written against it, so you can copy one as it stands. host ${APP_ORIGIN}`,
    ],
    [
      'The value above is the one the server is serving right now, read from the specification when this page was requested.',
      NEW_VERSION_SENTENCE,
    ],
  ],
  'mcp-tools': [
    [
      'handshake against /api/mcp, which',
      'handshake against the endpoint shown above, which',
    ],
  ],
  'mcp-tools-production': [
    [
      'handshake against /api/mcp, which',
      'handshake against the endpoint shown above, which',
    ],
  ],
}

const STEPS = [
  'Mint a token',
  'Your first authenticated call',
  'Paginate a collection',
  'Read an error',
  'Read the response headers',
]

function expectedText(state: string): string {
  let text = fixture[state]!.text
  for (const [before, after] of REWORDINGS[state] ?? []) {
    expect(text.split(before).length - 1, `"${before}" in ${state}`).toBe(1)
    text = text.replace(before, after)
  }
  if (state.startsWith('getting-started')) {
    STEPS.forEach((title, index) => {
      const before = `${index + 1} ${title}`
      expect(text.split(before).length - 1, before).toBe(1)
      text = text.replace(before, `${index + 1}. ${title}`)
    })
  }
  return text
}

const PAGES = {
  api: [ApiPage, () => stubFetch(SPEC)],
  'getting-started': [GettingStartedPage, () => stubFetch(SPEC)],
  stability: [StabilityPage, () => undefined],
  'mcp-tools': [McpToolsPage, () => stubFetch(CATALOGUE)],
  'mcp-tools-production': [McpToolsPage, () => stubFetch(PRODUCTION_CATALOGUE)],
} as const

describe('the four pages read the same after the move', () => {
  for (const [state, [Page, arrange]] of Object.entries(PAGES)) {
    describe(state, () => {
      it('has the body text it had before, word for word', async () => {
        arrange()
        expect((await capture(Page)).text).toBe(expectedText(state))
      })

      it('still renders every element id it rendered', async () => {
        arrange()
        const { ids } = await capture(Page)
        for (const id of fixture[state]!.ids) expect(ids, id).toContain(id)
      })

      it('shows every code block byte for byte', async () => {
        arrange()
        const { payloads } = await capture(Page)
        // getting-started gained the one `host` block, which leads the page.
        const expected = state.startsWith('getting-started')
          ? [APP_ORIGIN, ...fixture[state]!.payloads]
          : fixture[state]!.payloads
        expect(payloads).toEqual(expected)
      })
    })
  }
})

describe('the anchors the rail and deep links read', () => {
  it('getting-started and stability keep their heading ids, in order', async () => {
    stubFetch(SPEC)
    expect((await capture(GettingStartedPage)).ids).toEqual([
      'mint-a-token',
      'first-call',
      'paginate',
      'read-an-error',
      'rate-limits',
      'what-next',
    ])
    expect((await capture(StabilityPage)).ids).toEqual([
      'the-guarantee',
      'allowed-inside-v1',
      'needs-a-new-major',
      'your-obligation',
      'deprecation',
      'how-v2-arrives',
    ])
  })

  it('every operation section id on /docs/api is operationAnchorId(operation)', async () => {
    stubFetch(SPEC)
    const expected = listOperations(SPEC as unknown as OpenApiDocument).map(
      operationAnchorId,
    )
    expect(expected.length).toBeGreaterThan(0)
    const { ids } = await capture(ApiPage)
    for (const id of expected) expect(ids, id).toContain(id)
  })
})

describe('the documents', () => {
  const SLUGS = ['api', 'api/getting-started', 'api/stability', 'mcp/tools']

  for (const slug of SLUGS) {
    it(`${slug}/en.md has no fenced block and an {#id} on every heading`, () => {
      const markdown = readFileSync(`content/docs/${slug}/en.md`, 'utf8')
      expect(markdown).not.toMatch(/^ {0,3}(```|~~~)/m)
      const headings = markdown.split('\n').filter((l) => /^#{1,6}\s/.test(l))
      expect(documentInvariants(markdown).anchors).toHaveLength(headings.length)
    })
  }

  it('holds no build-time value: no origin, no version', () => {
    // The card's own grep: `git grep -nE 'https?://app\.|X-Motir-Api-Version: [0-9]'`.
    let hits = ''
    try {
      hits = execFileSync(
        'git',
        [
          'grep',
          '-nE',
          'https?://app\\.|X-Motir-Api-Version: [0-9]',
          '--',
          'content/docs/api',
          'content/docs/mcp/tools',
        ],
        { encoding: 'utf8' },
      )
    } catch {
      hits = '' // git grep exits 1 when nothing matches
    }
    expect(hits).toBe('')
  })

  it('names the slots each document needs, and no more', () => {
    const slots = (slug: string) =>
      documentInvariants(readFileSync(`content/docs/${slug}/en.md`, 'utf8'))
        .slots
    expect(slots('api')).toEqual(['spec-summary', 'operations'])
    expect(slots('api/getting-started')).toEqual([
      'app-host',
      'first-call-request',
      'first-call-response',
      'paginate-first-request',
      'paginate-first-response',
      'paginate-next-request',
      'error-404-response',
      'response-headers',
    ])
    expect(slots('api/stability')).toEqual([])
    expect(slots('mcp/tools')).toEqual([
      'catalogue-summary',
      'hint-legend',
      'catalogue',
    ])
  })
})

describe('the sentences around generated content come from the catalogue', () => {
  it('/docs/mcp/tools rows say so from docs.mcp* when arguments are absent, empty or default-granted', async () => {
    stubFetch(CATALOGUE)
    const { text } = await capture(McpToolsPage)
    expect(text).toContain(englishCopy.docs.mcpNoArguments)
    expect(text).toContain(englishCopy.docs.mcpGrantedByDefault.trim())
    expect(text).toContain('does not publish this tool')
  })

  /*
   * ⚠️ THE UNREACHABLE STATES ARE NO LONGER PAGES (MOTIR-10645). A built page
   * has no request at which an artifact could be unreachable, and a paragraph
   * saying so would ship as a 200 until the next build — so the read throws,
   * naming the artifact, and the build fails. The baseline's `*-unreachable`
   * snapshots stay in the fixture as the record of what those states read.
   */
  it('/docs/mcp/tools fails the build when the catalogue is unreachable', async () => {
    stubFetch({}, 503)
    await expect(capture(McpToolsPage)).rejects.toThrow(
      /the MCP tool catalogue at .*: HTTP 503/,
    )
  })

  it('/docs/api fails the build when the specification is unreachable', async () => {
    stubFetch({}, 503)
    await expect(capture(ApiPage)).rejects.toThrow(
      /the OpenAPI spec at .*: HTTP 503/,
    )
  })

  it('the count lines inflect: one operation, one tool', async () => {
    stubFetch({
      ...SPEC,
      paths: { '/api/x': { get: { summary: 'only' } } },
    })
    expect((await capture(ApiPage)).text).toContain(
      '· version 9.9.9 · 1 operation ·',
    )
    stubFetch({ ...CATALOGUE, groups: [CATALOGUE.groups[1]!] })
    expect((await capture(McpToolsPage)).text).toContain('1 tool at /api/mcp,')
  })
})

describe('the new docs.* sentences render in every locale', () => {
  // A tag renderer is a callback, not a component.
  // eslint-disable-next-line react/display-name
  const tag = (name: 'a' | 'code') => (chunks: ReactNode) =>
    createElement(name, null, chunks)
  for (const locale of LOCALES) {
    it(`${locale}: every ICU key formats, keeping its code tag, its link tag and its values`, async () => {
      const { docs } = await getCopy(locale)
      const html = (template: string, values: Record<string, never>) =>
        renderToStaticMarkup(<>{formatIcu(locale, template, values)}</>)
      const summary = html(docs.apiSpecSummary, {
        title: 'Motir API',
        version: '9.9.9',
        count: 49,
        path: '/api/openapi/v1.json',
        link: tag('a'),
      } as never)
      expect(summary).toContain('Motir API')
      expect(summary).toContain('9.9.9')
      expect(summary).toContain('49')
      expect(summary).toMatch(/<a>\/api\/openapi\/v1\.json<\/a>/)
      const tools = html(docs.mcpToolsSummary, {
        count: 78,
        endpoint: '/api/mcp',
        code: tag('code'),
      } as never)
      expect(tools).toContain('78')
      expect(tools).toContain('<code>/api/mcp</code>')
      for (const sentence of [
        docs.mcpToolsUnreachable,
        docs.mcpArgsUnpublished,
      ]) {
        expect(html(sentence, { code: tag('code') } as never)).toContain(
          '<code>tools/list</code>',
        )
      }
      // The separator before the group's gate line keeps its leading space.
      expect(docs.mcpGrantedByDefault.startsWith(' · ')).toBe(true)
    })
  }
})

describe('formatIcu', () => {
  it('throws on a malformed sentence rather than printing its key', () => {
    expect(() =>
      formatIcu('en', '{count, plural, one {# x}', { count: 1 }),
    ).toThrow()
  })
})
