import { AI_ORIGIN } from '@/lib/aiOrigin'
import type { Cadence } from '@/lib/priceLadder'

/*
 * THE ONE PLACE THE PRICE PAGE TALKS TO THE ENGINE FROM THE BROWSER
 * (MOTIR-8382 · MOTIR-9685): motir-ai's public calculator (`docs/contract.md`
 * §4d), `GET /v1/public/calculator/categories` and
 * `POST /v1/public/calculator/estimate`, with no credential.
 *
 * It computes nothing. The request carries the two ranges, the picked category
 * keys and the cadence — nothing else, so no quantity, user count or seat field
 * can reach the wire — and every answer is folded into a closed union the
 * island switches on. A `version` this page does not know is `unavailable`,
 * never a guessed estimate.
 */

/** The calculator response version this page reads (§4d: version 2). */
export const KNOWN_VERSION = 2

/** At most this many categories per estimate (§4d `MAX_CATEGORIES_PER_ESTIMATE`). */
export const MAX_CATEGORIES = 3

export const CATEGORIES_PATH = '/v1/public/calculator/categories'
export const ESTIMATE_PATH = '/v1/public/calculator/estimate'

export interface CategoriesAnswer {
  cadences: Cadence[]
  defaultCadence: Cadence
  categories: { key: string; models: { id: string }[] }[]
}

export interface Range {
  low: number
  high: number
}

export interface TopUpEnd {
  units: number
  credits: number
  priceUsd: number
}

export type CeilingOutcome =
  'within_ladder' | 'larger_pool' | 'largest_pool' | 'top_ups_only'

export interface Estimate {
  kind: 'estimate'
  cadence: Cadence
  plannedPerMonth: Range
  runPerMonth: Range
  credits: Range
  split: { count: number; categories: { key: string; weight: number }[] }
  recommendation: {
    planKey: string | null
    planName: string | null
    monthlyPriceUsd: number
    poolCredits: number
  }
  topUp: { low: TopUpEnd; high: TopUpEnd }
  ceiling: {
    credits: number
    exceeded: boolean
    excessCredits: number
    outcome: CeilingOutcome
  }
}

export interface EstimateInput {
  plannedPerMonth: Range
  runPerMonth: Range
  categories: string[]
  cadence: Cadence
}

/** Which field a `validation_error` names, read from its `detail` (§4d). */
export type Refusal =
  | { field: 'planned' | 'run'; issue: 'rangeOrder' | 'rangeInvalid' }
  | { field: 'both'; issue: 'rangeBothZero' }
  | { field: 'categories'; issue: 'tooManyCategories' }
  | { field: 'staleCategory' }

export type EstimateResult =
  | { kind: 'ok'; value: Estimate }
  | { kind: 'emptyCategory'; categories: string[] }
  | { kind: 'invalid'; refusal: Refusal }
  | { kind: 'unavailable' }

export type CategoriesResult =
  { kind: 'ok'; value: CategoriesAnswer } | { kind: 'unavailable' }

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isCount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0

const isRange = (v: unknown): v is Range =>
  isRecord(v) && isCount(v.low) && isCount(v.high)

const isCadence = (v: unknown): v is Cadence =>
  v === 'annual' || v === 'monthly'

async function readJson(
  origin: string | null,
  path: string,
  init: RequestInit,
  fetcher: typeof fetch,
): Promise<{ status: number; body: unknown } | null> {
  if (origin === null) return null
  try {
    const res = await fetcher(`${origin}${path}`, {
      ...init,
      credentials: 'omit',
      cache: 'no-store',
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  } catch {
    return null
  }
}

export async function fetchCategories(
  fetcher: typeof fetch = fetch,
  origin: string | null = AI_ORIGIN,
): Promise<CategoriesResult> {
  const out = await readJson(
    origin,
    CATEGORIES_PATH,
    { method: 'GET' },
    fetcher,
  )
  return out && out.status === 200
    ? parseCategories(out.body)
    : { kind: 'unavailable' }
}

export function parseCategories(body: unknown): CategoriesResult {
  if (!isRecord(body) || body.version !== KNOWN_VERSION) {
    return { kind: 'unavailable' }
  }
  const { categories, cadences, defaultCadence } = body
  if (!Array.isArray(categories) || !isCadence(defaultCadence)) {
    return { kind: 'unavailable' }
  }
  const parsed: CategoriesAnswer['categories'] = []
  for (const raw of categories) {
    if (!isRecord(raw) || typeof raw.key !== 'string') {
      return { kind: 'unavailable' }
    }
    const models = Array.isArray(raw.models) ? raw.models : []
    parsed.push({
      key: raw.key,
      models: models
        .filter(
          (m): m is { id: string } => isRecord(m) && typeof m.id === 'string',
        )
        .map((m) => ({ id: m.id })),
    })
  }
  return {
    kind: 'ok',
    value: {
      categories: parsed,
      cadences: Array.isArray(cadences) ? cadences.filter(isCadence) : [],
      defaultCadence,
    },
  }
}

/** The request body: the two ranges, the categories and the cadence — only. */
export function estimateBody(input: EstimateInput): string {
  return JSON.stringify({
    plannedPerMonth: {
      low: input.plannedPerMonth.low,
      high: input.plannedPerMonth.high,
    },
    runPerMonth: { low: input.runPerMonth.low, high: input.runPerMonth.high },
    categories: [...input.categories],
    cadence: input.cadence,
  })
}

export async function requestEstimate(
  input: EstimateInput,
  {
    fetcher = fetch,
    origin = AI_ORIGIN,
    signal,
  }: {
    fetcher?: typeof fetch
    origin?: string | null
    signal?: AbortSignal
  } = {},
): Promise<EstimateResult> {
  const out = await readJson(
    origin,
    ESTIMATE_PATH,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: estimateBody(input),
      signal,
    },
    fetcher,
  )
  if (!out) return { kind: 'unavailable' }
  if (out.status === 200) return parseEstimate(out.body)
  if (out.status === 400 && isRecord(out.body)) {
    const refusal = refusalOf(out.body.detail)
    if (refusal) return { kind: 'invalid', refusal }
  }
  return { kind: 'unavailable' }
}

export function parseEstimate(body: unknown): EstimateResult {
  if (!isRecord(body) || body.version !== KNOWN_VERSION) {
    return { kind: 'unavailable' }
  }
  if (body.kind === 'empty_category') {
    const keys = Array.isArray(body.categories)
      ? body.categories.filter((k): k is string => typeof k === 'string')
      : []
    return keys.length > 0
      ? { kind: 'emptyCategory', categories: keys }
      : { kind: 'unavailable' }
  }
  if (body.kind !== 'estimate') return { kind: 'unavailable' }
  const {
    credits,
    plannedPerMonth,
    runPerMonth,
    split,
    recommendation,
    topUp,
    ceiling,
  } = body
  const isTopUpEnd = (v: unknown): v is TopUpEnd =>
    isRecord(v) && isCount(v.units) && isCount(v.credits) && isCount(v.priceUsd)
  if (
    !isRange(credits) ||
    !isRange(plannedPerMonth) ||
    !isRange(runPerMonth) ||
    !isRecord(split) ||
    !Array.isArray(split.categories) ||
    !isRecord(recommendation) ||
    !isRecord(topUp) ||
    !isTopUpEnd(topUp.low) ||
    !isTopUpEnd(topUp.high) ||
    !isRecord(ceiling) ||
    !['within_ladder', 'larger_pool', 'largest_pool', 'top_ups_only'].includes(
      ceiling.outcome as string,
    )
  ) {
    return { kind: 'unavailable' }
  }
  const nameOrNull = (v: unknown) => (typeof v === 'string' ? v : null)
  return {
    kind: 'ok',
    value: {
      kind: 'estimate',
      cadence: isCadence(body.cadence) ? body.cadence : 'annual',
      plannedPerMonth,
      runPerMonth,
      credits,
      split: {
        count: split.categories.length,
        categories: split.categories
          .filter(
            (c): c is { key: string; weight: number } =>
              isRecord(c) &&
              typeof c.key === 'string' &&
              typeof c.weight === 'number',
          )
          .map((c) => ({ key: c.key, weight: c.weight })),
      },
      recommendation: {
        planKey: nameOrNull(recommendation.planKey),
        planName: nameOrNull(recommendation.planName),
        monthlyPriceUsd: isCount(recommendation.monthlyPriceUsd)
          ? recommendation.monthlyPriceUsd
          : 0,
        poolCredits: isCount(recommendation.poolCredits)
          ? recommendation.poolCredits
          : 0,
      },
      topUp: { low: topUp.low, high: topUp.high },
      ceiling: {
        credits: isCount(ceiling.credits) ? ceiling.credits : 0,
        exceeded: ceiling.exceeded === true,
        excessCredits: isCount(ceiling.excessCredits)
          ? ceiling.excessCredits
          : 0,
        outcome: ceiling.outcome as CeilingOutcome,
      },
    },
  }
}

/*
 * A `validation_error` names its key at the start of `detail` (motir-ai
 * `src/calculatorRequest.ts`). One this page cannot place is not a refusal it
 * can show beside a field, so it reads as unavailable rather than posing as one.
 */
export function refusalOf(detail: unknown): Refusal | null {
  if (typeof detail !== 'string') return null
  if (detail.startsWith('plannedPerMonth and runPerMonth must not both be 0')) {
    return { field: 'both', issue: 'rangeBothZero' }
  }
  for (const [prefix, field] of [
    ['plannedPerMonth', 'planned'],
    ['runPerMonth', 'run'],
  ] as const) {
    if (detail.startsWith(prefix)) {
      return {
        field,
        issue: detail.includes('must not exceed')
          ? 'rangeOrder'
          : 'rangeInvalid',
      }
    }
  }
  if (/^categories\[\d+\] must be one of/.test(detail)) {
    return { field: 'staleCategory' }
  }
  if (detail.startsWith('categories must name at most')) {
    return { field: 'categories', issue: 'tooManyCategories' }
  }
  return null
}
