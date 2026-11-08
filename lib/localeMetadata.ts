import type { Metadata } from '@/lib/metadata'
import { getCopy, type Copy } from '@/lib/copy'
import { enterLocale, type LocaleParams } from '@/i18n/locale'
import { SITE_ORIGIN, siteUrl } from '@/lib/siteOrigin'
import { localizedPath } from '@/i18n/localizedPath'
import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  LOCALES,
  OG_LOCALE,
  type Locale,
} from '@/i18n/routing'

/*
 * A PAGE'S CRAWL DATA, IN ONE PLACE (MOTIR-7956).
 *
 * Every page under `app/[locale]` and the sitemap spell a language version's
 * address through this module, so a page's `hreflang` set and the sitemap's
 * cannot disagree — the reason `sitemap.ts` already routes project URLs
 * through `publicPathFor`.
 *
 * ⚠️ RECIPROCAL AND SELF-REFERENCING. Google ignores an `hreflang` pair that
 * does not point back (Search Central, "Tell Google about localized versions
 * of your page"), so every version lists ALL twelve, itself included, plus
 * `x-default` on the unprefixed English address — the one the proxy detects a
 * first visit's language on (MOTIR-7951).
 *
 * ⚠️ ABSOLUTE, FROM `siteUrl`. The origin is the build-time
 * `NEXT_PUBLIC_MOTIR_SITE_ORIGIN`, never the request host: these pages are
 * prerendered, and nothing here may read the request.
 */

/** A page's address in one locale — English unprefixed. Query kept as given. */
export { localizedPath }

/**
 * The thirteen `hreflang` alternates of a path: each locale under its BCP 47
 * tag (`zh-TW` for `zh-tw`), plus `x-default`.
 */
export function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const locale of LOCALES) {
    languages[LOCALE_BCP47[locale]] = siteUrl(localizedPath(locale, path))
  }
  languages['x-default'] = siteUrl(localizedPath(DEFAULT_LOCALE, path))
  return languages
}

/**
 * The canonical of a page whose BINDING content exists in English only
 * (MOTIR-8086): the unprefixed English address, from every language version.
 *
 * A legal document is the case. Its body, title, version and effective date are
 * the same English in all twelve versions, and only the chrome around them is
 * translated, so each language version is a DUPLICATE of the English document
 * rather than a localized alternate of it. Its canonical is therefore the
 * English address, and it carries NO `hreflang` set: a set of alternates that
 * all canonicalize elsewhere contradicts itself (Search Central, "Tell Google
 * about localized versions of your page" — keep canonical and hreflang
 * consistent). The page head and the sitemap both spell the address here, so
 * they cannot disagree.
 */
export function englishOnlyCanonical(path: string): string {
  return siteUrl(localizedPath(DEFAULT_LOCALE, path))
}

/** A page head's `alternates` for an English-only page: the canonical alone, no `languages`. */
export function englishOnlyAlternates(
  path: string,
): NonNullable<Metadata['alternates']> {
  return { canonical: englishOnlyCanonical(path) }
}

/**
 * The share card, named on every page that sets `openGraph`: a child
 * `openGraph` REPLACES its parent's whole, and the file-based image goes with
 * it (measured in MOTIR-7948; `siteMetadata.ts` has the note).
 *
 * ⚠️ THE CARD IS THE PAGE'S OWN LOCALE'S (MOTIR-7972): `app/[locale]/opengraph-image.tsx`
 * answers `/<locale>/opengraph-image`, English unprefixed — the proxy
 * rewrites that one onto `/en/…` without detection, so the URL advertised here
 * answers 200 as written.
 */
export function siteCard(locale: Locale, alt: string) {
  return {
    url: localizedPath(locale, '/opengraph-image'),
    width: 1200,
    height: 630,
    type: 'image/png',
    alt,
  }
}

/** The `og:locale` set: the page's own, and the other eleven as alternates. */
export function openGraphLocales(locale: Locale): {
  locale: string
  alternateLocale: string[]
} {
  return {
    locale: OG_LOCALE[locale],
    alternateLocale: LOCALES.filter((other) => other !== locale).map(
      (other) => OG_LOCALE[other],
    ),
  }
}

export interface LocaleMetadataInput {
  locale: Locale
  /** The page's locale catalogue — for the share card's alt text. */
  copy: Copy
  /** The page's ENGLISH path (`/docs/mcp`, `/explore?rank=new`). */
  path: string
  title: string
  description: string
  /** Page-specific keys kept as they were (`robots`, …). */
  extra?: Metadata
}

/**
 * A motir.co page's metadata in one locale: its title and description, a
 * canonical to its OWN language address, the thirteen alternates, and
 * `og:locale` with the other eleven as `og:locale:alternate`.
 */
export function localeMetadata({
  locale,
  copy,
  path,
  title,
  description,
  extra = {},
}: LocaleMetadataInput): Metadata {
  const url = siteUrl(localizedPath(locale, path))
  const card = siteCard(locale, copy.meta.title)
  return {
    title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: 'website',
      siteName: 'Motir',
      url,
      title,
      description,
      ...openGraphLocales(locale),
      images: [card],
    },
    twitter: { card: 'summary_large_image', images: [card] },
    ...extra,
  }
}

/** What a page names in its catalogue: its title, its description, and any page-specific key (`robots`). */
export type PageWords = { title: string; description: string } & Metadata

/**
 * `localeMetadata` for a page under `app/[locale]`: enters the locale from
 * `params`, reads that locale's catalogue, and takes the words from it — so a
 * page states its English path and which keys are its title and description,
 * and nothing else.
 */
export async function localePageMetadata(
  params: LocaleParams,
  path: string,
  words: (copy: Copy) => PageWords,
): Promise<Metadata> {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const { title, description, ...extra } = words(copy)
  return localeMetadata({ locale, copy, path, title, description, extra })
}

/**
 * A public project page's canonical and alternates, from its PRIMARY address
 * (`publicUrlFor`, MOTIR-4222).
 *
 * • **Primary on motir.co** — the page exists at twelve `/<locale>/p/<id>…`
 *   addresses, so the canonical is this locale's own one and the thirteen
 *   alternates ride with it. A canonical left on the English address would tell
 *   a crawler the French version is a duplicate of it, and the `hreflang` set
 *   pointing back would be ignored.
 * • **Primary on a workspace or customer host** — one URL serves every language
 *   (no prefix; the proxy rewrites by cookie and `Accept-Language`), so it is
 *   the canonical as it stands and there is NO `hreflang` set: alternates can
 *   only name distinct URLs.
 */
export function projectAlternates(
  locale: Locale,
  primaryUrl: string,
): NonNullable<Metadata['alternates']> {
  const primary = new URL(primaryUrl)
  if (primary.origin !== new URL(SITE_ORIGIN).origin) {
    return { canonical: primaryUrl }
  }
  const path = `${primary.pathname}${primary.search}`
  return {
    canonical: siteUrl(localizedPath(locale, path)),
    languages: languageAlternates(path),
  }
}
