import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { EN_PAGE } from '@/tests/helpers/locale'
import {
  SKILLS_RELEASE_PIN,
  compareReleaseTags,
  isReleaseTag,
  pickSkillsReleaseTag,
} from '@/lib/skillsRelease'

/*
 * MOTIR-8802 — the release every install command names is the LATEST one,
 * resolved at build, and not a constant somebody must remember to move.
 *
 * The build hands the resolved tag over as `SKILLS_RELEASE_TAG`
 * (`scripts/skills/resolve-release.ts` → `next.config.ts`). These tests play the
 * build: they set that variable to a release NEWER than the committed floor and
 * assert that the setup prompt and both guides change with it — every install,
 * update and "check it worked" line — and that nothing old is left behind.
 */

const NEWER = 'v9.8.7'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function renderAt(tag: string | undefined) {
  vi.resetModules()
  if (tag === undefined) vi.stubEnv('SKILLS_RELEASE_TAG', '')
  else vi.stubEnv('SKILLS_RELEASE_TAG', tag)
  const skills = (
    await import('@/app/[locale]/docs/(guides)/skills/SkillsRoute')
  ).default as (props: unknown) => Promise<never>
  const plugin = (
    await import('@/app/[locale]/docs/(guides)/claude-code-plugin/ClaudeCodePluginRoute')
  ).default as (props: unknown) => Promise<never>
  const { setupPrompt } = await import('@/lib/setupPrompt')
  // The pages were imported into a fresh module graph, so their page context is
  // that graph's: the provider that renders them must come from it too.
  const { render } = await import('@/tests/helpers/withCopy')
  const { SKILLS_RELEASE_TAG, SKILLS_RELEASE_URL } =
    await import('@/lib/skillsGuide')
  const text = async (Page: (props: unknown) => Promise<never>) =>
    render((await resolveAsync(await Page(EN_PAGE))) as never).container
      .textContent ?? ''
  return {
    tag: SKILLS_RELEASE_TAG,
    url: SKILLS_RELEASE_URL,
    prompt: setupPrompt(),
    skills: await text(skills),
    plugin: await text(plugin),
  }
}

const tagsIn = (text: string) =>
  new Set(text.match(/\bv\d+\.\d+\.\d+\b/g) ?? [])

describe('the release tag helpers', () => {
  it('accepts only a plain vMAJOR.MINOR.PATCH tag', () => {
    expect(isReleaseTag('v0.8.1')).toBe(true)
    for (const bad of ['0.8.1', 'v0.8', 'v0.8.1-rc.1', 'latest', '', null, 1])
      expect(isReleaseTag(bad), String(bad)).toBe(false)
  })

  it('orders tags numerically, not as strings', () => {
    expect(compareReleaseTags('v0.10.0', 'v0.9.9')).toBeGreaterThan(0)
    expect(compareReleaseTags('v1.0.0', 'v0.99.99')).toBeGreaterThan(0)
    expect(compareReleaseTags('v0.8.1', 'v0.8.1')).toBe(0)
  })

  it('names a newer release, and falls back to the floor otherwise', () => {
    expect(pickSkillsReleaseTag(NEWER)).toBe(NEWER)
    expect(pickSkillsReleaseTag(undefined)).toBe(SKILLS_RELEASE_PIN)
    expect(pickSkillsReleaseTag('')).toBe(SKILLS_RELEASE_PIN)
    expect(pickSkillsReleaseTag('v0.0.1')).toBe(SKILLS_RELEASE_PIN)
    expect(pickSkillsReleaseTag('v1.2.3; rm -rf /')).toBe(SKILLS_RELEASE_PIN)
  })
})

describe('every install surface follows the latest release', () => {
  it('names the floor when the build resolved nothing newer', async () => {
    const at = await renderAt(undefined)
    expect(at.tag).toBe(SKILLS_RELEASE_PIN)
    expect(at.prompt).toContain(`Use release ${SKILLS_RELEASE_PIN}`)
  })

  it('changes the setup prompt, /docs/skills and /docs/claude-code-plugin when a newer release is the latest', async () => {
    const at = await renderAt(NEWER)
    const version = NEWER.slice(1)

    expect(at.tag).toBe(NEWER)
    expect(at.url).toContain(`/releases/tag/${NEWER}`)

    // The setup prompt: the install step, the plugin block, the check line.
    expect(at.prompt).toContain(`Use release ${NEWER}`)
    expect(at.prompt).toContain(`motir-skills#${NEWER}`)
    expect(at.prompt).toContain(`shows motir at ${version}`)

    // The skills guide: every marketplace and clone command.
    expect(at.skills).toContain(`motir-co/motir-skills#${NEWER}`)
    expect(at.skills).toContain(`git clone --depth 1 --branch ${NEWER}`)
    expect(at.skills).toContain(`motir at ${version}`)

    // The plugin guide: install and check lines.
    expect(at.plugin).toContain(`motir-skills#${NEWER}`)
    expect(at.plugin).toContain(`motir at ${version}`)

    // And nothing on any of them still names the old release.
    for (const [name, text] of Object.entries({
      prompt: at.prompt,
      skills: at.skills,
      plugin: at.plugin,
    })) {
      expect([...tagsIn(text)], name).toEqual([NEWER])
      expect(text, name).not.toContain(SKILLS_RELEASE_PIN)
      expect(text, name).not.toContain(SKILLS_RELEASE_PIN.slice(1))
    }
  })
})
