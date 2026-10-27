import {
  HOST_PLAN_KEY,
  parsePlanLadder,
  type Cadence,
  type LadderPlan,
} from '@/lib/priceLadder'

/*
 * The explainer's figures, narrowed from the plan catalog's answer (MOTIR-9690).
 * Pure: unknown JSON in, `ExplainerFigures` or `null` out. One missing or bad
 * figure makes the whole answer `null`, never a partial set — the page then
 * explains itself in words.
 */

/** A plan as the explainer shows it: its name, its pool and its price on BOTH cadences. */
export interface ExplainerPlan {
  key: string
  name: string
  monthlyCredits: number
  priceUsdByCadence: Record<Cadence, number>
}

export interface ExplainerFigures {
  /** The regular ladder the calculator recommends from (Standard … Max ×2), ascending. */
  ladder: ExplainerPlan[]
  /** The standing plan above the ladder, bought from the price card. */
  host: ExplainerPlan
  /** The one top-up unit: the credits it buys and its price. */
  topUp: { unitCredits: number; unitAmountUsd: number }
  /** Where the larger pool plans start: the smallest pool offered above Host. */
  largerPool: { fromCredits: number }
}

const bothCadences = (plan: LadderPlan): ExplainerPlan | null => {
  const { monthly, annual } = plan.priceUsdByCadence
  if (monthly === undefined || annual === undefined) return null
  return {
    key: plan.key,
    name: plan.name,
    monthlyCredits: plan.monthlyCredits,
    priceUsdByCadence: { monthly, annual },
  }
}

/** The catalog answer as the explainer reads it, or `null`. */
export function parseExplainerFigures(body: unknown): ExplainerFigures | null {
  const read = parsePlanLadder(body)
  if (read.kind !== 'ladder') return null

  const hostPlan = read.plans.find((plan) => plan.key === HOST_PLAN_KEY)
  const rungs = read.plans.filter((plan) => plan.key !== HOST_PLAN_KEY)
  if (hostPlan === undefined || rungs.length === 0) return null

  const host = bothCadences(hostPlan)
  const ladder = rungs.map(bothCadences)
  if (host === null || ladder.some((plan) => plan === null)) return null

  const above = read.largerPlans
    .map((plan) => plan.monthlyCredits)
    .filter((credits) => credits > host.monthlyCredits)
  if (above.length === 0) return null

  return {
    ladder: ladder as ExplainerPlan[],
    host,
    topUp: read.topUp,
    largerPool: { fromCredits: Math.min(...above) },
  }
}
