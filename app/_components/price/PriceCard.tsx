import { buttonVariants, Card, cn, Pill } from '@motir/design-system'
import { LOCALE_BCP47 } from '@/i18n/routing'
import { format, formatIcu, useCopy, usePageLocale } from '@/lib/copy'
import { PLANS_SIGN_UP } from '@/lib/destinations'
import {
  annualSaving,
  RECOMMENDED_PLAN_KEY,
  type LadderPlan,
  type PlanLadderRead,
} from '@/lib/priceLadder'
import {
  INCLUDED_TRACKER_SEATS,
  TRACKER_SEAT_FEE_USD_PER_MONTH,
  TRACKER_SEAT_FEE_USD_PER_YEAR,
} from '@/lib/seatFee'
import { PlansUnavailableIsland, PriceCadenceIsland } from '../../_islands'

/*
 * THE PRICE CARD (MOTIR-8382 · MOTIR-9684), built to design/price/price.mock.html
 * panels 2–4: the app's plans view redrawn for a signed-out visitor.
 *
 * ⚠️ EVERY FIGURE IS THE LADDER'S. Names, pools, prices, the cadences a plan is
 * offered on and the top-up rate all come from motir-ai `GET /v1/public/plans`
 * (`readPlanLadder`), so a re-price or a new rung needs no edit here. The words
 * are app.motir.co's own billing strings (`pricePage.plans.*`), and a plan with
 * no tier copy simply shows none.
 *
 * The seat block is the one thing that is not a ladder figure — the Motir seat
 * fee lives in motir-core, not the AI catalog — so it renders even when the
 * ladder cannot be read.
 */

/*
 * Each plan card wears its own colour so the rungs read apart at a glance
 * (2026-11-18). The tints are the design system's own (`--el-tint-*`, the
 * tinted `Card`'s), so every style and palette repaints them; the card's inks
 * were measured on all six over every palette and theme and clear AA.
 *
 * Max ×2 wears a light wash of the palette's own accent (`.plan-accent-wash`,
 * globals.css), so it changes with the palette rather than being a fixed tint.
 *
 * Host, the top rung, is INVERTED instead (`.plan-inverted`, globals.css): the
 * theme's strongest ink becomes its ground and the page ground its ink — a
 * dark card in a light theme, a light one in a dark theme. A plan the list
 * does not name takes the next of the spare tints, in ladder order.
 */
const PLAN_TINT: Record<string, string> = {
  standard: 'bg-(--el-tint-sky)',
  pro: 'bg-(--el-tint-lavender)',
  max: 'bg-(--el-tint-mint)',
  max_x2: 'plan-accent-wash',
  host: 'plan-inverted',
}
const SPARE_TINTS = [
  'bg-(--el-tint-peach)',
  'bg-(--el-tint-rose)',
  'bg-(--el-tint-yellow)',
] as const

const tintFor = (key: string, i: number) =>
  PLAN_TINT[key] ?? SPARE_TINTS[i % SPARE_TINTS.length]!

type PlansCopy = ReturnType<typeof useCopy>['pricePage']['plans']
type Tier = { useCase: string; features: string[] }

export function PriceCard({ ladder }: { ladder: PlanLadderRead }) {
  const pageCopy = useCopy().pricePage
  const copy = pageCopy.plans
  const locale = usePageLocale()
  const number = new Intl.NumberFormat(LOCALE_BCP47[locale], {
    maximumFractionDigits: 0,
  })
  const fmt = (n: number) => number.format(n)

  const seats = <SeatCard copy={copy} fmt={fmt} locale={locale} />
  const orgNote = (
    <div className="grid gap-1">
      <p className="m-0 text-sm text-(--el-text)">{copy.perOrg}</p>
      <p className="m-0 text-xs text-(--el-text-secondary)">{copy.invoice}</p>
    </div>
  )

  if (ladder.kind === 'unavailable') {
    return (
      <div className="grid gap-4">
        <PlansUnavailableIsland />
        {seats}
        {orgNote}
      </div>
    )
  }

  const { plans, topUp } = ladder
  const largest = plans[plans.length - 1]
  // The Annual badge's figure is the cards' own saving (MOTIR-10156), never a
  // percentage written into the copy: one figure when every card saves the same,
  // the range when they differ, and no badge when none saves anything.
  const saving = annualSaving(plans)
  const percent = new Intl.NumberFormat(LOCALE_BCP47[locale], {
    style: 'percent',
    maximumFractionDigits: 0,
  })
  const saveBadge = saving
    ? format(copy.saveBadge, {
        pct:
          saving.low === saving.high
            ? percent.format(saving.low)
            : percent.formatRange(saving.low, saving.high),
      })
    : null
  return (
    <div className="grid gap-4">
      <PriceCadenceIsland saveBadge={saveBadge}>
        <div
          role="list"
          aria-label={pageCopy.plansLabel}
          className="-mx-1 flex items-stretch gap-3 overflow-x-auto px-1 pb-1"
        >
          {plans.map((plan, i) => (
            <div
              role="listitem"
              key={plan.key}
              className="plan-slot min-w-[13rem] grow basis-0"
            >
              <PlanCard
                plan={plan}
                tint={tintFor(plan.key, i)}
                previous={plans[i - 1] ?? null}
                copy={copy}
                fmt={fmt}
                locale={locale}
              />
            </div>
          ))}
        </div>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <h3 className="m-0 font-semibold text-(--el-text-strong)">
                {copy.needMoreTitle}
              </h3>
              <p className="m-0 max-w-prose text-sm text-(--el-text-secondary)">
                {format(copy.needMoreBody, {
                  plan: largest.name,
                  credits: fmt(largest.monthlyCredits),
                })}
              </p>
            </div>
            <a
              href="#calculator"
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              {copy.needMoreAction}
            </a>
          </div>
        </Card>
        <div className="grid gap-3 md:grid-cols-2">
          <Card
            header={
              <h3 className="m-0 font-semibold text-(--el-text-strong)">
                {copy.topupTitle}
              </h3>
            }
          >
            <div className="grid gap-1">
              <p className="m-0 text-sm text-(--el-text)">
                {copy.topupSubtitle}
              </p>
              <p className="m-0 text-xs text-(--el-text-secondary)">
                {format(copy.topupRate, {
                  unit: fmt(topUp.unitAmountUsd),
                  credits: fmt(topUp.unitCredits),
                })}
              </p>
            </div>
          </Card>
          {seats}
        </div>
      </PriceCadenceIsland>
      {orgNote}
    </div>
  )
}

function PlanCard({
  plan,
  tint,
  previous,
  copy,
  fmt,
  locale,
}: {
  plan: LadderPlan
  tint: string
  previous: LadderPlan | null
  copy: PlansCopy
  fmt: (n: number) => string
  locale: ReturnType<typeof usePageLocale>
}) {
  const recommended = plan.key === RECOMMENDED_PLAN_KEY
  const tier = (copy.tiers as Record<string, Tier | undefined>)[plan.key]
  return (
    <article
      data-plan={plan.key}
      aria-labelledby={`plan-${plan.key}`}
      className={cn(
        'flex h-full flex-col gap-2 rounded-(--radius-card) border p-(--spacing-card-padding) shadow-(--shadow-card)',
        tint,
        recommended ? 'border-(--el-accent)' : 'border-transparent',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3
          id={`plan-${plan.key}`}
          className="m-0 text-base font-semibold text-(--el-text)"
        >
          {plan.name}
        </h3>
        {recommended ? (
          <Pill className="plan-pill border-transparent">
            {copy.recommended}
          </Pill>
        ) : null}
      </div>
      {tier ? (
        <p className="m-0 min-h-[2.75rem] text-xs text-(--el-text-secondary)">
          {tier.useCase}
        </p>
      ) : null}
      <PriceBlocks plan={plan} copy={copy} fmt={fmt} />
      <p className="m-0 text-sm font-semibold text-(--el-text-strong)">
        {format(copy.creditsAllotment, { n: fmt(plan.monthlyCredits) })}
      </p>
      <p className="m-0 text-xs text-(--el-text-secondary)">
        {formatIcu(locale, copy.seatIncluded, {
          count: INCLUDED_TRACKER_SEATS,
        })}
      </p>
      {tier ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs text-(--el-text-secondary)">
          {previous ? (
            <Feature lead>
              {format(copy.everythingIn, { prev: previous.name })}
            </Feature>
          ) : null}
          {tier.features.map((feature) => (
            <Feature key={feature}>{feature}</Feature>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto pt-1">
        <a
          href={PLANS_SIGN_UP}
          className={cn(
            buttonVariants({
              variant: recommended ? 'primary' : 'secondary',
              size: 'sm',
            }),
            'w-full',
          )}
        >
          {format(recommended ? copy.ctaUpgrade : copy.ctaChoose, {
            plan: plan.name,
          })}
        </a>
      </div>
    </article>
  )
}

/*
 * The seat's own price card (2026-11-18): $5 per user a month, or $40 a year —
 * motir-core's seat prices (`lib/seatFee.ts`), not a ladder figure, so it
 * renders even when the ladder cannot be read. Inside the cadence island it
 * follows the Monthly / Annual toggle like the plan cards; outside it (the
 * ladder-unavailable state) no `data-cadence` is set and it shows Monthly.
 */
function SeatCard({
  copy,
  fmt,
  locale,
}: {
  copy: PlansCopy
  fmt: (n: number) => string
  locale: ReturnType<typeof usePageLocale>
}) {
  const monthly = TRACKER_SEAT_FEE_USD_PER_MONTH
  const annual = TRACKER_SEAT_FEE_USD_PER_YEAR
  const save = monthly * 12 - annual
  const big = 'font-serif text-2xl whitespace-nowrap text-(--el-text)'
  const sub = 'm-0 text-xs text-(--el-text-secondary)'
  return (
    <article
      data-plan="seat"
      aria-labelledby="plan-seat"
      className="flex h-full flex-col gap-2 rounded-(--radius-card) border border-transparent bg-(--el-tint-peach) p-(--spacing-card-padding) shadow-(--shadow-card)"
    >
      <h3
        id="plan-seat"
        className="m-0 text-base font-semibold text-(--el-text)"
      >
        {copy.seatTitle}
      </h3>
      <p className="m-0 text-xs text-(--el-text-secondary)">
        {copy.seatUseCase}
      </p>
      <div
        data-price="monthly"
        className="group-data-[cadence=annual]/cadence:hidden"
      >
        <span className={big}>
          {format(copy.seatPerMo, { n: fmt(monthly) })}
        </span>
        <p className={sub}>
          {format(copy.seatMonthlySub, { yr: fmt(monthly * 12), n: fmt(save) })}
        </p>
      </div>
      <div
        data-price="annual"
        className="hidden group-data-[cadence=annual]/cadence:block"
      >
        <span className={big}>
          {format(copy.seatPerYr, { n: fmt(annual) })}
        </span>
        <p className={sub}>{format(copy.seatAnnualSub, { n: fmt(save) })}</p>
      </div>
      <p className="m-0 text-xs text-(--el-text-secondary)">
        {formatIcu(locale, copy.seatsIncluded, {
          count: INCLUDED_TRACKER_SEATS,
        })}
      </p>
      <div className="mt-auto pt-1">
        <a
          href={PLANS_SIGN_UP}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'sm' }),
            'w-full',
          )}
        >
          {copy.seatCta}
        </a>
      </div>
    </article>
  )
}

/*
 * Both cadences' blocks, each shown under its own `data-cadence`. A plan
 * offered on ONE cadence shows that block whatever the toggle says, and drops
 * the saving it cannot compute.
 */
function PriceBlocks({
  plan,
  copy,
  fmt,
}: {
  plan: LadderPlan
  copy: PlansCopy
  fmt: (n: number) => string
}) {
  const { monthly, annual } = plan.priceUsdByCadence
  const both = monthly !== undefined && annual !== undefined
  const save = both ? monthly * 12 - annual : 0
  const big = 'font-serif text-2xl whitespace-nowrap text-(--el-text)'
  const sub = 'm-0 text-xs text-(--el-text-secondary)'
  return (
    <>
      {monthly !== undefined ? (
        <div
          data-price="monthly"
          className={
            both ? 'group-data-[cadence=annual]/cadence:hidden' : undefined
          }
        >
          <span className={big}>
            {format(copy.perMoEquiv, { n: fmt(monthly) })}
          </span>
          {both ? (
            <p className={sub}>
              {format(copy.monthlySub, { yr: fmt(monthly * 12), n: fmt(save) })}
            </p>
          ) : null}
        </div>
      ) : null}
      {annual !== undefined ? (
        <div
          data-price="annual"
          className={
            both
              ? 'hidden group-data-[cadence=annual]/cadence:block'
              : undefined
          }
        >
          <span className={big}>
            {format(copy.perMoEquiv, { n: fmt(Math.round(annual / 12)) })}
          </span>
          <p className={sub}>{format(copy.annualSub, { yr: fmt(annual) })}</p>
          {save > 0 ? (
            <Pill className="plan-pill mt-1 border-transparent">
              {format(copy.annualSave, { n: fmt(save) })}
            </Pill>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function Feature({ children, lead }: { children: string; lead?: boolean }) {
  return (
    <li className={cn('flex items-start gap-1.5', lead && 'font-medium')}>
      {/* The app's lucide Check — a graphic (3:1), not a text glyph. */}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        width={14}
        height={14}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0 text-(--el-success)"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span>{children}</span>
    </li>
  )
}
