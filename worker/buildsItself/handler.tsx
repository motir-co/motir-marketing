import { buildsItselfMetadata } from '@/app/[locale]/motir-builds-itself/buildsItselfMetadata'
import { MotirBuildsItself } from '@/app/[locale]/motir-builds-itself/MotirBuildsItself'
import { getCopy } from '@/lib/copy'
import { loadChangelog, loadProject } from '@/lib/publicProject'
import { renderPage } from '../render/document'
import type { RouteContext } from '../routes'

/*
 * THE `buildsItself` SLOT (MOTIR-10756): `/motir-builds-itself` in all twelve
 * locales.
 *
 * The story is copy; its last section is Motir's own live numbers and newest
 * shipped work, read per request — as the Next page's `force-dynamic` did —
 * from the app `MOTIR_APP_ORIGIN` names, through the same reads `/p/MOTIR`
 * makes (`lib/publicProject.ts`). Those reads never throw: a project or
 * changelog that is not `ok` — unreachable, a 5xx, a 404 — is the page's
 * unavailable sentence, and the page is 200 whatever they answer.
 */

/** The project whose numbers the page shows. */
export const BUILDS_ITSELF_PROJECT = 'MOTIR'

export async function buildsItselfHandler(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { env, locale, url } = context
  const [copy, project, changelog] = await Promise.all([
    getCopy(locale),
    loadProject(env.MOTIR_APP_ORIGIN, BUILDS_ITSELF_PROJECT),
    loadChangelog(env.MOTIR_APP_ORIGIN, BUILDS_ITSELF_PROJECT),
  ])
  return renderPage({
    env,
    url,
    locale,
    metadata: [buildsItselfMetadata(locale, copy)],
    body: <MotirBuildsItself project={project} changelog={changelog} />,
  })
}
