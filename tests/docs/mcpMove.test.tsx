import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
import McpPage from '@/app/[locale]/docs/(guides)/mcp/McpRoute'
import * as wiring from '@/lib/mcpWiring'
import { documentInvariants } from '@/lib/docsDocuments'
import { guideDate } from '@/lib/docsGuideValues'
import baseline from './fixtures/mcp-move-baseline.json'
import {
  CATALOGUE,
  PRODUCTION_CATALOGUE,
  capture,
  stubFetch,
} from './fixtures/apiMoveCases'

// The ten translations are in the repository now; this file asserts the page when a
// translation is MISSING, so `resolveDocsDocument` reads an English-only copy.
vi.mock('@/lib/docsDocuments', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/docsDocuments')>()
  const { englishOnlyRoot } = await import('@/tests/helpers/englishOnlyDocs')
  const englishOnly = englishOnlyRoot()
  return {
    ...real,
    resolveDocsDocument: (slug: string, locale: never, root?: string) =>
      real.resolveDocsDocument(slug, locale, root ?? englishOnly),
  }
})

/*
 * MOTIR-8055 — /docs/mcp moves from JSX prose and `lib/mcpWiring.ts` strings to
 * `content/docs/mcp/en.md`.
 *
 * ── The snapshot ────────────────────────────────────────────────────────────
 * `fixtures/mcp-move-baseline.json` is the page as it rendered at the card's
 * base (the parent branch at f858494, before any file of this change existed).
 * It was captured with the same `capture()` this file uses
 * (`fixtures/apiMoveCases.ts`: `render(await resolveAsync(await Page(EN_PAGE)))`,
 * the vitest env's app origin) by a temporary test that was deleted afterwards:
 * for each state, the container's `innerHTML` with every tag replaced by a space
 * and whitespace-normalised, every element `id` in document order, and the text
 * of every <pre>. States: `mcp` over the small two-group catalogue
 * (`CATALOGUE`), `mcp-production` over the recorded production catalogue, and
 * `mcp-unreachable` with the fetch failing — a state no built page has since
 * MOTIR-10645 (the build fails instead, asserted below), kept in the fixture as
 * the record of what it read. Do not regenerate it to make a red
 * test green: the move is meant to be invisible, and a changed word is the
 * finding.
 *
 * ── What is allowed to differ, and nothing else ─────────────────────────────
 *  · the whitespace normalisation `normalise` states;
 *  · a step numeral, which was a monospace span beside the title and is now the
 *    heading's text (`1. Mint a token`, the same id);
 *  · the Anthropic "steps checked" dates, which were ISO strings and are now
 *    formatted for the reader's locale (`guideDate`), as the connector guide's are;
 *  · the format-checked date, likewise.
 */

afterEach(() => vi.unstubAllGlobals())

const fixture = baseline as Record<
  string,
  { text: string; ids: string[]; payloads: string[] }
>

function expectedText(state: string): string {
  let text = fixture[state]!.text
  for (const [from, to] of [
    ['1 Mint a token', '1. Mint a token'],
    ['2 Wire your client', '2. Wire your client'],
    ['3 Check the connection', '3. Check the connection'],
  ] as const) {
    expect(text.split(from).length - 1, from).toBe(1)
    text = text.replace(from, to)
  }
  return text.replace(
    /(steps|format) checked (\d{4}-\d{2}-\d{2})/g,
    (_, word: string, iso: string) => `${word} checked ${guideDate('en', iso)}`,
  )
}

const STATES = {
  mcp: () => stubFetch(CATALOGUE),
  'mcp-production': () => stubFetch(PRODUCTION_CATALOGUE),
} as const

it('/docs/mcp fails the build when the catalogue is unreachable (MOTIR-10645)', async () => {
  stubFetch({}, 503)
  await expect(capture(McpPage)).rejects.toThrow(
    /could not read the MCP tool catalogue at .*: HTTP 503/,
  )
})

describe('/docs/mcp reads the same after the move', () => {
  for (const [state, arrange] of Object.entries(STATES)) {
    describe(state, () => {
      it('has the body text it had before, word for word', async () => {
        arrange()
        expect((await capture(McpPage)).text).toBe(expectedText(state))
      })

      it('still renders every element id it rendered', async () => {
        arrange()
        const { ids } = await capture(McpPage)
        for (const id of fixture[state]!.ids) expect(ids, id).toContain(id)
      })

      it('shows every code block byte for byte', async () => {
        arrange()
        expect((await capture(McpPage)).payloads).toEqual(
          fixture[state]!.payloads,
        )
      })
    })
  }

  it('the snapshot holds the ids the card names', () => {
    for (const id of [
      'claude',
      'claude-ai',
      'claude-desktop',
      'claude-code',
      'consent',
      'token-route',
      'fork',
      'token',
      'wire',
      'check',
      'scopes',
      'what-next',
    ]) {
      expect(fixture.mcp!.ids, id).toContain(id)
    }
  })
})

/** The shape of a tool name; the same detector `docs.test.ts` runs on the page source. */
const toolNameLiterals = (source: string) =>
  source.match(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g) ?? []

describe('the document', () => {
  const markdown = readFileSync('content/docs/mcp/en.md', 'utf8')

  it('has no fenced block and an {#id} on every heading', () => {
    expect(markdown).not.toMatch(/^ {0,3}(```|~~~)/m)
    const headings = markdown.split('\n').filter((l) => /^#{1,6}\s/.test(l))
    expect(documentInvariants(markdown).anchors).toHaveLength(headings.length)
  })

  it('names the slots, values and parts the page supplies, and no more', () => {
    const inv = documentInvariants(markdown)
    expect(inv.slots).toEqual([
      'claude-ai',
      'claude-desktop',
      'claude-code',
      'client-claude-code',
      'client-cursor',
      'client-vscode',
      'client-codex',
      'client-other',
      'verify',
    ])
    expect([...new Set(inv.values)].sort()).toEqual(
      [
        'apiPage',
        'authHeader',
        'authScheme',
        'claudeCodeTokenCommand',
        'clientClaudeCodeDocsUrl',
        'clientCodexDocsUrl',
        'clientCursorDocsUrl',
        'clientOtherDocsUrl',
        'clientVscodeDocsUrl',
        'clientsCheckedOn',
        'cliPage',
        'codexTokenKey',
        'connectedAppsUrl',
        'endpointPath',
        'mcpPage',
        'mcpToolsPage',
        'referenceUrl',
        'routeClaudeAiCheckedOn',
        'routeClaudeAiDocsUrl',
        'routeClaudeCodeCheckedOn',
        'routeClaudeCodeDocsUrl',
        'routeClaudeDesktopCheckedOn',
        'routeClaudeDesktopDocsUrl',
        'skillsPage',
        'tokenEnvVar',
        'tokenPlaceholder',
        'url',
      ].sort(),
    )
    expect(inv.parts).toEqual([
      'what-next',
      'column-scope',
      'column-gates',
      'column-default',
      'granted',
      'off-by-default',
      'unreachable',
    ])
  })

  it('types no URL the wiring interpolates, no origin, no command, no tool name', () => {
    expect(markdown).not.toMatch(/https?:\/\//)
    expect(markdown).not.toContain('claude mcp add')
    expect(markdown).not.toContain('mcpServers')
    expect(markdown).not.toContain('motir_pat_')
    expect(toolNameLiterals(markdown)).toEqual([])
  })
})

describe('lib/mcpWiring.ts exports no English sentence', () => {
  const PROSE_FIELDS = ['steps', 'note', 'axis', 'mcp', 'rest', 'label']

  it('no route, client or row object carries a prose field', () => {
    const facts = wiring.mcpTransportFacts()
    const objects = [
      ...wiring.claudeRoutes(facts),
      ...wiring.mcpClients(facts),
    ] as unknown as Record<string, unknown>[]
    expect(objects.length).toBe(8)
    for (const object of objects) {
      for (const field of PROSE_FIELDS) {
        expect(
          Object.keys(object),
          `${String(object.id)}.${field}`,
        ).not.toContain(field)
      }
      // Code, URLs, paths and dates only: nothing but `file` holds a space-free
      // path, and `config` is built from the facts.
      expect(Object.keys(object).sort()).toEqual(
        'config' in object
          ? ['checkedOn', 'config', 'docsUrl', 'file', 'id']
          : ['checkedOn', 'code', 'docsUrl', 'id'],
      )
    }
  })

  it('the fork and fact tables are not exported as rows any more', () => {
    expect(Object.keys(wiring)).not.toContain('mcpForkRows')
    expect(Object.keys(wiring)).not.toContain('mcpTransportFactRows')
  })

  it('the predicate fires on a prose field', () => {
    expect(
      Object.keys({ id: 'x', note: 'A sentence.' }).filter((key) =>
        PROSE_FIELDS.includes(key),
      ),
    ).toEqual(['note'])
  })
})

describe('no page-module sentence', () => {
  /** JSX text and string literals outside imports, metadata and class names. */
  function strings(text: string): string[] {
    const source = ts.createSourceFile(
      'page.tsx',
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const found: string[] = []
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) return
      if (
        ts.isFunctionDeclaration(node) &&
        node.name?.text === 'generateMetadata'
      )
        return
      if (ts.isJsxAttribute(node) && node.name.getText() === 'className') return
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        found.push(node.text)
      } else if (ts.isJsxText(node)) {
        found.push(node.text.replace(/\s+/g, ' ').trim())
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    return found.filter(Boolean)
  }

  it('holds no English word group in the TSX', () => {
    const file = join('app/[locale]/docs/(guides)', 'mcp', 'McpRoute.tsx')
    const prose = strings(readFileSync(file, 'utf8')).filter(
      (text) => text.split(/\s+/).filter(Boolean).length > 1,
    )
    expect(prose).toEqual([])
  })
})

describe('the page in another language', () => {
  it('/de/docs/mcp: the labels and captions are the catalogue’s, the commands are identical', async () => {
    stubFetch(CATALOGUE)
    const { render } = await import('@/tests/helpers/withCopy')
    const en = render(
      await McpPage({ params: Promise.resolve({ locale: 'en' }) }),
    ).container
    const de = render(
      await McpPage({ params: Promise.resolve({ locale: 'de' }) }),
    ).container
    const payloads = (c: HTMLElement) =>
      [...c.querySelectorAll('pre')].map((pre) => pre.textContent)
    expect(payloads(de)).toEqual(payloads(en))
    expect(de.querySelector('[role="note"]')).not.toBeNull()
  })
})
