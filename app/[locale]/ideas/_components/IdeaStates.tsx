import { localizedPath } from '@/i18n/localizedPath'
import { filterLinkRel } from '@/lib/crawlPolicy'
import { RefreshCw } from 'lucide-react'
import { buttonVariants, cn } from '@motir/design-system'
import { useCopy, usePageLocale } from '@/lib/copy'
import { MONO } from './IdeaCards'

/*
 * The two states the list can be in besides populated (MOTIR-7687),
 * `design/ideas/design-notes.md` § States: no idea matches the filters (not an
 * error, so no warning colour), and motir-core's public API did not answer —
 * a REAL state now that the static copy is gone.
 */

export function IdeasEmpty() {
  const e = useCopy().ideas.empty
  const locale = usePageLocale()
  return (
    <section
      aria-labelledby="empty-h"
      className="grid justify-items-start gap-3 rounded-(--radius-card) border border-dashed border-(--el-border-strong) bg-(--el-surface-soft) p-[calc(var(--spacing-card-padding)*1.5)]"
    >
      <h2 id="empty-h" className="m-0 text-[22px] font-bold text-(--el-text)">
        {e.title}
      </h2>
      <p className="m-0 max-w-[56ch] text-[15px] text-(--el-text-secondary)">
        {e.body}
      </p>
      <a
        href={localizedPath(locale, '/ideas')}
        className={buttonVariants({ variant: 'ghost', size: 'md' })}
      >
        {e.action}
      </a>
    </section>
  )
}

export function IdeasUnavailable({ retryHref }: { retryHref: string }) {
  const e = useCopy().ideas.error
  return (
    <section
      role="status"
      aria-labelledby="err-h"
      className="grid justify-items-start gap-3 rounded-(--radius-card) border border-(--el-border-strong) bg-(--el-card) p-[calc(var(--spacing-card-padding)*1.5)]"
    >
      <p
        className={cn(
          MONO,
          'm-0 flex items-center gap-2.5 text-[11px] text-(--el-text)',
        )}
      >
        <i
          aria-hidden="true"
          className="size-[9px] bg-(--el-showcase-decision)"
        />
        {e.eyebrow}
      </p>
      <h2 id="err-h" className="m-0 text-[22px] font-bold text-(--el-text)">
        {e.title}
      </h2>
      <p className="m-0 max-w-[56ch] text-[15px] text-(--el-text-secondary)">
        {e.body}
      </p>
      <a
        href={retryHref}
        rel={filterLinkRel(retryHref)}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'md' }),
          'gap-2',
        )}
      >
        <RefreshCw aria-hidden className="size-4" />
        {e.action}
      </a>
    </section>
  )
}
