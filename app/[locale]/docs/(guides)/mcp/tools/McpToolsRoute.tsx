import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import type { ReactNode } from 'react'
import {
  catalogueTextLocale,
  countCatalogueTools,
  describeSchema,
  fetchMcpToolCatalogue,
  toolHint,
  type McpToolEntry,
  type McpToolHint,
} from '@/lib/docs'
import {
  formatIcu,
  getCopy,
  useCopy,
  usePageLocale,
  type Copy,
} from '@/lib/copy'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { DocsDocument } from '../../../_components/DocsDocument'
import { SchemaTable } from '../../../_components/DocSchema'

/*
 * The MCP tool catalogue (MOTIR-4046 · MOTIR-4180 · MOTIR-4195, WIDENED by
 * MOTIR-4394) — RENDERED from motir-core's PUBLISHED catalogue document,
 * exactly as `/docs/api` renders the published OpenAPI spec. Fetched fresh at
 * request time; NOTHING about the tool surface is written down here.
 *
 * This page names no group and no tool of its own, and that property is
 * unchanged by this card: the names arrive over the wire and live in this file
 * for the length of one render. `tests/docs/docs.test.ts` still asserts this
 * source names no tool, and still passes for the reason it always did — there
 * is no list to find. The argument NAMES are in the same position.
 *
 * ── What MOTIR-4394 added, and why it needed a card in the OTHER repo first ─
 * The page rendered 55 tool names with a permission and a one-line summary, and
 * it could not do better: the published artifact carried `name`, `permission`
 * and `summary` per tool and no `inputSchema`. So a reader was told a tool
 * exists and which grant gates it, and given no way to learn which arguments it
 * takes, which of them are required, or which are closed enums — the only
 * question they arrived with. MOTIR-4389 widened the artifact; this renders it.
 *
 * ⚠️ AND THAT PARAGRAPH NAMES NO TOOL, deliberately. `tests/docs/docs.test.ts`
 * detects a lowercase underscore-joined identifier anywhere in this file,
 * INCLUDING a comment, and that guard is right: this repository cannot check a
 * tool name it types, so it may not type one — not in a list, and not in an
 * example that later reads as one. (It caught this very comment twice while it
 * was being written, which is the guard earning its place.) The concrete
 * subject lives in the test fixture, where it is checked.
 *
 * ⚠️ AND IT IS WRITTEN SO EITHER MERGE ORDER IS SAFE. The two repositories
 * deploy independently, so between this page shipping and motir-core's deploy
 * landing the artifact carries no schemas at all. A page that required them
 * would go red on the ORDER of two merges, which nobody controls. It renders
 * the absence instead, and says which absence it is:
 *
 *   · no `inputSchema` on the row  ⇒ "arguments are not published by this
 *     Motir version" — a fact about the SERVER, not about the tool.
 *   · `inputSchema` with no properties ⇒ "takes no arguments" — a fact about
 *     the tool, and one a reader positively wants.
 *
 * Collapsing those two into one empty block is the failure this card exists to
 * fix, one level up: an empty rendering that reads as an answer.
 *
 * ── Each row's TITLE and behaviour HINT (MOTIR-7080) ────────────────────────
 * Built to the design delta `design/docs/docs--mcp-tool-hints.mock.html`
 * (MOTIR-7077): the title beside the name, one chip per row in the docs chip
 * recipe (Reads = the GET tint, Writes = the PATCH tint, Destructive = the
 * DELETE tint), and the page-top line saying what the chips mean. The same
 * absence rule as the arguments: no `annotations` on a row ⇒ "this Motir
 * version does not publish this tool's behaviour hints", and NO chip — a blank
 * would read as "nothing to warn about", which is the one wrong answer that
 * could make a write look safe. `toolHint` in `lib/docs.ts` is the mapping.
 *
 * ⚠️ NO FALLBACK, DELIBERATELY. Unreachable or unreadable ⇒ this page SAYS SO.
 * A committed default is stale exactly when it is displayed.
 */
export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/mcp/tools', (copy) => ({
    title: copy.docs.metaTitleMcpTools,
    description: copy.docs.metaDescriptionMcpTools,
  }))
}

/** The inline code tag a catalogue sentence wraps a literal in. */
const codeTag = (chunks: ReactNode) => (
  <code className="font-(family-name:--font-mono)">{chunks}</code>
)

/** How deep the argument tables render — stated, as the producer states what it emits. */
function ToolArguments({ tool }: { tool: McpToolEntry }) {
  const copy = useCopy()
  const locale = usePageLocale()
  if (!tool.inputSchema) {
    return (
      <p className="mt-2 text-[13px] text-(--el-text-secondary)">
        {formatIcu(locale, copy.docs.mcpArgsUnpublished, { code: codeTag })}
      </p>
    )
  }

  const fields = describeSchema(tool.inputSchema)
  if (fields.length === 0) {
    return (
      <p className="mt-2 text-[13px] text-(--el-text-secondary)">
        {copy.docs.mcpNoArguments}
      </p>
    )
  }

  return (
    <div className="mt-2">
      <SchemaTable
        schema={tool.inputSchema}
        labelledBy={`tool-${tool.name}`}
        // Argument descriptions come from the server's schema and are never
        // translated (only summaries and group text are): English on every page.
        descriptionLang={locale === 'en' ? undefined : 'en'}
      />
    </div>
  )
}

/** The chip recipe from `design/docs/design-notes.md` § The chips, per hint. */
const hintChipsFor = (
  copy: Copy,
): Record<
  Exclude<McpToolHint, 'unpublished'>,
  { label: string; tint: string }
> => ({
  reads: { label: copy.docs.mcpHintReads, tint: 'bg-(--el-tint-sky)' },
  writes: { label: copy.docs.mcpHintWrites, tint: 'bg-(--el-tint-peach)' },
  destructive: {
    label: copy.docs.mcpHintDestructive,
    tint: 'bg-(--el-tint-rose)',
  },
})

function HintChip({ hint }: { hint: Exclude<McpToolHint, 'unpublished'> }) {
  const chip = hintChipsFor(useCopy())[hint]
  return (
    <span
      data-hint={hint}
      className={`inline-flex justify-center rounded-(--radius-badge) px-(--spacing-chip-x) py-(--spacing-chip-y) font-(family-name:--font-mono) text-[10.5px] leading-[1.5] font-bold tracking-[0.02em] whitespace-nowrap text-(--el-text-strong) ${chip.tint}`}
    >
      {chip.label}
    </span>
  )
}

/** The name, the title beside it and the chip — wrapping, never truncating the name. */
function ToolHead({ tool }: { tool: McpToolEntry }) {
  const hint = toolHint(tool)
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <code
        id={`tool-${tool.name}`}
        className="font-(family-name:--font-mono) text-[13px] [overflow-wrap:anywhere] text-(--el-text)"
      >
        {tool.name}
      </code>
      {tool.title ? (
        <span className="text-[13px] font-semibold text-(--el-text)">
          {tool.title}
        </span>
      ) : null}
      {hint === 'unpublished' ? null : <HintChip hint={hint} />}
    </div>
  )
}

export default async function McpToolsPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const heading = (
    <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
      {copy.docs.mcpTools}
    </h1>
  )
  // Read once per build for this locale's URL; a failed read fails the build.
  const catalogue = await fetchMcpToolCatalogue(locale)
  const total = countCatalogueTools(catalogue)
  /*
   * `lang` only where a region's language differs from the page's — a region in
   * the page language inherits it. Panel F (design/docs/design-notes.md §
   * `docs--localized-notes.*`, decision F): a summary that fell back to English
   * stays English under lang="en" with NO per-row marker; the reference note
   * already explains it.
   */
  const regionLang = (served: string | undefined) => {
    const resolved = catalogueTextLocale(served, locale)
    return resolved === locale ? undefined : resolved
  }

  return (
    <>
      {heading}
      <DocsDocument
        slug="mcp/tools"
        locale={locale}
        slots={{
          'catalogue-summary': (
            <p className="mt-2 text-[13px] text-(--el-text-secondary)">
              {formatIcu(locale, copy.docs.mcpToolsSummary, {
                count: total,
                endpoint: catalogue.endpoint,
                code: codeTag,
              })}
            </p>
          ),
          'hint-legend': (
            <p className="mt-3 max-w-[68ch] text-[14px] leading-[1.9] text-(--el-text-secondary)">
              {copy.docs.mcpHintLedeIntro} <HintChip hint="reads" />{' '}
              {copy.docs.mcpHintReadsMeans} <HintChip hint="writes" />{' '}
              {copy.docs.mcpHintWritesMeans} <HintChip hint="destructive" />{' '}
              {copy.docs.mcpHintDestructiveMeans} {copy.docs.mcpHintLedeClaude}
            </p>
          ),
          catalogue: catalogue.groups.map((group) => (
            <section key={group.permission} className="mt-8">
              <div lang={regionLang(group.textLocale)}>
                <h2 className="font-(family-name:--font-serif) text-lg font-semibold text-(--el-text)">
                  {group.label}
                </h2>
                <p className="mt-1 max-w-[40rem] text-[13px] text-(--el-text-secondary)">
                  {group.gates}
                  {group.grantedByDefault ? (
                    // The suffix is page-language copy inside an English region.
                    <span
                      lang={regionLang(group.textLocale) ? locale : undefined}
                    >
                      {copy.docs.mcpGrantedByDefault}
                    </span>
                  ) : (
                    ''
                  )}
                </p>
              </div>
              <ul className="mt-3 flex flex-col divide-y divide-(--el-border) border-y border-(--el-border)">
                {group.tools.map((tool) => (
                  <li key={tool.name} className="py-4">
                    <ToolHead tool={tool} />
                    <p
                      lang={regionLang(tool.summaryLocale)}
                      className="mt-1 max-w-[68ch] text-[13px] text-(--el-text-secondary)"
                    >
                      {tool.summary}
                    </p>
                    {toolHint(tool) === 'unpublished' ? (
                      <p className="mt-1 max-w-[68ch] text-[13px] text-(--el-text-secondary)">
                        {copy.docs.mcpHintsUnpublished}
                      </p>
                    ) : null}
                    <ToolArguments tool={tool} />
                  </li>
                ))}
              </ul>
            </section>
          )),
        }}
      />
    </>
  )
}
