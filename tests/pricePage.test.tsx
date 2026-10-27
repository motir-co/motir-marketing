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
import { LOCALES } from '@/i18n/routing'
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

  it.each(['en', 'ja', 'nl'] as const)(
    'carries its own canonical and the thirteen alternates in %s',
    async (locale) => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale }),
      })
      const messages = await getCopy(locale)
      const own = locale === 'en' ? '/price' : `/${locale}/price`
      expect(metadata.title).toBe(messages.pricePage.metaTitle)
      expect(metadata.description).toBe(messages.pricePage.metaDescription)
      expect(metadata.alternates?.canonical).toBe(siteUrl(own))
      const languages = metadata.alternates?.languages as Record<string, string>
      expect(Object.keys(languages)).toHaveLength(13)
      expect(languages['x-default']).toBe(siteUrl('/price'))
    },
  )
})
