// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'

/*
 * MOTIR-8842 — the per-host project half of the sitemap, split out of
 * `tests/sitemapRoutes.test.ts` when the site half became built files
 * (MOTIR-10646). `/sitemap-projects.xml` renders per request, so it is the
 * Worker-routes story's (MOTIR-10635) to port, and this case waits with it in
 * `held-out.json`.
 */

afterEach(() => {
  vi.doUnmock('next/headers')
  vi.unstubAllGlobals()
  vi.resetModules()
})

it('/sitemap-projects.xml lists the projects whose canonical is motir.co', async () => {
  vi.resetModules()
  vi.doMock('next/headers', () => ({ headers: async () => new Headers() }))
  vi.stubGlobal('fetch', async () =>
    Response.json({
      projects: [
        {
          identifier: 'MOTIR',
          updatedAt: '2026-09-02T00:00:00.000Z',
          primaryHost: 'motir.co',
        },
        {
          identifier: 'PROD',
          updatedAt: '2026-09-01T00:00:00.000Z',
          primaryHost: 'roadmap.acme.com',
        },
      ],
      nextCursor: null,
    }),
  )
  const { GET } = await import('@/app/sitemap-projects.xml/route')
  const xml = await (await GET()).text()

  expect(xml).toContain('<loc>https://motir.co/p/MOTIR/changelog</loc>')
  expect(xml).not.toContain('PROD')
})
