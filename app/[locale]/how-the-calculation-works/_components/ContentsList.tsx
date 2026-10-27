import { SECTION_IDS, sectionNumber, type ExplainerCopy } from './copy'

/*
 * The contents list (design/explainer, panels 2 and 4): the ten section
 * headings with their two-digit numbers. Wide, it is a sticky aside; narrow, a
 * native disclosure above the first section. Plain links, no script.
 */

function Rows({ copy }: { copy: ExplainerCopy }) {
  return (
    <ol className="m-0 grid list-none gap-1 p-0 text-sm">
      {SECTION_IDS.map((id, i) => (
        <li key={id}>
          <a
            href={`#${id}`}
            className="flex gap-2 rounded-(--radius-control) px-(--spacing-control-x-8) py-(--spacing-control-y-4) text-(--el-text-secondary) no-underline hover:bg-(--el-tint-lavender) hover:text-(--el-text-strong)"
          >
            <span className="shrink-0 font-mono">{sectionNumber(i)}</span>
            <span className="[overflow-wrap:anywhere]">{copy[id].title}</span>
          </a>
        </li>
      ))}
    </ol>
  )
}

export function ContentsAside({ copy }: { copy: ExplainerCopy }) {
  return (
    <nav
      aria-label={copy.contentsLabel}
      data-element="contents-list"
      className="sticky top-6 grid content-start gap-2"
    >
      <span className="font-mono text-xs tracking-wide text-(--el-text-secondary) uppercase">
        {copy.contentsLabel}
      </span>
      <Rows copy={copy} />
    </nav>
  )
}

export function ContentsDisclosure({ copy }: { copy: ExplainerCopy }) {
  return (
    <details
      data-element="contents-disclosure"
      className="rounded-(--radius-card) border border-(--el-border) bg-(--el-surface) px-(--spacing-card-padding-12) py-(--spacing-card-padding-8)"
    >
      <summary className="cursor-pointer text-sm font-medium text-(--el-text-strong)">
        {copy.contentsLabel} ({SECTION_IDS.length})
      </summary>
      <nav aria-label={copy.contentsLabel} className="pt-2">
        <Rows copy={copy} />
      </nav>
    </details>
  )
}
