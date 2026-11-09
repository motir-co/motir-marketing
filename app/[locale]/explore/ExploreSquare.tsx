import { SiteShell } from '@/app/_components/SiteShell'
import { localizedPath } from '@/i18n/localizedPath'
import { format, useCopy, usePageLocale, type Copy } from '@/lib/copy'
import {
  categoryLabel,
  type ExploreQuery,
  type SquareData,
} from '@/lib/explore'
import { SITE_HOST } from '@/lib/publicHost'
import { siteUrl } from '@/lib/siteOrigin'
import { ActiveFilters } from './_components/ActiveFilters'
import { CategoriesBrowse } from './_components/CategoriesBrowse'
import { CategoryFilter } from './_components/CategoryFilter'
import { ExploreClose } from './_components/Close'
import { ExploreFaq, exploreFaqItems } from './_components/Faq'
import { ExploreGallery } from './_components/Gallery'
import { ExploreHero } from './_components/Hero'
import { ExploreJsonLd } from './_components/JsonLd'
import { RankTabs } from './_components/RankTabs'
import { EXPLORE_PATH } from './exploreMetadata'

/**
 * `motir.co/explore` — the project square (MOTIR-4036): hero, rank tabs, the
 * topic filter, the active filters, the gallery, the topics browse, the FAQ
 * and the close. It ranks by recent activity, so the Worker renders it per
 * request (MOTIR-10754) from the reads it has already made. An unreachable API
 * is the gallery's error state with no topics block — never a 404.
 */
export function ExploreSquare({
  query,
  square,
}: {
  query: ExploreQuery
  square: SquareData
}) {
  const copy = useCopy()
  const locale = usePageLocale()
  const { page, categories, failed } = square
  // Every link the square draws is the page's locale's address (MOTIR-7971).
  const base = localizedPath(locale, EXPLORE_PATH)
  return (
    <SiteShell host={SITE_HOST} overlayHeader>
      <ExploreHero basePath={base} query={query} />
      <div className="mx-auto w-full max-w-[1400px] px-[clamp(16px,3vw,48px)] pb-[clamp(56px,7vw,112px)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <RankTabs basePath={base} query={query} />
            <CategoryFilter
              basePath={base}
              query={query}
              categories={categories}
            />
          </div>
          <ActiveFilters
            basePath={base}
            query={query}
            categoryLabel={categoryLabel(categories, query.category ?? '')}
          />
        </div>
        <div className="mt-6">
          <ExploreGallery
            basePath={base}
            query={query}
            page={page}
            heading={galleryHeading(query, copy)}
          />
        </div>
        {!failed ? (
          <div className="mt-14 border-t border-(--el-border) pt-10">
            <CategoriesBrowse categories={categories} />
          </div>
        ) : null}
        <div className="mt-14">
          <ExploreFaq />
        </div>
        <div className="mt-6">
          <ExploreClose />
        </div>
      </div>
      <ExploreJsonLd
        pageUrl={siteUrl(localizedPath(locale, EXPLORE_PATH))}
        name={copy.explore.metaTitle}
        description={copy.explore.metaDescription}
        cards={page?.items ?? []}
        faq={exploreFaqItems(copy)}
      />
    </SiteShell>
  )
}

function galleryHeading(query: ExploreQuery, copy: Copy): string {
  if (query.search)
    return format(copy.explore.galleryHeadingSearch, { query: query.search })
  if (query.rank === 'popular') return copy.explore.galleryHeadingPopular
  if (query.rank === 'recent') return copy.explore.galleryHeadingNew
  return copy.explore.galleryHeadingTrending
}
