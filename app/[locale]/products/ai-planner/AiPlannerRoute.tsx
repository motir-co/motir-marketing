import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import { format, getCopy } from '@/lib/copy'
import { MOTIR_PROJECT_PLANS } from '@/lib/destinations'
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
import { LessonsArt } from '../_components/PlannerArt'
import { PlannerChatUi, PlannerWorkspaceUi } from '../_components/PlannerUi'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * Motir AI Planner's page (2026-10 redesign) — the first product page written
 * in full; the other products keep the placeholder at `/products/[slug]` until
 * theirs is. The page follows the planner's own order: the idea goes in, the
 * planner works it through with you, you approve, and the plan holds what the
 * work needs — then the learning loop that makes the next plan better.
 *
 * Kept out of the index (`robots: noindex`) and the sitemap while it is in
 * review, like the placeholders.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/products/ai-planner', (copy) => ({
    title: format(copy.products.metaTitle, {
      name: productOf('ai-planner', copy).name,
    }),
    description: copy.products.aiPlanner.metaDescription,
    robots: { index: false, follow: true },
  }))
}

export default async function AiPlannerPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const p = (await getCopy(locale)).products.aiPlanner
  return (
    <SiteShell host={SITE_HOST} overlayHeader>
      <ProductHero
        slug="ai-planner"
        headline={p.headline}
        lede={p.lede}
        art={<PlannerChatUi />}
      />
      <ProductSection
        id="steps"
        eyebrow={p.steps.eyebrow}
        headline={p.steps.headline}
      >
        <PointGrid items={p.steps.items} numbered />
      </ProductSection>
      <ProductSection
        id="gate"
        eyebrow={p.gate.eyebrow}
        headline={p.gate.headline}
        body={p.gate.body}
      >
        <div className="grid gap-5">
          <PlannerWorkspaceUi />
          {/* Motir's real plans, in the visitor view (sign-in and consent). */}
          <OutLink href={MOTIR_PROJECT_PLANS} className="justify-self-start">
            {p.gate.motirPlans}
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
      <ProductSection
        id="learns"
        eyebrow={p.learns.eyebrow}
        headline={p.learns.headline}
        body={p.learns.body}
        art={<LessonsArt />}
        flip
      />
      <WorksWith
        slugs={['project-management', 'project-manager', 'agent-fleet']}
      />
      <ProductClose headline={p.close.headline} body={p.close.body} />
    </SiteShell>
  )
}
