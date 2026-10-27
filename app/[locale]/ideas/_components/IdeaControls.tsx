import { localizedPath } from '@/i18n/localizedPath'
import { ChevronDown, Search, Tag, X } from 'lucide-react'
import { cn } from '@motir/design-system'
import { format, useCopy, usePageLocale, type Copy } from '@/lib/copy'
import {
  hasIdeaFilters,
  ideasHref,
  type IdeasParams,
  ideaTextLang,
  type PublicIdeaCategoryCountDto,
  type PublicIdeaTagListDto,
} from '@/lib/ideas'
import { IDEAS_TAGS_MAX } from '@/lib/crawlPolicy'
import { CountLine, FilterLink, SearchForm } from './IdeasNav'

/*
 * "Find an idea" (MOTIR-7687) — the search, the category chips, the tags and
 * the active filters, as `design/ideas/design-notes.md` § The controls draws
 * them. They compose the shapes of `/explore`'s shipped controls (a real GET
 * form, chips that are real links, pills with a clear link). The chosen chip
 * carries `aria-current`, not the design's `aria-pressed`: ARIA does not allow
 * `aria-pressed` on a link. Every control writes the URL through `ideasHref`,
 * so the URL is the only state and a shared link opens the same view.
 */

const CHIP =
  'inline-flex min-h-[30px] items-center gap-1.5 whitespace-nowrap rounded-(--radius-badge) border px-(--spacing-chip-x) py-(--spacing-chip-y) text-[13px] font-medium no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring-color)'
const CHIP_OFF =
  'border-(--el-border-soft) bg-(--el-surface) text-(--el-text-secondary) hover:border-(--el-border-strong)'
const CHIP_ON =
  'border-(--el-border) bg-(--el-tint-lavender) text-(--el-text-strong)'
const COUNT = 'font-(family-name:--font-mono) text-[11px]'
const PILL =
  'inline-flex items-center gap-1.5 rounded-(--radius-badge) px-(--spacing-chip-x) py-(--spacing-chip-y) text-[12px] font-medium text-(--el-text-strong) no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring-color)'

/** The result count line, by how many ideas the view holds. */
export function countLine(
  total: number,
  filtered: boolean,
  f: Copy['ideas']['find'],
): string {
  if (!filtered) return format(f.countAll, { n: total })
  if (total === 0) return f.countNone
  if (total === 1) return f.countMatchOne
  return format(f.countMatch, { n: total })
}

export function IdeaControls({
  params,
  total,
  categories,
  tags,
}: {
  params: IdeasParams
  total: number
  categories: PublicIdeaCategoryCountDto[]
  /** `null` when the tags read failed: the disclosure is then not drawn. */
  tags: PublicIdeaTagListDto | null
}) {
  const f = useCopy().ideas.find
  const locale = usePageLocale()
  const filtered = hasIdeaFilters(params)
  // A pressed category the response omits (no match under the other filters)
  // stays visible, so it can be un-pressed.
  const chips =
    params.category && !categories.some((c) => c.slug === params.category)
      ? [
          { slug: params.category, label: params.category, count: 0 },
          ...categories,
        ]
      : categories
  const categoryLabel =
    chips.find((c) => c.slug === params.category)?.label ?? params.category
  const tagLabel = (slug: string) =>
    tags?.tags.find((t) => t.slug === slug)?.label ?? slug
  // A label the store served in English on another language's page is marked.
  const tagLang = (labelFallback: boolean) =>
    tags ? ideaTextLang(locale, tags.locale, labelFallback) : undefined

  return (
    <section
      aria-labelledby="find-h"
      data-surface="card"
      className="grid min-w-0 gap-3.5 rounded-(--radius-card) border border-(--el-border) bg-(--el-card) p-[calc(var(--spacing-card-padding)*1.25)] shadow-(--shadow-card) [&>*]:min-w-0"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <h2
          id="find-h"
          tabIndex={-1}
          className="m-0 text-[22px] font-bold tracking-[-0.015em] text-(--el-text) focus:outline-none"
        >
          {f.heading}
        </h2>
        <CountLine
          text={countLine(total, filtered, f)}
          updating={f.updating}
          className="m-0 font-(family-name:--font-mono) text-[13px] text-(--el-text-secondary)"
        />
      </div>

      <SearchForm
        params={params}
        aria-label={f.searchAria}
        className="flex h-(--height-input) items-center gap-2.5 rounded-(--radius-input) border border-(--el-input-border) bg-(--el-page-bg) pr-1.5 pl-(--spacing-input-x) text-(--el-text-secondary) focus-within:border-(--el-border-strong)"
      >
        <Search aria-hidden className="size-4 flex-none" />
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ''}
          placeholder={f.searchPlaceholder}
          aria-label={f.searchAria}
          maxLength={200}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-(--el-text) placeholder:text-(--el-text-secondary) focus:outline-none"
        />
        {params.category ? (
          <input type="hidden" name="category" value={params.category} />
        ) : null}
        {params.tags.map((t) => (
          <input key={t} type="hidden" name="tag" value={t} />
        ))}
        {params.kind ? (
          <input type="hidden" name="kind" value={params.kind} />
        ) : null}
        {params.q ? (
          <FilterLink
            href={localizedPath(
              locale,
              ideasHref(params, { q: null, idea: null }),
            )}
            aria-label={f.searchClear}
            className="inline-flex size-8 flex-none items-center justify-center rounded-(--radius-control) text-(--el-text-secondary) hover:text-(--el-text)"
          >
            <X aria-hidden className="size-4" />
          </FilterLink>
        ) : null}
        <button
          type="submit"
          className="inline-flex h-[calc(var(--height-input)-10px)] flex-none items-center gap-1.5 rounded-(--radius-btn) bg-(--el-accent) px-(--spacing-btn-x) text-[13px] font-semibold text-(--el-accent-text) hover:bg-(--el-accent-pressed)"
        >
          <Search aria-hidden className="size-3.5 md:hidden" />
          <span className="sr-only md:not-sr-only">{f.searchSubmit}</span>
        </button>
      </SearchForm>

      <div
        role="group"
        aria-label={f.categoryGroup}
        className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0"
      >
        <FilterLink
          href={localizedPath(
            locale,
            ideasHref(params, { category: null, idea: null }),
          )}
          aria-current={!params.category ? 'true' : undefined}
          className={cn(CHIP, !params.category ? CHIP_ON : CHIP_OFF)}
        >
          {f.allCategories}
        </FilterLink>
        {chips.map((c) => {
          const on = c.slug === params.category
          return (
            <FilterLink
              key={c.slug}
              href={localizedPath(
                locale,
                ideasHref(params, {
                  category: on ? null : c.slug,
                  idea: null,
                }),
              )}
              aria-current={on ? 'true' : undefined}
              className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
            >
              {c.label}
              <span className={COUNT}>{c.count}</span>
              {on ? <X aria-hidden className="size-3" /> : null}
            </FilterLink>
          )
        })}
      </div>

      {tags && tags.tags.length > 0 ? (
        <details open={params.tags.length > 0} className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-(--radius-control) border border-(--el-border) px-(--spacing-control-x) py-(--spacing-control-y) text-[13px] font-semibold text-(--el-text) [&::-webkit-details-marker]:hidden">
            <Tag aria-hidden className="size-3.5" />
            {params.tags.length > 0
              ? format(f.tagsSelected, { n: params.tags.length })
              : f.tags}
            <ChevronDown
              aria-hidden
              className="size-3.5 transition-transform group-open:rotate-180"
            />
          </summary>
          <div
            role="group"
            aria-label={f.tags}
            className="mt-2.5 flex flex-wrap gap-1.5"
          >
            {tags.tags.map((t) => {
              const on = params.tags.includes(t.slug)
              // At the cap a further tag would be dropped by the parse
              // (`IDEAS_TAGS_MAX`), so it is drawn but not offered.
              if (!on && params.tags.length >= IDEAS_TAGS_MAX) {
                return (
                  <span
                    key={t.slug}
                    aria-disabled="true"
                    className={cn(
                      CHIP,
                      'cursor-default border-(--el-border-soft) bg-(--el-surface) text-(--el-text-secondary) opacity-50',
                    )}
                  >
                    <Tag aria-hidden className="size-3" />
                    <span lang={tagLang(t.labelFallback)}>{t.label}</span>
                    <span className={COUNT}>{t.count}</span>
                  </span>
                )
              }
              return (
                <FilterLink
                  key={t.slug}
                  href={localizedPath(
                    locale,
                    ideasHref(params, {
                      tags: on
                        ? params.tags.filter((x) => x !== t.slug)
                        : [...params.tags, t.slug],
                      idea: null,
                    }),
                  )}
                  aria-current={on ? 'true' : undefined}
                  className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
                >
                  <Tag aria-hidden className="size-3" />
                  <span lang={tagLang(t.labelFallback)}>{t.label}</span>
                  <span className={COUNT}>{t.count}</span>
                  {on ? <X aria-hidden className="size-3" /> : null}
                </FilterLink>
              )
            })}
          </div>
        </details>
      ) : null}

      {filtered ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-(--el-border-soft) pt-3">
          <span className="text-[12px] font-semibold text-(--el-text-secondary)">
            {f.activeLabel}
          </span>
          {params.category ? (
            <FilterLink
              href={localizedPath(
                locale,
                ideasHref(params, { category: null, idea: null }),
              )}
              className={cn(PILL, 'bg-(--el-tint-sky)')}
            >
              {format(f.pillCategory, { label: categoryLabel ?? '' })}
              <X aria-hidden className="size-3" />
              <span className="sr-only">{f.remove}</span>
            </FilterLink>
          ) : null}
          {params.tags.map((t) => (
            <FilterLink
              key={t}
              href={localizedPath(
                locale,
                ideasHref(params, {
                  tags: params.tags.filter((x) => x !== t),
                  idea: null,
                }),
              )}
              className={cn(PILL, 'bg-(--el-tint-lavender)')}
            >
              {format(f.pillTag, { label: tagLabel(t) })}
              <X aria-hidden className="size-3" />
              <span className="sr-only">{f.remove}</span>
            </FilterLink>
          ))}
          {params.q ? (
            <FilterLink
              href={localizedPath(
                locale,
                ideasHref(params, { q: null, idea: null }),
              )}
              className={cn(PILL, 'bg-(--el-tint-mint)')}
            >
              {format(f.pillSearch, { q: params.q })}
              <X aria-hidden className="size-3" />
              <span className="sr-only">{f.remove}</span>
            </FilterLink>
          ) : null}
          <FilterLink
            href={localizedPath(locale, '/ideas')}
            className="text-[12px] font-semibold text-(--el-link) hover:text-(--el-link-pressed)"
          >
            {f.clearAll}
          </FilterLink>
        </div>
      ) : null}
    </section>
  )
}
