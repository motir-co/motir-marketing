import { readFileSync } from 'node:fs'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import type { Locale } from '@/i18n/routing'
import { legalDocumentSlugs } from '@/lib/legal/documents'
import { SITE_ORIGIN } from '@/lib/siteOrigin'

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
 */

vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
const pathname = vi.hoisted(() => ({ value: '/fr' }))
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => pathname.value,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

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
  { label: 'the landing', module: '@/app/[locale]/page' },
  {
    label: 'a product page',
    module: '@/app/[locale]/products/project-management/page',
  },
  { label: 'how it works', module: '@/app/[locale]/how-it-works/page' },
  // MOTIR-8383 — rendered with the contract stub below, which answers the
  // plan catalog with a 404, so this is the figure-free page.
  {
    label: 'how the calculation works',
    module: '@/app/[locale]/how-the-calculation-works/page',
  },
  {
    label: 'Motir builds itself',
    module: '@/app/[locale]/motir-builds-itself/page',
  },
  { label: '/design', module: '@/app/[locale]/design/page' },
  { label: '/ideas', module: '@/app/[locale]/ideas/page' },
  { label: '/explore', module: '@/app/[locale]/explore/page' },
  {
    label: 'a topic page',
    module: '@/app/[locale]/explore/topic/[slug]/page',
    params: { slug: 'developer-tools' },
  },
  { label: 'the docs index', module: '@/app/[locale]/docs/(guides)/page' },
  { label: 'a docs guide', module: '@/app/[locale]/docs/(guides)/mcp/page' },
  { label: '/legal', module: '@/app/[locale]/legal/page' },
  {
    label: 'a legal document',
    module: '@/app/[locale]/legal/[slug]/page',
    params: { slug: legalDocumentSlugs()[0] },
  },
  {
    label: 'a public project overview',
    module: '@/app/[locale]/p/[identifier]/page',
    params: { identifier: 'ACME' },
  },
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
      'the binding-English note’s deliberate link to the binding text in English (MOTIR-8088); the unprefixed English address would be bounced back to the reader’s language by the proxy',
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
  pathname.value = locale === 'en' ? '/' : `/${locale}`
  const Page = (await import(/* @vite-ignore */ module)).default as Page
  const ui = await Page({
    params: Promise.resolve({ locale, ...params }),
    searchParams: Promise.resolve({}),
  })
  return render(<>{ui}</>, { locale })
}

beforeEach(() => {
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
})

describe('under fr on the site host, every internal link is French', () => {
  for (const { label, module, params } of PAGES) {
    it(label, async () => {
      const { container } = await renderPage(module, 'fr', params)
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
  for (const { label, module, params } of PAGES) {
    it(label, async () => {
      const { container } = await renderPage(module, 'en', params)
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
