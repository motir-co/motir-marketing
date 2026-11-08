import { screen, within } from '@testing-library/react'
import { render as renderOnPage } from '@/tests/helpers/withCopy'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { SiteHeader } from '@/app/_components/SiteHeader'
import { SITE_HOST } from '@/lib/publicHost'
import { englishCopy as copy } from '@/lib/copy'

/*
 * The nav entrance for `/design` (MOTIR-1043) — the site's FIRST internal
 * second route, and therefore the first nav item that can ever be current.
 *
 * ⚠️ BOTH BRANCHES. The bar and the Menu panel are two separate
 * branches of one component, which is exactly how a current-page treatment
 * ends up existing on desktop only — the design asset draws the open panel
 * (panel 4) rather than describing it, for that reason.
 */

const pathname = { value: '/' }

/** Render on the page at `pathname.value` (the built path the header reads). */
const render: typeof renderOnPage = (ui, options = {}) =>
  renderOnPage(ui, { pathname: pathname.value, ...options })

afterEach(() => {
  pathname.value = '/'
})

function bar() {
  return screen.getAllByRole('navigation', { name: copy.nav.ariaLabel })[0]
}

describe('the Design nav entry', () => {
  it('ships in the desktop bar, beside How Motir works and Docs', () => {
    render(<SiteHeader host={SITE_HOST} />)
    const link = within(bar()).getByRole('link', { name: copy.nav.design })
    expect(link).toHaveAttribute('href', '/design')
  })

  it('How Motir works and Docs are site-relative links — the bar is fully same-origin', () => {
    render(<SiteHeader host={SITE_HOST} />)
    // Explore and Docs moved onto motir.co (MOTIR-4045 / MOTIR-4046), so both
    // are site-relative; nothing in the bar is cross-origin
    // except the app doors (Sign in / Start free).
    expect(
      within(bar())
        .getByRole('link', { name: copy.nav.howItWorks })
        .getAttribute('href'),
    ).toBe('/how-it-works')
    expect(
      within(bar())
        .getByRole('link', { name: copy.nav.docs })
        .getAttribute('href'),
    ).toBe('/docs')
    expect(
      within(bar()).getByRole('link', { name: copy.nav.design }),
    ).toHaveAttribute('href', '/design')
  })

  it('exposes the current page to assistive technology on /design, and only there', () => {
    render(<SiteHeader host={SITE_HOST} />)
    expect(
      within(bar()).getByRole('link', { name: copy.nav.design }),
    ).not.toHaveAttribute('aria-current')

    pathname.value = '/design'
    screen.getByRole('banner')
    render(<SiteHeader host={SITE_HOST} />)
    const onPage = screen
      .getAllByRole('link', { name: copy.nav.design })
      .filter((el) => el.getAttribute('aria-current') === 'page')
    expect(onPage.length).toBeGreaterThan(0)
  })

  it('carries the SHIPPED current-page treatment — accent ink at weight 600', () => {
    /*
     * `ExploreTopBar`'s own pairing, and the number that turned it on: 0.1.0
     * measured 4.41:1 in dark (under AA) and the pinned 0.1.1 measures 5.76:1
     * (MOTIR-3872 / MOTIR-3874). `tests/aaMatrix.test.ts` re-measures it over
     * every palette; this asserts the page actually WEARS it.
     *
     * `font-semibold` is the non-colour channel WCAG 1.4.1 asks for, so it is
     * asserted beside the ink rather than left to the eye.
     */
    pathname.value = '/design'
    render(<SiteHeader host={SITE_HOST} />)
    const link = screen.getAllByRole('link', { name: copy.nav.design })[0]
    expect(link.className).toContain('text-(--el-accent-on-surface)')
    expect(link.className).toContain('font-semibold')
  })

  it('draws the treatment in the Menu panel TOO, not only on desktop', async () => {
    pathname.value = '/design'
    const user = userEvent.setup()
    render(<SiteHeader host={SITE_HOST} />)
    await user.click(screen.getByRole('button', { name: copy.nav.menu }))
    const panel = document.getElementById('site-menu')
    expect(panel).not.toBeNull()
    const link = within(panel as HTMLElement).getByRole('link', {
      name: copy.nav.design,
    })
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(link.className).toContain('text-(--el-accent-on-surface)')
  })
})

describe('the Start free button on a phone-width bar (MOTIR-8135)', () => {
  it('may wrap and drop its arrow below sm, so a long label never paints over the brand', () => {
    render(<SiteHeader host={SITE_HOST} />)
    const link = screen.getByRole('link', { name: copy.nav.startFree })
    expect(link.className).toContain('max-sm:whitespace-normal')
    expect(link.className).toContain('max-sm:min-w-0')
    expect(link.querySelector('svg')?.getAttribute('class')).toContain(
      'max-sm:hidden',
    )
  })
})

describe("the bar's right group keeps its give-way ladder from sm up (MOTIR-8135)", () => {
  it('shrinks only below sm — from sm up it is flex-none, or the stored rung widths overflow', () => {
    render(<SiteHeader host={SITE_HOST} />)
    const group = screen.getByRole('link', { name: copy.nav.startFree })
      .parentElement as HTMLElement
    expect(group.className).toContain('min-w-0')
    expect(group.className).toContain('sm:flex-none')
  })
})
