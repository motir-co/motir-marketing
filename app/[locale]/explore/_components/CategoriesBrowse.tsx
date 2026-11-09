import { localizedPath } from '@/i18n/localizedPath'
import { Tag } from 'lucide-react'
import { format, useCopy, usePageLocale } from '@/lib/copy'
import type { ProjectCategoryDto } from '@/lib/explore'

/*
 * The browse-by-topic facet (MOTIR-4045). Every topic with at least one public
 * project, sorted by count, each a real crawlable `/explore/topic/<slug>` link
 * with a proportional count bar.
 */

export function CategoriesBrowse({
  categories,
}: {
  categories: ProjectCategoryDto[]
}) {
  const copy = useCopy()
  const locale = usePageLocale()
  if (categories.length === 0) return null
  const max = Math.max(...categories.map((c) => c.projectCount), 1)

  return (
    <section aria-labelledby="explore-browse-heading">
      <h2
        id="explore-browse-heading"
        className="font-(family-name:--font-serif) text-lg font-semibold text-(--el-text)"
      >
        {copy.explore.browseTitle}
      </h2>
      <p className="mt-1 text-[13px] text-(--el-text-secondary)">
        {copy.explore.browseSubtitle}
      </p>
      <nav aria-label={copy.explore.browseTitle} className="mt-4 flex flex-col">
        {categories.map((cat) => (
          <a
            key={cat.slug}
            href={localizedPath(locale, `/explore/topic/${cat.slug}`)}
            className="flex items-center gap-3 rounded-(--radius-control) px-(--spacing-control-x) py-(--spacing-control-y) hover:bg-(--el-surface-soft)"
          >
            <Tag
              className="h-3.5 w-3.5 flex-none text-(--el-text-secondary)"
              aria-hidden
            />
            <span className="w-40 flex-none truncate text-[13.5px] font-medium text-(--el-text)">
              {cat.label}
            </span>
            <span
              aria-hidden
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--el-muted)"
            >
              <span
                className="block h-full rounded-full bg-(--el-accent)"
                style={{
                  width: `${Math.max(6, Math.round((cat.projectCount / max) * 100))}%`,
                }}
              />
            </span>
            <span
              className="w-10 flex-none text-right font-mono text-xs text-(--el-text-secondary)"
              aria-label={format(copy.explore.browseCountAria, {
                count: cat.projectCount,
              })}
            >
              {cat.projectCount}
            </span>
          </a>
        ))}
      </nav>
    </section>
  )
}
