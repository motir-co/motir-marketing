import { DEFAULT_LOCALE, isLocale, LOCALES, type Locale } from '@/i18n/routing'

/*
 * EVERY PAGE'S BUILD PATHS, ONE PER LOCALE (MOTIR-10643).
 *
 * A page lives at `src/pages/[...locale]/<route>.astro`. The optional rest
 * segment is what spells `as-needed` prefixing (`i18n/routing.ts`): English
 * takes it EMPTY, so `/price`, and every other locale takes its code, so
 * `/de/price`. The twelve come from `LOCALES`, never retyped.
 */

/** The `locale` route param for a locale: absent for English. */
export function localeSegment(locale: Locale): string | undefined {
  return locale === DEFAULT_LOCALE ? undefined : locale
}

/** `getStaticPaths` for a route whose only dynamic segment is the locale. */
export function localeStaticPaths() {
  return LOCALES.map((locale) => ({
    params: { locale: localeSegment(locale) },
  }))
}

/**
 * `getStaticPaths` for a route with one more dynamic segment — every slug in
 * every locale (`/legal/terms`, `/de/legal/terms`).
 */
export function localeSlugStaticPaths<Key extends string>(
  key: Key,
  slugs: readonly string[],
) {
  return LOCALES.flatMap((locale) =>
    slugs.map((slug) => ({
      params: { locale: localeSegment(locale), [key]: slug } as {
        locale: string | undefined
      } & Record<Key, string>,
    })),
  )
}

/** The page's locale, read back from its route params. */
export function pageLocale(params: { locale?: string | undefined }): Locale {
  const { locale } = params
  if (locale === undefined) return DEFAULT_LOCALE
  if (!isLocale(locale) || locale === DEFAULT_LOCALE) {
    throw new Error(`No page is built for the locale segment "${locale}"`)
  }
  return locale
}

/**
 * A built page's own address, as a visitor's location bar reads it. Astro
 * names a page by the FILE it writes under `build.format: 'file'`
 * (`/de/price.html`, `/index.html`), and every component that marks the
 * current page or links the same page in another locale compares against the
 * served address (`/de/price`, `/`), which is what the page context carries.
 */
export function servedPathname(builtPathname: string): string {
  const path = builtPathname.replace(/\.html$/, '').replace(/\/index$/, '')
  return path === '' ? '/' : path
}
