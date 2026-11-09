import type { Locale } from '@/i18n/routing'
import type { Copy } from '@/lib/copy'
import { localeMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'

/*
 * THE HEAD OF /motir-builds-itself (ported off Next's `generateMetadata` by
 * MOTIR-10756): the page's own path in its locale with the twelve-locale
 * `hreflang` set, and kept out of the index (`noindex, follow`) while it is in
 * review, like the product pages. It is not in any sitemap either.
 */

export const BUILDS_ITSELF_PATH = '/motir-builds-itself'

export function buildsItselfMetadata(locale: Locale, copy: Copy): Metadata {
  return localeMetadata({
    locale,
    copy,
    path: BUILDS_ITSELF_PATH,
    title: copy.builtByMotirPage.metaTitle,
    description: copy.builtByMotirPage.metaDescription,
    extra: { robots: { index: false, follow: true } },
  })
}
