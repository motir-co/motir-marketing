import type { ReactNode } from 'react'
import { ProjectChangelog } from '@/app/[locale]/p/[identifier]/ProjectChangelog'
import { ProjectLayout } from '@/app/[locale]/p/[identifier]/ProjectLayout'
import {
  ProjectOverview,
  ProjectOverviewUnavailable,
  ProjectUnavailable,
} from '@/app/[locale]/p/[identifier]/ProjectOverview'
import { ProjectRequest } from '@/app/[locale]/p/[identifier]/ProjectRequest'
import { ProjectRequestNew } from '@/app/[locale]/p/[identifier]/ProjectRequestNew'
import {
  overviewMetadata,
  requestMetadata,
  requestNewMetadata,
  tabMetadata,
} from '@/app/[locale]/p/[identifier]/projectMetadata'
import type { Locale } from '@/i18n/routing'
import { getCopy } from '@/lib/copy'
import type { Metadata } from '@/lib/metadata'
import type { DocumentPage, ProjectView } from './read'

/*
 * WHAT EACH PROJECT PAGE RENDERS, AND ITS HEAD (MOTIR-10753).
 *
 * The page modules under `app/[locale]/p/[identifier]` draw the body from the
 * reads `./read.ts` made; this pairs each with its head. Every body sits in
 * the `/p/*` shell (`ProjectLayout`), as the Next route tree's layout put it.
 */

export interface ProjectDocument {
  metadata: Metadata
  body: ReactNode
}

function shell(page: ReactNode): ReactNode {
  return <ProjectLayout>{page}</ProjectLayout>
}

/** The page and head for a project that read `ok`. */
export async function projectDocument(
  locale: Locale,
  view: ProjectView,
): Promise<ProjectDocument> {
  const copy = (await getCopy(locale)).publicProject
  const { project } = view
  switch (view.kind) {
    case 'overview':
      return {
        metadata: overviewMetadata(locale, copy, project),
        body: shell(<ProjectOverview project={project} />),
      }
    case 'changelog':
      return {
        metadata: tabMetadata(locale, copy, project, 'changelog', 'changelog'),
        body: shell(
          <ProjectChangelog project={project} changelog={view.changelog} />,
        ),
      }
    case 'request':
      return {
        metadata:
          view.request.status === 'ok'
            ? requestMetadata(locale, project, view.request.data)
            : {},
        body: shell(
          <ProjectRequest project={project} request={view.request} />,
        ),
      }
    case 'requestNew':
      return {
        metadata: requestNewMetadata(locale, copy, project),
        body: shell(<ProjectRequestNew project={project} />),
      }
  }
}

/**
 * The page for a project the API did not answer for. No head of its own — no
 * canonical and no `hreflang` for a project we could not read, as the Next
 * pages emitted none.
 */
export function unavailableDocument(
  identifier: string,
  page: DocumentPage,
): ProjectDocument {
  return {
    metadata: {},
    body: shell(
      page.kind === 'overview' ? (
        <ProjectOverviewUnavailable identifier={identifier} />
      ) : (
        <ProjectUnavailable />
      ),
    ),
  }
}
