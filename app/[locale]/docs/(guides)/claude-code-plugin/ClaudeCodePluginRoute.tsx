import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'

import { getCopy } from '@/lib/copy'
import {
  AGENT_INSTALLS,
  CLAUDE_CODE_UPDATE,
  SKILLS_RELEASE_TAG,
  SKILLS_RELEASE_URL,
  SKILLS_REPO,
  SKILLS_REPO_URL,
} from '@/lib/skillsGuide'
import { skillBlockLabels } from '@/lib/docsGuideValues'
import { CodeBlock } from '../../_components/DocSchema'
import { DocsDocument } from '../../_components/DocsDocument'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * The CLAUDE CODE PLUGIN guide (2026-10 redesign) — the one install that
 * brings Motir's skills, its MCP server and a runner for its CLI into Claude
 * Code. The Products menu opens it for "Motir Claude Code plugin".
 *
 * ⚠️ NOTHING ABOUT THE PLUGIN OR A RELEASE IS TYPED IN THIS FILE. The tag, the
 * commands, what the install brings, how to check it and how to update it are
 * the Claude Code entry of `AGENT_INSTALLS` and `CLAUDE_CODE_UPDATE` in
 * `lib/skillsGuide.ts` — the same data the skills guide renders — so a release
 * bump updates both pages at once. The skills' usage is `SKILL_USAGE`; this
 * page lists what to say and leaves the detail to the skills guide.
 *
 * THE PROSE LIVES IN `content/docs/claude-code-plugin/<locale>.md` (MOTIR-8036).
 * The install and update panes are slots (payloads from the same data, labels
 * from the catalogue); the tag and the URLs reach the prose as values. The
 * "use it" list of phrases is the document's, and `tests/docs/skills.test.tsx`
 * holds every phrase to `SKILL_USAGE[].say`.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/claude-code-plugin', (copy) => ({
    title: copy.docs.metaTitleClaudeCodePlugin,
    description: copy.docs.metaDescriptionClaudeCodePlugin,
  }))
}

export default async function ClaudeCodePluginDocsPage({
  params,
}: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const blockLabels = skillBlockLabels(copy.docs.guideLabels)
  const claudeCode = AGENT_INSTALLS.find((agent) => agent.id === 'claude-code')!
  const install = claudeCode.blocks.find(
    (block) => block.id === 'claude-code-plugin',
  )!

  const pane = (block: { id: string; code: string }) => (
    <div className="mt-3">
      <CodeBlock
        caption={blockLabels[block.id]!.caption}
        code={block.code}
        copyLabel={blockLabels[block.id]!.copyLabel}
      />
    </div>
  )

  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.claudeCodePlugin}
      </h1>
      <DocsDocument
        slug="claude-code-plugin"
        locale={locale}
        slots={{ install: pane(install), update: pane(CLAUDE_CODE_UPDATE) }}
        values={{
          releaseTag: SKILLS_RELEASE_TAG,
          releaseVersion: SKILLS_RELEASE_TAG.replace(/^v/, ''),
          releaseUrl: SKILLS_RELEASE_URL,
          skillsRepo: SKILLS_REPO,
          repoUrl: SKILLS_REPO_URL,
          skillsPage: copy.docs.skills,
          connectorPage: copy.docs.claudeCodeConnector,
        }}
      />
    </>
  )
}
