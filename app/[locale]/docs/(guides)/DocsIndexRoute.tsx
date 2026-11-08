import { getCopy } from '@/lib/copy'
import { setupPrompt } from '@/lib/setupPrompt'
import { SetupPromptButtonIsland } from '@/app/_islands'
import { DOCS_INDEX_HREF, docsSurfacesFor } from '@/lib/docsSurfaces'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { localePageMetadata, localizedPath } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'

/*
 * The docs index (MOTIR-4046) — where the top bar's `Docs` item lands, and the
 * page whose entire content is a list of what this area contains.
 *
 * ⚠️ IT DOES NOT KEEP ITS OWN LIST (MOTIR-4507). It used to: a `groups` array
 * here and `SURFACES` in `DocsRail.tsx` held the same fact, and when
 * MOTIR-4227 added `/docs/public-address` it reached the rail and not this
 * page. One section per surface, drawn from `lib/docsSurfaces.ts`, which is
 * also the rail's first tier — so a page added to that file arrives here with
 * no edit to this one, and there is no number in this comment to go stale.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, DOCS_INDEX_HREF, (copy) => ({
    title: copy.docs.metaTitle,
    description: copy.docs.metaDescription,
  }))
}

export default async function DocsIndexPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.indexTitle}
      </h1>
      <p className="mt-2 max-w-[40rem] text-[14px] leading-relaxed text-(--el-text-secondary)">
        {copy.docs.indexIntro}
      </p>

      <section
        aria-labelledby="setup-prompt-h"
        data-surface="card"
        className="mt-6 grid gap-3 rounded-(--radius-card) border border-(--el-border) bg-(--el-card) p-(--spacing-card-padding) shadow-(--shadow-card)"
      >
        <h2
          id="setup-prompt-h"
          className="m-0 font-(family-name:--font-serif) text-lg font-semibold text-(--el-text)"
        >
          {copy.setupPrompt.title}
        </h2>
        <p className="m-0 max-w-[60ch] text-[14px] leading-relaxed text-(--el-text-secondary)">
          {copy.setupPrompt.body}
        </p>
        <div>
          <SetupPromptButtonIsland />
        </div>
        <details className="text-[13px] text-(--el-text-secondary)">
          <summary className="cursor-pointer">{copy.setupPrompt.show}</summary>
          <pre className="mt-2 max-h-[22rem] overflow-auto rounded-(--radius-control) bg-(--el-code-bg) p-3 font-(family-name:--font-mono) text-[12px] leading-relaxed whitespace-pre-wrap text-(--el-code-text)">
            {setupPrompt()}
          </pre>
        </details>
      </section>

      {docsSurfacesFor(copy).map((surface) => (
        <section key={surface.href} className="mt-8">
          <h2 className="font-(family-name:--font-serif) text-lg font-semibold text-(--el-text)">
            {surface.label}
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-(--el-border) border-y border-(--el-border)">
            {/* The surface's own page first, then the pages inside it — the
                same order the rail's two tiers read, so a reader who has used
                one recognises the other. */}
            {[surface, ...surface.pages].map((item) => (
              <li key={item.href}>
                <a
                  href={localizedPath(locale, item.href)}
                  className="flex flex-col gap-1 py-4 hover:bg-(--el-surface-soft)"
                >
                  <span className="text-[14px] font-semibold text-(--el-text)">
                    {item.label}
                  </span>
                  <span className="text-[13px] text-(--el-text-secondary)">
                    {item.description}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
