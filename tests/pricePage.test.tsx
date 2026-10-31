import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/tests/helpers/withCopy'
import { SiteHeader } from '@/app/_components/SiteHeader'
import { SiteFooter } from '@/app/_components/SiteFooter'
import { PricePage } from '@/app/_components/PricePage'
import { englishCopy as copy, getCopy } from '@/lib/copy'
import { PRICE, SITE_PATHS } from '@/lib/destinations'
import { SITE_HOST, type PublicHost } from '@/lib/publicHost'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  LOCALES,
  type Locale,
} from '@/i18n/routing'
import { siteUrl } from '@/lib/siteOrigin'
import { generateMetadata } from '@/app/[locale]/price/page'

/*
 * The /price route, its metadata and the two ways in (MOTIR-8382 · MOTIR-9683):
 * the header bar and its Menu panel, and the footer's Product column.
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

/** One locale's catalogue file as committed, with no English fallback merged in. */
const readCatalogue = (locale: Locale) =>
  JSON.parse(
    readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
  ) as { pricePage?: { metaTitle?: string; metaDescription?: string } }

const bar = () =>
  screen.getAllByRole('navigation', { name: copy.nav.ariaLabel })[0]

describe('the Price destination', () => {
  it('is /price and one of the chrome’s same-origin paths', () => {
    expect(PRICE).toBe('/price')
    expect(SITE_PATHS).toContain(PRICE)
  })
})

describe('the Price nav entry', () => {
  it('stands third in the bar, after How to use, as an internal link', () => {
    render(<SiteHeader host={SITE_HOST} />)
    const links = within(bar()).getAllByRole('link')
    const names = links.map((l) => l.textContent)
    expect(names.indexOf(copy.nav.price)).toBe(
      names.indexOf(copy.nav.howToUse) + 1,
    )
    expect(
      within(bar()).getByRole('link', { name: copy.nav.price }),
    ).toHaveAttribute('href', '/price')
  })

  it('is the current page on /price and on no other page', async () => {
    render(<SiteHeader host={SITE_HOST} />)
    expect(
      within(bar()).getByRole('link', { name: copy.nav.price }),
    ).not.toHaveAttribute('aria-current')

    pathname.value = '/price'
    const user = userEvent.setup()
    render(<SiteHeader host={SITE_HOST} />)
    const current = screen
      .getAllByRole('link', { name: copy.nav.price })
      .filter((el) => el.getAttribute('aria-current') === 'page')
    expect(current.length).toBeGreaterThan(0)

    // The Menu panel carries it too.
    await user.click(screen.getAllByRole('button', { name: copy.nav.menu })[1])
    const panel = document.getElementById('site-menu') as HTMLElement
    expect(
      within(panel).getByRole('link', { name: copy.nav.price }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('is an absolute motir.co link from a tenant host', () => {
    render(<SiteHeader host={WORKSPACE} />)
    expect(
      within(bar()).getByRole('link', { name: copy.nav.price }),
    ).toHaveAttribute('href', siteUrl('/price'))
  })
})

describe('the Price footer entry', () => {
  it('sits in the Product column, internal on the site and absolute off it', () => {
    const { unmount } = render(<SiteFooter host={SITE_HOST} />)
    const product = screen
      .getByRole('heading', { name: copy.footer.productHeading })
      .closest('div') as HTMLElement
    expect(
      within(product).getByRole('link', { name: copy.footer.price }),
    ).toHaveAttribute('href', '/price')
    unmount()

    render(<SiteFooter host={WORKSPACE} />)
    expect(
      screen.getByRole('link', { name: copy.footer.price }),
    ).toHaveAttribute('href', siteUrl('/price'))
  })
})

describe('the page', () => {
  it.each(LOCALES)('renders its heading in %s', async (locale) => {
    const messages = await getCopy(locale)
    render(<PricePage />, { locale, messages })
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: messages.pricePage.heading,
      }),
    ).toBeInTheDocument()
    expect(document.getElementById('plans')).not.toBeNull()
    expect(document.getElementById('calculator')).not.toBeNull()
  })

  // Every supported locale, read from the locale list (MOTIR-10156): a missing or
  // wrong title, description, canonical or alternate in any one of them is caught.
  it.each(LOCALES)(
    'carries its own title, description, canonical and the thirteen alternates in %s',
    async (locale) => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale }),
      })
      // The locale's OWN catalogue, not the merged copy: a key missing there would
      // fall back to English through `getCopy` and still match it.
      const own = readCatalogue(locale).pricePage
      expect(own?.metaTitle).toEqual(expect.any(String))
      expect(own?.metaDescription).toEqual(expect.any(String))
      expect(metadata.title).toBe(own!.metaTitle)
      expect(metadata.description).toBe(own!.metaDescription)
      // The product name is never translated (scripts/i18n/README.md), so a
      // title that lost it is not this page's title in any language.
      expect(metadata.title).toContain('Motir AI')
      expect(own!.metaDescription!.trim().length).toBeGreaterThan(0)
      if (locale !== DEFAULT_LOCALE) {
        expect(metadata.title).not.toBe(copy.pricePage.metaTitle)
        expect(metadata.description).not.toBe(copy.pricePage.metaDescription)
      }
      const path = (l: Locale) =>
        l === DEFAULT_LOCALE ? '/price' : `/${l}/price`
      expect(metadata.alternates?.canonical).toBe(siteUrl(path(locale)))
      const languages = metadata.alternates?.languages as Record<string, string>
      const expected: Record<string, string> = {}
      for (const l of LOCALES) expected[LOCALE_BCP47[l]] = siteUrl(path(l))
      expected['x-default'] = siteUrl('/price')
      expect(languages).toStrictEqual(expected)
      expect(Object.keys(languages)).toHaveLength(LOCALES.length + 1)
    },
  )
})
