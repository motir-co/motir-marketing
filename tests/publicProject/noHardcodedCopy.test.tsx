import { readFileSync } from 'node:fs'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@/tests/helpers/withCopy'
import { type Copy, englishCopy } from '@/lib/copy'
import {
  PUBLIC_ADDRESS_KIND_HEADER,
  PUBLIC_HOST_HEADER,
  PUBLIC_ORIGIN_HEADER,
} from '@/lib/publicHost'

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
 * discussion, and failed; `/w` with projects, empty, and failed;
 * `/host-unavailable`; and the subscribe form in each of its five results.
 */

const headerScope = vi.hoisted(() => ({ current: new Headers() }))
vi.mock('next/headers', () => ({ headers: async () => headerScope.current }))

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
  host?: Record<string, unknown> | 'failed'
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
      if (path.startsWith('/hosts/')) return answer(reads.host)
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

const { resetHostResolutionCache } = await import('@/lib/hostResolution')
const OverviewPage = (await import('@/app/[locale]/p/[identifier]/page'))
  .default
const ChangelogPage = (
  await import('@/app/[locale]/p/[identifier]/changelog/page')
).default
const IntakePage = (
  await import('@/app/[locale]/p/[identifier]/requests/new/page')
).default
const RequestPage = (
  await import('@/app/[locale]/p/[identifier]/requests/[requestKey]/page')
).default
const NoApplicationPage = (await import('@/app/[locale]/no-application/page'))
  .default
const HostUnavailablePage = (
  await import('@/app/[locale]/host-unavailable/page')
).default
const { SubscribeForm } =
  await import('@/app/[locale]/p/[identifier]/_components/SubscribeForm')

const ACME = { locale: 'en', identifier: 'ACME' }
const WORKSPACE_HEADERS = {
  [PUBLIC_ADDRESS_KIND_HEADER]: 'workspace',
  [PUBLIC_HOST_HEADER]: 'acme.motir.site',
  [PUBLIC_ORIGIN_HEADER]: 'https://acme.motir.site',
}

interface Screen {
  label: string
  reads: Reads
  headers?: Record<string, string>
  page: () => Promise<ReactNode>
}

const overview = () => OverviewPage({ params: Promise.resolve(ACME) })
const changelog = (cursor?: string) => () =>
  ChangelogPage({
    params: Promise.resolve(ACME),
    searchParams: Promise.resolve(cursor ? { cursor } : {}),
  })
const requestPage = () =>
  RequestPage({
    params: Promise.resolve({ ...ACME, requestKey: 'ACME-4051' }),
  })
const noApplication = () =>
  NoApplicationPage({ params: Promise.resolve({ locale: 'en' }) })

const noApplicationRead = {
  kind: 'no_application',
  workspace: { name: '«Acme»' },
}

const SCREENS: Screen[] = [
  {
    label: 'the overview, with its prose',
    reads: { project: project() },
    page: overview,
  },
  {
    label: 'the overview, with none',
    reads: { project: project({ publicOverviewMd: null }) },
    page: overview,
  },
  {
    label: 'the overview, failed',
    reads: { project: 'failed' },
    page: overview,
  },
  {
    label: 'the changelog, with entries and an older page',
    reads: { project: project(), changelog: fixture('changelog.json') },
    page: changelog('cl_4'),
  },
  {
    label: 'the changelog, empty',
    reads: {
      project: project(),
      changelog: { entries: [], nextCursor: null },
    },
    page: changelog(),
  },
  {
    label: 'the changelog, failed',
    reads: { project: project(), changelog: 'failed' },
    page: changelog(),
  },
  {
    label: 'the request doorway',
    reads: { project: project() },
    page: () => IntakePage({ params: Promise.resolve(ACME) }),
  },
  {
    label: 'a request, with discussion',
    reads: { project: project(), request: fixture('request-detail.json') },
    page: requestPage,
  },
  {
    label: 'a request, with none',
    reads: {
      project: project(),
      request: { ...fixture('request-detail.json'), comments: [] },
    },
    page: requestPage,
  },
  {
    label: 'a request, failed',
    reads: { project: project(), request: 'failed' },
    page: requestPage,
  },
  {
    label: 'the no-application page',
    reads: { host: noApplicationRead },
    headers: WORKSPACE_HEADERS,
    page: noApplication,
  },
  {
    label: 'the no-application page, failed',
    reads: { host: 'failed' },
    headers: WORKSPACE_HEADERS,
    page: noApplication,
  },
  {
    label: 'the host-unavailable page',
    reads: {},
    page: () =>
      HostUnavailablePage({ params: Promise.resolve({ locale: 'en' }) }),
  },
]

beforeEach(() => {
  resetHostResolutionCache()
  served.catalogue = PSEUDO
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  headerScope.current = new Headers()
})

async function renderScreen(screenCase: Screen) {
  resetHostResolutionCache()
  headerScope.current = new Headers(screenCase.headers ?? {})
  stubContract(screenCase.reads)
  return render(<>{await screenCase.page()}</>, { messages: PSEUDO })
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
      ['the no-application page', PSEUDO.publicProject.noApplication.heading],
      [
        'the no-application page, failed',
        PSEUDO.publicProject.states.error.address,
      ],
      ['the host-unavailable page', PSEUDO.publicProject.states.error.address],
    ]
    for (const [label, marker] of expectations) {
      const { container } = await renderScreen(
        SCREENS.find((s) => s.label === label)!,
      )
      expect(container.textContent, label).toContain(marker)
      cleanup()
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
    const { container } = render(<SubscribeForm identifier="ACME" />, {
      messages: PSEUDO,
    })
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
    const { container } = render(<SubscribeForm identifier="ACME" />, {
      messages: PSEUDO,
    })
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
    const { container } = render(<>{await overview()}</>, {
      messages: literal,
    })

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
