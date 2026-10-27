import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@/tests/helpers/withCopy'
import { PricePage } from '@/app/_components/PricePage'
import { PriceCard } from '@/app/_components/price/PriceCard'
import { Calculator } from '@/app/_components/price/Calculator'
import { LOCALES, type Locale } from '@/i18n/routing'
import { format, getCopy, type Copy } from '@/lib/copy'
import { PLAN_LADDER_PATH, readPlanLadder } from '@/lib/priceLadder'
import { TRACKER_SEAT_FEE_USD_PER_MONTH } from '@/lib/seatFee'
import ladderA from '@/tests/fixtures/price/plans.json'
import ladderB from '@/tests/fixtures/price/plans-b.json'
import unknownVersion from '@/tests/fixtures/price/plans-unknown-version.json'
import missingVersion from '@/tests/fixtures/price/plans-missing-version.json'
import categories from '@/tests/fixtures/calculator/categories.json'
import pro from '@/tests/fixtures/calculator/estimate-pro.json'
import proTwo from '@/tests/fixtures/calculator/estimate-pro-two.json'
import maxX2 from '@/tests/fixtures/calculator/estimate-maxx2-topup.json'
import larger from '@/tests/fixtures/calculator/estimate-larger.json'
import emptyCategory from '@/tests/fixtures/calculator/estimate-empty-category.json'
import rangeOrder from '@/tests/fixtures/calculator/problem-range-order.json'
import stale from '@/tests/fixtures/calculator/problem-stale-category.json'
import emptyFrontier from '@/tests/fixtures/calculator/categories-empty-frontier.json'
import calcUnavailable from '@/tests/fixtures/calculator/problem-unavailable.json'
import { FORBIDDEN_TERMS } from './wordingTerms'

/*
 * THE ASSEMBLED /price PAGE (MOTIR-8382 · MOTIR-9687): the price card and the
 * calculator mounted together over TWO separate recorded reads, with `fetch`
 * routed by path so either can fail alone. Every expected figure is read from
 * the recorded response; the only literal amount is the seat-fee constant.
 */

const ORIGIN = 'https://ai.example'
vi.mock('@/lib/aiOrigin', () => ({ AI_ORIGIN: 'https://ai.example' }))
const refresh = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({
  usePathname: () => '/price',
  useRouter: () => ({ refresh }),
}))

type Reply = () => Response | Promise<Response>
interface Captured {
  url: string
  method: string
  body: unknown
}
let ladderReply: Reply
let categoriesReply: Reply
let estimateReply: Reply
let captured: Captured[]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type':
        status < 400 ? 'application/json' : 'application/problem+json',
    },
  })
const down: Reply = () => Promise.reject(new TypeError('blocked'))

const fetchStub = vi.fn(async (input: string, init?: RequestInit) => {
  const url = new URL(input)
  captured.push({
    url: input,
    method: init?.method ?? 'GET',
    body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
  })
  if (url.pathname === PLAN_LADDER_PATH) return ladderReply()
  if (url.pathname === '/v1/public/calculator/categories')
    return categoriesReply()
  if (url.pathname === '/v1/public/calculator/estimate') return estimateReply()
  throw new Error(`unrouted ${input}`)
})

beforeEach(() => {
  captured = []
  ladderReply = () => json(ladderA)
  categoriesReply = () => json(categories)
  estimateReply = () => json(pro)
  vi.stubGlobal('fetch', fetchStub)
})
afterEach(() => vi.unstubAllGlobals())

/** The route's composition: the server read, then the page with both sections. */
async function renderPage(locale: Locale = 'en') {
  const messages = await getCopy(locale)
  const ladder = await readPlanLadder(
    fetchStub as unknown as typeof fetch,
    ORIGIN,
  )
  const view = render(
    <PricePage
      plans={<PriceCard ladder={ladder} />}
      calculator={<Calculator />}
    />,
    { locale, messages },
  )
  await screen.findByRole('checkbox', { name: /^Balanced,/ }).catch(() => null)
  return { messages, view }
}

const plansSection = () => document.getElementById('plans') as HTMLElement
const calcSection = () => document.getElementById('calculator') as HTMLElement
const liveRegion = () =>
  calcSection().querySelector('[aria-live="polite"]') as HTMLElement
const numberIn = (locale: Locale) => (v: number) =>
  new Intl.NumberFormat(locale === 'zh-tw' ? 'zh-TW' : locale).format(v)

async function estimateWith(
  user: ReturnType<typeof userEvent.setup>,
  messages: Copy,
  pick = 'balanced',
) {
  const w = messages.pricePage.calculator
  const sets = within(calcSection())
    .getAllByRole('group')
    .filter((g) => g.tagName === 'FIELDSET')
  const [planned, run] = sets
  await user.type(within(planned!).getByLabelText(w.lowLabel), '20')
  await user.type(within(planned!).getByLabelText(w.highLabel), '40')
  await user.clear(within(run!).getByLabelText(w.lowLabel))
  await user.type(within(run!).getByLabelText(w.lowLabel), '10')
  await user.clear(within(run!).getByLabelText(w.highLabel))
  await user.type(within(run!).getByLabelText(w.highLabel), '20')
  const label = pick.charAt(0).toUpperCase() + pick.slice(1)
  await user.click(
    screen.getByRole('checkbox', { name: new RegExp(`^${label},`) }),
  )
  await user.click(
    within(calcSection()).getByRole('button', { name: w.submit }),
  )
}

describe('whole-story wording, in every locale', () => {
  it.each(LOCALES)(
    '%s carries no Enterprise, sales, quantity or no-per-user wording',
    async (locale) => {
      const { messages } = await renderPage(locale)
      const text = (document.body.textContent ?? '').toLowerCase()
      for (const term of FORBIDDEN_TERMS[locale])
        expect(text).not.toContain(term)
      // The seat fee is the one constant, and it reaches the page through it.
      expect(document.body.textContent).toContain(
        format(messages.pricePage.plans.seatFee, {
          price: numberIn(locale)(TRACKER_SEAT_FEE_USD_PER_MONTH),
        }),
      )
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        messages.pricePage.heading,
      )
    },
  )
})

describe('the source holds no figure', () => {
  const FILES = [
    'app/_components/PricePage.tsx',
    'app/_components/price/PriceCard.tsx',
    'app/_components/price/PriceCadence.tsx',
    'app/_components/price/Calculator.tsx',
    'app/_components/price/calculatorApi.ts',
    'app/_components/price/calculatorOutput.tsx',
    'lib/priceLadder.ts',
    'lib/aiOrigin.ts',
  ]
  const strip = (s: string) =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  // Money, a thousands-shaped credit figure, a multiplier word, a model name,
  // and any number bigger than a small UI constant.
  const PATTERNS: [string, RegExp][] = [
    ['money', /\$\s?\d/],
    ['credit figure', /\b\d{1,3}(?:[,_]\d{3})+\b|\b\d{4,}\b/],
    ['multiplier', /\b\d+(?:\.\d+)?\s?[x×]\b/i],
    [
      'model name',
      /\b(?:claude|gpt|gemini|llama|sonnet|opus|haiku|mistral)\b/i,
    ],
  ]
  const offences = (source: string) =>
    PATTERNS.filter(([, re]) => re.test(strip(source))).map(([name]) => name)

  it.each(FILES)('%s', (file) => {
    expect(offences(readFileSync(join(process.cwd(), file), 'utf8'))).toEqual(
      [],
    )
  })

  it('catches a seeded literal (positive control)', () => {
    expect(offences("const PRO_PRICE = '$75'")).toContain('money')
    expect(offences('const POOL = 15000')).toContain('credit figure')
    expect(offences("const MODEL = 'claude-opus'")).toContain('model name')
  })

  it('keeps the only version literals in the two accepted-version constants', () => {
    const versions = FILES.flatMap((file) =>
      [
        ...strip(readFileSync(join(process.cwd(), file), 'utf8')).matchAll(
          /\w*VERSION\s*=\s*\d+/g,
        ),
      ].map((m) => m[0]),
    )
    expect(versions.sort()).toEqual(
      ['KNOWN_VERSION = 2', 'PLAN_LADDER_VERSION = 1'].sort(),
    )
  })

  it('names the seat fee in one place', () => {
    const seat = readFileSync(join(process.cwd(), 'lib/seatFee.ts'), 'utf8')
    expect(strip(seat)).toMatch(/TRACKER_SEAT_FEE_USD_PER_MONTH = \d+/)
  })
})

describe('the card follows the ladder while the engine is down', () => {
  it.each([
    ['ladder A', ladderA],
    ['ladder B', ladderB],
  ])('%s', async (_, ladder) => {
    ladderReply = () => json(ladder)
    categoriesReply = down
    estimateReply = down
    const { messages } = await renderPage()
    const p = messages.pricePage.plans
    const n = numberIn('en')
    const list = within(plansSection()).getByRole('list', {
      name: messages.pricePage.plansLabel,
    })
    const items = [...list.children] as HTMLElement[]
    expect(
      items.map(
        (li) => within(li).getByRole('heading', { level: 3 }).textContent,
      ),
    ).toEqual(ladder.plans.map((plan) => plan.name))
    ladder.plans.forEach((plan, i) => {
      const card = within(items[i]!)
      const prices = plan.priceUsdByCadence as {
        monthly?: number
        annual?: number
      }
      expect(!!items[i]!.querySelector('[data-price="monthly"]')).toBe(
        prices.monthly !== undefined,
      )
      expect(!!items[i]!.querySelector('[data-price="annual"]')).toBe(
        prices.annual !== undefined,
      )
      if (prices.annual !== undefined) {
        expect(
          card.getByText(format(p.annualSub, { yr: n(prices.annual) })),
        ).toBeInTheDocument()
      }
      expect(
        card.getByText('+ 1 Motir seat · work items uncapped'),
      ).toBeInTheDocument()
    })
    for (const pool of ladder.largerPlans)
      expect(screen.queryByText(pool.name)).toBeNull()
    expect(within(plansSection()).getByText(p.perOrg)).toBeInTheDocument()
    expect(within(plansSection()).getByText(p.invoice)).toBeInTheDocument()
    expect(
      within(plansSection()).getByText(
        format(p.topupRate, {
          unit: n(ladder.topUp.unitAmountUsd),
          credits: n(ladder.topUp.unitCredits),
        }),
      ),
    ).toBeInTheDocument()
    expect(
      await within(calcSection()).findByText(
        messages.pricePage.calculator.categoriesFailed,
      ),
    ).toBeInTheDocument()
    expect(liveRegion().textContent).not.toMatch(/\d/)
  })
})

describe('the ladder read fails alone', () => {
  const failures: [string, Reply][] = [
    ['a network error', down],
    ['the calculator-unavailable problem', () => json(calcUnavailable, 500)],
    ['a non-OK status', () => json({}, 503)],
    ['an unknown version', () => json(unknownVersion)],
    ['a missing version', () => json(missingVersion)],
  ]
  for (const locale of ['de', 'ja'] as const) {
    it.each(failures)(
      `${locale}: %s shows plans-unavailable, and the calculator still estimates`,
      async (_, reply) => {
        ladderReply = reply
        const user = userEvent.setup()
        const { messages } = await renderPage(locale)
        const p = messages.pricePage.plans
        expect(within(plansSection()).getByRole('alert')).toHaveTextContent(
          p.unavailableTitle,
        )
        for (const plan of ladderA.plans) {
          expect(within(plansSection()).queryByText(plan.name)).toBeNull()
        }
        expect(plansSection().querySelector('[data-price]')).toBeNull()
        expect(within(plansSection()).getByText(p.perOrg)).toBeInTheDocument()
        expect(within(plansSection()).getByText(p.invoice)).toBeInTheDocument()
        await screen.findByRole('checkbox', { name: /^Balanced,/ })
        await estimateWith(user, messages)
        const credits =
          await within(calcSection()).findByTestId('calculator-credits')
        const n = numberIn(locale)
        expect(credits).toHaveTextContent(
          `${n(pro.credits.low)} – ${n(pro.credits.high)}`,
        )
        expect(within(calcSection()).queryByText(p.unavailableTitle)).toBeNull()
      },
    )
  }
})

describe('the calculator over recorded answers, mounted with the card', () => {
  it.each([
    ['an ordinary plan', pro, false],
    ['the same plan, another answer', proTwo, false],
    ['Max ×2 with a top-up', maxX2, true],
    ['a larger pool', larger, true],
  ] as const)('%s', async (_, answer, seeHost) => {
    estimateReply = () => json(answer)
    const user = userEvent.setup()
    const { messages } = await renderPage()
    await estimateWith(user, messages, answer.split.categories[0]!.key)
    const out = await within(calcSection()).findByTestId('calculator-estimate')
    const n = numberIn('en')
    expect(within(out).getByTestId('calculator-credits')).toHaveTextContent(
      `${n(answer.credits.low)} – ${n(answer.credits.high)}`,
    )
    expect(out).toHaveTextContent(answer.recommendation.planName)
    expect(out.textContent).not.toContain(
      'Host plan above'.replace('above', 'fits'),
    )
    const line = within(out).queryByTestId('calculator-see-host')
    expect(!!line).toBe(seeHost)
    if (line) expect(line.textContent).not.toMatch(/\d/)
    if (answer === larger) {
      expect(out).toHaveTextContent(messages.pricePage.calculator.ownAccounts)
    }
    // Host is never the recommendation.
    expect(
      within(out).queryByTestId('calculator-plan')?.textContent ?? '',
    ).not.toMatch(/\bHost\b/)
  })
})

describe('the requests the page makes', () => {
  it('reads the ladder once with a GET, and the engine only with the two ranges, categories and cadence', async () => {
    const user = userEvent.setup()
    const { messages } = await renderPage()
    await estimateWith(user, messages)
    await within(calcSection()).findByTestId('calculator-estimate')
    const ladder = captured.filter(
      (c) => new URL(c.url).pathname === PLAN_LADDER_PATH,
    )
    expect(ladder).toHaveLength(1)
    expect(ladder[0]).toMatchObject({ method: 'GET', body: undefined })
    expect(captured.every((c) => new URL(c.url).origin === ORIGIN)).toBe(true)
    expect(captured.some((c) => c.url.includes('app.motir.co'))).toBe(false)
    const estimates = captured.filter((c) => c.method === 'POST')
    expect(estimates.length).toBeGreaterThan(0)
    for (const e of estimates) {
      expect(Object.keys(e.body as object).sort()).toEqual([
        'cadence',
        'categories',
        'plannedPerMonth',
        'runPerMonth',
      ])
    }
  })
})

describe('an estimate the page cannot read', () => {
  for (const locale of ['fr', 'ko'] as const) {
    it.each([
      ['an unknown version', { ...pro, version: 9 }],
      ['a missing version', { ...pro, version: undefined }],
    ])(
      `${locale}: %s reads as unavailable, and the card is unaffected`,
      async (_, body) => {
        estimateReply = () => json(body)
        const user = userEvent.setup()
        const { messages } = await renderPage(locale)
        await estimateWith(user, messages)
        expect(
          await within(calcSection()).findByText(
            messages.pricePage.calculator.errors.unavailable,
          ),
        ).toBeInTheDocument()
        expect(liveRegion().textContent).not.toMatch(/\d/)
        expect(liveRegion().textContent).not.toContain(
          pro.recommendation.planName,
        )
        expect(
          within(plansSection()).getAllByRole('heading', { level: 3 }).length,
        ).toBe(ladderA.plans.length + 2)
      },
    )
  }
})

describe('parity with the billing tab: the answer is rendered, not recomputed', () => {
  it.each(['annual', 'monthly'] as const)('%s', async (cadence) => {
    const answer = { ...maxX2, cadence }
    estimateReply = () => json(answer)
    const user = userEvent.setup()
    const { messages } = await renderPage()
    const w = messages.pricePage.calculator
    if (cadence === 'monthly') {
      await user.click(
        within(
          within(calcSection()).getByRole('group', {
            name: messages.pricePage.plans.cadenceLabel,
          }),
        ).getByRole('button', { name: messages.pricePage.plans.monthly }),
      )
    }
    await estimateWith(user, messages)
    const out = await within(calcSection()).findByTestId('calculator-estimate')
    const n = numberIn('en')
    expect(within(out).getByTestId('calculator-plan')).toHaveTextContent(
      answer.recommendation.planName,
    )
    expect(within(out).getByTestId('calculator-credits')).toHaveTextContent(
      `${n(answer.credits.low)} – ${n(answer.credits.high)}`,
    )
    expect(within(out).getByTestId('calculator-topup')).toHaveTextContent(
      `${format(w.bundleCredits, { n: n(answer.topUp.low.credits) })} – ${format(w.bundleCredits, { n: n(answer.topUp.high.credits) })}`,
    )
    const posted = captured.filter((c) => c.method === 'POST').at(-1)!.body as {
      cadence: string
    }
    expect(posted.cadence).toBe(cadence)
  })
})

describe('the non-happy paths in two non-English locales', () => {
  for (const locale of ['es', 'pl'] as const) {
    it(`${locale}: an engine refusal, an empty category and a retired one`, async () => {
      const user = userEvent.setup()
      const { messages } = await renderPage(locale)
      const w = messages.pricePage.calculator

      estimateReply = () => json(rangeOrder, 400)
      await estimateWith(user, messages)
      expect(
        await within(calcSection()).findByText(w.errors.rangeOrder),
      ).toBeInTheDocument()
      expect(liveRegion().textContent).not.toMatch(/\d/)

      estimateReply = () => json(emptyCategory)
      await user.click(screen.getByRole('checkbox', { name: /^Balanced,/ }))
      await user.click(screen.getByRole('checkbox', { name: /^Frontier,/ }))
      await user.click(
        within(calcSection()).getByRole('button', { name: w.submit }),
      )
      await waitFor(() =>
        expect(
          within(liveRegion()).getByText(w.categoryEmpty),
        ).toBeInTheDocument(),
      )
      expect(liveRegion().textContent).not.toMatch(/\d/)
    })

    it(`${locale}: a retired category is dropped with the notice`, async () => {
      const user = userEvent.setup()
      const { messages } = await renderPage(locale)
      const w = messages.pricePage.calculator
      estimateReply = () => json(stale, 400)
      categoriesReply = () => json(emptyFrontier)
      await estimateWith(user, messages, 'frontier')
      expect(
        await within(calcSection()).findByText(
          format(w.retired, { category: 'Frontier' }),
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('checkbox', { name: /^Frontier,/ }),
      ).toHaveAttribute('aria-checked', 'false')
    })
  }
})
