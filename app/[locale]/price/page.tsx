import type { Metadata } from 'next'
import { localePageMetadata } from '@/lib/localeMetadata'
import { PRICE } from '@/lib/destinations'
import { SITE_HOST } from '@/lib/publicHost'
import { readPlanLadder } from '@/lib/priceLadder'
import { PricePage } from '../../_components/PricePage'
import { PriceCard } from '../../_components/price/PriceCard'
import { SiteShell } from '../../_components/SiteShell'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * motir.co/price — the plan ladder and the credit calculator (MOTIR-8382).
 *
 * Built as `/design` is: server-rendered chrome, the page's own metadata and
 * thirteen `hreflang` alternates through `localePageMetadata`, and a body that
 * composes the price card and the calculator (`PricePage`). Every figure on it
 * is read from motir-ai's public routes; the words are app.motir.co's billing
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
  const ladder = await readPlanLadder()
  return (
    <SiteShell host={SITE_HOST}>
      <PricePage plans={<PriceCard ladder={ladder} />} />
    </SiteShell>
  )
}
