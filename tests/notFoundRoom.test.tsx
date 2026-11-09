import { screen, within } from '@testing-library/react'
import { render as renderOnPage } from '@/tests/helpers/withCopy'
import { describe, expect, it } from 'vitest'
import LocaleNotFound from '@/app/[locale]/not-found'
import { NotFoundRoom } from '@/app/_components/NotFoundRoom'
import { englishCopy as copy, resolveCopy } from '@/lib/copy'
import { EXPLORE, SITE_ROOT } from '@/lib/destinations'
import { SITE_HOST, UNKNOWN_HOST } from '@/lib/publicHost'
import { siteUrl } from '@/lib/siteOrigin'

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
 * ── ⚠️ THE DOORS ARE ABSOLUTE, ON EVERY HOST (MOTIR-4430) ─────────────────
 *
 * The room was worn by every host the Next proxy served and could not ask which
 * one it was on, so it links absolutely — the only spelling that works off the
 * site and the same destination on it. The built site keeps that spelling
 * (MOTIR-10643): one `404.html` per locale is the room for every unknown
 * address, and the parity check holds its links to the Next build's.
 */

// A 404 address matches no nav item, which is the point of the last
// assertion in the first block. The room is served at any unknown path.
const render: typeof renderOnPage = (ui, options = {}) =>
  renderOnPage(ui, { pathname: '/no-such-page', ...options })

describe('the 404 room', () => {
  it('says what the design decided, from the copy catalogue', () => {
    render(<LocaleNotFound />)

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
    render(<LocaleNotFound />)

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
    render(<LocaleNotFound />)

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
    const { container } = render(<LocaleNotFound />)

    const hrefs = [...container.querySelectorAll('a[href]')].map((a) =>
      a.getAttribute('href')!,
    )
    // A guard on the guard: a page that rendered no chrome would satisfy this
    // vacuously.
    expect(hrefs.length).toBeGreaterThan(8)
    expect(hrefs.filter((h) => h.startsWith('/'))).toEqual([])
  })

  it('renders no `main` of its own — the chrome owns the landmark', () => {
    const { container } = render(<LocaleNotFound />)

    // One, and it is `SiteShell`'s: MOTIR-4169 moved the landmark up so no
    // page has to remember, and a second one is the defect that card removed.
    expect(container.querySelectorAll('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('wears the chrome the stock screen has none of', () => {
    render(<LocaleNotFound />)

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: copy.nav.skipToContent }),
    ).toBeInTheDocument()
  })

  it('marks no nav item current — a 404 URL is neither /explore nor /docs', () => {
    const { container } = render(<LocaleNotFound />)

    // A derivation from `isCurrent()`, not an omission. Asserted so a later
    // edit does not "fix" the missing accent by marking one.
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0)
  })
})

/*
 * ⚠️ THE ROOM IS HOST-AGNOSTIC BY CONSTRUCTION, AND THAT IS WHAT MAKES THE
 * ROUTE'S CHOICE REVERSIBLE (MOTIR-4430).
 *
 * `app/[locale]/not-found.tsx` passes `UNKNOWN_HOST` because a built 404 does
 * not know which address it answers. The component itself has no opinion about
 * that: hand it a real `PublicHost` and it answers correctly with nothing else
 * moved. This block is what says so, and it is also the only place the SITE
 * spelling is still asserted.
 */
describe('the room, given a host', () => {
  it('keeps the relative hrefs on `motir.co` itself', () => {
    render(<NotFoundRoom host={SITE_HOST} />)

    const doors = within(screen.getByRole('main')).getAllByRole('link')
    expect(doors[0]).toHaveAttribute('href', EXPLORE)
    expect(doors[1]).toHaveAttribute('href', SITE_ROOT)
  })

  it('spells every path absolutely on an unresolved host', () => {
    // The tenant `workspace` kind this also covered left with the Next
    // `proxy.ts` that produced it (MOTIR-10811); `unresolved` is the one
    // non-site kind.
    const { container } = render(<NotFoundRoom host={UNKNOWN_HOST} />)

    const hrefs = [...container.querySelectorAll('a[href]')].map((a) =>
      a.getAttribute('href')!,
    )
    expect(hrefs.length).toBeGreaterThan(8)
    expect(hrefs.filter((h) => h.startsWith('/'))).toEqual([])
    expect(hrefs).toContain(siteUrl(EXPLORE))
  })
})

/*
 * THE ROOM UNDER A LOCALE (MOTIR-7955) — `app/[locale]/not-found.tsx`, built
 * as each locale's `404.html` (`src/pages/[...locale]/404.astro`). The catalogue is
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

  it('and in English the room is the root 404, door for door', () => {
    render(<LocaleNotFound />)

    const doors = within(screen.getByRole('main')).getAllByRole('link')
    expect(doors[0]).toHaveAttribute('href', siteUrl(EXPLORE))
    expect(doors[1]).toHaveAttribute('href', siteUrl(SITE_ROOT))
  })
})
