import { localizedPath } from '@/i18n/localizedPath'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@motir/design-system'
import { useCopy, usePageLocale } from '@/lib/copy'
import { productPath, type ProductSlug } from '@/lib/destinations'
import { HeroBriefIsland, HeroWavesIsland } from '../../../_islands'
import { PRODUCT_MARK, productOf } from '../../../_components/products'

/*
 * The parts every product page is built from (2026-10 redesign): the hero —
 * which opens the page under the overlaid header (`SiteShell overlayHeader`),
 * so its top padding adds the header's 4.75rem —
 * the product's name with its mark, a headline, the idea box and a picture on
 * the wave field — then sections of a headline, copy and a picture, the
 * products it works with, and a closing band. Each product page composes them
 * with its own copy and pictures, the same flat showcase language as the
 * landing, every colour a design-system token and every shape a style token.
 */

export const GUTTER = 'px-[clamp(16px,3vw,48px)]'
export const H2 =
  'm-0 font-(family-name:--font-serif) text-[clamp(36px,4.6vw,72px)] leading-[0.96] font-bold tracking-[-0.035em] text-balance'
const MONO = 'font-(family-name:--font-mono) tracking-[0.1em] uppercase'

export function Eyebrow({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <p
      className={cn(
        MONO,
        'm-0 text-[12px] text-(--el-text-secondary)',
        className,
      )}
    >
      {children}
    </p>
  )
}

/** A link out to app.motir.co: a new tab, with the arrow that says so. */
export function OutLink({
  href,
  children,
  className,
}: Readonly<{ href: string; children: React.ReactNode; className?: string }>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 text-[15px] font-medium text-(--el-accent-on-surface) underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)',
        className,
      )}
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-4" />
    </a>
  )
}

export function ProductHero({
  slug,
  headline,
  lede,
  art,
  extra,
}: Readonly<{
  slug: ProductSlug
  headline: string
  lede: string
  art: React.ReactNode
  extra?: React.ReactNode
}>) {
  const product = productOf(slug, useCopy())
  return (
    <section
      aria-labelledby="product-h"
      className={cn(
        'relative isolate overflow-hidden pt-[calc(clamp(48px,6vw,96px)+4.75rem)] pb-[clamp(56px,7vw,112px)]',
        GUTTER,
      )}
    >
      <HeroWavesIsland />
      <div className="mx-auto grid max-w-[1400px] items-center gap-x-[clamp(32px,5vw,80px)] gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <p className={cn(MONO, 'm-0 flex items-center gap-2.5 text-[12px]')}>
            <i
              aria-hidden="true"
              className={cn('size-[10px]', PRODUCT_MARK[slug])}
            />
            <span className="text-(--el-text-secondary)">{product.group}</span>
            <span aria-hidden="true" className="text-(--el-text-secondary)">
              /
            </span>
            <span className="text-(--el-text)">{product.name}</span>
          </p>
          <h1
            id="product-h"
            className="m-0 font-(family-name:--font-serif) text-[clamp(44px,6.2vw,96px)] leading-[0.92] font-bold tracking-[-0.045em] text-balance"
          >
            {headline}
          </h1>
          <p
            data-hero-lede=""
            className="m-0 max-w-[50ch] text-[clamp(17px,1.4vw,20px)] text-(--el-text-secondary)"
          >
            {lede}
          </p>
          <HeroBriefIsland />
          {extra}
        </div>
        <div>{art}</div>
      </div>
    </section>
  )
}

export function ProductSection({
  id,
  eyebrow,
  headline,
  body,
  art,
  flip,
  children,
}: Readonly<{
  id: string
  eyebrow: string
  headline: string
  body?: string
  art?: React.ReactNode
  flip?: boolean
  children?: React.ReactNode
}>) {
  return (
    <section
      aria-labelledby={`${id}-h`}
      className={cn('py-[clamp(48px,6vw,96px)]', GUTTER)}
    >
      <div
        className={cn(
          'mx-auto grid max-w-[1400px] items-center gap-x-[clamp(32px,5vw,80px)] gap-y-10',
          art && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
        )}
      >
        <div className={cn('grid content-start gap-5', flip && 'lg:order-2')}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 id={`${id}-h`} className={H2}>
            {headline}
          </h2>
          {body ? (
            <p className="m-0 max-w-[52ch] text-[18px] text-(--el-text-secondary)">
              {body}
            </p>
          ) : null}
        </div>
        {art ? <div>{art}</div> : null}
        {children ? <div className="lg:col-span-2">{children}</div> : null}
      </div>
    </section>
  )
}

/** A numbered row of short cards: the steps, or what something holds. */
export function PointGrid({
  items,
  numbered,
}: Readonly<{
  items: ReadonlyArray<{ title: string; body: string }>
  numbered?: boolean
}>) {
  return (
    <ol
      className={cn(
        'm-0 grid list-none gap-3 p-0 sm:grid-cols-2',
        items.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
      )}
    >
      {items.map((point, i) => (
        <li
          key={point.title}
          data-surface="card"
          className="grid content-start gap-2 rounded-(--radius-card) border border-(--el-border) bg-(--el-card) p-(--spacing-card-padding) shadow-(--shadow-card)"
        >
          {numbered ? (
            <span
              className={cn(MONO, 'text-[11px] text-(--el-text-secondary)')}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
          ) : null}
          <b className="text-[18px] leading-[1.2] font-semibold tracking-[-0.01em] text-(--el-text)">
            {point.title}
          </b>
          <span className="text-[15px] text-(--el-text-secondary)">
            {point.body}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function WorksWith({ slugs }: Readonly<{ slugs: ProductSlug[] }>) {
  const copy = useCopy()
  const locale = usePageLocale()
  return (
    <section
      aria-labelledby="works-with-h"
      className={cn('py-[clamp(40px,5vw,72px)]', GUTTER)}
    >
      <div className="mx-auto grid max-w-[1400px] gap-5">
        <h2 id="works-with-h" className="m-0">
          <Eyebrow>{copy.products.worksWith}</Eyebrow>
        </h2>
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
          {slugs.map((slug) => {
            const product = productOf(slug, copy)
            return (
              <li key={slug}>
                <a
                  href={localizedPath(locale, productPath(slug))}
                  className="grid h-full grid-cols-[12px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 rounded-(--radius-card) border border-(--el-border) bg-(--el-card) p-(--spacing-card-padding) no-underline shadow-(--shadow-card) hover:border-(--el-border-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-accent-on-surface)"
                >
                  <i
                    aria-hidden="true"
                    className={cn('mt-1.5 size-3', PRODUCT_MARK[slug])}
                  />
                  <b className="text-[16px] font-semibold text-(--el-text)">
                    {product.name}
                  </b>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-1 size-4 text-(--el-text-secondary)"
                  />
                  <span className="col-start-2 text-[14px] text-(--el-text-secondary)">
                    {product.blurb}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

export function ProductClose({
  headline,
  body,
  extra,
}: Readonly<{ headline: string; body: string; extra?: React.ReactNode }>) {
  const copy = useCopy()
  return (
    <div
      className={cn(
        'pt-[clamp(24px,3vw,40px)] pb-[clamp(56px,7vw,112px)]',
        GUTTER,
      )}
    >
      <section
        aria-labelledby="product-close-h"
        data-showcase="field"
        className="landing-art mk-halftone mx-auto grid max-w-[1400px] gap-6 overflow-hidden rounded-(--radius-card) border border-(--el-border) bg-(--el-showcase-field) p-[calc(var(--spacing-card-padding)*2)] text-(--el-showcase-field-text) shadow-(--shadow-card) md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
      >
        <div className="grid gap-3">
          <h2
            id="product-close-h"
            className="m-0 font-(family-name:--font-serif) text-[clamp(40px,5.4vw,80px)] leading-[0.94] font-bold tracking-[-0.035em]"
          >
            {headline}
          </h2>
          <p className="m-0 max-w-[44ch] text-[18px]">{body}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#hero-brief"
            className="inline-flex h-(--height-btn-lg) items-center gap-2 rounded-(--radius-btn) bg-(--el-showcase-field-text) px-(--spacing-btn-x) text-[15px] font-medium text-(--el-showcase-field) no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-field-text)"
          >
            {copy.products.start}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
          {extra}
        </div>
      </section>
    </div>
  )
}
