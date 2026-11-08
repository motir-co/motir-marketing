import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import { getCopy } from '@/lib/copy'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { DocsDocument } from '../../_components/DocsDocument'

/*
 * The SENTRY guide (MOTIR-6007) — committed prose, for the person connecting
 * their team's Sentry organisation to a Motir project, and for Sentry's own
 * reviewers, who read it during publication review (MOTIR-6004).
 *
 * ⚠️ EVERY LABEL IS COPIED FROM THE PRODUCT, NOT FROM MEMORY. The button,
 * switch and status names below are motir-core's shipped `monitoring.*` strings
 * (`messages/en.json`). A guide naming a control the screen does not have sends
 * a reader looking for it; when the product's wording changes, this page does.
 *
 * ⚠️ SENTRY'S "ISSUES" ARE CALLED ERRORS HERE, ON PURPOSE. `issue` is a banned
 * word on every docs page (`tests/docs/terminology.test.tsx`): in Motir the unit
 * of work is a work item, and the rule has no exemption for another product's
 * vocabulary. So a Sentry issue is "an error" throughout, and the permissions
 * are named by Sentry's own scope identifiers rather than by the label Sentry
 * groups them under.
 *
 * ⚠️ NO NUMBERS THAT LIVE ELSEWHERE. The check interval and Sentry's token
 * lifetime are the product's and Sentry's to change; the page says what happens,
 * not how often.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/sentry', (copy) => ({
    title: copy.docs.metaTitleSentry,
    description: copy.docs.metaDescriptionSentry,
  }))
}

/*
 * THE PROSE LIVES IN `content/docs/sentry/<locale>.md` (MOTIR-8036); this file
 * keeps the heading and renders the document. It carries no slot and no value:
 * the scopes table is a GFM table whose scope identifiers are inline code, so
 * every word on the page is the document's.
 */
export default async function SentryDocsPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.sentry}
      </h1>
      <DocsDocument slug="sentry" locale={locale} slots={{}} />
    </>
  )
}
