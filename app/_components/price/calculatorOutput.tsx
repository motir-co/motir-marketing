import { buttonVariants, Pill } from '@motir/design-system'
import { format } from '@/lib/copy'
import type { Copy } from '@/lib/copy'
import { HOST_PLAN_KEY } from '@/lib/priceLadder'
import type { Estimate } from './calculatorApi'

/*
 * The estimate output for an `ok` answer (MOTIR-8382 · MOTIR-9685; design panels
 * 7–9). Every figure is the answer's own: the ranges it priced, the split, the
 * credit range, the plan by the name it returns, the top-up and — for a larger
 * pool — its name, pool and price. Nothing here compares a number: the arm is
 * the engine's `ceiling.outcome`, and the See-Host line is chosen by the
 * returned plan key through `SEE_HOST_AFTER`.
 */

export type CalculatorWords = Copy['pricePage']['calculator']
type PlansWords = Copy['pricePage']['plans']

/*
 * The plan keys whose answer, met with top-ups, points at Host instead (design
 * element 8, the See-Host line). A key this map does not know shows no line. A
 * larger pool always shows it.
 */
const SEE_HOST_AFTER: Readonly<Record<string, true>> = { max_x2: true }

type Arm = 'regular' | 'larger' | 'largest' | 'above' | 'topupOnly'

function armOf(answer: Estimate): Arm {
  switch (answer.ceiling.outcome) {
    case 'larger_pool':
      return 'larger'
    case 'largest_pool':
      return 'largest'
    case 'top_ups_only':
      return 'above'
    case 'within_ladder':
      return answer.recommendation.planKey === null ? 'topupOnly' : 'regular'
  }
}

/** Presentational capitalisation only: the engine's category rule owns the names. */
export function categoryLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

export function showsSeeHost(answer: Estimate): boolean {
  const arm = armOf(answer)
  if (arm === 'larger' || arm === 'largest') return true
  const key = answer.recommendation.planKey
  return (
    key !== null &&
    SEE_HOST_AFTER[key] === true &&
    answer.topUp.high.credits > 0
  )
}

export function CalculatorOutput({
  answer,
  words,
  plans,
  locale,
}: {
  answer: Estimate
  words: CalculatorWords
  plans: PlansWords
  locale: string
}) {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 })
  const fmt = (n: number) => number.format(n)
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  })
  const arm = armOf(answer)
  const { recommendation, topUp, split } = answer
  const names = split.categories.map((c) => categoryLabel(c.key))
  // Each category's share as the engine priced it, never as the sliders read.
  const shares = split.categories
    .map((c) => `${categoryLabel(c.key)} ${percent.format(c.weight)}`)
    .join(' · ')
  const pool = arm === 'larger' || arm === 'largest'
  const planName = recommendation.planName ?? ''
  const line = 'grid gap-0.5 border-b border-(--el-border-soft) py-2'
  const label = 'text-sm text-(--el-text-secondary)'
  const value = 'text-lg font-semibold text-(--el-text-strong)'
  const body = 'm-0 text-sm text-(--el-text)'

  return (
    <div className="grid gap-1" data-testid="calculator-estimate">
      <p className="m-0 text-sm text-(--el-text-secondary)">
        {format(words.priced, {
          plannedLow: fmt(answer.plannedPerMonth.low),
          plannedHigh: fmt(answer.plannedPerMonth.high),
          runLow: fmt(answer.runPerMonth.low),
          runHigh: fmt(answer.runPerMonth.high),
        })}
      </p>
      <p className={body}>
        {split.categories.length === 1
          ? format(words.splitOne, { category: names[0] ?? '' })
          : format(words.splitShares, { shares })}
      </p>

      <div className={line}>
        <span className={label}>{words.creditsLabel}</span>
        <span className={value} data-testid="calculator-credits">
          {fmt(answer.credits.low)} – {fmt(answer.credits.high)}
        </span>
        <span className="text-sm text-(--el-text)">{words.estimateCaveat}</span>
      </div>

      {pool ? (
        <div className={line} data-testid="calculator-larger">
          <span className={label}>
            {arm === 'largest' ? words.largestPoolLabel : words.largerPoolLabel}
          </span>
          <span className={value}>{planName}</span>
          <span className="text-sm text-(--el-text)">
            {format(plans.creditsAllotment, {
              n: fmt(recommendation.poolCredits),
            })}
            {' · '}
            {format(plans.perMoEquiv, {
              n: fmt(recommendation.monthlyPriceUsd),
            })}
          </span>
        </div>
      ) : null}
      {pool ? (
        <>
          <p className={body}>
            {format(arm === 'largest' ? words.largestPool : words.largerPlan, {
              plan: planName,
            })}
          </p>
          {arm === 'largest' && topUp.high.units > 0 ? (
            <p className={body}>
              {format(words.largestPoolTopUp, {
                excess: fmt(
                  Math.max(0, answer.credits.high - recommendation.poolCredits),
                ),
                units: fmt(topUp.high.units),
                unitCredits: fmt(topUp.high.credits / topUp.high.units),
                price: fmt(topUp.high.priceUsd),
              })}
            </p>
          ) : null}
          <p className={body}>{words.ownAccounts}</p>
          <p className="m-0 text-sm text-(--el-text-secondary)">
            {words.largerPlanEstimate}
          </p>
        </>
      ) : null}

      {arm === 'regular' || arm === 'above' ? (
        <div className={line} data-testid="calculator-plan">
          <span className={label}>{words.planLabel}</span>
          <span className={value}>{planName}</span>
        </div>
      ) : null}
      {arm === 'topupOnly' ? <p className={body}>{words.topupOnly}</p> : null}

      {!pool && topUp.high.credits > 0 ? (
        <div className={line} data-testid="calculator-topup">
          <span className={label}>{words.topupLabel}</span>
          <span className="text-sm text-(--el-text)">
            {format(words.bundleCredits, { n: fmt(topUp.low.credits) })} –{' '}
            {format(words.bundleCredits, { n: fmt(topUp.high.credits) })}
          </span>
        </div>
      ) : null}
      {(arm === 'above' || (arm === 'regular' && topUp.high.credits > 0)) &&
      recommendation.poolCredits > 0 ? (
        <p className={body}>
          {format(words.regularWithTopUps, {
            plan: planName,
            credits: fmt(recommendation.poolCredits),
          })}
        </p>
      ) : null}

      {showsSeeHost(answer) ? (
        <p
          data-testid="calculator-see-host"
          className="m-0 rounded-(--radius-card) bg-(--el-tint-lavender) px-(--spacing-card-padding-12) py-(--spacing-control-y-8) text-(--el-text)"
        >
          <a
            href={`#plan-${HOST_PLAN_KEY}`}
            className="text-(--el-text) underline"
          >
            {words.seeHost}
          </a>
        </p>
      ) : null}

      <div className="grid gap-2 pt-2">
        <p className={body}>{plans.perOrg}</p>
        {(arm === 'regular' || arm === 'above') && recommendation.planKey ? (
          <div>
            <a
              href={`#plan-${recommendation.planKey}`}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {words.goToPlan}
            </a>
          </div>
        ) : null}
      </div>
      {split.categories.length > 1 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {split.categories.map((c) => (
            <Pill
              key={c.key}
              className="border-(--el-border-strong) bg-(--el-surface) text-(--el-text-strong)"
            >
              {categoryLabel(c.key)} · {percent.format(c.weight)}
            </Pill>
          ))}
        </div>
      ) : null}
    </div>
  )
}
