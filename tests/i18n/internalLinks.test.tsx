import { readFileSync } from 'node:fs'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import type { Locale } from '@/i18n/routing'
import { legalDocumentSlugs } from '@/lib/legal/documents'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { SITE_ORIGIN } from '@/lib/siteOrigin'
import type { Env } from '@/worker/env'
import { resetShell } from '@/worker/render/shell'
import { route } from '@/worker/router'
import { PLAN_LADDER_PATH } from '@/lib/priceLadder'
import plans from '@/tests/fixtures/price/plans.json'
import { NEUTRAL_FIXTURES } from '@/tests/helpers/docsRoutes'

/*
 * EVERY LINK ON A FRENCH PAGE STAYS FRENCH (MOTIR-7971).
 *
 * `siteLinkFor` and `publicPathFor` take a required locale, so the type
 * checker finds every chrome and project caller. It cannot see a page that
 * writes a site path straight into an `href` — a destination constant, a
 * literal, a query helper — and each of those sends a French reader to the
 * English page. This asks the RENDERED page instead: on the site host under
 * `fr`, every same-origin `<a href>` and `<form action>` must be `/fr` or start
 * with `/fr/`, unless the `ALLOWED` list below names it and says why. Under
 * `en` no `/en/` address may appear — English is unprefixed.
 *
 * Two kinds of page, asked the same question (MOTIR-10758): a BUILT page is its
 * route module rendered as the build renders it, and a LIVE page is the
 * document the Worker answers for its address — `route()` over the same
 * contract stub — parsed back into a DOM.
 */

// The built explainer route refuses to build without its figures, so the
// plan ladder is answered from the recorded catalog.
vi.mock('@/lib/aiOrigin', () => ({ AI_ORIGIN: 'https://ai.example' }))

const fixture = (name: string) =>
  JSON.parse(readFileSync(`e2e/fixtures/${name}`, 'utf8')) as unknown

/** The public contract, answered from the browser lane's own fixtures. */
function stubContract() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input instanceof Request ? input.url : input))
      const path = url.pathname.replace(/^\/api\/public/, '')
      const json = (name: string) => Response.json(fixture(name))
      if (url.origin === 'https://ai.example')
        return url.pathname === PLAN_LADDER_PATH
          ? Response.json(plans)
          : new Response('not stubbed', { status: 404 })
      // A docs guide is never built without the three published documents.
      if (url.pathname === '/api/openapi/v1.json')
        return Response.json(NEUTRAL_FIXTURES.openapi)
      if (url.pathname === '/api/docs/mcp-tools.json')
        return Response.json(NEUTRAL_FIXTURES.mcpTools)
      if (url.pathname === '/api/docs/cli-commands.json')
        return Response.json(NEUTRAL_FIXTURES.cliCommands)
      if (path === '/explore') return json('explore.json')
      if (path === '/categories') return json('categories.json')
      if (path === '/ideas') return json('ideas.json')
      if (path === '/ideas/tags') return json('ideas-tags.json')
      if (path === '/p/ACME')
        return Response.json({
          ...(fixture('project.json') as object),
          identifier: 'ACME',
          addresses: { primary: `${SITE_ORIGIN}/p/ACME`, alternates: [] },
        })
      if (path.startsWith('/p/ACME/changelog')) return json('changelog.json')
      return new Response('not stubbed', { status: 404 })
    }),
  )
}

type Page = (props: {
  params: Promise<Record<string, string>>
  searchParams: Promise<Record<string, string>>
}) => Promise<ReactNode> | ReactNode

const PAGES: { label: string; module: string; params?: object }[] = [
  { label: 'the landing', module: '@/app/[locale]/LandingRoute' },
  {
    label: 'a product page',
    module: '@/app/[locale]/products/project-management/ProjectManagementRoute',
  },
  {
    label: 'how it works',
    module: '@/app/[locale]/how-it-works/HowItWorksRoute',
  },
  // MOTIR-8383 — rendered with the recorded plan catalog, which the built
  // page cannot be made without.
  {
    label: 'how the calculation works',
    module:
      '@/app/[locale]/how-the-calculation-works/HowTheCalculationWorksRoute',
  },
  { label: '/design', module: '@/app/[locale]/design/DesignRoute' },
  {
    label: 'the docs index',
    module: '@/app/[locale]/docs/(guides)/DocsIndexRoute',
  },
  {
    label: 'a docs guide',
    module: '@/app/[locale]/docs/(guides)/mcp/McpRoute',
  },
  { label: '/legal', module: '@/app/[locale]/legal/LegalIndexRoute' },
  {
    label: 'a legal document',
    module: '@/app/[locale]/legal/[slug]/LegalDocumentRoute',
    params: { slug: legalDocumentSlugs()[0] },
  },
]

/** The pages the Worker answers per request, by their unprefixed address. */
const LIVE: { label: string; path: string }[] = [
  { label: 'Motir builds itself', path: '/motir-builds-itself' },
  { label: '/ideas', path: '/ideas' },
  { label: '/explore', path: '/explore' },
  { label: 'a topic page', path: '/explore/topic/developer-tools' },
  { label: 'a public project overview', path: '/p/ACME' },
]

/**
 * Same-origin targets that are not a page in a language, each with its reason.
 * A prefix ends in `/` or is matched exactly.
 */
const ALLOWED: { target: string; reason: string }[] = [
  {
    target: '/p/ACME/changelog.xml',
    reason: 'a feed, not a page: one address whatever the reader’s language',
  },
  {
    target: '/en/legal/',
    reason:
      'the binding-English note’s deliberate link to the binding text in English (MOTIR-8088); `_redirects` answers it with a 308 to the unprefixed English page, choosing no language on the way',
  },
]

const allowed = (target: string) =>
  ALLOWED.some(({ target: entry }) =>
    entry.endsWith('/') ? target.startsWith(entry) : target === entry,
  )

/** Every same-origin `href` / `action` in the document, as a path. */
function sameOriginTargets(root: HTMLElement): string[] {
  const targets: string[] = []
  for (const element of root.querySelectorAll('a[href], form[action]')) {
    const raw =
      element.getAttribute('href') ?? element.getAttribute('action') ?? ''
    if (raw.startsWith('#') || raw === '') continue
    const url = new URL(raw, SITE_ORIGIN)
    if (url.origin !== SITE_ORIGIN) continue
    targets.push(`${url.pathname}${url.search}`)
  }
  return targets
}

async function renderPage(module: string, locale: Locale, params = {}) {
  const Page = (await import(/* @vite-ignore */ module)).default as Page
  const ui = await Page({
    params: Promise.resolve({ locale, ...params }),
    searchParams: Promise.resolve({}),
  })
  return render(<>{ui}</>, { locale })
}

/** A Worker env over the contract stub; the shell is read from a built `/404`. */
const ENV: Env = {
  ASSETS: {
    fetch: async () =>
      new Response(
        '<html><head><link rel="stylesheet" href="/_astro/s.css"></head><body><script type="module" src="/_astro/s.js"></script></body></html>',
      ),
  },
  MOTIR_APP_ORIGIN: APP_ORIGIN,
  MOTIR_SITE_ORIGIN: SITE_ORIGIN,
}

/** The document the Worker answers for `path` under `locale`, as a DOM. */
async function renderLive(path: string, locale: Locale) {
  const prefixed = locale === 'en' ? path : `/${locale}${path}`
  const response = await route(new Request(`${SITE_ORIGIN}${prefixed}`), ENV)
  expect(response.status, prefixed).toBe(200)
  const doc = new DOMParser().parseFromString(
    await response.text(),
    'text/html',
  )
  return { container: doc.body }
}

const PAGE_CASES = [
  ...PAGES.map(({ label, module, params }) => ({
    label,
    open: (locale: Locale) => renderPage(module, locale, params),
  })),
  ...LIVE.map(({ label, path }) => ({
    label,
    open: (locale: Locale) => renderLive(path, locale),
  })),
]

beforeEach(() => {
  resetShell()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  stubContract()
  // jsdom has no matchMedia; the design showcase reads it.
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('under fr on the site host, every internal link is French', () => {
  for (const { label, open } of PAGE_CASES) {
    it(label, async () => {
      const { container } = await open('fr')
      const targets = sameOriginTargets(container)
      // A page that rendered no link would pass vacuously.
      expect(targets.length, label).toBeGreaterThan(0)
      const english = targets.filter(
        (target) =>
          !(
            target === '/fr' ||
            target.startsWith('/fr/') ||
            target.startsWith('/fr?')
          ) && !allowed(target),
      )
      expect(english, label).toEqual([])
    })
  }

  it('and the 404 room, whose doors are the chrome’s', async () => {
    const { NotFoundRoom } = await import('@/app/_components/NotFoundRoom')
    const { SITE_HOST } = await import('@/lib/publicHost')
    const { container } = render(<NotFoundRoom host={SITE_HOST} />, {
      locale: 'fr',
    })
    const targets = sameOriginTargets(container)
    expect(targets.length).toBeGreaterThan(0)
    expect(
      targets.filter((t) => !(t === '/fr' || t.startsWith('/fr/'))),
    ).toEqual([])
  })
})

describe('under en, English stays unprefixed', () => {
  for (const { label, open } of PAGE_CASES) {
    it(label, async () => {
      const { container } = await open('en')
      const targets = sameOriginTargets(container)
      expect(
        targets.filter((t) => t === '/en' || t.startsWith('/en/')),
        label,
      ).toEqual([])
    })
  }
})

describe('the guard itself', () => {
  it('fails on a product link left unlocalised', async () => {
    const { productPath } = await import('@/lib/destinations')
    const { container } = render(
      <a href={productPath('project-management')}>Gestion de projet</a>,
      { locale: 'fr' },
    )
    const targets = sameOriginTargets(container)
    expect(targets).toEqual(['/products/project-management'])
    expect(
      targets.filter((t) => !(t === '/fr' || t.startsWith('/fr/'))),
    ).toHaveLength(1)
  })

  it('every ALLOWED entry carries a reason', () => {
    for (const { target, reason } of ALLOWED) {
      expect(reason.length, target).toBeGreaterThan(10)
    }
  })
})
