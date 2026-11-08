import type { Metadata } from '@/lib/metadata'
import { localePageMetadata } from '@/lib/localeMetadata'
import { DesignShowcaseIsland } from '../../_islands'
import { SiteShell } from '../../_components/SiteShell'
import { SITE_HOST } from '@/lib/publicHost'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * motir.co/design — the public design showcase (MOTIR-1043 · 8.3.16).
 *
 * The site's SECOND page and its first internal second route. It is a
 * marketing / credibility surface rather than a token reference: the argument
 * it makes is "the design system Motir gives you is the one Motir wears", and
 * it makes it by letting a visitor move three controls and watch this page —
 * bar and footer included — become a different-looking product.
 *
 * ⚠️ NOT `/tokens`, and that is a collision rather than a preference.
 * motir-core has a `/tokens` route of its own — the internal, dev-only living
 * specimen, which stays exactly where it is and is not being migrated — and on
 * a marketing host the word reads as API tokens, which `app.motir.co/settings/
 * account/tokens` genuinely is.
 *
 * PUBLIC by construction: `motir-marketing` has no auth of any kind, so there
 * is no gate to remove here. Server-rendered chrome around ONE client island
 * (the showcase), the same shape as the landing.
 */
export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/design', (copy) => ({
    title: copy.designShowcase.heading,
    description: copy.designShowcase.subline,
  }))
}

export default async function DesignPage({ params }: LocalePageProps) {
  await enterLocale(params)
  return (
    <SiteShell host={SITE_HOST}>
      <DesignShowcaseIsland />
    </SiteShell>
  )
}
