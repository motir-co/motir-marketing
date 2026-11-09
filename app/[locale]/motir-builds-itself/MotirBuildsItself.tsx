import { localizedPath } from '@/i18n/localizedPath'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@motir/design-system'
import { useCopy, usePageLocale } from '@/lib/copy'
import {
  FREE_DOOR,
  HOW_IT_WORKS,
  MOTIR_PROJECT,
  MOTIR_PROJECT_RUNS,
} from '@/lib/destinations'
import type {
  PublicChangelogPageDto,
  PublicProjectOverviewDto,
  PublicRead,
} from '@/lib/publicProject'
import { SITE_HOST } from '@/lib/publicHost'
import { SiteShell } from '../../_components/SiteShell'
import { HeroWavesIsland } from '../../_islands'
import { RoadmapUi } from '../products/_components/PmUi'
import { Eyebrow, GUTTER, H2 } from '../products/_components/ProductPage'
import { LostTiles, NeedList, Staircase } from './_components/StoryArt'

/*
 * "Motir builds itself" (2026-10 redesign) — the story behind the landing's
 * section of the same name: what vibe coding lost, what the project tools
 * were missing, and the bootstrap — Motir began as motir-meta (prompts, a task
 * list, a store of mistakes) and every feature it shipped became the tool for
 * building the next. It ends on Motir's own LIVE numbers and latest shipped
 * work, read from the public API like `/p/MOTIR` reads them; an unreachable
 * API degrades to a sentence, never an error page.
 *
 * Rendered per request by the Worker since MOTIR-10756
 * (`worker/motirBuildsItself.tsx`), from the two reads it has already made.
 * Kept out of the index (`robots: noindex`) and the sitemap while in review,
 * like the product pages (`./buildsItselfMetadata.ts`).
 */

const MONO = 'font-(family-name:--font-mono) tracking-[0.1em] uppercase'

function OutButton({
  href,
  children,
  primary,
}: Readonly<{ href: string; children: React.ReactNode; primary?: boolean }>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex h-(--height-btn-lg) items-center gap-2 rounded-(--radius-btn) px-(--spacing-btn-x) text-[15px] font-medium no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)',
        primary
          ? 'bg-(--el-showcase-ground) text-(--el-showcase-ground-text)'
          : 'border border-(--el-border-strong) text-(--el-text) hover:bg-(--el-surface-soft)',
      )}
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-4" />
    </a>
  )
}

function Section({
  id,
  eyebrow,
  headline,
  body,
  children,
}: Readonly<{
  id: string
  eyebrow: string
  headline: string
  body?: string
  children: React.ReactNode
}>) {
  return (
    <section
      aria-labelledby={`${id}-h`}
      className={cn('py-[clamp(48px,6vw,96px)]', GUTTER)}
    >
      <div className="mx-auto grid max-w-[1400px] gap-10">
        <div className="grid max-w-[60rem] gap-5">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 id={`${id}-h`} className={H2}>
            {headline}
          </h2>
          {body ? (
            <p className="m-0 max-w-[56ch] text-[18px] text-(--el-text-secondary)">
              {body}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  )
}

export function MotirBuildsItself({
  project,
  changelog,
}: Readonly<{
  project: PublicRead<PublicProjectOverviewDto>
  changelog: PublicRead<PublicChangelogPageDto>
}>) {
  const locale = usePageLocale()
  const b = useCopy().builtByMotirPage
  const stats = project.status === 'ok' ? project.data.stats : null
  const recent =
    changelog.status === 'ok' ? changelog.data.entries.slice(0, 6) : []

  return (
    <SiteShell host={SITE_HOST} overlayHeader>
      <section
        aria-labelledby="mbi-h"
        className={cn(
          'relative isolate overflow-hidden pt-[calc(clamp(48px,6vw,96px)+4.75rem)] pb-[clamp(56px,7vw,112px)]',
          GUTTER,
        )}
      >
        <HeroWavesIsland focusId="mbi-actions" />
        <div className="mx-auto grid max-w-[1400px] gap-6">
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
            {b.eyebrow}
          </p>
          <h1
            id="mbi-h"
            className="m-0 max-w-[14ch] font-(family-name:--font-serif) text-[clamp(48px,7vw,112px)] leading-[0.92] font-bold tracking-[-0.045em]"
          >
            {b.headline}
          </h1>
          <p
            data-hero-lede=""
            className="m-0 max-w-[52ch] text-[clamp(18px,1.6vw,22px)] text-(--el-text-secondary)"
          >
            {b.lede}
          </p>
          <div id="mbi-actions" className="flex flex-wrap gap-3">
            <OutButton href={MOTIR_PROJECT} primary>
              {b.watch}
            </OutButton>
            <OutButton href={MOTIR_PROJECT_RUNS}>{b.runs}</OutButton>
          </div>
        </div>
      </section>

      <Section
        id="lost"
        eyebrow={b.lost.eyebrow}
        headline={b.lost.headline}
        body={b.lost.body}
      >
        <LostTiles />
      </Section>

      <Section
        id="missing"
        eyebrow={b.missing.eyebrow}
        headline={b.missing.headline}
        body={b.missing.body}
      >
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="grid gap-4">
            <NeedList />
            <p className="m-0 font-(family-name:--font-serif) text-[clamp(26px,2.4vw,36px)] leading-[1.05] font-bold tracking-[-0.02em] text-(--el-text)">
              {b.missing.after}
            </p>
          </div>
          <RoadmapUi zoom={0.56} />
        </div>
      </Section>

      <Section
        id="bootstrap"
        eyebrow={b.bootstrap.eyebrow}
        headline={b.bootstrap.headline}
        body={b.bootstrap.body}
      >
        <Staircase />
      </Section>

      <div className={cn('py-[clamp(24px,3vw,48px)]', GUTTER)}>
        <section
          aria-labelledby="mbi-hiw-h"
          className="landing-art mx-auto grid max-w-[1400px] gap-6 overflow-hidden rounded-(--radius-card) border border-(--el-border) bg-(--el-showcase-decision) p-[calc(var(--spacing-card-padding)*2)] text-(--el-showcase-decision-text) shadow-(--shadow-card) md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
        >
          <div className="grid gap-3">
            <p className={cn(MONO, 'm-0 text-[12px]')}>
              {b.howItWorks.eyebrow}
            </p>
            <h2
              id="mbi-hiw-h"
              className="m-0 max-w-[20ch] font-(family-name:--font-serif) text-[clamp(32px,4vw,60px)] leading-[0.98] font-bold tracking-[-0.03em]"
            >
              {b.howItWorks.headline}
            </h2>
            <p className="m-0 max-w-[56ch] text-[18px]">{b.howItWorks.body}</p>
          </div>
          {/* The palette's warm decision fill — the colour of the landing's
              developers' door — so it reads apart from the field-coloured
              close below; the ink button stands out on it. */}
          <a
            href={localizedPath(locale, HOW_IT_WORKS)}
            className="group inline-flex h-(--height-btn-lg) items-center gap-2 justify-self-start rounded-(--radius-btn) bg-(--el-showcase-ground) px-(--spacing-btn-x) text-[16px] font-semibold text-(--el-showcase-ground-text) no-underline shadow-(--shadow-card) transition hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-decision-text) motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {b.howItWorks.cta}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </a>
        </section>
      </div>

      <Section
        id="live"
        eyebrow={b.live.eyebrow}
        headline={b.live.headline}
        body={b.live.body}
      >
        <div
          data-showcase="ground"
          className="landing-art grid gap-8 rounded-(--radius-card) border border-(--el-border) bg-(--el-showcase-ground) p-[calc(var(--spacing-card-padding)*2)] text-(--el-showcase-ground-text) shadow-(--shadow-card) lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          {stats ? (
            <dl className="m-0 grid grid-cols-2 gap-6 self-start">
              {(
                [
                  ['shipped', stats.shipped],
                  ['planned', stats.planned],
                  ['requests', stats.publicRequests],
                  ['upvotes', stats.upvotes],
                ] as const
              ).map(([k, n]) => (
                <div key={k} className="grid gap-1">
                  <dd className="m-0 font-(family-name:--font-serif) text-[clamp(40px,4.4vw,72px)] leading-none font-bold tracking-[-0.03em]">
                    {n.toLocaleString(locale)}
                  </dd>
                  <dt
                    className={cn(
                      MONO,
                      'text-[11px] text-(--el-showcase-ground-muted)',
                    )}
                  >
                    {b.live.stats[k]}
                  </dt>
                </div>
              ))}
            </dl>
          ) : (
            <p className="m-0 text-[16px] text-(--el-showcase-ground-muted)">
              {b.live.unavailable}
            </p>
          )}
          {recent.length > 0 ? (
            <div className="grid content-start gap-3">
              <p
                className={cn(
                  MONO,
                  'm-0 text-[11px] text-(--el-showcase-ground-muted)',
                )}
              >
                {b.live.recent}
              </p>
              <ul className="m-0 grid list-none gap-2 p-0">
                {recent.map((entry) => (
                  <li
                    key={entry.identifier}
                    data-showcase="ground-raised"
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3 rounded-(--radius-control) bg-(--el-showcase-ground-raised) px-(--spacing-control-x) py-(--spacing-control-y) text-[14px]"
                  >
                    <span
                      className={cn(
                        MONO,
                        'text-[10.5px] text-(--el-showcase-ground-muted)',
                      )}
                    >
                      {entry.identifier}
                    </span>
                    <span className="truncate">{entry.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <a
              href={MOTIR_PROJECT}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-(--height-btn-lg) items-center gap-2 rounded-(--radius-btn) bg-(--el-showcase-highlight) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-ground) no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-highlight)"
            >
              {b.watch}
              <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
            <a
              href={MOTIR_PROJECT_RUNS}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-(--height-btn-lg) items-center gap-2 rounded-(--radius-btn) border border-(--el-showcase-ground-rule) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-ground-text) no-underline hover:border-(--el-showcase-highlight) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-highlight)"
            >
              {b.runs}
            </a>
          </div>
        </div>
      </Section>

      <div
        className={cn(
          'pt-[clamp(8px,1vw,16px)] pb-[clamp(56px,7vw,112px)]',
          GUTTER,
        )}
      >
        <section
          aria-labelledby="mbi-close-h"
          data-showcase="field"
          className="landing-art mk-halftone mx-auto grid max-w-[1400px] gap-6 overflow-hidden rounded-(--radius-card) border border-(--el-border) bg-(--el-showcase-field) p-[calc(var(--spacing-card-padding)*2)] text-(--el-showcase-field-text) shadow-(--shadow-card) md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
        >
          <div className="grid gap-3">
            <h2
              id="mbi-close-h"
              className="m-0 font-(family-name:--font-serif) text-[clamp(40px,5.4vw,80px)] leading-[0.94] font-bold tracking-[-0.035em]"
            >
              {b.close.headline}
            </h2>
            <p className="m-0 max-w-[48ch] text-[18px]">{b.close.body}</p>
          </div>
          <a
            href={FREE_DOOR}
            className="inline-flex h-(--height-btn-lg) items-center gap-2 justify-self-start rounded-(--radius-btn) bg-(--el-showcase-field-text) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-field) no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-field-text)"
          >
            {b.close.cta}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </section>
      </div>
    </SiteShell>
  )
}
