import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_ORIGIN } from '@/lib/appOrigin'
import {
  PROJECT_TABS,
  publicApiBase,
  deriveDescription,
  loadProject,
  projectTabHref,
  readPublic,
} from '@/lib/publicProject'
import { SITE_HOST, UNKNOWN_HOST } from '@/lib/publicHost'

/*
 * The `/p/*` data layer (MOTIR-4115).
 *
 * ⚠️ THE THREE OUTCOMES ARE THE SUBJECT. `lib/explore.ts` has two — data, or the
 * API is unreachable — and this surface has three, because a public project can
 * genuinely NOT EXIST. Conflating any two of them is a visible product bug in a
 * different direction each way:
 *
 *   • `failed` read as `not-found` tells a visitor the project was deleted every
 *     time motir-core restarts, and takes the page out of the index with it.
 *   • `not-found` read as `failed` shows an outage page for a key that is simply
 *     wrong, and keeps dead links crawlable.
 *
 * Neither is visible from a green build, so they are asserted here.
 */

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const json = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

describe('readPublic — the three outcomes', () => {
  it('200 is `ok`, and carries the parsed body', async () => {
    fetchMock.mockResolvedValue(json(200, { identifier: 'ACME' }))

    await expect(readPublic(APP_ORIGIN, '/p/ACME')).resolves.toEqual({
      status: 'ok',
      data: { identifier: 'ACME' },
    })
  })

  it('404 is `not-found` — the API SAYING the project is not public', async () => {
    fetchMock.mockResolvedValue(json(404, { code: 'PROJECT_NOT_FOUND' }))

    await expect(readPublic(APP_ORIGIN, '/p/NOPE')).resolves.toEqual({
      status: 'not-found',
    })
  })

  it('500 is `failed`, NOT `not-found` — the project may well exist', async () => {
    fetchMock.mockResolvedValue(json(500, {}))

    await expect(readPublic(APP_ORIGIN, '/p/ACME')).resolves.toEqual({
      status: 'failed',
    })
  })

  it('a thrown fetch is `failed` — DNS, a timeout, a refused connection', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(readPublic(APP_ORIGIN, '/p/ACME')).resolves.toEqual({
      status: 'failed',
    })
  })

  it('a 200 whose body will not parse is `failed`, not a crash', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON')
      },
    })

    await expect(readPublic(APP_ORIGIN, '/p/ACME')).resolves.toEqual({
      status: 'failed',
    })
  })

  it('reads at REQUEST time, against the app origin', async () => {
    fetchMock.mockResolvedValue(json(200, {}))

    await readPublic(APP_ORIGIN, '/p/ACME')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    // The APP origin — never the site origin. Reading motir.co for data would
    // be this site fetching itself. Asserted against the MODULE rather than a
    // literal, because `vitest.config.mts` deliberately sets a non-production
    // origin so that a test cannot pass by hardcoding the real one.
    expect(url.startsWith(`${APP_ORIGIN}/api/public`)).toBe(true)
    expect(publicApiBase(APP_ORIGIN).startsWith(APP_ORIGIN)).toBe(true)
    // A public project shows a live board and live counts; a build-time copy
    // would serve its state as of the last deploy. Next's `revalidate: 0` is
    // `cache: 'no-store'` on the Worker's `fetch` (MOTIR-10753).
    expect(init).toMatchObject({ cache: 'no-store' })
  })

  it('percent-encodes the identifier — a key is a path segment, not a path', async () => {
    fetchMock.mockResolvedValue(json(404, {}))

    await loadProject(APP_ORIGIN, 'a/../b')

    expect(fetchMock.mock.calls[0]?.[0]).not.toContain('a/../b')
  })
})

describe('the tab set', () => {
  it('is ONE list — the shell renders it, so navigation cannot drift from routes', () => {
    expect(PROJECT_TABS.map((t) => t.segment)).toEqual([
      '',
      'board',
      'items',
      'tree',
      'roadmap',
      'changelog',
    ])
  })

  it('builds the Overview href without a trailing segment', () => {
    expect(projectTabHref(SITE_HOST, 'ACME', '', 'en')).toBe('/p/ACME')
    expect(projectTabHref(SITE_HOST, 'ACME', 'board', 'en')).toBe(
      '/p/ACME/board',
    )
  })

  it('encodes the identifier in a tab href too', () => {
    expect(projectTabHref(SITE_HOST, 'a b', 'items', 'en')).toBe(
      '/p/a%20b/items',
    )
  })

  it('spells the site path whichever host it is given (MOTIR-9528)', () => {
    // `lib/publicHost.ts` owns the mapping and `tests/host/publicHost.test.ts`
    // covers it; this asserts that the tab helper DELEGATES rather than keeping
    // its own copy of the rule. A project is served on motir.co alone now.
    expect(projectTabHref(SITE_HOST, 'ACME', 'board', 'en')).toBe(
      '/p/ACME/board',
    )
    expect(projectTabHref(UNKNOWN_HOST, 'ACME', 'board', 'en')).toBe(
      '/p/ACME/board',
    )
  })
})

describe('deriveDescription', () => {
  it('falls back when there is no authored text', () => {
    expect(deriveDescription(null, 'fallback')).toBe('fallback')
    expect(deriveDescription('   ', 'fallback')).toBe('fallback')
  })

  it('strips Markdown syntax rather than emitting it into a meta tag', () => {
    const out = deriveDescription(
      '## Heading\n\nSome **bold** text.',
      'fallback',
    )

    expect(out).not.toContain('#')
    expect(out).not.toContain('**')
    expect(out).toContain('Some bold text.')
  })

  it('drops a fenced code block entirely', () => {
    const out = deriveDescription('Intro.\n\n```ts\nconst x = 1\n```\n', 'fb')

    expect(out).not.toContain('const x')
    expect(out).toContain('Intro.')
  })

  it('keeps a link’s TEXT and drops its target', () => {
    const out = deriveDescription('See [the docs](https://example.test).', 'fb')

    expect(out).toContain('the docs')
    expect(out).not.toContain('example.test')
  })

  it('caps at 160 characters with an ellipsis', () => {
    const out = deriveDescription('x'.repeat(400), 'fb')

    expect(out.length).toBeLessThanOrEqual(160)
    expect(out.endsWith('…')).toBe(true)
  })
})
