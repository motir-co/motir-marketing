import type { APIRoute } from 'astro'
import { siteSitemapEntries } from '@/lib/siteSitemap'
import { SITEMAP_HEADERS, urlsetXml } from '@/lib/sitemapXml'

/*
 * motir.co's own pages, in every language (MOTIR-8842), written once by
 * `astro build` (MOTIR-10646). `pnpm i18n:check-static-pages` reads the file
 * back and fails the build when it names a page the build did not write.
 */
export const prerender = true

export const GET: APIRoute = () =>
  new Response(urlsetXml(siteSitemapEntries()), { headers: SITEMAP_HEADERS })
