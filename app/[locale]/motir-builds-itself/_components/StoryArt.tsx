import { localizedPath } from '@/i18n/localizedPath'
import { ArrowRight, Check, CornerDownRight, RefreshCw } from 'lucide-react'
import { cn } from '@motir/design-system'
import { useCopy, usePageLocale } from '@/lib/copy'
import { productPath, type ProductSlug } from '@/lib/destinations'
import { productOf } from '@/app/_components/products'

/*
 * The pictures on "Motir builds itself" (2026-10 redesign), in the landing's
 * flat showcase language: four small scenes of what vibe coding lost, and the
 * bootstrap staircase — each step built with the step before it. Every colour
 * is a design-system token and every shape a style token, so the pictures
 * follow theme, palette and style. Decorative: the copy beside each says the
 * same thing.
 */

const MONO = 'font-(family-name:--font-mono) tracking-[0.06em] uppercase'

/** One "what got lost" scene, by its index in `lost.items`. */
function LostScene({ i }: Readonly<{ i: number }>) {
  const scenes = useCopy().builtByMotirPage.lost.scenes
  if (i === 0)
    return (
      <div className="grid gap-2 font-(family-name:--font-mono) text-[11.5px]">
        <span className="rounded-(--radius-control) bg-(--el-showcase-ground) px-(--spacing-control-x) py-(--spacing-control-y) text-(--el-showcase-ground-text)">
          checkout.ts:42 TypeError
        </span>
        <span className="self-start rounded-(--radius-control) bg-(--el-showcase-paper) px-(--spacing-control-x) py-(--spacing-control-y) text-(--el-showcase-muted) line-through">
          {scenes.fixLater}
        </span>
      </div>
    )
  if (i === 1)
    return (
      <ul className="m-0 grid list-none gap-1.5 p-0 text-[11.5px]">
        {scenes.features.map((f) => (
          <li
            key={f}
            className="flex items-center justify-between gap-2 rounded-(--radius-control) bg-(--el-showcase-paper) px-2 py-0.5"
          >
            {f}
            <span
              className={cn(
                MONO,
                'text-[9.5px] text-(--el-showcase-decision-ink)',
              )}
            >
              {scenes.inProgress}
            </span>
          </li>
        ))}
      </ul>
    )
  if (i === 2)
    return (
      <ul className="m-0 grid list-none gap-1.5 p-0 text-[12px]">
        {['sign-in', 'reset', 'summary'].map((t, n) => (
          <li key={t} className="flex items-center gap-2">
            <span
              className={cn(
                'grid size-3.5 place-items-center rounded-(--radius-badge) border border-(--el-showcase-field-text)',
                n === 0 &&
                  'bg-(--el-showcase-field-text) text-(--el-showcase-field)',
              )}
            >
              {n === 0 ? <Check className="size-2.5" /> : null}
            </span>
            {t}.test
          </li>
        ))}
      </ul>
    )
  return (
    <div className="grid gap-1.5 text-[12px]">
      <span className="justify-self-end rounded-(--radius-card) bg-(--el-showcase-ground) px-3 py-1.5 text-(--el-showcase-ground-text)">
        {scenes.question}
      </span>
      <span className="rounded-(--radius-card) bg-(--el-showcase-paper) px-3 py-1.5 opacity-70">
        {scenes.answer}
      </span>
      <span className={cn(MONO, 'text-[10px] opacity-70')}>
        {scenes.sessionEnded}
      </span>
    </div>
  )
}

const LOST_TONES = [
  'bg-(--el-showcase-wash-warm) text-(--el-showcase-text)',
  'bg-(--el-showcase-wash) text-(--el-showcase-text)',
  'bg-(--el-showcase-field) text-(--el-showcase-field-text)',
  'bg-(--el-showcase-wash) text-(--el-showcase-text)',
] as const
const LOST_SHOWCASE = ['wash-warm', 'wash', 'field', 'wash'] as const

export function LostTiles() {
  const b = useCopy().builtByMotirPage
  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {b.lost.items.map((item, i) => (
        <li key={item.title} className="grid content-start gap-3">
          <div
            aria-hidden="true"
            data-showcase={LOST_SHOWCASE[i]}
            data-tilt=""
            className={cn(
              'landing-art grid h-[150px] content-center rounded-(--radius-card) border border-(--el-border) p-(--spacing-card-padding) shadow-(--shadow-card)',
              LOST_TONES[i],
            )}
          >
            <LostScene i={i} />
          </div>
          <b className="text-[18px] leading-[1.2] font-semibold text-(--el-text)">
            {item.title}
          </b>
          <span className="text-[15px] text-(--el-text-secondary)">
            {item.body}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** The three things we needed, each as a numbered row. */
export function NeedList() {
  const copy = useCopy()
  const locale = usePageLocale()
  const b = copy.builtByMotirPage
  return (
    <ol className="m-0 grid list-none gap-3 p-0">
      {b.missing.items.map((item, i) => (
        <li
          key={item.title}
          data-surface="card"
          className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-(--radius-card) border border-(--el-border) bg-(--el-card) p-(--spacing-card-padding) shadow-(--shadow-card)"
        >
          <span
            className={cn(
              MONO,
              'row-span-2 text-[12px] text-(--el-accent-on-surface)',
            )}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <b className="text-[17px] leading-[1.25] font-semibold text-(--el-text)">
            {item.title}
          </b>
          <span className="text-[15px] text-(--el-text-secondary)">
            {item.body}
          </span>
          {'product' in item && item.product ? (
            <a
              href={localizedPath(
                locale,
                productPath(item.product as ProductSlug),
              )}
              className="col-start-2 mt-1 inline-flex items-center gap-1.5 justify-self-start text-[14px] font-semibold text-(--el-accent-on-surface) underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)"
            >
              {productOf(item.product as ProductSlug, copy).name}
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

/**
 * The bootstrap staircase: each step climbs one stair, and each says what it
 * was built WITH — the step before it.
 */
export function Staircase() {
  const b = useCopy().builtByMotirPage
  const steps = b.bootstrap.steps
  return (
    <div className="grid gap-6">
      <ol className="m-0 grid list-none items-end gap-3 p-0 lg:grid-cols-5">
        {steps.map((step, i) => {
          const last = i === steps.length - 1
          return (
            <li
              key={step.title}
              className="grid content-end"
              style={{ ['--climb' as string]: `${i * 44}px` }}
            >
              <div
                data-showcase={last ? 'field' : i === 0 ? 'ground' : 'paper'}
                data-tilt=""
                className={cn(
                  'landing-art grid gap-2 rounded-(--radius-card) border border-(--el-border) p-(--spacing-card-padding) shadow-(--shadow-card) lg:mb-(--climb)',
                  last
                    ? 'mk-halftone bg-(--el-showcase-field) text-(--el-showcase-field-text)'
                    : i === 0
                      ? 'bg-(--el-showcase-ground) text-(--el-showcase-ground-text)'
                      : 'bg-(--el-showcase-paper) text-(--el-showcase-text)',
                )}
              >
                <span className={cn(MONO, 'text-[11px]')}>{step.tag}</span>
                <b className="font-(family-name:--font-serif) text-[22px] leading-[1.1] font-bold tracking-[-0.02em]">
                  {step.title}
                </b>
                <span className="text-[14px] leading-[1.45]">{step.body}</span>
                <span
                  className={cn(
                    MONO,
                    'mt-1 flex items-center gap-1.5 border-t pt-2 text-[10.5px]',
                    i === 0
                      ? 'border-(--el-showcase-ground-rule)'
                      : last
                        ? 'border-(--el-showcase-field-text)/30'
                        : 'border-(--el-showcase-rule)',
                  )}
                >
                  <CornerDownRight
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                  />
                  {step.uses}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-medium text-(--el-text)">
        <RefreshCw
          aria-hidden="true"
          className="size-4 text-(--el-accent-on-surface)"
        />
        {b.bootstrap.loop.map((part, i) => (
          <span key={part} className="inline-flex items-center gap-2">
            {i > 0 ? (
              <ArrowRight
                aria-hidden="true"
                className="size-4 text-(--el-text-secondary)"
              />
            ) : null}
            {part}
          </span>
        ))}
      </p>
    </div>
  )
}
