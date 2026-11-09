import { visitorViewUrl } from '@/lib/publicProject'
import { format, formatRich, useCopy } from '@/lib/copy'
import { useAppOrigin } from '@/lib/appOriginContext'

/**
 * "WATCH IT BEING BUILT" (MOTIR-6745; design MOTIR-6742 panel A, the
 * `public-projects--watch-live` delta). The one door from this page into the
 * live project in the app — and it states the COST before the click: a Motir
 * account, and the reader's name and email becoming visible to the project's
 * workspace Managers.
 *
 * ⚠️ THE COST LINE IS THE CONSENT SCREEN'S OWN CLAUSE. motir-core's
 * `visitor.consent.body` reads "If you continue, your name and email will be
 * visible to this project’s workspace Managers, along with when you visit." —
 * repeated here word for word, so motir.co promises exactly what the consent
 * screen then asks and nothing it doesn't. Change one, change both — it lives
 * in `publicProject.watchLive.cost` now (MOTIR-7954), and app.motir.co's
 * catalogues carry the same clause in every language.
 *
 * ⚠️ A PLAIN `<a>` on the app origin the render points at (`useAppOrigin`,
 * MOTIR-10753). It targets the
 * BOARD — the Visitor tree's default view, the one the consent screen returns
 * to. It needs only the identifier, so the page renders it even when the
 * overview read failed (design panel E), titled with `name` absent.
 */
export function WatchLive({
  identifier,
  name,
}: {
  identifier: string
  /** The project's name, or null when the overview could not be read. */
  name: string | null
}) {
  const titleId = `watch-${identifier}`
  const watch = useCopy().publicProject.watchLive
  const appOrigin = useAppOrigin()
  return (
    <section
      aria-labelledby={titleId}
      data-showcase="field"
      className="landing-art mk-halftone flex flex-col gap-4 overflow-hidden rounded-(--radius-card) border border-(--el-border) bg-(--el-showcase-field) p-[calc(var(--spacing-card-padding)*1.5)] text-(--el-showcase-field-text) shadow-(--shadow-card)"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-6 w-6 flex-none"
      >
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <div className="min-w-0">
        <h2
          id={titleId}
          className="font-(family-name:--font-serif) text-[clamp(24px,2.2vw,32px)] leading-[1.05] font-bold tracking-[-0.02em]"
        >
          {name === null
            ? watch.titleUnnamed
            : format(watch.titleNamed, { name })}
        </h2>
        <p className="mt-3 text-[15px] leading-[1.55]">{watch.lede}</p>
        <p className="mt-3 text-[13.5px] leading-[1.55]">
          {formatRich(watch.cost, {
            nameAndEmail: (
              <strong className="font-semibold">
                {watch.costNameAndEmail}
              </strong>
            ),
            managers: (
              <strong className="font-semibold">{watch.costManagers}</strong>
            ),
          })}
        </p>
      </div>
      <a
        href={visitorViewUrl(appOrigin, identifier, 'board')}
        className="inline-flex h-(--height-btn-lg) items-center justify-center self-start rounded-(--radius-btn) bg-(--el-showcase-field-text) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-field) no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-field-text)"
      >
        {watch.cta}&nbsp;<span aria-hidden>↗</span>
        <span className="sr-only"> {watch.ctaSr}</span>
      </a>
    </section>
  )
}
