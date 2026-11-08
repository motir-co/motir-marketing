import { readFileSync } from 'node:fs'
import { render } from '@/tests/helpers/withCopy'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { afterEach, describe, expect, it, vi } from 'vitest'
import McpToolsPage from '@/app/[locale]/docs/(guides)/mcp/tools/McpToolsRoute'
import SkillsDocsPage from '@/app/[locale]/docs/(guides)/skills/SkillsRoute'
import { englishCopy as copy } from '@/lib/copy'
import { fetchMcpToolCatalogue, toolHint, type McpToolHint } from '@/lib/docs'
import { AGENT_INSTALLS, SKILLS_RELEASE_TAG } from '@/lib/skillsGuide'
import { EN_PAGE } from '@/tests/helpers/locale'

/*
 * THE STORY INTEGRATION GATE (MOTIR-7083) — MOTIR-6976's motir-marketing
 * surface, driven through the SEAM it shares with motir-core.
 *
 * Each card's own units mock the catalogue with a handful of invented or
 * hand-picked rows. What they cannot catch is the drift between motir-core's
 * REAL published shape and this repository's parser and renderer. So this file
 * drives a RECORDED production response — `fixtures/mcp-tools.production.json`,
 * stamped with the date and the release `/api/health/release` reported — through
 * the whole read → map → render path, and the same rows with `title` and
 * `annotations` stripped, which is what an older or self-hosted Motir serves.
 *
 * ⚠️ RE-RECORD IT when the catalogue gains a field this page should render:
 * the fixture is a measurement with a timestamp, not a contract. The guards
 * below are written against the HINTS IN THE DATA, never against a list of
 * tool names, so a re-recording changes no assertion.
 */

interface RecordedCatalogue {
  source: string
  recordedAt: string
  release: string
  catalogue: {
    endpoint: string
    toolCount: number
    groups: {
      tools: {
        name: string
        title?: string
        annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean }
      }[]
    }[]
  }
}

const recorded = JSON.parse(
  readFileSync('tests/docs/fixtures/mcp-tools.production.json', 'utf8'),
) as RecordedCatalogue

/** The recorded rows with `title` and `annotations` removed — an older Motir. */
function stripped(): RecordedCatalogue['catalogue'] {
  const copyOf = structuredClone(recorded.catalogue)
  for (const group of copyOf.groups) {
    for (const tool of group.tools) {
      delete tool.title
      delete tool.annotations
    }
  }
  return copyOf
}

function stubCatalogueFetch(document: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(document), { status: 200 })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const CHIP_LABEL: Record<Exclude<McpToolHint, 'unpublished'>, string> = {
  reads: copy.docs.mcpHintReads,
  writes: copy.docs.mcpHintWrites,
  destructive: copy.docs.mcpHintDestructive,
}

/** Every rendered tool row, keyed by the tool name its anchor carries. */
function renderedRows(container: HTMLElement): Map<string, HTMLElement> {
  const rows = new Map<string, HTMLElement>()
  for (const anchor of container.querySelectorAll('[id^="tool-"]')) {
    rows.set(anchor.id.slice('tool-'.length), anchor.closest('li')!)
  }
  return rows
}

const recordedTools = recorded.catalogue.groups.flatMap((group) => group.tools)

describe('the recorded production catalogue', () => {
  it('is stamped with where and when it was recorded', () => {
    expect(recorded.source).toBe('https://app.motir.co/api/docs/mcp-tools.json')
    expect(recorded.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(recorded.release).toMatch(/^[0-9a-f]{40}$/)
    // A recording with nothing to measure would pass every guard below.
    expect(recordedTools.length).toBe(recorded.catalogue.toolCount)
    expect(recordedTools.every((tool) => tool.annotations)).toBe(true)
  })
})

describe('the seam: fetch → toolHint → the rendered page', () => {
  it('parses every recorded row, and maps each to the hint its data says', async () => {
    stubCatalogueFetch(recorded.catalogue)
    const parsed = await fetchMcpToolCatalogue()
    const tools = parsed.groups.flatMap((group) => group.tools)
    expect(tools.length).toBe(recorded.catalogue.toolCount)
    for (const [index, tool] of tools.entries()) {
      const source = recordedTools[index]!
      expect(tool.name).toBe(source.name)
      expect(tool.title, tool.name).toBe(source.title)
      const expected: McpToolHint =
        source.annotations!.readOnlyHint === true
          ? 'reads'
          : source.annotations!.destructiveHint === true
            ? 'destructive'
            : 'writes'
      expect(toolHint(tool), tool.name).toBe(expected)
    }
  })

  it('renders one row per tool, each with its title and the chip its hints give', async () => {
    stubCatalogueFetch(recorded.catalogue)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    const rows = renderedRows(container)
    expect(rows.size).toBe(recorded.catalogue.toolCount)

    const parsed = await fetchMcpToolCatalogue()
    for (const tool of parsed.groups.flatMap((group) => group.tools)) {
      const row = rows.get(tool.name)!
      expect(row, tool.name).toBeDefined()
      expect(row.textContent, tool.name).toContain(tool.title!)
      const hint = toolHint(tool) as Exclude<McpToolHint, 'unpublished'>
      expect(row.querySelector('[data-hint]')?.textContent, tool.name).toBe(
        CHIP_LABEL[hint],
      )
      expect(row.textContent).not.toContain(copy.docs.mcpHintsUnpublished)
    }
  })

  it('an OLDER Motir — no titles, no annotations — renders the absent-hints line and no chip', async () => {
    const older = stripped()
    stubCatalogueFetch(older)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    const rows = renderedRows(container)
    expect(rows.size).toBe(older.toolCount)
    for (const [name, row] of rows) {
      expect(row.querySelector('[data-hint]'), name).toBeNull()
      expect(row.textContent, name).toContain(copy.docs.mcpHintsUnpublished)
    }
    // The page-top line still explains the chips; only the rows lose them.
    expect(container.textContent).toContain(copy.docs.mcpHintLedeIntro)
  })
})

describe('GUARD: a write is never shown as a read', () => {
  it('no recorded row whose readOnlyHint is not true renders the Reads chip', async () => {
    stubCatalogueFetch(recorded.catalogue)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    const rows = renderedRows(container)
    const writes = recordedTools.filter(
      (tool) => tool.annotations?.readOnlyHint !== true,
    )
    // The recording must actually contain writes, or this guard measures nothing.
    expect(writes.length).toBeGreaterThan(0)
    const shownAsReads = writes
      .filter(
        (tool) =>
          rows.get(tool.name)?.querySelector('[data-hint]')?.textContent ===
          copy.docs.mcpHintReads,
      )
      .map((tool) => tool.name)
    expect(shownAsReads).toEqual([])
  })

  it('and none of the stripped rows renders Reads either', async () => {
    stubCatalogueFetch(stripped())
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    const readsChips = [...container.querySelectorAll('li [data-hint="reads"]')]
    expect(readsChips).toEqual([])
  })
})

describe('GUARD: every install command names the current release', () => {
  it('every rendered marketplace and skill-folder command names SKILLS_RELEASE_TAG', async () => {
    const { container } = render(
      (await resolveAsync(await SkillsDocsPage(EN_PAGE))) as never,
    )
    const commands = [...container.querySelectorAll('pre')]
      .map((pre) => pre.textContent ?? '')
      .flatMap((pane) => pane.split('\n'))
      .filter(
        (line) =>
          line.includes('/plugin marketplace add') ||
          line.includes('git clone'),
      )
    // One plugin line plus one clone per copy-install block.
    const cloneBlocks = AGENT_INSTALLS.flatMap((agent) => agent.blocks).filter(
      (block) => block.code.includes('git clone'),
    ).length
    expect(commands.length).toBeGreaterThanOrEqual(cloneBlocks + 1)
    for (const line of commands) expect(line).toContain(SKILLS_RELEASE_TAG)
  })

  it('the E2E lane builds with the floor the spec expects', () => {
    const spec = readFileSync('e2e/specs/docs-skills.spec.ts', 'utf8')
    const config = readFileSync('playwright.config.ts', 'utf8')
    expect(spec).toContain('const RELEASE_TAG = SKILLS_RELEASE_PIN')
    expect(config).toContain('SKILLS_RELEASE_TAG: SKILLS_RELEASE_PIN')
  })
})
