import { render } from '@/tests/helpers/withCopy'
import { describe, expect, it } from 'vitest'
import SandboxPage from '@/app/[locale]/docs/(guides)/sandbox/SandboxRoute'
import { EN_PAGE } from '@/tests/helpers/locale'

/*
 * The sandbox guide's shape (MOTIR-4392).
 *
 * ⚠️ WHAT THIS FILE CAN AND CANNOT SEE, said plainly. It asserts that the page
 * is a GUIDE rather than a definition — that it carries runnable commands, names
 * the grant, names the refusal as intended behaviour, links commands rather than
 * restating them, and states its own boundary. It CANNOT verify that a flag or a
 * permission key it prints exists in motir-core: that is a second repository,
 * and this lane runs on every pull request without reaching it.
 *
 * That half of the card's criterion was discharged by READING, at authoring
 * time, and the page's own header records what was read and where — including
 * the card's grant list turning out to be wrong. The DURABLE version of the
 * check now exists on the other side of MOTIR-4390: `/api/docs/cli-commands.json`
 * publishes every command and flag, so a `tests/seam/` spec could hold this page
 * against it once that route is deployed. It belongs in that lane and not this
 * one, because `vitest.config.mts` excludes `tests/seam/**` for a stated reason
 * — an app.motir.co restart must not redden unrelated pull requests.
 */

describe('the sandbox guide is instructions, not a definition', () => {
  it('carries runnable command blocks — the page had ZERO before this card', async () => {
    const { container } = render(await SandboxPage(EN_PAGE))
    const panes = container.querySelectorAll('pre')
    expect(panes.length).toBeGreaterThan(0)
    const text = [...panes].map((pane) => pane.textContent ?? '').join('\n')
    expect(text).toContain('docker pull ghcr.io/motir-co/motir-sandbox')
    expect(text).toContain('docker run')
    expect(text).toContain('motir link')
    expect(text).toContain('motir doctor')
  })

  it('publishes the DISPOSABLE recipe, and nothing that keeps a container', async () => {
    // ⚠️ TRANSCRIBED, NOT DERIVED (MOTIR-4976 · MOTIR-4972). The literal below is
    // read off motir-core's `sandboxRunCommand` in `lib/apiDocs/sandbox.ts` and
    // copied here, the same rule MOTIR-4961 recorded for this file: this page's
    // claims are transcribed and cited, because a build-time import across the
    // repository boundary is a seam nobody asked for.
    //
    // What it guards is the defect, not the spelling. `motir login` used to write
    // into the container's writable layer, so this page told readers to name the
    // container and come back to it with `docker start -ai` — and keeping the
    // container is what pinned them to the image it was built from. A reader's
    // six-week-old container ran a CLI with no `login` command while step 4 told
    // them to run it.
    const { container } = render(await SandboxPage(EN_PAGE))
    const code = [...container.querySelectorAll('pre')]
      .map((pane) => pane.textContent ?? '')
      .join('\n')

    expect(code).toContain('docker run -it --rm --pull=always')
    // The volume is what makes `--rm` safe: the sign-in lives outside the
    // container, so throwing the container away no longer throws it away too.
    expect(code).toContain('-v motir-auth:/home/node/.config/motir')
    // The agent credential stays read-only — the container USES a sign-in and
    // never performs one.
    expect(code).toContain('-v "$HOME/.claude:/home/node/.claude:ro"')

    // ⚠️ AND THE PROSE, NOT ONLY THE BLOCK. The page did not merely omit the
    // disposable pattern — it argued against it, telling the reader to come back
    // with `docker start -ai motir-sandbox`. A reader who trusts the surrounding
    // explanation over the command would put the container back.
    const text = container.textContent ?? ''
    for (const stale of ['docker start', 'docker rm', '--name motir-sandbox']) {
      expect(code, `code blocks must not carry ${stale}`).not.toContain(stale)
      expect(text, `prose must not carry ${stale}`).not.toContain(stale)
    }

    // A reader meeting `--rm` needs to be told the sign-in survives, or the flag
    // reads as "you will sign in every time" — the fear this recipe has to answer.
    expect(text).toContain('motir-auth')
    expect(text).toContain('sign-in survives')
  })

  it('documents the five things a reader needs: start, environment, grant, output, failures', async () => {
    // ⚠️ WIDENED BY MOTIR-4429 — three sections the deleted motir-core page
    // carried and this one had lost. The list is EXACT rather than a subset
    // check, deliberately: it is what makes a section quietly disappearing a
    // red test rather than a shorter page nobody measures, which is the family
    // of defect MOTIR-4375 → MOTIR-4429 is entirely made of.
    const { container } = render(await SandboxPage(EN_PAGE))
    const headings = [...container.querySelectorAll('h2')].map(
      (heading) => heading.textContent ?? '',
    )
    // ⚠️ RE-POINTED BY MOTIR-4993, and the EXACTNESS is kept because that is
    // the whole value of this assertion. Four `<h2>`s — `Before you start`,
    // `Start one`, `Or start it from VS Code instead` and
    // `Inside: link, check, run` — became ONE step sequence under `Set it up`,
    // and `What it confines` moved BELOW it with the rest of the explanation.
    //
    // ⚠️ THE SECTIONS DID NOT DISAPPEAR, WHICH IS THE THING THIS GUARD IS FOR.
    // Every FACT they carried is still asserted, by the cases below and by the
    // step-structure suite: the arm64 line and the workspace tree are in the
    // preconditions block, `Start one` and `Inside` are steps 1–5, and the VS
    // Code route is 2a–2c. `Before you start` is still on the page as an
    // eyebrow rather than an `<h2>` — a heading above a three-item list, in a
    // page whose spine is now the numbered sequence.
    // ⚠️ RE-POINTED BY MOTIR-8056. The two eyebrows ('Before you start', 'Why it
    // looks like this') were paragraphs in the JSX; in the page's document they
    // are headings, because a document has no eyebrow that is not an `##` (the
    // renderer draws every `##` as the eyebrow), and a heading carries the
    // `{#id}` a translation keeps. The list stays EXACT.
    expect(headings).toEqual([
      'Before you start',
      'Set it up',
      'Why it looks like this',
      'What it confines — and what it does not',
      'What the environment gives you',
      'What the token may do — and what it refuses',
      'What a run produces, and where to read it',
      'When it does not work',
      'What this page does not cover',
    ])
  })

  /*
   * ── The three restored sections (MOTIR-4429) ──────────────────────────────
   *
   * Each case asserts the FACT the section exists to carry, not the heading —
   * a heading is already pinned above, and a section that kept its title while
   * losing its content is the exact shape MOTIR-4397's ledger found.
   */

  it('says the NETWORK is open, so the confinement claim is not read as total', async () => {
    // The page's opening paragraph says an agent "reaches your work tree and
    // not the rest of your machine". The deleted page qualified that: egress
    // is NOT confined. A confinement claim with its exception deleted is a
    // different and false claim, which is why this is a correction as much as
    // a restore — `Network` and `unprivileged` each appeared ZERO times.
    const { container } = render(await SandboxPage(EN_PAGE))
    const text = container.textContent ?? ''
    expect(text).toMatch(/Network\s*—\s*OPEN, by design/)
    expect(text).toContain(
      'confines the filesystem blast radius and not egress',
    )
    expect(text).toContain('uid 1000')
  })

  it('states the prerequisites, INCLUDING the arm64 fact', async () => {
    const { container } = render(await SandboxPage(EN_PAGE))
    const text = container.textContent ?? ''
    expect(text).toContain('Docker, running')
    expect(text).toContain('linux/arm64')
    expect(text).toContain('nothing is emulated')
    // The folder you mount CONTAINS your checkouts — drawn as a tree, because
    // the sentence alone is what the page had been reduced to.
    const panes = [...container.querySelectorAll('pre')].map(
      (pane) => pane.textContent ?? '',
    )
    expect(panes.join('\n')).toContain('start the container from HERE')
  })

  it('documents the VS Code path, with the heredoc quoted', async () => {
    const { container } = render(await SandboxPage(EN_PAGE))
    const text = container.textContent ?? ''
    expect(text).toContain('Dev Containers')
    const panes = [...container.querySelectorAll('pre')].map(
      (pane) => pane.textContent ?? '',
    )
    const code = panes.join('\n')
    expect(code).toContain('.devcontainer/devcontainer.json')

    // ⚠️ THE DELIMITER IS QUOTED, and that is the assertion worth having.
    // Unquoted, the shell expands the two substitutions to empty strings on
    // the way into the file and the reader gets a container that mounts
    // nothing and finds no credential — a silent failure strictly worse than
    // being stuck. Review cannot be relied on to notice a missing quote.
    expect(code).toContain("<<'JSON'")
    expect(code).toContain('${localWorkspaceFolder}')
    expect(code).toContain('${localEnv:HOME}')
  })

  it('builds BOTH devcontainer blocks from one object, so they cannot disagree', async () => {
    // The listing and the heredoc show the same config under two captions. Two
    // typed copies is a `mounts` entry corrected in one of them and published
    // wrong in the other.
    const { container } = render(await SandboxPage(EN_PAGE))
    const panes = [...container.querySelectorAll('pre')].map(
      (pane) => pane.textContent ?? '',
    )
    const withMount = panes.filter((pane) => pane.includes('"workspaceMount"'))
    expect(withMount.length).toBe(2)

    const heredoc = withMount.find((pane) => pane.includes("<<'JSON'"))
    const listing = withMount.find((pane) => !pane.includes("<<'JSON'"))
    expect(heredoc).toBeDefined()
    expect(listing).toBeDefined()
    // The heredoc CONTAINS the listing verbatim — which is only true if one is
    // interpolated into the other rather than typed twice.
    expect(heredoc).toContain(listing!)

    // ⚠️ AND BOTH SHOW THE `postStartCommand` (MOTIR-4961 / MOTIR-4956).
    // `overrideCommand: true` makes Dev Containers replace the image's
    // ENTRYPOINT as well as its CMD, so this route ran none of the container's
    // own setup: the agent was pointed at a read-only directory it could
    // neither read a credential from nor sign in to, while the page offered
    // this recipe and the `docker run` one as equals. The line is what makes
    // them equal again, so a copy of this page that has lost it publishes the
    // broken recipe — named here rather than left to the interpolation test
    // above, which would keep passing on two identically-wrong blocks.
    for (const pane of withMount) {
      expect(pane).toContain(
        '"postStartCommand": "motir-sandbox-agent-config || true"',
      )
    }
    // …and `overrideCommand` STAYS: the image's own command exits, so dropping
    // it trades a container nobody can sign in to for one that will not stay up.
    for (const pane of withMount) {
      expect(pane).toContain('"overrideCommand": true')
    }
  })

  it('no longer records the VS Code path as undocumented', async () => {
    // The closing paragraph said the editor integrations "are not documented
    // here yet" — a deleted section recorded as a decision. It was neither.
    const { container } = render(await SandboxPage(EN_PAGE))
    expect(container.textContent).not.toMatch(
      /editor integrations, are not documented/,
    )
  })

  it('lists the grant the SHIPPED constant carries, not the card’s four', async () => {
    // ⚠️ MOTIR-4392 states the grant as four keys. `CLI_TOKEN_GRANT` on
    // motir-core's `origin/main` carries six — `lesson:view` and
    // `lesson:reinforce` were added by MOTIR-3480 and MOTIR-3553. The page
    // carries the shipped set; this pins that it was not quietly reverted to
    // the card's list by a later editor reading the card and not the constant.
    const { container } = render(await SandboxPage(EN_PAGE))
    const text = container.textContent ?? ''
    for (const key of [
      'project:browse',
      'lesson:view',
      'lesson:reinforce',
      'work_item:edit',
      'comment:add',
      'ai:plan',
    ]) {
      expect(text, key).toContain(key)
    }
  })

  it('names the plan-append refusal as INTENDED behaviour, not an error', async () => {
    const { container } = render(await SandboxPage(EN_PAGE))
    const text = container.textContent ?? ''
    expect(text).toContain('ai:view_plan')
    // The key half: a reader who meets the refusal must be told it is the
    // design. A page that merely listed the missing key would leave them
    // filing a bug against a working guard.
    expect(text).toMatch(/refus/i)
    expect(text).toMatch(/the design rather than a bug/i)
  })

  it('LINKS the command reference instead of restating it — one home per fact', async () => {
    const { container } = render(await SandboxPage(EN_PAGE))
    const hrefs = [...container.querySelectorAll('a')].map((a) =>
      a.getAttribute('href'),
    )
    expect(hrefs).toContain('/docs/cli')
    // A restated command TABLE is the thing being avoided; the page may still
    // show the handful of commands a first run types.
    expect(container.querySelectorAll('table').length).toBe(0)
  })

  it('states its own boundary, so the split with /docs/cli is legible', async () => {
    const { container } = render(await SandboxPage(EN_PAGE))
    expect(container.textContent).toContain('What this page does not cover')
  })
})
