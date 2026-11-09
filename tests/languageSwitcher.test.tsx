import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render as renderOnPage } from '@/tests/helpers/withCopy'
import { LanguageSwitcher } from '@/app/_components/LanguageSwitcher'
import { SiteHeader } from '@/app/_components/SiteHeader'
import { SiteShell } from '@/app/_components/SiteShell'
import { LOCALE_BCP47, LOCALE_ENDONYMS, LOCALES } from '@/i18n/routing'
import { englishCopy as copy, format } from '@/lib/copy'
import { SITE_HOST, UNKNOWN_HOST } from '@/lib/publicHost'

/*
 * THE HEADER'S LANGUAGE SWITCHER (MOTIR-7953), built to MOTIR-7947 revision 2:
 * a globe at the bar's right edge at every width, opening the twelve languages
 * as links, each the page being read in that language.
 */

const pathname = { value: '/' }

/** Render on the page at `pathname.value` (the built path the header reads). */
const render: typeof renderOnPage = (ui, options = {}) =>
  renderOnPage(ui, { pathname: pathname.value, ...options })

const assign = vi.fn()

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      protocol: 'http:',
      search: '',
      hash: '',
      assign,
    },
  })
  document.cookie = 'NEXT_LOCALE=; Max-Age=0; Path=/'
})

afterEach(() => {
  pathname.value = '/'
  assign.mockReset()
})

const ORDER = [
  'English',
  '简体中文',
  '繁體中文',
  '日本語',
  '한국어',
  'Deutsch',
  'Français',
  'Español',
  'Italiano',
  'Nederlands',
  'Polski',
  'Português',
]

const trigger = (language = '日本語') =>
  screen.getByRole('button', {
    name: format(copy.nav.language.label, { language }),
  })

const group = () =>
  screen.getByRole('group', { name: copy.nav.language.menuLabel })

function renderJapaneseExplore() {
  pathname.value = '/ja/explore'
  render(<LanguageSwitcher host={SITE_HOST} />, { locale: 'ja' })
}

describe('closed', () => {
  it('shows the globe, named for the current language, and no endonym', () => {
    renderJapaneseExplore()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).toHaveAttribute('title', copy.nav.language.heading)
    expect(trigger()).toHaveAttribute('aria-controls', 'language-menu')
    // The current language is in the accessible name, not on the bar.
    expect(trigger()).toHaveTextContent('')
    for (const name of ORDER) expect(screen.queryByText(name)).toBeNull()
  })
})

describe('open', () => {
  it('lists the twelve languages in order, each in its own lang', async () => {
    renderJapaneseExplore()
    await userEvent.click(trigger())
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')

    const links = within(group()).getAllByRole('link')
    expect(links.map((a) => a.textContent)).toEqual(ORDER)
    const tags = LOCALES.map((l) => LOCALE_BCP47[l])
    expect(links.map((a) => a.getAttribute('lang'))).toEqual(tags)
    expect(links.map((a) => a.getAttribute('hreflang'))).toEqual(tags)
    expect(links[2]).toHaveAttribute('lang', 'zh-TW')
    expect(links[2]).toHaveAttribute('href', '/zh-tw/explore')
    expect(links[1]).toHaveAttribute('lang', 'zh')
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/explore',
      ...LOCALES.slice(1).map((l) => `/${l}/explore`),
    ])
  })

  it('marks only the current language', async () => {
    renderJapaneseExplore()
    await userEvent.click(trigger())
    const current = within(group())
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'true')
    expect(current.map((a) => a.textContent)).toEqual([LOCALE_ENDONYMS.ja])
  })

  it('closes on Escape and hands focus back to the globe', async () => {
    renderJapaneseExplore()
    await userEvent.click(trigger())
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('group')).toBeNull()
    expect(trigger()).toHaveFocus()
  })

  it('closes on a pointerdown outside it', async () => {
    renderJapaneseExplore()
    await userEvent.click(trigger())
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('group')).toBeNull()
  })
})

describe('choosing a language', () => {
  it('writes the cookie, then moves to the same page with its query and hash', async () => {
    renderJapaneseExplore()
    window.location.search = '?q=x'
    window.location.hash = '#top'
    await userEvent.click(trigger())
    await userEvent.click(
      within(group()).getByRole('link', { name: 'Français' }),
    )
    expect(document.cookie).toContain('NEXT_LOCALE=fr')
    expect(assign).toHaveBeenCalledExactlyOnceWith('/fr/explore?q=x#top')
    expect(screen.queryByRole('group')).toBeNull()
  })

  it('choosing English goes to the unprefixed address and remembers it', async () => {
    renderJapaneseExplore()
    await userEvent.click(trigger())
    await userEvent.click(
      within(group()).getByRole('link', { name: 'English' }),
    )
    expect(document.cookie).toContain('NEXT_LOCALE=en')
    expect(assign).toHaveBeenCalledExactlyOnceWith('/explore')
  })

  it('choosing the current language only closes the list', async () => {
    renderJapaneseExplore()
    await userEvent.click(trigger())
    await userEvent.click(within(group()).getByRole('link', { name: '日本語' }))
    expect(assign).not.toHaveBeenCalled()
    expect(document.cookie).not.toContain('NEXT_LOCALE=ja')
    expect(screen.queryByRole('group')).toBeNull()
  })
})

describe('off the site (the 404 room’s unresolved host)', () => {
  it('points every entry at the same, unprefixed address', async () => {
    pathname.value = '/somewhere'
    render(<LanguageSwitcher host={UNKNOWN_HOST} />, { locale: 'fr' })
    await userEvent.click(trigger('Français'))
    const hrefs = within(group())
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(LOCALES.map(() => '/somewhere'))
  })

  it('writes the URL code, zh-tw, when Traditional Chinese is chosen', async () => {
    renderJapaneseExplore()
    await userEvent.click(trigger())
    await userEvent.click(
      within(group()).getByRole('link', { name: '繁體中文' }),
    )
    expect(document.cookie).toContain('NEXT_LOCALE=zh-tw')
    expect(assign).toHaveBeenCalledExactlyOnceWith('/zh-tw/explore')
  })

  it('reloads the same address after writing the cookie', async () => {
    pathname.value = '/somewhere'
    render(<LanguageSwitcher host={UNKNOWN_HOST} />, { locale: 'fr' })
    await userEvent.click(trigger('Français'))
    await userEvent.click(
      within(group()).getByRole('link', { name: 'Deutsch' }),
    )
    expect(document.cookie).toContain('NEXT_LOCALE=de')
    expect(assign).toHaveBeenCalledExactlyOnceWith('/somewhere')
  })
})

describe('in the header', () => {
  it.each([
    ['the landing (overlay)', true],
    ['any other page', false],
  ])('%s carries the globe', (_label, overlayHeader) => {
    render(
      <SiteShell host={SITE_HOST} overlayHeader={overlayHeader}>
        content
      </SiteShell>,
    )
    expect(trigger('English')).toBeInTheDocument()
  })

  it('stays on the narrow bar and adds nothing to the Menu panel', async () => {
    render(<SiteHeader host={SITE_HOST} />)
    // On the bar at every width: no rung class hides it.
    expect(trigger('English').closest('.hidden')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: copy.nav.menu }))
    const panel = document.getElementById('site-menu')!
    for (const name of ORDER) expect(within(panel).queryByText(name)).toBeNull()
    expect(panel.contains(trigger('English'))).toBe(false)
  })

  it('is the last control on the bar, after Start free', () => {
    render(<SiteHeader host={SITE_HOST} />)
    const start = screen.getByRole('link', { name: copy.nav.startFree })
    const globe = trigger('English')
    const menu = screen.getByRole('button', { name: copy.nav.menu })
    expect(
      start.compareDocumentPosition(globe) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      globe.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})
