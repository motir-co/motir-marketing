import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { englishCopy, resolveCopy } from '@/lib/copy'
import { renderHydrated } from '@/tests/helpers/withCopy'

/*
 * A page in another locale, end to end through the readers (MOTIR-7950): the
 * landing's own words AND the shared chrome come from the page's catalogue,
 * and a key that catalogue lacks shows English — never the key.
 *
 * The catalogue is a TEST catalogue, not a real `messages/de.json` (none exists
 * yet): it translates the skip link and the hero headline and leaves out the
 * first Products-menu group label, which is the case the fallback exists for.
 */

const GERMAN = {
  nav: {
    skipToContent: 'Zum Inhalt springen',
    productGroups: { tooling: 'Werkzeuge', infrastructure: 'Infrastruktur' },
  },
  landing: { hero: { headline: 'Das Projekt vibecoden' } },
}

vi.mock('@/lib/copy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/copy')>()
  return {
    ...actual,
    getCopy: async (locale: string) =>
      locale === 'de' ? actual.resolveCopy(GERMAN) : actual.englishCopy,
  }
})
vi.mock('@/lib/ideas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ideas')>()),
  fetchIdeas: vi
    .fn()
    .mockResolvedValue({ items: [], categories: [], total: 0 }),
}))

const { default: Page } = await import('@/app/[locale]/LandingRoute')

/** A dotted catalogue path — what a missing key would render as. */
const KEY_PATH = /\b[a-z]+(\.[a-zA-Z]+){2,}\b/g

/**
 * The dotted strings on the page that name a path in the catalogue. The
 * pattern alone also matches real copy (`app.motir.co`), so a match counts
 * only when it resolves to a key — which is exactly what a leaked key is.
 */
function leakedKeys(text: string): string[] {
  return [...text.matchAll(KEY_PATH)]
    .map(([match]) => match)
    .filter((path) => {
      let node: unknown = englishCopy
      for (const part of path.split('.')) {
        if (!node || typeof node !== 'object' || !(part in node)) return false
        node = (node as Record<string, unknown>)[part]
      }
      return true
    })
}

describe('the landing under /de', () => {
  it('reads the German catalogue, with English where it has no key', async () => {
    const page = await Page({ params: Promise.resolve({ locale: 'de' }) })
    // Hydrated as the browser does, so the menu below is the live island.
    await renderHydrated(page, {
      locale: 'de',
      messages: resolveCopy(GERMAN),
      pathname: '/de',
    })

    // Two translated strings: one in the chrome, one in the landing's body.
    expect(
      screen.getByRole('link', { name: 'Zum Inhalt springen' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: /Das Projekt vibecoden/ }),
    ).toBeInTheDocument()

    // The Products menu: two German group labels and the English one the
    // catalogue left out.
    await userEvent.click(
      screen.getByRole('button', { name: englishCopy.nav.products }),
    )
    const menu = screen.getByRole('group', {
      name: englishCopy.nav.productsMenuLabel,
    })
    expect(within(menu).getByText('Werkzeuge')).toBeInTheDocument()
    expect(within(menu).getByText('Infrastruktur')).toBeInTheDocument()
    expect(
      within(menu).getByText(englishCopy.nav.productGroups.ai),
    ).toBeInTheDocument()

    const text = document.body.textContent ?? ''
    expect(text).toMatch(KEY_PATH) // the check below has something to judge
    expect(leakedKeys(text)).toEqual([])
    expect(leakedKeys('Menu: nav.productGroups.ai')).toEqual([
      'nav.productGroups.ai',
    ])
  })
})
