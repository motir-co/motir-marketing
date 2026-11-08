import { screen, waitFor } from '@testing-library/react'
import { renderHydrated } from '@/tests/helpers/withCopy'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SandboxPage from '@/app/[locale]/docs/(guides)/sandbox/SandboxRoute'
import { readFileSync } from 'node:fs'
import { splitParts } from '@/lib/docsDocuments'
import {
  SANDBOX_PICKER_OPTIONS,
  SANDBOX_PROFILES,
  sandboxDevcontainerJson,
  sandboxRunCommand,
} from '@/lib/sandboxProfiles'
import { EN_PAGE } from '@/tests/helpers/locale'

/*
 * THE STEPPED GUIDE'S STRUCTURE (MOTIR-4978) — the integration gate over
 * `/docs/sandbox` after MOTIR-4993 restructured it, built to
 * `design/docs/design-notes.md` § `sandbox-steps.*`.
 *
 * ⚠️ EVERY STRUCTURAL ASSERTION RUNS OVER EVERY PROFILE, not over the default.
 * The card was WIDENED for this on 2026-09-10: the page used to render one
 * agent, and the selector means the same markup now has nine renderings. A
 * suite that only exercises `claude` is correct about five profiles and blind
 * to the three whose shape is different — `opencode` (two credential mounts),
 * `antigravity` (none at all) and `aider` (a file bind plus an env var) — and
 * those three are precisely where a build that templated one mount line breaks.
 *
 * The clipboard is not touched here. Whether a real browser clipboard ends up
 * holding the text is MOTIR-4979's; this suite is about what the page IS.
 */

/** Every step row, in document order, with the two things that classify it. */
function readSteps(container: HTMLElement) {
  return [...container.querySelectorAll('ol > li')].map((li) => {
    const number =
      li.querySelector('span[aria-hidden]')?.textContent?.trim() ?? ''
    const chip = [...li.querySelectorAll('span')]
      .map((s) => s.textContent?.trim() ?? '')
      .find((t) => t === 'Command' || t === 'In your editor')
    return {
      number,
      chip,
      panes: li.querySelectorAll('pre').length,
      copyButtons: li.querySelectorAll('button[aria-label^="Copy the"]').length,
    }
  })
}

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    configurable: true,
    writable: true,
  })
})

describe('the sandbox guide is a STEP SEQUENCE', () => {
  it('every step is ONE kind — none is both, none is neither', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const steps = readSteps(container)
    expect(steps.length).toBeGreaterThan(0)

    for (const step of steps) {
      // Exactly one chip, and it is one of the two kinds.
      expect(['Command', 'In your editor']).toContain(step.chip)
      // A command step carries exactly one copyable pane; a UI-instruction
      // step carries none. "Both" and "neither" are the two states the
      // restructure exists to remove, and this is where they would show up.
      if (step.chip === 'Command') {
        expect(step.panes).toBe(1)
        expect(step.copyButtons).toBe(1)
      } else {
        expect(step.panes).toBe(0)
        expect(step.copyButtons).toBe(0)
      }
    }
  })

  it('the sequence is numbered, ordered and GAPLESS, with the VS Code route lettered', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const numbers = readSteps(container).map((s) => s.number)

    // ⚠️ The LETTERS are the assertion, not decoration. 2a/2b/2c REPLACE step
    // 2 rather than following it, so a reader who has run `docker run` is not
    // invited to run them too. Renumbering them 6/7/8 would say the opposite.
    expect(numbers).toEqual(['1', '2', '2a', '2b', '2c', '3', '4', '5'])
  })

  it('the VS Code route MIXES kinds — UI, COMMAND, UI', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const route = readSteps(container).filter((s) => /^2[abc]$/.test(s.number))

    // 2b creates a DOTFILE folder, which no file picker will do — so it is a
    // command step, and the route is not homogeneous. Drawing it as though it
    // were is the defect this asserts against.
    expect(route.map((s) => s.chip)).toEqual([
      'In your editor',
      'Command',
      'In your editor',
    ])
  })

  it('the step sequence is ONE list, so a screen reader announces its length first', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const lists = [...container.querySelectorAll('ol')]
    expect(lists.length).toBe(1)
    expect(lists[0]!.querySelectorAll(':scope > li').length).toBe(8)
  })

  it('every copy button on the page announces DISTINCTLY', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const names = [
      ...container.querySelectorAll('button[aria-label^="Copy the"]'),
    ].map((b) => b.getAttribute('aria-label'))

    expect(names.length).toBeGreaterThan(0)
    // `/docs/sandbox` renders seven panes; "Copy" seven times tells a
    // screen-reader user nothing about which block they are on.
    expect(new Set(names).size).toBe(names.length)
  })

  it('a pane that is NOT a command has no copy button', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const text = container.textContent ?? ''
    // The workspace tree and the grant table are illustrations. A button
    // promising to copy them is a promise the pane cannot keep.
    expect(text).toContain('start the container from HERE')
    const names = [
      ...container.querySelectorAll('button[aria-label^="Copy the"]'),
    ].map((b) => b.getAttribute('aria-label') ?? '')
    expect(names.some((n) => n.includes('your machine command'))).toBe(false)
    expect(names.some((n) => n.includes('grant'))).toBe(false)
  })
})

describe('the profile selector drives EVERY profile to a complete command', () => {
  it('offers the eight profiles plus the agent-less image, one selected', async () => {
    await renderHydrated(await SandboxPage(EN_PAGE))
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(SANDBOX_PICKER_OPTIONS.length)
    expect(SANDBOX_PROFILES).toHaveLength(8)
    expect(
      radios.filter((r) => r.getAttribute('aria-checked') === 'true'),
    ).toHaveLength(1)
  })

  // ⚠️ THE TABLE-DRIVEN CASE IS THE POINT OF THIS SUITE. Five profiles have
  // one credential mount and three do not; a suite written against the default
  // passes for all of them and proves nothing about three.
  for (const profile of SANDBOX_PICKER_OPTIONS) {
    it(`renders a complete run command for ${profile.id} — ${profile.mounts.length} credential mount(s)`, async () => {
      const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
      await userEvent.click(screen.getByRole('radio', { name: profile.label }))

      const panes = () =>
        [...container.querySelectorAll('pre')].map((p) => p.textContent ?? '')
      await waitFor(() => {
        expect(
          panes().some((p) => p.includes(`motir-sandbox:${profile.id}`)),
        ).toBe(true)
      })

      const run = panes().find((p) => p.startsWith('docker run'))!
      expect(run).toBe(sandboxRunCommand(profile.id))

      // The workspace bind and the auth volume are MOTIR-4970's literal and are
      // on every profile; the credential mounts are what the picker varies.
      const vLines = run.split('\n').filter((l) => l.trim().startsWith('-v '))
      expect(vLines).toHaveLength(2 + profile.mounts.length)
      for (const mount of profile.mounts) {
        expect(run).toContain(mount.replace(/^~\//, '$HOME/'))
      }

      // Only `aider` forwards an environment variable, and it is the only
      // profile whose credential is not a file the image can bind.
      const eLines = run.split('\n').filter((l) => l.trim().startsWith('-e '))
      expect(eLines).toHaveLength(profile.env?.length ?? 0)
    })
  }

  it('⚠️ the three EXCEPTIONAL shapes are what a one-mount template would break', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const runFor = async (label: string) => {
      await userEvent.click(screen.getByRole('radio', { name: label }))
      return await waitFor(() => {
        const run = [...container.querySelectorAll('pre')]
          .map((p) => p.textContent ?? '')
          .find((p) => p.startsWith('docker run'))!
        expect(run).toBeTruthy()
        return run
      })
    }

    const opencode = await runFor('OpenCode')
    expect(
      opencode.split('\n').filter((l) => l.includes('opencode:ro')),
    ).toHaveLength(2)

    const antigravity = await runFor('Antigravity CLI')
    // Two `-v` lines only — the workspace and the auth volume. No credential.
    expect(
      antigravity.split('\n').filter((l) => l.trim().startsWith('-v ')),
    ).toHaveLength(2)

    const aider = await runFor('Aider')
    expect(aider).toContain('.aider.conf.yml')
    expect(aider).toContain('-e ANTHROPIC_API_KEY')
  })

  it('the profiles with a CAVEAT say so on step 2, and the others do not', async () => {
    // MOTIR-8056: a caveat is no longer a field of the profile. It is the
    // document's part `note-<profile id>`, so the set of profiles with one is
    // read from the document, and each is checked against its own opening words.
    const notes = new Map(
      splitParts(readFileSync('content/docs/sandbox/en.md', 'utf8'))
        .filter((part) => part.name.startsWith('note-'))
        .map((part) => [
          part.name.slice('note-'.length),
          part.text.trim().slice(0, 40),
        ]),
    )
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    for (const profile of SANDBOX_PICKER_OPTIONS) {
      await userEvent.click(screen.getByRole('radio', { name: profile.label }))
      const text = await waitFor(() => container.textContent ?? '')
      for (const [id, opening] of notes) {
        if (id === profile.id) expect(text).toContain(opening)
        // Another profile's caveat never rides along.
        else expect(text).not.toContain(opening)
      }
    }
    // A note that appeared on every profile would be prose, not a caveat.
    expect([...notes.keys()].sort()).toEqual([
      'aider',
      'antigravity',
      'base',
      'opencode',
    ])
    for (const id of notes.keys()) {
      expect(SANDBOX_PICKER_OPTIONS.map((p) => p.id)).toContain(id)
    }
    expect(notes.size).toBeLessThan(SANDBOX_PICKER_OPTIONS.length)
  })

  it('the devcontainer heredoc and its listing agree for EVERY profile', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    for (const profile of SANDBOX_PICKER_OPTIONS) {
      await userEvent.click(screen.getByRole('radio', { name: profile.label }))
      await waitFor(() => {
        const withMount = [...container.querySelectorAll('pre')]
          .map((p) => p.textContent ?? '')
          .filter((p) => p.includes('"workspaceMount"'))
        expect(withMount).toHaveLength(2)

        const heredoc = withMount.find((p) => p.includes("<<'JSON'"))!
        const listing = withMount.find((p) => !p.includes("<<'JSON'"))!
        // ⚠️ The two blocks agreed on the DEFAULT profile even while the
        // listing was a page-level constant. This is the assertion that would
        // have caught that: they have to agree for every profile, which is
        // only true if one object feeds both.
        expect(listing).toBe(sandboxDevcontainerJson(profile.id))
        expect(heredoc).toContain(listing)
      })
    }
  })

  it('the recipe MOTIR-4970 settled is carried through unchanged', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const run = [...container.querySelectorAll('pre')]
      .map((p) => p.textContent ?? '')
      .find((p) => p.startsWith('docker run'))!

    // The four properties the sibling bug settled, on the default rendering.
    expect(run).toContain('--rm')
    expect(run).toContain('--pull=always')
    expect(run).toContain('motir-auth:/home/node/.config/motir')
    expect(run).not.toContain('--name')
  })

  it('the VS Code route says pull-then-Rebuild, and the page scopes "goes stale" to the run command', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const text = container.textContent ?? ''
    // Step 2's own instruction, in the VS Code route rather than only prose elsewhere.
    expect(text).toMatch(/docker pull[\s\S]*Dev Containers: Rebuild Container/)
    // MOTIR-6120: the heading was untrue for the route the same page offers.
    expect(text).not.toContain('Nothing is kept that could go stale')
    expect(text).toContain(
      'On the run command, nothing is kept that could go stale',
    )
  })

  // MOTIR-6181: the palette offers Rebuild Container only in a window already
  // attached to the dev container, and a reader who has just run `docker pull`
  // on the host is in a local window. Every paragraph that names Rebuild
  // Container attaches them first, unconditionally — scoped per paragraph,
  // because step 2c's own Open Folder in Container sits between the warning and
  // the page's closing note and would satisfy a whole-page regex vacuously.
  it('attaches with Open Folder in Container before every Rebuild Container', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const paragraphs = [...container.querySelectorAll('p')]
      .map((p) => (p.textContent ?? '').replace(/\s+/g, ' '))
      .filter((t) => t.includes('Rebuild Container'))
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)
    for (const text of paragraphs) {
      expect(text).toMatch(
        /Dev Containers: Open Folder in Container[\s\S]*Dev Containers: Rebuild Container/,
      )
      expect(text).not.toMatch(/skip|if the window is already/i)
    }
    const warning = paragraphs.find((t) =>
      t.startsWith('A dev container keeps the image'),
    )!
    expect(warning).toMatch(
      /docker pull[\s\S]*Dev Containers: Open Folder in Container[\s\S]*Dev Containers: Rebuild Container/,
    )
    expect(warning).toMatch(
      /Rebuild Container only appears in a window attached to the container/,
    )
  })

  it('does not tell a Claude Code reader the container can never sign in', async () => {
    const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/can never perform/i)
    expect(text).toMatch(/Claude Code on macOS/)
    expect(text).toMatch(/inside\s+the container/)
  })
})
