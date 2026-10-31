import { screen, within } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SiteShell } from '@/app/_components/SiteShell'
import type { Locale } from '@/i18n/routing'
import { englishCopy as copy } from '@/lib/copy'
import {
  DESIGN,
  DOCS,
  EXPLORE,
  SITE_PATHS,
  SITE_ROOT,
  PRODUCT_DOCS,
  PRODUCT_SLUGS,
  productPath,
} from '@/lib/destinations'
import { SITE_HOST, siteLinkFor, type PublicHost } from '@/lib/publicHost'
import { SITE_ORIGIN, siteUrl } from '@/lib/siteOrigin'

/*
 * THE SHARED CHROME'S SITE LINKS, ON EACH HOST KIND (MOTIR-4372).
 *
 * ⚠️ THE AXIS THIS FILE ADDS IS THE HOST KIND, NOT THE LINKS. Every link
 * asserted below was already covered — `tests/destinations.test.ts` pins each
 * constant and `tests/siteHeader.test.tsx` asserts the bar emits them — and the
 * whole `origin/main` suite passed with the defect present, because every one of
 * those cases asks the question ON `motir.co`, the one host where the answer was
 * right. The chrome renders byte-identically on a tenant host, where `/explore`,
 * `/docs`, `/design` and all three legal paths are 404s, so the markup a reader
 * compares between the two hosts shows AGREEMENT rather than a bug.
 *
 * `tests/host/tenantLinks.test.tsx` is this file's sibling and covers the
 * mirror question — a PROJECT's own paths on each host kind (`publicPathFor`).
 * Together they are the two halves of the per-host address model: where does a
 * project's page live, and where does the SITE's own page live.
 *
 * ⚠️ AND IT QUANTIFIES OVER `SITE_PATHS` RATHER THAN NAMING THREE LINKS. The
 * defect was not one wrong href — all seven were wrong, identically — so a test
 * that enumerates a subset proves nothing about the rest, and nothing at all
 * about the eighth site link somebody adds next year.
 */

const pathname = vi.hoisted(() => ({ value: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.value }))

afterEach(() => {
  pathname.value = '/'
})

const WORKSPACE: PublicHost = {
  kind: 'workspace',
  host: 'acme.motir.site',
  origin: 'https://acme.motir.site',
}
/*
 * THE FOURTH SHAPE (MOTIR-4430) — a host that is neither this site nor a tenant
 * the contract resolved: the base domain itself, a host nobody has claimed, and
 * a real customer's domain while `app.motir.co` is restarting. It is in the
 * table below rather than in a describe of its own precisely because the chrome
 * must not treat it as a fourth CASE: `siteLinkFor` asks whether the kind is
 * `site`, so everything asserted for the two tenant kinds holds here unchanged,
 * and a predicate written as `workspace || project` would have failed exactly
 * these rows.
 */
const UNRESOLVED: PublicHost = {
  kind: 'unresolved',
  host: 'roadmap.acme.com',
  origin: 'https://roadmap.acme.com',
}

/** Every href the chrome emits, in document order, with the menu panel OPEN. */
async function chromeHrefs(
  host: PublicHost,
  locale: Locale = 'en',
): Promise<string[]> {
  const user = userEvent.setup()
  const { container } = render(<SiteShell host={host}>content</SiteShell>, {
    locale,
  })
  // The bar and the Menu panel are two branches rendering the same
  // items, which is exactly how a treatment ends up existing on desktop only
  // (`SiteHeader`'s own note). Opening the panel puts both in one sweep.
  await user.click(screen.getByRole('button', { name: copy.nav.menu }))
  return [...container.querySelectorAll('a[href]')].map((a) =>
    a.getAttribute('href')!,
  )
}

describe('on the site, the chrome is EXACTLY what it has always been', () => {
  it('emits every site path as the root-relative href it already was', async () => {
    const hrefs = await chromeHrefs(SITE_HOST)
    for (const path of SITE_PATHS) expect(hrefs).toContain(path)
  })

  it('introduces NO absolute URL on this host', async () => {
    // The card's fifth criterion, asserted rather than reasoned about: the fix
    // must be a no-op on `motir.co`. `SITE_ORIGIN` appearing in a chrome href
    // here would mean a redirect hop and a lost `next/link` on every page of
    // the marketing site, in exchange for nothing.
    const hrefs = await chromeHrefs(SITE_HOST)
    expect(hrefs.filter((h) => h.startsWith(SITE_ORIGIN))).toEqual([])
  })
})

describe.each([
  ['a workspace subdomain', WORKSPACE],
  ['an UNRESOLVED host', UNRESOLVED],
])('on %s', (_label, host) => {
  it('emits every site path ABSOLUTELY, on the site origin', async () => {
    const hrefs = await chromeHrefs(host)
    for (const path of SITE_PATHS) {
      expect(hrefs).toContain(siteLinkFor(host, path, 'en'))
      expect(hrefs).toContain(new URL(path, `${SITE_ORIGIN}/`).toString())
    }
  })

  it('emits NO root-relative href at all — the regression signal', async () => {
    /*
     * The criterion the card measures with `curl … | grep -oE 'href="[^"]*"'`,
     * asked of the chrome alone (the shell is rendered with inert children, so
     * every href here is the chrome's own).
     *
     * ⚠️ ASSERTED AS A COUNT OVER THE WHOLE SET, not as the absence of three
     * URLs. A root-relative href in this chrome resolves against the TENANT
     * host, which serves that workspace's projects and nothing else — so it is
     * a 404 whatever it spells, including one added after this test was
     * written. `#main` is the skip link and is a fragment, not a path.
     */
    const hrefs = await chromeHrefs(host)
    expect(hrefs.filter((h) => h.startsWith('/'))).toEqual([])
  })

  it('sends the brand lockup HOME, not to the tenant’s own root', async () => {
    // Both `SiteHeader` and `SiteFooter` described this link as "motir.co's own
    // root" while emitting `/`, which on these two host kinds is the WORKSPACE's
    // root or the PROJECT's. The prose was the intent; the href was not.
    const hrefs = await chromeHrefs(host)
    const home = siteLinkFor(host, SITE_ROOT, 'en')
    expect(home).toBe(`${SITE_ORIGIN}/`)
    expect(hrefs.filter((h) => h === home)).toHaveLength(2)
  })

  it('marks NO nav item current, whatever the path happens to spell', async () => {
    /*
     * A workspace whose project identifier is `explore` is served at
     * `acme.motir.site/explore`. A current-page test that compares the pathname
     * to the item's path alone would light Explore up there — on a page that is
     * a customer's project, not this site's directory. `isCurrent` asks the host
     * kind first, so the answer is false by construction rather than by luck.
     */
    pathname.value = EXPLORE
    const { container } = render(<SiteShell host={host}>content</SiteShell>)
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(0)
  })

  it('keeps the app doors exactly as they were — already absolute, already elsewhere', async () => {
    // The card names these as the SHAPE of the fix: `/sign-in`, `/sign-up` and
    // the follow CTA were absolute and worked, on every host. Nothing here
    // touches them, and this says so.
    const { container } = render(<SiteShell host={host}>content</SiteShell>)
    const bar = within(screen.getByRole('banner'))
    expect(bar.getByRole('link', { name: copy.nav.signIn })).toHaveAttribute(
      'href',
      expect.stringContaining('/sign-in'),
    )
    expect(
      [...container.querySelectorAll('a[href]')].filter(
        (a) =>
          new URL(a.getAttribute('href')!, 'https://motir.co').hostname ===
          'github.com',
      ),
    ).toHaveLength(1)
  })
})

describe('siteLinkFor', () => {
  it('is a no-op on the site and absolute everywhere else', () => {
    for (const path of [SITE_ROOT, EXPLORE, DOCS, DESIGN, '/legal/terms']) {
      expect(siteLinkFor(SITE_HOST, path, 'en')).toBe(path)
      for (const host of [WORKSPACE, UNRESOLVED]) {
        expect(siteLinkFor(host, path, 'en')).toBe(
          new URL(path, `${SITE_ORIGIN}/`).toString(),
        )
      }
    }
  })

  it('builds from `lib/siteOrigin.ts`, so a preview build links its OWN site', () => {
    /*
     * ⚠️ ASSERTED AGAINST `siteUrl()` RATHER THAN AGAINST `https://motir.co`.
     * The site origin has a DEFAULT (`lib/siteOrigin.ts` explains why it does
     * and `appOrigin` does not), so it is the production value in this suite —
     * which means a literal expectation here would pass just as well if the
     * helper had hardcoded the string, and a preview deployment's chrome would
     * send every visitor to production. Comparing the two functions is what
     * says the override is honoured.
     */
    expect(siteLinkFor(WORKSPACE, EXPLORE, 'en')).toBe(siteUrl(EXPLORE))
    expect(siteLinkFor(UNRESOLVED, SITE_ROOT, 'en')).toBe(siteUrl(SITE_ROOT))
  })
})

/*
 * THE CHROME KEEPS THE PAGE'S LOCALE (MOTIR-7971). Under `fr` every site path
 * and every product link the header and footer emit is `siteLinkFor(host,
 * path, 'fr')` — `/fr/docs` on the site, `https://motir.co/fr/docs` off it —
 * and on the site no chrome href is an unprefixed site path.
 */
describe.each([
  ['the site', SITE_HOST],
  ['a workspace subdomain', WORKSPACE],
  ['an UNRESOLVED host', UNRESOLVED],
])('under fr, on %s', (_label, host) => {
  it('emits every site path and product link in French', async () => {
    const hrefs = await chromeHrefs(host, 'fr')
    for (const path of SITE_PATHS) {
      expect(hrefs).toContain(siteLinkFor(host, path, 'fr'))
    }
    for (const slug of PRODUCT_SLUGS) {
      expect(hrefs).toContain(
        siteLinkFor(host, PRODUCT_DOCS[slug] ?? productPath(slug), 'fr'),
      )
    }
  })

  it('emits no English site address', async () => {
    const hrefs = await chromeHrefs(host, 'fr')
    const site = hrefs
      // `#main` is the skip link — a fragment, not an address.
      .filter((h) => !h.startsWith('#'))
      .map((h) => new URL(h, `${SITE_ORIGIN}/`))
      .filter((url) => url.origin === SITE_ORIGIN)
      .map((url) => url.pathname)
    expect(site.length).toBeGreaterThan(0)
    expect(
      site.filter((path) => !(path === '/fr' || path.startsWith('/fr/'))),
    ).toEqual([])
  })
})

describe('siteLinkFor carries the locale', () => {
  it('on the site, English unprefixed and every other locale prefixed', () => {
    expect(siteLinkFor(SITE_HOST, DOCS, 'en')).toBe('/docs')
    expect(siteLinkFor(SITE_HOST, DOCS, 'fr')).toBe('/fr/docs')
    expect(siteLinkFor(SITE_HOST, DOCS, 'ja')).toBe('/ja/docs')
    expect(siteLinkFor(SITE_HOST, SITE_ROOT, 'fr')).toBe('/fr')
    expect(siteLinkFor(SITE_HOST, SITE_ROOT, 'en')).toBe('/')
  })

  it('off the site, absolute AND prefixed', () => {
    expect(siteLinkFor(WORKSPACE, DOCS, 'fr')).toBe(`${SITE_ORIGIN}/fr/docs`)
    expect(siteLinkFor(WORKSPACE, DOCS, 'ja')).toBe(`${SITE_ORIGIN}/ja/docs`)
    expect(siteLinkFor(UNRESOLVED, DOCS, 'en')).toBe(`${SITE_ORIGIN}/docs`)
    expect(siteLinkFor(UNRESOLVED, SITE_ROOT, 'fr')).toBe(`${SITE_ORIGIN}/fr`)
  })
})

/*
 * THE LANGUAGE SWITCHER IS THE ONE ROOT-RELATIVE LINK, AND ONLY BY DESIGN
 * (MOTIR-7953). Its entries are not site paths: each is THIS address in
 * another language, and a tenant address has no prefix, so every entry is the
 * page's own path on its own host — the cookie the click writes is what
 * changes the language. The sweep above asserts the chrome with the list
 * CLOSED; this asserts it open, and that the switcher adds nothing else.
 */
describe.each([
  ['a workspace subdomain', WORKSPACE, '/ACME/changelog'],
  ['an UNRESOLVED host', UNRESOLVED, '/somewhere'],
])('on %s, the open language list', (_label, host, path) => {
  it('points every entry at this same address and nowhere else', async () => {
    pathname.value = path
    const user = userEvent.setup()
    const { container } = render(<SiteShell host={host}>content</SiteShell>)
    const closed = [...container.querySelectorAll('a[href]')].length
    await user.click(screen.getByRole('button', { name: /^Language: / }))
    const group = screen.getByRole('group', {
      name: copy.nav.language.menuLabel,
    })
    const entries = within(group)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(entries).toHaveLength(12)
    expect(new Set(entries)).toEqual(new Set([path]))
    expect(container.querySelectorAll('a[href]')).toHaveLength(closed + 12)
  })
})
