import type { SitemapEntry } from '@/lib/sitemapXml'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { SITE_ORIGIN } from '@/lib/siteOrigin'
import { projectSitemapEntries } from '@/lib/sitemapEntries'
import { siteSitemapEntries } from '@/lib/siteSitemap'

/**
 * What a crawler reads of motir.co's sitemap, as ONE list: the project half,
 * then the site half.
 *
 * Production serves the two halves separately under `/sitemap.xml`'s index
 * (MOTIR-8842): `/sitemap-projects.xml` from the Worker (MOTIR-10756) and
 * `/sitemap-site.xml` as a built file. The tests that assert on "the sitemap"
 * assert on the union, so they read it through here. Since MOTIR-10113 the
 * site is motir.co alone, so no request host is asked about (MOTIR-10758).
 */
export default async function sitemap(): Promise<SitemapEntry[]> {
  const projects = await projectSitemapEntries(
    APP_ORIGIN,
    new URL(SITE_ORIGIN).host,
  )
  return [...projects, ...siteSitemapEntries()]
}
