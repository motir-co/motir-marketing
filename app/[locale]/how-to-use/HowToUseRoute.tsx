import { localizedPath } from '@/i18n/localizedPath'
import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'
import { ArrowRight } from 'lucide-react'
import { cn } from '@motir/design-system'
import { getCopy } from '@/lib/copy'
import { DOCS, HOW_IT_WORKS, SIGN_UP } from '@/lib/destinations'
import { SITE_HOST } from '@/lib/publicHost'
import { SiteShell } from '../../_components/SiteShell'
import { PART_TINT } from './_components/parts'
import { StackArtIsland } from '../../_islands'
import type { Way } from './_components/StackArt'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/*
 * "How to use Motir" — Motir's three parts, and the three ways to use them.
 * The project management tool is the middle; the planner plans into it and
 * the agent runner builds from it. A team can bring its own planner and
 * agents over MCP and use only the middle, add Motir's planner, or let Motir
 * run all three. Each way gets the same drawing (`StackArt`) with the parts
 * that are yours drawn as yours.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/how-to-use', (copy) => ({
    title: copy.howToUse.metaTitle,
    description: copy.howToUse.metaDescription,
  }))
}

const GUTTER = 'px-[clamp(16px,3vw,48px)]'
const H2 =
  'm-0 font-(family-name:--font-serif) text-[clamp(34px,4.4vw,64px)] leading-[0.98] font-bold tracking-[-0.04em] text-balance [word-break:auto-phrase]'
const MONO =
  'm-0 flex items-center gap-2.5 font-(family-name:--font-mono) text-[12px] tracking-[0.1em] text-(--el-text-secondary) uppercase'

// The part cards wear their part's tint, as the drawings do (`PART_TINT`).
// Written out so Tailwind can see the classes.
// A style that repaints every card (glassmorphism's frosted fill, retrofuturism's
// chrome) fills it from `--el-page-bg` / `--el-surface`, so each card points
// those at its tint too: the style draws its own material, in the part's colour.
const TINT_BG: Record<(typeof PART_TINT)[number], string> = {
  lavender:
    'bg-(--el-tint-lavender) [--el-page-bg:var(--el-tint-lavender)] [--el-surface:var(--el-tint-lavender)]',
  sky: 'bg-(--el-tint-sky) [--el-page-bg:var(--el-tint-sky)] [--el-surface:var(--el-tint-sky)]',
  mint: 'bg-(--el-tint-mint) [--el-page-bg:var(--el-tint-mint)] [--el-surface:var(--el-tint-mint)]',
}

// The ways, in the catalogue's order: each one's anchor and its links.
const WAYS: ReadonlyArray<{
  way: Way
  links: readonly [string, string]
  external?: boolean
}> = [
  { way: 'project-management', links: [`${DOCS}/mcp`, `${DOCS}/mcp/tools`] },
  { way: 'planner', links: [`${DOCS}/mcp`, `${DOCS}/cli`] },
  { way: 'all', links: [SIGN_UP, HOW_IT_WORKS], external: true },
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

export default async function HowToUsePage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const u = (await getCopy(locale)).howToUse
  return (
    <SiteShell host={SITE_HOST} className="bg-(--el-surface)">
      <section
        className={cn(
          GUTTER,
          'grid items-end gap-x-12 gap-y-6 pt-[clamp(40px,7vw,96px)] pb-[clamp(28px,4vw,48px)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]',
        )}
      >
        <div>
          <p className={cn(MONO, 'mb-[18px]')}>
            <Led />
            {u.eyebrow}
          </p>
          <h1 className="m-0 font-(family-name:--font-serif) text-[clamp(44px,6.4vw,104px)] leading-[0.94] font-bold tracking-[-0.045em] text-balance [word-break:auto-phrase]">
            {u.headline}
          </h1>
        </div>
        <p className="m-0 max-w-[46ch] pb-2 text-[clamp(17px,1.4vw,20px)] leading-normal">
          {u.lede}
        </p>
      </section>

      {/* The three parts, the middle one holding the plan. */}
      <section className={cn(GUTTER, 'pb-[clamp(40px,6vw,88px)]')}>
        <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {u.parts.map((part, i) => (
            <li
              key={part.name}
              data-surface="card"
              className={cn(
                'grid content-start gap-2 rounded-(--radius-card) border p-(--spacing-card-padding) shadow-(--shadow-card)',
                TINT_BG[PART_TINT[i]],
                i === 1
                  ? 'border-(--el-accent-on-surface)'
                  : 'border-(--el-border)',
              )}
            >
              <p className={MONO}>
                <Led />
                {part.lead}
              </p>
              <h2 className="m-0 font-(family-name:--font-serif) text-[24px] leading-[1.1] font-semibold tracking-[-0.03em]">
                {part.name}
              </h2>
              <p className="m-0 text-[15px] text-(--el-text-secondary)">
                {part.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="ways-h"
        className={cn(GUTTER, 'pb-[clamp(56px,7vw,104px)]')}
      >
        <h2 id="ways-h" className={cn(H2, 'mb-[clamp(28px,4vw,56px)]')}>
          {u.waysHeadline}
        </h2>
        <div className="grid gap-[clamp(56px,7vw,112px)]">
          {u.ways.map((way, i) => {
            const { way: id, links, external } = WAYS[i]
            return (
              <article
                key={id}
                id={id}
                aria-labelledby={`${id}-h`}
                className="grid scroll-mt-6 gap-6"
              >
                <div className="grid gap-3">
                  <p className={MONO}>
                    <a href={`#${id}`} className="text-inherit no-underline">
                      {way.label}
                    </a>
                  </p>
                  <h3 id={`${id}-h`} className={H2}>
                    {way.title}
                  </h3>
                </div>
                <div
                  data-surface="card"
                  data-tilt=""
                  className="overflow-hidden rounded-(--radius-card) border border-(--el-border) bg-(--el-page-bg) shadow-(--shadow-card)"
                >
                  <div className="overflow-x-auto">
                    <div className="min-w-[880px]">
                      <StackArtIsland way={id} t={u.art} />
                    </div>
                  </div>
                </div>
                <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <div className="grid content-start gap-3.5">
                    {way.paras.map((para) => (
                      <p key={para} className="m-0 max-w-[60ch] text-[17px]">
                        <Inline text={para} />
                      </p>
                    ))}
                  </div>
                  <div className="grid content-start gap-5">
                    <dl className="m-0 grid gap-4 sm:grid-cols-2">
                      {(
                        [
                          [u.youRun, way.you, true],
                          [u.motirRuns, way.motir, false],
                        ] as const
                      ).map(([heading, items, warm]) => (
                        <div key={heading} className="grid content-start gap-2">
                          <dt className={MONO}>
                            <Led warm={warm} />
                            {heading}
                          </dt>
                          {items.map((item) => (
                            <dd key={item} className="m-0 text-[15px]">
                              {item}
                            </dd>
                          ))}
                        </div>
                      ))}
                    </dl>
                    <div className="flex flex-wrap gap-2.5">
                      {way.links.map((label, k) => {
                        const href = links[k]
                        const offSite = external && k === 0
                        return (
                          <a
                            key={label}
                            href={offSite ? href : localizedPath(locale, href)}
                            className={cn(
                              'inline-flex h-(--height-btn-md) items-center gap-2 rounded-(--radius-btn) px-(--spacing-btn-x) text-[15px] font-medium no-underline',
                              k === 0
                                ? 'bg-(--el-accent) text-(--el-accent-text)'
                                : 'border border-(--el-border) text-(--el-text)',
                            )}
                          >
                            {label}
                            {k === 0 ? (
                              <ArrowRight
                                aria-hidden="true"
                                className="size-3.5"
                              />
                            ) : null}
                          </a>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </SiteShell>
  )
}
