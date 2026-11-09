/**
 * The shared list primitives the pages compose from (MOTIR-4116) — one status
 * pill and one pager. (The work-item row left with the read pages it served,
 * MOTIR-6743: those paths redirect into the app now.)
 */

const TONE: Record<string, string> = {
  done: 'bg-(--el-tint-mint) text-(--el-text-strong)',
  in_progress: 'bg-(--el-tint-sky) text-(--el-text-strong)',
  todo: 'border border-(--el-border) bg-(--el-surface) text-(--el-text-secondary)',
}

export function StatusPill({
  status,
  category,
}: {
  status: string
  category: string
}) {
  const tone = TONE[category] ?? TONE['todo']
  return (
    <span
      className={`rounded-(--radius-badge) px-(--spacing-chip-x) py-(--spacing-chip-y) text-[11px] leading-normal whitespace-nowrap ${tone}`}
    >
      {status}
    </span>
  )
}

/**
 * The no-JS pager — a real `<a href>`, following
 * `app/explore/_components/Gallery.tsx`.
 *
 * A "Load more" that needs JavaScript is a page a crawler cannot walk past the
 * first screen and a reader cannot link to. This whole surface exists to be
 * crawled, so its flat lists page by URL.
 */
export function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <p className="mt-5">
      <a
        href={href}
        rel="next"
        className="inline-flex h-(--height-btn-sm) items-center rounded-(--radius-btn) border border-(--el-border-strong) px-3 text-[13px] font-medium text-(--el-text) hover:bg-(--el-surface-soft)"
      >
        {label}
      </a>
    </p>
  )
}
