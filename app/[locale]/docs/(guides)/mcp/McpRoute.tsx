import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import type { ReactNode } from 'react'
import { getCopy } from '@/lib/copy'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { fetchMcpToolCatalogue, type McpToolCatalogue } from '@/lib/docs'
import { guideDate } from '@/lib/docsGuideValues'
import {
  CONNECTED_APPS_PATH,
  MCP_CLIENT_FORMATS_CHECKED_ON,
  MCP_CODEX_TOKEN_KEY,
  MCP_REFERENCE_URL,
  claudeRoutes,
  mcpClaudeCodeTokenCommand,
  mcpClients,
  mcpTransportFacts,
  mcpVerifyCommand,
} from '@/lib/mcpWiring'
import { CodeBlock } from '../../_components/DocSchema'
import { renderDocsParts } from '../../_components/DocsDocument'

/*
 * The MCP server guide (MOTIR-4046, RESTORED by MOTIR-4429) — how to wire a
 * client to Motir's MCP server, end to end.
 *
 * ⚠️ WHAT THIS CARD FIXED. The page was two sentences: the endpoint exists, and
 * a scope gates every tool. Both true, neither actionable — `0 <pre>` blocks,
 * and `mcpServers` appeared ZERO times across all nine `/docs` pages. The
 * deleted `motir-core` page at `95a2d4468^` carried a fork table, three
 * numbered steps, five ready-to-paste client configurations and a scope legend;
 * the move to motir.co kept the route and dropped all of it. MOTIR-4397's
 * parity ledger measured that; MOTIR-4429 is the restore.
 *
 * ── NOTHING ABOUT THE TRANSPORT IS TYPED IN THIS FILE ───────────────────────
 * The URL, the header, the token shape and every client block come from
 * `lib/mcpWiring.ts`, built by interpolating one set of facts, so a preview
 * build documents the preview it is part of and no block can drift from the
 * endpoint it describes. `tests/docs/mcpWiring.test.tsx` proves the
 * interpolation with a sentinel origin — a block that typed a URL fails there
 * rather than passing by coincidence.
 *
 * ── THE SCOPE TABLE IS DERIVED, NOT COPIED ─────────────────────────────────
 * It is read from the catalogue motir-core publishes at
 * `/api/docs/mcp-tools.json` — the same document `/docs/mcp/tools` renders,
 * whose groups ARE the permissions and whose `gates` sentence is the shipped
 * i18n copy from the Roles & permissions screen. This repository keeps no
 * second copy of a scope list it could not check, and the no-fallback contract
 * applies here as everywhere else in this area: the catalogue is read once per
 * build, and an unreadable one fails the build (MOTIR-10645).
 *
 * ── IT LEADS WITH THE ROUTE THAT NEEDS NO TOKEN (MOTIR-7078) ───────────────
 * Since MOTIR-6973 the server is an OAuth resource: a Claude client signs in on
 * app.motir.co and the person picks ONE workspace and approves what it may do.
 * That route comes first, as "Add Motir to Claude" (`#claude`), because it is
 * the one a person adding Motir to Claude should take and the one Anthropic's
 * connector reviewer is pointed at. The token route follows, unchanged in
 * substance, for other clients and for CI — and keeps its `#token` / `#wire` /
 * `#check` anchors so inbound links still land. The Claude steps are data in
 * `lib/mcpWiring.ts` (`claudeRoutes`), interpolated from the same facts.
 *
 * ── THE PROSE LIVES IN `content/docs/mcp/<locale>.md` (MOTIR-8055) ─────────
 * Every sentence the page and `lib/mcpWiring.ts` used to carry — the Claude
 * routes' steps and notes, each client's note, the fork table, the four-facts
 * table, the unreachable paragraph — is in the document. This file keeps what a
 * reader copies (the code blocks, the commands), what is generated (the scope
 * table) and the values the prose must not restate. The document's parts: `body`
 * is the page from its introduction to the scopes paragraph; `what-next` is the
 * closing section, placed after the scope table; `column-*`, `granted` and
 * `off-by-default` are the labels the generated table wears. Its `unreachable`
 * paragraph is never rendered on a built page.
 *
 * ⚠️ AND THIS FILE NAMES NO TOOL AND NO VENDOR CONFIG KEY.
 * `tests/docs/docs.test.ts` scans this source for a lowercase underscore-joined
 * identifier — the shape every Motir MCP tool name has — because this
 * repository cannot check a tool name it types. Two of the five vendor formats
 * spell their keys that way too, which is exactly why the blocks live in
 * `lib/mcpWiring.ts`; see the ⚠️ block there.
 */
export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/mcp', (copy) => ({
    title: copy.docs.metaTitleMcp,
    description: copy.docs.metaDescriptionMcp,
  }))
}

/** `claude-code` to `ClaudeCode`: the suffix of a value name built from an id. */
const pascal = (id: string) =>
  id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')

/**
 * A short label from the document set in a table cell. The renderer wraps a
 * part in a paragraph with its own measure and ink; inside a cell the cell's
 * type is the right one, so the paragraph is flattened to inherit it.
 */
function Label({ children }: { children: ReactNode }) {
  return (
    <div className="[&_p]:mt-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit">
      {children}
    </div>
  )
}

/**
 * The scope legend, derived from the published catalogue. Its column headings
 * and its Granted / Off by default cells are parts of the document.
 */
function Scopes({
  catalogue,
  labels,
  gatesLang,
}: {
  catalogue: McpToolCatalogue
  /** `en` on a translated page: this page reads the unlocalized catalogue, so each
   * served `gates` sentence is English inside a page in another language. */
  gatesLang?: string
  labels: Record<
    'scope' | 'gates' | 'default' | 'granted' | 'offByDefault',
    ReactNode
  >
}) {
  const columns = [labels.scope, labels.gates, labels.default]
  return (
    <div
      role="region"
      aria-labelledby="scopes"
      tabIndex={0}
      className="mt-3 mb-4 overflow-x-auto"
    >
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {columns.map((heading, index) => (
              <th
                key={index}
                scope="col"
                className="border-b border-(--el-border) px-2.5 py-1.5 text-left text-[11px] font-semibold tracking-wide text-(--el-text-secondary) uppercase"
              >
                <Label>{heading}</Label>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {catalogue.groups.map((group) => (
            <tr key={group.permission}>
              {/* ⚠️ `whitespace-nowrap`, not a wrapping code. A scope is ONE
                  token and breaking it mid-word — `project:brow` / `se` —
                  turns a name a reader is about to type into two strings. The
                  table scrolls in its own box, so a column that refuses to
                  wrap costs nothing. */}
              <td className="border-b border-(--el-border-soft) px-2.5 py-2 align-top text-(--el-text-secondary)">
                <code className="font-(family-name:--font-mono) text-[12.5px] whitespace-nowrap text-(--el-text)">
                  {group.permission}
                </code>
              </td>
              <td
                lang={gatesLang}
                className="border-b border-(--el-border-soft) px-2.5 py-2 align-top text-(--el-text-secondary)"
              >
                {group.gates}
              </td>
              <td className="border-b border-(--el-border-soft) px-2.5 py-2 align-top whitespace-nowrap text-(--el-text-secondary)">
                <Label>
                  {group.grantedByDefault
                    ? labels.granted
                    : labels.offByDefault}
                </Label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function McpPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const labels = copy.docs.guideLabels
  const facts = mcpTransportFacts()
  const clients = mcpClients(facts)
  const routes = claudeRoutes(facts)

  // The scope table's catalogue, read once per build; a failed read fails it.
  const catalogue = await fetchMcpToolCatalogue()

  const routeCaptions: Record<string, { caption: string; copyLabel: string }> =
    {
      'claude-ai': {
        caption: labels.captionMcpServerUrl,
        copyLabel: labels.copyMcpServerUrl,
      },
      'claude-desktop': {
        caption: labels.captionMcpServerUrl,
        copyLabel: labels.copyMcpServerUrl,
      },
      'claude-code': {
        caption: labels.captionYourTerminal,
        copyLabel: labels.copyClaudeCodeCommand,
      },
    }
  const clientCaption = (id: string, file: string | null) =>
    id === 'cursor'
      ? labels.captionCursorConfig
      : id === 'other' || file === null
        ? labels.captionOtherClientConfig
        : file

  const slots: Record<string, ReactNode> = {
    verify: (
      <div className="mt-3">
        <CodeBlock
          caption={labels.captionYourMachine}
          code={mcpVerifyCommand(facts)}
        />
      </div>
    ),
  }
  const values: Record<string, ReactNode> = {
    mcpPage: copy.docs.mcp,
    apiPage: copy.docs.api,
    cliPage: copy.docs.cli,
    skillsPage: copy.docs.skills,
    mcpToolsPage: copy.docs.mcpTools,
    endpointPath: facts.path,
    url: facts.url,
    authHeader: facts.authHeader,
    authScheme: facts.authScheme,
    tokenPlaceholder: facts.tokenPlaceholder,
    tokenEnvVar: facts.tokenEnvVar,
    codexTokenKey: MCP_CODEX_TOKEN_KEY,
    claudeCodeTokenCommand: mcpClaudeCodeTokenCommand(facts),
    connectedAppsUrl: `${facts.origin}${CONNECTED_APPS_PATH}`,
    referenceUrl: MCP_REFERENCE_URL,
    clientsCheckedOn: guideDate(locale, MCP_CLIENT_FORMATS_CHECKED_ON),
  }
  for (const route of routes) {
    slots[route.id] = (
      <div className="mt-3">
        <CodeBlock
          caption={routeCaptions[route.id]!.caption}
          code={route.code}
          copyLabel={routeCaptions[route.id]!.copyLabel}
        />
      </div>
    )
    values[`route${pascal(route.id)}DocsUrl`] = route.docsUrl
    values[`route${pascal(route.id)}CheckedOn`] = guideDate(
      locale,
      route.checkedOn,
    )
  }
  for (const client of clients) {
    slots[`client-${client.id}`] = (
      <div className="mt-3">
        <CodeBlock
          caption={clientCaption(client.id, client.file)}
          code={client.config}
        />
      </div>
    )
    values[`client${pascal(client.id)}DocsUrl`] = client.docsUrl
  }

  const { parts, note } = await renderDocsParts({
    slug: 'mcp',
    locale,
    slots,
    values,
  })

  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.mcp}
      </h1>
      {note}
      {parts.body}
      <Scopes
        catalogue={catalogue}
        gatesLang={locale === 'en' ? undefined : 'en'}
        labels={{
          scope: parts['column-scope'],
          gates: parts['column-gates'],
          default: parts['column-default'],
          granted: parts.granted,
          offByDefault: parts['off-by-default'],
        }}
      />
      {parts['what-next']}
    </>
  )
}
