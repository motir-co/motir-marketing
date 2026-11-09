import { act, screen, within } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import userEvent from '@testing-library/user-event'
import { THEME_STORAGE_KEYS } from '@motir/design-system'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DesignShowcase } from '@/app/_components/DesignShowcase'
import { englishCopy as copy } from '@/lib/copy'
import { siteAppearanceAttributes } from '@/lib/siteDefaults'
import { forgetVisitAppearance } from '@/lib/useVisitAppearance'

/*
 * `/design` — the showcase island (MOTIR-1043 · 8.3.16).
 *
 * ⚠️ THE ASSERTION IS ON `<html>`, NOT ON THE CONTROL. The page's claim is
 * that the WHOLE document restyles — bar and footer included — and the whole
 * of that mechanism is `useVisitAppearance` writing `data-style` / `data-palette` /
 * `data-type` / `data-theme` onto `document.documentElement`, which
 * `theme.css`'s 23 `[data-palette]`, 112 `[data-style]` and 9 `[data-type]`
 * blocks then re-resolve for every element on the page. A test that asserted
 * `aria-checked` moved would pass on a picker that changed nothing outside
 * itself.
 */

const html = () => document.documentElement

/*
 * ⚠️ jsdom SHIPS NO `matchMedia`, and the visit store reads it through
 * `useSyncExternalStore` to resolve the `system` pattern. `stubColorScheme` is also how the `system` arm below is driven:
 * the default answer is "not dark", which is precisely what makes a BROKEN
 * `system` arm indistinguishable from a working one.
 */
function stubColorScheme(prefersDark: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: prefersDark && query.includes('dark'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}

/** The <html> every page is served with — what `app/layout.tsx` renders. */
function serveSitePage() {
  stubColorScheme(false)
  for (const [name, value] of Object.entries(siteAppearanceAttributes)) {
    html().setAttribute(name, value)
  }
  window.localStorage.clear()
}

const htmlAppearance = () =>
  Object.fromEntries(
    Object.keys(siteAppearanceAttributes).map((name) => [
      name,
      html().getAttribute(name),
    ]),
  )

function freshVisit() {
  forgetVisitAppearance()
  serveSitePage()
}

beforeEach(freshVisit)
afterEach(freshVisit)

describe('the axis rail', () => {
  it('labels every axis region, so the rail is navigable by role', () => {
    render(<DesignShowcase />)
    for (const label of [
      copy.designShowcase.theme.name,
      copy.designShowcase.style.name,
      copy.designShowcase.palette.name,
      copy.designShowcase.type.name,
    ]) {
      expect(
        screen.getByRole('radiogroup', { name: label }),
      ).toBeInTheDocument()
    }
  })

  it('renders every axis help line from the catalogue, not from the component', () => {
    render(<DesignShowcase />)
    for (const help of [
      copy.designShowcase.theme.help,
      copy.designShowcase.style.help,
      copy.designShowcase.palette.help,
      copy.designShowcase.type.help,
    ]) {
      expect(screen.getByText(help)).toBeInTheDocument()
    }
  })

  it('offers the WHOLE registry on each axis — 19 styles, 14 palettes, 10 pairings', () => {
    render(<DesignShowcase />)
    const count = (name: string) =>
      within(screen.getByRole('radiogroup', { name })).getAllByRole('radio')
        .length
    expect(count(copy.designShowcase.style.name)).toBe(19)
    expect(count(copy.designShowcase.palette.name)).toBe(14)
    expect(count(copy.designShowcase.type.name)).toBe(10)
    expect(count(copy.designShowcase.theme.name)).toBe(3)
  })

  it('lists Motir first and Amethyst second, with no Graphite — the MOTIR-6471 rename, as installed', () => {
    // Pinned on 0.1.3, this picker called the warm scheme "Motir" and offered
    // the monochrome one as "Graphite" (MOTIR-6616). The rename lives in the
    // package, so the pin IS the change and this is what proves it landed.
    render(<DesignShowcase />)
    const names = within(
      screen.getByRole('radiogroup', {
        name: copy.designShowcase.palette.name,
      }),
    )
      .getAllByRole('radio')
      .map((chip) => chip.textContent ?? '')
    expect(names[0]).toMatch(/^Motir/)
    expect(names[1]).toMatch(/^Amethyst/)
    expect(names.some((name) => /Graphite/.test(name))).toBe(false)
    expect(html()).toHaveAttribute('data-palette', 'motir')
  })

  it('reports the selected option on every axis', () => {
    render(<DesignShowcase />)
    const selected = (name: string) =>
      within(screen.getByRole('radiogroup', { name }))
        .getAllByRole('radio')
        .filter((el) => el.getAttribute('aria-checked') === 'true')
    for (const name of [
      copy.designShowcase.theme.name,
      copy.designShowcase.style.name,
      copy.designShowcase.palette.name,
      copy.designShowcase.type.name,
    ]) {
      expect(selected(name)).toHaveLength(1)
    }
  })
})

describe('each control restyles the WHOLE document', () => {
  it('writes data-style onto <html> when a style is picked', async () => {
    const user = userEvent.setup()
    render(<DesignShowcase />)
    await user.click(screen.getByRole('radio', { name: /Neo-Brutalism/ }))
    expect(html()).toHaveAttribute('data-style', 'neo-brutalism')
  })

  it('writes data-palette onto <html> when a palette is picked', async () => {
    const user = userEvent.setup()
    render(<DesignShowcase />)
    await user.click(screen.getByRole('radio', { name: /Amethyst/ }))
    expect(html()).toHaveAttribute('data-palette', 'amethyst')
  })

  it('writes data-type onto <html> when a pairing is picked', async () => {
    const user = userEvent.setup()
    render(<DesignShowcase />)
    await user.click(screen.getByRole('radio', { name: /Mono-Technical/ }))
    expect(html()).toHaveAttribute('data-type', 'mono-technical')
  })

  it('writes data-theme onto <html> for light and dark', async () => {
    const user = userEvent.setup()
    render(<DesignShowcase />)
    await user.click(
      screen.getByRole('radio', { name: copy.designShowcase.theme.dark }),
    )
    expect(html()).toHaveAttribute('data-theme', 'dark')
    await user.click(
      screen.getByRole('radio', { name: copy.designShowcase.theme.light }),
    )
    expect(html()).toHaveAttribute('data-theme', 'light')
  })

  it('stays light on a dark-mode OS, and follows the OS only once `system` is picked', async () => {
    stubColorScheme(true)
    const user = userEvent.setup()
    render(<DesignShowcase />)
    expect(html()).toHaveAttribute('data-theme', 'light')
    await user.click(
      screen.getByRole('radio', { name: copy.designShowcase.theme.system }),
    )
    expect(html()).toHaveAttribute('data-theme', 'dark')
  })

  it('moves the selection with the arrow keys — the radiogroup contract', async () => {
    const user = userEvent.setup()
    render(<DesignShowcase />)
    const group = screen.getByRole('radiogroup', {
      name: copy.designShowcase.style.name,
    })
    const chips = within(group).getAllByRole('radio')
    chips[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(html()).toHaveAttribute('data-style', 'soft-playful')
    expect(chips[1]).toHaveFocus()
  })

  it('keeps only the selected chip in the tab order', () => {
    render(<DesignShowcase />)
    const chips = within(
      screen.getByRole('radiogroup', { name: copy.designShowcase.style.name }),
    ).getAllByRole('radio')
    expect(chips.filter((c) => c.tabIndex === 0)).toHaveLength(1)
  })
})

describe('Reset to default', () => {
  it('is ABSENT at arrival — a reset with nothing to reset is noise', () => {
    render(<DesignShowcase />)
    expect(
      screen.queryByRole('button', { name: copy.designShowcase.reset }),
    ).toBeNull()
  })

  it('appears the moment ANY axis leaves its default', async () => {
    const user = userEvent.setup()
    render(<DesignShowcase />)
    await user.click(screen.getByRole('radio', { name: /Amethyst/ }))
    expect(
      screen.getByRole('button', { name: copy.designShowcase.reset }),
    ).toBeInTheDocument()
  })

  it("returns all four axes to motir.co's own look and disappears again", async () => {
    const user = userEvent.setup()
    render(<DesignShowcase />)
    await user.click(screen.getByRole('radio', { name: /Neo-Brutalism/ }))
    await user.click(screen.getByRole('radio', { name: /Amethyst/ }))
    await user.click(
      screen.getByRole('radio', { name: copy.designShowcase.theme.dark }),
    )
    await user.click(
      screen.getByRole('button', { name: copy.designShowcase.reset }),
    )
    expect(htmlAppearance()).toEqual(siteAppearanceAttributes)
    expect(
      screen.queryByRole('button', { name: copy.designShowcase.reset }),
    ).toBeNull()
  })
})

describe('a choice for the visit, never stored (MOTIR-7724)', () => {
  it('changes nothing on arrival — style, palette, type and theme stay the site look', () => {
    stubColorScheme(true)
    render(<DesignShowcase />)
    expect(htmlAppearance()).toEqual(siteAppearanceAttributes)
  })

  it('stays light when the OS switches to dark while the visitor is on the page', () => {
    // A live media query: the package's specimen runs its own provider, which
    // re-stamps `data-theme` from the OS when it changes.
    let dark = false
    const listeners = new Set<() => void>()
    window.matchMedia = ((query: string) =>
      ({
        get matches() {
          return dark && query.includes('dark')
        },
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_: string, fn: () => void) =>
          listeners.delete(fn),
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia
    render(<DesignShowcase />)
    act(() => {
      dark = true
      for (const fn of listeners) fn()
    })
    expect(html()).toHaveAttribute('data-theme', 'light')
  })

  it('selects the site look in every picker on arrival', () => {
    render(<DesignShowcase />)
    const checked = (name: string) =>
      within(screen.getByRole('radiogroup', { name }))
        .getAllByRole('radio')
        .find((el) => el.getAttribute('aria-checked') === 'true')
    expect(checked(copy.designShowcase.theme.name)).toHaveAccessibleName(
      copy.designShowcase.theme.light,
    )
    expect(checked(copy.designShowcase.style.name)?.textContent).toMatch(
      /Hand-Drawn/,
    )
    expect(checked(copy.designShowcase.type.name)?.textContent).toMatch(
      /Grotesk/,
    )
  })

  it('writes nothing to storage, whatever is picked', async () => {
    const user = userEvent.setup()
    render(<DesignShowcase />)
    await user.click(
      screen.getByRole('radio', { name: copy.designShowcase.theme.dark }),
    )
    await user.click(screen.getByRole('radio', { name: /Neo-Brutalism/ }))
    await user.click(screen.getByRole('radio', { name: /Amethyst/ }))
    await user.click(screen.getByRole('radio', { name: /Mono-Technical/ }))
    for (const key of Object.values(THEME_STORAGE_KEYS)) {
      expect(window.localStorage.getItem(key)).toBeNull()
    }
  })

  it('keeps the choice on the whole site after the visitor leaves /design', async () => {
    // motir.co has one root layout, so <html> outlives the /design route on a
    // client-side navigation; nothing may put the site look back on unmount.
    const user = userEvent.setup()
    const { unmount } = render(<DesignShowcase />)
    await user.click(
      screen.getByRole('radio', { name: copy.designShowcase.theme.dark }),
    )
    await user.click(screen.getByRole('radio', { name: /Neo-Brutalism/ }))
    unmount()
    expect(html()).toHaveAttribute('data-theme', 'dark')
    expect(html()).toHaveAttribute('data-style', 'neo-brutalism')
  })

  it('shows the same choice on coming back to /design in the same visit', async () => {
    const user = userEvent.setup()
    const first = render(<DesignShowcase />)
    await user.click(
      screen.getByRole('radio', { name: copy.designShowcase.theme.dark }),
    )
    await user.click(screen.getByRole('radio', { name: /Neo-Brutalism/ }))
    first.unmount()
    render(<DesignShowcase />)
    expect(html()).toHaveAttribute('data-theme', 'dark')
    expect(html()).toHaveAttribute('data-style', 'neo-brutalism')
    expect(
      screen.getByRole('radio', { name: copy.designShowcase.theme.dark }),
    ).toHaveAttribute('aria-checked', 'true')
    expect(
      screen.getByRole('button', { name: copy.designShowcase.reset }),
    ).toBeInTheDocument()
  })

  it('starts a fresh visit from the site look', async () => {
    const user = userEvent.setup()
    const first = render(<DesignShowcase />)
    await user.click(
      screen.getByRole('radio', { name: copy.designShowcase.theme.dark }),
    )
    first.unmount()
    // A fresh page load: a new JS realm (no in-memory choice) and the
    // server-rendered <html> of app/layout.tsx.
    forgetVisitAppearance()
    serveSitePage()
    render(<DesignShowcase />)
    expect(htmlAppearance()).toEqual(siteAppearanceAttributes)
    expect(
      screen.queryByRole('button', { name: copy.designShowcase.reset }),
    ).toBeNull()
  })
})

describe('the composed specimen', () => {
  it('renders the page words from the catalogue', () => {
    render(<DesignShowcase />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: copy.designShowcase.heading,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(copy.designShowcase.subline)).toBeInTheDocument()
    expect(screen.getByText(copy.designShowcase.closing)).toBeInTheDocument()
  })

  it('mounts the package own TokensSpecimen rather than a redrawn slice of it', () => {
    render(<DesignShowcase />)
    expect(screen.getByText('@motir/design-system')).toBeInTheDocument()
  })

  it('shows EmptyState and ErrorState as SPECIMENS, never as states of the page', () => {
    /*
     * The page fetches nothing, so it has no loading state and no error state
     * — the asset says so rather than leaving it unasked. Both primitives are
     * nevertheless on it, as exhibits. The distinction is not decorative: if
     * they ever became real states, they would have to move behind a
     * condition, and this assertion is what would go red.
     */
    render(<DesignShowcase />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    expect(screen.getByText('Something broke')).toBeInTheDocument()
  })
})
