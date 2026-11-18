import { ArrowUpRight, CheckCheck } from 'lucide-react'
import { cn } from '@motir/design-system'
import { useCopy } from '@/lib/copy'
import { MOTIR_PROJECT } from '@/lib/destinations'
import type { ExploreQuery } from '@/lib/explore'
import { HeroBackgroundIsland } from '@/app/_islands'
import { ExploreSearchForm } from './SearchForm'

/*
 * The Build in public hero (2026-10 redesign) — the landing's language, full
 * width: the wave lines (gathered round the search) under the overlaid header,
 * a left-aligned headline, the search, and the three plain facts about what a
 * visitor can see. Beside it, Motir's own project — the one built in public by
 * Motir — on the landing's accent field.
 *
 * The facts are the shipped ones: a project's overview and changelog are open
 * to anyone on motir.co; its live views in the app need a free account and a
 * one-time consent (`docs/decisions/visitor-sign-in-and-records.md`).
 */

const MONO = 'font-(family-name:--font-mono) tracking-[0.1em] uppercase'

export function ExploreHero({
  basePath,
  query,
}: {
  basePath: string
  query: ExploreQuery
}) {
  const copy = useCopy()
  const f = copy.explore.featured
  return (
    <section
      aria-labelledby="explore-h"
      className="relative isolate overflow-hidden px-[clamp(16px,3vw,48px)] pt-[calc(clamp(48px,6vw,96px)+4.75rem)] pb-[clamp(56px,7vw,112px)]"
    >
      <HeroBackgroundIsland focusId="explore-search" />
      <div className="mx-auto grid max-w-[1400px] items-center gap-x-[clamp(32px,5vw,80px)] gap-y-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <p
            className={cn(
              MONO,
              'm-0 flex items-center gap-2.5 text-[12px] text-(--el-text)',
            )}
          >
            <i
              aria-hidden="true"
              className="size-[10px] bg-(--el-showcase-highlight)"
            />
            {copy.explore.heroEyebrow}
          </p>
          <h1
            id="explore-h"
            className="m-0 font-(family-name:--font-serif) text-[clamp(44px,6.2vw,96px)] leading-[0.92] font-bold tracking-[-0.045em] text-balance"
          >
            {copy.explore.heroTitle}
          </h1>
          <p
            data-hero-lede=""
            className="m-0 max-w-[52ch] text-[clamp(17px,1.4vw,20px)] text-(--el-text-secondary)"
          >
            {copy.explore.heroLede}
          </p>
          <div
            id="explore-search"
            data-surface="card"
            className="w-full max-w-[40rem] rounded-(--radius-card) border border-(--el-border) bg-(--el-card) p-(--spacing-card-padding) shadow-(--shadow-elevated)"
          >
            <ExploreSearchForm basePath={basePath} query={query} />
            <ul className="m-0 mt-3 flex list-none flex-wrap items-center gap-x-5 gap-y-1.5 p-0 text-[13px] text-(--el-text-secondary)">
              {[
                copy.explore.trustCrawlable,
                copy.explore.trustNoSignup,
                copy.explore.trustUpdated,
              ].map((label) => (
                <li key={label} className="inline-flex items-center gap-1.5">
                  <CheckCheck
                    className="h-3.5 w-3.5 text-(--el-success)"
                    aria-hidden
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          data-showcase="field"
          data-tilt=""
          className="landing-art mk-halftone grid gap-5 overflow-hidden rounded-(--radius-card) border border-(--el-border) bg-(--el-showcase-field) p-[calc(var(--spacing-card-padding)*2)] text-(--el-showcase-field-text) shadow-(--shadow-elevated)"
        >
          <p className={cn(MONO, 'm-0 flex items-center gap-2.5 text-[12px]')}>
            <i
              aria-hidden="true"
              className="size-[9px] bg-(--el-showcase-field-text)"
            />
            {f.eyebrow}
          </p>
          <p className="m-0 font-(family-name:--font-serif) text-[clamp(32px,3.6vw,56px)] leading-[0.96] font-bold tracking-[-0.035em]">
            {f.title}
          </p>
          <p className="m-0 max-w-[40ch] text-[17px]">{f.body}</p>
          <a
            href={MOTIR_PROJECT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-(--height-btn-lg) items-center gap-2 justify-self-start rounded-(--radius-btn) bg-(--el-showcase-field-text) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-field) no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-field-text)"
          >
            {f.cta}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
