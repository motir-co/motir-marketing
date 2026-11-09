import { localizedPath } from '@/i18n/localizedPath'
import type { ReactNode } from 'react'
import { ArrowUpRight, Tag } from 'lucide-react'
import { cn } from '@motir/design-system'
import { useCopy, usePageLocale } from '@/lib/copy'
import {
  hasText,
  ideaFieldLang,
  ideasHref,
  ideaTextLang,
  type IdeaTranslatableField,
  sourceMonth,
  type IdeasParams,
  type PublicIdeaDto,
} from '@/lib/ideas'
import { CategoryMark, MONO } from './IdeaCards'
import { IdeaSheetIsland as IdeaSheet } from '@/app/_islands'

/*
 * An idea's full record, open in place over the list (MOTIR-7688). Every field
 * the contract carries, in the design's order; a field that is null or an
 * empty string is not drawn (the seeded directions carry `whyMotir: ""`).
 * Each field, claim and tag the store served in English on a page in another
 * language carries `lang="en"` on the element holding it (Story MOTIR-7772 ·
 * MOTIR-7777) — never on the sheet, so one English claim marks only itself.
 */

function Row({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="grid gap-2 border-t border-(--el-border) pt-4">
      <h3
        className={cn(
          MONO,
          'm-0 text-[11px] font-semibold tracking-[0.1em] text-(--el-text)',
        )}
      >
        {heading}
      </h3>
      {children}
    </section>
  )
}

const PROSE = 'm-0 text-[15px] leading-[1.55] text-(--el-text-secondary)'

export function IdeaDetail({
  idea,
  params,
}: {
  idea: PublicIdeaDto
  params: IdeasParams
}) {
  const copy = useCopy()
  const locale = usePageLocale()
  const d = copy.ideas.detail
  const titleId = `idea-title-${idea.slug}`
  const kind = idea.kind === 'motir_buys' ? d.kindBuys : d.kindDirection
  const [before, after] = d.foot.split('{key}')
  const prose: Array<[string, string | null, IdeaTranslatableField]> = [
    [d.gap, idea.gap, 'gap'],
    [d.whyNow, idea.whyNow, 'whyNow'],
    [d.whyMotir, idea.whyMotir, 'whyMotir'],
    [d.whoElse, idea.whoElse, 'whoElse'],
  ]

  return (
    <IdeaSheet
      slug={idea.slug}
      titleId={titleId}
      closeHref={localizedPath(locale, ideasHref(params, { idea: null }))}
      closeLabel={d.close}
      eyebrow={
        <p
          className={cn(
            MONO,
            'm-0 flex min-w-0 items-center gap-2 text-[11px] tracking-[0.06em] text-(--el-text-secondary)',
          )}
        >
          <CategoryMark slug={idea.category.slug} />
          <span className="truncate">
            {idea.category.label} · {kind}
          </span>
        </p>
      }
    >
      <h2
        id={titleId}
        lang={ideaFieldLang(locale, idea, 'title')}
        tabIndex={-1}
        className="m-0 font-(family-name:--font-serif) text-[clamp(28px,3vw,36px)] leading-[1.05] font-bold tracking-[-0.025em] focus:outline-none"
      >
        {idea.title}
      </h2>
      <p
        lang={ideaFieldLang(locale, idea, 'pitch')}
        className="m-0 text-[17px] leading-[1.5] text-(--el-text-secondary)"
      >
        {idea.pitch}
      </p>

      {idea.tags.length > 0 ? (
        <ul
          aria-label={copy.ideas.card.tagsAria}
          className="m-0 flex list-none flex-wrap gap-1.5 p-0"
        >
          {idea.tags.map((t) => (
            <li key={t.slug}>
              <a
                // Always a filtered address: a tag added to the list.
                rel="nofollow"
                href={localizedPath(
                  locale,
                  ideasHref(params, {
                    tags: params.tags.includes(t.slug)
                      ? params.tags
                      : [...params.tags, t.slug],
                    idea: null,
                  }),
                )}
                className="inline-flex min-h-[26px] items-center gap-1.5 rounded-(--radius-badge) border border-(--el-border-soft) bg-(--el-surface) px-(--spacing-chip-x) py-(--spacing-chip-y) text-[12px] font-medium text-(--el-text-secondary) no-underline hover:border-(--el-border-strong)"
              >
                <Tag aria-hidden className="size-3" />
                <span lang={ideaTextLang(locale, idea.locale, t.labelFallback)}>
                  {t.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {idea.capabilities.length > 0 ? (
        <Row heading={d.capabilities}>
          <ul className="m-0 grid list-none gap-2 p-0 text-[14.5px] leading-[1.45] text-(--el-text)">
            {idea.capabilities.map((line) => (
              <li
                key={line}
                lang={ideaFieldLang(locale, idea, 'capabilities')}
                className="grid grid-cols-[14px_minmax(0,1fr)] gap-2.5"
              >
                <i
                  aria-hidden="true"
                  className="mt-[7px] size-[7px] bg-(--el-showcase-field-ink)"
                />
                {line}
              </li>
            ))}
          </ul>
        </Row>
      ) : null}

      {idea.evidence.length > 0 ? (
        <Row heading={d.evidence}>
          <ol className="m-0 grid list-none gap-3 p-0">
            {idea.evidence.map((e) => {
              const month = sourceMonth(e.sourceDate)
              return (
                <li
                  key={`${e.url}-${e.claim}`}
                  className="grid gap-1.5 border-l-[3px] border-(--el-showcase-field) py-1 pl-3.5"
                >
                  <p
                    lang={ideaTextLang(locale, idea.locale, e.claimFallback)}
                    className="m-0 text-[16px] leading-[1.5] text-(--el-text)"
                  >
                    {e.claim}
                  </p>
                  <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-(--el-accent-on-surface) underline underline-offset-2"
                    >
                      {e.sourceName}
                      <ArrowUpRight aria-hidden className="size-3.5" />
                      <span className="sr-only">{d.opensInNewTab}</span>
                    </a>
                    {month ? (
                      <span className="font-(family-name:--font-mono) text-[12px] text-(--el-text-secondary)">
                        {month}
                      </span>
                    ) : null}
                  </p>
                </li>
              )
            })}
          </ol>
        </Row>
      ) : null}

      {prose.map(([heading, text, field]) =>
        hasText(text) ? (
          <Row key={heading} heading={heading}>
            <p lang={ideaFieldLang(locale, idea, field)} className={PROSE}>
              {text}
            </p>
          </Row>
        ) : null,
      )}

      <p className="m-0 mt-auto hidden text-[13px] text-(--el-text-secondary) md:block">
        {before}
        <kbd className="rounded-(--radius-kbd) border border-(--el-border-strong) bg-(--el-surface-soft) px-(--spacing-kbd-x) py-(--spacing-kbd-y) font-(family-name:--font-mono) text-[11px] font-semibold text-(--el-text)">
          Esc
        </kbd>
        {after}
      </p>
    </IdeaSheet>
  )
}
