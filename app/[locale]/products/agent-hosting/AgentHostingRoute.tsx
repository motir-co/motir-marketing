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
import { MyAgentsUi } from '../_components/FleetUi'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * Motir Agent Hosting's page (2026-10 redesign): the person's OWN agents in
 * Motir's cloud — "My agents" (agent instances, `origin: instance`). Each is
 * the agent the person already uses, on its own Motir machine with the
 * project's repositories cloned in, signed in with their own account; its
 * model usage is billed by its vendor, and Motir charges only machine time
 * (one credit a minute while it runs, hibernating after 30 idle minutes, a
 * small daily storage charge). One run per agent at a time; up to ten agents
 * per person (`lib/agentInstances/config.ts`). Motir's own hosted agents are
 * Agent Fleet's page.
 *
 * Kept out of the index (`robots: noindex`) and the sitemap while it is in
 * review, like the placeholders.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/products/agent-hosting', (copy) => ({
    title: format(copy.products.metaTitle, {
      name: productOf('agent-hosting', copy).name,
    }),
    description: copy.products.agentHosting.metaDescription,
    robots: { index: false, follow: true },
  }))
}

export default async function AgentHostingPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const p = (await getCopy(locale)).products.agentHosting
  return (
    <SiteShell host={SITE_HOST} overlayHeader>
      <ProductHero
        slug="agent-hosting"
        headline={p.headline}
        lede={p.lede}
        art={<MyAgentsUi />}
      />
      <ProductSection
        id="setup"
        eyebrow={p.setup.eyebrow}
        headline={p.setup.headline}
      >
        <PointGrid items={p.setup.items} numbered />
      </ProductSection>
      <ProductSection
        id="terms"
        eyebrow={p.terms.eyebrow}
        headline={p.terms.headline}
      >
        <PointGrid items={p.terms.items} />
      </ProductSection>
      <ProductSection
        id="away"
        eyebrow={p.away.eyebrow}
        headline={p.away.headline}
      >
        <PointGrid items={p.away.items} />
      </ProductSection>
      <WorksWith slugs={['agent-fleet', 'project-management', 'ai-planner']} />
      <ProductClose headline={p.close.headline} body={p.close.body} />
    </SiteShell>
  )
}
