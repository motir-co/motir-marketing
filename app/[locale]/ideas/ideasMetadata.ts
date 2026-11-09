import type { Locale } from '@/i18n/routing'
import type { Copy } from '@/lib/copy'
import { ideasHref, type IdeasParams, type PublicIdeaDto } from '@/lib/ideas'
import { localeMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'

/*
 * THE HEAD OF /ideas (MOTIR-7689 · MOTIR-7688, ported off Next's
 * `generateMetadata` by MOTIR-10755).
 *
 * The address is the view's own canonical `/ideas` URL — the filters kept, the
 * open idea kept only when it was found — in the page's locale, with the
 * twelve-locale `hreflang` set. An open idea puts its title and pitch in the
 * title and description. Kept out of the index (`noindex, follow`) and the
 * sitemap while it is in review, like the product pages.
 */
export function ideasMetadata(
  locale: Locale,
  copy: Copy,
  params: IdeasParams,
  open: PublicIdeaDto | null,
): Metadata {
  const i = copy.ideas
  return localeMetadata({
    locale,
    copy,
    path: ideasHref(open ? params : { ...params, idea: undefined }),
    title: open ? `${open.title} · ${i.metaTitle}` : i.metaTitle,
    description: open ? open.pitch : i.metaDescription,
    extra: { robots: { index: false, follow: true } },
  })
}
