// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import type { Env } from '@/worker/env'
import { route } from '@/worker/router'

/*
 * MOTIR-8842 — the per-host project half of the sitemap, split out of
 * `tests/sitemapRoutes.test.ts` when the site half became built files
 * (MOTIR-10646). `/sitemap-projects.xml` renders per request in the Worker
 * (MOTIR-10756); re-included by MOTIR-10758, it now asks the Worker's route
 * rather than the Next route file it was written against.
 */

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('/sitemap-projects.xml lists the projects whose canonical is motir.co', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {})
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
  const env: Env = {
    ASSETS: { fetch: async () => new Response('built') },
    MOTIR_APP_ORIGIN: 'https://app.motir.co',
    MOTIR_SITE_ORIGIN: 'https://motir.co',
  }
  const response = await route(
    new Request('https://motir.co/sitemap-projects.xml'),
    env,
  )
  const xml = await response.text()

  expect(xml).toContain('<loc>https://motir.co/p/MOTIR/changelog</loc>')
  expect(xml).not.toContain('PROD')
})
