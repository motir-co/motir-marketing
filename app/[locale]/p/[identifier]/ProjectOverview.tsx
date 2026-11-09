import { MarkdownBody } from '@/app/[locale]/legal/_components/MarkdownBody'
import { format, useCopy } from '@/lib/copy'
import { SITE_HOST } from '@/lib/publicHost'
import type { PublicProjectOverviewDto } from '@/lib/publicProject'
import { ProjectJsonLd } from './_components/JsonLd'
import { ProjectHeader } from './_components/ProjectHeader'
import { EmptyState, ErrorState } from './_components/States'
import { WatchLive } from './_components/WatchLive'

/**
 * `motir.co/p/<identifier>` — the public project OVERVIEW (MOTIR-4115), built to
 * `design/public-projects/` panel 1. The route that makes every card on
 * `/explore` resolve. Rendered per request by the Worker (MOTIR-10753) from the
 * project read it has already made: a public project page shows live counts,
 * and a copy frozen at build would serve them as they were at the last deploy.
 */
export function ProjectOverview({
  project,
}: {
  project: PublicProjectOverviewDto
}) {
  const copy = useCopy().publicProject
  return (
    <>
      <ProjectJsonLd
        project={project}
        fallbackDescription={format(copy.meta.jsonLdFallback, {
          name: project.name,
        })}
      />
      <ProjectHeader project={project} current="" host={SITE_HOST} />

      {/* The overview reads in its own column; "Watch it being built" stands
          beside it (2026-10 redesign — the page uses the full width). */}
      <div className="mt-8 grid items-start gap-x-[clamp(32px,4vw,64px)] gap-y-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
        <div className="max-w-[46rem] min-w-0">
          {project.publicOverviewMd ? (
            <MarkdownBody value={project.publicOverviewMd} />
          ) : (
            <EmptyState title={copy.overview.empty.title}>
              {copy.overview.empty.body}
            </EmptyState>
          )}
        </div>
        <aside className="lg:sticky lg:top-6">
          <WatchLive identifier={project.identifier} name={project.name} />
        </aside>
      </div>
    </>
  )
}

/**
 * The project page when the API did not answer (design MOTIR-6742 panel E).
 *
 * ⚠️ THE ERROR STATE, NEVER A 404. The project may well exist: a 404 is a
 * statement about the world, an error is a statement about us, and a crawler
 * acts on the first. The Watch entry needs only the identifier, so it still
 * renders — the one way forward the visitor has.
 */
export function ProjectOverviewUnavailable({
  identifier,
}: {
  identifier: string
}) {
  const copy = useCopy().publicProject
  return (
    <>
      <ErrorState title={copy.states.error.project} host={SITE_HOST} />
      <div className="mt-5 max-w-[40rem]">
        <WatchLive identifier={identifier} name={null} />
      </div>
    </>
  )
}

/**
 * Any other `/p/*` page when the PROJECT read failed: the error state alone,
 * inside the chrome.
 */
export function ProjectUnavailable() {
  const copy = useCopy().publicProject
  return <ErrorState title={copy.states.error.project} host={SITE_HOST} />
}
