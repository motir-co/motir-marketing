import { readFileSync } from 'node:fs'
import { render } from '@/tests/helpers/withCopy'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { describe, expect, it } from 'vitest'
import SkillsDocsPage from '@/app/[locale]/docs/(guides)/skills/SkillsRoute'
import { englishCopy } from '@/lib/copy'
import { docsSurfacesFor } from '@/lib/docsSurfaces'
import {
  AGENT_INSTALLS,
  RELEASE_SKILLS,
  SKILL_NAMES,
  SKILL_USAGE,
  SKILLS_RELEASE_TAG,
} from '@/lib/skillsGuide'
import { SKILLS_RELEASE_PIN } from '@/lib/skillsRelease'
import { EN_PAGE } from '@/tests/helpers/locale'

/*
 * `/docs/skills` (MOTIR-6717).
 *
 * ⚠️ THE HEADINGS ARE NAMED HERE ON PURPOSE, which is the opposite of what the
 * surface tests next door do. Those walk the file system because the defect
 * they guard is a page nobody listed. This one guards a CONTRACT the story
 * made — six agents, and a usage section per documented skill — so a section that silently drops out of
 * `lib/skillsGuide.ts` must turn this red rather than shrink the expectation
 * with it. A later release that adds a skill adds its name here in the same
 * pull request.
 *
 * ⚠️ AND THE TAG IS CHECKED ON THE RENDER, not on the module. What a reader
 * copies is the pane's text, so every tag-shaped string the page renders is
 * collected and must equal `SKILLS_RELEASE_TAG`. A block typed with a literal
 * tag would pass a module-level check and fail here the day the constant moves.
 */

const AGENTS = [
  'Claude Code',
  'Codex',
  'Cursor',
  'Gemini CLI',
  'GitHub Copilot in VS Code',
  'OpenCode',
]

async function page() {
  return render((await resolveAsync(await SkillsDocsPage(EN_PAGE))) as never)
    .container
}

/** The prose of `content/docs/skills/en.md`, which is where the usage lives now. */
const DOCUMENT = readFileSync('content/docs/skills/en.md', 'utf8')

/**
 * Everything under a heading, up to the next heading of any level. The page is a
 * flat run of siblings (a document, not nested sections), so a section is read
 * by walking from its heading.
 */
function section(container: HTMLElement, id: string): HTMLElement {
  const heading = container.querySelector(`#${id}`)
  expect(heading, `the heading #${id}`).not.toBeNull()
  const holder = document.createElement('div')
  for (
    let node = heading!.nextElementSibling;
    node && !/^H[1-6]$/.test(node.tagName);
    node = node.nextElementSibling
  ) {
    holder.append(node.cloneNode(true))
  }
  return holder
}

function headings(container: HTMLElement, level: 'h2' | 'h3'): string[] {
  return [...container.querySelectorAll(level)].map(
    (h) => h.textContent?.trim() ?? '',
  )
}

describe('/docs/skills', () => {
  it('has an install section for each of the six agents', async () => {
    const h3 = headings(await page(), 'h3')
    for (const agent of AGENTS) expect(h3, agent).toContain(agent)
    expect(AGENT_INSTALLS.map((a) => a.label)).toEqual(AGENTS)
  })

  it('has a usage section for each skill the release carries', async () => {
    const h3 = headings(await page(), 'h3')
    expect([...SKILL_NAMES]).toEqual([
      'motir-run',
      'motir-fix',
      'motir-continue',
      'motir-log-bug',
      'motir-mark',
      'motir-guide',
      'motir-fix-bugs',
    ])
    for (const skill of SKILL_NAMES) expect(h3, skill).toContain(skill)
    expect(SKILL_USAGE.map((s) => s.name)).toEqual([...SKILL_NAMES])
  })

  it('keeps a usage heading in the document for every skill, and every phrase to say as inline code', () => {
    // Prose moved out of `lib/skillsGuide.ts` (MOTIR-8036): what is left there is
    // the phrase a reader types, and the document must carry each one verbatim.
    for (const skill of SKILL_NAMES) {
      expect(DOCUMENT, skill).toContain(`### \`${skill}\` {#${skill}}`)
    }
    for (const usage of SKILL_USAGE) {
      for (const phrase of usage.say) {
        expect(DOCUMENT, phrase).toContain(`\`${phrase}\``)
      }
    }
  })

  it('reads every skill’s prose from the rendered page, not from the data', async () => {
    const container = await page()
    for (const usage of SKILL_USAGE) {
      const text = section(container, usage.name).textContent ?? ''
      expect(text, usage.name).toContain('What happens')
      expect(text, usage.name).toContain('What you see in Motir')
      for (const phrase of usage.say) expect(text, phrase).toContain(phrase)
      // The phrases are the only thing the data still holds for a skill.
      expect(Object.keys(usage).sort()).toEqual(['name', 'say'])
    }
  })

  it('documents only skills the pinned release carries, and names every one it installs', async () => {
    // A release can carry a skill before its usage section lands, so the
    // documented set is a subset and the install copy names the whole.
    for (const skill of SKILL_NAMES)
      expect(RELEASE_SKILLS, skill).toContain(skill)
    const text = (await page()).textContent ?? ''
    for (const skill of RELEASE_SKILLS) expect(text, skill).toContain(skill)
    expect(text).not.toMatch(/\bthree\b/)
  })

  it('tells a manual-card reader what motir-guide does and shows them', async () => {
    const container = await page()
    const text = section(container, 'motir-guide').textContent ?? ''
    // Outline 1 — what to say.
    expect(text).toContain('motir guide ACME-12')
    // Outline 2 — one step, a checked tick, a failed check left unticked,
    // stop and resume, and it asks before writing steps it proposed.
    expect(text).toContain('one step at a time')
    expect(text).toContain('is not ticked')
    expect(text).toContain('picks up where you left off')
    expect(text).toContain('asks you before writing them')
    // Outline 3 — the To-do list, and Done with a summary comment.
    expect(text).toContain('To-do list')
    expect(text).toContain('moves to Done, with a comment summarising')
  })

  it('tells a reader with a red pull request what motir-fix does and shows them', async () => {
    const text = section(await page(), 'motir-fix').textContent ?? ''
    // What to say: one work item, named.
    expect(text).toContain('motir fix ACME-12')
    // What it does: claims the repair, fixes on the pull request's own
    // branch, keeps going until green or five attempts.
    expect(text).toContain('claims the repair')
    expect(text).toContain('on the branch it already has, never a new one')
    expect(text).toContain('until CI is green or it has tried five times')
    // How it differs from motir fix bugs.
    expect(text).toContain('Not the same as motir fix bugs')
    // What the reader sees: the repair on the work item.
    expect(text).toContain('says it is being fixed, and by whom')
  })

  it('tells a reader whose run died what motir-continue does, and when to use fix or run instead', async () => {
    const text = section(await page(), 'motir-continue').textContent ?? ''
    // What to say: one work item, named.
    expect(text).toContain('motir continue ACME-12')
    // What it does: claims the continue, carries on the branch the dead run
    // left, delivers as a fresh run does.
    expect(text).toContain('whose run died')
    expect(text).toContain('claims the continue')
    expect(text).toContain('the branch that run left')
    expect(text).toContain('never a new one')
    // How it differs from motir fix (a red pull request) and motir run (a
    // work item nobody has started).
    expect(text).toContain(
      'Use motir fix ACME-12 instead when the work item already has a pull request that is red',
    )
    expect(text).toContain(
      'motir run ACME-12 for a work item nobody has started',
    )
    // What the reader sees: the Development section's own words.
    expect(text).toContain('Run died')
    expect(text).toContain('it is being continued, and by whom')
  })

  it('tells a Bugs-folder reader what motir-fix-bugs does and shows them', async () => {
    const text = section(await page(), 'motir-fix-bugs').textContent ?? ''
    // Outline 1 — what to say, with and without a limit.
    expect(text).toContain('motir fix bugs')
    expect(text).toContain('motir fix bugs 3')
    // Outline 2 — one at a time, oldest first; one pull request per bug; a
    // waiting bug linked and moved beside its card; the rest commented and
    // set aside; a closing report.
    expect(text).toContain('one bug at a time, oldest first')
    expect(text).toContain(
      'one pull request that fixes that bug and nothing else',
    )
    expect(text).toContain(
      'linked to that work item and moved under the same story',
    )
    expect(text).toContain('gets a comment and is set aside')
    expect(text).toContain('It ends with a report')
    // Outline 3 — Implemented with pull requests, Blocked with a link,
    // comments with evidence.
    expect(text).toContain('moves to Implemented with its pull request linked')
    expect(text).toContain('moves to Blocked, with a blocked by link')
    expect(text).toContain('a comment with the evidence')
  })

  it('has the prerequisite, the install, the use, the wrong-card and the updating sections', async () => {
    const container = await page()
    for (const id of ['before', 'install', 'use', 'wrong', 'updating']) {
      expect(container.querySelector(`h2#${id}`), id).not.toBeNull()
    }
    // The prerequisite points at the MCP guide, which is where the setup lives.
    expect(
      container.querySelector('a[href="/docs/mcp"]'),
      'the MCP guide link',
    ).not.toBeNull()
  })

  it('installs the latest release resolved at build, never below the pin', () => {
    // The tag is resolved by `scripts/skills/resolve-release.ts` (MOTIR-8802),
    // so there is no literal to assert here: under test the environment is
    // unset and the floor applies. `tests/skillsRelease.test.ts` feeds newer
    // tags and watches every command change.
    expect(SKILLS_RELEASE_TAG).toBe(SKILLS_RELEASE_PIN)
    expect(RELEASE_SKILLS).toContain('motir-continue')
  })

  it('copies the skills from where the pinned release keeps them', async () => {
    // Since v0.4.2 (MOTIR-7186) the skills live under plugins/motir/skills/,
    // and a copy from a root skills/ folder at that tag copies nothing.
    const panes = [...(await page()).querySelectorAll('pre')]
      .map((pre) => pre.textContent ?? '')
      .filter((text) => text.includes('git clone'))
    expect(panes).toHaveLength(
      AGENT_INSTALLS.reduce((n, a) => n + a.blocks.length, 0) - 1,
    )
    for (const pane of panes) {
      expect(pane).toContain('cp -R motir-skills/plugins/motir/skills/motir-* ')
      expect(pane).not.toMatch(/motir-skills\/skills\//)
    }
  })

  it('says the Claude Code plugin brings three things, and links the MCP sign-in', async () => {
    const container = await page()
    const claudeCode = section(container, 'claude-code')
    const items = [...claudeCode.querySelectorAll('li')].map(
      (li) => li.textContent ?? '',
    )
    expect(items).toHaveLength(3)
    expect(items[0]).toContain('The seven skills')
    expect(items[1]).toContain('The Motir MCP server')
    expect(items[1]).toContain('no token')
    expect(items[2]).toContain('The motir runner')
    expect(items[2]).toContain('Node.js 22 or newer')
    expect(
      claudeCode.querySelector('a[href="/docs/mcp#claude"]'),
    ).not.toBeNull()
    // Only Claude Code's install brings more than skills.
    for (const agent of AGENT_INSTALLS.filter((a) => a.id !== 'claude-code')) {
      expect(
        section(container, agent.id).querySelector('li'),
        agent.id,
      ).toBeNull()
    }
  })

  it('tells a Claude Code reader they need no token, and the others where to get one', async () => {
    const before = (await page()).querySelector(
      'h2#before',
    )!.nextElementSibling!
    expect(before.textContent).toContain('there is no token')
    expect(before.textContent).toContain('personal access token')
  })

  it('pins every command it renders to ONE release tag', async () => {
    const container = await page()
    const panes = [...container.querySelectorAll('pre')].map(
      (pre) => pre.textContent ?? '',
    )
    // Every install block and the update block, and nothing silently missing.
    const blockCount =
      AGENT_INSTALLS.reduce((n, a) => n + a.blocks.length, 0) + 1
    expect(panes.length).toBe(blockCount)

    // Each pane fetches the release, so each carries the tag.
    for (const pane of panes) expect(pane).toContain(SKILLS_RELEASE_TAG)

    // And no tag-shaped string on the whole page names a different one.
    const tags = new Set(
      (container.textContent ?? '').match(/\bv\d+\.\d+\.\d+\b/g) ?? [],
    )
    expect([...tags]).toEqual([SKILLS_RELEASE_TAG])
  })

  it('links each agent section to that agent’s own documentation', async () => {
    const container = await page()
    for (const agent of AGENT_INSTALLS) {
      const link = [...container.querySelectorAll('a')].find(
        (a) => a.textContent === `${agent.label} documentation`,
      )
      expect(link?.getAttribute('href'), agent.label).toBe(agent.docsUrl)
      expect(agent.docsUrl).toMatch(/^https:\/\//)
    }
  })

  it('gives every copy button its own accessible name', async () => {
    const names = [...(await page()).querySelectorAll('button')].map((b) =>
      b.getAttribute('aria-label'),
    )
    expect(names.length).toBeGreaterThan(0)
    expect(new Set(names).size).toBe(names.length)
    expect(names).toContain(englishCopy.docs.guideLabels.copyClaudeCodeUpdate)
  })

  it('is a surface the docs rail and index draw', () => {
    expect(docsSurfacesFor(englishCopy).map((s) => s.href)).toContain(
      '/docs/skills',
    )
  })
})
