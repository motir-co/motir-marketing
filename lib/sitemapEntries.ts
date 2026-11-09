import { DEFAULT_LOCALE } from '@/i18n/routing'
import { everyLanguage } from '@/lib/siteSitemap'
import type { SitemapEntry } from '@/lib/sitemapXml'
import { PROJECT_TABS, loadAllPublicProjects } from '@/lib/publicProject'
import { publicPathFor, SITE_HOST } from '@/lib/publicHost'

/*
 * motir.co's sitemap (MOTIR-1154 · 8.3.7), served at `/sitemap.xml`.
 *
 * ⚠️ IT IS TWO HALVES NOW (MOTIR-8842), AND `/sitemap.xml` IS AN INDEX OVER THEM
 * on motir.co: `/sitemap-site.xml` (`siteSitemapEntries`, which lives in
 * `lib/siteSitemap.ts` since MOTIR-10646, so the built half imports nothing
 * from this one) is the marketing
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
 * and not a different one. `SITE_ORIGIN` is still a `PUBLIC_*` value baked
 * in by `next build`, so the URLs are the real ones either way.
 *
 * ⚠️ IT IS PER-HOST NOW (MOTIR-4222), AND THE RULE HAS ONE SENTENCE:
 * **a sitemap may only list URLs on its own host.** So this file lists exactly
 * the projects whose CANONICAL is the host being asked — `primaryHost` on the
 * index row is the field that says so — at the paths that host serves them at.
 * Since MOTIR-9528 that host is `motir.co` and nothing else:
 *
 *   • a workspace subdomain's sitemap lists NOTHING: since the address
 *     decision MOTIR-9790 it serves no project (MOTIR-9512), and its root is a
 *     `noindex` placeholder;
 *   • a customer's own domain is not this repository's to describe at all — it
 *     is answered by the certificate edge (decision MOTIR-9521), and Motir puts
 *     no sitemap, robots or canonical on it.
 *
 * The STATIC entries — the landing, /explore, /docs, /legal — belong to
 * `motir.co` alone and are emitted only there. A tenant host is not a copy of
 * the marketing site, and listing this site's pages in its sitemap would ask a
 * crawler to attribute them to that host.
 *
 * ⚠️ A FAILED INDEX READ EMITS THE STATIC ENTRIES AND A 200. `loadAllPublicProjects`
 * never throws and returns what it has. A sitemap that briefly loses its project
 * pages is recoverable — a crawler re-reads it — while one that 500s is not:
 * search engines back off a sitemap that errors, and the whole site's crawl
 * budget goes with it. The project pages are also reachable from `/explore`,
 * which is itself in this list, so a short sitemap is a delay rather than a hole.
 */
/**
 * The PROJECT half: every crawlable project URL motir.co has, and nothing else.
 * Rendered per request by the Worker (`worker/sitemapProjects.ts`, MOTIR-10756),
 * because the index behind it is a network read of the app `appOrigin` names.
 *
 * `siteHost` is the host this sitemap is served on — the Worker's
 * `MOTIR_SITE_ORIGIN`'s — and a project is listed only when its canonical
 * (`primaryHost`) is that host. Since MOTIR-10113 there is no tenant host, so
 * no other host is asked about.
 */
export async function projectSitemapEntries(
  appOrigin: string,
  siteHost: string,
): Promise<SitemapEntry[]> {
  // The projects, and their tab paths — every crawlable URL THIS HOST has.
  // `/p/<id>/requests/new` is deliberately absent: it is a `noindex` doorway
  // (MOTIR-4117), and a sitemap that listed it would be asking a crawler to
  // index a page the page itself refuses.
  const { projects } = await loadAllPublicProjects(appOrigin)
  const projectEntries: SitemapEntry[] = projects
    .filter((project) => project.primaryHost === siteHost)
    .flatMap((project) => {
      const lastModified = new Date(project.updatedAt)
      // Only the pages THIS host serves (MOTIR-6743): the project page and its
      // changelog. The board, items, tree and roadmap are permanent redirects
      // into the app now, and a sitemap that listed a redirect would ask a
      // crawler to index an address that is not a page.
      return PROJECT_TABS.filter((tab) => tab.served === 'site').flatMap(
        (tab) => {
          // ⚠️ `publicPathFor` is the same helper every rendered link goes
          // through, so a sitemap entry and the page's own navigation cannot
          // spell the address differently — which is the way a sitemap normally
          // goes stale.
          // The ENGLISH path: `everyLanguage` spells the other ten from it.
          const path = publicPathFor(
            SITE_HOST,
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
          // A project page has twelve language addresses (the note above).
          return everyLanguage(path, rest)
        },
      )
    })

  return projectEntries
}
