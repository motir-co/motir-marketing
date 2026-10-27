import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/routing'
import { formatIcu } from '@/lib/copy'
import { BILLING_CONTACT } from '@/lib/destinations'
import type { ExplainerFigures } from '@/lib/explainer/figures'
import { ContentsAside, ContentsDisclosure } from './ContentsList'
import {
  SECTION_IDS,
  sectionNumber,
  type ExplainerCopy,
  type SectionId,
} from './copy'
import { FallbackNote } from './FallbackNote'
import { figureFormat } from './figureFormat'
import { HostPlan } from './HostPlan'
import { PlanChange } from './PlanChange'
import { PlanLadder } from './PlanLadder'

/*
 * THE "HOW THE CALCULATION WORKS" BODY (MOTIR-9691), built to
 * design/explainer/how-the-calculation-works.mock.html: the intro, the contents
 * list and the ten sections in the design's order.
 *
 * ⚠️ IT HOLDS NO FIGURE. Plan names, pools, prices, the top-up rate and the
 * larger-pool start come in as `figures` (the catalog read the price card
 * uses); the category names as `categories` (the calculator's own read). Either
 * may be `null`, and then that slot says in words what it would show. The words
 * are the `explainer` catalogue group. The lane factors are explained in words
 * in every state: the engine applies them and does not return them.
 */

const PROSE = 'm-0 max-w-prose text-base leading-relaxed text-(--el-text)'
const NOTE = 'm-0 max-w-prose text-sm text-(--el-text-secondary)'

function Section({
  id,
  copy,
  children,
}: {
  id: SectionId
  copy: ExplainerCopy
  children: ReactNode
}) {
  const index = SECTION_IDS.indexOf(id)
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      data-element={`section-${index + 1}`}
      className="grid scroll-mt-20 gap-3 border-t border-(--el-border) pt-6"
    >
      <h2
        id={`${id}-h`}
        className="m-0 flex items-baseline gap-3 text-xl leading-snug font-semibold text-(--el-text-strong) [overflow-wrap:anywhere]"
      >
        <span className="shrink-0 font-mono text-sm whitespace-nowrap text-(--el-text-secondary)">
          {sectionNumber(index)}
        </span>
        <span>{copy[id].title}</span>
      </h2>
      {children}
    </section>
  )
}

export function ExplainerPage({
  copy,
  locale,
  figures,
  categories,
}: {
  copy: ExplainerCopy
  locale: Locale
  figures: ExplainerFigures | null
  categories: string[] | null
}) {
  const fmt = figureFormat(locale)
  return (
    <div
      data-state={figures === null ? 'figure-free' : 'figures'}
      className="mx-auto grid w-full max-w-[1200px] gap-8 px-[clamp(16px,3vw,48px)] py-10 lg:grid-cols-[200px_minmax(0,1fr)]"
    >
      <aside className="hidden lg:block">
        <ContentsAside copy={copy} />
      </aside>
      <article className="grid min-w-0 gap-8">
        <header data-element="intro" className="grid gap-3">
          <p className="m-0 font-mono text-xs tracking-wide text-(--el-text-secondary) uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="m-0 text-3xl leading-tight font-semibold text-(--el-text-strong) [overflow-wrap:anywhere]">
            {copy.headline}
          </h1>
          <p className={PROSE}>{copy.lede}</p>
          {figures === null && (
            <FallbackNote text={copy.figuresUnavailableNote} />
          )}
        </header>

        <div className="lg:hidden">
          <ContentsDisclosure copy={copy} />
        </div>

        <Section id="s1" copy={copy}>
          <p className={PROSE}>{copy.s1.ranges}</p>
          <p className={PROSE}>{copy.s1.ownAgent}</p>
        </Section>

        <Section id="s2" copy={copy}>
          <p className={PROSE}>{copy.s2.body}</p>
          {categories === null ? (
            <p data-element="category-chips" className={NOTE}>
              {copy.s2.categoriesFigureFree}
            </p>
          ) : (
            <ul
              data-element="category-chips"
              aria-label={copy.s2.categoriesLabel}
              className="m-0 flex list-none flex-wrap gap-2 p-0"
            >
              {categories.map((category) => (
                <li
                  key={category}
                  className="rounded-(--radius-badge) border border-(--el-border) bg-(--el-tint-sky) px-(--spacing-chip-x-6) py-(--spacing-chip-y) font-mono text-xs text-(--el-text-strong)"
                >
                  {category}
                </li>
              ))}
            </ul>
          )}
          <p className={NOTE}>{copy.s2.split}</p>
        </Section>

        <Section id="s3" copy={copy}>
          <p className={PROSE}>{copy.s3.body}</p>
          <p
            data-element="lane-factor-pair"
            className="m-0 max-w-prose text-sm text-(--el-text)"
          >
            {copy.s3.laneFactors}
          </p>
        </Section>

        <Section id="s4" copy={copy}>
          <p className={PROSE}>{copy.s4.body}</p>
          <div
            data-element="range-illustration"
            className="grid max-w-prose gap-2"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm whitespace-nowrap text-(--el-text-strong)">
                {copy.s4.low}
              </span>
              <div
                aria-hidden="true"
                className="h-2 flex-1 rounded-full border border-(--el-border) bg-(--el-tint-lavender)"
              />
              <span className="font-mono text-sm whitespace-nowrap text-(--el-text-strong)">
                {copy.s4.high}
              </span>
            </div>
            <p className={NOTE}>{copy.s4.caption}</p>
          </div>
        </Section>

        <Section id="s5" copy={copy}>
          <p className={PROSE}>{copy.s5.body}</p>
          <PlanLadder copy={copy} fmt={fmt} figures={figures} />
        </Section>

        <Section id="s6" copy={copy}>
          <HostPlan copy={copy} fmt={fmt} figures={figures} />
          <p className={PROSE}>{copy.s6.largerPlans}</p>
          <p className={PROSE}>{copy.s6.otherPlans}</p>
        </Section>

        <Section id="s7" copy={copy}>
          <ol
            data-element="who-pays-sentences"
            className="m-0 grid gap-3 pl-6 text-base text-(--el-text)"
          >
            <li>{copy.s7.organization}</li>
            <li>{copy.s7.includedSeat}</li>
            <li>
              {copy.s7.furtherSeats} {copy.s7.noAiPlanSeats}
            </li>
          </ol>
        </Section>

        <Section id="s8" copy={copy}>
          <PlanChange copy={copy} />
        </Section>

        <Section id="s9" copy={copy}>
          <p className={PROSE}>{copy.s9.body}</p>
        </Section>

        <Section id="s10" copy={copy}>
          <p className={PROSE}>
            {formatIcu(locale, copy.s10.body, {
              link: (chunks) => (
                <a
                  href={BILLING_CONTACT}
                  className="text-(--el-link) underline underline-offset-2"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </Section>
      </article>
    </div>
  )
}
