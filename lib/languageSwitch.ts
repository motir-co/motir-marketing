import { localizedPath } from '@/i18n/localizedPath'
import type { Locale } from '@/i18n/routing'
import { LOCALE_COOKIE } from '@/lib/localeDetection'
import type { PublicHost } from '@/lib/publicHost'

/*
 * WHERE A LANGUAGE CHOICE GOES, AND HOW IT IS REMEMBERED (MOTIR-7953) — the two
 * pure halves of the header's language switcher, kept out of the component so
 * both are unit-testable without a DOM.
 */

/**
 * The address of the page being read, in `locale`.
 *
 * On motir.co the address IS the language (`as-needed`, MOTIR-7948): the same
 * locale-free path under the chosen prefix, English unprefixed — `/explore` is
 * `/fr/explore` in French and `/` is `/ja` in Japanese. `localizedPath` is the
 * spelling every locale-keeping link on the site already uses (MOTIR-7971), and
 * it agrees with the `as-needed` routing `i18n/routing.ts` declares without
 * pulling a navigation runtime into a React-free module.
 *
 * Off the site — the 404 room's `unresolved` host, the one non-site kind left
 * since the tenant `workspace` kind went with the Next `proxy.ts` (MOTIR-10113,
 * MOTIR-10639, MOTIR-10811) — the entry is the same path, unprefixed: the room
 * cannot know which host serves it, so it does not claim the address is the
 * language, and the cookie written on click is the whole signal.
 */
export function switchHref(
  host: PublicHost,
  localeFreePath: string,
  locale: Locale,
): string {
  return host.kind === 'site'
    ? localizedPath(locale, localeFreePath)
    : localeFreePath
}

/** A year: long enough to be remembered, short enough to be revisited. */
const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * The remembered-choice cookie, as a `document.cookie` assignment.
 *
 * HOST-ONLY — no `Domain` — so it is first-party to whichever host the visitor
 * is on, which is exactly the host whose proxy reads it. Sharing one choice
 * with app.motir.co is MOTIR-7741's, not this.
 */
export function localeCookie(locale: Locale, secure: boolean): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure ? '; Secure' : ''}`
}

/**
 * Remember `locale` on this host — called by the switcher on click, just
 * before it navigates, so the proxy reads the choice on the very next request.
 */
export function rememberLocale(locale: Locale): void {
  document.cookie = localeCookie(locale, window.location.protocol === 'https:')
}
