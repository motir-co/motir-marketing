import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/tests/helpers/withCopy'
import { englishCopy as copy, getCopy } from '@/lib/copy'
import { HOW_THE_CALCULATION_WORKS, SITE_PATHS } from '@/lib/destinations'
import { explainerResultFrom } from '@/lib/explainer/figures'
import { readExplainerCategories } from '@/lib/explainer/categories'
import { CATEGORIES_PATH } from '@/app/_components/price/calculatorApi'
import { siteSitemapEntries } from '@/lib/sitemapEntries'
import { siteUrl } from '@/lib/siteOrigin'
import { localizedPath } from '@/i18n/localizedPath'
import { LOCALES } from '@/i18n/routing'
import { SITE_ROUTES } from '@/e2e/routes'
import { generateMetadata } from '@/app/[locale]/how-the-calculation-works/page'
import { ExplainerPage } from '@/app/[locale]/how-the-calculation-works/_components/ExplainerPage'
import { SECTION_IDS } from '@/app/[locale]/how-the-calculation-works/_components/copy'
import { figureFormat } from '@/app/[locale]/how-the-calculation-works/_components/figureFormat'
import recorded from '@/tests/fixtures/price/plans.json'

/*
 * The "How the calculation works" route (MOTIR-9691): its ten sections in the
 * design's order, both render states, its metadata, its sitemap entries and its
 * place in the routes table. Every expected figure is read from the recorded
 * plan catalog (`tests/fixtures/price/plans.json`); no test types one.
 */

const result = explainerResultFrom(recorded)
if (result.state !== 'figures') throw new Error('fixture does not parse')
const figures = result.figures
const CATEGORIES = ['fast', 'balanced', 'deep']
const fmt = figureFormat('en')

const sections = () =>
  SECTION_IDS.map((id) => document.getElementById(id) as HTMLElement)

function renderPage(state: 'figures' | 'figure-free') {
  render(
    <ExplainerPage
      copy={copy.explainer}
      locale="en"
      figures={state === 'figures' ? figures : null}
      categories={state === 'figures' ? CATEGORIES : null}
    />,
  )
}

describe('the explainer page', () => {
  it('renders the ten sections in the design order, each named by its heading', () => {
    renderPage('figures')
    const rendered = [...document.querySelectorAll('section')]
    expect(rendered.map((s) => s.id)).toEqual([...SECTION_IDS])
    for (const id of SECTION_IDS) {
      expect(
        screen.getByRole('region', {
          name: new RegExp(copy.explainer[id].title),
        }),
      ).toHaveAttribute('id', id)
    }
  })

  it('lists the ten sections in its contents list, linked to their anchors', () => {
    renderPage('figures')
    const nav = screen.getAllByRole('navigation', {
      name: copy.explainer.contentsLabel,
    })[0]
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(SECTION_IDS.map((id) => `#${id}`))
  })

  it('fills every slot from the catalog read', () => {
    renderPage('figures')
    const text = document.body.textContent ?? ''
    for (const plan of [...figures.ladder, figures.host]) {
      const card = document.querySelector(`[data-plan="${plan.key}"]`)!
      expect(card.textContent).toContain(plan.name)
      expect(card.textContent).toContain(fmt.credits(plan.monthlyCredits))
      expect(card.textContent).toContain(
        fmt.usd(plan.priceUsdByCadence.monthly),
      )
      expect(card.textContent).toContain(fmt.usd(plan.priceUsdByCadence.annual))
    }
    expect(text).toContain(fmt.usd(figures.topUp.unitAmountUsd))
    expect(text).toContain(fmt.credits(figures.topUp.unitCredits))
    expect(text).toContain(fmt.credits(figures.largerPool.fromCredits))
    for (const category of CATEGORIES) expect(text).toContain(category)
    expect(document.querySelector('[data-element="fallback-note"]')).toBeNull()
  })

  it('names Max ×2 and Host as plans of their own on both cadences', () => {
    renderPage('figures')
    for (const key of ['max_x2', 'host']) {
      const card = document.querySelector(`[data-plan="${key}"]`)!
      expect(card.querySelector('[data-figure="monthly"]')).not.toBeNull()
      expect(card.querySelector('[data-figure="annual"]')).not.toBeNull()
    }
  })

  it('renders all ten sections in words, with the quiet note, when figures are unavailable', () => {
    renderPage('figure-free')
    expect(sections().every(Boolean)).toBe(true)
    const note = document.querySelector('[data-element="fallback-note"]')!
    expect(note).toHaveTextContent(copy.explainer.figuresUnavailableNote)
    expect(note.querySelector('svg, button')).toBeNull()
    expect(note.className).not.toMatch(/danger|error|warning/)
    expect(screen.queryByRole('button')).toBeNull()

    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/\$/)
    for (const plan of [...figures.ladder, figures.host]) {
      expect(text).toContain(plan.name)
      expect(text).not.toContain(fmt.credits(plan.monthlyCredits))
    }
    expect(text).toContain(copy.explainer.s5.maxX2FigureFree)
    expect(text).toContain(copy.explainer.s5.topUpFigureFree)
    expect(text).toContain(copy.explainer.s5.largerFromFigureFree)
    expect(text).toContain(copy.explainer.s2.categoriesFigureFree)
  })

  it('explains the lane factors in words, in both states', () => {
    for (const state of ['figures', 'figure-free'] as const) {
      renderPage(state)
      expect(
        document.querySelector('[data-element="lane-factor-pair"]'),
      ).toHaveTextContent(copy.explainer.s3.laneFactors)
      document.body.innerHTML = ''
    }
  })

  it("names Host's three accounts and no other account count", () => {
    renderPage('figures')
    const rows = document.querySelectorAll(
      '[data-element="host-accounts-rows"] li',
    )
    expect(rows).toHaveLength(3)
    expect(copy.explainer.s6.accounts.map((a) => a.use)).toEqual([
      'CI runners',
      'Agent runs',
      'Shared by indexing and hosted agents',
    ])
  })

  it('keeps per-user wording to the seats sentence, and no Enterprise or contact-sales wording', () => {
    renderPage('figures')
    const text = document.body.textContent ?? ''
    expect(text.split('per user')).toHaveLength(2)
    expect(copy.explainer.s7.furtherSeats).toContain('per user')
    expect(text).not.toMatch(/enterprise|contact sales|top-up only/i)
  })

  it('links the security and SSO question to a mail address', () => {
    renderPage('figures')
    const link = within(document.getElementById('s10')!).getByRole('link')
    expect(link.getAttribute('href')).toMatch(/^mailto:/)
  })

  it('renders a German catalogue without falling back to English', async () => {
    const de = await getCopy('de')
    render(
      <ExplainerPage
        copy={de.explainer}
        locale="de"
        figures={figures}
        categories={null}
      />,
      { locale: 'de', messages: de },
    )
    expect(
      screen.getByRole('heading', { level: 1, name: de.explainer.headline }),
    ).toBeInTheDocument()
    expect(de.explainer.s1.title).not.toBe(copy.explainer.s1.title)
  })
})

describe('the explainer route', () => {
  it.each(LOCALES)(
    'carries its own canonical and every alternate in %s',
    async (locale) => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale }),
      })
      const messages = await getCopy(locale)
      expect(metadata.title).toBe(messages.explainer.metaTitle)
      expect(metadata.description).toBe(messages.explainer.metaDescription)
      expect(metadata.alternates?.canonical).toBe(
        siteUrl(localizedPath(locale, HOW_THE_CALCULATION_WORKS)),
      )
      const languages = metadata.alternates?.languages as Record<string, string>
      expect(Object.keys(languages)).toHaveLength(LOCALES.length + 1)
    },
  )

  it('has one sitemap entry per locale, each with its language alternates', () => {
    const entries = siteSitemapEntries().filter((e) =>
      e.url.endsWith(HOW_THE_CALCULATION_WORKS),
    )
    expect(entries).toHaveLength(LOCALES.length)
    for (const entry of entries) {
      expect(Object.keys(entry.alternates?.languages ?? {})).toHaveLength(
        LOCALES.length + 1,
      )
    }
  })

  it('is in the routes table and out of the header and footer', () => {
    expect(SITE_ROUTES.map((r) => r.pattern)).toContain(
      HOW_THE_CALCULATION_WORKS,
    )
    expect(SITE_PATHS).not.toContain(HOW_THE_CALCULATION_WORKS)
  })
})

describe('readExplainerCategories', () => {
  const ORIGIN = 'https://ai.example'
  const body = {
    version: 2,
    categories: CATEGORIES.map((key) => ({ key, models: [{ id: 'm' }] })),
    cadences: ['monthly', 'annual'],
    defaultCadence: 'monthly',
  }
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  it("returns the engine's category keys, in its order", async () => {
    const fetcher = vi.fn(async () => json(body))
    expect(await readExplainerCategories(fetcher, { origin: ORIGIN })).toEqual(
      CATEGORIES,
    )
    expect(fetcher).toHaveBeenCalledWith(
      `${ORIGIN}${CATEGORIES_PATH}`,
      expect.anything(),
    )
  })

  it.each([
    ['no origin', async () => json(body), null],
    ['a non-OK answer', async () => json(body, 503), ORIGIN],
    ['an unknown version', async () => json({ ...body, version: 99 }), ORIGIN],
    ['no category', async () => json({ ...body, categories: [] }), ORIGIN],
    [
      'a thrown fetch',
      async () => {
        throw new TypeError('fetch failed')
      },
      ORIGIN,
    ],
  ])('returns null for %s', async (_, fetcher, origin) => {
    expect(
      await readExplainerCategories(fetcher as typeof fetch, { origin }),
    ).toBeNull()
  })

  it('returns null when the read outlasts its timeout', async () => {
    const hanging = (() => new Promise(() => {})) as typeof fetch
    expect(
      await readExplainerCategories(hanging, { origin: ORIGIN, timeoutMs: 10 }),
    ).toBeNull()
  })
})
