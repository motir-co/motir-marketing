import { ChevronRight } from 'lucide-react'
import { SiteShell } from '@/app/_components/SiteShell'
import { localizedPath } from '@/i18n/localizedPath'
import { format, useCopy, usePageLocale, type Copy } from '@/lib/copy'
import type { ExploreQuery, SquareData } from '@/lib/explore'
import { SITE_HOST } from '@/lib/publicHost'
import { siteUrl } from '@/lib/siteOrigin'
import { ActiveFilters } from './_components/ActiveFilters'
import { CategoriesBrowse } from './_components/CategoriesBrowse'
import { ExploreFaq, exploreFaqItems } from './_components/Faq'
import { ExploreGallery } from './_components/Gallery'
import { ExploreJsonLd } from './_components/JsonLd'
import { RankTabs } from './_components/RankTabs'
import { ExploreSearchForm } from './_components/SearchForm'
import { EXPLORE_PATH, topicPath } from './exploreMetadata'

/**
 * `motir.co/explore/topic/<slug>` — one topic's landing page (MOTIR-4036): a
 * breadcrumb, its own h1, the search form and the same gallery. Rendered per
 * request by the Worker (MOTIR-10754) once it knows the slug is a topic, or
 * that the API could not say (`failed`), when `label` is the slug itself.
 */
export function ExploreTopic({
  slug,
  label,
  query,
  square,
}: {
  slug: string
  label: string
  query: ExploreQuery
  square: SquareData
}) {
  const copy = useCopy()
  const locale = usePageLocale()
  const { page, categories, failed } = square
  // The links this page draws, in its locale (MOTIR-7971).
  const base = localizedPath(locale, topicPath(slug))
  return (
    <SiteShell
      host={SITE_HOST}
      contentClassName="mx-auto w-full max-w-[72rem] px-(--spacing-card-padding) py-10"
    >
      <TopicHeader base={base} label={label} query={query} />
      <div className="flex flex-col gap-3">
        <RankTabs basePath={base} query={query} />
        <ActiveFilters basePath={base} query={query} categoryLabel={label} />
      </div>
      <div className="mt-6">
        <ExploreGallery
          basePath={base}
          query={query}
          page={page}
          heading={galleryHeading(query, label, copy)}
        />
      </div>
      {!failed ? (
        <div className="mt-14 border-t border-(--el-border) pt-10">
          <CategoriesBrowse categories={categories} />
        </div>
      ) : null}
      <div className="mt-10">
        <ExploreFaq />
      </div>
      <ExploreJsonLd
        pageUrl={siteUrl(base)}
        name={`${label} projects`}
        description={format(copy.explore.metaDescriptionTopic, {
          topic: label,
        })}
        cards={page?.items ?? []}
        faq={exploreFaqItems(copy)}
        breadcrumb={{
          topicLabel: label,
          topicUrl: siteUrl(base),
          squareLabel: copy.explore.heroEyebrow,
        }}
      />
    </SiteShell>
  )
}

function TopicHeader({
  base,
  label,
  query,
}: {
  base: string
  label: string
  query: ExploreQuery
}) {
  const copy = useCopy()
  const locale = usePageLocale()
  return (
    <>
      <nav
        aria-label={copy.explore.topicNavAria}
        className="mb-4 flex items-center gap-1 text-[13px]"
      >
        <a
          href={localizedPath(locale, EXPLORE_PATH)}
          className="text-(--el-text-secondary) hover:text-(--el-link)"
        >
          {copy.explore.heroEyebrow}
        </a>
        <ChevronRight className="h-3 w-3 text-(--el-text-faint)" aria-hidden />
        <span className="font-medium text-(--el-text)">{label}</span>
      </nav>
      <header className="mb-6">
        <h1 className="font-(family-name:--font-serif) text-3xl font-semibold tracking-tight text-(--el-text)">
          {format(copy.explore.topicHeading, { topic: label })}
        </h1>
        <p className="mt-2 max-w-[40rem] text-[14px] text-(--el-text-secondary)">
          {format(copy.explore.metaDescriptionTopic, { topic: label })}
        </p>
        <div className="mt-4 w-full max-w-[34rem]">
          <ExploreSearchForm
            basePath={base}
            query={query}
            preserveCategory={false}
          />
        </div>
      </header>
    </>
  )
}

function galleryHeading(
  query: ExploreQuery,
  label: string,
  copy: Copy,
): string {
  if (query.search)
    return format(copy.explore.galleryHeadingSearch, { query: query.search })
  return `${label} projects`
}
