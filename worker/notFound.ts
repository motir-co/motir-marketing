import { DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import type { Env } from './env'

/**
 * The built not-found room for `locale`, with status 404 (MOTIR-10752) — the
 * nearest `404.html` above an unmatched path, as `not_found_handling:
 * "404-page"` served it before the site had a Worker (`wrangler.jsonc`). The
 * router answers an unmatched path with it, and a live route answers with it
 * for a project the API does not know.
 */
export async function notFoundPage(
  url: URL,
  locale: Locale,
  env: Env,
): Promise<Response> {
  const room = new URL(
    locale === DEFAULT_LOCALE ? '/404' : `/${locale}/404`,
    url,
  )
  const page = await env.ASSETS.fetch(room)
  return new Response(page.body, { status: 404, headers: page.headers })
}
