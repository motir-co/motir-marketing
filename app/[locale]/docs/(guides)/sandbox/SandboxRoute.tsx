import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import type { ReactNode } from 'react'
import { getCopy } from '@/lib/copy'
import {
  SANDBOX_AUTH_VOLUME,
  SANDBOX_PICKER_OPTIONS,
  SANDBOX_PROFILES,
} from '@/lib/sandboxProfiles'
import { CodeBlock } from '../../_components/DocSchema'
import { renderDocsParts } from '../../_components/DocsDocument'
import { SetupStepsIsland } from '@/app/_islands'
import type { SetupStepsText } from './SetupSteps'
import { STEP_IDS } from './stepIds'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * The sandbox guide (MOTIR-4046, WRITTEN by MOTIR-4392) — committed prose, per
 * `lib/docs.ts`'s carve-out: the guide / policy / MCP / CLI / sandbox pages are
 * AUTHORED documentation rather than a registry, which is why they are allowed
 * to live in this repository at all.
 *
 * ⚠️ WHAT THIS CARD FIXED. The page was two sentences, zero `<code>` and zero
 * `<pre>`. Both sentences were accurate and neither was actionable: a reader
 * finished the page knowing what a sandbox IS and with no way to cause one to
 * exist. A definition is not a guide.
 *
 * ── Every claim below was READ off motir-core at `origin/main`, not restated ─
 * The card said in terms not to trust its own summary of these, and it was right
 * to: its summary of the grant was WRONG.
 *
 *   · the image, its tags and the profile list — `lib/apiDocs/sandbox.ts`
 *     (`SANDBOX_IMAGE`, `SANDBOX_CONTAINER_NAME`, `sandboxProfileRows()` derived
 *     from the CLI's own `AGENT_PROFILES`); the `docker pull` / `docker run`
 *     lines are what `sandboxPullCommand` / `sandboxRunCommand` emit for the
 *     `claude` profile, verbatim.
 *   · every command and flag — `packages/cli/src/commandCatalog.ts`.
 *   · the grant — `lib/mcp/toolPermissions.ts`'s `CLI_TOKEN_GRANT`.
 *
 * ⚠️ THE CARD'S OWN GRANT LIST WAS FALSIFIED, and this page carries the shipped
 * one. MOTIR-4392 states the grant as four keys — `project:browse`,
 * `work_item:edit`, `comment:add`, `ai:plan`. The constant on `origin/main`
 * carries SIX: `lesson:view` and `lesson:reinforce` were added deliberately, by
 * MOTIR-3480 and MOTIR-3553, each with its argument written at the line. The
 * half of the card's claim that matters is unchanged and TRUE: `ai:view_plan` is
 * absent, which is why a sandboxed run can open a plan and is refused on its
 * first append.
 *
 * ── The boundary with `/docs/cli` ──────────────────────────────────────────
 * Commands are LINKED, never restated — one home per fact. This page owns the
 * environment a run executes inside; that page owns what you type.
 *
 * ── ⚠️ THREE SECTIONS RESTORED (MOTIR-4429) ────────────────────────────────
 * MOTIR-4397's parity ledger found three things the deleted `motir-core` page
 * at `95a2d4468^` (`lib/apiDocs/sandbox.ts`) carried and this one did not:
 *
 *  1. **What it confines — and what it does not.** The most important of the
 *     three, and the one nobody measured: the page opened by saying an agent
 *     "reaches your work tree and not the rest of your machine" while the
 *     original said in terms that the NETWORK is open by design. A confinement
 *     claim with its exception deleted is not a smaller claim, it is a
 *     different and false one — so this is a correction as much as a restore.
 *     `Network` and `unprivileged` both appeared ZERO times here.
 *  2. **Before you start.** The Docker prerequisite, the `linux/arm64` fact
 *     (Apple Silicon is native; nothing is emulated), the agent sign-in that
 *     must exist on the host, and the folder tree showing that you mount the
 *     directory CONTAINING your checkouts. The page had compressed the last of
 *     these to one clause and dropped the rest.
 *  3. **Or start it from VS Code instead.** `devcontainer` and `VS Code` both
 *     appeared ZERO times, and the page's closing paragraph listed the editor
 *     integrations as "not documented here yet" — a deletion recorded as a
 *     decision. It was neither: the original documented them.
 *
 * ⚠️ THE HEREDOC DELIMITER IS QUOTED — `<<'JSON'` — and that is load-bearing.
 * Unquoted, the shell expands `${localWorkspaceFolder}` and `${localEnv:HOME}`
 * to empty strings on the way into the file, and the reader gets a container
 * that mounts nothing and finds no credential: a silent failure strictly worse
 * than being stuck. `tests/docs/sandbox.test.tsx` greps for the quoted form
 * rather than trusting review, which is what the deleted module did too.
 *
 * ⚠️ THE `postStartCommand` LINE IS TRANSCRIBED, NOT INVENTED (MOTIR-4961).
 * `overrideCommand: true` makes Dev Containers replace the image's ENTRYPOINT
 * as well as its CMD, so this route ran none of the container's own setup and
 * an agent started here had no writable config directory to sign in to — the
 * `docker run` recipe on this same page worked and this one could not, while
 * the page offered them as equals (MOTIR-4956). The string is copied VERBATIM
 * from the recipe motir-core ships, read at `lib/apiDocs/sandbox.ts`'s
 * `SANDBOX_DEVCONTAINER_JSON`; it is deliberately not derived at build time,
 * for the same reason every other claim on this page is transcribed rather than
 * imported across a repository boundary. The `|| true` is part of the literal:
 * it keeps an older pinned `:<profile>-<version>` image, which has no such
 * command, starting rather than erroring.
 *
 * ⚠️ AND ONE OBJECT, TWO BLOCKS. The listing and the heredoc are built from
 * `DEVCONTAINER_JSON`, so a `mounts` entry corrected in one cannot publish a
 * different config under the other caption.
 *
 * ⚠️ THE OPENING SENTENCE SAID "a coding agent" (MOTIR-4508). Motir's agents do
 * design, decision, content, test and code work — the sandbox runs an agent, not
 * specifically a coding one, and the narrower word sells a narrower product on
 * the page a developer reads immediately before deciding whether to run it. It
 * now reads "your own agent", which is how the next sentence already writes it.
 * `tests/copy.test.ts` bans the phrase and could not see this one: it walks the
 * copy CATALOGUE, and this is JSX prose. `tests/docs/terminology.test.tsx` is
 * the surface-correct guard — it runs the same three predicates over what every
 * `/docs` page RENDERS, which is also the only kind that can see a phrase JSX
 * has line-wrapped, as this one was.
 *
 * ── THE PROSE LIVES IN `content/docs/sandbox/<locale>.md` (MOTIR-8056) ─────
 * Every sentence this file and `SetupSteps.tsx` used to carry is in the
 * document, so a translation can reach it. What stays here is what a reader
 * copies or a profile decides: the two illustrative blocks below, the commands
 * and dev-container JSON in `lib/sandboxProfiles.ts`, and the values the prose
 * must not restate (the volume name, the two docker command names, the sign-out
 * command). The document's parts: `body` is the opening and the preconditions;
 * the picker, chip, step, note and `devcontainer-file` parts are the text of
 * `SetupSteps`, a client component that cannot read a document itself, so they
 * cross as rendered nodes; `why` is everything from 'Why it looks like this' on.
 * The document is resolved ONCE, so a stale translation falls back as a whole.
 *
 * A heading had no id before this card (the page used none); each now carries
 * one in the document, which a translated heading keeps.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/sandbox', (copy) => ({
    title: copy.docs.metaTitleSandbox,
    description: copy.docs.metaDescriptionSandbox,
  }))
}

// Not a command — a diagram. `copyable={false}` is the design's filled-in-block-only
// asymmetry: a pane you cannot usefully paste must not offer a button that says you can.
const WORKSPACE_TREE = `~/work/                 ← start the container from HERE
├── motir-core/         ← a checkout
└── motir-ai/           ← another`

// A permission table, not a command — see `copyable` on `CodeBlock`.
const TOKEN_GRANT = `project:browse      read the project and its work items
lesson:view         search the recorded lessons before building
lesson:reinforce    record that a lesson described what went wrong
work_item:edit      edit the item it is running, and file a bug
comment:add         comment on the item
ai:plan             open a plan`

export default async function SandboxPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const labels = copy.docs.guideLabels

  const slots: Record<string, ReactNode> = {
    workspace: (
      <div className="mt-3">
        <CodeBlock
          caption={labels.captionYourMachine}
          copyable={false}
          code={WORKSPACE_TREE}
        />
      </div>
    ),
    grant: (
      <div className="mt-3">
        <CodeBlock
          caption={labels.captionSandboxGrant}
          copyable={false}
          code={TOKEN_GRANT}
        />
      </div>
    ),
  }
  const values: Record<string, ReactNode> = {
    cliPage: copy.docs.cli,
    mcpPage: copy.docs.mcp,
    apiPage: copy.docs.api,
    authVolume: SANDBOX_AUTH_VOLUME,
    dockerPull: 'docker pull',
    dockerRun: 'docker run',
    signOutCommand: `docker volume rm ${SANDBOX_AUTH_VOLUME}`,
  }
  const { parts, names, note } = await renderDocsParts({
    slug: 'sandbox',
    locale,
    slots,
    values: { ...values, profileLabel: SANDBOX_PICKER_OPTIONS[0]!.label },
  })
  /*
   * The picker's summary names the chosen agent where the translation puts it
   * (`{{value:profileLabel}}`). A built page cannot fill that in when the reader
   * picks, so the sentence is rendered once per option, with that option's
   * name, and the island shows the one picked (MOTIR-10645).
   */
  const summary: Record<string, ReactNode> = {}
  for (const option of SANDBOX_PICKER_OPTIONS) {
    const rendered = await renderDocsParts({
      slug: 'sandbox',
      locale,
      slots,
      values: { ...values, profileLabel: option.label },
    })
    summary[option.id] = rendered.parts['picker-summary']
  }

  const steps = Object.fromEntries(
    STEP_IDS.map((id) => [
      id,
      {
        intent: parts[`step-${id}-intent`],
        body: parts[`step-${id}-body`],
        extra:
          id === '2'
            ? parts['step-2-vscode']
            : id === '2b'
              ? parts['step-2b-warning']
              : undefined,
      },
    ]),
  ) as SetupStepsText['steps']
  // A profile with a caveat has a `note-<id>` part; one without has none.
  const notes: Record<string, ReactNode> = {}
  for (const id of [...SANDBOX_PROFILES.map((p) => p.id), 'base']) {
    if (names.includes(`note-${id}`)) notes[id] = parts[`note-${id}`]
  }
  const text: SetupStepsText = {
    agentProfile: labels.sandboxAgentProfile,
    picker: {
      label: parts['picker-label'],
      alsoSupported: parts['picker-also-supported'],
      or: parts['picker-or'],
      base: parts['picker-base'],
      summary,
    },
    chips: { command: parts['chip-command'], ui: parts['chip-editor'] },
    intro: parts['steps-intro'],
    steps,
    notes,
    devcontainerFile: parts['devcontainer-file'],
    captions: {
      pull: labels.captionSandboxPull,
      run: labels.captionSandboxRun,
      devcontainerCommand: labels.captionSandboxDevcontainerCommand,
      inContainer: labels.captionInContainer,
      copyDevcontainer: labels.copySandboxDevcontainer,
      copySignIn: labels.copySandboxSignIn,
      copyLink: labels.copySandboxLink,
      copyCheck: labels.copySandboxCheck,
    },
  }

  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.sandbox}
      </h1>
      {note}
      {parts.body}
      <SetupStepsIsland text={text} />
      <hr className="mt-8 border-0 border-t border-(--el-border)" />
      {parts.why}
    </>
  )
}
