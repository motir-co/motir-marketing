import type { Metadata } from '@/lib/metadata'
import { localePageMetadata } from '@/lib/localeMetadata'
import { PRICE } from '@/lib/destinations'
import { SITE_HOST } from '@/lib/publicHost'
import { requirePlanLadder } from '@/lib/priceLadder'
import { PricePage } from '../../_components/PricePage'
import { PriceCard } from '../../_components/price/PriceCard'
import { CalculatorIsland } from '../../_islands'
import { SiteShell } from '../../_components/SiteShell'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * motir.co/price — the plan ladder and the credit calculator (MOTIR-8382).
 *
 * Built as `/design` is: server-rendered chrome, the page's own metadata and
 * thirteen `hreflang` alternates through `localePageMetadata`, and a body that
 * composes the price card and the calculator (`PricePage`). Every figure on it
 * is read from motir-ai's public routes — the ladder once per build, failing
 * the build when it cannot be read (MOTIR-10644), the estimate in the browser; the words are app.motir.co's billing
 * copy (design/price/design-notes.md).
 */
export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, PRICE, (copy) => ({
    title: copy.pricePage.metaTitle,
    description: copy.pricePage.metaDescription,
  }))
}

export default async function PriceRoute({ params }: LocalePageProps) {
  await enterLocale(params)
  const ladder = await requirePlanLadder()
  return (
    <SiteShell host={SITE_HOST}>
      <PricePage
        plans={<PriceCard ladder={ladder} />}
        calculator={<CalculatorIsland />}
      />
    </SiteShell>
  )
}
