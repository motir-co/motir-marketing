import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@/tests/helpers/withCopy'
import { PriceCard } from '@/app/_components/price/PriceCard'
import { englishCopy, format, getCopy } from '@/lib/copy'
import { LOCALE_BCP47, type Locale } from '@/i18n/routing'
import { PLANS_SIGN_UP } from '@/lib/destinations'
import {
  annualSaving,
  PLAN_LADDER_PATH,
  PLAN_LADDER_REVALIDATE_S,
  parsePlanLadder,
  planLadderRevalidate,
  readPlanLadder,
  type LadderPlan,
  type PlanLadder,
} from '@/lib/priceLadder'
import { TRACKER_SEAT_FEE_USD_PER_MONTH } from '@/lib/seatFee'
import recorded from '@/tests/fixtures/price/plans.json'

/*
 * The price card (MOTIR-8382 · MOTIR-9684). Every expected figure is read from
 * the recorded ladder response (`tests/fixtures/price/plans.json`) — the one
 * literal amount allowed is the seat fee, which is not a ladder figure.
 */

const refresh = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({
  usePathname: () => '/price',
  useRouter: () => ({ refresh }),
}))

const copy = englishCopy.pricePage.plans
const ladder = parsePlanLadder(recorded) as PlanLadder
const n = (v: number) => new Intl.NumberFormat('en-US').format(v)

type Priced = { priceUsdByCadence: { monthly?: number; annual?: number } }

/**
 * The badge a ladder should carry, worked out here from the fixture's prices on
 * their own: each two-cadence plan's saving, rounded down to a whole percent.
 */
function savingBadgeOf(
  plans: readonly Priced[],
  locale: Locale = 'en',
  words = copy,
): string {
  const percents = plans.flatMap(
    ({ priceUsdByCadence: { monthly, annual } }) =>
      monthly && annual !== undefined && annual < monthly * 12
        ? [Math.floor(((monthly * 12 - annual) * 100) / (monthly * 12))]
        : [],
  )
  const pct = new Intl.NumberFormat(LOCALE_BCP47[locale], {
    style: 'percent',
    maximumFractionDigits: 0,
  })
  const low = Math.min(...percents) / 100
  const high = Math.max(...percents) / 100
  return format(words.saveBadge, {
    pct: low === high ? pct.format(low) : pct.formatRange(low, high),
  })
}

/** The recorded ladder with every plan's annual price re-set by `annual(monthly)`. */
function repriced(annual: (monthly: number, i: number) => number): PlanLadder {
  return {
    ...ladder,
    plans: ladder.plans.map((plan, i) => ({
      ...plan,
      priceUsdByCadence: {
        ...plan.priceUsdByCadence,
        annual: annual(plan.priceUsdByCadence.monthly!, i),
      },
    })),
  }
}

async function showAnnual() {
  await userEvent
    .setup()
    .click(screen.getByRole('button', { name: copy.annual }))
}

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })

describe('parsePlanLadder', () => {
  it('reads the recorded response: the ladder in order and the top-up', () => {
    expect(ladder.kind).toBe('ladder')
    expect(ladder.plans.map((p) => p.key)).toEqual(
      recorded.plans.map((p) => p.key),
    )
    expect(ladder.topUp).toEqual(recorded.topUp)
  })

  it.each([
    ['an unknown version', { ...recorded, version: 2 }],
    ['no plans', { ...recorded, plans: [] }],
    ['no top-up', { ...recorded, topUp: undefined }],
    [
      'a plan with no price',
      { ...recorded, plans: [{ ...recorded.plans[0], priceUsdByCadence: {} }] },
    ],
    [
      'a negative price',
      {
        ...recorded,
        plans: [{ ...recorded.plans[0], priceUsdByCadence: { monthly: -1 } }],
      },
    ],
    [
      'a problem body',
      { code: 'internal_error', detail: 'calculator_unavailable: catalog' },
    ],
    ['null', null],
    ['larger plans that are not a list', { ...recorded, largerPlans: {} }],
    [
      'a larger plan with no price',
      {
        ...recorded,
        largerPlans: [{ ...recorded.largerPlans[0], priceUsdByCadence: {} }],
      },
    ],
  ])('answers unavailable for %s — never a partial ladder', (_, body) => {
    expect(parsePlanLadder(body)).toEqual({ kind: 'unavailable' })
  })
})

describe('parsePlanLadder — the larger pool plans', () => {
  it('reads them apart from the ladder, and an answer without them as none', () => {
    expect(ladder.largerPlans.map((p) => p.key)).toEqual(
      recorded.largerPlans.map((p) => p.key),
    )
    const without = parsePlanLadder({ ...recorded, largerPlans: undefined })
    expect(without).toMatchObject({ kind: 'ladder', largerPlans: [] })
  })
})

describe('readPlanLadder', () => {
  it('fetches the public ladder with the revalidate window', async () => {
    const fetcher = vi.fn(async () => jsonResponse(recorded))
    const read = await readPlanLadder(fetcher, 'https://ai.example')
    expect(read.kind).toBe('ladder')
    expect(fetcher).toHaveBeenCalledWith(
      `https://ai.example${PLAN_LADDER_PATH}`,
      expect.objectContaining({
        next: { revalidate: PLAN_LADDER_REVALIDATE_S },
      }),
    )
  })

  it.each([
    ['no origin', null, async () => jsonResponse(recorded)],
    [
      'a 500 problem',
      'https://ai.example',
      async () =>
        new Response('{}', {
          status: 500,
          headers: { 'content-type': 'application/problem+json' },
        }),
    ],
    [
      'a 429',
      'https://ai.example',
      async () => jsonResponse({}, { status: 429 }),
    ],
    [
      'a network error',
      'https://ai.example',
      async () => {
        throw new TypeError('fetch failed')
      },
    ],
  ])('fails closed on %s', async (_, origin, fetcher) => {
    expect(await readPlanLadder(fetcher as typeof fetch, origin)).toEqual({
      kind: 'unavailable',
    })
  })

  it('takes the lane override for the revalidate window, and only a whole count', () => {
    expect(planLadderRevalidate(undefined)).toBe(PLAN_LADDER_REVALIDATE_S)
    expect(planLadderRevalidate('0')).toBe(0)
    expect(planLadderRevalidate('-3')).toBe(PLAN_LADDER_REVALIDATE_S)
    expect(planLadderRevalidate('soon')).toBe(PLAN_LADDER_REVALIDATE_S)
  })
})

const cards = () =>
  within(screen.getByRole('list', { name: englishCopy.pricePage.plansLabel }))
    .getAllByRole('listitem')
    .filter((li) => li.parentElement?.getAttribute('role') === 'list')

describe('the price card', () => {
  it('draws one card per ladder plan, in order, with its pool and both cadence prices', () => {
    render(<PriceCard ladder={ladder} />)
    expect(cards()).toHaveLength(recorded.plans.length)
    recorded.plans.forEach((plan, i) => {
      const card = within(cards()[i])
      expect(card.getByRole('heading', { level: 3 })).toHaveTextContent(
        plan.name,
      )
      expect(
        card.getByText(
          format(copy.creditsAllotment, { n: n(plan.monthlyCredits) }),
        ),
      ).toBeInTheDocument()
      const { monthly, annual } = plan.priceUsdByCadence
      // Both blocks are in the markup; the toggle only chooses which shows.
      expect(
        card.getByText(
          format(copy.monthlySub, {
            yr: n(monthly * 12),
            n: n(monthly * 12 - annual),
          }),
        ),
      ).toBeInTheDocument()
      expect(
        card.getByText(format(copy.annualSub, { yr: n(annual) })),
      ).toBeInTheDocument()
      expect(
        card.getByText('+ 1 Motir seat · work items uncapped'),
      ).toBeInTheDocument()
    })
  })

  it('draws no larger pool plan as a card, and no Enterprise or contact-sales', () => {
    render(<PriceCard ladder={parsePlanLadder(recorded) as PlanLadder} />)
    for (const pool of recorded.largerPlans) {
      expect(screen.queryByText(pool.name)).toBeNull()
    }
    expect(screen.queryByText(/enterprise|contact sales/i)).toBeNull()
  })

  it('marks the recommended plan and gives only it the primary button', () => {
    render(<PriceCard ladder={ladder} />)
    const pro = cards().find((c) => c.querySelector('[data-plan="pro"]'))!
    expect(within(pro).getByText(copy.recommended)).toBeInTheDocument()
    const upgrade = within(pro).getByRole('link', {
      name: format(copy.ctaUpgrade, { plan: 'Pro' }),
    })
    expect(upgrade).toHaveAttribute('href', PLANS_SIGN_UP)
    expect(screen.getAllByText(copy.recommended)).toHaveLength(1)
    const first = recorded.plans[0]
    expect(
      within(cards()[0]).getByRole('link', {
        name: format(copy.ctaChoose, { plan: first.name }),
      }),
    ).toHaveAttribute('href', PLANS_SIGN_UP)
  })

  it('says Everything in the rung below', () => {
    render(<PriceCard ladder={ladder} />)
    const [a] = recorded.plans
    expect(screen.queryByText(/same price per credit/i)).toBeNull()
    expect(
      within(cards()[1]).getByText(format(copy.everythingIn, { prev: a.name })),
    ).toBeInTheDocument()
  })

  it('follows the ladder — a renamed, repriced plan renders with no code edit', () => {
    const changed = parsePlanLadder({
      ...recorded,
      plans: recorded.plans.map((p, i) =>
        i === 0
          ? {
              ...p,
              name: 'Renamed',
              monthlyCredits: 7000,
              priceUsdByCadence: { annual: 333, monthly: 44 },
            }
          : p,
      ),
    }) as PlanLadder
    render(<PriceCard ladder={changed} />)
    const card = within(cards()[0])
    expect(card.getByRole('heading', { level: 3 })).toHaveTextContent('Renamed')
    expect(
      card.getByText(format(copy.creditsAllotment, { n: n(7000) })),
    ).toBeInTheDocument()
    expect(
      card.getByText(format(copy.annualSub, { yr: n(333) })),
    ).toBeInTheDocument()
  })

  it('shows a one-cadence plan on that cadence whatever the toggle says', () => {
    const oneCadence = parsePlanLadder({
      ...recorded,
      plans: [{ ...recorded.plans[0], priceUsdByCadence: { monthly: 25 } }],
    }) as PlanLadder
    render(<PriceCard ladder={oneCadence} />)
    const block = document.querySelector('[data-price="monthly"]')!
    expect(block.className).not.toContain(
      'group-data-[cadence=annual]/cadence:hidden',
    )
    expect(document.querySelector('[data-price="annual"]')).toBeNull()
  })

  it('names the largest plan in Need more credits, links the calculator, and states the top-up rate', () => {
    render(<PriceCard ladder={ladder} />)
    const largest = recorded.plans[recorded.plans.length - 1]
    expect(
      screen.getByText(
        format(copy.needMoreBody, {
          plan: largest.name,
          credits: n(largest.monthlyCredits),
        }),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: copy.needMoreAction }),
    ).toHaveAttribute('href', '#calculator')
    expect(
      screen.getByText(
        format(copy.topupRate, {
          unit: n(recorded.topUp.unitAmountUsd),
          credits: n(recorded.topUp.unitCredits),
        }),
      ),
    ).toBeInTheDocument()
  })

  it('switches cadence with the toggle, and shows the saving badge only on Annual', async () => {
    const user = userEvent.setup()
    const { container } = render(<PriceCard ladder={ladder} />)
    const wrapper = container.querySelector('[data-cadence]')!
    const badge = savingBadgeOf(recorded.plans)
    expect(wrapper).toHaveAttribute('data-cadence', 'monthly')
    expect(screen.queryByText(badge)).toBeNull()
    expect(
      screen.getByRole('group', { name: copy.cadenceLabel }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: copy.annual }))
    expect(wrapper).toHaveAttribute('data-cadence', 'annual')
    expect(screen.getByText(badge)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: copy.monthly }))
    expect(wrapper).toHaveAttribute('data-cadence', 'monthly')
  })

  describe('the Annual saving badge follows the ladder (MOTIR-10156)', () => {
    it('moves with a re-price: a new saving replaces the recorded one', async () => {
      const cheaper = repriced((monthly) => monthly * 12 * 0.8)
      render(<PriceCard ladder={cheaper} />)
      await showAnnual()
      expect(savingBadgeOf(cheaper.plans)).not.toBe(
        savingBadgeOf(recorded.plans),
      )
      expect(screen.getByText(savingBadgeOf(cheaper.plans))).toBeInTheDocument()
      expect(screen.queryByText(savingBadgeOf(recorded.plans))).toBeNull()
    })

    it('states the range when the cards save different shares', async () => {
      // The first plan saves a tenth, every other one a quarter.
      const mixed = repriced(
        (monthly, i) => monthly * 12 * (i === 0 ? 0.9 : 0.75),
      )
      render(<PriceCard ladder={mixed} />)
      await showAnnual()
      const badge = savingBadgeOf(mixed.plans)
      expect(badge).toBe(
        format(copy.saveBadge, {
          pct: new Intl.NumberFormat('en', {
            style: 'percent',
            maximumFractionDigits: 0,
          }).formatRange(0.1, 0.25),
        }),
      )
      expect(screen.getByText(badge)).toBeInTheDocument()
    })

    it('shows no badge when no card saves anything on Annual', async () => {
      const noSaving = repriced((monthly) => monthly * 12)
      const { container } = render(<PriceCard ladder={noSaving} />)
      await showAnnual()
      expect(container.querySelector('[data-cadence]')).toHaveAttribute(
        'data-cadence',
        'annual',
      )
      expect(screen.queryByText(/%/)).toBeNull()
    })

    it.each(['de', 'fr', 'ja'] as const)(
      'is worded and formatted for %s',
      async (locale) => {
        const messages = await getCopy(locale)
        render(<PriceCard ladder={ladder} />, { locale, messages })
        await userEvent.setup().click(
          screen.getByRole('button', {
            name: messages.pricePage.plans.annual,
          }),
        )
        expect(
          screen.getByText(
            // `getByText` collapses the no-break space a locale puts before `%`.
            savingBadgeOf(
              recorded.plans,
              locale,
              messages.pricePage.plans,
            ).replace(/\s+/g, ' '),
          ),
        ).toBeInTheDocument()
      },
    )
  })

  it('states the seat block, per-organisation and invoice lines', () => {
    render(<PriceCard ladder={ladder} />)
    expect(
      screen.getByText(/Every AI plan includes 1 Motir seat at no charge\./),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        format(copy.seatFee, { price: String(TRACKER_SEAT_FEE_USD_PER_MONTH) }),
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(copy.perOrg)).toBeInTheDocument()
    expect(screen.getByText(copy.invoice)).toBeInTheDocument()
  })
})

describe('the price card when the ladder cannot be read', () => {
  it('shows the unavailable state with no plan figure, and keeps the seat lines', async () => {
    const user = userEvent.setup()
    render(<PriceCard ladder={{ kind: 'unavailable' }} />)
    expect(screen.getByRole('alert')).toHaveTextContent(copy.unavailableTitle)
    expect(
      screen.queryByRole('list', { name: englishCopy.pricePage.plansLabel }),
    ).toBeNull()
    expect(screen.queryByRole('group', { name: copy.cadenceLabel })).toBeNull()
    for (const plan of recorded.plans) {
      expect(screen.queryByText(plan.name)).toBeNull()
    }
    expect(screen.queryByText(/credits \/ mo/)).toBeNull()
    expect(screen.getByText(copy.perOrg)).toBeInTheDocument()
    expect(
      screen.getByText(
        format(copy.seatFee, { price: String(TRACKER_SEAT_FEE_USD_PER_MONTH) }),
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: copy.retry }))
    expect(refresh).toHaveBeenCalled()
  })
})

describe('annualSaving', () => {
  const plan = (monthly?: number, annual?: number): LadderPlan => ({
    key: 'k',
    name: 'K',
    monthlyCredits: 1,
    priceUsdByCadence: {
      ...(monthly !== undefined ? { monthly } : {}),
      ...(annual !== undefined ? { annual } : {}),
    },
  })

  it('is the smallest and largest whole-percent saving across the two-cadence plans', () => {
    expect(annualSaving(ladder.plans)).toEqual({
      low: Math.floor(savingPercent(recorded.plans[0]!)) / 100,
      high: Math.floor(savingPercent(recorded.plans[0]!)) / 100,
    })
    expect(annualSaving([plan(10, 90), plan(10, 108)])).toEqual({
      low: 0.1,
      high: 0.25,
    })
  })

  it('never rounds a saving up, and keeps an exact one exact', () => {
    // 1 − 801/1200 = 33.25%: stated as 33%, never 34%.
    expect(annualSaving([plan(100, 801)])).toEqual({ low: 0.33, high: 0.33 })
    // 1 − 852/1200 = 29% exactly, which floating point reads as 28.999…
    expect(annualSaving([plan(100, 852)])).toEqual({ low: 0.29, high: 0.29 })
  })

  it('leaves out a plan on one cadence, a free one, and one annual does not save on', () => {
    expect(
      annualSaving([plan(undefined, 240), plan(10), plan(0, 0), plan(10, 120)]),
    ).toBeNull()
    expect(annualSaving([plan(10, 130), plan(10, 90)])).toEqual({
      low: 0.25,
      high: 0.25,
    })
    // A saving under one whole percent states nothing rather than 0%.
    expect(annualSaving([plan(100, 1199)])).toBeNull()
    expect(annualSaving([])).toBeNull()
  })
})

function savingPercent(p: Priced): number {
  const { monthly, annual } = p.priceUsdByCadence
  return ((monthly! * 12 - annual!) * 100) / (monthly! * 12)
}
