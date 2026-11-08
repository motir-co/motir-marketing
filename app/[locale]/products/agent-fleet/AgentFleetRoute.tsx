import { localizedPath } from '@/i18n/localizedPath'
import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import { format, getCopy } from '@/lib/copy'
import { DOCS_DIFFICULTY } from '@/lib/destinations'
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
import { ReadyUi, RunsUi } from '../_components/FleetUi'
import { ApprovalsUi } from '../_components/PmUi'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * Motir Agent Fleet's page (2026-10 redesign): Motir's HOSTED agents (OpenCode,
 * on Motir's machines, on a model Motir offers) and the scale they bring — one
 * machine per ready work item, as many at once as there is ready work, each
 * run claiming its item so no two take the same one. The model follows the
 * work item's difficulty (motir-ai `HOSTED_AGENT_MODELS`) unless the project or
 * the person picks one. Motir Project Manager starting runs is written as the
 * product will ship it (Yue, 2026-10-06).
 *
 * Kept out of the index (`robots: noindex`) and the sitemap while it is in
 * review, like the placeholders.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/products/agent-fleet', (copy) => ({
    title: format(copy.products.metaTitle, {
      name: productOf('agent-fleet', copy).name,
    }),
    description: copy.products.agentFleet.metaDescription,
    robots: { index: false, follow: true },
  }))
}

export default async function AgentFleetPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const p = (await getCopy(locale)).products.agentFleet
  return (
    <SiteShell host={SITE_HOST} overlayHeader>
      <ProductHero
        slug="agent-fleet"
        headline={p.headline}
        lede={p.lede}
        art={<RunsUi compact />}
      />
      <ProductSection
        id="parallel"
        eyebrow={p.parallel.eyebrow}
        headline={p.parallel.headline}
        body={p.parallel.body}
        art={<ReadyUi />}
      />
      <ProductSection
        id="pm"
        eyebrow={p.pm.eyebrow}
        headline={p.pm.headline}
        body={p.pm.body}
        art={<ApprovalsUi />}
        flip
      />
      <ProductSection
        id="models"
        eyebrow={p.models.eyebrow}
        headline={p.models.headline}
        body={p.models.body}
      >
        <div className="grid gap-5">
          <PointGrid items={p.models.items} />
          <OutLink
            href={localizedPath(locale, DOCS_DIFFICULTY)}
            className="justify-self-start"
          >
            {p.models.docsLink}
          </OutLink>
        </div>
      </ProductSection>
      <ProductSection
        id="care"
        eyebrow={p.care.eyebrow}
        headline={p.care.headline}
      >
        <PointGrid items={p.care.items} />
      </ProductSection>
      <ProductSection
        id="record"
        eyebrow={p.record.eyebrow}
        headline={p.record.headline}
        body={p.record.body}
      >
        <RunsUi sections={['past']} />
      </ProductSection>
      <WorksWith
        slugs={['agent-hosting', 'ai-planner', 'project-management']}
      />
      <ProductClose headline={p.close.headline} body={p.close.body} />
    </SiteShell>
  )
}
