import { Card, Pill } from '@motir/design-system'
import { format } from '@/lib/copy'
import type { ExplainerFigures, ExplainerPlan } from '@/lib/explainer/figures'
import type { ExplainerCopy } from './copy'
import type { FigureFormat } from './figureFormat'

/*
 * Section 5's plan ladder, top-up line and larger pool plan note, and the plan
 * lines Host's card reuses (design/explainer, panels 2 and 3).
 *
 * With figures, every rung's name, pool and both cadence prices come from the
 * catalog read. Without, the rungs keep their names as words and say they are
 * plans of their own — Max ×2 included, which is never a quantity of Max.
 */

/** The ladder's rungs by name, for the figure-free state only: words, not figures. */
export const FIGURE_FREE_LADDER = [
  { key: 'standard', name: 'Standard' },
  { key: 'pro', name: 'Pro' },
  { key: 'max', name: 'Max' },
  { key: 'max_x2', name: 'Max ×2' },
] as const

/** Host's name, for the figure-free state only. */
export const FIGURE_FREE_HOST_NAME = 'Host'

const MAX_X2_KEY = 'max_x2'

/** A plan's name, pool and both prices; or, with no figures, the words. */
export function PlanLines({
  copy,
  fmt,
  plan,
  figureFree,
}: {
  copy: ExplainerCopy
  fmt: FigureFormat
  plan: ExplainerPlan | null
  figureFree: string
}) {
  if (plan === null) {
    return <p className="m-0 text-sm text-(--el-text)">{figureFree}</p>
  }
  return (
    <>
      <p data-figure="pool" className="m-0 text-sm text-(--el-text)">
        {format(copy.plan.credits, {
          credits: fmt.credits(plan.monthlyCredits),
        })}
      </p>
      <p className="m-0 flex flex-wrap gap-x-3 gap-y-1 text-sm text-(--el-text)">
        <span data-figure="monthly">
          {format(copy.plan.monthly, {
            price: fmt.usd(plan.priceUsdByCadence.monthly),
          })}
        </span>
        <span data-figure="annual">
          {format(copy.plan.annual, {
            price: fmt.usd(plan.priceUsdByCadence.annual),
          })}
        </span>
      </p>
    </>
  )
}

export function PlanLadder({
  copy,
  fmt,
  figures,
}: {
  copy: ExplainerCopy
  fmt: FigureFormat
  figures: ExplainerFigures | null
}) {
  const rungs: { key: string; name: string; plan: ExplainerPlan | null }[] =
    figures === null
      ? FIGURE_FREE_LADDER.map((r) => ({ ...r, plan: null }))
      : figures.ladder.map((plan) => ({ key: plan.key, name: plan.name, plan }))
  return (
    <>
      <ul
        data-element="plan-ladder"
        className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2"
      >
        {rungs.map((rung) => (
          <li key={rung.key} className="grid">
            <Card data-element="plan-ladder-rung" data-plan={rung.key}>
              <div className="grid gap-2">
                <p className="m-0 text-base font-semibold text-(--el-text-strong)">
                  {rung.name}
                </p>
                <PlanLines
                  copy={copy}
                  fmt={fmt}
                  plan={rung.plan}
                  figureFree={
                    rung.key === MAX_X2_KEY
                      ? copy.s5.maxX2FigureFree
                      : copy.plan.figureFree
                  }
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <p
        data-element="top-up-line"
        className="m-0 max-w-prose text-sm text-(--el-text)"
      >
        {figures === null
          ? copy.s5.topUpFigureFree
          : format(copy.s5.topUp, {
              price: fmt.usd(figures.topUp.unitAmountUsd),
              credits: fmt.credits(figures.topUp.unitCredits),
            })}
      </p>
      <Card tint="lavender" data-element="larger-pool-plan-note">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-(--el-text-strong)">
              {copy.s5.largerTitle}
            </span>
            <Pill tone="neutral">{copy.s5.largerBadge}</Pill>
          </div>
          <p className="m-0 text-sm text-(--el-text-strong)">
            {copy.s5.largerBody}{' '}
            {figures === null
              ? copy.s5.largerFromFigureFree
              : format(copy.s5.largerFrom, {
                  credits: fmt.credits(figures.largerPool.fromCredits),
                })}
          </p>
        </div>
      </Card>
    </>
  )
}
