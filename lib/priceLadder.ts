import { AI_ORIGIN } from './aiOrigin'

/**
 * The price card's ONE source of figures (MOTIR-8382 · MOTIR-9684): motir-ai's
 * public plan ladder, `GET /v1/public/plans` (motir-ai `docs/contract.md`
 * §4e). Read ONCE PER BUILD (MOTIR-10644): `/price` and
 * `/how-the-calculation-works` are static pages, so a re-price reaches motir.co
 * at the next build, not within minutes. Keeping that prompt is CI's job:
 * motir-ai sends a `motir-plan-ladder-changed` repository_dispatch on a
 * re-price, motir-marketing's CI rebuilds and redeploys on it, and the daily
 * scheduled build is the backstop.
 *
 * FAILS CLOSED: no origin, a network error, a non-OK answer, a problem+json, a
 * malformed body or a `version` this page does not know each answer
 * `{ kind: 'unavailable' }` — never a partial ladder — and a page built from
 * the ladder reads it through `requirePlanLadder`, which fails the BUILD on
 * that answer, so a page with no figures never replaces the last good one.
 */

/** The ladder response version this page reads. Separate from the estimate's. */
export const PLAN_LADDER_VERSION = 1

export const PLAN_LADDER_PATH = '/v1/public/plans'

export type Cadence = 'annual' | 'monthly'

export interface LadderPlan {
  key: string
  name: string
  monthlyCredits: number
  priceUsdByCadence: Partial<Record<Cadence, number>>
}

export interface PlanLadder {
  kind: 'ladder'
  plans: LadderPlan[]
  /** The larger pool plans, ascending by pool (§4e `largerPlans`). Never in `plans`. */
  largerPlans: LadderPlan[]
  topUp: { unitCredits: number; unitAmountUsd: number }
}

export type PlanLadderRead = PlanLadder | { kind: 'unavailable' }

/**
 * The plan the app's catalog marks recommended (motir-core `billing.plans.
 * chooseSub`: "Pro is the recommended anchor"). The public ladder carries no
 * recommended flag, so the key is named here — a key, never a figure.
 */
export const RECOMMENDED_PLAN_KEY = 'pro'

/** The standing plan the calculator's See-Host line points at — a key, never a figure. */
export const HOST_PLAN_KEY = 'host'

const UNAVAILABLE = { kind: 'unavailable' } as const

/** Thrown at build when a page that shows the ladder cannot read it. */
export class PlanLadderUnavailableError extends Error {
  override readonly name = 'PlanLadderUnavailableError'

  constructor(origin: string | null) {
    super(
      origin === null
        ? `The plan ladder has no origin: set PUBLIC_MOTIR_AI_ORIGIN.`
        : `The plan ladder at ${origin}${PLAN_LADDER_PATH} could not be read, ` +
            `so the pages built from it would show no figure. The build stops ` +
            `and the deployed site keeps its last good copy.`,
    )
  }
}

/**
 * The ladder, for a page built from it: the read, or a thrown
 * `PlanLadderUnavailableError` that fails the build.
 */
export async function requirePlanLadder(
  fetcher: typeof fetch = fetch,
  origin: string | null = AI_ORIGIN,
): Promise<PlanLadder> {
  const read = await readPlanLadder(fetcher, origin)
  if (read.kind === 'unavailable') throw new PlanLadderUnavailableError(origin)
  return read
}

export async function readPlanLadder(
  fetcher: typeof fetch = fetch,
  origin: string | null = AI_ORIGIN,
): Promise<PlanLadderRead> {
  return parsePlanLadder(await fetchPlanLadderBody(fetcher, origin))
}

/**
 * The ladder response's body as sent, or `null` when there is none to read: no
 * origin, a network error, a non-OK answer or a body that is not JSON. The one
 * request the price card makes, shared by the explainer page (MOTIR-9690), which
 * tells an unknown `version` apart from an unreadable answer before parsing.
 */
export async function fetchPlanLadderBody(
  fetcher: typeof fetch = fetch,
  origin: string | null = AI_ORIGIN,
): Promise<unknown> {
  if (origin === null) return null
  try {
    const res = await fetcher(`${origin}${PLAN_LADDER_PATH}`, {
      headers: { accept: 'application/json' },
    })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.includes('application/json')) return null
    return await res.json()
  } catch {
    return null
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isCount = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0

/** The response as this page reads it, or unavailable. Pure. */
export function parsePlanLadder(body: unknown): PlanLadderRead {
  if (!isRecord(body) || body.version !== PLAN_LADDER_VERSION) {
    return UNAVAILABLE
  }
  const { plans, topUp } = body
  if (!Array.isArray(plans) || plans.length === 0 || !isRecord(topUp)) {
    return UNAVAILABLE
  }
  if (!isCount(topUp.unitCredits) || !isCount(topUp.unitAmountUsd)) {
    return UNAVAILABLE
  }
  const parsed = plans.map(parsePlan)
  if (parsed.some((p) => p === null)) return UNAVAILABLE
  const larger = body.largerPlans ?? []
  if (!Array.isArray(larger)) return UNAVAILABLE
  const largerPlans = larger.map(parsePlan)
  if (largerPlans.some((p) => p === null)) return UNAVAILABLE
  return {
    kind: 'ladder',
    plans: parsed as LadderPlan[],
    largerPlans: largerPlans as LadderPlan[],
    topUp: {
      unitCredits: topUp.unitCredits,
      unitAmountUsd: topUp.unitAmountUsd,
    },
  }
}

function parsePlan(raw: unknown): LadderPlan | null {
  if (!isRecord(raw)) return null
  const { key, name, monthlyCredits, priceUsdByCadence } = raw
  if (typeof key !== 'string' || typeof name !== 'string') return null
  if (!isCount(monthlyCredits) || !isRecord(priceUsdByCadence)) return null
  const prices: Partial<Record<Cadence, number>> = {}
  for (const cadence of ['monthly', 'annual'] as const) {
    const price = priceUsdByCadence[cadence]
    if (price === undefined) continue
    if (!isCount(price)) return null
    prices[cadence] = price
  }
  if (Object.keys(prices).length === 0) return null
  return { key, name, monthlyCredits, priceUsdByCadence: prices }
}

/** The share of a year at the monthly price that a plan's annual price saves. */
export interface AnnualSaving {
  /** The smallest saving across the plans, as a fraction (`0.33` is 33%). */
  low: number
  /** The largest. Equal to `low` when every plan saves the same. */
  high: number
}

/**
 * What paying annually saves across `plans`, from their own prices (MOTIR-10156):
 * the Annual toggle's badge states this, so a re-price moves it with the cards.
 *
 * Each plan offered on both cadences saves `1 − annual / (12 × monthly)`; a plan on
 * one cadence, or one whose annual price saves nothing, takes no part. Each
 * fraction is rounded DOWN to a whole percent, so the badge never states more than
 * a card saves. `null` when no plan saves anything — the badge then shows nothing.
 */
export function annualSaving(
  plans: readonly LadderPlan[],
): AnnualSaving | null {
  const savings: number[] = []
  for (const { priceUsdByCadence: price } of plans) {
    const { monthly, annual } = price
    if (monthly === undefined || annual === undefined || monthly <= 0) continue
    const year = monthly * 12
    if (annual >= year) continue
    // A whole percent, rounded down. The epsilon keeps an exact share (0.29 is
    // 28.999… in floating point) from losing a point to representation.
    const percent = Math.floor(((year - annual) / year) * 100 + 1e-9)
    if (percent > 0) savings.push(percent / 100)
  }
  if (savings.length === 0) return null
  return { low: Math.min(...savings), high: Math.max(...savings) }
}
