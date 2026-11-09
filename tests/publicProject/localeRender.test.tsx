import { readFileSync } from 'node:fs'
import { within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { englishCopy } from '@/lib/copy'
import { SITE_ORIGIN } from '@/lib/siteOrigin'
import type { Env } from '@/worker/env'
import { resetShell } from '@/worker/render/shell'
import { route } from '@/worker/router'

/*
 * A PUBLIC PROJECT PAGE IN ANOTHER LOCALE (MOTIR-7954).
 *
 * `noHardcodedCopy.test.tsx` proves every word comes from the catalogue. This
 * file proves the two things that proof cannot: that the numbers and dates are
 * drawn in the PAGE's locale rather than in English, and that a catalogue
 * missing a key shows English for it — never the key.
 *
 * `de` has no catalogue file, so its page is English words around German
 * numbers and dates — exactly what a visitor sees until a translation lands.
 * `fr` is a TEST catalogue that translates the changelog's empty state and
 * leaves out the Overview tab's label.
 *
 * The page is the document the Worker answers for its address (MOTIR-10758),
 * parsed back into a DOM.
 */

const FRENCH = {
  publicProject: {
    changelog: { empty: { title: 'Rien n’a encore été livré' } },
  },
}

vi.mock('@/lib/copy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/copy')>()
  return {
    ...actual,
    getCopy: async (locale: string) =>
      locale === 'fr' ? actual.resolveCopy(FRENCH) : actual.englishCopy,
  }
})

const APP = 'https://app.test.motir.co'
const fixture = (name: string) =>
  JSON.parse(readFileSync(`e2e/fixtures/${name}`, 'utf8'))

function stubContract(changelog: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const path = String(input instanceof Request ? input.url : input).replace(
        `${APP}/api/public`,
        '',
      )
      if (path === '/p/ACME') {
        return Response.json({
          ...fixture('project.json'),
          identifier: 'ACME',
          stats: { ...fixture('project.json').stats, upvotes: 1234 },
          addresses: { primary: 'https://motir.co/p/ACME', alternates: [] },
        })
      }
      if (path.startsWith('/p/ACME/changelog')) return Response.json(changelog)
      return new Response('unexpected read', { status: 404 })
    }),
  )
}

const ENV: Env = {
  ASSETS: {
    fetch: async () =>
      new Response(
        '<html><head><link rel="stylesheet" href="/_astro/s.css"></head><body><script type="module" src="/_astro/s.js"></script></body></html>',
      ),
  },
  MOTIR_APP_ORIGIN: APP,
  MOTIR_SITE_ORIGIN: SITE_ORIGIN,
}

beforeEach(() => {
  resetShell()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** `/<locale>/p/ACME/changelog` as the Worker answers it, as a DOM. */
async function changelogIn(locale: string) {
  const response = await route(
    new Request(`${SITE_ORIGIN}/${locale}/p/ACME/changelog`),
    ENV,
  )
  expect(response.status).toBe(200)
  // Mounted in the test's own document, so role queries have a window.
  const served = new DOMParser().parseFromString(
    await response.text(),
    'text/html',
  )
  document.body.innerHTML = served.body.innerHTML
  return document.body
}

describe('/de/p/ACME/changelog', () => {
  it('draws its dates and counts in German', async () => {
    stubContract(fixture('changelog.json'))
    const page = within(await changelogIn('de'))

    // The first entry shipped on 2 September 2026.
    expect(page.getAllByText('2. Sept. 2026').length).toBeGreaterThan(0)
    expect(page.queryByText('2 Sept 2026')).toBeNull()
    // The upvote stat, with German grouping.
    expect(page.getByText('1.234')).toBeInTheDocument()
    expect(page.queryByText('1,234')).toBeNull()
  })
})

describe('/fr/p/ACME/changelog', () => {
  it('reads the French catalogue, with English where it has no key', async () => {
    stubContract({ entries: [], nextCursor: null })
    const container = await changelogIn('fr')
    const page = within(container)

    expect(page.getByText('Rien n’a encore été livré')).toBeInTheDocument()
    // The tab the catalogue left out is English, not `tabs.overview`.
    const tabs = page.getByRole('navigation', {
      name: englishCopy.publicProject.header.navAria,
    })
    expect(
      within(tabs).getByRole('link', {
        name: englishCopy.publicProject.tabs.overview,
      }),
    ).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/tabs\.overview|publicProject\./)
  })
})
