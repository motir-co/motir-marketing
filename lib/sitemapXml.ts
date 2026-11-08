/*
 * The sitemap protocol's XML, spelled by hand (MOTIR-8842).
 *
 * `app/sitemap.ts` used to hand Next a `MetadataRoute.Sitemap` and let it write
 * the document. The sitemap is two routes now plus an index, and a metadata
 * file can only be one route, so the three are route handlers and this is the
 * serializer. It writes what Next wrote — `<loc>`, the `xhtml:link` alternates,
 * `<lastmod>`, `<changefreq>`, `<priority>`, in that order — so a crawler reads
 * the same document it read before the split.
 *
 * Since MOTIR-10646 the routes are Astro endpoints written by `astro build`
 * (`src/pages/sitemap.xml.ts`, `src/pages/sitemap-site.xml.ts`), and the entry
 * type is this module's own: the shape `MetadataRoute.Sitemap` had, without
 * the `next` import.
 */

/** How often a page is expected to change, as the sitemap protocol spells it. */
export type ChangeFrequency =
  'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'

/** One `<url>` of a sitemap. */
export interface SitemapEntry {
  url: string
  lastModified?: string | Date
  changeFrequency?: ChangeFrequency
  priority?: number
  /** The page's language versions, hreflang to absolute URL. */
  alternates?: { languages?: Record<string, string> }
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>\n'
const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
const XHTML_NS = 'http://www.w3.org/1999/xhtml'

export const SITEMAP_HEADERS = {
  'Content-Type': 'application/xml',
} as const

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function lastModified(value: string | Date): string {
  return (value instanceof Date ? value : new Date(value)).toISOString()
}

/** One `<urlset>` document for a list of entries. */
export function urlsetXml(entries: readonly SitemapEntry[]): string {
  const anyAlternates = entries.some((e) => e.alternates?.languages)
  const open = anyAlternates
    ? `<urlset xmlns="${SITEMAP_NS}" xmlns:xhtml="${XHTML_NS}">`
    : `<urlset xmlns="${SITEMAP_NS}">`
  const urls = entries.map((entry) => {
    const lines = [`<loc>${escapeXml(entry.url)}</loc>`]
    for (const [hreflang, href] of Object.entries(
      entry.alternates?.languages ?? {},
    )) {
      lines.push(
        `<xhtml:link rel="alternate" hreflang="${escapeXml(hreflang)}" href="${escapeXml(href)}" />`,
      )
    }
    if (entry.lastModified)
      lines.push(`<lastmod>${lastModified(entry.lastModified)}</lastmod>`)
    if (entry.changeFrequency)
      lines.push(`<changefreq>${entry.changeFrequency}</changefreq>`)
    if (entry.priority !== undefined)
      lines.push(`<priority>${entry.priority}</priority>`)
    return `<url>\n${lines.join('\n')}\n</url>`
  })
  return `${XML_HEADER}${open}\n${urls.join('\n')}\n</urlset>\n`
}

/** One `<sitemapindex>` document naming the sitemaps behind it. */
export function sitemapIndexXml(locations: readonly string[]): string {
  const items = locations.map(
    (loc) => `<sitemap>\n<loc>${escapeXml(loc)}</loc>\n</sitemap>`,
  )
  return `${XML_HEADER}<sitemapindex xmlns="${SITEMAP_NS}">\n${items.join('\n')}\n</sitemapindex>\n`
}
