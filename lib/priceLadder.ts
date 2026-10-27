import { AI_ORIGIN } from './aiOrigin'

/**
 * The price card's ONE source of figures (MOTIR-8382 · MOTIR-9684): motir-ai's
 * public plan ladder, `GET /v1/public/plans` (motir-ai `docs/contract.md`
 * §4e). Read on the server with a short revalidate, so a catalog re-price shows
 * with no deploy of this site.
 *
 * FAILS CLOSED: no origin, a network error, a non-OK answer, a problem+json, a
 * malformed body or a `version` this page does not know each answer
 * `{ kind: 'unavailable' }` — never a partial ladder.
 */

/** The ladder response version this page reads. Separate from the estimate's. */
export const PLAN_LADDER_VERSION = 1

/**
 * How long a read is reused, in seconds. A cache duration, not a figure. The
 * public routes rate-limit per client, and every visitor's read comes from this
 * server's one address, so production must reuse it; the browser lane sets
 * `MOTIR_PLAN_LADDER_REVALIDATE_S=0` to switch the stub's answer between loads.
 */
export const PLAN_LADDER_REVALIDATE_S = 300

export function planLadderRevalidate(
  raw: string | undefined = process.env.MOTIR_PLAN_LADDER_REVALIDATE_S,
): number {
  const n = raw === undefined || raw === '' ? NaN : Number(raw)
  return Number.isInteger(n) && n >= 0 ? n : PLAN_LADDER_REVALIDATE_S
}

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

export async function readPlanLadder(
  fetcher: typeof fetch = fetch,
  origin: string | null = AI_ORIGIN,
): Promise<PlanLadderRead> {
  if (origin === null) return UNAVAILABLE
  try {
    const res = await fetcher(`${origin}${PLAN_LADDER_PATH}`, {
      headers: { accept: 'application/json' },
      next: { revalidate: planLadderRevalidate() },
    } as RequestInit)
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.includes('application/json')) return UNAVAILABLE
    return parsePlanLadder(await res.json())
  } catch {
    return UNAVAILABLE
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
  return {
    kind: 'ladder',
    plans: parsed as LadderPlan[],
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
