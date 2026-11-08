import { localizedPath } from '@/i18n/localizedPath'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@motir/design-system'
import { useCopy, usePageLocale } from '@/lib/copy'
import {
  MOTIR_BUILDS_ITSELF,
  MOTIR_PROJECT,
  MOTIR_PROJECT_RUNS,
} from '@/lib/destinations'

/*
 * "Motir builds itself" (2026-10 redesign). Motir's own roadmap is planned,
 * built and shipped by Motir, and the project is public on app.motir.co — so
 * the strongest proof the landing can offer is a link straight into it. The
 * section sits right after Motir Project Manager: the product, then the
 * product doing it to itself.
 *
 * A quiet panel between two strong ones (the dark Project Manager ground
 * before it, the plan's accent field after it): the showcase wash with body
 * text, the accent only in the headline mark and the bullets, and the dark
 * ground as its one strong button. Card shape tokens, like the other panels.
 */

const MONO = 'font-(family-name:--font-mono) tracking-[0.1em] uppercase'

export function BuiltByMotirSection() {
  const b = useCopy().landing.builtByMotir
  const locale = usePageLocale()
  return (
    <section
      aria-labelledby="built-by-motir-h"
      data-showcase="wash"
      className="landing-art grid gap-x-16 gap-y-8 overflow-hidden rounded-(--radius-card) border border-(--el-border) bg-(--el-showcase-wash) p-[calc(var(--spacing-card-padding)*2)] text-(--el-showcase-text) shadow-(--shadow-card) lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-end"
    >
      <div>
        <p
          className={cn(
            MONO,
            'm-0 flex items-center gap-2.5 text-[12px] text-(--el-showcase-field-ink)',
          )}
        >
          <i
            aria-hidden="true"
            className="size-[9px] bg-(--el-showcase-field-ink)"
          />
          {b.eyebrow}
        </p>
        <h2
          id="built-by-motir-h"
          className="mt-4 mb-[18px] font-(family-name:--font-serif) text-[clamp(40px,5.4vw,88px)] leading-[0.94] font-bold tracking-[-0.035em] text-balance"
        >
          {b.headline}
        </h2>
        <p className="m-0 max-w-[48ch] text-[18px]">{b.body}</p>
        <a
          href={localizedPath(locale, MOTIR_BUILDS_ITSELF)}
          className="mt-5 inline-flex items-center gap-2 text-[16px] font-semibold text-(--el-showcase-field-ink) underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-ground)"
        >
          {b.story}
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>

      <div className="grid gap-6">
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {b.points.map((point) => (
            <li
              key={point}
              className="grid grid-cols-[18px_minmax(0,1fr)] gap-2.5"
            >
              <i
                aria-hidden="true"
                className="mt-2 size-2 bg-(--el-showcase-field-ink)"
              />
              {point}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2.5">
          <a
            href={MOTIR_PROJECT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-(--height-btn-lg) items-center gap-2 rounded-(--radius-btn) bg-(--el-showcase-ground) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-ground-text) no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-ground)"
          >
            {b.watch}
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
          <a
            href={MOTIR_PROJECT_RUNS}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-(--height-btn-lg) items-center rounded-(--radius-btn) border border-(--el-showcase-text)/30 px-(--spacing-btn-x) text-[15px] font-medium no-underline hover:border-(--el-showcase-text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-ground)"
          >
            {b.runs}
          </a>
          <a
            href="#hero-brief"
            className="inline-flex h-(--height-btn-lg) items-center gap-2 px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-field-ink) underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-ground)"
          >
            {b.start}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>
        <p className={cn(MONO, 'm-0 text-[11px] text-(--el-showcase-muted)')}>
          {b.note}
        </p>
      </div>
    </section>
  )
}
