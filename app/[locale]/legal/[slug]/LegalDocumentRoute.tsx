import { localizedPath } from '@/i18n/localizedPath'
import type { Metadata } from '@/lib/metadata'
import { getCopy, format } from '@/lib/copy'
import { englishOnlyAlternates, localePageMetadata } from '@/lib/localeMetadata'
import { getLegalDocument } from '@/lib/legal/documents'
import { MarkdownBody } from '../_components/MarkdownBody'
import { BindingEnglishNote } from '../_components/BindingEnglishNote'
import { englishLegalPath } from '@/lib/legal/englishAddress'
import { enterLocale } from '@/i18n/locale'

/**
 * One published legal document (MOTIR-4009), built to `design/legal/`
 * (MOTIR-4005). The routes come from the DIRECTORY — its Astro page builds
 * one per `legalDocumentSlugs()`, the glob of `content/legal/`, so a document
 * ships by EXISTING and no route table has to be edited to add one.
 *
 * Server-rendered and indexable: no `'use client'`, no gate, no `robots`
 * restriction. A legal page a crawler cannot read is one a customer's
 * procurement review cannot find.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const doc = getLegalDocument(slug)
  if (!doc) return {}

  return localePageMetadata(params, `/legal/${slug}`, (copy) => ({
    title: doc.title,
    // The version rides the description so a search result distinguishes two
    // revisions of the same policy.
    description: format(copy.legal.metaDocDescription, {
      title: doc.title,
      version: doc.version,
    }),
    // Every language version of a document is canonical to the unprefixed
    // ENGLISH document, with no `hreflang` set (MOTIR-8086): the binding text
    // is English in all twelve, so the others are duplicates of it, not
    // alternates. `localeMetadata` spreads this AFTER its own `alternates`, so
    // it replaces the self-canonical and the thirteen languages wholesale.
    alternates: englishOnlyAlternates(`/legal/${slug}`),
  }))
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const { slug } = await params
  const doc = getLegalDocument(slug)

  // Only the documents on disk are built, so an unknown slug is a build
  // error; an address that names none is the static 404 page.
  if (!doc) throw new Error(`No legal document is named "${slug}"`)

  return (
    /* The width box and the `main` landmark this page used to open with both
       live in `app/[locale]/legal/LegalLayout.tsx`'s `SiteShell` now (MOTIR-4169). */
    <>
      <nav aria-label={copy.legal.breadcrumbAria} className="mb-6">
        <a
          href={localizedPath(locale, '/legal')}
          className="text-[13px] text-(--el-text-secondary) hover:text-(--el-link)"
        >
          {copy.legal.allDocuments}
        </a>
      </nav>

      {/* Above the English `h1`, so it is read before the first English word
          (design decision A). Nothing in English. */}
      <BindingEnglishNote
        locale={locale}
        copy={copy}
        variant="document"
        href={englishLegalPath(slug)}
        className="mb-6"
      />

      <header className="mb-8 border-b border-(--el-border) pb-6">
        {/* The title is English front matter (`lang="en"`); the version line
            below it is the page's own catalogue sentence and carries none. */}
        <h1
          lang="en"
          className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)"
        >
          {doc.title}
        </h1>
        <p className="mt-2 text-[13px] text-(--el-text-secondary)">
          {/*
            ⚠️ The effective date is rendered from `doc.effectiveDate`, which is
            `null` while the front matter says `TBD`. The literal string must
            never reach this page: a published policy whose date reads "TBD" is
            indistinguishable from an unfinished draft, whereas "not yet in
            effect" is TRUE, useful, and exactly what a reader should know
            before the service opens. `lib/legal/documents.ts` does the mapping
            so no page has to remember it.
          */}
          {doc.effectiveDate
            ? format(copy.legal.versionAndEffective, {
                version: doc.version,
                date: doc.effectiveDate,
              })
            : format(copy.legal.versionNotYetEffective, {
                version: doc.version,
              })}
        </p>
      </header>

      <MarkdownBody value={doc.body} locale={locale} lang="en" />
    </>
  )
}
