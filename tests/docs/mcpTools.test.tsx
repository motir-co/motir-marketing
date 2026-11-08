import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@/tests/helpers/withCopy'
import { EN_PAGE } from '@/tests/helpers/locale'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { afterEach, describe, expect, it, vi } from 'vitest'
import McpToolsPage from '@/app/[locale]/docs/(guides)/mcp/tools/McpToolsRoute'
import {
  McpToolCatalogueShapeError,
  parseMcpToolCatalogue,
  toolHint,
} from '@/lib/docs'
import { englishCopy as copy } from '@/lib/copy'

/*
 * THE FETCH-VERSUS-RENDER GUARD, SECOND INSTANCE (MOTIR-4394) — the same shape
 * `tests/docs/apiReference.test.tsx` holds over `/docs/api`, over the tool
 * catalogue.
 *
 * The page rendered 55 tool names, a permission and a summary, and could not do
 * better: the published artifact carried no `inputSchema`. MOTIR-4389 widened
 * it; this asserts the widening REACHES THE READER, using argument names that
 * appear nowhere else in this repository so a match on the page can only have
 * come off the wire.
 *
 * ⚠️ AND IT ASSERTS THE THREE-WAY DISTINCTION, which is the part a reasonable
 * implementation gets wrong. `undefined`, `{ properties: {} }` and a populated
 * schema are THREE different facts:
 *
 *   · undefined            → the SERVER does not publish arguments (an older
 *                            motir-core, or the window before its deploy lands)
 *   · properties: {}       → the TOOL takes none
 *   · properties: { … }    → render them
 *
 * Collapsing the first two into one empty block is this bug one level up: an
 * empty rendering that reads as an answer. The tests below pin all three.
 */

const FIXTURE_ONLY = {
  requiredArg: 'zqCarillonKey',
  optionalArg: 'zqFathomDrift',
  enumMember: 'zqQuince',
} as const

const FIXTURE_TOKENS = Object.values(FIXTURE_ONLY)

/** The document motir-core serves, in the shape MOTIR-4389 publishes. */
const catalogue = {
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
          name: 'zqWithArguments',
          permission: 'thing:browse',
          summary: 'A tool that takes arguments.',
          inputSchema: {
            type: 'object',
            required: [FIXTURE_ONLY.requiredArg],
            properties: {
              [FIXTURE_ONLY.requiredArg]: {
                type: 'string',
                enum: [FIXTURE_ONLY.enumMember, 'other'],
                description: 'Required, and a closed enum.',
              },
              [FIXTURE_ONLY.optionalArg]: {
                anyOf: [{ type: 'number' }, { type: 'null' }],
                description: 'Optional and nullable.',
              },
            },
          },
        },
        {
          name: 'zqWithNoArguments',
          permission: 'thing:browse',
          summary: 'A tool that takes none.',
          inputSchema: { type: 'object', properties: {} },
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
          name: 'zqFromAnOlderServer',
          permission: 'thing:edit',
          summary: 'A tool from a server that publishes no schemas.',
        },
      ],
    },
  ],
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

/** THE PREDICATE, so the counterfactual drives the code the guard runs. */
function missingFromRender(html: string, tokens: readonly string[]): string[] {
  return tokens.filter((token) => !html.includes(token))
}

describe('the tool catalogue RENDERS the arguments it fetches', () => {
  it('puts every fixture-only argument name on the page — the guard', async () => {
    stubCatalogueFetch(catalogue)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    expect(
      missingFromRender(container.innerHTML, FIXTURE_TOKENS),
      'the page fetched the catalogue and did not render its arguments',
    ).toEqual([])
  })

  it('the predicate FIRES on the shape the page rendered BEFORE this card', () => {
    const namesOnly =
      '<li><code>zqWithArguments</code><p>A tool that takes arguments.</p></li>'
    expect(missingFromRender(namesOnly, FIXTURE_TOKENS)).toEqual(FIXTURE_TOKENS)
  })

  it('marks required-ness and shows enum members', async () => {
    stubCatalogueFetch(catalogue)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    const html = container.innerHTML
    const requiredRow = html.slice(html.indexOf(FIXTURE_ONLY.requiredArg))
    expect(requiredRow.slice(0, 400)).toContain('required')
    expect(html).toContain(FIXTURE_ONLY.enumMember)
    const optionalRow = html.slice(html.indexOf(FIXTURE_ONLY.optionalArg))
    expect(optionalRow.slice(0, 400)).toContain('optional')
    // The nullable arm survives — a flattened `type` field would have lost it.
    expect(html).toContain('number | null')
  })
})

describe('the THREE-WAY distinction — absent, empty, populated', () => {
  it('a tool that takes NONE says so, rather than rendering an empty block', async () => {
    stubCatalogueFetch(catalogue)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    const row = container.innerHTML.slice(
      container.innerHTML.indexOf('zqWithNoArguments'),
    )
    expect(row.slice(0, 500)).toContain('Takes no arguments')
  })

  it('a tool whose SERVER publishes no schemas says THAT, which is a different fact', async () => {
    stubCatalogueFetch(catalogue)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    const row = container.innerHTML.slice(
      container.innerHTML.indexOf('zqFromAnOlderServer'),
    )
    expect(row.slice(0, 600)).toContain('does not publish')
    // …and it must NOT say the tool takes none, which is the collapse.
    expect(row.slice(0, 600)).not.toContain('Takes no arguments')
  })

  it('the whole page renders against a catalogue with NO schemas at all', async () => {
    // ⚠️ THE MERGE-ORDER ARM. Between this page shipping and motir-core's deploy
    // landing, every row looks like `zqFromAnOlderServer`. A page that required
    // `inputSchema` would be red for that whole window, on an order nobody
    // controls. This is the boundary-contract rule as a test.
    const older = {
      ...catalogue,
      groups: catalogue.groups.map((group) => ({
        ...group,
        tools: group.tools.map(({ name, permission, summary }) => ({
          name,
          permission,
          summary,
        })),
      })),
    }
    stubCatalogueFetch(older)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    expect(container.innerHTML).toContain('zqWithArguments')
    expect(container.innerHTML).toContain('does not publish')
  })
})

describe('the parse tolerates the field, and never invents it', () => {
  it('reads `inputSchema` when the artifact carries one', () => {
    const parsed = parseMcpToolCatalogue(catalogue)
    expect(parsed.groups[0]!.tools[0]!.inputSchema?.required).toEqual([
      FIXTURE_ONLY.requiredArg,
    ])
  })

  it('leaves it undefined when the artifact does not — not `{}`', () => {
    const parsed = parseMcpToolCatalogue(catalogue)
    expect(parsed.groups[1]!.tools[0]!.inputSchema).toBeUndefined()
  })

  it('treats a non-object `inputSchema` as absent rather than reddening the page', () => {
    // The field is outside the shape contract the parse throws on, so a
    // producer that ships something unreadable there must not take the page
    // down — it must lose that one row's arguments.
    const odd = JSON.parse(JSON.stringify(catalogue)) as typeof catalogue
    ;(odd.groups[0]!.tools[0] as Record<string, unknown>).inputSchema = 'nope'
    expect(() => parseMcpToolCatalogue(odd)).not.toThrow()
    expect(
      parseMcpToolCatalogue(odd).groups[0]!.tools[0]!.inputSchema,
    ).toBeUndefined()
  })

  it('still throws on the fields that ARE the shape contract', () => {
    const broken = JSON.parse(JSON.stringify(catalogue)) as Record<
      string,
      unknown
    >
    delete broken.groups
    expect(() => parseMcpToolCatalogue(broken)).toThrow()
  })
})

describe('the tokens really are unique to this file', () => {
  function sourceFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) sourceFiles(path, out)
      else if (/\.(tsx?|json|css|md)$/.test(path)) out.push(path)
    }
    return out
  }

  it('no argument name appears in app/, lib/ or messages/', () => {
    const files = [
      ...sourceFiles('app'),
      ...sourceFiles('lib'),
      ...sourceFiles('messages'),
    ]
    const offenders: string[] = []
    for (const file of files) {
      const contents = readFileSync(file, 'utf8')
      for (const token of FIXTURE_TOKENS) {
        if (contents.includes(token)) offenders.push(`${file}: ${token}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

/*
 * EACH ROW'S TITLE AND BEHAVIOUR HINT (MOTIR-7080), built to the design delta
 * `design/docs/docs--mcp-tool-hints.mock.html` (MOTIR-7077).
 *
 * The three hinted rows are RECORDED from production — `GET
 * https://app.motir.co/api/docs/mcp-tools.json`, read 2026-10-01, `inputSchema`
 * dropped — so the parse is driven with the shape motir-core actually serves.
 * The two absence rows are those recordings with a field removed, which is
 * exactly what an older or self-hosted Motir serves.
 */
const recorded = {
  reads: {
    name: 'dispatch_prompt',
    permission: 'project:browse',
    summary:
      'The server-generated coding-agent prompt for one item — the same text the CLI hands an agent.',
    title: 'Dispatch prompt',
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  writes: {
    name: 'add_lesson',
    permission: 'lesson:manage',
    summary:
      'Record a lesson for this project, so later plans for it are given the lesson. This project only.',
    title: 'Add lesson',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  destructive: {
    name: 'delete_work_item',
    permission: 'work_item:delete',
    summary:
      'Permanently delete an item and its whole subtree. Irreversible, and off by default.',
    title: 'Delete work item',
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
}

/** A recorded row with one field removed — what a server that omits it serves. */
function without<T extends object, K extends keyof T>(
  row: T,
  key: K,
): Omit<T, K> {
  const trimmed = { ...row }
  delete trimmed[key]
  return trimmed
}
const unhinted = without(recorded.writes, 'annotations')
const untitled = without(recorded.destructive, 'title')

const hintedCatalogue = {
  endpoint: '/api/mcp',
  toolCount: 5,
  groups: [
    {
      permission: 'project:browse',
      label: 'View project',
      gates:
        'Open the project and read its work items, boards, backlog and reports.',
      grantedByDefault: true,
      tools: [recorded.reads, recorded.writes, recorded.destructive],
    },
    {
      permission: 'thing:older',
      label: 'From an older Motir',
      gates: 'Rows a hint-less or title-less server serves.',
      grantedByDefault: false,
      tools: [
        { ...unhinted, name: 'zqUnhintedRow' },
        { ...untitled, name: 'zqUntitledRow' },
      ],
    },
  ],
}

/** The rendered row for a tool, found by its anchor. */
function rowOf(container: HTMLElement, name: string): HTMLElement {
  const anchor = container.querySelector(`[id="tool-${name}"]`)
  if (!anchor) throw new Error(`no row for ${name}`)
  return anchor.closest('li') as HTMLElement
}

describe("toolHint — the design delta's mapping", () => {
  it('maps each annotation shape to its state', () => {
    expect(toolHint({ annotations: { readOnlyHint: true } })).toBe('reads')
    expect(
      toolHint({
        annotations: { readOnlyHint: false, destructiveHint: false },
      }),
    ).toBe('writes')
    expect(
      toolHint({ annotations: { readOnlyHint: false, destructiveHint: true } }),
    ).toBe('destructive')
    expect(toolHint({})).toBe('unpublished')
  })

  it('a write that does not set destructiveHint is Writes, never Destructive', () => {
    expect(toolHint({ annotations: { readOnlyHint: false } })).toBe('writes')
    expect(toolHint({ annotations: {} })).toBe('writes')
  })

  it('a read ignores destructiveHint — MCP gives it no meaning there', () => {
    expect(
      toolHint({ annotations: { readOnlyHint: true, destructiveHint: true } }),
    ).toBe('reads')
  })

  it('ABSENT annotations are never read as Reads', () => {
    expect(toolHint({ annotations: undefined })).not.toBe('reads')
  })
})

describe('the parse reads title and annotations, and refuses a wrong type', () => {
  it('reads both when the row carries them', () => {
    const parsed = parseMcpToolCatalogue(hintedCatalogue)
    const [reads, writes] = parsed.groups[0]!.tools
    expect(reads!.title).toBe('Dispatch prompt')
    expect(reads!.annotations).toEqual({
      readOnlyHint: true,
      openWorldHint: false,
    })
    expect(writes!.annotations?.idempotentHint).toBe(true)
  })

  it('leaves both undefined when the row does not carry them — not `{}`', () => {
    const [unhintedRow, untitledRow] =
      parseMcpToolCatalogue(hintedCatalogue).groups[1]!.tools
    expect('annotations' in unhintedRow!).toBe(false)
    expect('title' in untitledRow!).toBe(false)
  })

  it.each([
    ['a non-object annotations', { annotations: 'readOnly' }],
    ['an array annotations', { annotations: [true] }],
    ['a non-boolean readOnlyHint', { annotations: { readOnlyHint: 'yes' } }],
    ['a non-boolean destructiveHint', { annotations: { destructiveHint: 1 } }],
    ['a non-string title', { title: 7 }],
  ])('raises the shape error for %s', (_label, patch) => {
    const broken = structuredClone(hintedCatalogue)
    Object.assign(broken.groups[0]!.tools[0]!, patch)
    expect(() => parseMcpToolCatalogue(broken)).toThrow(
      McpToolCatalogueShapeError,
    )
  })
})

describe("/docs/mcp/tools renders each row's title and hint", () => {
  it('a row in each of the five states', async () => {
    stubCatalogueFetch(hintedCatalogue)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    const chipOf = (row: HTMLElement) =>
      row.querySelector('[data-hint]')?.textContent ?? null

    const reads = rowOf(container, 'dispatch_prompt')
    expect(reads.textContent).toContain('Dispatch prompt')
    expect(chipOf(reads)).toBe(copy.docs.mcpHintReads)

    const writes = rowOf(container, 'add_lesson')
    expect(writes.textContent).toContain('Add lesson')
    expect(chipOf(writes)).toBe(copy.docs.mcpHintWrites)

    const destructive = rowOf(container, 'delete_work_item')
    expect(destructive.textContent).toContain('Delete work item')
    expect(chipOf(destructive)).toBe(copy.docs.mcpHintDestructive)

    // Annotations absent: NO chip, and the absent-hints line instead.
    const unhinted = rowOf(container, 'zqUnhintedRow')
    expect(unhinted.textContent).toContain('Add lesson')
    expect(chipOf(unhinted)).toBeNull()
    expect(unhinted.textContent).toContain(copy.docs.mcpHintsUnpublished)

    // Title absent: the name alone, and the chip still renders.
    const untitled = rowOf(container, 'zqUntitledRow')
    expect(untitled.textContent).not.toContain('Delete work item')
    expect(chipOf(untitled)).toBe(copy.docs.mcpHintDestructive)

    // Only the unhinted row carries the absent-hints line.
    for (const row of [reads, writes, destructive, untitled]) {
      expect(row.textContent).not.toContain(copy.docs.mcpHintsUnpublished)
    }
  })

  it("carries the chips in the design's tints", async () => {
    stubCatalogueFetch(hintedCatalogue)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    const tint = (name: string) =>
      rowOf(container, name).querySelector('[data-hint]')!.className
    expect(tint('dispatch_prompt')).toContain('bg-(--el-tint-sky)')
    expect(tint('add_lesson')).toContain('bg-(--el-tint-peach)')
    expect(tint('delete_work_item')).toContain('bg-(--el-tint-rose)')
  })

  it('says what the hints mean at the top of the page', async () => {
    stubCatalogueFetch(hintedCatalogue)
    const { container } = render(
      (await resolveAsync(await McpToolsPage(EN_PAGE))) as never,
    )
    const text = container.textContent ?? ''
    expect(text).toContain(copy.docs.mcpHintLedeIntro)
    expect(text).toContain(copy.docs.mcpHintDestructiveMeans)
    expect(text).toContain(copy.docs.mcpHintLedeClaude)
  })
})
