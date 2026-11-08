'use client'

import { useState, type ReactNode } from 'react'
import { CopyControls } from '../../_components/CopyControls'
import { CodePane, type CodeBlockProps } from '../../_components/CodePane'
import {
  SANDBOX_PICKER_OPTIONS,
  SANDBOX_PROFILES,
  findProfile,
  sandboxDevcontainerJson,
  sandboxDevcontainerWriteCommand,
  sandboxPullCommand,
  sandboxRunCommand,
} from '@/lib/sandboxProfiles'
import type { StepId } from './stepIds'

/*
 * THE STEPPED SETUP SEQUENCE (MOTIR-4993) — built to
 * `design/docs/design-notes.md` § `sandbox-steps.*`, drawn in
 * `design/docs/sandbox-steps.png`.
 *
 * ── Why the page's spine is a STEP and not a heading ───────────────────────
 * The guide used to be ten `<h2>` prose sections with seven code panes
 * scattered through them, and the paragraphs around each pane carried
 * instructions of their own — so a reader had to decide, sentence by sentence,
 * which text was a thing to do. A step is a ROW: a number in its own gutter,
 * then the body. Counted headings read as an article whose sections happen to
 * be numbered; a number in a gutter reads as a procedure before a word is
 * read. `Set it up` is ONE `<ol>`, so a screen reader announces "list, 5
 * items" before the first one.
 *
 * ── ⚠️ Why the PICKER exists, and why it is not a step ─────────────────────
 * The guide serves EIGHT agents and used to show one, with a paragraph after
 * the command telling the other seven to swap the tag and the `-v` line. That
 * worked while a reader was hand-selecting a multi-line command and going
 * slowly. A copy button removes exactly that reader: the whole point of the
 * affordance is that they stop reading and start doing. So the swap becomes a
 * CONTROL — seven readers in eight would otherwise paste a command for an
 * agent they do not use, from a button that looks authoritative.
 *
 * It is NOT a step. Both step kinds are things the reader does OFF this page,
 * in a terminal or in an editor; picking an agent happens ON it, and admitting
 * a third kind would break the rule the sequence rests on. It sits above the
 * sequence because steps 1, 2 and 2b cannot be written until it is answered.
 *
 * ── The two step KINDS, and the route that MIXES them ──────────────────────
 * A command step carries one copyable pane; a UI-instruction step carries
 * none. They are told apart by TWO signals — a filled vs outlined number AND a
 * `Command` / `In your editor` chip — never one, because the fills alone would
 * fail a reader who cannot separate them and the chips alone would leave the
 * sequence looking uniform while scanning.
 *
 * ⚠️ The VS Code route MIXES kinds: `2a` UI, `2b` COMMAND, `2c` UI. `2b`
 * creates `.devcontainer/devcontainer.json`, and a reader cannot do that in a
 * file picker — Finder and most GUI pickers refuse a name beginning with a dot
 * without saying why. Its one paste makes the folder AND writes the file, and
 * ONE PASTE IS ONE STEP: had they needed two, the route would run to four.
 */

type StepKind = 'command' | 'ui'

/**
 * ⚠️ EVERY HUMAN STRING IS HERE AS A PROP (MOTIR-8056). The words of this
 * sequence live in `content/docs/sandbox/<locale>.md`; the page renders the
 * document's parts on the server and hands them in, so this component holds its
 * state and its picker logic and no sentence. The nodes are rendered Markdown
 * (a paragraph wrapper, inline code, emphasis); the strings are the few places
 * a plain value is needed — an accessible name and a code block's caption.
 */
export interface SetupStepsText {
  /** The radio group's accessible name. */
  agentProfile: string
  picker: {
    /** The question above the chips. */
    label: ReactNode
    /** The label before the second tier. */
    alsoSupported: ReactNode
    /** The label before the agent-less image. */
    or: ReactNode
    /** The agent-less image's chip. The agents' own names are vendor names and stay data. */
    base: ReactNode
    /**
     * The sentence under the chips, rendered once per picker option with that
     * option's name in the document's `{{value:profileLabel}}`, by option id.
     */
    summary: Record<string, ReactNode>
  }
  /** The two kind chips. */
  chips: Record<StepKind, ReactNode>
  /** The heading and one-line introduction of the sequence. */
  intro: ReactNode
  steps: Record<
    StepId,
    {
      intent: ReactNode
      body: ReactNode
      /** Step 2's pointer to the VS Code route; step 2b's warning. */
      extra?: ReactNode
    }
  >
  /** A profile's own caveat on step 2, by profile id. A profile with none has no entry. */
  notes: Record<string, ReactNode>
  /** The heading and paragraph above the dev container listing. */
  devcontainerFile: ReactNode
  /** What a code block's caption and copy button read; the payloads are not here. */
  captions: {
    pull: string
    run: string
    devcontainerCommand: string
    inContainer: string
    copyDevcontainer: string
    copySignIn: string
    copyLink: string
    copyCheck: string
  }
}

/**
 * A code pane inside this island. Its copy controls are the component itself:
 * the island is already hydrated, and an island cannot hold another one.
 */
function CodeBlock(props: CodeBlockProps) {
  return <CodePane {...props} controls={CopyControls} />
}

/** A short label from the document, set inline: the renderer wraps a part in a paragraph. */
function Inline({ children }: { children: ReactNode }) {
  return (
    <span className="[&_p]:mt-0 [&_p]:inline [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit">
      {children}
    </span>
  )
}

function Step({
  kind,
  label,
  intent,
  chip,
  children,
}: {
  kind: StepKind
  /** Overrides the ordinal — `2a`/`2b`/`2c` REPLACE step 2 rather than following it. */
  label: string
  intent: ReactNode
  chip: ReactNode
  children?: ReactNode
}) {
  return (
    <li className="grid grid-cols-[30px_minmax(0,1fr)] gap-3.5 border-t border-(--el-border-soft) py-4 first:border-t-0 first:pt-1.5">
      <span
        aria-hidden
        className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-(--radius-badge) font-(family-name:--font-mono) text-[13px] font-bold ${
          kind === 'ui'
            ? 'border-[1.5px] border-(--el-border-strong) bg-(--el-page-bg) text-(--el-text-secondary)'
            : 'bg-(--el-muted) text-(--el-text)'
        }`}
      >
        {label}
      </span>
      <div className="min-w-0">
        <div className="mt-1 flex flex-wrap items-baseline gap-2.5 text-[15px] leading-snug font-semibold text-(--el-text)">
          <Inline>{intent}</Inline>
          <span
            className={`rounded-(--radius-badge) px-(--spacing-chip-x) py-(--spacing-chip-y) text-[10px] font-semibold tracking-wide text-(--el-text-strong) uppercase ${
              kind === 'ui' ? 'bg-(--el-tint-lavender)' : 'bg-(--el-tint-sky)'
            }`}
          >
            <Inline>{chip}</Inline>
          </span>
        </div>
        {children}
      </div>
    </li>
  )
}

/** A step's own paragraph: the document's paragraph, at this sequence's measure and ink. */
function Say({ children }: { children: ReactNode }) {
  return (
    <div className="[&_p]:mt-1.5 [&_p]:max-w-[62ch] [&_p]:text-[13.5px] [&_p]:leading-relaxed [&_p]:text-(--el-text-secondary)">
      {children}
    </div>
  )
}

/** A caveat on the yellow tint: a profile's note on step 2, or step 2b's warning. */
function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 rounded-(--radius-control) bg-(--el-tint-yellow) px-2.5 py-2 text-[12.5px] leading-snug text-(--el-text-strong) [&_p]:mt-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit [&_strong]:text-inherit">
      {children}
    </div>
  )
}

export function SetupSteps({ text }: { text: SetupStepsText }) {
  const [profileId, setProfileId] = useState(SANDBOX_PROFILES[0]!.id)
  const profile = findProfile(profileId)
  const { picker, chips, steps, captions } = text
  const note = text.notes[profile.id]

  return (
    <>
      {/* ── THE PROFILE PICKER — a control, not a step ────────────────── */}
      <div className="mt-6 max-w-[68ch] rounded-(--radius-card) border border-(--el-border) bg-(--el-surface-soft) px-4.5 py-4">
        <div className="mb-2.5 text-[14px] font-semibold text-(--el-text) [&_p]:mt-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:text-inherit">
          {picker.label}
        </div>
        <div
          role="radiogroup"
          aria-label={text.agentProfile}
          className="flex flex-wrap items-center gap-1.5"
        >
          {SANDBOX_PICKER_OPTIONS.map((option, index) => (
            <Chip
              key={option.id}
              name={option.id === 'base' ? picker.base : option.label}
              selected={option.id === profileId}
              onSelect={() => setProfileId(option.id)}
              /* The tier break and the `or` are LABELS, not controls: both
                 groups are published and built, and a reader choosing an agent
                 is not choosing a tier. */
              before={
                index === SANDBOX_PROFILES.findIndex((p) => p.tier === 2)
                  ? picker.alsoSupported
                  : option.id === 'base'
                    ? picker.or
                    : undefined
              }
            />
          ))}
        </div>
        <div className="mt-3 text-[13px] leading-snug text-(--el-text-secondary) [&_p]:mt-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit">
          {picker.summary[profile.id]}
        </div>
      </div>

      {text.intro}

      <ol className="mt-5 max-w-[68ch] list-none p-0">
        <Step
          kind="command"
          label="1"
          intent={steps['1'].intent}
          chip={chips.command}
        >
          <Say>{steps['1'].body}</Say>
          <div className="mt-2.5">
            <CodeBlock
              caption={captions.pull}
              code={sandboxPullCommand(profile.id)}
            />
          </div>
        </Step>

        <Step
          kind="command"
          label="2"
          intent={steps['2'].intent}
          chip={chips.command}
        >
          <Say>{steps['2'].body}</Say>
          <div className="mt-2.5">
            <CodeBlock
              caption={captions.run}
              code={sandboxRunCommand(profile.id)}
            />
          </div>
          {note ? <Callout>{note}</Callout> : null}
          <div className="mt-2.5 border-l-2 border-(--el-border-strong) py-0.5 pl-3 text-[13px] text-(--el-text-secondary) [&_p]:mt-0 [&_p]:max-w-none [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit">
            {steps['2'].extra}
          </div>
        </Step>

        <Step kind="ui" label="2a" intent={steps['2a'].intent} chip={chips.ui}>
          <Say>{steps['2a'].body}</Say>
        </Step>

        <Step
          kind="command"
          label="2b"
          intent={steps['2b'].intent}
          chip={chips.command}
        >
          <Say>{steps['2b'].body}</Say>
          <div className="mt-2.5">
            <CodeBlock
              caption={captions.devcontainerCommand}
              copyLabel={captions.copyDevcontainer}
              code={sandboxDevcontainerWriteCommand(profile.id)}
            />
          </div>
          <Callout>{steps['2b'].extra}</Callout>
        </Step>

        <Step kind="ui" label="2c" intent={steps['2c'].intent} chip={chips.ui}>
          <Say>{steps['2c'].body}</Say>
        </Step>

        <Step
          kind="command"
          label="3"
          intent={steps['3'].intent}
          chip={chips.command}
        >
          <Say>{steps['3'].body}</Say>
          <div className="mt-2.5">
            <CodeBlock
              caption={captions.inContainer}
              copyLabel={captions.copySignIn}
              code="motir login"
            />
          </div>
        </Step>

        <Step
          kind="command"
          label="4"
          intent={steps['4'].intent}
          chip={chips.command}
        >
          <Say>{steps['4'].body}</Say>
          <div className="mt-2.5">
            <CodeBlock
              caption={captions.inContainer}
              copyLabel={captions.copyLink}
              code="motir link --project ACME"
            />
          </div>
        </Step>

        <Step
          kind="command"
          label="5"
          intent={steps['5'].intent}
          chip={chips.command}
        >
          <Say>{steps['5'].body}</Say>
          <div className="mt-2.5">
            <CodeBlock
              caption={captions.inContainer}
              copyLabel={captions.copyCheck}
              code="motir doctor"
            />
          </div>
        </Step>
      </ol>

      {/* ⚠️ THE LISTING LIVES HERE, NOT ON THE PAGE, AND THAT IS LOAD-BEARING.
          It shows the same config as 2b's heredoc under a second caption, and
          `tests/docs/sandbox.test.tsx` asserts the heredoc CONTAINS it — two
          typed copies is a `mounts` entry corrected in one and published wrong
          in the other.

          Drafted on the page it agreed with the heredoc only by coincidence of
          the DEFAULT profile: pick OpenCode and the heredoc gains a second
          mount while a page-level constant does not, and the test — which only
          ever renders the default — would have stayed green over a page showing
          two different configs. Both blocks read the same
          `sandboxDevcontainerJson(profile.id)` now, so they cannot disagree for
          any profile. */}
      {text.devcontainerFile}
      <div className="mt-3">
        <CodeBlock
          caption=".devcontainer/devcontainer.json"
          code={sandboxDevcontainerJson(profile.id)}
        />
      </div>
    </>
  )
}

function Chip({
  name,
  selected,
  onSelect,
  before,
}: {
  /** The visible name: the agent's own, or the document's for the agent-less image. */
  name: ReactNode
  selected: boolean
  onSelect: () => void
  before?: ReactNode
}) {
  return (
    <>
      {before ? (
        <span className="ml-1 text-[11px] font-medium tracking-wide text-(--el-text-secondary)">
          <Inline>{before}</Inline>
        </span>
      ) : null}
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={`inline-flex min-h-[30px] cursor-pointer items-center rounded-(--radius-badge) border px-(--spacing-control-x) text-[13px] outline-offset-2 focus-visible:outline-2 focus-visible:outline-(--el-accent) ${
          selected
            ? 'border-(--el-accent) bg-(--el-accent) font-semibold text-(--el-accent-text)'
            : 'border-(--el-border) bg-(--el-page-bg) font-medium text-(--el-text-secondary) hover:bg-(--el-muted) hover:text-(--el-text)'
        }`}
      >
        <Inline>{name}</Inline>
      </button>
    </>
  )
}
