import type { Locale } from '@/i18n/routing'
import { format, type Copy } from '@/lib/copy'
import { localeMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'

/*
 * THE HEAD OF THE SQUARE AND OF A TOPIC PAGE (MOTIR-4036 · MOTIR-7956, ported
 * off Next by MOTIR-10754).
 *
 * ⚠️ THE CANONICAL IS THE BARE PATH, WHATEVER THE FILTERS. `/explore?rank=new`
 * and `/explore?q=board` are states of one document, so they consolidate onto
 * `/explore` (and a topic's onto `/explore/topic/<slug>`), in the page's own
 * locale, with the twelve-locale `hreflang` set (`localeMetadata`).
 */

export const EXPLORE_PATH = '/explore'

export function topicPath(slug: string): string {
  return `/explore/topic/${slug}`
}

export function squareMetadata(locale: Locale, copy: Copy): Metadata {
  return localeMetadata({
    locale,
    copy,
    path: EXPLORE_PATH,
    title: copy.explore.metaTitle,
    description: copy.explore.metaDescription,
  })
}

/** `label` is the category's label when the API answered, else the slug. */
export function topicMetadata(
  locale: Locale,
  copy: Copy,
  slug: string,
  label: string,
): Metadata {
  return localeMetadata({
    locale,
    copy,
    path: topicPath(slug),
    title: format(copy.explore.metaTitleTopic, { topic: label }),
    description: format(copy.explore.metaDescriptionTopic, { topic: label }),
  })
}
