import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import SandboxPage from '@/app/[locale]/docs/(guides)/sandbox/SandboxRoute'
import {
  SetupSteps,
  type SetupStepsText,
} from '@/app/[locale]/docs/(guides)/sandbox/SetupSteps'
import { STEP_IDS } from '@/app/[locale]/docs/(guides)/sandbox/stepIds'
import { documentInvariants } from '@/lib/docsDocuments'
import { SANDBOX_PICKER_OPTIONS } from '@/lib/sandboxProfiles'
import { render, renderHydrated } from '@/tests/helpers/withCopy'
import { EN_PAGE } from '@/tests/helpers/locale'
import { normalise, shownHtml } from './fixtures/apiMoveCases'
import baseline from './fixtures/sandbox-move-baseline.json'

// The ten translations are in the repository now; this file asserts the page when a
// translation is MISSING, so `resolveDocsDocument` reads an English-only copy.
vi.mock('@/lib/docsDocuments', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/docsDocuments')>()
  const { englishOnlyRoot } = await import('@/tests/helpers/englishOnlyDocs')
  const englishOnly = englishOnlyRoot()
  return {
    ...real,
    resolveDocsDocument: (slug: string, locale: never, root?: string) =>
      real.resolveDocsDocument(slug, locale, root ?? englishOnly),
  }
})

/*
 * MOTIR-8056 — /docs/sandbox moves from JSX prose (the page and the client
 * component `SetupSteps`) and one note per profile in `lib/sandboxProfiles.ts`
 * to `content/docs/sandbox/en.md`.
 *
 * ── The snapshot ────────────────────────────────────────────────────────────
 * `fixtures/sandbox-move-baseline.json` is the page as it rendered at the card's
 * base (the parent branch at 4219111, before any file of this change existed).
 * A temporary test, deleted afterwards, rendered `SandboxPage` once, clicked
 * each radio of `SANDBOX_PICKER_OPTIONS` in turn and recorded, per profile: the
 * container's `innerHTML` with every tag replaced by a space and whitespace
 * normalised (`normalise`, shared with the other moves), every element `id`
 * in document order, every <pre> payload (which is also each copy button's
 * payload, `CodeBlock` handing the same string to both) and the copy buttons'
 * accessible names. Do not regenerate it to make a red test green: the move is
 * meant to be invisible, and a changed word is the finding.
 *
 * ── What is allowed to differ, and nothing else ─────────────────────────────
 * Nothing in the text. (The page never carried an id, so `ids` is empty; the
 * headings gain ids, asserted below.) Styling differs — the document renders
 * its headings and lists in the renderer's styles — and that is not text.
 */

const fixture = baseline as Record<
  string,
  { text: string; ids: string[]; payloads: string[]; copyLabels: string[] }
>

async function read(profile: (typeof SANDBOX_PICKER_OPTIONS)[number]) {
  const { container } = await renderHydrated(await SandboxPage(EN_PAGE))
  await userEvent.click(screen.getByRole('radio', { name: profile.label }))
  await waitFor(() => {
    expect(container.textContent).toContain(`motir-sandbox:${profile.id}`)
    expect(container.textContent).toContain(
      `Every command below is for ${profile.label}`,
    )
  })
  return {
    text: normalise(shownHtml(container)),
    payloads: [...container.querySelectorAll('pre')].map(
      (pre) => pre.textContent ?? '',
    ),
    copyLabels: [...container.querySelectorAll('button[aria-label]')].map(
      (button) => button.getAttribute('aria-label'),
    ),
    ids: [...container.querySelectorAll('[id]')].map((e) => e.id),
  }
}

describe('/docs/sandbox reads the same after the move, for every profile', () => {
  it('has a baseline for each picker option', () => {
    expect(Object.keys(fixture)).toEqual(
      SANDBOX_PICKER_OPTIONS.map((option) => option.id),
    )
  })

  for (const profile of SANDBOX_PICKER_OPTIONS) {
    describe(profile.id, () => {
      it('has the text it had before, word for word', async () => {
        expect((await read(profile)).text).toBe(fixture[profile.id]!.text)
      })

      it('shows every code block byte for byte, and names every copy button as before', async () => {
        const after = await read(profile)
        expect(after.payloads).toEqual(fixture[profile.id]!.payloads)
        expect(after.copyLabels).toEqual(fixture[profile.id]!.copyLabels)
      })

      it('still renders every id it rendered', async () => {
        const { ids } = await read(profile)
        for (const id of fixture[profile.id]!.ids) expect(ids, id).toContain(id)
      })
    })
  }

  it('the headings gain the ids the document gives them', async () => {
    const { ids } = await read(SANDBOX_PICKER_OPTIONS[0]!)
    expect(ids).toEqual([
      'before-you-start',
      'set-it-up',
      'devcontainer-file',
      'why',
      'profile-picker',
      'run-command',
      'what-next',
      'confines',
      'environment',
      'token',
      'produces',
      'troubleshooting',
      'agent-binary-not-found',
      'agent-not-authenticated',
      'nothing-ready',
      'stopped-on-replan',
      'work-left-behind',
      'not-covered',
    ])
  })
})

describe('the document', () => {
  const markdown = readFileSync('content/docs/sandbox/en.md', 'utf8')

  it('has no fenced block, no docker command and an {#id} on every heading', () => {
    expect(markdown).not.toMatch(/^ {0,3}(```|~~~)/m)
    expect(markdown).not.toMatch(/^\s*docker /m)
    // Not even a command NAMED in prose: `docker pull` and `docker run` are values.
    expect(markdown).not.toMatch(/\bdocker (pull|run|volume|exec|build)\b/)
    const headings = markdown.split('\n').filter((l) => /^#{1,6}\s/.test(l))
    expect(documentInvariants(markdown).anchors).toHaveLength(headings.length)
  })

  it('holds a part for every string SetupSteps shows, and a note only for the profiles with one', () => {
    const { parts, slots, values } = documentInvariants(markdown)
    expect(slots).toEqual(['workspace', 'grant'])
    expect([...new Set(values)].sort()).toEqual(
      [
        'apiPage',
        'authVolume',
        'cliPage',
        'dockerPull',
        'dockerRun',
        'mcpPage',
        'profileLabel',
        'signOutCommand',
      ].sort(),
    )
    const stepParts = STEP_IDS.flatMap((id) => [
      `step-${id}-intent`,
      `step-${id}-body`,
    ])
    for (const name of [
      'picker-label',
      'picker-also-supported',
      'picker-or',
      'picker-base',
      'picker-summary',
      'chip-command',
      'chip-editor',
      'steps-intro',
      ...stepParts,
      'step-2-vscode',
      'step-2b-warning',
      'devcontainer-file',
      'why',
    ]) {
      expect(parts, name).toContain(name)
    }
    expect(parts.filter((name) => name.startsWith('note-')).sort()).toEqual([
      'note-aider',
      'note-antigravity',
      'note-base',
      'note-opencode',
    ])
  })
})

describe('the literals stay in TypeScript', () => {
  it('no profile carries a human note, and the picker offers the same options', () => {
    for (const option of SANDBOX_PICKER_OPTIONS) {
      expect(Object.keys(option), option.id).not.toContain('note')
    }
    expect(SANDBOX_PICKER_OPTIONS.map((o) => o.id)).toEqual([
      'claude',
      'codex',
      'opencode',
      'kimi',
      'antigravity',
      'cursor',
      'aider',
      'goose',
      'base',
    ])
  })
})

/** JSX text and string literals outside imports, class names and the code in `code=` / `label=`. */
function sentences(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const found: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) return
    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text === 'generateMetadata'
    )
      return
    if (
      ts.isJsxAttribute(node) &&
      ['className', 'code'].includes(node.name.getText())
    )
      return
    // The two illustrative blocks the page keeps in TypeScript.
    if (
      ts.isVariableDeclaration(node) &&
      ['WORKSPACE_TREE', 'TOKEN_GRANT'].includes(node.name.getText())
    )
      return
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      found.push(node.text)
    } else if (ts.isJsxText(node)) {
      found.push(node.text.replace(/\s+/g, ' ').trim())
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found.filter(Boolean)
}

describe('no English in the TSX', () => {
  for (const file of ['SandboxRoute.tsx', 'SetupSteps.tsx']) {
    it(`${file} holds no word group`, () => {
      const path = join('app/[locale]/docs/(guides)/sandbox', file)
      const prose = sentences(path)
        .filter((text) => text !== 'use client')
        // The command names the page hands the document as values.
        .filter((text) => !/^docker (pull|run|volume rm)\b/.test(text))
        .filter((text) => text.split(/\s+/).filter(Boolean).length > 1)
      expect(prose).toEqual([])
    })
  }
})

describe('SetupSteps renders only what it is given', () => {
  const token = (name: string) => `⟦${name}⟧`
  const text: SetupStepsText = {
    agentProfile: token('agentProfile'),
    picker: {
      label: token('picker.label'),
      alsoSupported: token('picker.alsoSupported'),
      or: token('picker.or'),
      base: token('picker.base'),
      // One sentence per option, each naming its own agent (MOTIR-10645).
      summary: Object.fromEntries(
        SANDBOX_PICKER_OPTIONS.map((option) => [
          option.id,
          <>
            {token('picker.summary')}
            {option.label}
          </>,
        ]),
      ),
    },
    chips: { command: token('chip.command'), ui: token('chip.ui') },
    intro: token('intro'),
    steps: Object.fromEntries(
      STEP_IDS.map((id) => [
        id,
        {
          intent: token(`${id}.intent`),
          body: token(`${id}.body`),
          extra: id === '2' || id === '2b' ? token(`${id}.extra`) : undefined,
        },
      ]),
    ) as SetupStepsText['steps'],
    notes: { aider: token('note.aider') },
    devcontainerFile: token('devcontainerFile'),
    captions: {
      pull: token('caption.pull'),
      run: token('caption.run'),
      devcontainerCommand: token('caption.devcontainerCommand'),
      inContainer: token('caption.inContainer'),
      copyDevcontainer: token('copy.devcontainer'),
      copySignIn: token('copy.signIn'),
      copyLink: token('copy.link'),
      copyCheck: token('copy.check'),
    },
  }

  /** What a reader reads outside the code panes and the copy buttons. */
  function proseOf(container: HTMLElement): string {
    const clone = container.cloneNode(true) as HTMLElement
    for (const node of clone.querySelectorAll(
      'pre, button:not([role="radio"]), [role="note"]',
    )) {
      node.remove()
    }
    return clone.textContent ?? ''
  }

  it('shows the fixture strings, the agents’ own names and nothing else', async () => {
    const { container } = render(<SetupSteps text={text} />)
    const prose = proseOf(container)
    // Every fixture string is present …
    const given = JSON.stringify(text).match(/⟦[^⟧]+⟧/g) ?? []
    for (const name of new Set(given)) {
      if (name === token('note.aider')) continue // only on the aider profile
      if (name.startsWith('⟦caption.') || name.startsWith('⟦copy.')) continue // pane chrome
      if (name === token('agentProfile')) continue // an accessible name
      expect(prose, name).toContain(name)
    }
    // … and once they are taken out, what is left is the step numerals, the
    // vendor names, the profile picked and the one caption that is a file name:
    // no English sentence of the component's own.
    const rest = prose.replace(/⟦[^⟧]+⟧/g, '').replace(/\s+/g, '')
    const vendors = SANDBOX_PICKER_OPTIONS.filter((o) => o.id !== 'base')
      .map((o) => o.label.replace(/\s+/g, ''))
      .join('')
    expect(rest).toBe(
      `${vendors}ClaudeCode${STEP_IDS.join('')}.devcontainer/devcontainer.json`,
    )
  })

  it('shows the note of the profile picked, and the picked profile’s own name in the summary', async () => {
    const { container } = render(<SetupSteps text={text} />)
    expect(proseOf(container)).not.toContain(token('note.aider'))
    await userEvent.click(screen.getByRole('radio', { name: 'Aider' }))
    expect(proseOf(container)).toContain(token('note.aider'))
    expect(proseOf(container)).toContain(`${token('picker.summary')}Aider`)
    // The agent-less image is named by the document.
    expect(
      screen.getByRole('radio', { name: token('picker.base') }),
    ).toBeTruthy()
    expect(
      screen.getByRole('radiogroup', { name: token('agentProfile') }),
    ).toBeTruthy()
  })
})

describe('the page in another language', () => {
  it('/de/docs/sandbox: no translation yet, so the English renders under the note with the same commands', async () => {
    const payloads = (c: HTMLElement) =>
      [...c.querySelectorAll('pre')].map((pre) => pre.textContent)
    const en = render(await SandboxPage(EN_PAGE)).container
    const de = render(
      await SandboxPage({ params: Promise.resolve({ locale: 'de' }) }),
    ).container
    expect(payloads(de)).toEqual(payloads(en))
    expect(de.querySelector('[role="note"]')).not.toBeNull()
    // The captions and the radio group's name are the catalogue's, in German.
    expect(
      de.querySelector('[role="radiogroup"]')?.getAttribute('aria-label'),
    ).toBe('Agent-Profil')
  })
})
