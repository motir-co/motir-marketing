import type { Metadata } from 'next'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { getCopy } from '@/lib/copy'
import { HOW_THE_CALCULATION_WORKS } from '@/lib/destinations'
import { readExplainerCategories } from '@/lib/explainer/categories'
import { readExplainerFigures } from '@/lib/explainer/figures'
import { localePageMetadata } from '@/lib/localeMetadata'
import { SITE_HOST } from '@/lib/publicHost'
import { SiteShell } from '../../_components/SiteShell'
import { ExplainerPage } from './_components/ExplainerPage'

/*
 * motir.co/how-the-calculation-works — where the credit estimate and the plan
 * it recommends come from (MOTIR-8383 · MOTIR-9691).
 *
 * Built as `/how-it-works` is: the page's own metadata and every locale's
 * `hreflang` alternate through `localePageMetadata`, then the site shell around
 * the body. The figures are read once, before render, from the same plan
 * catalog the price card reads; an unreadable or unknown answer renders the
 * same ten sections in words. Reached by plain in-text links only — it has no
 * header or footer entry.
 */
export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, HOW_THE_CALCULATION_WORKS, (copy) => ({
    title: copy.explainer.metaTitle,
    description: copy.explainer.metaDescription,
  }))
}

export default async function HowTheCalculationWorksRoute({
  params,
}: LocalePageProps) {
  const locale = await enterLocale(params)
  const [copy, result, categories] = await Promise.all([
    getCopy(locale),
    readExplainerFigures(),
    readExplainerCategories(),
  ])
  return (
    <SiteShell host={SITE_HOST}>
      <ExplainerPage
        copy={copy.explainer}
        locale={locale}
        figures={result.state === 'figures' ? result.figures : null}
        categories={categories}
      />
    </SiteShell>
  )
}
