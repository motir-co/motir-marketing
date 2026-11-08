import type { Metadata } from '@/lib/metadata'
import type { Copy } from '@/lib/copy'
import { openGraphLocales, siteCard } from '@/lib/localeMetadata'
import { SITE_ORIGIN, siteUrl } from '@/lib/siteOrigin'
import type { Locale } from '@/i18n/routing'

/*
 * The root metadata. MOTIR-1152 shipped the title and description and left the
 * ENTITY SIGNAL to MOTIR-1154 (8.3.7); this is that card, so the rest of it
 * arrives here — `metadataBase`, the canonical, the OpenGraph / Twitter shape
 * that makes the share card (`app/_brand/localeShareCard.tsx`) render large, and the Search
 * Console meta tag. The JSON-LD graph is a `<script>` rather than metadata and
 * is injected in the tree below.
 *
 * ⚠️ `metadataBase` IS THE LOAD-BEARING LINE, AND ITS ABSENCE FAILS QUIETLY.
 * Next injects a file-convention `opengraph-image` as a site-RELATIVE path and
 * resolves it against this value when it writes `<meta property="og:image">`.
 * With none set it falls back to the dev origin and advertises the card at
 * `http://localhost:3000/opengraph-image` — an address no crawler, social-card
 * renderer or link-preview fetcher can reach. motir-core shipped exactly that
 * on its whole public surface until MOTIR-2505, saying so in its logs on every
 * render; this site starts with the line in place.
 *
 * ⚠️ EVALUATED AT BUILD TIME, because this is a static export on a statically
 * rendered route. That is correct for every value here — `SITE_ORIGIN` is a
 * `NEXT_PUBLIC_*` constant and the catalogue is a compiled-in import — but it
 * is also why the verification variable below must be a BUILD arg if it is ever
 * set, never a Fly secret. Same rule, and same reason, as
 * `NEXT_PUBLIC_MOTIR_APP_ORIGIN`.
 */
/*
 * ⚠️ THE CARD IS NAMED EXPLICITLY NOW, AND THAT IS A MEASUREMENT (MOTIR-7948).
 * `app/opengraph-image.tsx` is a file convention, and Next attaches it to the
 * metadata of the SEGMENT it sits in — the root. While the root layout also
 * declared `openGraph`, that was the same segment, and every page inherited the
 * card. Under `app/[locale]` the locale layout declares its own `openGraph`
 * (for `og:locale`), a child's `openGraph` REPLACES its parent's whole, and the
 * file-based image went with it: a clean build of this branch emitted no
 * `og:image` at all on `/en`, `/en/docs` or `/en/legal/terms`. So the image is
 * named here, at the root route the file serves, in both tag sets.
 */
/*
 * ⚠️ NO CANONICAL HERE ANY MORE (MOTIR-7956). This was `alternates: { canonical:
 * '/' }`, and every page that set none inherited it — so a docs page told a
 * crawler that its canonical was the LANDING. Each page now names its own
 * through `localeMetadata`; a 404 names none, which is right for a 404.
 */
export function siteMetadata(locale: Locale, copy: Copy): Metadata {
  const SITE_CARD = siteCard(locale, copy.meta.title)
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: copy.meta.title,
    description: copy.meta.description,
    openGraph: {
      type: 'website',
      url: siteUrl('/'),
      siteName: 'Motir',
      title: copy.meta.title,
      description: copy.meta.description,
      // `og:locale` names the page's locale (MOTIR-7948), as a language_TERRITORY
      // pair — the form the protocol defines — and the other ten ride as
      // `og:locale:alternate` (MOTIR-7956).
      ...openGraphLocales(locale),
      images: [SITE_CARD],
    },
    // `summary_large_image` is what makes the 1200 × 630 card render at full
    // width rather than as a thumbnail.
    twitter: { card: 'summary_large_image', images: [SITE_CARD] },
    verification: {
      /*
       * ⚠️ UNSET IS THE EXPECTED STATE, AND IT IS NOT A GAP. MOTIR-1155 verified
       * `motir.co` in Search Console on 2026-08-27 by DNS, on a DOMAIN property —
       * which issues no meta-tag token at all: the `google-site-verification=`
       * string it produced is a TXT record VALUE and is not interchangeable with
       * the HTML-tag token. Ownership is therefore already proven, for the apex
       * and every subdomain, and Next omits the tag entirely when this is
       * undefined. The wiring exists so a later URL-prefix property can be
       * verified without a code change; it is belt-and-braces, not the
       * verification path.
       *
       * ⚠️ AND IT IS NOT A LICENCE TO TOUCH THE APEX TXT SET — MOTIR-2596 (the
       * mailbox SPF) and MOTIR-1155 (the verification record) both write there.
       */
      google: process.env.MOTIR_GOOGLE_SITE_VERIFICATION,
    },
  }
}
