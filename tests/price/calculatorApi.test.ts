import { describe, expect, it, vi } from 'vitest'
import {
  CATEGORIES_PATH,
  ESTIMATE_PATH,
  KNOWN_VERSION,
  fetchCategories,
  refusalOf,
  requestEstimate,
  type EstimateInput,
} from '@/app/_components/price/calculatorApi'
import categories from '@/tests/fixtures/calculator/categories.json'
import pro from '@/tests/fixtures/calculator/estimate-pro.json'
import empty from '@/tests/fixtures/calculator/estimate-empty-category.json'
import rangeOrder from '@/tests/fixtures/calculator/problem-range-order.json'
import stale from '@/tests/fixtures/calculator/problem-stale-category.json'
import unavailable from '@/tests/fixtures/calculator/problem-unavailable.json'

/*
 * The calculator's one door to the engine (MOTIR-8382 · MOTIR-9685): the body it
 * sends, the version it checks, and how each answer folds into the union.
 */

const ORIGIN = 'https://ai.example'
const INPUT: EstimateInput = {
  plannedPerMonth: { low: 20, high: 40 },
  runPerMonth: { low: 10, high: 20 },
  categories: ['balanced'],
  cadence: 'monthly',
}

const answer = (body: unknown, status = 200) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: {
          'content-type':
            status === 200 ? 'application/json' : 'application/problem+json',
        },
      }),
  )

describe('requestEstimate', () => {
  it('posts the two ranges, the categories and the cadence — and nothing else — with no credential', async () => {
    const fetcher = answer(pro)
    await requestEstimate(INPUT, { fetcher, origin: ORIGIN })
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(url).toBe(`${ORIGIN}${ESTIMATE_PATH}`)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('omit')
    expect(Object.keys(init.headers as Record<string, string>)).toEqual([
      'Content-Type',
    ])
    const body = JSON.parse(init.body as string)
    expect(Object.keys(body).sort()).toEqual([
      'cadence',
      'categories',
      'plannedPerMonth',
      'runPerMonth',
    ])
    expect(body).toEqual(INPUT)
  })

  it('reads a known-version estimate as it is', async () => {
    const out = await requestEstimate(INPUT, {
      fetcher: answer(pro),
      origin: ORIGIN,
    })
    expect(out.kind).toBe('ok')
    if (out.kind !== 'ok') return
    expect(out.value.credits).toEqual(pro.credits)
    expect(out.value.recommendation.planName).toBe(pro.recommendation.planName)
  })

  it('answers unavailable on a version it does not know — never a guessed estimate', async () => {
    const out = await requestEstimate(INPUT, {
      fetcher: answer({ ...pro, version: KNOWN_VERSION + 1 }),
      origin: ORIGIN,
    })
    expect(out).toEqual({ kind: 'unavailable' })
  })

  it('folds the empty-category answer, naming its categories', async () => {
    const out = await requestEstimate(INPUT, {
      fetcher: answer(empty),
      origin: ORIGIN,
    })
    expect(out).toEqual({ kind: 'emptyCategory', categories: empty.categories })
  })

  it('maps a field refusal to that field, and a stale category to its own kind', async () => {
    expect(
      await requestEstimate(INPUT, {
        fetcher: answer(rangeOrder, 400),
        origin: ORIGIN,
      }),
    ).toEqual({
      kind: 'invalid',
      refusal: { field: 'planned', issue: 'rangeOrder' },
    })
    expect(
      await requestEstimate(INPUT, {
        fetcher: answer(stale, 400),
        origin: ORIGIN,
      }),
    ).toEqual({ kind: 'invalid', refusal: { field: 'staleCategory' } })
  })

  it.each([
    ['the unavailable problem', answer(unavailable, 500)],
    [
      'a refusal it cannot place',
      answer(
        { code: 'validation_error', detail: "unknown field 'seats'" },
        400,
      ),
    ],
    ['a 429', answer({ code: 'rate_limited' }, 429)],
    [
      'a network error',
      vi.fn(async () => {
        throw new TypeError('blocked')
      }),
    ],
  ])('answers unavailable on %s', async (_, fetcher) => {
    expect(await requestEstimate(INPUT, { fetcher, origin: ORIGIN })).toEqual({
      kind: 'unavailable',
    })
  })

  it('answers unavailable with no origin, and makes no request', async () => {
    const fetcher = answer(pro)
    expect(await requestEstimate(INPUT, { fetcher, origin: null })).toEqual({
      kind: 'unavailable',
    })
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('fetchCategories', () => {
  it('reads the categories, empty ones included, and the default cadence', async () => {
    const fetcher = answer(categories)
    const out = await fetchCategories(fetcher, ORIGIN)
    expect((fetcher.mock.calls[0] as unknown as [string])[0]).toBe(
      `${ORIGIN}${CATEGORIES_PATH}`,
    )
    expect(out.kind).toBe('ok')
    if (out.kind !== 'ok') return
    expect(out.value.categories.map((c) => c.key)).toEqual(
      categories.categories.map((c) => c.key),
    )
    expect(out.value.defaultCadence).toBe(categories.defaultCadence)
  })

  it('answers unavailable on an unknown version or a failure', async () => {
    expect(
      await fetchCategories(answer({ ...categories, version: 1 }), ORIGIN),
    ).toEqual({
      kind: 'unavailable',
    })
    expect(await fetchCategories(answer(unavailable, 500), ORIGIN)).toEqual({
      kind: 'unavailable',
    })
  })
})

describe('refusalOf', () => {
  it.each([
    [
      'plannedPerMonth and runPerMonth must not both be 0',
      { field: 'both', issue: 'rangeBothZero' },
    ],
    [
      'runPerMonth.high must be a whole number',
      { field: 'run', issue: 'rangeInvalid' },
    ],
    [
      'runPerMonth.low must not exceed runPerMonth.high',
      { field: 'run', issue: 'rangeOrder' },
    ],
    [
      'categories must name at most 3 categories',
      { field: 'categories', issue: 'tooManyCategories' },
    ],
    ['cadence must be one of: annual, monthly', null],
  ])('%s', (detail, expected) => {
    expect(refusalOf(detail)).toEqual(expected)
  })
})
