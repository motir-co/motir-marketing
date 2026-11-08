/*
 * A PAGE'S HEAD, WITHOUT NEXT (MOTIR-10643).
 *
 * Every page module under `app/[locale]` states its head as a metadata object
 * (`generateMetadata`), and `siteMetadata` states the site's. Under Next the
 * framework merged the two and wrote the tags; on the built site the Astro
 * layout does, through {@link resolveMetadata} and {@link headTags}.
 *
 * ⚠️ THE TAGS ARE THE NEXT BUILD'S, IN ITS ORDER AND ITS SPELLING. The parity
 * check (MOTIR-10648) compares every page's canonical, `hreflang` set,
 * `og:locale` and `<html lang>` with the Next build at `b9ff37a`, and a
 * crawler that already holds those pages should see nothing move. So this
 * module reproduces what Next 16 emitted for the keys this site uses, read off
 * that build's HTML:
 *
 *  • a later layer REPLACES an earlier one key by key (a page's `openGraph`
 *    replaces the site's whole), which is Next's segment merge;
 *  • relative URLs resolve against `metadataBase`, and a bare origin is written
 *    without its trailing slash (`https://motir.co`, not `https://motir.co/`);
 *  • `twitter:title` / `twitter:description` fall back to the Open Graph ones,
 *    then to the page's own;
 *  • the order is title · description · robots · canonical · alternates ·
 *    verification · Open Graph · Twitter, with each image's type, width, height
 *    and alt after its URL.
 */

/** One share image, as `openGraph.images` / `twitter.images` name it. */
export interface MetadataImage {
  url: string
  width?: number
  height?: number
  type?: string
  alt?: string
}

/** The metadata keys this site uses — the subset of Next's it relied on. */
export interface Metadata {
  metadataBase?: URL
  title?: string
  description?: string
  robots?: { index?: boolean; follow?: boolean }
  alternates?: {
    canonical?: string
    languages?: Record<string, string>
  }
  verification?: { google?: string }
  openGraph?: {
    type?: string
    url?: string
    siteName?: string
    title?: string
    description?: string
    locale?: string
    alternateLocale?: string[]
    images?: MetadataImage[]
  }
  twitter?: {
    card?: string
    title?: string
    description?: string
    images?: MetadataImage[]
  }
}

/** Merge metadata layers, outermost first: a later key replaces an earlier one whole. */
export function resolveMetadata(
  ...layers: ReadonlyArray<Metadata | undefined>
): Metadata {
  return Object.assign({}, ...layers.filter(Boolean)) as Metadata
}

/** React's text and attribute escaping, so the tags read as Next wrote them. */
export function escapeHtml(value: string): string {
  return value.replace(
    /["&'<>]/g,
    (char) =>
      ({
        '"': '&quot;',
        '&': '&amp;',
        "'": '&#x27;',
        '<': '&lt;',
        '>': '&gt;',
      })[char]!,
  )
}

/** An absolute URL as Next writes it: resolved, and a bare origin unslashed. */
export function absoluteUrl(url: string, base: URL | undefined): string {
  const resolved = base ? new URL(url, base) : new URL(url)
  const text = resolved.toString()
  return resolved.pathname === '/' && !resolved.search && !resolved.hash
    ? text.replace(/\/$/, '')
    : text
}

type Attributes = ReadonlyArray<readonly [string, string | number | undefined]>

function tag(name: 'meta' | 'link', attributes: Attributes): string {
  const written = attributes
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
    .join(' ')
  return `<${name} ${written}/>`
}

const meta = (key: 'name' | 'property', name: string, content?: string) =>
  content === undefined
    ? []
    : [
        tag('meta', [
          [key, name],
          ['content', content],
        ]),
      ]

function imageTags(
  key: 'name' | 'property',
  prefix: string,
  images: MetadataImage[] | undefined,
  base: URL | undefined,
): string[] {
  return (images ?? []).flatMap((image) => [
    ...meta(key, prefix, absoluteUrl(image.url, base)),
    ...(key === 'name' ? meta(key, `${prefix}:alt`, image.alt) : []),
    ...meta(key, `${prefix}:type`, image.type),
    ...meta(key, `${prefix}:width`, image.width?.toString()),
    ...meta(key, `${prefix}:height`, image.height?.toString()),
    ...(key === 'property' ? meta(key, `${prefix}:alt`, image.alt) : []),
  ])
}

function robotsContent(robots: Metadata['robots']): string | undefined {
  if (!robots) return undefined
  const parts = [
    robots.index === undefined ? null : robots.index ? 'index' : 'noindex',
    robots.follow === undefined ? null : robots.follow ? 'follow' : 'nofollow',
  ].filter((part): part is string => part !== null)
  return parts.length > 0 ? parts.join(', ') : undefined
}

function alternateTags(meta: Metadata, base: URL | undefined): string[] {
  const { canonical, languages = {} } = meta.alternates ?? {}
  return [
    ...(canonical
      ? [
          tag('link', [
            ['rel', 'canonical'],
            ['href', absoluteUrl(canonical, base)],
          ]),
        ]
      : []),
    ...Object.entries(languages).map(([hrefLang, href]) =>
      tag('link', [
        ['rel', 'alternate'],
        ['hrefLang', hrefLang],
        ['href', absoluteUrl(href, base)],
      ]),
    ),
  ]
}

function openGraphTags(meta: Metadata, base: URL | undefined): string[] {
  const og = meta.openGraph
  if (!og) return []
  return [
    ...metaProperty('og:title', og.title ?? meta.title),
    ...metaProperty('og:description', og.description ?? meta.description),
    ...metaProperty('og:url', og.url && absoluteUrl(og.url, base)),
    ...metaProperty('og:site_name', og.siteName),
    ...metaProperty('og:locale', og.locale),
    ...imageTags('property', 'og:image', og.images, base),
    ...(og.alternateLocale ?? []).flatMap((locale) =>
      metaProperty('og:locale:alternate', locale),
    ),
    ...metaProperty('og:type', og.type),
  ]
}

function metaProperty(name: string, content: string | undefined): string[] {
  return meta('property', name, content)
}

function twitterTags(meta: Metadata, base: URL | undefined): string[] {
  const twitter = meta.twitter
  if (!twitter) return []
  const name = (key: string, content?: string) =>
    content === undefined
      ? []
      : [
          tag('meta', [
            ['name', key],
            ['content', content],
          ]),
        ]
  return [
    ...name('twitter:card', twitter.card),
    ...name(
      'twitter:title',
      twitter.title ?? meta.openGraph?.title ?? meta.title,
    ),
    ...name(
      'twitter:description',
      twitter.description ?? meta.openGraph?.description ?? meta.description,
    ),
    ...imageTags('name', 'twitter:image', twitter.images, base),
  ]
}

/** The `<head>` tags a resolved metadata object stands for, in Next's order. */
export function headTags(meta: Metadata): string[] {
  const base = meta.metadataBase
  return [
    ...(meta.title === undefined
      ? []
      : [`<title>${escapeHtml(meta.title)}</title>`]),
    ...(meta.description === undefined
      ? []
      : [
          tag('meta', [
            ['name', 'description'],
            ['content', meta.description],
          ]),
        ]),
    ...(robotsContent(meta.robots) === undefined
      ? []
      : [
          tag('meta', [
            ['name', 'robots'],
            ['content', robotsContent(meta.robots)],
          ]),
        ]),
    ...alternateTags(meta, base),
    ...(meta.verification?.google
      ? [
          tag('meta', [
            ['name', 'google-site-verification'],
            ['content', meta.verification.google],
          ]),
        ]
      : []),
    ...openGraphTags(meta, base),
    ...twitterTags(meta, base),
  ]
}
