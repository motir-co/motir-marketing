import { projectSitemapEntries } from '@/lib/sitemapEntries'
import { SITEMAP_HEADERS, urlsetXml } from '@/lib/sitemapXml'
import type { RouteContext } from '../routes'

/*
 * THE `projectSitemap` SLOT (MOTIR-10756): `/sitemap-projects.xml`, the
 * project half of motir.co's sitemap index.
 *
 * Every public project whose canonical is this site's host, at its page and
 * its changelog, in twelve languages (`lib/sitemapEntries.ts`). The index is
 * read per request from the app `MOTIR_APP_ORIGIN` names, and the host the
 * projects are filtered by is `MOTIR_SITE_ORIGIN`'s.
 *
 * ⚠️ ALWAYS A 200. The index walk never throws and returns what it read
 * (`loadAllPublicProjects`, at most twenty pages), so an API that is down
 * gives a short or empty `<urlset>`: a crawler re-reads a short sitemap, while
 * one that errors makes it back off the whole site.
 *
 * The tenant half — a workspace host's `/sitemap.xml` — is not ported: there
 * is no tenant host any more (MOTIR-10113).
 */
export async function projectSitemapHandler(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { env } = context
  const entries = await projectSitemapEntries(
    env.MOTIR_APP_ORIGIN,
    new URL(env.MOTIR_SITE_ORIGIN).host,
  )
  return new Response(urlsetXml(entries), { headers: SITEMAP_HEADERS })
}
