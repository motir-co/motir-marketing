import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'

import { getCopy } from '@/lib/copy'
import {
  CONNECTED_APPS_PATH,
  claudeRoutes,
  mcpTransportFacts,
} from '@/lib/mcpWiring'
import { guideDate } from '@/lib/docsGuideValues'
import { CodeBlock } from '../../_components/DocSchema'
import { DocsDocument } from '../../_components/DocsDocument'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * The CLAUDE CODE CONNECTOR guide (2026-10 redesign) — Motir's MCP server as a
 * remote connector in Claude Code, over OAuth, with no token. The Products menu
 * opens it for "Motir Claude Code connector".
 *
 * ⚠️ NOTHING ABOUT A CLAUDE CLIENT IS TYPED IN THIS FILE. The URL, the
 * command, Anthropic's documentation links and their check dates are
 * `claudeRoutes()` in `lib/mcpWiring.ts` — the same routes the MCP guide's
 * "Add Motir to Claude" renders — so the two pages cannot disagree. This file
 * picks the two routes that reach Claude Code (claude.ai, whose connectors
 * Claude Code inherits, and Claude Code's own command) and arranges them.
 *
 * THE PROSE LIVES IN `content/docs/claude-code-connector/<locale>.md`
 * (MOTIR-8036). `claudeRoutes()` no longer carries a step, a note or a label
 * (MOTIR-8055 moved them into `content/docs/mcp/<locale>.md`, where the MCP
 * guide renders them), so the two documents each hold their own wording. What
 * stays read from it is what a reader copies or follows: `code`, `docsUrl` and
 * `checkedOn`, so the two pages still cannot disagree on a command, a link or a
 * date. The captions and copy-button names are catalogue copy
 * (`docs.guideLabels.*`).
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/claude-code-connector', (copy) => ({
    title: copy.docs.metaTitleClaudeCodeConnector,
    description: copy.docs.metaDescriptionClaudeCodeConnector,
  }))
}

export default async function ClaudeCodeConnectorDocsPage({
  params,
}: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const labels = copy.docs.guideLabels
  const facts = mcpTransportFacts()
  const routes = claudeRoutes(facts)
  const byId = (id: string) => routes.find((route) => route.id === id)!
  const claudeAi = byId('claude-ai')
  const claudeCode = byId('claude-code')

  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.claudeCodeConnector}
      </h1>
      <DocsDocument
        slug="claude-code-connector"
        locale={locale}
        slots={{
          'claude-ai': (
            <div className="mt-3">
              <CodeBlock
                caption={labels.captionMcpServerUrl}
                code={claudeAi.code}
                copyLabel={labels.copyMcpServerUrl}
              />
            </div>
          ),
          'claude-code': (
            <div className="mt-3">
              <CodeBlock
                caption={labels.captionYourTerminal}
                code={claudeCode.code}
                copyLabel={labels.copyClaudeCodeCommand}
              />
            </div>
          ),
        }}
        values={{
          claudeAiDocsUrl: claudeAi.docsUrl,
          claudeAiCheckedOn: guideDate(locale, claudeAi.checkedOn),
          claudeCodeDocsUrl: claudeCode.docsUrl,
          claudeCodeCheckedOn: guideDate(locale, claudeCode.checkedOn),
          connectedAppsUrl: `${facts.origin}${CONNECTED_APPS_PATH}`,
          pluginPage: copy.docs.claudeCodePlugin,
          mcpToolsPage: copy.docs.mcpTools,
          mcpPage: copy.docs.mcp,
        }}
      />
    </>
  )
}
