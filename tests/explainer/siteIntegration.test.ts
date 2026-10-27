import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { LOCALES } from '@/i18n/routing'
import { localizedPath } from '@/i18n/localizedPath'
import { getCopy } from '@/lib/copy'
import { HOW_THE_CALCULATION_WORKS } from '@/lib/destinations'
import { siteSitemapEntries } from '@/lib/sitemapEntries'
import { siteUrl } from '@/lib/siteOrigin'
import { PLAN_LADDER_PATH } from '@/lib/priceLadder'
import { CATEGORIES_PATH } from '@/app/_components/price/calculatorApi'
import { generateMetadata } from '@/app/[locale]/how-the-calculation-works/page'
import { withCopy } from '@/tests/helpers/withCopy'
import recorded from '@/tests/fixtures/price/plans.json'

/*
 * THE EXPLAINER, ASSEMBLED (MOTIR-9694): the sitemap, the page's metadata and
 * the route itself agree on one address per locale, and the route feeds the
 * figure reader's answer to the page. Every expectation is built from
 * `LOCALES`, the path constant and `localizedPath`, so a locale added later is
 * covered with no edit. Nothing here reaches the network.
 */

const own = (locale: (typeof LOCALES)[number]) =>
  siteUrl(localizedPath(locale, HOW_THE_CALCULATION_WORKS))

const entries = () =>
  siteSitemapEntries().filter((entry) =>
    LOCALES.some((locale) => entry.url === own(locale)),
  )

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('the explainer in the sitemap', () => {
  it('has exactly one entry per locale, at that locale’s own address', () => {
    expect(
      entries()
        .map((e) => e.url)
        .sort(),
    ).toEqual(LOCALES.map(own).sort())
  })

  it('gives every entry the same hreflang alternates: every locale plus x-default', () => {
    const expected = Object.fromEntries(
      LOCALES.map((locale) => [locale, own(locale)]),
    )
    for (const entry of entries()) {
      const languages = entry.alternates?.languages as Record<string, string>
      for (const locale of LOCALES) {
        expect(Object.values(languages), entry.url).toContain(expected[locale])
      }
      expect(languages['x-default']).toBe(own('en'))
    }
  })
})

describe('the explainer’s metadata', () => {
  it.each(LOCALES)('agrees with the sitemap in %s', async (locale) => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale }),
    })
    expect(metadata.alternates?.canonical).toBe(own(locale))

    const entry = entries().find((e) => e.url === own(locale))!
    expect(metadata.alternates?.languages).toEqual(entry.alternates?.languages)

    const words = (await getCopy(locale)).explainer
    const english = (await getCopy('en')).explainer
    expect(metadata.title).toBe(words.metaTitle)
    expect(String(metadata.description).length).toBeGreaterThan(0)
    if (locale !== 'en') {
      expect(words.metaTitle).not.toBe(english.metaTitle)
      expect(words.metaDescription).not.toBe(english.metaDescription)
    }
  })
})

describe('the explainer route', () => {
  it('feeds a well-formed catalog answer to the page', async () => {
    // The motir-ai origin is read once, at import, so the route is loaded
    // fresh with one set.
    vi.stubEnv('NEXT_PUBLIC_MOTIR_AI_ORIGIN', 'https://ai.example')
    const fetcher = vi.fn(async (input: string) =>
      Response.json(
        input.endsWith(PLAN_LADDER_PATH)
          ? recorded
          : {
              version: 2,
              categories: [{ key: 'balanced', models: [] }],
              defaultCadence: 'monthly',
            },
      ),
    )
    vi.stubGlobal('fetch', fetcher)
    vi.doMock('next/navigation', () => ({ usePathname: () => '/' }))
    const { default: Route } =
      await import('@/app/[locale]/how-the-calculation-works/page')

    const ui = await Route({ params: Promise.resolve({ locale: 'en' }) })
    const { container } = render(withCopy(ui))

    expect(fetcher.mock.calls.map(([url]) => url).sort()).toEqual(
      [
        `https://ai.example${CATEGORIES_PATH}`,
        `https://ai.example${PLAN_LADDER_PATH}`,
      ].sort(),
    )
    expect(container.querySelector('[data-state]')).toHaveAttribute(
      'data-state',
      'figures',
    )
    expect(container.querySelector('[data-plan="host"]')).not.toBeNull()
    expect(container.textContent).toContain('balanced')
    expect(container.querySelector('[data-element="fallback-note"]')).toBeNull()
  })
})
