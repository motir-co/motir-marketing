import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import { ArrowRight } from 'lucide-react'
import { format, getCopy } from '@/lib/copy'
import {
  IMPORT_DOOR,
  MOTIR_PROJECT_BOARD,
  MOTIR_PROJECT_ROADMAP,
} from '@/lib/destinations'
import { SITE_HOST } from '@/lib/publicHost'
import { SiteShell } from '../../../_components/SiteShell'
import { productOf } from '../../../_components/products'
import {
  OutLink,
  PointGrid,
  ProductClose,
  ProductHero,
  ProductSection,
  WorksWith,
} from '../_components/ProductPage'
import { ApprovalsUi, BoardUi, RoadmapUi } from '../_components/PmUi'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * Motir Project Management's page (2026-10 redesign): the board, the list of
 * what waits on you and the roadmap, each drawn from the real screen, then
 * what any team expects of a project tool. The claims are the shipped ones —
 * Implemented and Approved are default columns, a card carries its failing or
 * running checks, the imports are the five connectors the app ships.
 *
 * Kept out of the index (`robots: noindex`) and the sitemap while it is in
 * review, like the placeholders.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/products/project-management', (copy) => ({
    title: format(copy.products.metaTitle, {
      name: productOf('project-management', copy).name,
    }),
    description: copy.products.projectManagement.metaDescription,
    robots: { index: false, follow: true },
  }))
}

export default async function ProjectManagementPage({
  params,
}: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const p = copy.products.projectManagement
  return (
    <SiteShell host={SITE_HOST} overlayHeader>
      <ProductHero
        slug="project-management"
        headline={p.headline}
        lede={p.lede}
        art={<ApprovalsUi />}
        extra={
          <a
            href={IMPORT_DOOR}
            className="inline-flex items-center gap-1.5 text-[15px] font-medium text-(--el-accent-on-surface) underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)"
          >
            {copy.products.importExisting}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        }
      />
      <ProductSection
        id="board"
        eyebrow={p.board.eyebrow}
        headline={p.board.headline}
        body={p.board.body}
      >
        <div className="grid gap-5">
          <BoardUi />
          {/* Motir's real board, in the visitor view (sign-in and consent). */}
          <OutLink href={MOTIR_PROJECT_BOARD} className="justify-self-start">
            {p.board.motirBoard}
          </OutLink>
        </div>
      </ProductSection>
      <ProductSection
        id="roadmap"
        eyebrow={p.roadmap.eyebrow}
        headline={p.roadmap.headline}
        body={p.roadmap.body}
      >
        <div className="grid gap-5">
          <RoadmapUi />
          {/* Motir's real roadmap, in the visitor view (sign-in and consent). */}
          <OutLink href={MOTIR_PROJECT_ROADMAP} className="justify-self-start">
            {p.roadmap.motirRoadmap}
          </OutLink>
        </div>
      </ProductSection>
      <ProductSection
        id="holds"
        eyebrow={p.holds.eyebrow}
        headline={p.holds.headline}
      >
        <PointGrid items={p.holds.items} />
      </ProductSection>
      <WorksWith slugs={['ai-planner', 'project-manager', 'agent-fleet']} />
      <ProductClose headline={p.close.headline} body={p.close.body} />
    </SiteShell>
  )
}
