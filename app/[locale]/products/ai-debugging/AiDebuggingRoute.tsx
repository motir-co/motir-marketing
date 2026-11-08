import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import { format, getCopy } from '@/lib/copy'
import { SITE_HOST } from '@/lib/publicHost'
import { SiteShell } from '../../../_components/SiteShell'
import { productOf } from '../../../_components/products'
import {
  PointGrid,
  ProductClose,
  ProductHero,
  ProductSection,
  WorksWith,
} from '../_components/ProductPage'
import { BoardUi } from '../_components/PmUi'
import {
  DebugTurnUi,
  ErrorsUi,
  MonitoringUi,
  PlannedBugUi,
  RunFindingsUi,
} from '../_components/DebugUi'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * Motir AI Debugging's page (2026-10 redesign): the three ways a bug arrives
 * planned, and it says what ships and no more.
 *   • Described — a debug turn in the Motir AI conversation (`debug_bug`):
 *     it traces the code, checks for a covering card, and writes exactly one
 *     thing, or nothing when it cannot ground the bug.
 *   • From production — Sentry, the one error source: each new error becomes
 *     ONE bug, AI plans it (`author_bug`) with its causes labelled as
 *     hypotheses, and finishing it resolves the error in Sentry.
 *   • From an agent run — a bug found outside the run's own work item is
 *     filed and the run carries on; the run lists it as a finding.
 * Nothing fixes a bug on arrival — a person, or the agent a person runs, picks
 * it up — so the page never promises an automatic fix.
 *
 * Kept out of the index (`robots: noindex`) and the sitemap while it is in
 * review, like the placeholders.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/products/ai-debugging', (copy) => ({
    title: format(copy.products.metaTitle, {
      name: productOf('ai-debugging', copy).name,
    }),
    description: copy.products.aiDebugging.metaDescription,
    robots: { index: false, follow: true },
  }))
}

export default async function AiDebuggingPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const p = (await getCopy(locale)).products.aiDebugging
  return (
    <SiteShell host={SITE_HOST} overlayHeader>
      <ProductHero
        slug="ai-debugging"
        headline={p.headline}
        lede={p.lede}
        art={<DebugTurnUi />}
      />
      <ProductSection
        id="sources"
        eyebrow={p.sources.eyebrow}
        headline={p.sources.headline}
      >
        <PointGrid items={p.sources.items} />
      </ProductSection>
      <ProductSection
        id="production"
        eyebrow={p.production.eyebrow}
        headline={p.production.headline}
        body={p.production.body}
        art={<ErrorsUi />}
      />
      <ProductSection
        id="plan"
        eyebrow={p.plan.eyebrow}
        headline={p.plan.headline}
        body={p.plan.body}
        art={<PlannedBugUi />}
        flip
      />
      <ProductSection
        id="runs"
        eyebrow={p.runs.eyebrow}
        headline={p.runs.headline}
        body={p.runs.body}
        art={<RunFindingsUi />}
      />
      <ProductSection
        id="fix"
        eyebrow={p.fix.eyebrow}
        headline={p.fix.headline}
        body={p.fix.body}
      >
        <BoardUi columns={p.ui.board} />
      </ProductSection>
      <ProductSection
        id="setup"
        eyebrow={p.setup.eyebrow}
        headline={p.setup.headline}
        body={p.setup.body}
        art={<MonitoringUi />}
        flip
      />
      <WorksWith slugs={['project-management', 'agent-fleet', 'ai-planner']} />
      <ProductClose headline={p.close.headline} body={p.close.body} />
    </SiteShell>
  )
}
