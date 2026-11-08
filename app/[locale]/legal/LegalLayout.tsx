import type { Metadata } from '@/lib/metadata'
import { getCopy } from '@/lib/copy'
import { SiteShell } from '@/app/_components/SiteShell'
import { SITE_HOST } from '@/lib/publicHost'
import { enterLocale, type LocaleParams } from '@/i18n/locale'

/**
 * The legal-document shell (MOTIR-4009).
 *
 * The room is composed from the same chrome every motir.co surface wears —
 * `SiteHeader` + `SiteFooter` — so a legal page cannot drift from the rest of
 * the site. `/legal` marks NEITHER nav item current: the shipped header only
 * marks its one internal route (`/design`), and Explore / Docs stay cross-origin
 * until their own cards land.
 *
 * ── NO database read, NO API call ───────────────────────────────────────────
 * These pages are files on disk. The reason the app host's shipped layout gives
 * still applies: a legal page that 500s because a database is unreachable is a
 * worse failure than a narrowed crawl surface.
 *
 * ── THE DOCUMENTS STAY ENGLISH, BY DECISION (MOTIR-4009, MOTIR-7740) ────────
 * The SURROUNDING chrome labels — the breadcrumb, the version line, the index
 * title and intro — are read through the page's locale (`getCopy`,
 * MOTIR-7950). The contract text itself is never translated: a non-English
 * page wraps the English document, and the binding-English note above it says
 * so in the reader's language and links to the English text
 * (`_components/BindingEnglishNote.tsx`, design
 * `design/legal/design-notes.md` § `legal--binding-english-note.*`). Search
 * engines are pointed at English too: every language version of a document is
 * canonical to the unprefixed English address (MOTIR-8086).
 */

/*
 * The words only, in the page's locale. This used to set `canonical: '/legal'`,
 * which every document under it inherited — so `/legal/privacy` told a crawler
 * its canonical was the index. Each page names its own now (MOTIR-7956).
 */
export async function generateMetadata({
  params,
}: {
  params: LocaleParams
}): Promise<Metadata> {
  const copy = await getCopy(await enterLocale(params))
  return {
    title: copy.legal.metaTitle,
    description: copy.legal.metaDescription,
  }
}

export default async function LegalLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: LocaleParams }>) {
  await enterLocale(params)
  return (
    /* ⚠️ THE WIDTH BOX MOVED HERE FROM THE TWO PAGES (MOTIR-4169). Both of
       them used to open with `<main className="mx-auto … max-w-[46rem] …">`;
       the landmark now belongs to the chrome, so the box it carried travels
       with it. Identical values, one place. */
    <SiteShell
      host={SITE_HOST}
      contentClassName="mx-auto w-full max-w-[46rem] px-(--spacing-card-padding) py-10"
    >
      {children}
    </SiteShell>
  )
}
