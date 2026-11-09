import { IdeasPage } from '@/app/[locale]/ideas/IdeasPage'
import { ideasMetadata } from '@/app/[locale]/ideas/ideasMetadata'
import { getCopy } from '@/lib/copy'
import {
  fetchIdea,
  fetchIdeas,
  fetchIdeaTags,
  IdeasUnavailableError,
  parseIdeasParams,
  type IdeaLocale,
  type IdeasParams,
  type IdeasSource,
  type PublicIdeaListDto,
} from '@/lib/ideas'
import { ideasSource } from '../ideasStore'
import { renderPage } from '../render/document'
import type { RouteContext } from '../routes'

/*
 * THE `ideas` SLOT (MOTIR-10755): `/ideas` in all twelve locales.
 *
 * The page's only reads are the idea store's three — the list, the tags and,
 * when `?idea=` names one the list does not carry, that one idea — each from
 * the app `MOTIR_APP_ORIGIN` names and each through the edge cache that holds
 * the store's hour (`worker/ideasStore.ts`). The document itself is never
 * cached: it is answered `no-store`, so the hour lives in the data alone.
 *
 * Failures are the Next page's, and none is a 404:
 *
 *  • the list unreadable — the unavailable state and its retry link;
 *  • the tags unreadable — the page without its tag filters;
 *  • the open idea unknown, retired or unreadable — no sheet, the list.
 *
 * Only `IdeasUnavailableError` is absorbed from the list read; anything else
 * is a bug and propagates, as it did under Next.
 *
 * The router has already refused a crawler on a filter URL by the time this
 * runs (`lib/crawlPolicy.ts`), so a refused request never reads the store.
 */

/** The document's header: the store's hour is held in the data cache. */
export const IDEAS_DOCUMENT_CACHE_CONTROL = 'no-store'

async function loadList(
  params: IdeasParams,
  locale: IdeaLocale,
  source: IdeasSource,
): Promise<PublicIdeaListDto | null> {
  try {
    return await fetchIdeas(params, locale, source)
  } catch (error) {
    if (error instanceof IdeasUnavailableError) return null
    throw error
  }
}

export async function ideasHandler(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { env, ctx, locale, url } = context
  const source = ideasSource(env, ctx)
  const params = parseIdeasParams(url.searchParams)
  const [copy, list, tags] = await Promise.all([
    getCopy(locale),
    loadList(params, locale, source),
    fetchIdeaTags(locale, source).catch(() => null),
  ])
  // The open idea: the list item when it is in the list (the list carries
  // every field), else one read by slug — an idea outside the current
  // filters, opened from a shared link. The head names it whenever it was
  // found; the sheet opens only over a list that was read.
  const listed = params.idea
    ? list?.items.find((idea) => idea.slug === params.idea)
    : undefined
  const found =
    listed ??
    (params.idea
      ? await fetchIdea(params.idea, locale, source).catch(() => null)
      : null)
  return renderPage({
    env,
    url,
    locale,
    metadata: [ideasMetadata(locale, copy, params, found)],
    body: (
      <IdeasPage
        params={params}
        list={list}
        tags={tags}
        open={list ? found : null}
      />
    ),
    cacheControl: IDEAS_DOCUMENT_CACHE_CONTROL,
  })
}
