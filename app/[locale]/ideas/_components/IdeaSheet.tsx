'use client'

import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { filterLinkRel } from '@/lib/crawlPolicy'
import { returnFocusTo, takeOpenedFromList } from './IdeasNavigator'

/*
 * The side sheet an idea opens in (MOTIR-7688) — `design/ideas/design-notes.md`
 * § The idea open in place.
 *
 * ⚠️ IT IS SERVER-RENDERED HTML, NOT A PORTAL. `?idea=<slug>` is a shareable
 * address, so the sheet must be in the first paint of a shared link and must
 * work with no JavaScript (its close control is then a plain link to the URL
 * without `idea`). A portal-based dialog renders nothing on the server, so it
 * would open a shared link to the bare list and let it pop in after hydration.
 * This component only ADDS behaviour to markup that is already there:
 *
 *  · close — the close control, Escape and a click on the scrim all close it.
 *    When the sheet was opened from a card in this session the open was a
 *    navigation from the list, so closing goes `history.back()` and Back/close
 *    agree; when it was loaded from a link there is nothing behind it, so
 *    closing REPLACES the URL with the list's (`location.replace`). Since
 *    MOTIR-10755 both are full navigations to the page the Worker renders.
 *  · focus — moves to the title on open, is held inside the sheet while it is
 *    open, and returns to the card that opened it (or the "Find an idea"
 *    heading) on the list page it closes to (`IdeasNavigator`).
 *  · the page behind does not scroll while it is open.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function IdeaSheet({
  slug,
  titleId,
  closeHref,
  closeLabel,
  eyebrow,
  children,
}: {
  slug: string
  titleId: string
  /** The same view without `idea` — the filters stay. */
  closeHref: string
  closeLabel: string
  eyebrow: ReactNode
  children: ReactNode
}) {
  const sheetRef = useRef<HTMLElement>(null)
  const fromList = useRef(false)

  useEffect(() => {
    fromList.current = takeOpenedFromList(slug)
    const title = document.getElementById(titleId)
    title?.focus({ preventScroll: true })
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [slug, titleId])

  const close = useCallback(() => {
    returnFocusTo(slug)
    if (fromList.current) window.history.back()
    else window.location.replace(closeHref)
  }, [slug, closeHref])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab' || !sheetRef.current) return
      const items = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const inside = sheetRef.current.contains(active)
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <div className="fixed inset-0 z-50" data-idea-sheet={slug}>
      <a
        href={closeHref}
        rel={filterLinkRel(closeHref)}
        aria-hidden="true"
        tabIndex={-1}
        onClick={(event) => {
          event.preventDefault()
          close()
        }}
        className="absolute inset-0 hidden bg-(--el-overlay-scrim) md:block"
      />
      <aside
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-surface="modal"
        className="absolute inset-0 flex flex-col gap-[18px] overflow-y-auto overscroll-contain bg-(--el-card) px-4 pt-5 pb-10 text-(--el-text) md:inset-y-0 md:right-0 md:left-auto md:w-[640px] md:max-w-full md:rounded-l-(--radius-modal) md:border-l md:border-(--el-border) md:p-[calc(var(--spacing-card-padding)*1.5)] md:shadow-(--shadow-modal)"
      >
        <div className="flex items-center justify-between gap-3">
          {eyebrow}
          <a
            href={closeHref}
            rel={filterLinkRel(closeHref)}
            aria-label={closeLabel}
            onClick={(event) => {
              event.preventDefault()
              close()
            }}
            className="inline-flex size-9 flex-none items-center justify-center rounded-(--radius-control) border border-(--el-border) text-(--el-text) hover:border-(--el-border-strong) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring-color)"
          >
            <X aria-hidden className="size-4" />
          </a>
        </div>
        {children}
      </aside>
    </div>
  )
}
