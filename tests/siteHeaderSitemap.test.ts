import { describe, expect, it, vi } from 'vitest'
import sitemap from '@/tests/helpers/sitemap'
import { siteUrl } from '@/lib/siteOrigin'

/*
 * The sitemap's page lines, split out of `tests/siteHeader.test.tsx` when the
 * header became an island (MOTIR-10643). Its subject is the Next sitemap
 * route, so it waits for the root-files card (MOTIR-10646), which builds the
 * sitemap ahead and re-includes this file against it.
 */

// `app/sitemap.ts` and `app/robots.ts` read the request's host (MOTIR-4222),
// and `next/headers` throws outside a request scope. Empty headers read as
// the SITE's own host.
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

describe('the sitemap', () => {
  it('gains the /legal, /explore and /docs lines in the same changes that add the routes', async () => {
    // Awaited since MOTIR-4118 made the route dynamic. No API in this
    // environment, so the project entries are absent and the static list is
    // what remains — see `tests/entitySignal.test.ts` for that arm's own case.
    // Each page is listed once per locale since MOTIR-7956; its English entry
    // is the one its own `en` alternate names, and the list of those is the
    // list of pages. A legal document is listed ONCE, at its English address
    // and with no alternates (MOTIR-8086), so that one entry is its English one.
    const english = (await sitemap()).filter((entry) => {
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
