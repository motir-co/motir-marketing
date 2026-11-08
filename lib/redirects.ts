import { localizedPath } from '../i18n/localizedPath'
import { LOCALES } from '../i18n/routing'
import { PRODUCT_DOCS, PRODUCT_SLUGS } from './productAddresses'

/*
 * EVERY REDIRECT THE BUILT SITE ANSWERS, WITH NO WORKER (MOTIR-10643 ·
 * MOTIR-10644).
 *
 * Workers static assets read a `_redirects` file at the root of the output
 * directory and answer each rule before looking for a file
 * (https://developers.cloudflare.com/workers/static-assets/redirects/). The
 * build writes that file from these rules (`astro.config.mjs`), so every
 * address a rule names is computed from the lists the pages use, never typed
 * out a second time:
 *
 *  • `/en` and `/en/…` → the unprefixed English address. English is
 *    unprefixed (`i18n/routing.ts`, `as-needed`), and the prefixed spelling is
 *    the permanent redirect next-intl's middleware answered under Next.
 *  • `/<locale>/products/<slug>` → `/<locale>/docs/<slug>` for each product
 *    whose page is its documentation (`PRODUCT_DOCS`), in every locale — the
 *    `permanentRedirect` the Next product route answered (MOTIR-7971). A
 *    static page cannot answer 308, so these are rules, and no page is built
 *    at those addresses.
 *
 * All are 308: permanent, and the method is kept.
 */

/** One `_redirects` line. */
export interface RedirectRule {
  from: string
  to: string
  status: 308
}

/** The `/en` rules: the prefixed English spelling, to the unprefixed one. */
export const ENGLISH_PREFIX_RULES: readonly RedirectRule[] = [
  { from: '/en', to: '/', status: 308 },
  { from: '/en/*', to: '/:splat', status: 308 },
]

/** Each docs-forwarding product slug, in every locale. */
export function productDocsRules(): RedirectRule[] {
  return LOCALES.flatMap((locale) =>
    PRODUCT_SLUGS.flatMap((slug) => {
      const docs = PRODUCT_DOCS[slug]
      return docs === undefined
        ? []
        : [
            {
              from: localizedPath(locale, `/products/${slug}`),
              to: localizedPath(locale, docs),
              status: 308 as const,
            },
          ]
    }),
  )
}

/** Every rule, in the order the file lists them. */
export function redirectRules(): RedirectRule[] {
  return [...ENGLISH_PREFIX_RULES, ...productDocsRules()]
}

/** The `_redirects` file itself. */
export function redirectsFile(
  rules: readonly RedirectRule[] = redirectRules(),
): string {
  return [
    '# Written by the build from lib/redirects.ts. Edit that, not this.',
    ...rules.map(({ from, to, status }) => `${from} ${to} ${status}`),
    '',
  ].join('\n')
}
