import { siteUrl } from '@/lib/siteOrigin'
import {
  englishOnlyCanonical,
  languageAlternates,
  localizedPath,
} from '@/lib/localeMetadata'
import { LOCALES } from '@/i18n/routing'
import { legalDocumentSlugs } from '@/lib/legal/documents'
import { DOCS_INDEX_HREF, DOCS_ROUTES } from '@/lib/docsSurfaces'
import { HOW_THE_CALCULATION_WORKS } from '@/lib/destinations'
import type { SitemapEntry } from '@/lib/sitemapXml'

/*
 * motir.co's own pages, as `/sitemap-site.xml` lists them (MOTIR-8842).
 *
 * ⚠️ THE SITE HALF ALONE, AND IT IMPORTS NOTHING FROM THE PROJECT HALF
 * (MOTIR-10646). `lib/sitemapEntries.ts` keeps `projectSitemapEntries`, which
 * reads the public project index and the request's host and renders per
 * request; this module reads only build-time constants, so the Astro endpoint
 * `src/pages/sitemap-site.xml.ts` writes it once at build.
 *
 * ⚠️ IT IS A HAND-ORDERED LIST, NOT THE BUILT PAGE SET, ON PURPOSE. It names
 * `/explore`, which a Worker answers rather than a built file, and it names no
 * `/products/*` page, exactly as the Next sitemap did. The static-pages check
 * (`scripts/i18n/check-static-pages.ts`) reads the emitted file back and fails
 * the build if any URL it lists other than `/explore` has no built page, so the
 * list can never name a page the build does not write.
 */
/*
 * ⚠️ EVERY motir.co PAGE APPEARS TWELVE TIMES (MOTIR-7956). The site is
 * served in twelve languages, each at its own address (English unprefixed, the
 * rest under `/<locale>/`), and a crawler is told about a language version the
 * same two ways it is told about a page: by the page's own `hreflang` set and
 * by this file. So each motir.co page — the static ones below, and a project
 * whose primary address is motir.co — is one entry per locale, and every one of
 * those entries carries the same thirteen alternates (the twelve plus
 * `x-default`) the page's `<head>` does, spelled by the same helper
 * (`lib/localeMetadata.ts`), so the two cannot disagree.
 *
 * ⚠️ EXCEPT A LEGAL DOCUMENT, WHICH APPEARS ONCE (MOTIR-8086). Its body, title,
 * version and date are the same English in every language version — only the
 * chrome around them is translated — so each version is canonical to the
 * unprefixed English document and carries no `hreflang` set. The sitemap says
 * the same thing the page head does: one entry, at the English address, no
 * alternates, spelled by the same `englishOnlyCanonical`. The `/legal` INDEX
 * is not an exception: its title, intro and contact line are genuinely
 * translated, so it stays twelve entries like every other page.
 */
type EntryFields = Omit<SitemapEntry, 'url' | 'alternates'>

/** ONE entry for a motir.co path whose binding content is English only (legal documents). */
export function englishOnly(path: string, rest: EntryFields): SitemapEntry[] {
  return [{ url: englishOnlyCanonical(path), ...rest }]
}

/** One entry per locale for a motir.co path, each carrying the alternates. */
export function everyLanguage(path: string, rest: EntryFields): SitemapEntry[] {
  const languages = languageAlternates(path)
  return LOCALES.map((locale) => ({
    url: siteUrl(localizedPath(locale, path)),
    ...rest,
    alternates: { languages },
  }))
}

/**
 * The SITE half: motir.co's own pages. It reads nothing from the request, so
 * `/sitemap-site.xml` is written once by `astro build` (MOTIR-8842 ·
 * MOTIR-10646). A tenant
 * host never serves it — a tenant host is not a copy of the marketing site, and
 * listing this site's pages in its sitemap would ask a crawler to attribute
 * them to that host.
 */
export function siteSitemapEntries(): SitemapEntry[] {
  return [
    ...everyLanguage('/', { changeFrequency: 'weekly', priority: 1 }),
    ...everyLanguage('/how-it-works', {
      changeFrequency: 'monthly',
      priority: 0.8,
    }),
    ...everyLanguage('/how-to-use', {
      changeFrequency: 'monthly',
      priority: 0.8,
    }),
    ...everyLanguage('/price', { changeFrequency: 'weekly', priority: 0.8 }),
    ...everyLanguage(HOW_THE_CALCULATION_WORKS, {
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
    ...everyLanguage('/design', { changeFrequency: 'monthly', priority: 0.8 }),
    // The square (MOTIR-4045). Its per-topic landing pages are dynamic (read
    // from the public API) and are reached through the square's own crawlable
    // `/explore/topic/<slug>` links, so they are not enumerated here.
    ...everyLanguage('/explore', { changeFrequency: 'daily', priority: 0.9 }),
    // The docs surfaces (MOTIR-4046). The API reference is dynamic (fetches
    // the served OpenAPI document) but is still a stable, crawlable URL.
    ...everyLanguage(DOCS_INDEX_HREF, {
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
    // ⚠️ THE SAME LIST THE RAIL AND THE INDEX READ (MOTIR-4507), for the reason
    // the legal entries below are a glob: a documentation page ships by being
    // in `lib/docsSurfaces.ts`, so it reaches the sitemap without an edit here.
    // This file carried the third hand-maintained copy of the nine routes, and
    // it happened to be the one MOTIR-4227 remembered.
    ...DOCS_ROUTES.filter((path) => path !== DOCS_INDEX_HREF).flatMap((path) =>
      everyLanguage(path, { changeFrequency: 'monthly', priority: 0.5 }),
    ),
    ...everyLanguage('/legal', { changeFrequency: 'monthly', priority: 0.6 }),
    // A legal document ships by EXISTING in `content/legal/`, so the sitemap
    // reads the same directory the routes do rather than carrying a second list
    // that could drift from it. `legalDocumentSlugs()` is the glob the routes
    // use, so a document added later reaches the sitemap without an edit here.
    // Once each, at the English address (the note above).
    ...legalDocumentSlugs().flatMap((slug) =>
      englishOnly(`/legal/${slug}`, {
        changeFrequency: 'monthly',
        priority: 0.4,
      }),
    ),
  ]
}
