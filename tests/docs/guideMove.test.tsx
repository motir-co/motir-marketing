import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { render } from '@/tests/helpers/withCopy'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { describe, expect, it, vi } from 'vitest'
import SentryPage from '@/app/[locale]/docs/(guides)/sentry/SentryRoute'
import SkillsPage from '@/app/[locale]/docs/(guides)/skills/SkillsRoute'
import DifficultyPage from '@/app/[locale]/docs/(guides)/difficulty/DifficultyRoute'
import ConnectorPage from '@/app/[locale]/docs/(guides)/claude-code-connector/ClaudeCodeConnectorRoute'
import PluginPage from '@/app/[locale]/docs/(guides)/claude-code-plugin/ClaudeCodePluginRoute'
import { documentInvariants } from '@/lib/docsDocuments'
import { guideDate } from '@/lib/docsGuideValues'
import { SKILLS_RELEASE_TAG } from '@/lib/skillsGuide'
import { EN_PAGE } from '@/tests/helpers/locale'
import { pageFileOf } from '@/tests/helpers/docsRoutes'
import baseline from './fixtures/guide-move-baseline.json'

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
 * MOTIR-8036 — five guides move from JSX prose to `content/docs/<slug>/en.md`.
 *
 * ── The snapshot ────────────────────────────────────────────────────────────
 * `fixtures/guide-move-baseline.json` is the five pages as they rendered at the
 * card's base (the parent branch at 1e839d6, before any file of this change
 * existed), captured with the same render this file uses (`render(await
 * resolveAsync(await Page(EN_PAGE)))`, the vitest env's app origin): for each
 * page, the container's `innerHTML` with every tag replaced by a space and then
 * normalised as `normalise` below says, every element `id` in document order,
 * and the text of every <pre>. It is a checked-in record of the OLD pages, so
 * this test keeps proving "the English text did not change" after the old JSX is
 * gone. Do not regenerate it to make a red test green: the move is meant to be
 * invisible, and a changed word is the finding.
 *
 * ── The normalisation, which is the whole of what is allowed to differ ──────
 *  1. Every tag becomes a space, then runs of whitespace collapse to one space,
 *     and a space before `. , ; : ) ? !` or after `(` is dropped. The JSX
 *     concatenated some neighbouring blocks with no space and the renderer's
 *     blocks are separated; punctuation spacing is that difference and no other.
 *  2. Nothing else. In particular the two formatting changes the card allows
 *     (a command that was plain text becoming inline code, and a secondary-colour
 *     span becoming body text) leave the TEXT unchanged, so they need no rule.
 *  3. The `motir-skills` release the baseline was captured at (v0.7.0) is read
 *     as the CURRENT release (`withCurrentRelease` below). The tag is resolved at
 *     build now (MOTIR-8802), so a literal in this record would go red on every
 *     release — the fixture stays what it was, and only that one value maps.
 *  4. ONE value differs by design: the connector's two "steps checked" dates were
 *     ISO strings in the old JSX and are now formatted for the reader's locale
 *     (`guideDate`). The baseline's ISO date is mapped through the same function.
 */

const PAGES = {
  sentry: SentryPage,
  skills: SkillsPage,
  difficulty: DifficultyPage,
  'claude-code-connector': ConnectorPage,
  'claude-code-plugin': PluginPage,
} as const
type Slug = keyof typeof PAGES

function normalise(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/ ([.,;:)?!])/g, '$1')
    .replace(/\( /g, '(')
}

async function renderPage(slug: Slug, params: unknown = EN_PAGE) {
  const Page = PAGES[slug] as (props: unknown) => Promise<never>
  return render((await resolveAsync(await Page(params))) as never).container
}

const read = (slug: string) =>
  readFileSync(join('content/docs', slug, 'en.md'), 'utf8')

/** The release the baseline pages were captured at, as a tag and as a version. */
const BASELINE_RELEASE = 'v0.7.0'

function withCurrentRelease(text: string): string {
  return text
    .replaceAll(BASELINE_RELEASE, SKILLS_RELEASE_TAG)
    .replaceAll(BASELINE_RELEASE.slice(1), SKILLS_RELEASE_TAG.slice(1))
}

const fixture = baseline as Record<
  string,
  { text: string; ids: string[]; payloads: string[] }
>

describe('the five guides read the same after the move', () => {
  for (const slug of Object.keys(PAGES) as Slug[]) {
    describe(slug, () => {
      it('has the body text it had before, word for word', async () => {
        const container = await renderPage(slug)
        const expected = withCurrentRelease(fixture[slug]!.text).replace(
          /steps checked (\d{4}-\d{2}-\d{2})/g,
          (_, iso: string) => `steps checked ${guideDate('en', iso)}`,
        )
        expect(normalise(container.innerHTML)).toBe(expected)
      })

      it('still renders every element id it rendered', async () => {
        const container = await renderPage(slug)
        const ids = [...container.querySelectorAll('[id]')].map((e) =>
          e.getAttribute('id'),
        )
        for (const id of fixture[slug]!.ids) expect(ids, id).toContain(id)
      })

      it('shows every code block byte for byte', async () => {
        const container = await renderPage(slug)
        const payloads = [...container.querySelectorAll('pre')].map(
          (pre) => pre.textContent,
        )
        expect(payloads).toEqual(
          fixture[slug]!.payloads.map(withCurrentRelease),
        )
      })

      it('has a document with no fenced block and an {#id} on every heading', () => {
        const markdown = read(slug)
        expect(markdown).not.toMatch(/^ {0,3}(```|~~~)/m)
        const headings = markdown.split('\n').filter((l) => /^#{1,6}\s/.test(l))
        expect(documentInvariants(markdown).anchors).toHaveLength(
          headings.length,
        )
      })
    })
  }

  it('the sentry scopes are a GFM table with each scope as inline code', () => {
    const markdown = read('sentry')
    for (const scope of [
      'org:read',
      'project:read',
      'event:read',
      'event:write',
    ]) {
      expect(markdown).toContain(`| \`${scope}\``)
    }
  })

  it('names the slots and values each document needs, and no more', () => {
    const wanted: Record<Slug, { slots: string[]; values: string[] }> = {
      sentry: { slots: [], values: [] },
      difficulty: {
        slots: ['trivial', 'low', 'medium', 'high'],
        values: [
          'asOf',
          'costRangeHigh',
          'costRangeLow',
          'costRangeMedium',
          'costRangeTrivial',
        ],
      },
      skills: {
        slots: [
          'claude-code-plugin',
          'claude-code-copy',
          'codex',
          'cursor',
          'gemini-cli',
          'copilot-vs-code',
          'opencode',
          'update',
        ],
        values: [
          'checkedOn',
          'claudeCodeDocsUrl',
          'codexDocsUrl',
          'copilotDocsUrl',
          'cursorDocsUrl',
          'geminiCliDocsUrl',
          'mcpPage',
          'opencodeDocsUrl',
          'releaseSkills',
          'releaseTag',
          'releaseUrl',
          'releaseVersion',
          'repoUrl',
          'skillsRepo',
        ],
      },
      'claude-code-connector': {
        slots: ['claude-ai', 'claude-code'],
        values: [
          'claudeAiCheckedOn',
          'claudeAiDocsUrl',
          'claudeCodeCheckedOn',
          'claudeCodeDocsUrl',
          'connectedAppsUrl',
          'mcpPage',
          'mcpToolsPage',
          'pluginPage',
        ],
      },
      'claude-code-plugin': {
        slots: ['install', 'update'],
        values: [
          'connectorPage',
          'releaseTag',
          'releaseUrl',
          'releaseVersion',
          'repoUrl',
          'skillsPage',
          'skillsRepo',
        ],
      },
    }
    for (const slug of Object.keys(wanted) as Slug[]) {
      const inv = documentInvariants(read(slug))
      expect(inv.slots, slug).toEqual(wanted[slug].slots)
      expect([...new Set(inv.values)].sort(), slug).toEqual(wanted[slug].values)
    }
  })

  it('no document restates a command, a URL the data carries, a tag or a date', () => {
    for (const slug of Object.keys(PAGES)) {
      const markdown = read(slug)
      expect(markdown, slug).not.toMatch(/v\d+\.\d+\.\d+/)
      expect(markdown, slug).not.toMatch(
        /\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) 2026(?!\))/,
      )
      expect(markdown, slug).not.toContain('git clone')
      expect(markdown, slug).not.toContain('claude mcp add')
      expect(markdown, slug).not.toContain('github.com/motir-co')
    }
  })
})

describe('a date is a value, formatted for the reader’s language', () => {
  it('/de/docs/skills reads the check date the German way', async () => {
    const container = await renderPage('skills', {
      params: Promise.resolve({ locale: 'de' }),
    })
    const text = container.textContent ?? ''
    expect(text).toContain('checked 6. Oktober 2026')
    expect(text).not.toContain('6 October 2026')
  })

  it('/docs/skills reads it the way it always has in English', async () => {
    expect((await renderPage('skills')).textContent).toContain(
      'checked 6 October 2026',
    )
  })

  it('the difficulty page’s date follows the locale too', async () => {
    const container = await renderPage('difficulty', {
      params: Promise.resolve({ locale: 'fr' }),
    })
    expect(container.textContent).toContain('were read on 23 septembre 2026')
  })
})

describe('a translated page keeps its panes', () => {
  it('/ja/docs/skills: the English body under the note, Japanese labels, identical commands', async () => {
    const ja = await renderPage('skills', {
      params: Promise.resolve({ locale: 'ja' }),
    })
    const en = await renderPage('skills')
    expect(ja.querySelector('[role="note"]')).not.toBeNull()
    expect(ja.querySelector('[lang="en"]')).not.toBeNull()
    expect(ja.querySelector('h1')?.textContent).not.toBe(
      en.querySelector('h1')?.textContent,
    )
    expect([...ja.querySelectorAll('pre')].map((p) => p.textContent)).toEqual(
      [...en.querySelectorAll('pre')].map((p) => p.textContent),
    )
    const captions = (c: HTMLElement) =>
      [...c.querySelectorAll('pre')].map(
        (pre) => pre.parentElement?.firstElementChild?.textContent,
      )
    for (const [index, caption] of captions(ja).entries()) {
      expect(caption, `pane ${index}`).not.toBe(captions(en)[index])
      expect(caption).toMatch(/[぀-ヿ一-鿿]/)
    }
    const buttons = (c: HTMLElement) =>
      [...c.querySelectorAll('button')].map((b) => b.getAttribute('aria-label'))
    expect(buttons(ja)).toHaveLength(buttons(en).length)
    for (const label of buttons(ja)) expect(label).toMatch(/[぀-ヿ一-鿿]/)
  })
})

describe('the difficulty tables hold numbers, symbols and model names only', () => {
  it('no cell but the model and the cost basis carries a letter', async () => {
    const container = await renderPage('difficulty')
    const rows = [...container.querySelectorAll('tbody tr')]
    expect(rows).toHaveLength(10)
    for (const row of rows) {
      const cells = [...row.querySelectorAll('td')].map((td) => td.textContent!)
      expect(cells).toHaveLength(5)
      for (const cell of cells.slice(1, 4)) expect(cell).not.toMatch(/[A-Za-z]/)
      expect(cells[4]).toMatch(
        /^(—|\$\d+\.\d{2}|≈ \$\d+\.\d{2} \([A-Za-z0-9 .]+, (by price|same price)\))$/,
      )
    }
  })

  it('each level’s range is only the range', async () => {
    const headings = [
      ...(await renderPage('difficulty')).querySelectorAll('h3'),
    ].map((h) => h.textContent)
    expect(headings).toEqual([
      'trivial · about $0.05–0.15 per task',
      'low · about $0.85–1.45 per task',
      'medium · about $2.80–3.50 per task',
      'high · about $4.40 and up per task',
    ])
  })

  it('names the column headers from the catalogue and the benchmarks as written', async () => {
    const heads = [
      ...(await renderPage('difficulty'))
        .querySelectorAll('thead')[0]!
        .querySelectorAll('th'),
    ].map((th) => th.textContent)
    expect(heads).toEqual([
      'Model',
      'Price per 1M tokens',
      'SWE-bench Pro',
      'SWE-rebench',
      'Cost per task',
    ])
  })
})

/*
 * ── No English sentence lives in a page.tsx ─────────────────────────────────
 * Parsed, not grepped: JSX text nodes and string literals outside the imports,
 * `generateMetadata` and `className` values. A class name, a key path or a slot
 * or value name is a single token with no spaces; a sentence is not. Anything
 * of more than three words is prose, and prose belongs in a document or the
 * catalogue.
 */
describe('no page module holds an English sentence', () => {
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

  for (const slug of Object.keys(PAGES)) {
    it(`${slug}'s page module`, () => {
      const file = pageFileOf(`/docs/${slug}`)
      const prose = strings(readFileSync(file, 'utf8')).filter(
        (text) => text.split(/\s+/).filter(Boolean).length > 3,
      )
      expect(prose).toEqual([])
    })
  }

  it('the scanner sees a sentence when there is one', () => {
    // Guards the guard: a scanner that finds nothing anywhere proves nothing.
    const found = strings(
      "import x from 'a b c d e'\nexport default () => <p className=\"a b c d e\">Plain words in a row {'and another long string'}</p>",
    )
    expect(found).toEqual(['Plain words in a row', 'and another long string'])
  })
})
