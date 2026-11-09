import { publicApiBase } from '@/lib/publicProject'

/*
 * `/p/<identifier>/changelog.xml` — THE PROJECT'S ATOM FEED (MOTIR-4118,
 * ported off Next by MOTIR-10753).
 *
 * ⚠️ THE PATH IS NOT A CHOICE: motir-core 308s `app.motir.co/p/<id>/…` to the
 * same path here, so the address existing subscribers hold lands here or
 * nowhere.
 *
 * ⚠️ IT FORWARDS THE DOCUMENT, BYTE FOR BYTE. The Atom document is built and
 * escaped by motir-core (`lib/publicProjects/atomFeed.ts`); a second builder
 * here would put the escaping in two places. Its `<link>`s already name the
 * public origin.
 *
 * ⚠️ 503, NEVER 404, WHEN THE API DOES NOT ANSWER. A feed reader that receives a
 * 404 unsubscribes; one that receives a 503 retries. Only the API's own 404 —
 * no public project carries this key — is a 404 here.
 */

/** Cached as the producing endpoint caches it — a reader polls on its own clock. */
export const FEED_CACHE_CONTROL =
  'public, max-age=300, stale-while-revalidate=600'

function text(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}

const UNAVAILABLE = 'The changelog feed is temporarily unavailable.'

export async function projectFeed(
  appOrigin: string,
  identifier: string,
): Promise<Response> {
  let upstream: Response
  try {
    upstream = await fetch(
      `${publicApiBase(appOrigin)}/p/${encodeURIComponent(identifier)}/changelog.xml`,
      { cache: 'no-store', headers: { accept: 'application/atom+xml' } },
    )
  } catch {
    return text(UNAVAILABLE, 503)
  }
  if (upstream.status === 404)
    return text('No public project carries this key.', 404)
  if (!upstream.ok) return text(UNAVAILABLE, 503)
  return new Response(await upstream.arrayBuffer(), {
    headers: {
      'content-type': 'application/atom+xml; charset=utf-8',
      'cache-control': FEED_CACHE_CONTROL,
    },
  })
}
