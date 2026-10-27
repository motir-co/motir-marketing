import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/siteOrigin'
import {
  englishOnlyCanonical,
  languageAlternates,
  localizedPath,
} from '@/lib/localeMetadata'
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/routing'
import { legalDocumentSlugs } from '@/lib/legal/documents'
import { DOCS_INDEX_HREF, DOCS_ROUTES } from '@/lib/docsSurfaces'
import { HOW_THE_CALCULATION_WORKS } from '@/lib/destinations'
import { PROJECT_TABS, loadAllPublicProjects } from '@/lib/publicProject'
import {
  currentHost,
  currentOrigin,
  publicPathFor,
  type PublicHost,
} from '@/lib/publicHost'

/*
 * motir.co's sitemap (MOTIR-1154 · 8.3.7), served at `/sitemap.xml`.
 *
 * ⚠️ IT IS TWO HALVES NOW (MOTIR-8842), AND `/sitemap.xml` IS AN INDEX OVER THEM
 * on motir.co: `/sitemap-site.xml` ({@link siteSitemapEntries}) is the marketing
 * site's own pages and reads nothing from the request, so it is built once;
 * `/sitemap-projects.xml` ({@link projectSitemapEntries}) is the per-host half
 * and the only part that renders per request. A TENANT host's `/sitemap.xml` is
 * `proxy.ts` rewriting onto `/sitemap-projects.xml` — its whole sitemap IS its
 * project half. The rest of this note was written for the single file and still
 * describes the entries.
 *
 * ⚠️ NEW HERE, AND NOT motir-core's. That repository has an `app/sitemap.ts`
 * of its own and this card must not touch it: it lists the APPLICATION's public
 * surface — every public project, its tabs, the square and its topic pages —
 * read from the database at request time, at `app.motir.co`. This one lists the
 * MARKETING site's, which is a different host with a different content set. The
 * "already shipped" inventory this card inherited is motir-core's; none of it
 * is reusable here.
 *
 * ⚠️ TWO ENTRIES. It was one — the landing's own footer deliberately omits
 * Product, Pricing, Blog and About because those pages do not exist
 * (`design/marketing/design-notes.md`), and a sitemap listing URLs that 404 is
 * worse than a short one. The line above this one asked that "when a second
 * page lands it adds its line here, in the same change that adds the route";
 * MOTIR-1043 is that change and `/design` is that route. The rule is unchanged
 * and still binds the third page.
 *
 * ⚠️ NO LONGER STATIC — MOTIR-4118, and the note it replaces said the opposite.
 * It read: "STATIC, unlike motir-core's. That one is `force-dynamic` because it
 * reads a database the image build cannot reach (MOTIR-2490); this one reads a
 * build-time constant, so prerendering it is correct and costs nothing at
 * request time." That was true while every entry was a constant. This file now
 * also enumerates PUBLIC PROJECTS from motir-core's public index, which is a
 * network read — so it is `force-dynamic`, for the same reason motir-core's is
 * and not a different one. `SITE_ORIGIN` is still a `NEXT_PUBLIC_*` value baked
 * in by `next build`, so the URLs are the real ones either way.
 *
 * ⚠️ IT IS PER-HOST NOW (MOTIR-4222), AND THE RULE HAS ONE SENTENCE:
 * **a sitemap may only list URLs on its own host.** So this file lists exactly
 * the projects whose CANONICAL is the host being asked — `primaryHost` on the
 * index row is the field that says so — at the paths that host serves them at.
 * Three consequences, each of them the point rather than a side effect:
 *
 *   • a project whose primary moves to a customer domain DISAPPEARS from
 *     `motir.co/sitemap.xml` and appears in that domain's own;
 *   • a workspace subdomain's sitemap lists only that workspace's projects, at
 *     `/<identifier>` rather than `/p/<identifier>`;
 *   • a customer domain's lists ONE project's tabs, at the host's root.
 *
 * The STATIC entries — the landing, /explore, /docs, /legal — belong to
 * `motir.co` alone and are emitted only there. A tenant host is a project's
 * address, not a copy of the marketing site, and listing this site's pages in a
 * customer's sitemap would ask a crawler to attribute them to that host.
 *
 * ⚠️ A FAILED INDEX READ EMITS THE STATIC ENTRIES AND A 200. `loadAllPublicProjects`
 * never throws and returns what it has. A sitemap that briefly loses its project
 * pages is recoverable — a crawler re-reads it — while one that 500s is not:
 * search engines back off a sitemap that errors, and the whole site's crawl
 * budget goes with it. The project pages are also reachable from `/explore`,
 * which is itself in this list, so a short sitemap is a delay rather than a hole.
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
 * (`lib/localeMetadata.ts`), so the two cannot disagree. A tenant host is not
 * multiplied: one URL there serves every language by cookie and
 * `Accept-Language`, and an alternate can only name a distinct URL.
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
type Entry = MetadataRoute.Sitemap[number]

/** ONE entry for a motir.co path whose binding content is English only (legal documents). */
function englishOnly(
  path: string,
  rest: Omit<Entry, 'url' | 'alternates'>,
): MetadataRoute.Sitemap {
  return [{ url: englishOnlyCanonical(path), ...rest }]
}

/** One entry per locale for a motir.co path, each carrying the alternates. */
function everyLanguage(
  path: string,
  rest: Omit<Entry, 'url' | 'alternates'>,
): MetadataRoute.Sitemap {
  const languages = languageAlternates(path)
  return LOCALES.map((locale) => ({
    url: siteUrl(localizedPath(locale, path)),
    ...rest,
    alternates: { languages },
  }))
}

/**
 * The PROJECT half: every crawlable project URL THIS HOST has, and nothing else.
 * Request-rendered, because which host asked decides which projects are listed
 * and the index behind them is a network read (`/sitemap-projects.xml`).
 */
export async function projectSitemapEntries(
  host: PublicHost,
): Promise<MetadataRoute.Sitemap> {
  const origin = currentOrigin(host)
  const thisHost = currentHost(host)

  // The projects, and their tab paths — every crawlable URL THIS HOST has.
  // `/p/<id>/requests/new` is deliberately absent: it is a `noindex` doorway
  // (MOTIR-4117), and a sitemap that listed it would be asking a crawler to
  // index a page the page itself refuses.
  const { projects } = await loadAllPublicProjects()
  const projectEntries: MetadataRoute.Sitemap = projects
    .filter((project) => project.primaryHost === thisHost)
    .flatMap((project) => {
      const lastModified = new Date(project.updatedAt)
      // Only the pages THIS host serves (MOTIR-6743): the project page and its
      // changelog. The board, items, tree and roadmap are permanent redirects
      // into the app now, and a sitemap that listed a redirect would ask a
      // crawler to index an address that is not a page.
      return PROJECT_TABS.filter((tab) => tab.served === 'site').flatMap(
        (tab) => {
          // ⚠️ ONE EXPRESSION FOR ALL THREE HOST KINDS. `publicPathFor` is the
          // same helper every rendered link goes through, so a sitemap entry
          // and the page's own navigation cannot spell the address differently
          // — which is the way a sitemap normally goes stale.
          // The ENGLISH path: `everyLanguage` spells the other ten from it.
          const path = publicPathFor(
            host,
            project.identifier,
            tab.segment,
            DEFAULT_LOCALE,
          )
          const rest = {
            lastModified,
            changeFrequency: 'daily' as const,
            // The project's own page outranks its tabs — it is the one a shared
            // link and /explore's cards point at.
            priority: tab.segment ? 0.5 : 0.8,
          }
          // On motir.co a project page has twelve language addresses; on a
          // tenant host, one (the note above).
          return host.kind === 'site'
            ? everyLanguage(path, rest)
            : [{ url: `${origin}${path}`, ...rest }]
        },
      )
    })

  return projectEntries
}

/**
 * The SITE half: motir.co's own pages. It reads nothing from the request, so
 * `/sitemap-site.xml` is written once by `next build` (MOTIR-8842). A tenant
 * host never serves it — a tenant host is a project's address, not a copy of
 * the marketing site, and listing this site's pages in a customer's sitemap
 * would ask a crawler to attribute them to that host.
 */
export function siteSitemapEntries(): MetadataRoute.Sitemap {
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
