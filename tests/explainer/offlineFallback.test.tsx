import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/tests/helpers/withCopy'
import { LOCALES, type Locale } from '@/i18n/routing'
import { getCopy } from '@/lib/copy'
import { fetchPlanLadderBody, PLAN_LADDER_PATH } from '@/lib/priceLadder'
import {
  readExplainerFigures,
  type ExplainerFigures,
} from '@/lib/explainer/figures'
import type { CatalogSource } from '@/lib/explainer/catalogSource'
import { readExplainerCategories } from '@/lib/explainer/categories'
import { CATEGORIES_PATH } from '@/app/_components/price/calculatorApi'
import { ExplainerPage } from '@/app/[locale]/how-the-calculation-works/_components/ExplainerPage'
import { SECTION_IDS } from '@/app/[locale]/how-the-calculation-works/_components/copy'
import { figureFormat } from '@/app/[locale]/how-the-calculation-works/_components/figureFormat'
import HowTheCalculationWorksRoute from '@/app/[locale]/how-the-calculation-works/page'
import recorded from '@/tests/fixtures/price/plans.json'
import unknownVersion from '@/tests/fixtures/price/plans-unknown-version.json'

/*
 * THE EXPLAINER OFFLINE (MOTIR-9693). The page reads its figures from motir-ai
 * before it renders; when the engine is blocked, answers a version the page does
 * not know, or answers with an error, the visitor still gets all ten sections
 * in words and one quiet note — never an error, a retry control or half a set
 * of figures. Every read here goes through an injected fetch; nothing touches
 * the network.
 */

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

const ORIGIN = 'https://ai.example'
const source: CatalogSource = {
  read: (fetchImpl) => fetchPlanLadderBody(fetchImpl, ORIGIN),
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const ENGINE: [string, () => Promise<Response>][] = [
  [
    'the engine blocked',
    async () => {
      throw new TypeError('fetch failed')
    },
  ],
  ['an unknown response version', async () => json(unknownVersion)],
  ['a non-2xx response', async () => json({ status: 503 }, 503)],
]

/** Reads both of the page's figures through `fetcher`, then renders the body. */
async function renderWith(locale: Locale, fetcher: typeof fetch) {
  const [copy, result, categories] = await Promise.all([
    getCopy(locale),
    readExplainerFigures(fetcher, { source }),
    readExplainerCategories(fetcher, { origin: ORIGIN }),
  ])
  render(
    <ExplainerPage
      copy={copy.explainer}
      locale={locale}
      figures={result.state === 'figures' ? result.figures : null}
      categories={categories}
    />,
    { locale, messages: copy },
  )
  return { copy, result }
}

/** Every figure of the recorded catalog, formatted as `locale` would print it. */
function printedFigures(locale: Locale): string[] {
  const fmt = figureFormat(locale)
  return [...recorded.plans, ...recorded.largerPlans].flatMap((plan) => [
    fmt.credits(plan.monthlyCredits),
    ...Object.values(plan.priceUsdByCadence).map(fmt.usd),
  ])
}

describe('the explainer with no live figures', () => {
  describe.each(ENGINE)('with %s', (_, answer) => {
    it.each(LOCALES)('renders the figure-free page in %s', async (locale) => {
      const fetcher = vi.fn(answer) as unknown as typeof fetch
      const { copy, result } = await renderWith(locale, fetcher)

      expect(result.state).toBe('figure-free')
      const sections = [...document.querySelectorAll('section')]
      expect(sections.map((s) => s.id)).toEqual([...SECTION_IDS])
      for (const id of SECTION_IDS) {
        expect(document.getElementById(`${id}-h`)).toHaveTextContent(
          copy.explainer[id].title,
        )
      }
      expect(
        document.querySelector('[data-element="fallback-note"]'),
      ).toHaveTextContent(copy.explainer.figuresUnavailableNote)
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.queryByRole('button')).toBeNull()

      const text = document.body.textContent ?? ''
      expect(text).not.toMatch(/\$/)
      for (const figure of printedFigures(locale)) {
        expect(text).not.toContain(figure)
      }
    })
  })

  it('renders the route itself without throwing when the engine is blocked', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed')
      }),
    )
    const page = await HowTheCalculationWorksRoute({
      params: Promise.resolve({ locale: 'en' }),
    })
    render(page)
    expect(document.querySelectorAll('section[id^="s"]')).toHaveLength(
      SECTION_IDS.length,
    )
    expect(
      document.querySelector('[data-element="fallback-note"]'),
    ).not.toBeNull()
  })
})

describe('the explainer with live figures', () => {
  // A price no real plan has, so seeing it proves the page printed the
  // catalog's answer rather than a number of its own.
  const SENTINEL = 4321
  const withSentinel = {
    ...recorded,
    plans: recorded.plans.map((plan) =>
      plan.key === 'host'
        ? {
            ...plan,
            priceUsdByCadence: { ...plan.priceUsdByCadence, monthly: SENTINEL },
          }
        : plan,
    ),
  }

  it('prints the sentinel price the catalog answered', async () => {
    const fetcher = vi.fn(async (url: string) =>
      url.endsWith(PLAN_LADDER_PATH)
        ? json(withSentinel)
        : json({ version: 2, categories: [], defaultCadence: 'monthly' }),
    ) as unknown as typeof fetch
    const { result } = await renderWith('en', fetcher)
    expect(result.state).toBe('figures')
    const host = (result as { figures: ExplainerFigures }).figures.host
    expect(host.priceUsdByCadence.monthly).toBe(SENTINEL)
    expect(
      document.querySelector('[data-plan="host"] [data-figure="monthly"]'),
    ).toHaveTextContent(figureFormat('en').usd(SENTINEL))
  })

  it('asks for the plan catalog and the categories only — no seat fee or seat count', async () => {
    for (const answer of [
      async () => json(recorded),
      async () => {
        throw new TypeError('fetch failed')
      },
    ]) {
      const fetcher =
        vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(answer)
      await renderWith('en', fetcher as unknown as typeof fetch)
      const urls = fetcher.mock.calls.map((call) => String(call[0]))
      expect(urls.length).toBeGreaterThan(0)
      for (const url of urls) {
        expect([
          `${ORIGIN}${PLAN_LADDER_PATH}`,
          `${ORIGIN}${CATEGORIES_PATH}`,
        ]).toContain(url)
        expect(url).not.toMatch(/seat/i)
      }
      document.body.innerHTML = ''
    }
  })
})
