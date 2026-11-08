import { cleanup, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { englishCopy, resolveCopy, type Copy } from '@/lib/copy'
import type { PublicProjectOverviewDto } from '@/lib/publicProject'
import { render } from '@/tests/helpers/withCopy'

/*
 * ENGLISH FOR A KEY A REAL CATALOGUE LOSES (MOTIR-7967, case 3).
 *
 * `localeRender.test.tsx` proved the fallback over a hand-made test catalogue,
 * before any real one existed. This runs it over the ten that ship: each loses
 * `landing.hero.cta` and `publicProject.tabs.changelog`, goes through the real
 * `resolveCopy`, and renders the real landing and a public project header in
 * its own locale. The two lost strings read English; a key that was kept reads
 * the catalogue's own words; and no text node is a raw key path or
 * `undefined`.
 */

let pageCopy: Copy = englishCopy

vi.mock('@/lib/copy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/copy')>()
  return { ...actual, getCopy: async () => pageCopy }
})
vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('@/lib/ideas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ideas')>()),
  fetchIdeas: vi
    .fn()
    .mockResolvedValue({ items: [], categories: [], total: 0 }),
}))

const { default: Page } = await import('@/app/[locale]/LandingRoute')
const { ProjectHeader } =
  await import('@/app/[locale]/p/[identifier]/_components/ProjectHeader')
const { LOCALES } = await import('@/i18n/routing')

afterEach(cleanup)

type Locale = (typeof LOCALES)[number]
const TRANSLATED = LOCALES.filter((l): l is Exclude<Locale, 'en'> => l !== 'en')

const project = {
  ...JSON.parse(readFileSync('e2e/fixtures/project.json', 'utf8')),
  identifier: 'MOTIR',
} as PublicProjectOverviewDto

/** A real catalogue with the two keys under test removed. */
function lossy(locale: string) {
  const catalogue = JSON.parse(
    readFileSync(`messages/${locale}.json`, 'utf8'),
  ) as Copy
  const kept = {
    // Not the headline: "Vibe the project" is kept in English in every
    // catalogue (Yue, 2026-10-09), so it cannot tell a fallback from a kept key.
    lede: catalogue.landing.hero.lede,
    overview: catalogue.publicProject.tabs.overview,
  }
  const partial = structuredClone(catalogue) as unknown as {
    landing: { hero: Record<string, unknown> }
    publicProject: { tabs: Record<string, unknown> }
  }
  delete partial.landing.hero.cta
  delete partial.publicProject.tabs.changelog
  return { copy: resolveCopy(partial), kept }
}

/** A dotted catalogue path, counted only when it names a key. */
const KEY_PATH = /\b[a-z]+(\.[a-zA-Z]+){2,}\b/g
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

function expectNoRawText() {
  const text = document.body.textContent ?? ''
  expect(leakedKeys(text)).toEqual([])
  expect(text).not.toMatch(/\bundefined\b/)
}

describe.each(TRANSLATED)('%s', (locale) => {
  it('the landing: the lost CTA reads English, the kept lede its own', async () => {
    const { copy, kept } = lossy(locale)
    // The removed key really was translated, so English is the fallback
    // showing rather than a value that happened to match.
    expect(kept.lede).not.toBe(englishCopy.landing.hero.lede)
    pageCopy = copy
    const page = await Page({ params: Promise.resolve({ locale }) })
    render(page, { locale, messages: copy })

    expect(
      screen.getByRole('button', {
        name: new RegExp(englishCopy.landing.hero.cta),
      }),
    ).toBeInTheDocument()
    // Read off the element rather than matched as text: French's narrow
    // no-break spaces do not survive the text matcher's normalising.
    expect(document.querySelector('[data-hero-lede]')?.textContent).toBe(
      kept.lede,
    )
    expectNoRawText()
  })

  it('a project header: the lost tab reads English, the kept tab its own', () => {
    const { copy, kept } = lossy(locale)
    expect(kept.overview).not.toBe(englishCopy.publicProject.tabs.overview)
    render(<ProjectHeader project={project} current="" />, {
      locale,
      messages: copy,
    })
    const tabs = screen.getByRole('navigation', {
      name: copy.publicProject.header.navAria,
    })
    expect(
      within(tabs).getByRole('link', {
        name: englishCopy.publicProject.tabs.changelog,
      }),
    ).toBeInTheDocument()
    expect(
      within(tabs).getByRole('link', { name: kept.overview }),
    ).toBeInTheDocument()
    expectNoRawText()
  })
})
