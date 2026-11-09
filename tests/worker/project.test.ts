// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCALE_BCP47, LOCALES, type Locale } from '@/i18n/routing'
import type {
  PublicChangelogPageDto,
  PublicProjectOverviewDto,
  PublicRequestDetailDto,
} from '@/lib/publicProject'
import type { Env } from '@/worker/env'
import { FEED_CACHE_CONTROL } from '@/worker/project/feed'
import { route } from '@/worker/router'
import { resetShell } from '@/worker/render/shell'

/*
 * THE `project` SLOT (MOTIR-10753), driven through the Worker's router with a
 * stub assets binding (a built-page shell and the not-found rooms) and a stub
 * public API on `fetch` that records every request it is sent.
 */

const APP = 'https://app.test.motir.co'
const SITE = 'https://motir.co'
const CSS = '/_astro/SitePage.test.css'
const SCRIPT = '/_astro/SitePage.test.js'

const PROJECT: PublicProjectOverviewDto = {
  id: 'p1',
  name: 'Acme Rockets',
  identifier: 'ACME',
  workspaceName: 'Acme',
  publicOverviewMd: '## What we build\n\nRockets for **everyone**.',
  publicTagline: 'Rockets, in public',
  publicTags: ['space'],
  stats: {
    publicRequests: 3,
    upvotes: 1200,
    planned: 4,
    shipped: 9,
    inProgress: 2,
  },
  links: {},
  viewerCanManage: false,
  addresses: { primary: `${SITE}/p/ACME`, alternates: [] },
}

const CHANGELOG: PublicChangelogPageDto = {
  entries: [
    {
      identifier: 'ACME-7',
      key: 7,
      title: 'Launch countdown',
      kind: 'task',
      status: 'done',
      priority: 'high',
      shippedAt: '2026-10-09T10:00:00.000Z',
      epic: { identifier: 'ACME-1', title: 'Launch' },
    },
  ],
  nextCursor: 'c2',
}

const REQUEST: PublicRequestDetailDto = {
  id: 'r1',
  identifier: 'ACME-12',
  key: 12,
  title: 'Night launches',
  kind: 'request',
  status: 'todo',
  statusLabel: 'Open',
  statusCategory: 'todo',
  descriptionMd: 'Launch **after dark**.',
  openedByName: 'Ada Lovelace',
  createdAt: '2026-10-01T00:00:00.000Z',
  voteCount: 42,
  voted: false,
  comments: [
    {
      id: 'c1',
      workItemId: 'r1',
      parentCommentId: null,
      author: { id: 'u1', name: 'Grace Hopper', image: null },
      bodyMd: 'Yes please',
      editedAt: null,
      createdAt: '2026-10-02T00:00:00.000Z',
      mentionedUserIds: [],
    },
  ],
}

const ATOM =
  '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Acme &amp; co</title></feed>'

type Answer = { status: number; body: unknown } | 'throw'

let api: Map<string, Answer>
let requested: string[]

function answer(path: string, value: Answer) {
  api.set(path, value)
}

function json(body: unknown, status = 200): Answer {
  return { status, body }
}

beforeEach(() => {
  resetShell()
  api = new Map()
  requested = []
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.stubGlobal('fetch', async (input: string | URL) => {
    const url = new URL(String(input))
    requested.push(url.toString())
    const found = api.get(url.pathname + url.search) ?? api.get(url.pathname)
    if (found === 'throw') throw new TypeError('fetch failed')
    if (!found) return new Response('{"code":"not_found"}', { status: 404 })
    const body =
      typeof found.body === 'string' ? found.body : JSON.stringify(found.body)
    return new Response(body, { status: found.status })
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const BUILT_PAGE = `<!doctype html><html lang="en"><head><link rel="preload" href="/_astro/inter.woff2" as="font" type="font/woff2" crossorigin=""><link rel="stylesheet" href="${CSS}"></head><body>room /404<script type="module" src="${SCRIPT}"></script></body></html>`

function stubEnv(appOrigin = APP, assets: string[] = []): Env {
  return {
    ASSETS: {
      async fetch(input) {
        const url = new URL(input instanceof Request ? input.url : input)
        assets.push(url.pathname)
        if (url.pathname === '/404') return new Response(BUILT_PAGE)
        if (url.pathname.endsWith('/404'))
          return new Response(`room ${url.pathname}`)
        return new Response(null, { status: 404 })
      },
    },
    MOTIR_APP_ORIGIN: appOrigin,
    MOTIR_SITE_ORIGIN: SITE,
  }
}

async function get(path: string, env = stubEnv()) {
  const response = await route(new Request(`${SITE}${path}`), env)
  return { response, html: await response.text() }
}

function prefix(locale: Locale): string {
  return locale === 'en' ? '' : `/${locale}`
}

function head(html: string) {
  return {
    lang: /<html lang="([^"]+)"/.exec(html)?.[1],
    title: /<title>([^<]*)<\/title>/.exec(html)?.[1],
    canonical: /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1],
    hreflang: [
      ...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)"/g),
    ].map((match) => match[1]),
    ogLocale: /<meta property="og:locale" content="([^"]+)"/.exec(html)?.[1],
  }
}

const API = `${APP}/api/public`

function knownProject() {
  answer('/api/public/p/ACME', json(PROJECT))
  answer('/api/public/p/ACME/changelog', json(CHANGELOG))
  answer('/api/public/p/ACME/requests/ACME-12', json(REQUEST))
}

describe('the project page', () => {
  it.each(['en', 'de', 'zh-tw'] as const)(
    'answers 200 under %s with the head the page owes',
    async (locale) => {
      knownProject()
      const { response, html } = await get(`${prefix(locale)}/p/ACME`)
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe(
        'text/html; charset=utf-8',
      )
      const tags = head(html)
      expect(tags.lang).toBe(LOCALE_BCP47[locale])
      expect(tags.title).toBe('Acme Rockets · ACME')
      expect(tags.canonical).toBe(`${SITE}${prefix(locale)}/p/ACME`)
      expect(tags.hreflang).toHaveLength(LOCALES.length + 1)
      expect(tags.hreflang).toContain('x-default')
      expect(tags.ogLocale).toMatch(/^[a-z]{2}_[A-Z]{2}$/)
      expect(html).toContain('<h1')
      expect(html).toContain('Acme Rockets')
      expect(html).toContain('Rockets, in public')
      expect(html).toMatch(/<strong[^>]*>everyone<\/strong>/)
      expect(html).toContain(`href="${APP}/p/ACME/board"`)
      expect(requested).toEqual([`${API}/p/ACME`])
    },
  )

  it('names og:locale for the page locale', async () => {
    knownProject()
    expect(head((await get('/de/p/ACME')).html).ogLocale).toBe('de_DE')
  })

  it('shows the empty state when the project wrote no overview', async () => {
    answer('/api/public/p/ACME', json({ ...PROJECT, publicOverviewMd: null }))
    const { html } = await get('/p/ACME')
    expect(html).toContain('This project has not written an overview yet')
  })

  it('links the build stylesheet and fonts, and hydrates its one form', async () => {
    knownProject()
    const { html } = await get('/p/ACME')
    expect(html).toContain(`<link rel="stylesheet" href="${CSS}"/>`)
    expect(html).toContain(
      '<link rel="preload" href="/_astro/inter.woff2" as="font"',
    )
    expect(html).toContain('data-island="SubscribeForm"')
    expect(html).toContain(`&quot;apiBase&quot;:&quot;${API}&quot;`)
    expect(html).toContain(`<script type="module" src="${SCRIPT}"></script>`)
    expect(html).toContain('<script type="application/json" id="motir-page">')
  })

  it('reads the shell once per isolate', async () => {
    knownProject()
    const assets: string[] = []
    const env = stubEnv(APP, assets)
    await get('/p/ACME', env)
    await get('/de/p/ACME', env)
    expect(assets.filter((path) => path === '/404')).toHaveLength(1)
  })
})

describe('the changelog, request and doorway pages', () => {
  it.each(['en', 'ja'] as const)(
    'renders the changelog under %s',
    async (locale) => {
      knownProject()
      const { response, html } = await get(
        `${prefix(locale)}/p/ACME/changelog?cursor=c1`,
      )
      expect(response.status).toBe(200)
      const tags = head(html)
      expect(tags.canonical).toBe(`${SITE}${prefix(locale)}/p/ACME/changelog`)
      expect(tags.hreflang).toHaveLength(LOCALES.length + 1)
      expect(html).toContain('Launch countdown')
      expect(html).toContain(`href="${APP}/p/ACME/items/ACME-7"`)
      expect(html).toContain(
        `href="${prefix(locale)}/p/ACME/changelog?cursor=c2"`,
      )
      expect(html).toContain('href="/p/ACME/changelog.xml"')
      expect(requested).toContain(`${API}/p/ACME/changelog?cursor=c1`)
    },
  )

  it('draws an entry with no epic, and no pager on the last page', async () => {
    knownProject()
    answer(
      '/api/public/p/ACME/changelog',
      json({
        entries: [{ ...CHANGELOG.entries[0]!, epic: null }],
        nextCursor: null,
      }),
    )
    const { html } = await get('/p/ACME/changelog')
    expect(html).toContain('Launch countdown')
    expect(html).not.toContain('rel="next"')
  })

  it('shows the empty changelog', async () => {
    knownProject()
    answer(
      '/api/public/p/ACME/changelog',
      json({ entries: [], nextCursor: null }),
    )
    expect((await get('/p/ACME/changelog')).html).toContain(
      'Nothing shipped yet',
    )
  })

  it('keeps the hero when only the changelog read fails', async () => {
    knownProject()
    answer('/api/public/p/ACME/changelog', json({}, 503))
    const { response, html } = await get('/p/ACME/changelog')
    expect(response.status).toBe(200)
    expect(html).toContain('Acme Rockets')
    expect(html).toContain('We could not load this project&#x27;s changelog')
  })

  it.each(['en', 'fr'] as const)(
    'renders a request under %s',
    async (locale) => {
      knownProject()
      const { response, html } = await get(
        `${prefix(locale)}/p/ACME/requests/ACME-12`,
      )
      expect(response.status).toBe(200)
      const tags = head(html)
      expect(tags.title).toBe('Night launches · ACME')
      expect(tags.canonical).toBe(
        `${SITE}${prefix(locale)}/p/ACME/requests/ACME-12`,
      )
      expect(tags.lang).toBe(LOCALE_BCP47[locale])
      expect(html).toMatch(/<strong[^>]*>after dark<\/strong>/)
      expect(html).toContain('Grace Hopper')
      expect(html).toContain('>GH<')
      expect(html).toContain(`${APP}/act?intent=upvote&amp;subject=ACME`)
      expect(html).toContain(
        encodeURIComponent(`${SITE}${prefix(locale)}/p/ACME/requests/ACME-12`),
      )
    },
  )

  it('renders a request with no description or comments', async () => {
    knownProject()
    answer(
      '/api/public/p/ACME/requests/ACME-12',
      json({ ...REQUEST, descriptionMd: null, comments: [] }),
    )
    const { html } = await get('/p/ACME/requests/ACME-12')
    expect(html).toContain('Night launches')
  })

  it('keeps the hero and no canonical when only the request read fails', async () => {
    knownProject()
    answer('/api/public/p/ACME/requests/ACME-12', 'throw')
    const { response, html } = await get('/p/ACME/requests/ACME-12')
    expect(response.status).toBe(200)
    expect(html).toContain('We could not load this feature request')
    expect(head(html).canonical).toBeUndefined()
  })

  it.each(['en', 'ko'] as const)(
    'renders the request doorway under %s, unindexed',
    async (locale) => {
      knownProject()
      const { response, html } = await get(
        `${prefix(locale)}/p/ACME/requests/new`,
      )
      expect(response.status).toBe(200)
      expect(html).toContain('<meta name="robots" content="noindex, follow"/>')
      expect(head(html).canonical).toBe(
        `${SITE}${prefix(locale)}/p/ACME/requests/new`,
      )
      expect(html).toContain(`${APP}/act?intent=request&amp;subject=ACME`)
    },
  )
})

describe('the feed', () => {
  it('forwards the Atom document byte for byte', async () => {
    answer('/api/public/p/ACME/changelog.xml', { status: 200, body: ATOM })
    const { response, html } = await get('/de/p/ACME/changelog.xml')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(
      'application/atom+xml; charset=utf-8',
    )
    expect(response.headers.get('cache-control')).toBe(FEED_CACHE_CONTROL)
    expect(html).toBe(ATOM)
  })

  it('answers 404 text for a key no project carries', async () => {
    const { response, html } = await get('/p/NOPE/changelog.xml')
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toBe(
      'text/plain; charset=utf-8',
    )
    expect(html).toBe('No public project carries this key.')
  })

  it.each<Answer>(['throw', { status: 500, body: 'x' }])(
    'answers 503, never 404, when the API is down (%j)',
    async (down) => {
      answer('/api/public/p/ACME/changelog.xml', down)
      const { response } = await get('/p/ACME/changelog.xml')
      expect(response.status).toBe(503)
    },
  )
})

describe('a project the API does not know', () => {
  it.each([
    '/p/NOPE',
    '/p/NOPE/changelog',
    '/p/NOPE/requests/NOPE-1',
    '/p/NOPE/requests/new',
  ])('answers %s with the not-found room and status 404', async (path) => {
    const { response, html } = await get(path)
    expect(response.status).toBe(404)
    expect(html).toContain('room /404')
  })

  it('uses the locale room', async () => {
    const { response, html } = await get('/de/p/NOPE')
    expect(response.status).toBe(404)
    expect(html).toBe('room /de/404')
  })

  it('answers 404 for a known project and an unknown request', async () => {
    knownProject()
    const { response } = await get('/p/ACME/requests/ACME-99')
    expect(response.status).toBe(404)
  })

  it.each([
    '/p/ACME/elsewhere',
    '/p/ACME/requests/a/b',
    '/p/ACME/changelog/x',
    '/p/%E0%A4%A',
    '/p/ACME//x',
  ])('answers %s, which is no page, with 404 and no read', async (path) => {
    const { response } = await get(path)
    expect(response.status).toBe(404)
    expect(requested).toEqual([])
  })
})

describe('an API that does not answer', () => {
  it.each<Answer>(['throw', { status: 500, body: {} }])(
    'renders the unavailable state, not a 404 (%j)',
    async (down) => {
      knownProject()
      answer('/api/public/p/ACME', down)
      for (const path of [
        '/p/ACME',
        '/de/p/ACME/changelog',
        '/p/ACME/requests/ACME-12',
        '/p/ACME/requests/new',
      ]) {
        const { response, html } = await get(path)
        expect(response.status, path).toBe(200)
        expect(response.headers.get('cache-control')).toContain('no-store')
        expect(html).toContain('role="alert"')
        expect(head(html).canonical, path).toBeUndefined()
        expect(head(html).hreflang, path).toEqual([])
      }
    },
  )

  it('keeps the watch-live entry on the project page', async () => {
    answer('/api/public/p/ACME', 'throw')
    const { html } = await get('/p/ACME')
    expect(html).toContain('Watch this project being built')
    expect(html).toContain(`href="${APP}/p/ACME/board"`)
  })
})

describe('the retired read views', () => {
  const VIEWS = [
    ['board', '/p/ACME/board'],
    ['items', '/p/ACME/items'],
    ['items/ACME-42', '/p/ACME/items/ACME-42'],
    ['items/A%20B', '/p/ACME/items/A%20B'],
    ['tree', '/p/ACME/tree'],
    ['roadmap', '/p/ACME/roadmap'],
  ]

  it.each(LOCALES)(
    'redirects every view under %s to the app with no read',
    async (locale) => {
      for (const [view, target] of VIEWS) {
        const { response } = await get(
          `${prefix(locale)}/p/ACME/${view}?cursor=x`,
        )
        expect(response.status, view).toBe(308)
        expect(response.headers.get('location'), view).toBe(`${APP}${target}`)
      }
      expect(requested).toEqual([])
    },
  )
})

describe('the app origin', () => {
  it('is the variable, per request, for every read and every app link', async () => {
    const other = 'https://staging-app.motir.co'
    knownProject()
    const { html } = await get('/p/ACME', stubEnv(other))
    expect(requested).toEqual([`${other}/api/public/p/ACME`])
    expect(html).toContain(`href="${other}/p/ACME/board"`)
    expect(html).toContain(`${other}/act?intent=follow`)
    // Every link the project pages draw follows the variable. (The site
    // chrome's sign-in links read the same variable in the Worker, through
    // `worker/processEnv.ts` at isolate start; this process has no isolate.)
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'))
    expect(main).toContain(other)
    expect(main).not.toContain(APP)
    const { response } = await get('/p/ACME/tree', stubEnv(other))
    expect(response.headers.get('location')).toBe(`${other}/p/ACME/tree`)
  })
})

describe('the other slots', () => {
  it.each(['/ideas', '/motir-builds-itself', '/p/ACME/opengraph-image'])(
    'still answer their placeholder (%s)',
    async (path) => {
      const { response } = await get(path)
      expect(response.status).toBe(501)
    },
  )
})
