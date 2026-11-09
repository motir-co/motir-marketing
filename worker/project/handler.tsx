import { visitorViewRedirect } from '@/lib/publicProject'
import { notFoundPage } from '../notFound'
import { renderPage } from '../render/document'
import type { RouteContext } from '../routes'
import { projectFeed } from './feed'
import { projectDocument, unavailableDocument } from './pages'
import { projectAddress } from './path'
import { readProjectPage, type DocumentPage } from './read'

/*
 * THE `project` SLOT (MOTIR-10753): every `/p/<identifier>/…` address but the
 * share image, in all twelve locales.
 *
 *  • the four retired read views (board, items and `items/<KEY>`, tree,
 *    roadmap) answer a 308 to the same path on the app, query dropped, BEFORE
 *    any read — the redirect is decided by the path alone, so an unknown
 *    project is redirected too and the app answers for it;
 *  • the feed forwards the API's Atom document (`./feed.ts`);
 *  • every other page reads in three outcomes (`./read.ts`): `ok` renders the
 *    page, `not-found` is the locale's not-found room with status 404, and
 *    `failed` is the unavailable state with status 200 and no canonical, as the
 *    Next pages rendered it — a 200 the browser lane pins, never cached.
 *
 * The app origin is the Worker's `MOTIR_APP_ORIGIN`, per request: every read
 * and every app link follows it with no rebuild.
 */
export async function projectHandler(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { env, locale, path, url } = context
  const address = projectAddress(path, url)
  if (!address) return notFoundPage(url, locale, env)
  const { identifier, page } = address
  const appOrigin = env.MOTIR_APP_ORIGIN
  if (page.kind === 'retired')
    return visitorViewRedirect(appOrigin, identifier, page.view, page.sub)
  if (page.kind === 'feed') return projectFeed(appOrigin, identifier)
  return documentResponse(context, identifier, page)
}

async function documentResponse(
  { env, locale, url }: RouteContext,
  identifier: string,
  page: DocumentPage,
): Promise<Response> {
  const read = await readProjectPage(env.MOTIR_APP_ORIGIN, identifier, page)
  if (read.status === 'not-found') return notFoundPage(url, locale, env)
  const document =
    read.status === 'ok'
      ? await projectDocument(locale, read.view)
      : unavailableDocument(identifier, page)
  return renderPage({
    env,
    url,
    locale,
    metadata: [document.metadata],
    body: document.body,
  })
}
