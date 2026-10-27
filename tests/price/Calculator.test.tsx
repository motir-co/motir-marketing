import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/tests/helpers/withCopy'
import { Calculator } from '@/app/_components/price/Calculator'
import { categoryLabel } from '@/app/_components/price/calculatorOutput'
import { englishCopy, format } from '@/lib/copy'
import categories from '@/tests/fixtures/calculator/categories.json'
import emptyFrontier from '@/tests/fixtures/calculator/categories-empty-frontier.json'
import pro from '@/tests/fixtures/calculator/estimate-pro.json'
import proTwo from '@/tests/fixtures/calculator/estimate-pro-two.json'
import maxX2 from '@/tests/fixtures/calculator/estimate-maxx2-topup.json'
import larger from '@/tests/fixtures/calculator/estimate-larger.json'
import emptyCategory from '@/tests/fixtures/calculator/estimate-empty-category.json'
import rangeOrder from '@/tests/fixtures/calculator/problem-range-order.json'
import stale from '@/tests/fixtures/calculator/problem-stale-category.json'

/*
 * The calculator island (MOTIR-8382 · MOTIR-9685) against recorded engine
 * answers. Every expected figure is read from the fixture the engine "sent".
 */

vi.mock('@/lib/aiOrigin', () => ({ AI_ORIGIN: 'https://ai.example' }))
vi.mock('next/navigation', () => ({ usePathname: () => '/price' }))

const words = englishCopy.pricePage.calculator
const plans = englishCopy.pricePage.plans
const n = (v: number) => new Intl.NumberFormat('en-US').format(v)

type Route = (url: string, init?: RequestInit) => Promise<Response> | Response
let estimate: Route
let categoriesRoute: Route
const bodies: unknown[] = []

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type':
        status === 200 ? 'application/json' : 'application/problem+json',
    },
  })

beforeEach(() => {
  bodies.length = 0
  categoriesRoute = () => json(categories)
  estimate = () => json(pro)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/v1/public/calculator/categories'))
        return categoriesRoute(url, init)
      bodies.push(JSON.parse(init!.body as string))
      return estimate(url, init)
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function setUp() {
  const user = userEvent.setup()
  render(<Calculator />)
  await screen.findByRole('checkbox', { name: /^Balanced,/ })
  return user
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  planned: [string, string],
  run?: [string, string],
) {
  const [plannedSet, runSet] = screen
    .getAllByRole('group')
    .filter((g) => g.tagName === 'FIELDSET')
  const lows = [plannedSet!, runSet!].map((set) =>
    within(set).getByLabelText(words.lowLabel),
  )
  const highs = [plannedSet!, runSet!].map((set) =>
    within(set).getByLabelText(words.highLabel),
  )
  await user.clear(lows[0]!)
  if (planned[0]) await user.type(lows[0]!, planned[0])
  await user.clear(highs[0]!)
  if (planned[1]) await user.type(highs[0]!, planned[1])
  if (run) {
    await user.clear(lows[1]!)
    if (run[0]) await user.type(lows[1]!, run[0])
    await user.clear(highs[1]!)
    if (run[1]) await user.type(highs[1]!, run[1])
  }
}

const pick = (user: ReturnType<typeof userEvent.setup>, key: string) =>
  user.click(
    screen.getByRole('checkbox', {
      name: new RegExp(`^${categoryLabel(key)},`),
    }),
  )
const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: words.submit }))
const output = () =>
  screen.getByText((_, el) => el?.getAttribute('aria-live') === 'polite')

describe('the calculator, before any ask', () => {
  it('lists the categories with their example models, and the idle line', async () => {
    await setUp()
    for (const c of categories.categories) {
      expect(
        screen.getByRole('checkbox', {
          name: new RegExp(`^${categoryLabel(c.key)},`),
        }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          format(words.categoryExamples, {
            models: c.models.map((m) => m.id).join(', '),
          }),
        ),
      ).toBeInTheDocument()
    }
    expect(within(output()).getByText(words.idle)).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: plans.cadenceLabel }),
    ).toBeInTheDocument()
  })
})

describe('an ordinary plan', () => {
  it('shows what was priced, the credit range and the plan by its returned name — no See-Host', async () => {
    const user = await setUp()
    await fill(user, ['20', '40'], ['10', '20'])
    await pick(user, 'balanced')
    await submit(user)
    const out = await screen.findByTestId('calculator-estimate')
    expect(within(out).getByTestId('calculator-credits')).toHaveTextContent(
      `${n(pro.credits.low)} – ${n(pro.credits.high)}`,
    )
    expect(within(out).getByTestId('calculator-plan')).toHaveTextContent(
      pro.recommendation.planName,
    )
    expect(within(out).queryByTestId('calculator-see-host')).toBeNull()
    expect(within(out).queryByTestId('calculator-larger')).toBeNull()
    expect(
      within(out).getByRole('link', { name: words.goToPlan }),
    ).toHaveAttribute('href', `#plan-${pro.recommendation.planKey}`)
    expect(bodies[0]).toEqual({
      plannedPerMonth: pro.plannedPerMonth,
      runPerMonth: pro.runPerMonth,
      categories: ['balanced'],
      cadence: categories.defaultCadence,
    })
  })

  it('follows each answer as the picks change, sending only ranges, categories and cadence', async () => {
    const user = await setUp()
    await fill(user, ['20', '40'], ['10', '20'])
    await pick(user, 'economy')
    await pick(user, 'balanced')
    estimate = () => json(proTwo)
    await submit(user)
    expect(await screen.findByTestId('calculator-credits')).toHaveTextContent(
      `${n(proTwo.credits.low)} – ${n(proTwo.credits.high)}`,
    )
    expect(Object.keys(bodies[0] as object).sort()).toEqual([
      'cadence',
      'categories',
      'plannedPerMonth',
      'runPerMonth',
    ])
    expect((bodies[0] as { categories: string[] }).categories).toEqual([
      'economy',
      'balanced',
    ])
  })
})

describe('the See-Host line', () => {
  it('shows on Max ×2 with a top-up, with no digit, pointing at the Host card', async () => {
    const user = await setUp()
    estimate = () => json(maxX2)
    await fill(user, ['200', '300'], ['120', '160'])
    await pick(user, 'balanced')
    await submit(user)
    const out = await screen.findByTestId('calculator-estimate')
    expect(within(out).getByTestId('calculator-plan')).toHaveTextContent(
      maxX2.recommendation.planName,
    )
    expect(within(out).getByTestId('calculator-topup')).toHaveTextContent(
      format(words.bundleCredits, { n: n(maxX2.topUp.high.credits) }),
    )
    const seeHost = within(out).getByTestId('calculator-see-host')
    expect(seeHost.textContent).not.toMatch(/\d/)
    expect(within(seeHost).getByRole('link')).toHaveAttribute(
      'href',
      '#plan-host',
    )
  })

  it('shows on a larger pool, with its returned name, pool, price and own-accounts line', async () => {
    const user = await setUp()
    estimate = () => json(larger)
    await fill(user, ['2000', '3000'], ['1500', '2500'])
    await pick(user, 'frontier')
    await submit(user)
    const out = await screen.findByTestId('calculator-estimate')
    const pool = within(out).getByTestId('calculator-larger')
    expect(pool).toHaveTextContent(larger.recommendation.planName)
    expect(pool).toHaveTextContent(
      format(plans.creditsAllotment, {
        n: n(larger.recommendation.poolCredits),
      }),
    )
    expect(pool).toHaveTextContent(
      format(plans.perMoEquiv, { n: n(larger.recommendation.monthlyPriceUsd) }),
    )
    expect(within(out).getByText(words.ownAccounts)).toBeInTheDocument()
    expect(within(out).getByTestId('calculator-see-host')).toBeInTheDocument()
    expect(within(out).queryByTestId('calculator-plan')).toBeNull()
  })
})

describe('the non-happy states — each with its message and no number', () => {
  it.each([
    ['a reversed range', ['40', '20'], words.errors.rangeOrder],
    ['an empty range', ['', '20'], words.errors.rangeEmpty],
    ['a negative number', ['-5', '20'], words.errors.rangeInvalid],
  ] as const)(
    '%s is refused beside the field, before any request',
    async (_, planned, message) => {
      const user = await setUp()
      await fill(user, planned as [string, string], ['1', '2'])
      await pick(user, 'balanced')
      await submit(user)
      const high = screen.getAllByLabelText(words.highLabel)[0]!
      expect(high).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByText(message)).toBeInTheDocument()
      expect(bodies).toHaveLength(0)
      expect(screen.queryByTestId('calculator-credits')).toBeNull()
    },
  )

  it('places the engine’s own refusal on its field', async () => {
    const user = await setUp()
    estimate = () => json(rangeOrder, 400)
    await fill(user, ['20', '40'], ['1', '2'])
    await pick(user, 'balanced')
    await submit(user)
    expect(await screen.findByText(words.errors.rangeOrder)).toBeInTheDocument()
    expect(screen.queryByTestId('calculator-credits')).toBeNull()
  })

  it('shows an empty category’s message, unpicks it and makes it unpickable', async () => {
    const user = await setUp()
    estimate = () => json(emptyCategory)
    await fill(user, ['20', '40'], ['1', '2'])
    await pick(user, 'frontier')
    await submit(user)
    await waitFor(() =>
      expect(
        within(output()).getByText(words.categoryEmpty),
      ).toBeInTheDocument(),
    )
    const box = screen.getByRole('checkbox', { name: /^Frontier,/ })
    expect(box).toHaveAttribute('aria-checked', 'false')
    expect(box).toHaveAttribute('aria-disabled', 'true')
    expect(output().textContent).not.toMatch(/\d/)
  })

  it('drops a category retired from the list, and says so', async () => {
    const user = await setUp()
    await fill(user, ['20', '40'], ['1', '2'])
    await pick(user, 'frontier')
    estimate = () => json(stale, 400)
    categoriesRoute = () => json(emptyFrontier)
    await submit(user)
    expect(
      await screen.findByText(
        format(words.retired, { category: categoryLabel('frontier') }),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: /^Frontier,/ }),
    ).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByTestId('calculator-credits')).toBeNull()
  })

  it.each([
    ['a blocked request', () => Promise.reject(new TypeError('blocked'))],
    ['an unknown version', () => json({ ...pro, version: 99 })],
  ])('shows the unavailable message on %s', async (_, route) => {
    const user = await setUp()
    estimate = route as Route
    await fill(user, ['20', '40'], ['1', '2'])
    await pick(user, 'balanced')
    await submit(user)
    expect(
      await screen.findByText(words.errors.unavailable),
    ).toBeInTheDocument()
    expect(output().textContent).not.toMatch(/\d/)
  })

  it('offers a retry when the categories cannot be read', async () => {
    categoriesRoute = () => json({}, 500)
    const user = userEvent.setup()
    render(<Calculator />)
    expect(await screen.findByText(words.categoriesFailed)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: words.submit })).toBeDisabled()
    categoriesRoute = () => json(categories)
    await user.click(screen.getByRole('button', { name: words.retry }))
    expect(
      await screen.findByRole('checkbox', { name: /^Balanced,/ }),
    ).toBeInTheDocument()
  })
})

describe('in flight', () => {
  it('never shows the previous number as current, and an older answer never lands', async () => {
    const user = await setUp()
    await fill(user, ['20', '40'], ['1', '2'])
    await pick(user, 'balanced')
    await submit(user)
    await screen.findByTestId('calculator-credits')

    let releaseOld: (r: Response) => void = () => {}
    estimate = () => new Promise<Response>((resolve) => (releaseOld = resolve))
    await submit(user)
    expect(within(output()).getByText(words.loading)).toBeInTheDocument()
    expect(screen.queryByTestId('calculator-credits')).toBeNull()
    expect(screen.getByRole('button', { name: words.submit })).toHaveAttribute(
      'aria-busy',
      'true',
    )

    estimate = () => json(proTwo)
    await submit(user)
    expect(await screen.findByTestId('calculator-credits')).toHaveTextContent(
      `${n(proTwo.credits.low)} – ${n(proTwo.credits.high)}`,
    )
    await act(async () => releaseOld(json(pro)))
    expect(screen.getByTestId('calculator-credits')).toHaveTextContent(
      `${n(proTwo.credits.low)} – ${n(proTwo.credits.high)}`,
    )
  })
})
