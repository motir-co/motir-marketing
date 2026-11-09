import type { ReactNode } from 'react'
import { IdeasNavigatorIsland } from '@/app/_islands'
import { localizedPath } from '@/i18n/localizedPath'
import { filterLinkRel } from '@/lib/crawlPolicy'
import { usePageLocale } from '@/lib/copy'
import { IDEAS_PATH } from '@/lib/ideas'
import {
  IDEAS_COUNT_ATTR,
  IDEAS_NAV_ATTR,
  IDEAS_RESULTS_ATTR,
  IDEAS_SEARCH_ATTR,
  IDEA_LINK_ATTR,
} from './IdeasNavigator'

/*
 * The server half of /ideas' filters (MOTIR-7687; ported off Next's router by
 * MOTIR-10755).
 *
 * Every filter is a URL the SERVER answers: a category, a tag or a search needs
 * a list the browser does not have, so every control here is a real link or a
 * real GET form, and the browser navigates to the page the Worker renders for
 * it. What the browser adds is the PENDING state the design names
 * (`design/ideas/design-notes.md` § States, panel G): while the next page is
 * loading, the count reads "Updating…" and the results region carries
 * `aria-busy`. No skeleton, no dim, no spinner — the list on screen stays as it
 * is until the new page replaces it.
 *
 * That behaviour is ONE island, `IdeasNavigator`, mounted once by the
 * provider below. The controls are plain markup it recognises by their data
 * attributes, so they ship no JavaScript of their own, and with no JavaScript
 * the page navigates the ordinary way and loses nothing but the "Updating…"
 * line.
 */

export function IdeasNavProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <IdeasNavigatorIsland />
      {children}
    </>
  )
}

/** A filter control: a real link whose navigation shows the pending state. */
export function FilterLink({
  href,
  children,
  ...rest
}: {
  href: string
  children: ReactNode
  className?: string
  'aria-current'?: 'true' | undefined
  'aria-label'?: string
}) {
  return (
    <a
      href={href}
      rel={filterLinkRel(href)}
      {...{ [IDEAS_NAV_ATTR]: '' }}
      {...rest}
    >
      {children}
    </a>
  )
}

/**
 * The search form. A real `GET /ideas` form — hidden inputs carry the other
 * filters so a search composes with them — which the navigator submits as the
 * canonical address (no empty `q`, the open idea closed). Submitted on Enter
 * or the button, never as you type: every search is a server read.
 */
export function SearchForm({
  children,
  ...attributes
}: {
  children: ReactNode
  className?: string
  'aria-label'?: string
}) {
  const locale = usePageLocale()
  return (
    <form
      method="get"
      action={localizedPath(locale, IDEAS_PATH)}
      role="search"
      {...{ [IDEAS_SEARCH_ATTR]: '' }}
      {...attributes}
    >
      {children}
    </form>
  )
}

/** The result count, which reads "Updating…" while a filter is in flight. */
export function CountLine({
  text,
  updating,
  className,
}: {
  text: string
  updating: string
  className?: string
}) {
  return (
    <p
      aria-live="polite"
      className={className}
      {...{ [IDEAS_COUNT_ATTR]: updating }}
    >
      {text}
    </p>
  )
}

/** The results, marked busy while a filter is in flight. */
export function ResultsRegion({ children }: { children: ReactNode }) {
  return <div {...{ [IDEAS_RESULTS_ATTR]: '' }}>{children}</div>
}

/**
 * A card's link to its idea, open in place (MOTIR-7688). A plain link: the
 * open is a history entry, so Back closes it. The navigator notes the click,
 * so the sheet knows there is a list behind it to go back to.
 */
export function OpenIdeaLink({
  href,
  slug,
  children,
  className,
}: {
  href: string
  slug: string
  children: ReactNode
  className?: string
}) {
  return (
    <a
      href={href}
      rel={filterLinkRel(href)}
      {...{ [IDEA_LINK_ATTR]: slug }}
      className={className}
    >
      {children}
    </a>
  )
}
