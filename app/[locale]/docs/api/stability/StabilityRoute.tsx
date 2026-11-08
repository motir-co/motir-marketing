import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import { getCopy } from '@/lib/copy'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { DocsDocument } from '../../_components/DocsDocument'

/*
 * The stability & deprecation policy (MOTIR-4046, RESTORED by MOTIR-4429).
 *
 * ⚠️ WHAT THIS CARD FIXED. The page was three bullets — additive, breaking,
 * deprecation — and `v2` appeared ZERO times on it. The deleted `motir-core`
 * page at `95a2d4468^` (`lib/apiDocs/guide.ts`, `POLICY_SECTIONS`) carried
 * FOUR sections, and the two that went missing are the two that ask something
 * of the reader: **Your side of the promise** (what a client must tolerate for
 * the guarantee to hold) and **How a `v2` would arrive** (the migration story).
 * A promise with only the vendor's half written down is not a contract.
 * MOTIR-4397's parity ledger measured the loss; this is the restore, and the
 * three bullets the page had are kept — as the two explicit lists they were
 * summarising.
 *
 * ── ONE PROMISE IN TWO PLACES, and this is the PUBLISHED half ──────────────
 * `motir-core`'s `docs/decisions/public-api-conventions.md` §8 is the INTERNAL
 * record and this page is the public commitment. Over there the two were held
 * together by `adrPhrase` on every item plus a test that reads §8. That guard
 * CANNOT be reproduced here: the ADR is in another repository and this lane
 * never reaches it, so a phrase-matching structure copied across would be a
 * check that cannot go red — worse than no check, because it looks like one.
 *
 * What is here instead is honest about which half it is: the two lists in
 * `content/docs/api/stability/en.md` are the PUBLISHED sentences (they were
 * `policy.ts`'s constants until MOTIR-8037 moved them into the document), and
 * `tests/docs/apiGuide.test.tsx` pins their MEMBERSHIP by reading that file,
 * so a silent edit that quietly widens what may change fails a test. Holding them against §8 itself belongs in `tests/seam/`, the one lane
 * licensed to reach motir-core — and it needs §8 published as an artifact
 * first, which it is not. That is stated here rather than left as a gap
 * somebody rediscovers.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/api/stability', (copy) => ({
    title: copy.docs.metaTitleStability,
    description: copy.docs.metaDescriptionStability,
  }))
}

export default async function StabilityPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.apiStability}
      </h1>
      <DocsDocument slug="api/stability" locale={locale} slots={{}} />
    </>
  )
}
