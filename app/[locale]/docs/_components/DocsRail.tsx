'use client'

import { localizedPath } from '@/i18n/localizedPath'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSitePathname } from '@/i18n/sitePathname'
import { type Copy, format, useCopy, usePageLocale } from '@/lib/copy'
import type { RailOperation } from '@/lib/docs'
import { docsIndexFor, docsSurfacesFor } from '@/lib/docsSurfaces'

/*
 * THE DOCS RAIL (MOTIR-4396) — built to `design/docs/design-notes.md`
 * § "The one structural change: a RAIL beside the column" and § "THE NAVIGATION
 * ANSWER (panel 4)".
 *
 * ⚠️ WHAT IT REPLACES, AND WHY A FLAT ROW WAS NOT A STYLING PROBLEM.
 * `DocsNav` rendered the nine page links as one wrapped horizontal row above
 * the content, and that was survivable while `/docs/api` was a short list of
 * `METHOD /path — summary`. MOTIR-4391 gave each of the forty-nine operations
 * its parameters, its body schema, its response set and an example, so the page
 * grew by an order of magnitude and the only way to reach the forty-ninth
 * operation became scrolling past forty-eight. The rail is the answer the
 * design asset settles: a persistent table of contents that a filter narrows.
 *
 * ── The three tiers, and what decides them ─────────────────────────────────
 * Tier 1 `Documentation` — one row per SURFACE, on every page in the area.
 * Tier 2 the surface's own pages — only inside that surface.
 * Tier 3 the operation rows — only where operations were passed.
 *
 * ⚠️ TIERS 2 AND 3 ARE DECIDED BY THE ROUTE PREFIX, NOT BY THE PAGE, and since
 * MOTIR-4396 that is STRUCTURAL rather than a convention: the operation tier is
 * passed by `app/docs/api/layout.tsx`, which Next renders if and only if the
 * route is `/docs/api` or below. A page added anywhere else cannot acquire the
 * operation list by accident, because there is no code path that would give it
 * one. Tier 2 reads `usePathname()` for the same reason it is drawn: a reader
 * needs to see which sub-area they are in.
 *
 * ── Why this is a CLIENT component ─────────────────────────────────────────
 * Only for the filter and the current-row highlight. It receives the operation
 * list as plain serialisable data — the rail never fetches, and nothing about
 * the API surface is written down in this repository.
 */

/**
 * The surfaces the area documents. Tier 1, on every page.
 *
 * ⚠️ NOT DECLARED HERE ANY MORE (MOTIR-4507). This constant used to hold the
 * list, and the index page held a second copy of the same fact — which is how
 * `/docs/public-address` reached the rail and never reached the index. The list
 * lives in `lib/docsSurfaces.ts`, a directive-free module both sides import;
 * declaring it inside this client component is precisely what put it out of the
 * server-rendered index's reach.
 */
const surfacesFor = (copy: Copy): { href: string; label: string }[] => [
  docsIndexFor(copy),
  ...docsSurfacesFor(copy),
]

/**
 * Tier 2 — a surface's own pages, keyed by the route PREFIX that owns them.
 *
 * ⚠️ THE `mcp` ENTRY IS A DEVIATION FROM THE ASSET'S PANELS, AND A FOLLOWING OF
 * ITS RULE. `design-notes.md`'s tier table says tier 2 lists "that surface's own
 * pages" and its panels draw only the `API reference` instance — so the MCP
 * sub-area, which has exactly one own page (`MCP tools`), is drawn nowhere. Left
 * literal, the asset would have dropped `/docs/mcp/tools` out of the navigation
 * entirely, taking the page count from nine to eight and breaking that card's
 * "the nine existing page links remain present and working". Following the RULE
 * rather than the panel keeps all nine. Recorded on MOTIR-4396.
 *
 * ⚠️ AND IT IS NOW DERIVED, NOT LISTED (MOTIR-4507): every surface that HAS own
 * pages gets a tier-2 group, so the rule above is applied by construction
 * rather than by an author remembering it for the next sub-area.
 */
const subPagesFor = (
  copy: Copy,
): {
  prefix: string
  heading: string
  pages: { href: string; label: string }[]
}[] =>
  docsSurfacesFor(copy)
    .filter((surface) => surface.pages.length > 0)
    .map((surface) => ({
      prefix: surface.href,
      heading: surface.label,
      pages: surface.pages,
    }))

const METHOD_TINT: Record<string, string> = {
  GET: 'bg-(--el-tint-sky)',
  POST: 'bg-(--el-tint-mint)',
  PATCH: 'bg-(--el-tint-peach)',
  PUT: 'bg-(--el-tint-peach)',
  DELETE: 'bg-(--el-tint-rose)',
}

const ROW =
  'flex min-h-(--height-control) items-center gap-2 rounded-(--radius-control) px-(--spacing-control-x) text-[13px] no-underline'
const ROW_REST = 'text-(--el-text-secondary) hover:bg-(--el-muted)'
const ROW_CURRENT =
  'bg-(--el-muted) font-semibold text-(--el-text) shadow-(--shadow-subtle)'

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wide text-(--el-text-secondary) uppercase">
      {children}
    </p>
  )
}

export function DocsRail({
  operations,
}: {
  /** The operation tier. Absent everywhere except under `/docs/api`. */
  operations?: readonly { group: string; operations: RailOperation[] }[]
}) {
  const copy = useCopy()
  const locale = usePageLocale()
  const pathname = useSitePathname()
  const [query, setQuery] = useState('')
  const [narrowOpen, setNarrowOpen] = useState(false)
  const filterRef = useRef<HTMLInputElement>(null)

  /*
   * The `/` shortcut, because the asset DRAWS a `/` hint and a hint for a
   * shortcut that does not exist is worse than no hint. Ignored while the
   * reader is already typing into a field, so it cannot eat a character.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      const active = document.activeElement
      const typing =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      if (typing) return
      event.preventDefault()
      filterRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const total = useMemo(
    () => (operations ?? []).reduce((n, g) => n + g.operations.length, 0),
    [operations],
  )

  /**
   * The filter narrows IN PLACE and KEEPS its group headings — panel 4 ①. A
   * group whose every row is filtered out is dropped, because a heading over
   * nothing is a claim that the group is empty.
   */
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return operations ?? []
    return (operations ?? [])
      .map((group) => ({
        ...group,
        operations: group.operations.filter(
          (operation) =>
            operation.path.toLowerCase().includes(needle) ||
            operation.method.toLowerCase().includes(needle) ||
            group.group.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.operations.length > 0)
  }, [operations, query])

  const shownCount = shown.reduce((n, g) => n + g.operations.length, 0)

  return (
    <nav
      aria-label={copy.docs.indexTitle}
      /* ⚠️ THIS ELEMENT PAINTS THE SURFACE AND NOTHING ELSE — no `sticky`, no
         `max-h`, no padding (MOTIR-4432). It is a grid item in a STRETCHED row
         (`DocsShell.tsx`), so the tint and the right border run the full height
         of the reading column beside it, which is what makes it read as a
         sidebar rather than a box that failed to grow. The scrolling, sticking
         region is the wrapper below. Putting either job back on the other
         element re-opens one of the two defects: `position: sticky` on a
         full-height item never engages, and shrinking this one to fit its rows
         ends the tint mid-page. */
      className="border-b border-(--el-border) bg-(--el-sidebar-bg) md:border-r md:border-b-0"
    >
      {/* Sticky on the wide layout; static and above the content when narrow, so
          it never overlays what it navigates (panel 7). */}
      <div className="px-3.5 py-4 md:sticky md:top-0 md:max-h-dvh md:overflow-y-auto md:py-5">
        {operations ? (
          <>
            <label className="sr-only" htmlFor="docs-operation-filter">
              {copy.docs.filterOperations}
            </label>
            <div className="flex h-(--height-input) items-center gap-2 rounded-(--radius-input) border border-(--el-border-strong) bg-(--el-page-bg) px-(--spacing-input-x)">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="shrink-0 text-(--el-text-secondary)"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="docs-operation-filter"
                ref={filterRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={copy.docs.filterOperations}
                className="w-full border-0 bg-transparent text-[13px] text-(--el-text) outline-none placeholder:text-(--el-text-secondary)"
              />
              {/* Decorative: the affordance is the input, which is already
                focusable and labelled. The hint is for a reader who knows the
                shortcut convention. */}
              <kbd
                aria-hidden="true"
                className="rounded-(--radius-kbd) border border-(--el-border) px-(--spacing-kbd-x) py-(--spacing-kbd-y) font-(family-name:--font-mono) text-[10px] text-(--el-text-secondary)"
              >
                /
              </kbd>
            </div>
            {/* The count reports the NARROWED set against the whole — panel 4 ①.
              A filter that hides its own selectivity is how a reader concludes
              an operation does not exist. `aria-live` so the number reaches a
              screen reader as it changes, which is the only way the filter's
              effect is perceivable without sight. */}
            <p
              aria-live="polite"
              className="mt-2 mb-3.5 px-0.5 text-[11.5px] text-(--el-text-secondary)"
            >
              {shownCount === total
                ? format(copy.docs.operationCount, { count: total })
                : format(copy.docs.operationCountFiltered, {
                    shown: shownCount,
                    total,
                  })}
            </p>
          </>
        ) : null}

        <GroupHeading>{copy.docs.indexTitle}</GroupHeading>
        <ul className="mb-1 list-none p-0">
          {surfacesFor(copy).map((surface) => {
            const current = pathname === surface.href
            return (
              <li key={surface.href}>
                <a
                  href={localizedPath(locale, surface.href)}
                  aria-current={current ? 'page' : undefined}
                  className={`${ROW} ${current ? ROW_CURRENT : ROW_REST}`}
                >
                  {surface.label}
                </a>
              </li>
            )
          })}
        </ul>

        {subPagesFor(copy)
          .filter(
            (area) =>
              pathname === area.prefix ||
              pathname.startsWith(`${area.prefix}/`),
          )
          .map((area) => (
            <div key={area.prefix} className="mt-4.5">
              <GroupHeading>{area.heading}</GroupHeading>
              <ul className="mb-1 list-none p-0">
                {area.pages.map((page) => {
                  const current = pathname === page.href
                  return (
                    <li key={page.href}>
                      <a
                        href={localizedPath(locale, page.href)}
                        aria-current={current ? 'page' : undefined}
                        className={`${ROW} ${current ? ROW_CURRENT : ROW_REST}`}
                      >
                        {page.label}
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

        {/* Tier 3. Hidden below the docs breakpoint behind a disclosure, so the
          narrow layout does not open with forty-nine rows before its content
          (panel 7). */}
        {operations ? (
          <div className="mt-4.5">
            {/* ⚠️ NARROW COLLAPSES, WIDE DOES NOT — panel 7. A `<details open>`
              cannot be conditional on the viewport, so the disclosure is
              explicit: the button is `md:hidden`, and the list is hidden below
              the breakpoint until it is pressed and always shown above it. The
              rail sits ABOVE the content when narrow, so an expanded list would
              push the page a reader came to read off the screen — the asset's
              "it never overlays the content it navigates" has a sibling
              obligation not to bury it either. */}
            <button
              type="button"
              aria-expanded={narrowOpen}
              aria-controls="docs-operation-tier"
              onClick={() => setNarrowOpen((open) => !open)}
              className="mb-2 flex min-h-(--height-control) w-full cursor-pointer items-center justify-between rounded-(--radius-control) border border-(--el-border) bg-(--el-page-bg) px-(--spacing-control-x) text-[13px] font-semibold text-(--el-text) md:hidden"
            >
              <span>
                {copy.docs.api} ·{' '}
                {format(copy.docs.operationCount, { count: total })}
              </span>
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className={narrowOpen ? 'rotate-180' : undefined}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div
              id="docs-operation-tier"
              className={narrowOpen ? 'block' : 'hidden md:block'}
            >
              {shown.map((group) => (
                <div key={group.group} className="mt-3.5 first:mt-0">
                  <GroupHeading>{group.group}</GroupHeading>
                  <ul className="mb-1 list-none p-0">
                    {group.operations.map((operation) => (
                      <li key={operation.id}>
                        <a
                          href={localizedPath(
                            locale,
                            `/docs/api#${operation.id}`,
                          )}
                          className={`${ROW} ${ROW_REST}`}
                        >
                          <span
                            className={`shrink-0 rounded-(--radius-badge) px-1.5 py-0.5 text-center font-(family-name:--font-mono) text-[9.5px] leading-none font-bold tracking-wide text-(--el-text-strong) ${
                              METHOD_TINT[operation.method] ?? 'bg-(--el-muted)'
                            }`}
                            style={{ minWidth: '40px' }}
                          >
                            {operation.method}
                          </span>
                          <span className="truncate font-(family-name:--font-mono) text-[12px]">
                            {operation.path}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {shownCount === 0 ? (
                <p className="px-2 text-[12.5px] text-(--el-text-secondary)">
                  {copy.docs.filterEmpty}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
