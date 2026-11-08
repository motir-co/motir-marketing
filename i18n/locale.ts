import { DEFAULT_LOCALE, isLocale, type Locale } from './routing'

/*
 * A PAGE'S LOCALE, FROM ITS PARAMS (MOTIR-7948 · MOTIR-10643).
 *
 * Every page module under `app/[locale]` is rendered by its Astro page once
 * per locale at build (`lib/staticPaths.ts`), and receives the locale the way
 * it did under Next: as `params`, a promise of `{ locale }`. There is no
 * request at render time and no request slot to claim — the build renders one
 * page in one locale per React root, and the root's `PageProvider`
 * (`lib/copy.ts`) is what every component below reads the locale from.
 */

/** The `params` every page module under `app/[locale]` receives. */
export type LocaleParams = Promise<{ locale: string }>

/** The props of a page whose only dynamic segment is the locale. */
export interface LocalePageProps {
  params: LocaleParams
}

/**
 * Read the page's locale from its `params` — the one line every page module
 * starts with. An unknown value cannot reach here (the build only renders the
 * twelve), so the fallback is a type narrowing, not a behaviour.
 */
export async function enterLocale(
  params: Promise<{ locale?: string }>,
): Promise<Locale> {
  const { locale } = await params
  return isLocale(locale) ? locale : DEFAULT_LOCALE
}

/** The `params` an Astro page hands a page module for `locale`. */
export function localeParams<Extra extends Record<string, string>>(
  locale: Locale,
  extra?: Extra,
): Promise<{ locale: string } & Extra> {
  return Promise.resolve({ locale, ...(extra as Extra) })
}
