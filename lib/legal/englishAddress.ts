import { DEFAULT_LOCALE } from '@/i18n/routing'

/**
 * The address that serves a legal page IN ENGLISH to any reader (MOTIR-8088):
 * `/en/legal` or `/en/legal/<slug>`. The binding-English note links here.
 *
 * ⚠️ NEVER THE UNPREFIXED ENGLISH ADDRESS, and never `localizedPath('en', …)`,
 * which returns it. The Next `proxy.ts` (deleted, MOTIR-10639) treated an
 * unprefixed motir.co address as the place the language is chosen: a reader whose remembered-choice cookie or
 * `Accept-Language` says French is sent a `307` from `/legal/terms` to
 * `/fr/legal/terms` (`visitorLocale` → `redirectToLocale`), straight back under
 * the note. The Worker detects a language on the bare `/` only
 * (`worker/router.ts`), and the `/en/…` spelling stays the one that names
 * English outright. An address under `/en/…` is served as it is (`inDefaultLocaleTree`),
 * and nothing on that path writes the remembered-choice cookie — only the
 * language switcher does (`lib/languageSwitch.ts`) — so the reader gets English
 * for this one visit and keeps their language. The crawl data makes the
 * unprefixed English address the canonical (MOTIR-8086), so this duplicate is
 * declared as one.
 */
export function englishLegalPath(slug?: string): string {
  return `/${DEFAULT_LOCALE}/legal${slug ? `/${slug}` : ''}`
}
