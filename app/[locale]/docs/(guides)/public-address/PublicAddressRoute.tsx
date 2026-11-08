import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import { getCopy } from '@/lib/copy'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { DocsDocument } from '../../_components/DocsDocument'

/*
 * The PUBLIC ADDRESS guide (Story MOTIR-3878 · MOTIR-4227, corrected by
 * MOTIR-4316) — committed prose, for the person editing DNS at their registrar
 * rather than for an engineer.
 *
 * ⚠️ THE PANE IS AUTHORITATIVE FOR EVERY VALUE, AND THIS PAGE CARRIES NONE.
 * MOTIR-4227 documented the pointing records with LITERAL values and said so in
 * a callout, because the settings pane then showed only the ownership TXT
 * (MOTIR-4278) — a discrepancy stated plainly rather than a page describing a
 * screen nobody would see. MOTIR-4278 shipped that half of the pane and
 * MOTIR-4314 set the values on the deployment, so the pane now lists EVERY
 * record a domain needs, with a copy button on each. The workaround is retired
 * with the defect it worked around.
 *
 * ⚠️ AND THE LITERALS GO WITH IT, WHICH IS THE DURABLE HALF. The pane's values
 * are read from configuration (`MOTIR_PUBLIC_ADDRESS_CNAME_TARGET` /
 * `_A_RECORDS` / `_AAAA_RECORDS` in motir-core); a literal committed here is a
 * snapshot of them, no test compares the two, and the two repositories move on
 * different clocks — so the first platform change makes this page confidently
 * wrong at the one step where being wrong points a customer's domain somewhere
 * else. What stays is the record SHAPES, which are a property of DNS and of the
 * hostname the customer typed, and which they can usefully read BEFORE they
 * start. Do not put a value back.
 *
 * ⚠️ NO NUMERIC CAP, and no tier names beyond "paid". `billing-tiering.md` owns
 * those numbers; a docs page that restated one would be the copy that goes stale
 * on the next pricing change, silently, in the place a customer trusts most.
 *
 * The status table's rows and their wording are COPIED FROM the product's own
 * `messages/en.json`, not from memory — a table that drifted from the pane would
 * send a customer looking for a state their screen does not have.
 *
 * THE PROSE LIVES IN `content/docs/public-address/<locale>.md` (MOTIR-8035); this
 * file keeps the heading and renders the document. It carries no slot and no
 * value, which is the point: every word on the page is the document's.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/public-address', (copy) => ({
    title: copy.docs.metaTitlePublicAddress,
    description: copy.docs.metaDescriptionPublicAddress,
  }))
}

export default async function PublicAddressDocsPage({
  params,
}: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.publicAddress}
      </h1>
      <DocsDocument slug="public-address" locale={locale} slots={{}} />
    </>
  )
}
