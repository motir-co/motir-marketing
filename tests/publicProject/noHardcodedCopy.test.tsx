import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/tests/helpers/withCopy'
import { type Copy, englishCopy } from '@/lib/copy'
import { SubscribeForm } from '@/app/[locale]/p/[identifier]/_components/SubscribeForm'
import { publicApiBase } from '@/lib/publicProject'
import { SITE_ORIGIN } from '@/lib/siteOrigin'
import type { Env } from '@/worker/env'
import { resetShell } from '@/worker/render/shell'
import { route } from '@/worker/router'

/*
 * THE PUBLIC-PROJECT TREE RENDERS NO WORD THE CATALOGUE DID NOT GIVE IT
 * (MOTIR-7954).
 *
 * `tests/i18n/noHardcodedCopy.test.ts` reads the SOURCE and catches a literal
 * written into JSX. It cannot see a word built in code — a `'en-GB'` date, a
 * string assembled in a helper, a label picked from a constant table — and
 * those are English on `/ja/` just the same. This file asks the RENDERED page.
 *
 * ⚠️ A PSEUDO-LOCALE, NOT A TRANSLATION. Every string leaf of the English
 * catalogue is served wrapped as `⟦…⟧`, and every display field of the
 * contract's answer as `«…»`. Strip both from what rendered and nothing with a
 * letter in it may be left except a project key and a month name — the date
 * `Intl` drew in the page's locale. A word that survives came from neither the
 * catalogue nor the project, so it would not change with the language.
 *
 * Every screen and every state of the tree is rendered here: the overview with
 * and without its prose and failed; the changelog with entries and an older
 * page, empty, and failed; the request doorway; a request with and without
 * discussion, and failed; and the subscribe form in each of its five
 * results. Each page is the document the Worker answers for its address
 * (MOTIR-10758), mounted back into a DOM.
 *
 * The workspace-host screens (`/no-application`, `/host-unavailable`) left with
 * the tenant hosts (MOTIR-10113) and their pages with the Next app
 * (MOTIR-10634); a project is served on motir.co alone.
 */

/* ── the two wrappings ────────────────────────────────────────────────────── */

const wrapLeaves = (value: unknown): unknown => {
  if (typeof value === 'string') return `⟦${value}⟧`
  if (Array.isArray(value)) return value.map(wrapLeaves)
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, wrapLeaves(item)]),
    )
  }
  return value
}

const PSEUDO = wrapLeaves(englishCopy) as Copy

// Every page reads the catalogue through `getCopy`, and the shared chrome and
// the one client module through the provider — both get the pseudo catalogue.
const served = vi.hoisted(() => ({ catalogue: undefined as unknown }))
vi.mock('@/lib/copy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/copy')>()
  return { ...actual, getCopy: async () => served.catalogue }
})

/** The contract's DISPLAY fields — the words a project owner wrote. */
const DISPLAY_FIELDS = new Set([
  'name',
  'workspaceName',
  'publicOverviewMd',
  'publicTagline',
  'title',
  'statusLabel',
  'descriptionMd',
  'openedByName',
  'bodyMd',
])

const wrapDisplay = (value: unknown, key = ''): unknown => {
  if (typeof value === 'string') {
    return DISPLAY_FIELDS.has(key) ? `«${value}»` : value
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      key === 'publicTags' && typeof item === 'string'
        ? `«${item}»`
        : wrapDisplay(item),
    )
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([k, item]) => [k, wrapDisplay(item, k)]),
    )
  }
  return value
}

const fixture = (name: string) =>
  wrapDisplay(
    JSON.parse(readFileSync(`e2e/fixtures/${name}`, 'utf8')),
  ) as Record<string, unknown>

/* ── the residue check ────────────────────────────────────────────────────── */

/**
 * The only words allowed to survive: a project key, the wordmark, a comment
 * author's initials (drawn from their name, a project value), and a month
 * `Intl` drew.
 */
const PROPER = new Set([
  'ACME',
  'MOTIR',
  // `BrandTile`'s wordmark — the product's name, which no locale translates.
  'Motir',
  // `initials()` of the request fixture's one commenter, «Sam Kelly». The
  // wrapping lands on the first word's first character, so only `K` survives.
  'K',
])
const MONTHS = new Set(
  Array.from({ length: 12 }, (_, month) =>
    ['short', 'long'].map((style) =>
      new Date(Date.UTC(2026, month, 15)).toLocaleString('en-GB', {
        month: style as 'short' | 'long',
        timeZone: 'UTC',
      }),
    ),
  ).flat(),
)

/** Remove every wrapped run, innermost first, until none is left. */
function strip(text: string): string {
  let rest = text
  for (;;) {
    const next = rest.replace(/⟦[^⟦⟧]*⟧|«[^«»]*»/g, ' ')
    if (next === rest) return rest
    rest = next
  }
}

function strays(text: string): string[] {
  return (strip(text).match(/\p{L}+/gu) ?? []).filter(
    (word) => !PROPER.has(word) && !MONTHS.has(word),
  )
}

/** Every text node in document order, joined, so a split sentence rejoins. */
function renderedText(root: HTMLElement): string {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const parts: string[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    // The JSON-LD block is data for crawlers, not text a reader sees — and it
    // is English by decision until MOTIR-7956 localises the crawl data.
    if (node.parentElement?.closest('script')) continue
    parts.push(node.textContent ?? '')
  }
  return parts.join(' ')
}

const COPY_ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt']

/** Every word on the page that came from neither wrapping. */
function unwrappedWords(root: HTMLElement): string[] {
  const found = strays(renderedText(root)).map((word) => `text: ${word}`)
  for (const attribute of COPY_ATTRIBUTES) {
    for (const element of root.querySelectorAll(`[${attribute}]`)) {
      for (const word of strays(element.getAttribute(attribute) ?? '')) {
        found.push(`${attribute}: ${word}`)
      }
    }
  }
  return found
}

/* ── the contract, stubbed ────────────────────────────────────────────────── */

const APP = 'https://app.test.motir.co'
const PRIMARY = 'https://motir.co/p/ACME'

interface Reads {
  project?: Record<string, unknown> | 'failed'
  changelog?: Record<string, unknown> | 'failed'
  request?: Record<string, unknown> | 'failed'
}

function stubContract(reads: Reads) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input instanceof Request ? input.url : input)
      const path = url.replace(`${APP}/api/public`, '')
      const answer = (read: Record<string, unknown> | 'failed' | undefined) =>
        read === 'failed'
          ? new Response('down', { status: 500 })
          : read
            ? Response.json(read)
            : new Response('unexpected read', { status: 404 })
      if (path === '/p/ACME') return answer(reads.project)
      if (path.startsWith('/p/ACME/changelog')) return answer(reads.changelog)
      if (path.startsWith('/p/ACME/requests/')) return answer(reads.request)
      return new Response('unexpected read', { status: 404 })
    }),
  )
}

const project = (overrides: Record<string, unknown> = {}) => ({
  ...fixture('project.json'),
  identifier: 'ACME',
  addresses: { primary: PRIMARY, alternates: [] },
  ...overrides,
})

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

/** The document the Worker answers for `path`, mounted in the test's DOM. */
async function serve(path: string): Promise<{ container: HTMLElement }> {
  const response = await route(new Request(`${SITE_ORIGIN}${path}`), ENV)
  const served = new DOMParser().parseFromString(
    await response.text(),
    'text/html',
  )
  document.body.innerHTML = served.body.innerHTML
  return { container: document.body }
}

interface Screen {
  label: string
  reads: Reads
  /** The page's address on motir.co. */
  path: string
}

const overview = '/p/ACME'
const changelog = (cursor?: string) =>
  `/p/ACME/changelog${cursor ? `?cursor=${cursor}` : ''}`
const requestPage = '/p/ACME/requests/ACME-4051'

const SCREENS: Screen[] = [
  {
    label: 'the overview, with its prose',
    reads: { project: project() },
    path: overview,
  },
  {
    label: 'the overview, with none',
    reads: { project: project({ publicOverviewMd: null }) },
    path: overview,
  },
  {
    label: 'the overview, failed',
    reads: { project: 'failed' },
    path: overview,
  },
  {
    label: 'the changelog, with entries and an older page',
    reads: { project: project(), changelog: fixture('changelog.json') },
    path: changelog('cl_4'),
  },
  {
    label: 'the changelog, empty',
    reads: {
      project: project(),
      changelog: { entries: [], nextCursor: null },
    },
    path: changelog(),
  },
  {
    label: 'the changelog, failed',
    reads: { project: project(), changelog: 'failed' },
    path: changelog(),
  },
  {
    label: 'the request doorway',
    reads: { project: project() },
    path: '/p/ACME/requests/new',
  },
  {
    label: 'a request, with discussion',
    reads: { project: project(), request: fixture('request-detail.json') },
    path: requestPage,
  },
  {
    label: 'a request, with none',
    reads: {
      project: project(),
      request: { ...fixture('request-detail.json'), comments: [] },
    },
    path: requestPage,
  },
  {
    label: 'a request, failed',
    reads: { project: project(), request: 'failed' },
    path: requestPage,
  },
]

beforeEach(() => {
  resetShell()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  served.catalogue = PSEUDO
})
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function renderScreen(screenCase: Screen) {
  stubContract(screenCase.reads)
  return serve(screenCase.path)
}

describe('every screen and state draws its words from the catalogue', () => {
  it.each(SCREENS.map((s) => [s.label, s] as const))(
    '%s',
    async (_label, screenCase) => {
      const { container } = await renderScreen(screenCase)

      // A guard on the guard: a page that rendered nothing passes vacuously.
      expect(renderedText(container)).toContain('⟦')
      expect(unwrappedWords(container)).toEqual([])
    },
  )

  it('reaches the state each case names, not a neighbouring one', async () => {
    // The labels above are claims. These are the strings that prove each one.
    const expectations: [string, string][] = [
      ['the overview, with none', PSEUDO.publicProject.overview.empty.title],
      ['the overview, failed', PSEUDO.publicProject.states.error.project],
      [
        'the changelog, with entries and an older page',
        PSEUDO.publicProject.changelog.older,
      ],
      ['the changelog, empty', PSEUDO.publicProject.changelog.empty.title],
      ['the changelog, failed', PSEUDO.publicProject.states.error.changelog],
      ['the request doorway', PSEUDO.publicProject.requestNew.heading],
      ['a request, with none', PSEUDO.publicProject.request.noComments],
      ['a request, failed', PSEUDO.publicProject.states.error.request],
    ]
    for (const [label, marker] of expectations) {
      const { container } = await renderScreen(
        SCREENS.find((s) => s.label === label)!,
      )
      expect(container.textContent, label).toContain(marker)
    }
  })
})

describe('the subscribe form, in each of its five results', () => {
  it.each([
    [202, 'sent'],
    [422, 'invalid'],
    [409, 'unavailable'],
    [429, 'limited'],
    [500, 'failed'],
  ] as const)('%i → %s', async (status, kind) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ status })),
    )
    const user = userEvent.setup()
    const { container } = render(
      <SubscribeForm identifier="ACME" apiBase={publicApiBase(APP)} />,
      {
        messages: PSEUDO,
      },
    )
    await user.type(
      screen.getByLabelText(PSEUDO.publicProject.subscribe.label),
      'reader@example.test',
    )
    await user.click(
      screen.getByRole('button', {
        name: PSEUDO.publicProject.subscribe.submit,
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        PSEUDO.publicProject.subscribe.messages[kind],
      ),
    )
    expect(unwrappedWords(container)).toEqual([])
  })

  it('and while it sends', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
    const user = userEvent.setup()
    const { container } = render(
      <SubscribeForm identifier="ACME" apiBase={publicApiBase(APP)} />,
      {
        messages: PSEUDO,
      },
    )
    await user.type(
      screen.getByLabelText(PSEUDO.publicProject.subscribe.label),
      'reader@example.test',
    )
    await user.click(
      screen.getByRole('button', {
        name: PSEUDO.publicProject.subscribe.submit,
      }),
    )

    expect(
      screen.getByRole('button', {
        name: PSEUDO.publicProject.subscribe.submitting,
      }),
    ).toBeDisabled()
    expect(unwrappedWords(container)).toEqual([])
  })
})

describe('the check itself', () => {
  it('fails when one wrapped key is replaced by a literal', async () => {
    // The overview's empty state with its title back to the English it was
    // once written as — what a regression to a JSX literal renders.
    const literal = structuredClone(PSEUDO)
    literal.publicProject.overview.empty.title = 'Nothing written yet'
    served.catalogue = literal
    stubContract({ project: project({ publicOverviewMd: null }) })
    const { container } = await serve(overview)

    expect(unwrappedWords(container)).toEqual([
      'text: Nothing',
      'text: written',
      'text: yet',
    ])
  })

  it('fails on a literal in a copy attribute', () => {
    const root = document.createElement('div')
    root.innerHTML = `<button aria-label="⟦Follow⟧"></button><input placeholder="Your email">`
    expect(unwrappedWords(root)).toEqual([
      'placeholder: Your',
      'placeholder: email',
    ])
  })

  it('lets a nested placeholder, a project value, a key and a date through', () => {
    const root = document.createElement('div')
    root.textContent =
      '⟦Opened by «Dana Okoye» · 14 Aug 2026⟧ ⟦your ⟦name⟧ is seen⟧ ACME-4051 ▲ 1,234'
    expect(unwrappedWords(root)).toEqual([])
  })
})
