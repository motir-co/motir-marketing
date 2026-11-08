import type { SitemapEntry } from '@/lib/sitemapXml'
import { requestPublicHost } from '@/lib/requestPublicHost'
import { projectSitemapEntries } from '@/lib/sitemapEntries'
import { siteSitemapEntries } from '@/lib/siteSitemap'

/**
 * What a crawler reads of the sitemap on the host this request is on, as ONE
 * list: the project half, then — on motir.co only — the site half.
 *
 * Production serves the two halves as separate routes (`/sitemap-projects.xml`,
 * `/sitemap-site.xml`) under `/sitemap.xml`'s index on motir.co (MOTIR-8842).
 * The tests that assert on "the sitemap" assert on the union, so they read it
 * through here with a request scope supplied the way they always did.
 */
export default async function sitemap(): Promise<SitemapEntry[]> {
  const host = await requestPublicHost()
  const projects = await projectSitemapEntries(host)
  return host.kind === 'site'
    ? [...projects, ...siteSitemapEntries()]
    : projects
}
