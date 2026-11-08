import type { APIRoute } from 'astro'
import { SITE_ORIGIN } from '@/lib/siteOrigin'
import { SITEMAP_HEADERS, sitemapIndexXml } from '@/lib/sitemapXml'

/*
 * motir.co's `/sitemap.xml` — an INDEX over its two halves (MOTIR-8842),
 * written once by `astro build` (MOTIR-10646).
 *
 * It names `/sitemap-projects.xml` as the Next index did. That half renders per
 * request, so a Worker route answers it (the Worker-routes story); the cut
 * serves the two together. Everything the halves list is explained in
 * `lib/siteSitemap.ts` and `lib/sitemapEntries.ts`.
 */
export const prerender = true

/** The child sitemaps, in the order the index names them. */
export const SITEMAP_CHILDREN = [
  `${SITE_ORIGIN}/sitemap-site.xml`,
  `${SITE_ORIGIN}/sitemap-projects.xml`,
] as const

export const GET: APIRoute = () =>
  new Response(sitemapIndexXml(SITEMAP_CHILDREN), {
    headers: SITEMAP_HEADERS,
  })
