import { localizedPath } from '@/i18n/localizedPath'
import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import { ArrowRight } from 'lucide-react'
import { cn } from '@motir/design-system'
import { getCopy } from '@/lib/copy'
import { DOCS, SIGN_UP } from '@/lib/destinations'
import { SITE_HOST } from '@/lib/publicHost'
import { SiteShell } from '../../_components/SiteShell'
import {
  ApproveArt,
  BoardArt,
  LearningArt,
  MemoryArt,
  PlannerArt,
  RepairArt,
  ReviewArt,
  RunArt,
} from './_components/ModuleArt'
import { RackStageIsland } from '../../_islands'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * "How Motir works" — the page for developers behind "vibe the project"
 * (2026-10 redesign). The landing sells the idea in plain words; this page
 * shows the machinery in the terms an engineer uses: the workflow drawn as one
 * instrument, then each module up close with what it does.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/how-it-works', (copy) => ({
    title: copy.howItWorks.metaTitle,
    description: copy.howItWorks.metaDescription,
  }))
}

const GUTTER = 'px-[clamp(16px,3vw,48px)]'
const H2 =
  'm-0 font-(family-name:--font-serif) text-[clamp(40px,5.4vw,84px)] leading-[0.95] font-bold tracking-[-0.04em] text-balance'

const ART = [
  PlannerArt,
  ApproveArt,
  BoardArt,
  RunArt,
  ReviewArt,
  RepairArt,
  LearningArt,
  MemoryArt,
]

/** Renders `code` spans written in backticks in the catalogue. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith('`') ? (
          <code
            key={i}
            className="rounded-(--radius-control) border border-(--el-border) bg-(--el-surface-soft) px-[5px] py-px font-(family-name:--font-mono) text-[0.84em] whitespace-nowrap"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}

function Led({ warm }: { warm?: boolean }) {
  return (
    <i
      aria-hidden="true"
      className={cn(
        'inline-block size-[7px] flex-none',
        warm ? 'bg-(--el-highlight)' : 'bg-(--el-accent-on-surface)',
      )}
    />
  )
}

export default async function HowItWorksPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const h = (await getCopy(locale)).howItWorks
  return (
    <>
      <SiteShell host={SITE_HOST} className="bg-(--el-surface)">
        <section
          className={cn(
            GUTTER,
            'grid items-end gap-x-12 gap-y-6 pt-[clamp(40px,7vw,96px)] pb-[clamp(28px,4vw,48px)] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]',
          )}
        >
          <div>
            <p className="mb-[18px] flex items-center gap-2.5 font-(family-name:--font-mono) text-[12px] tracking-[0.1em] text-(--el-text-secondary) uppercase">
              <Led />
              {h.eyebrow}
            </p>
            <h1 className="m-0 font-(family-name:--font-serif) text-[clamp(48px,7vw,112px)] leading-[0.92] font-bold tracking-[-0.045em] text-balance [word-break:auto-phrase]">
              <span className="mb-[0.12em] block text-[0.5em] tracking-[-0.035em] text-(--el-text-secondary)">
                <s className="decoration-[0.07em]">{h.headlineNot}</s>
              </span>
              <span className="block">{h.headline}</span>
            </h1>
          </div>
          <div className="grid gap-5 pb-2">
            <p className="m-0 max-w-[46ch] text-[clamp(17px,1.4vw,20px)] leading-normal">
              {h.lede}
            </p>
            <p className="m-0 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-medium text-(--el-text-secondary)">
              <span className="inline-flex items-center gap-2">
                <Led />
                {h.legendMotir}
              </span>
              <span className="inline-flex items-center gap-2">
                <Led warm />
                {h.legendYou}
              </span>
            </p>
          </div>
        </section>

        <div className={GUTTER}>
          <RackStageIsland />
        </div>

        <section
          aria-labelledby="modules-h"
          className={cn(GUTTER, 'landing-art pt-[clamp(56px,7vw,104px)]')}
        >
          <div className="mb-10 grid items-end gap-x-12 gap-y-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <h2 id="modules-h" className={H2}>
              {h.modulesHeadline}
            </h2>
            <p className="m-0 max-w-[46ch] text-(--el-text-secondary)">
              {h.modulesLede}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-y-14 sm:grid-cols-2 xl:grid-cols-4">
            {h.modules.map((module, i) => {
              const Art = ART[i]
              return (
                <article
                  key={module.step}
                  data-module-step={module.step}
                  className="group flex min-w-0 flex-col"
                >
                  <div aria-hidden="true">
                    <Art cap={module.label} />
                  </div>
                  <div className="grid content-start gap-2.5 pt-[22px] pr-[22px]">
                    <p className="m-0 flex items-center gap-2 font-(family-name:--font-mono) text-[11px] tracking-[0.1em] text-(--el-text-secondary) uppercase">
                      <Led warm={module.human} />
                      {module.label}
                    </p>
                    <h3 className="m-0 font-(family-name:--font-serif) text-[26px] leading-[1.05] font-semibold tracking-[-0.03em] decoration-[3px] underline-offset-[6px] group-[.on]:underline">
                      {module.title}
                    </h3>
                    {module.paras.map((para) => (
                      <p key={para} className="m-0 max-w-[46ch] text-[15px]">
                        <Inline text={para} />
                      </p>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <div
          className={cn(
            GUTTER,
            'pt-[clamp(56px,7vw,104px)] pb-[clamp(48px,6vw,88px)]',
          )}
        >
          <section
            aria-labelledby="open-h"
            data-showcase="ground"
            className="landing-art grid items-end gap-x-12 gap-y-7 rounded-(--radius-card) border border-(--el-border) bg-(--el-showcase-ground) p-[calc(var(--spacing-card-padding)*2)] text-(--el-showcase-ground-text) shadow-(--shadow-card) lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
          >
            <div>
              <h2 id="open-h" className={cn(H2, 'mb-3.5')}>
                {h.closeHeadline}
              </h2>
              <p className="m-0 max-w-[52ch]">{h.closeBody}</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <a
                href={SIGN_UP}
                className="inline-flex items-center gap-2 rounded-(--radius-btn) bg-(--el-showcase-highlight) h-(--height-btn-lg) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-ground) no-underline"
              >
                {h.closeStart}
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              <a
                href={localizedPath(locale, DOCS)}
                className="inline-flex items-center rounded-(--radius-btn) border border-current/30 h-(--height-btn-lg) px-(--spacing-btn-x) text-[15px] font-medium no-underline"
              >
                {h.closeDocs}
              </a>
              <a
                href={localizedPath(locale, `${DOCS}/mcp`)}
                className="inline-flex items-center rounded-(--radius-btn) border border-current/30 h-(--height-btn-lg) px-(--spacing-btn-x) text-[15px] font-medium no-underline"
              >
                {h.closeMcp}
              </a>
            </div>
          </section>
        </div>
      </SiteShell>
    </>
  )
}
