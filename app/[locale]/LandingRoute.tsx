import { localizedPath } from '@/i18n/localizedPath'
import { ArrowRight } from 'lucide-react'
import { buttonVariants, cn } from '@motir/design-system'
import { getCopy } from '@/lib/copy'
import {
  FREE_DOOR,
  HOW_IT_WORKS,
  IMPORT_DOOR,
  SOURCE_REPO,
} from '@/lib/destinations'
import { fetchIdeas } from '@/lib/ideas'
import { SITE_HOST } from '@/lib/publicHost'
import { SiteShell } from '../_components/SiteShell'
import {
  ArtTile,
  DecideArt,
  DesignArt,
  DocsArt,
  HistoryArt,
  PlanArt,
  ProductArt,
  ResumeArt,
  SayArt,
  WatchArt,
} from '../_components/landing/Art'
import { BuiltByMotirSection } from '../_components/landing/BuiltByMotirSection'
import { HeroBriefIsland, HeroWavesIsland } from '../_islands'
import { ProjectManagerSection } from '../_components/landing/ProjectManagerSection'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import type { Locale } from '@/i18n/routing'
import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'

/*
 * motir.co — the public landing: "Vibe the project" (2026-10 redesign).
 *
 * The page sells one idea: you bring the idea, Motir delivers the whole
 * project, and you make the calls. In order:
 *   1. the hero — headline, intro and ONE brief box, over wave lines drawn
 *      from the Motir mark;
 *   2. Motir Project Manager — the way in for a project that already exists,
 *      then "Motir builds itself", linking straight into Motir's own project;
 *   3. "A project is more than code" — plan, design, product, docs, history;
 *   4. "AI does the work. You make the calls." — say it, watch it, you decide;
 *   5. "Pick up where you left off";
 *   6. the closing band.
 *
 * EVERYTHING FOLLOWS THE VISITOR'S DESIGN — theme, palette, style and type.
 * Headlines take the headline role (`--font-serif`), text the body role and
 * labels the mono role; corners, borders and shadows read the style's shape
 * tokens; every colour is a theme token (see `globals.css` § the landing's
 * artwork inks). In the default Motir palette cool slate and blue carry the
 * page, orange marks a decision that is yours, and yellow is the design touch.
 *
 * ⚠️ THE PAGE STILL BUILDS NOTHING BEHIND ITS OWN DOORS. The brief hands the
 * idea to motir-core and the import buttons all lead to motir-core's import
 * door; the choosing, connecting and planning happen there.
 */

const GUTTER = 'px-[clamp(16px,3vw,48px)]'
const H2 =
  'm-0 font-(family-name:--font-serif) text-[clamp(40px,5.4vw,88px)] leading-[0.94] font-bold tracking-[-0.035em] text-balance'

/**
 * The titles the hero brief types in: live ideas from the ideas store, read
 * through the public API like `/ideas` reads them (revalidated hourly). An
 * unreachable store leaves the box with its static placeholder.
 */
async function loadExamples(locale: Locale): Promise<string[]> {
  try {
    // In the page's language where the store has the title (MOTIR-7777).
    const { items } = await fetchIdeas({ tags: [] }, locale)
    return items.map((idea) => idea.title)
  } catch {
    return []
  }
}

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/', (copy) => ({
    title: copy.meta.title,
    description: copy.meta.description,
  }))
}

export default async function Page({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const l = (await getCopy(locale)).landing
  const examples = await loadExamples(locale)
  return (
    <>
      <SiteShell host={SITE_HOST} className="bg-(--el-surface)" overlayHeader>
        <section className="relative isolate grid justify-items-center gap-[22px] overflow-hidden px-[clamp(16px,3vw,48px)] pt-[calc(clamp(72px,9vw,136px)+4.75rem)] pb-[clamp(96px,11vw,168px)] text-center">
          <HeroWavesIsland />
          <h1 className="m-0 font-(family-name:--font-serif) text-[clamp(56px,9.6vw,156px)] leading-[0.9] font-bold tracking-[-0.04em]">
            {l.hero.headline}
            {/* The full stop is drawn, not typed: it is the warm touch, and an
                orange glyph would be measured (and fail) as text. */}
            <span
              aria-hidden="true"
              className="ml-[0.03em] inline-block size-[0.15em] rounded-full bg-(--el-highlight) align-baseline"
            />
          </h1>
          <p
            data-hero-lede
            className="m-0 max-w-[62ch] text-[clamp(17px,1.45vw,21px)] leading-normal font-medium text-balance text-(--el-accent-on-surface)"
          >
            {l.hero.lede}
          </p>
          <div className="mt-[18px] flex w-full justify-center">
            <HeroBriefIsland examples={examples} />
          </div>
          {/* For a visitor who arrives with a project rather than an idea: the
              import door, the same one the close offers. */}
          <p
            data-hero-existing
            className="m-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[17px] text-(--el-text-secondary)"
          >
            <strong className="font-semibold text-(--el-text-strong)">
              {l.hero.existingProject}
            </strong>
            <a
              href={IMPORT_DOOR}
              className={cn(
                buttonVariants({ size: 'md' }),
                // The palette's warm decision fill and its own ink — the colour
                // the close's developers' door wears — so it reads apart from
                // the ink Start above it.
                'border-transparent bg-(--el-showcase-decision) text-[15px] text-(--el-showcase-decision-text) hover:bg-(--el-showcase-decision) hover:brightness-105',
              )}
            >
              {l.hero.existingProjectLink}
            </a>
          </p>
        </section>

        <div className={GUTTER}>
          <ProjectManagerSection />
        </div>

        <div className={cn(GUTTER, 'pt-[clamp(32px,4vw,56px)]')}>
          <BuiltByMotirSection />
        </div>

        <section
          aria-labelledby="more-h"
          className={cn(GUTTER, 'landing-art pt-[clamp(64px,8vw,120px)]')}
        >
          <SectionHead id="more-h" title={l.moreThanCode.headline}>
            {l.moreThanCode.lede}
          </SectionHead>
          <div className="grid grid-cols-1 gap-y-12 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            <ArtTile
              tone="blue"
              halftone="white"
              {...l.moreThanCode.items.plan}
            >
              <PlanArt />
            </ArtTile>
            <ArtTile
              tone="ink"
              halftone="yellow"
              {...l.moreThanCode.items.design}
            >
              <DesignArt />
            </ArtTile>
            <ArtTile tone="paper" {...l.moreThanCode.items.product}>
              <ProductArt />
            </ArtTile>
            <ArtTile tone="soft" {...l.moreThanCode.items.docs}>
              <DocsArt />
            </ArtTile>
            <ArtTile
              tone="teal"
              halftone="white"
              {...l.moreThanCode.items.history}
            >
              <HistoryArt />
            </ArtTile>
          </div>
        </section>

        <section
          aria-labelledby="calls-h"
          className={cn(GUTTER, 'landing-art pt-[clamp(64px,8vw,120px)]')}
        >
          <SectionHead id="calls-h" title={l.calls.headline}>
            {l.calls.lede}
          </SectionHead>
          <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-3">
            <ArtTile tone="soft" height="h-[290px]" {...l.calls.items.say}>
              <SayArt />
            </ArtTile>
            <ArtTile
              tone="blue"
              halftone="white"
              height="h-[290px]"
              {...l.calls.items.watch}
            >
              <WatchArt />
            </ArtTile>
            <ArtTile tone="orange" height="h-[290px]" {...l.calls.items.decide}>
              <DecideArt />
            </ArtTile>
          </div>
        </section>

        <section
          aria-labelledby="resume-h"
          className={cn(
            GUTTER,
            'landing-art grid items-center gap-x-16 gap-y-8 pt-[clamp(64px,8vw,120px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]',
          )}
        >
          <div>
            <h2 id="resume-h" className={cn(H2, 'mb-5')}>
              {l.resume.headline}
            </h2>
            <p className="m-0 max-w-[42ch] text-[18px] text-(--el-text-secondary)">
              {l.resume.body}
            </p>
          </div>
          <ArtTile
            tone="blue"
            halftone="white"
            tab={l.art.resume.tab}
            height="h-auto p-7"
          >
            <ResumeArt />
          </ArtTile>
        </section>

        <div className={cn(GUTTER, 'pt-[clamp(64px,8vw,120px)]')}>
          <section
            aria-labelledby="close-h"
            data-showcase="field"
            className="landing-art mk-halftone grid justify-items-center gap-5 overflow-hidden rounded-(--radius-card) border border-(--el-border) bg-(--el-showcase-field) shadow-(--shadow-card) px-[calc(var(--spacing-card-padding)*2)] py-[calc(var(--spacing-card-padding)*3)] text-center text-(--el-showcase-field-text)"
          >
            <h2 id="close-h" className={H2}>
              {l.close.headline}
              <span
                aria-hidden="true"
                className="ml-[0.03em] inline-block size-[0.15em] rounded-full bg-(--el-showcase-highlight) align-baseline"
              />
            </h2>
            <p className="m-0 max-w-[46ch] text-[18px] text-(--el-showcase-field-text)/85">
              {l.close.body}
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <a href="#hero-brief" className={CLOSE_BTN.primary}>
                {l.close.start}
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              <a href={IMPORT_DOOR} className={CLOSE_BTN.plain}>
                {l.close.import}
              </a>
              <a
                href={localizedPath(locale, HOW_IT_WORKS)}
                className={CLOSE_BTN.warm}
              >
                {l.close.developers}
              </a>
            </div>
            <p className="m-0 text-[14px] text-(--el-showcase-field-text)/85">
              {l.close.free.lead}{' '}
              <a
                href={FREE_DOOR}
                className="font-semibold text-(--el-showcase-field-text) underline underline-offset-2"
              >
                {l.close.free.cta}
              </a>{' '}
              {l.close.free.tail}
            </p>
            <a
              href={SOURCE_REPO}
              className="font-(family-name:--font-mono) text-[12px] tracking-[0.06em] text-(--el-showcase-field-text)/85 uppercase no-underline hover:underline"
            >
              {l.close.openCore}
            </a>
          </section>
        </div>
        <div className="h-[clamp(48px,6vw,88px)]" />
      </SiteShell>
    </>
  )
}

const CLOSE_BTN = {
  primary:
    'inline-flex items-center gap-2 rounded-(--radius-btn) bg-(--el-showcase-ground) h-(--height-btn-lg) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-ground-text) no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-field-text)',
  // The developers' door: the palette's warm decision fill and its own ink, so
  // it reads apart from the ink Start and the outlined import.
  warm: 'inline-flex items-center rounded-(--radius-btn) bg-(--el-showcase-decision) h-(--height-btn-lg) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-decision-text) no-underline hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-field-text)',
  plain:
    'inline-flex items-center rounded-(--radius-btn) border border-(--el-showcase-field-text)/40 h-(--height-btn-lg) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-field-text) no-underline hover:border-(--el-showcase-field-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-field-text)',
}

function SectionHead({
  id,
  title,
  children,
}: Readonly<{ id: string; title: string; children: React.ReactNode }>) {
  return (
    <div className="mb-[52px] grid items-end gap-x-14 gap-y-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <h2 id={id} className={H2}>
        {title}
      </h2>
      <p className="m-0 max-w-[44ch] text-[18px] text-(--el-text-secondary)">
        {children}
      </p>
    </div>
  )
}
