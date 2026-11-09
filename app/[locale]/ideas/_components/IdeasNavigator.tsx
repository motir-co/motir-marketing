'use client'

import { useEffect } from 'react'
import { ideasHref, IDEAS_PATH, parseIdeasParams } from '@/lib/ideas'

/*
 * THE CLIENT HALF OF /ideas (MOTIR-7687 · MOTIR-7688; one island since
 * MOTIR-10755, when the Worker began rendering the page and Next's router went).
 *
 * Every control on the page is a real link or a real GET form that the browser
 * follows to the next page the Worker renders. This island renders nothing; it
 * listens on the document and adds what the design asks of the moment between
 * the click and the next page:
 *
 *  · PENDING — a plain click on a filter link (`data-ideas-nav`) or a search
 *    submit turns the count line to its "Updating…" text and marks the
 *    results `aria-busy`, as the Next page's transition did. The browser's own
 *    navigation then replaces the page. A page restored from the back-forward
 *    cache is put back to rest.
 *  · THE SEARCH ADDRESS — a search goes to the canonical `/ideas` address
 *    (`ideasHref`: the one parameter order, no empty `q`, the open idea
 *    closed), not to the raw form serialisation, so a search and a link to
 *    the same view are one URL.
 *  · OPENED FROM THE LIST — a click on a card's idea link is noted in
 *    `sessionStorage`, so the sheet that page opens knows there is a list
 *    behind it and its close goes Back; a sheet loaded from a shared link
 *    has nothing behind it and REPLACES the address instead (`IdeaSheet`).
 *  · FOCUS RETURN — a closed sheet leaves its slug behind; the list page it
 *    returns to puts focus back on that idea's card, else on "Find an idea".
 */

export const IDEAS_NAV_ATTR = 'data-ideas-nav'
export const IDEAS_SEARCH_ATTR = 'data-ideas-search'
/** On the count line; its value is the "Updating…" text. */
export const IDEAS_COUNT_ATTR = 'data-ideas-count'
export const IDEAS_RESULTS_ATTR = 'data-ideas-results'
export const IDEA_LINK_ATTR = 'data-idea-link'

const OPENED_KEY = 'motir:ideas:opened'
const RETURN_KEY = 'motir:ideas:return'
const RESTING_ATTR = 'data-ideas-resting'

function storage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function remember(key: string, value: string) {
  try {
    storage()?.setItem(key, value)
  } catch {
    // A browser that refuses storage loses the Back-closes behaviour only.
  }
}

function take(key: string): string | null {
  try {
    const store = storage()
    const value = store?.getItem(key) ?? null
    store?.removeItem(key)
    return value
  } catch {
    return null
  }
}

/** Whether the sheet for `slug` was opened by a click on its card. */
export function takeOpenedFromList(slug: string): boolean {
  return take(OPENED_KEY) === slug
}

/** A closed sheet asks the list page behind it to focus its card. */
export function returnFocusTo(slug: string) {
  remember(RETURN_KEY, slug)
}

/** A plain click with no modifier — the only one we take over. */
export function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

function setPending(pending: boolean) {
  for (const line of document.querySelectorAll<HTMLElement>(
    `[${IDEAS_COUNT_ATTR}]`,
  )) {
    if (pending) {
      if (!line.hasAttribute(RESTING_ATTR))
        line.setAttribute(RESTING_ATTR, line.textContent ?? '')
      line.textContent = line.getAttribute(IDEAS_COUNT_ATTR)
    } else if (line.hasAttribute(RESTING_ATTR)) {
      line.textContent = line.getAttribute(RESTING_ATTR)
      line.removeAttribute(RESTING_ATTR)
    }
  }
  for (const region of document.querySelectorAll(`[${IDEAS_RESULTS_ATTR}]`)) {
    if (pending) region.setAttribute('aria-busy', 'true')
    else region.removeAttribute('aria-busy')
  }
}

/** The canonical address a search form's fields name. */
export function searchAddress(form: HTMLFormElement): string {
  const fields = new URLSearchParams()
  for (const [name, value] of new FormData(form))
    if (typeof value === 'string') fields.append(name, value)
  const href = ideasHref(parseIdeasParams(fields), { idea: null })
  const action = new URL(form.action, window.location.href).pathname
  return `${action}${href.slice(IDEAS_PATH.length)}`
}

function focusReturn() {
  const slug = take(RETURN_KEY)
  if (slug === null || document.querySelector('[data-idea-sheet]')) return
  const back =
    document.querySelector<HTMLElement>(
      `[${IDEA_LINK_ATTR}="${CSS.escape(slug)}"]`,
    ) ?? document.getElementById('find-h')
  back?.focus({ preventScroll: true })
}

export function IdeasNavigator() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !isPlainClick(event)) return
      const target = event.target instanceof Element ? event.target : null
      const link = target?.closest('a')
      if (!link) return
      const slug = link.getAttribute(IDEA_LINK_ATTR)
      if (slug !== null) remember(OPENED_KEY, slug)
      else if (link.hasAttribute(IDEAS_NAV_ATTR)) setPending(true)
    }
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target
      if (
        event.defaultPrevented ||
        !(form instanceof HTMLFormElement) ||
        !form.hasAttribute(IDEAS_SEARCH_ATTR)
      )
        return
      event.preventDefault()
      setPending(true)
      window.location.assign(searchAddress(form))
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      setPending(false)
      focusReturn()
    }
    document.addEventListener('click', onClick)
    document.addEventListener('submit', onSubmit)
    window.addEventListener('pageshow', onPageShow)
    focusReturn()
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('submit', onSubmit)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])
  return null
}
