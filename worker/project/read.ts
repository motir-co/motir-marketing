import {
  loadChangelog,
  loadProject,
  loadRequest,
  type PublicChangelogPageDto,
  type PublicProjectOverviewDto,
  type PublicRead,
  type PublicRequestDetailDto,
} from '@/lib/publicProject'
import type { ProjectPage } from './path'

/*
 * THE READ BEHIND EACH PROJECT PAGE, IN THREE OUTCOMES (MOTIR-10753).
 *
 * `lib/publicProject.ts`'s `readPublic` maps one API call to `ok`, `not-found`
 * (the API's own 404) or `failed` (no answer, or a 5xx). A page here is decided
 * by the PROJECT read: `not-found` is the localized not-found room with status
 * 404, `failed` is the unavailable state — never a 404, because the project may
 * well exist and a crawler acts on a 404. A page's own second read (the
 * changelog, the request) is made beside the project's, and only the
 * request's `not-found` decides the page; a second read that fails keeps the
 * hero and shows its error in the body.
 */

export type ProjectView =
  | { kind: 'overview' | 'requestNew'; project: PublicProjectOverviewDto }
  | {
      kind: 'changelog'
      project: PublicProjectOverviewDto
      changelog: PublicRead<PublicChangelogPageDto>
    }
  | {
      kind: 'request'
      project: PublicProjectOverviewDto
      request: Exclude<
        PublicRead<PublicRequestDetailDto>,
        { status: 'not-found' }
      >
    }

export type ProjectPageRead =
  | { status: 'ok'; view: ProjectView }
  | { status: 'not-found' }
  | { status: 'failed' }

/** The pages that render a document — every kind but the feed and the redirects. */
export type DocumentPage = Extract<
  ProjectPage,
  { kind: 'overview' | 'changelog' | 'request' | 'requestNew' }
>

function settle(
  project: PublicRead<PublicProjectOverviewDto>,
  view: (project: PublicProjectOverviewDto) => ProjectView,
): ProjectPageRead {
  if (project.status !== 'ok') return { status: project.status }
  return { status: 'ok', view: view(project.data) }
}

async function readRequest(
  appOrigin: string,
  identifier: string,
  requestKey: string,
): Promise<ProjectPageRead> {
  const [project, request] = await Promise.all([
    loadProject(appOrigin, identifier),
    loadRequest(appOrigin, identifier, requestKey),
  ])
  if (project.status === 'not-found' || request.status === 'not-found')
    return { status: 'not-found' }
  return settle(project, (data) => ({
    kind: 'request',
    project: data,
    request,
  }))
}

/** Read what `page` of project `identifier` shows, from the app at `appOrigin`. */
export async function readProjectPage(
  appOrigin: string,
  identifier: string,
  page: DocumentPage,
): Promise<ProjectPageRead> {
  if (page.kind === 'request')
    return readRequest(appOrigin, identifier, page.requestKey)
  if (page.kind === 'changelog') {
    const [project, changelog] = await Promise.all([
      loadProject(appOrigin, identifier),
      loadChangelog(appOrigin, identifier, page.cursor),
    ])
    return settle(project, (data) => ({
      kind: 'changelog',
      project: data,
      changelog,
    }))
  }
  const project = await loadProject(appOrigin, identifier)
  return settle(project, (data) => ({ kind: page.kind, project: data }))
}
