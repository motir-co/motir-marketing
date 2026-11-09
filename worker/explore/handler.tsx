import { ExploreSquare } from '@/app/[locale]/explore/ExploreSquare'
import { ExploreTopic } from '@/app/[locale]/explore/ExploreTopic'
import {
  squareMetadata,
  topicMetadata,
} from '@/app/[locale]/explore/exploreMetadata'
import { getCopy } from '@/lib/copy'
import {
  categoryLabel,
  loadSquare,
  parseExploreSearchParams,
  type RawSearchParams,
} from '@/lib/explore'
import { notFoundPage } from '../notFound'
import { renderPage } from '../render/document'
import type { RouteContext } from '../routes'

/*
 * THE `explore` SLOT (MOTIR-10754): `/explore` and `/explore/topic/<slug>`, in
 * all twelve locales.
 *
 * Both pages make the same two reads per request — the page of cards and the
 * category list (`loadSquare`), from the app the Worker's `MOTIR_APP_ORIGIN`
 * names — and nothing is cached between requests. The head and the body are
 * drawn from that one read. Three outcomes:
 *
 *  • the API answered: the page, 200;
 *  • the API did not answer, or answered non-OK (`failed`): the page's error
 *    state, 200 and never stored — the square may be fine, we could not ask;
 *  • a topic slug the API answered without: the locale's not-found room, 404.
 *
 * The router has already refused a crawler on a filter URL by the time this
 * runs (`lib/crawlPolicy.ts`), so every query here is a person's.
 */

/** A URL's query as Next handed it to a page: one value, or every repeat. */
export function rawSearchParams(url: URL): RawSearchParams {
  const raw: RawSearchParams = {}
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key)
    raw[key] = values.length === 1 ? values[0] : values
  }
  return raw
}

function topicSlug(path: string): string | null {
  const encoded = /^\/explore\/topic\/([^/]+)$/.exec(path)?.[1]
  if (encoded === undefined) return null
  try {
    return decodeURIComponent(encoded)
  } catch {
    return null
  }
}

export async function exploreHandler(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { env, locale, path, url } = context
  const copy = await getCopy(locale)
  if (path === '/explore') {
    const query = parseExploreSearchParams(rawSearchParams(url))
    const square = await loadSquare(env.MOTIR_APP_ORIGIN, query)
    return renderPage({
      env,
      url,
      locale,
      metadata: [squareMetadata(locale, copy)],
      body: <ExploreSquare query={query} square={square} />,
    })
  }
  const slug = topicSlug(path)
  if (slug === null) return notFoundPage(url, locale, env)
  const query = parseExploreSearchParams(rawSearchParams(url), {
    category: slug,
  })
  const square = await loadSquare(env.MOTIR_APP_ORIGIN, query)
  const known = categoryLabel(square.categories, slug)
  if (!square.failed && known === undefined)
    return notFoundPage(url, locale, env)
  const label = known ?? slug
  return renderPage({
    env,
    url,
    locale,
    metadata: [topicMetadata(locale, copy, slug, label)],
    body: (
      <ExploreTopic slug={slug} label={label} query={query} square={square} />
    ),
  })
}
