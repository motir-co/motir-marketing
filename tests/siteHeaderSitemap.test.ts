import { describe, expect, it } from 'vitest'
import { siteSitemapEntries } from '@/lib/siteSitemap'
import { siteUrl } from '@/lib/siteOrigin'

/*
 * The sitemap's page lines, split out of `tests/siteHeader.test.tsx` when the
 * header became an island (MOTIR-10643). Its subject is the site half of the
 * sitemap, which `astro build` writes as `/sitemap-site.xml` (MOTIR-10646).
 */

describe('the sitemap', () => {
  it('gains the /legal, /explore and /docs lines in the same changes that add the routes', async () => {
    // The site half: the project half is `/sitemap-projects.xml`, a Worker
    // route (MOTIR-10646). Each page is listed once per locale since MOTIR-7956; its English entry
    // is the one its own `en` alternate names, and the list of those is the
    // list of pages. A legal document is listed ONCE, at its English address
    // and with no alternates (MOTIR-8086), so that one entry is its English one.
    const english = siteSitemapEntries().filter((entry) => {
      const languages = entry.alternates?.languages as
        Record<string, string> | undefined
      return languages === undefined || languages.en === entry.url
    })
    expect(english.map((entry) => entry.url)).toEqual([
      siteUrl('/'),
      // 2026-10 redesign — "How Motir works", the developer page.
      siteUrl('/how-it-works'),
      // 2026-10 — "How to use Motir".
      siteUrl('/how-to-use'),
      // MOTIR-8382 — the price page.
      siteUrl('/price'),
      // MOTIR-8383 — how the calculation works.
      siteUrl('/how-the-calculation-works'),
      siteUrl('/design'),
      siteUrl('/explore'),
      siteUrl('/docs'),
      ...[
        '/docs/api',
        '/docs/api/getting-started',
        '/docs/api/stability',
        '/docs/mcp',
        '/docs/mcp/tools',
        '/docs/cli',
        '/docs/sandbox',
        // MOTIR-4227 — the customer-facing address guide.
        '/docs/public-address',
        // MOTIR-6007 — the Sentry integration guide.
        '/docs/sentry',
        // MOTIR-6016 — the difficulty levels guide.
        '/docs/difficulty',
        // MOTIR-6717 — installing Motir's skills in your agent.
        '/docs/skills',
        // 2026-10 redesign — the Claude Code plugin and connector guides.
        '/docs/claude-code-plugin',
        '/docs/claude-code-connector',
      ].map(siteUrl),
      siteUrl('/legal'),
      ...[
        'terms',
        'privacy',
        'cookies',
        'acceptable-use',
        'dpa',
        'subprocessors',
        'model-providers',
      ].map((slug) => siteUrl(`/legal/${slug}`)),
    ])
  })
})
