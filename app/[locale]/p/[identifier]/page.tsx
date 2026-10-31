import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { deriveDescription, loadProject } from '@/lib/publicProject'
import { format, getCopy } from '@/lib/copy'
import { projectAlternates } from '@/lib/localeMetadata'
import { enterLocale } from '@/i18n/locale'
import { publicUrlFor, requestPublicHost } from '@/lib/publicHost'
import { MarkdownBody } from '@/app/[locale]/legal/_components/MarkdownBody'
import { ProjectHeader } from './_components/ProjectHeader'
import { EmptyState, ErrorState } from './_components/States'
import { WatchLive } from './_components/WatchLive'
import { ProjectJsonLd } from './_components/JsonLd'

/**
 * `motir.co/p/<identifier>` — the public project OVERVIEW (MOTIR-4115), built to
 * `design/public-projects/` panel 1.
 *
 * This is the route that makes every card on `/explore` resolve: the directory
 * has been linking `href="/p/<identifier>"` in production while both hosts
 * answered 404.
 *
 * ⚠️ DYNAMIC. A public project page shows a live board, a live changelog and
 * live counts; a copy frozen at build time would serve a project's state as it
 * was when this site last deployed. `lib/publicProject.ts` reads with
 * `revalidate: 0` for the same reason.
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string; identifier: string }>
}): Promise<Metadata> {
  const { identifier } = await params
  const locale = await enterLocale(params)
  const read = await loadProject(identifier)
  // No metadata for a project that is not there, and none invented for one we
  // could not reach: a canonical emitted during an outage would be indexed.
  if (read.status !== 'ok') return {}

  const project = read.data
  const alternates = projectAlternates(locale, publicUrlFor(project))
  const url = alternates.canonical as string
  // MOTIR-6745 — no longer a promise of reading without an account: the live
  // board, items and roadmap are in the app now, behind a Motir account
  // (MOTIR-6743). What this page offers without one is the overview, the
  // changelog and requesting a feature — in the page's locale (MOTIR-7956).
  const description = deriveDescription(
    project.publicTagline ?? project.publicOverviewMd,
    (await getCopy(locale)).publicProject.meta.overviewFallback,
  )

  return {
    title: `${project.name} · ${project.identifier}`,
    description,
    // ⚠️ SITE_ORIGIN, never APP_ORIGIN. This host owns the canonical now — the
    // whole point of the move — and `lib/siteOrigin.ts` is the one module that
    // answers "where is the public site?". Getting this backwards is silent in
    // production and asserted against in the suite.
    alternates,
    openGraph: {
      type: 'website',
      url,
      title: `${project.name} · ${project.identifier}`,
      description,
      siteName: 'Motir',
    },
  }
}

export default async function PublicProjectOverviewPage({
  params,
}: {
  params: Promise<{ locale?: string; identifier: string }>
}) {
  const { identifier } = await params
  const copy = (await getCopy(await enterLocale(params))).publicProject
  const host = await requestPublicHost()
  const read = await loadProject(identifier)

  // ⚠️ THREE OUTCOMES, and the two failures are NOT the same thing.
  //
  // `not-found` is the API saying the project does not exist or is not public:
  // a real 404, which a crawler must see so it drops the link. `failed` is the
  // API not answering: the project may well exist, and telling a visitor it was
  // deleted every time motir-core restarts is the worse direction — a 404 is a
  // statement about the world, an error is a statement about us.
  if (read.status === 'not-found') notFound()
  if (read.status === 'failed') {
    // The Watch entry needs only the identifier, so it still renders — the one
    // way forward the visitor has (design MOTIR-6742 panel E).
    return (
      <>
        <ErrorState title={copy.states.error.project} host={host} />
        <div className="mt-5 max-w-[40rem]">
          <WatchLive identifier={identifier} name={null} />
        </div>
      </>
    )
  }

  const project = read.data

  return (
    <>
      <ProjectJsonLd
        project={project}
        fallbackDescription={format(copy.meta.jsonLdFallback, {
          name: project.name,
        })}
      />
      <ProjectHeader project={project} current="" host={host} />

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
          <WatchLive identifier={identifier} name={project.name} />
        </aside>
      </div>
    </>
  )
}
