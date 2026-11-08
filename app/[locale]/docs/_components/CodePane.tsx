import type { ComponentType } from 'react'

/*
 * ONE CODE PANE, AND WHICH COPY CONTROLS IT CARRIES (MOTIR-10645).
 *
 * The pane is the same markup wherever it renders; what differs is how its
 * caption row's button becomes interactive. On a built page the caption row is
 * an island (`CodeBlock` in `DocSchema.tsx` passes `CopyControlsIsland`), so
 * the pane and its `<pre>` ship no JavaScript. Inside an island that is
 * already hydrated — the sandbox guide's setup steps — the row is the plain
 * component, because an island cannot hold another one. This module imports
 * neither, so the browser bundle of an island that renders a pane never pulls
 * in the build's renderer.
 */

export interface CodeBlockProps {
  caption: string
  code: string
  copyable?: boolean
  copyLabel?: string
}

export function CodePane({
  caption,
  code,
  /**
   * ⚠️ NOT EVERY PANE HOLDS A COMMAND, and a Copy button on one that does not
   * is a promise the pane cannot keep. This page renders a folder-tree diagram
   * (`~/work/ ← start the container from HERE`) and a permission table in the
   * same component as its `docker run`; pasting either into a shell does
   * nothing useful, and the accessible name would read "Copy the your machine
   * command".
   *
   * The superseded `motir-core/design/agent-sandbox/` asset had already reached
   * this rule and stated it as *"the copy affordance is on the filled-in block
   * only — a copyable template is a command that fails in the terminal; that
   * asymmetry is the design, not a detail."* `sandbox-steps.*` did not carry it
   * forward, and the omission surfaced when the button was actually built. The
   * default is `true` because most panes ARE commands.
   */
  copyable = true,
  /** An explicit accessible name, when the caption cannot supply a good one. */
  copyLabel,
  controls: Controls,
}: CodeBlockProps & {
  /** The caption row's copy controls: the island, or the component inside one. */
  controls: ComponentType<{ caption: string; code: string; copyLabel?: string }>
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-(--radius-card) border border-(--el-border)">
      {copyable ? (
        <Controls caption={caption} code={code} copyLabel={copyLabel} />
      ) : (
        <p className="border-b border-(--el-border) bg-(--el-surface) px-3 py-1.5 font-(family-name:--font-mono) text-[11px] tracking-wide text-(--el-text-secondary) uppercase">
          {caption}
        </p>
      )}
      {/* The pane scrolls in its own box: a curl line is wider than a phone,
          and wrapping a shell command makes it uncopyable. `tabIndex` is what
          makes an overflowing region reachable by keyboard — and the copy
          button must not take that away, which is why it lives in the caption
          bar rather than floating over the pane. */}
      <pre
        tabIndex={0}
        className="overflow-x-auto bg-(--el-page-bg) px-3 py-2.5 font-(family-name:--font-mono) text-[12.5px] leading-relaxed text-(--el-text)"
      >
        {code}
      </pre>
    </div>
  )
}
