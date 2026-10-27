/*
 * The figure-free fallback note (design/explainer, panel 3): a quiet
 * informational line under the intro when live figures cannot be read. No
 * error colour, no icon, no retry control — the page still explains every step.
 */
export function FallbackNote({ text }: { text: string }) {
  return (
    <p
      role="note"
      data-element="fallback-note"
      className="m-0 max-w-prose rounded-(--radius-card) border border-(--el-border) bg-(--el-surface-soft) p-(--spacing-card-padding-12) text-sm text-(--el-text-secondary)"
    >
      {text}
    </p>
  )
}
