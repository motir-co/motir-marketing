import { screen, within } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NotFound from '@/app/not-found'
import LocaleNotFound from '@/app/[locale]/not-found'
import HostUnavailablePage from '@/app/[locale]/host-unavailable/page'
import { NotFoundRoom } from '@/app/_components/NotFoundRoom'
import { englishCopy as copy, resolveCopy } from '@/lib/copy'
import { EXPLORE, SITE_ROOT } from '@/lib/destinations'
import { EN_PAGE } from '@/tests/helpers/locale'
import {
  PUBLIC_ADDRESS_KIND_HEADER,
  PUBLIC_HOST_HEADER,
  PUBLIC_ORIGIN_HEADER,
  SITE_HOST,
} from '@/lib/publicHost'
import { siteUrl } from '@/lib/siteOrigin'

// The global 404 renders its own `<html>` now (MOTIR-7948), through the shared
// document shell — which loads `next/font` and the stylesheet this lane cannot
// evaluate, and an `<html>` jsdom cannot mount inside a container. The ROOM is
// what these tests read, so the shell passes its children straight through.
// ⚠️ THE 404 ROOM'S SERVER HALF, UNDER jsdom (MOTIR-7950). `app/not-found.tsx`
// hands its provider only the namespaces client modules read; on the server
// the room and the footer read the full catalogue from next-intl's request
// config instead. jsdom has no server half — every component reads the
// provider — so here the provider gets the whole English catalogue.
vi.mock('@/lib/copy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/copy')>()
  return { ...actual, clientCopy: (copy: Record<string, unknown>) => copy }
})
vi.mock('@/app/_components/SiteDocument', () => ({
  SiteDocument: ({ children }: { children: React.ReactNode }) => children,
}))

/*
 * THE 404 ROOM (MOTIR-4193) — the jsdom half.
 *
 * `e2e/specs/not-found.spec.ts` is the half that matters most, because the two
 * things that card is really about — that the response is a REAL 404 and that
 * the DOM carries exactly one landmark once Next has resolved the boundary —
 * are properties of a served document and cannot be observed here.
 *
 * What this file covers is the half a browser lane pays two minutes of build
 * time to reach: that the room reads its words from the CATALOGUE rather than
 * from the JSX, that its doors are built from the shipped constants, and that
 * the room renders no `<main>` of its own. Each of those is a rule the design
 * asset states and a later edit could quietly break with every browser
 * assertion still green.
 *
 * ── ⚠️ THE DOORS ARE ABSOLUTE NOW, ON EVERY HOST (MOTIR-4430) ─────────────
 *
 * That is a deliberate change to what `motir.co` itself emits, and it is here
 * rather than buried: the room is worn by every host `proxy.ts` serves, and
 * `app/not-found.tsx` is the one document that may not ask which one it is on —
 * a `headers()` read in the global not-found boundary makes the WHOLE SITE
 * dynamic. So the room links absolutely, which is the only spelling that works
 * off the site and the same destination on it. What it costs on `motir.co` is
 * the client transition off a 404 page. The file's own header carries the route
 * tables and the two alternatives that were built and measured out.
 */

const requestHeaders = vi.hoisted(() => ({ value: new Headers() }))
vi.mock('next/headers', () => ({ headers: async () => requestHeaders.value }))

// The bar reads the pathname; a 404 URL matches no nav item, which is the
// point of the last assertion in the first block.
vi.mock('next/navigation', () => ({ usePathname: () => '/no-such-page' }))

/** Arrive as the router would have forwarded it — or as `motir.co`, with none. */
function arriveOn(kind?: string, host = 'acme.motir.site') {
  requestHeaders.value = kind
    ? new Headers({
        [PUBLIC_ADDRESS_KIND_HEADER]: kind,
        [PUBLIC_HOST_HEADER]: host,
        [PUBLIC_ORIGIN_HEADER]: `https://${host}`,
      })
    : new Headers()
}

beforeEach(() => arriveOn())

describe('the 404 room', () => {
  it('says what the design decided, from the copy catalogue', () => {
    render(<NotFound />)

    expect(screen.getByText(copy.notFound.eyebrow)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: copy.notFound.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(copy.notFound.lede)).toBeInTheDocument()
  })

  it('offers exactly TWO doors, Explore first', () => {
    /*
     * The doors are a RANKING rather than a menu — the bar carries Explore /
     * Docs / Design and the footer carries all nine destinations, so the room
     * names the likeliest intent and lets the chrome carry the rest. A third
     * door added here is re-listing the nav one inch below the nav.
     */
    render(<NotFound />)

    const doors = within(screen.getByRole('main')).getAllByRole('link')
    expect(doors).toHaveLength(2)
    expect(doors[0]).toHaveTextContent(copy.notFound.exploreDoor)
    expect(doors[1]).toHaveTextContent(copy.notFound.homeDoor)
  })

  it('spells both doors on the SITE ORIGIN, built from `lib/siteOrigin.ts`', () => {
    /*
     * ⚠️ ASSERTED AGAINST `siteUrl()` RATHER THAN AGAINST `https://motir.co`.
     * The site origin has a DEFAULT, so it is the production value in this
     * suite — a literal expectation would pass just as well if the room had
     * hardcoded the string, and a preview deployment's 404 room would then send
     * every lost visitor to production. Comparing the two functions is what says
     * the override is honoured, and it is the same reasoning
     * `tests/host/chromeLinks.test.tsx` records for the chrome.
     */
    render(<NotFound />)

    const doors = within(screen.getByRole('main')).getAllByRole('link')
    expect(doors[0]).toHaveAttribute('href', siteUrl(EXPLORE))
    expect(doors[1]).toHaveAttribute('href', siteUrl(SITE_ROOT))
  })

  it('emits NO root-relative href at all — the regression signal', () => {
    /*
     * The criterion MOTIR-4430 measures with
     * `curl … | grep -oE 'href="/(explore|docs|design|legal)[^"]*"'`, asked of
     * the whole document.
     *
     * ⚠️ A COUNT OVER EVERY HREF, not the absence of the six known paths. On a
     * tenant host a root-relative href resolves against THAT host, which serves
     * one workspace's projects and nothing else — so it is a 404 whatever it
     * spells, including a seventh site link added next year. `#main` is the skip
     * link and is a fragment, not a path.
     */
    const { container } = render(<NotFound />)

    const hrefs = [...container.querySelectorAll('a[href]')].map((a) =>
      a.getAttribute('href')!,
    )
    // A guard on the guard: a page that rendered no chrome would satisfy this
    // vacuously.
    expect(hrefs.length).toBeGreaterThan(8)
    expect(hrefs.filter((h) => h.startsWith('/'))).toEqual([])
  })

  it('renders no `main` of its own — the chrome owns the landmark', () => {
    const { container } = render(<NotFound />)

    // One, and it is `SiteShell`'s: MOTIR-4169 moved the landmark up so no
    // page has to remember, and a second one is the defect that card removed.
    expect(container.querySelectorAll('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('wears the chrome the stock screen has none of', () => {
    render(<NotFound />)

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: copy.nav.skipToContent }),
    ).toBeInTheDocument()
  })

  it('marks no nav item current — a 404 URL is neither /explore nor /docs', () => {
    const { container } = render(<NotFound />)

    // A derivation from `isCurrent()`, not an omission. Asserted so a later
    // edit does not "fix" the missing accent by marking one.
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0)
  })
})

/*
 * ⚠️ THE ROOM IS HOST-AGNOSTIC BY CONSTRUCTION, AND THAT IS WHAT MAKES THE
 * ROUTE'S CHOICE REVERSIBLE (MOTIR-4430).
 *
 * `app/not-found.tsx` passes `UNKNOWN_HOST` because it may not read the
 * request. The component itself has no opinion about that: hand it a real
 * `PublicHost` — the day a nested `not-found.tsx` may be async, or partial
 * prerendering lands — and it answers correctly with nothing else moved. This
 * block is what says so, and it is also the only place the SITE spelling is
 * still asserted.
 */
describe('the room, given a host', () => {
  it('keeps the relative hrefs on `motir.co` itself', () => {
    render(<NotFoundRoom host={SITE_HOST} />)

    const doors = within(screen.getByRole('main')).getAllByRole('link')
    expect(doors[0]).toHaveAttribute('href', EXPLORE)
    expect(doors[1]).toHaveAttribute('href', SITE_ROOT)
  })

  it.each([
    ['a workspace subdomain', 'workspace', 'acme.motir.site'],
    ['an unresolved host', 'unresolved', 'roadmap.acme.com'],
  ])('spells every path absolutely on %s', (_label, kind, host) => {
    const { container } = render(
      <NotFoundRoom
        host={{
          kind: kind as 'workspace' | 'unresolved',
          host,
          origin: `https://${host}`,
        }}
      />,
    )

    const hrefs = [...container.querySelectorAll('a[href]')].map((a) =>
      a.getAttribute('href')!,
    )
    expect(hrefs.length).toBeGreaterThan(8)
    expect(hrefs.filter((h) => h.startsWith('/'))).toEqual([])
    expect(hrefs).toContain(siteUrl(EXPLORE))
  })
})

/*
 * `/host-unavailable` — the router's OTHER landing pad, and the branch that
 * decided the fourth kind (MOTIR-4430). Unlike the room it is an ordinary
 * route, so it READS the request; the `headers()` read is charged to that one
 * route rather than to the whole site.
 */
describe('the host-unavailable page', () => {
  it('renders the error state in the chrome, with no link of its own', async () => {
    render(await HostUnavailablePage(EN_PAGE))

    // `ErrorState` with no `identifier` draws no link, so every href on this
    // page is the chrome's — which is what makes the counts below exact.
    const room = within(screen.getByRole('main'))
    expect(room.getByRole('alert')).toBeInTheDocument()
    expect(room.queryAllByRole('link')).toHaveLength(0)
  })

  it('keeps motir.co’s own chrome relative when no router header arrived', async () => {
    // A request the router did not handle carries neither header and reads as
    // `SITE_HOST` — the correct answer for somebody who typed the URL.
    const { container } = render(await HostUnavailablePage(EN_PAGE))

    const hrefs = [...container.querySelectorAll('a[href]')].map((a) =>
      a.getAttribute('href')!,
    )
    expect(hrefs).toContain(EXPLORE)
    expect(hrefs).toContain(SITE_ROOT)
  })

  it('spells every site path absolutely on an UNRESOLVED host', async () => {
    arriveOn('unresolved', 'roadmap.acme.com')
    const { container } = render(await HostUnavailablePage(EN_PAGE))

    const hrefs = [...container.querySelectorAll('a[href]')].map((a) =>
      a.getAttribute('href')!,
    )
    expect(hrefs.length).toBeGreaterThan(8)
    expect(hrefs.filter((h) => h.startsWith('/'))).toEqual([])
    expect(hrefs).toContain(siteUrl(EXPLORE))
  })
})

/*
 * THE ROOM UNDER A LOCALE (MOTIR-7955) — `app/[locale]/not-found.tsx`, the
 * boundary every `notFound()` inside a locale's tree reaches. The catalogue is
 * a TEST catalogue (no `messages/fr.json` exists yet): it translates the title
 * and leaves the lede out, which is the case the English fallback is for.
 */
describe('the room in French', () => {
  const FRENCH = resolveCopy({
    notFound: { title: 'Cette page n’existe pas' },
  })
  const renderFrench = () =>
    render(<LocaleNotFound />, { locale: 'fr', messages: FRENCH })

  it('reads the locale’s catalogue, with English where it has no key', () => {
    const { container } = renderFrench()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Cette page n’existe pas',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(copy.notFound.lede)).toBeInTheDocument()
    // No dotted catalogue path stands in for a missing string.
    expect(container.textContent).not.toMatch(/\bnotFound\.[a-zA-Z]+/)
  })

  it('keeps its two doors in French, on the site origin', () => {
    renderFrench()

    const doors = within(screen.getByRole('main')).getAllByRole('link')
    expect(doors).toHaveLength(2)
    expect(doors[0]).toHaveAttribute('href', siteUrl('/fr/explore'))
    expect(doors[1]).toHaveAttribute('href', siteUrl('/fr'))
  })

  it('and in English the locale boundary is the global room, door for door', () => {
    render(<LocaleNotFound />)

    const doors = within(screen.getByRole('main')).getAllByRole('link')
    expect(doors[0]).toHaveAttribute('href', siteUrl(EXPLORE))
    expect(doors[1]).toHaveAttribute('href', siteUrl(SITE_ROOT))
  })
})
