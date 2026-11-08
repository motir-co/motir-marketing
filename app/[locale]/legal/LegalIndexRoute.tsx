import { localizedPath } from '@/i18n/localizedPath'
import { getCopy, format } from '@/lib/copy'
import { listLegalDocuments } from '@/lib/legal/documents'
import { DEFAULT_LOCALE } from '@/i18n/routing'
import { BindingEnglishNote } from './_components/BindingEnglishNote'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'

/**
 * `/legal` — the index of the published legal set (MOTIR-4009), built to
 * `design/legal/` (MOTIR-4005).
 *
 * The rows come from the DIRECTORY — the same `listLegalDocuments()` the
 * document routes use — so this page cannot list a document that does not
 * render, or omit one that does. It exists for the same reason the app host's
 * index does: seven links have no natural home in a four-column footer, and a
 * reader sent a link to one document deserves a way to find the rest.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/legal', (copy) => ({
    title: copy.legal.metaTitle,
    description: copy.legal.metaDescription,
  }))
}

export default async function LegalIndexPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const documents = listLegalDocuments()

  return (
    /* The width box and the `main` landmark this page used to open with both
       live in `app/[locale]/legal/LegalLayout.tsx`'s `SiteShell` now (MOTIR-4169). */
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.legal.indexTitle}
      </h1>
      <p className="mt-2 max-w-[34rem] text-[14px] leading-relaxed text-(--el-text-secondary)">
        {copy.legal.indexIntro}
      </p>

      {/* Between the intro and the list, its own plural sentence and no link
          (design decision B): each row opens a document whose note links to
          its English text. Nothing in English. */}
      <BindingEnglishNote
        locale={locale}
        copy={copy}
        variant="index"
        className="mt-6"
      />

      <ul
        className={`${locale === DEFAULT_LOCALE ? 'mt-8' : 'mt-6'} flex flex-col border-y border-(--el-border)`}
      >
        {documents.map((doc) => (
          <li
            key={doc.slug}
            className="border-b border-(--el-border) last:border-b-0"
          >
            <a
              href={localizedPath(locale, `/legal/${doc.slug}`)}
              className="flex flex-col gap-1 py-4 hover:bg-(--el-surface-soft)"
            >
              {/* English front matter, so `lang="en"` — on the title only,
                  never on the row link, whose version line is translated. */}
              <span
                lang="en"
                className="text-[14px] font-semibold text-(--el-text)"
              >
                {doc.title}
              </span>
              <span className="text-[13px] text-(--el-text-secondary)">
                {doc.effectiveDate
                  ? format(copy.legal.versionAndEffective, {
                      version: doc.version,
                      date: doc.effectiveDate,
                    })
                  : format(copy.legal.versionNotYetEffective, {
                      version: doc.version,
                    })}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-[13px] text-(--el-text-secondary)">
        {copy.legal.indexContact}
      </p>
    </>
  )
}
