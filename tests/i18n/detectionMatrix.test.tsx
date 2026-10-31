import { screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostRead } from '@/lib/hostResolution'
import type { PublicProjectOverviewDto } from '@/lib/publicProject'
import { render } from '@/tests/helpers/withCopy'

/*
 * THE DETECTION MATRIX (MOTIR-7967, case 4) — the visitor's language through
 * the REAL `proxy`, on every kind of host, for every one of the twelve.
 *
 * `tests/host/hostRouter.test.ts` proves each branch with a representative
 * row; this file walks the whole table, so a thirteenth locale, a regional tag the
 * matcher stops folding, or a branch that starts redirecting where it rewrote
 * fails here by name. The host-resolution contract is the one seam stubbed,
 * the same one `tests/host/` stubs; the base domain is pinned to production's.
 *
 * The last block joins the two halves the story built separately: the tree the
 * proxy picks and the words the reader serves on it.
 */

const resolveHost = vi.fn<(host: string) => Promise<HostRead>>()

vi.mock('@/lib/tenantDomain', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/tenantDomain')>()),
  TENANT_DOMAIN: 'motir.site',
}))
vi.mock('@/lib/hostResolution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hostResolution')>()),
  resolveHost,
}))

const { proxy } = await import('@/proxy')
const { NextRequest } = await import('next/server')
const { LOCALES } = await import('@/i18n/routing')
const { ROUTER_PATHS } = await import('@/lib/hostResolution')
const { getCopy } = await import('@/lib/copy')
const { ProjectHeader } =
  await import('@/app/[locale]/p/[identifier]/_components/ProjectHeader')

const WORKSPACE: HostRead = {
  status: 'ok',
  data: {
    kind: 'no_application',
    workspace: { name: 'Acme' },
  },
}

const NON_ENGLISH = LOCALES.filter((l) => l !== 'en')

function request(url: string, headers: Record<string, string> = {}) {
  return new NextRequest(url, {
    headers: { host: new URL(url).host, ...headers },
  })
}
const ask = (url: string, headers: Record<string, string> = {}) =>
  proxy(request(url, headers))
const rewriteOf = (res: Response) => {
  const to = res.headers.get('x-middleware-rewrite')
  return to ? new URL(to).pathname : null
}
const locationOf = (res: Response) => {
  const to = res.headers.get('location')
  return to ? `${new URL(to).pathname}${new URL(to).search}` : null
}

/** A redirect onto a language, with every header the move promises. */
function expectMovedTo(res: Response, to: string) {
  expect(res.status).toBe(307)
  expect(locationOf(res)).toBe(to)
  expect(res.headers.get('vary')).toMatch(/\bCookie\b/)
  expect(res.headers.get('vary')).toMatch(/\bAccept-Language\b/)
  expect(res.headers.get('cache-control')).toBe('private, no-store')
}

/** Served in English where it stands: no redirect, whatever else happens. */
function expectNotMoved(res: Response) {
  expect(res.headers.get('location')).toBeNull()
  expect(res.status).not.toBe(307)
}

beforeEach(() => resolveHost.mockReset())

describe('the site host, an unprefixed address, no cookie', () => {
  it('covers all twelve, so a thirteenth locale joins this table', () => {
    expect(LOCALES).toHaveLength(12)
  })

  it.each(NON_ENGLISH)('Accept-Language: %s → /%s/explore?q=x', async (l) => {
    expectMovedTo(
      await ask('https://motir.co/explore?q=x', { 'accept-language': l }),
      `/${l}/explore?q=x`,
    )
  })

  it('Accept-Language: en is served where it stands', async () => {
    const res = await ask('https://motir.co/explore?q=x', {
      'accept-language': 'en',
    })
    expectNotMoved(res)
    expect(rewriteOf(res)).toBe('/en/explore')
  })

  it.each([
    ['de-AT', 'de'],
    ['pt-BR', 'pt'],
    ['pt-PT', 'pt'],
    ['zh-TW', 'zh-tw'],
    ['zh-Hant', 'zh-tw'],
    ['zh-HK', 'zh-tw'],
    ['zh-Hant-HK', 'zh-tw'],
    ['zh-CN', 'zh'],
    ['ja-JP', 'ja'],
  ])('a regional %s reads as %s', async (tag, l) => {
    expectMovedTo(
      await ask('https://motir.co/explore?q=x', { 'accept-language': tag }),
      `/${l}/explore?q=x`,
    )
  })

  it.each(['sv', '*'])('%s alone is English', async (tag) => {
    const res = await ask('https://motir.co/explore?q=x', {
      'accept-language': tag,
    })
    expectNotMoved(res)
    expect(rewriteOf(res)).toBe('/en/explore')
  })

  it('makes no network hop for any of it', () => {
    expect(resolveHost).not.toHaveBeenCalled()
  })
})

describe('the order: cookie, then browser, then English', () => {
  it('a remembered fr beats a browser asking for de', async () => {
    expectMovedTo(
      await ask('https://motir.co/', {
        cookie: 'NEXT_LOCALE=fr',
        'accept-language': 'de',
      }),
      '/fr',
    )
  })

  it('a remembered en beats a browser asking for ja', async () => {
    const res = await ask('https://motir.co/', {
      cookie: 'NEXT_LOCALE=en',
      'accept-language': 'ja',
    })
    expectNotMoved(res)
    expect(rewriteOf(res)).toBe('/en')
  })

  it('a remembered zh-tw beats a browser asking for de', async () => {
    expectMovedTo(
      await ask('https://motir.co/', {
        cookie: 'NEXT_LOCALE=zh-tw',
        'accept-language': 'de',
      }),
      '/zh-tw',
    )
  })

  it('a cookie that is not one of the twelve is skipped, not read as English', async () => {
    expectMovedTo(
      await ask('https://motir.co/', {
        cookie: 'NEXT_LOCALE=xx',
        'accept-language': 'ja',
      }),
      '/ja',
    )
  })
})

describe('never moved', () => {
  it('a prefixed address, whatever the cookie and the browser say', async () => {
    const res = await ask('https://motir.co/de/', {
      cookie: 'NEXT_LOCALE=fr',
      'accept-language': 'ja',
    })
    expect(locationOf(res) ?? '').not.toMatch(/^\/(fr|ja)\b/)
    expect(rewriteOf(res) ?? '/de').toMatch(/^\/de/)
  })

  it.each([
    '/motir-mark.svg',
    '/robots.txt',
    '/sitemap.xml',
    '/opengraph-image',
    '/icon',
  ])('%s under a Japanese browser', async (path) => {
    expectNotMoved(
      await ask(`https://motir.co${path}`, { 'accept-language': 'ja' }),
    )
  })
})

/*
 * A tenant address keeps its shape in every language: the visitor's choice
 * picks the TREE it is rewritten onto, and the URL in the bar never changes.
 * A customer host is not one (MOTIR-9527): the certificate edge answers it.
 */
describe.each([
  ['a workspace host', WORKSPACE, 'https://acme.motir.site'],
] as const)('%s', (_label, read, origin) => {
  const cases = [['/', (l: string) => `/${l}/no-application`]] as const

  describe.each([
    ['by browser', (l: string) => ({ 'accept-language': l })],
    ['by cookie', (l: string) => ({ cookie: `NEXT_LOCALE=${l}` })],
  ] as const)('chosen %s', (_how, chosen) => {
    it.each(LOCALES)('%s', async (l) => {
      resolveHost.mockResolvedValue(read)
      for (const [path, target] of cases) {
        const first = await ask(`${origin}${path}`, chosen(l))
        expectNotMoved(first)
        expect(rewriteOf(first), path).toBe(target(l))
        // The rewrite comes back through the proxy and is FORWARDED, not
        // routed again onto another tree.
        const second = await ask(`${origin}${target(l)}`, chosen(l))
        expect(rewriteOf(second), path).toBeNull()
        expect(second.headers.get('x-middleware-next'), path).toBe('1')
      }
    })
  })

  it.each(LOCALES)(
    'the outage lands on the %s tree; the 404 stays unprefixed',
    async (l) => {
      resolveHost.mockResolvedValue({ status: 'failed' })
      expect(
        rewriteOf(await ask(`${origin}/board`, { 'accept-language': l })),
      ).toBe(`/${l}${ROUTER_PATHS.unavailable}`)
      resolveHost.mockResolvedValue({ status: 'not-found' })
      expect(
        rewriteOf(await ask(`${origin}/board`, { 'accept-language': l })),
      ).toBe(ROUTER_PATHS.notFound)
    },
  )
})

describe('the rewrite and the render, joined', () => {
  it('a French visitor on a tenant host reads fr.json’s tab label', async () => {
    resolveHost.mockResolvedValue(WORKSPACE)
    const res = await ask('https://acme.motir.site/', {
      'accept-language': 'fr',
    })
    // The locale the proxy chose is the first segment of the tree it picked —
    // the same segment `app/[locale]` hands the page.
    const [, locale] = rewriteOf(res)!.split('/')
    expect(locale).toBe('fr')

    const project = {
      ...JSON.parse(readFileSync('e2e/fixtures/project.json', 'utf8')),
      identifier: 'MOTIR',
    } as PublicProjectOverviewDto
    const copy = await getCopy('fr')
    render(<ProjectHeader project={project} current="changelog" />, {
      locale: 'fr',
      messages: copy,
    })

    const french = JSON.parse(readFileSync('messages/fr.json', 'utf8'))
    const english = JSON.parse(readFileSync('messages/en.json', 'utf8'))
    expect(french.publicProject.tabs.overview).not.toBe(
      english.publicProject.tabs.overview,
    )
    expect(
      screen.getByRole('link', { name: french.publicProject.tabs.overview }),
    ).toBeVisible()
  })
})
