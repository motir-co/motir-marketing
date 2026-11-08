import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'

import { getCopy } from '@/lib/copy'
import {
  AGENT_INSTALLS,
  CHECKED_ON,
  CLAUDE_CODE_UPDATE,
  RELEASE_SKILLS,
  SKILLS_RELEASE_TAG,
  SKILLS_RELEASE_URL,
  SKILLS_REPO,
  SKILLS_REPO_URL,
} from '@/lib/skillsGuide'
import { guideDate, skillBlockLabels } from '@/lib/docsGuideValues'
import { CodeBlock } from '../../_components/DocSchema'
import { DocsDocument } from '../../_components/DocsDocument'
import { skillList } from '../../_components/guideValues'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * The SKILLS guide (MOTIR-6717) — how to put Motir's skills into the agent a
 * reader already uses, and what to say to use each one.
 *
 * ⚠️ NOTHING ABOUT AN AGENT OR A RELEASE IS TYPED IN THIS FILE. The tag, the
 * repository, every command, every directory and every documentation link
 * come from `lib/skillsGuide.ts`, where each agent's path is dated and
 * sourced. This file arranges them. `tests/docs/skills.test.tsx` asserts every
 * tag on the rendered page equals the one constant, so a release bump that
 * missed a block fails there rather than shipping two versions on one page.
 *
 * ⚠️ THE USAGE SECTIONS ARE THE SHAPE LATER SKILLS APPEND TO. A new skill adds
 * one entry to `SKILL_USAGE` (`motir-guide` did, MOTIR-6732) and one usage
 * heading to `content/docs/skills/en.md` (`tests/docs/skills.test.tsx` fails
 * until both exist); nothing in this file changes for it. The install copy names `RELEASE_SKILLS` rather than a
 * count, because a release can carry a skill before its usage section lands.
 *
 * No design card, deliberately: a text guide in the shipped docs template,
 * composing `CodeBlock` and its copy control the way `/docs/mcp` does, and no
 * component of its own.
 *
 * THE PROSE LIVES IN `content/docs/skills/<locale>.md` (MOTIR-8036). Every pane
 * of commands is a slot (its payload from `lib/skillsGuide.ts`, its caption and
 * copy-button name from the catalogue), and the tag, the URLs, the skill list and
 * the check date reach the prose as values — the date formatted per locale.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/skills', (copy) => ({
    title: copy.docs.metaTitleSkills,
    description: copy.docs.metaDescriptionSkills,
  }))
}

/** The value name of each agent's documentation link. */
const DOCS_URL_VALUE: Record<string, string> = {
  'claude-code': 'claudeCodeDocsUrl',
  codex: 'codexDocsUrl',
  cursor: 'cursorDocsUrl',
  'gemini-cli': 'geminiCliDocsUrl',
  'copilot-vs-code': 'copilotDocsUrl',
  opencode: 'opencodeDocsUrl',
}

export default async function SkillsDocsPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const blockLabels = skillBlockLabels(copy.docs.guideLabels)

  const slots = Object.fromEntries(
    [
      ...AGENT_INSTALLS.flatMap((agent) => agent.blocks),
      CLAUDE_CODE_UPDATE,
    ].map((block) => [
      block.id,
      <div key={block.id} className="mt-3">
        <CodeBlock
          caption={blockLabels[block.id]!.caption}
          code={block.code}
          copyLabel={blockLabels[block.id]!.copyLabel}
        />
      </div>,
    ]),
  )

  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.skills}
      </h1>
      <DocsDocument
        slug="skills"
        locale={locale}
        slots={slots}
        values={{
          releaseTag: SKILLS_RELEASE_TAG,
          releaseVersion: SKILLS_RELEASE_TAG.replace(/^v/, ''),
          releaseUrl: SKILLS_RELEASE_URL,
          skillsRepo: SKILLS_REPO,
          repoUrl: SKILLS_REPO_URL,
          checkedOn: guideDate(locale, CHECKED_ON),
          releaseSkills: skillList(locale, RELEASE_SKILLS),
          mcpPage: copy.docs.mcp,
          ...Object.fromEntries(
            AGENT_INSTALLS.map((agent) => [
              DOCS_URL_VALUE[agent.id]!,
              agent.docsUrl,
            ]),
          ),
        }}
      />
    </>
  )
}
