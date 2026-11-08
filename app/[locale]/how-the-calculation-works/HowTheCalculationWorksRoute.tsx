import type { Metadata } from '@/lib/metadata'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { getCopy } from '@/lib/copy'
import { HOW_THE_CALCULATION_WORKS } from '@/lib/destinations'
import { readExplainerCategories } from '@/lib/explainer/categories'
import { requireExplainerFigures } from '@/lib/explainer/figures'
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
 * the body. The figures are read once per build from the same plan catalog
 * the price card reads, and an unreadable or unknown answer fails the build
 * (MOTIR-10644); `ExplainerPage` still draws the ten sections in words for a
 * caller that hands it none. Reached by plain in-text links only — it has no
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
  const [copy, figures, categories] = await Promise.all([
    getCopy(locale),
    requireExplainerFigures(),
    readExplainerCategories(),
  ])
  return (
    <SiteShell host={SITE_HOST}>
      <ExplainerPage
        copy={copy.explainer}
        locale={locale}
        figures={figures}
        categories={categories}
      />
    </SiteShell>
  )
}
