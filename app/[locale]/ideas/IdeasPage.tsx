import { ArrowDown } from 'lucide-react'
import { cn } from '@motir/design-system'
import { HeroBriefIsland, HeroWavesIsland } from '@/app/_islands'
import { SiteShell } from '@/app/_components/SiteShell'
import { format, useCopy, usePageLocale } from '@/lib/copy'
import { localizedPath } from '@/lib/localeMetadata'
import { SITE_HOST } from '@/lib/publicHost'
import {
  ideasHref,
  type IdeasParams,
  type PublicIdeaDto,
  type PublicIdeaListDto,
  type PublicIdeaTagListDto,
} from '@/lib/ideas'
import {
  Eyebrow,
  GUTTER,
  H2,
  PointGrid,
  ProductClose,
} from '../products/_components/ProductPage'
import { BuyCard, DirectionCard, MONO } from './_components/IdeaCards'
import { IdeaControls } from './_components/IdeaControls'
import { IdeaDetail } from './_components/IdeaDetail'
import { IdeasNavProvider, ResultsRegion } from './_components/IdeasNav'
import { IdeasEmpty, IdeasUnavailable } from './_components/IdeaStates'

/*
 * Ideas to build — read live from motir-core's idea store (Story MOTIR-7665;
 * the list MOTIR-7687, the idea open in place MOTIR-7688), as
 * `design/ideas/design-notes.md` draws it. Rendered per request by the Worker
 * since MOTIR-10755 (`worker/ideas/handler.tsx`), from the reads it has
 * already made.
 *
 * The products Motir would buy come first, in their own band; then every other
 * direction together in one list. A visitor narrows the page by category, by
 * tag and by text, and every narrowing is a URL (`?category=&tag=&q=`), so a
 * view can be shared, bookmarked and crawled. `?idea=<slug>` opens that idea's
 * full record in a sheet over the list, server-rendered so a shared link opens
 * straight to it.
 *
 * No copy of an idea lives in `messages/en.json`: the store is the only place
 * an idea lives. Every read asks for the page's locale (Story MOTIR-7772 ·
 * MOTIR-7777), and each field the store served in English is marked
 * `lang="en"` where it is drawn.
 */

/** What the page draws, as the handler read it. */
export interface IdeasView {
  params: IdeasParams
  /** `null` when motir-core did not answer the list read. */
  list: PublicIdeaListDto | null
  /** `null` when the tag read failed: the tag filters are then not drawn. */
  tags: PublicIdeaTagListDto | null
  /** The idea open in place, or `null`. */
  open: PublicIdeaDto | null
}

export function IdeasPage({ params, list, tags, open }: IdeasView) {
  const locale = usePageLocale()
  const i = useCopy().ideas
  const items = list?.items ?? []
  const buys = items.filter((idea) => idea.kind === 'motir_buys')
  const directions = items.filter((idea) => idea.kind === 'direction')

  return (
    <SiteShell host={SITE_HOST} overlayHeader>
      <IdeasNavProvider>
        <section
          aria-labelledby="ideas-h"
          className={cn(
            'relative isolate overflow-hidden pt-[calc(clamp(48px,6vw,96px)+4.75rem)] pb-[clamp(56px,7vw,112px)]',
            GUTTER,
          )}
        >
          <HeroWavesIsland />
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
                {i.eyebrow}
              </p>
              <h1
                id="ideas-h"
                className="m-0 font-(family-name:--font-serif) text-[clamp(44px,6.2vw,96px)] leading-[0.92] font-bold tracking-[-0.045em] text-balance"
              >
                {i.headline}
              </h1>
              <p
                data-hero-lede=""
                className="m-0 max-w-[56ch] text-[clamp(17px,1.4vw,20px)] text-(--el-text-secondary)"
              >
                {i.lede}
              </p>
              <HeroBriefIsland placeholder={i.placeholder} />
            </div>
            <div
              data-showcase="ground"
              data-tilt=""
              className="landing-art grid gap-5 rounded-(--radius-card) border border-(--el-border) bg-(--el-showcase-ground) p-[calc(var(--spacing-card-padding)*2)] text-(--el-showcase-ground-text) shadow-(--shadow-elevated)"
            >
              <p
                className={cn(
                  MONO,
                  'm-0 flex items-center gap-2.5 text-[12px]',
                )}
              >
                <i
                  aria-hidden="true"
                  className="size-[9px] bg-(--el-showcase-highlight)"
                />
                {i.promiseTitle}
              </p>
              <p className="m-0 max-w-[36ch] text-[clamp(20px,1.8vw,26px)] leading-[1.3]">
                {i.promiseBody}
              </p>
              {buys.length > 0 ? (
                <ul className="m-0 grid list-none gap-2 p-0">
                  {buys.map((idea, n) => (
                    <li key={idea.slug}>
                      <a
                        href={`#idea-${idea.slug}`}
                        className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-(--radius-control) border border-(--el-showcase-ground-rule) px-(--spacing-control-x) py-(--spacing-control-y) text-[15px] text-(--el-showcase-ground-text) no-underline hover:border-(--el-showcase-highlight) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--el-showcase-highlight)"
                      >
                        <span
                          className={cn(
                            MONO,
                            'text-[11px] text-(--el-showcase-ground-muted)',
                          )}
                        >
                          {String(n + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 truncate">
                          {idea.category.label}
                        </span>
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="rules-h"
          className={cn('py-[clamp(40px,5vw,80px)]', GUTTER)}
        >
          <div className="mx-auto grid max-w-[1400px] gap-8">
            <div className="grid gap-5">
              <Eyebrow>{i.rulesEyebrow}</Eyebrow>
              <h2 id="rules-h" className={H2}>
                {i.rulesHeadline}
              </h2>
            </div>
            <PointGrid items={i.rules} />
          </div>
        </section>

        <div className={cn('pb-[clamp(40px,5vw,80px)]', GUTTER)}>
          <div className="mx-auto max-w-[1400px]">
            {list ? (
              <IdeaControls
                params={params}
                total={list.total}
                categories={list.categories}
                tags={tags}
              />
            ) : (
              <IdeasUnavailable
                retryHref={localizedPath(locale, ideasHref(params))}
              />
            )}
          </div>
        </div>

        {list ? (
          <ResultsRegion>
            {list.total === 0 ? (
              <div className={cn('pb-[clamp(40px,5vw,80px)]', GUTTER)}>
                <div className="mx-auto max-w-[1400px]">
                  <IdeasEmpty />
                </div>
              </div>
            ) : null}

            {buys.length > 0 ? (
              <section
                aria-labelledby="list-h"
                className={cn('py-[clamp(40px,5vw,80px)]', GUTTER)}
              >
                <div className="mx-auto grid max-w-[1400px] gap-8">
                  <div className="grid gap-5">
                    <Eyebrow>
                      {format(i.listEyebrow, { n: buys.length })}
                    </Eyebrow>
                    <h2 id="list-h" className={H2}>
                      {i.listHeadline}
                    </h2>
                  </div>
                  <ol className="m-0 grid list-none gap-5 p-0 lg:grid-cols-2">
                    {buys.map((idea, n) => (
                      <BuyCard
                        key={idea.slug}
                        idea={idea}
                        index={n}
                        params={params}
                      />
                    ))}
                  </ol>
                </div>
              </section>
            ) : null}

            {directions.length > 0 ? (
              <section
                aria-labelledby="more-h"
                className={cn('py-[clamp(40px,5vw,80px)]', GUTTER)}
              >
                <div className="mx-auto grid max-w-[1400px] gap-8">
                  <div className="grid gap-5">
                    <Eyebrow>
                      {format(i.more.eyebrow, { n: directions.length })}
                    </Eyebrow>
                    <h2 id="more-h" className={H2}>
                      {i.more.headline}
                    </h2>
                    <p className="m-0 max-w-[60ch] text-[18px] text-(--el-text-secondary)">
                      {i.more.body}
                    </p>
                  </div>
                  <ul className="m-0 grid list-none gap-5 p-0 md:grid-cols-2 xl:grid-cols-3">
                    {directions.map((idea) => (
                      <DirectionCard
                        key={idea.slug}
                        idea={idea}
                        params={params}
                      />
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}
          </ResultsRegion>
        ) : null}

        <ProductClose headline={i.close.headline} body={i.close.body} />
        {open ? <IdeaDetail idea={open} params={params} /> : null}
      </IdeasNavProvider>
    </SiteShell>
  )
}
