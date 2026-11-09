/**
 * THIS site's own public origin — the one motir.co is served from (MOTIR-1154).
 *
 * `lib/appOrigin.ts` answers "where does motir-core live?"; this answers "where
 * do I live?". They are different questions with different failure modes, which
 * is why they are different modules rather than one with two exports.
 *
 * Everything the entity signal emits is an ABSOLUTE URL — `metadataBase`, the
 * sitemap's entries, `robots`'s `sitemap:` line, and every `url` / `@id` in the
 * JSON-LD graph. A relative one is not merely less tidy: Next falls back to
 * `http://localhost:3000` for `metadataBase` and advertises the OpenGraph card
 * at an address no crawler, social-card renderer or link-preview fetcher can
 * reach (motir-core learned this as MOTIR-2505, on its own public surface).
 *
 * ⚠️ IT HAS A DEFAULT, AND THAT IS THE DIFFERENCE FROM `appOrigin`. That module
 * throws when its variable is unset, because there is no honest default for
 * "somebody else's origin" — a wrong guess ships dead doors. This one has
 * exactly one right answer in production and it is not a secret, so a default
 * is what keeps `next build`, `pnpm test` and a local `next dev` working with
 * no configuration at all. The override exists for a preview deployment that
 * wants its own canonicals; getting it wrong costs a canonical, not a door.
 *
 * ⚠️ `PUBLIC_` BECAUSE IT IS READ AT BUILD TIME. Every consumer here is
 * statically rendered (root metadata, `sitemap.ts`, `robots.ts`), so the value
 * is baked into the output by `astro build` exactly as `PUBLIC_*` is —
 * setting it as a Fly SECRET would do nothing, for the same reason
 * `.env.example` already gives for the app origin. It travels in `fly.toml`'s
 * `[build.args]` if it is ever overridden.
 */

export const SITE_ORIGIN_ENV_VAR = 'PUBLIC_MOTIR_SITE_ORIGIN'

/** The production origin, and the value every unconfigured build gets. */
export const DEFAULT_SITE_ORIGIN = 'https://motir.co'

/** Thrown when the override is present but is not a bare http(s) origin. */
export class MotirSiteOriginError extends Error {
  override readonly name = 'MotirSiteOriginError'

  constructor(reason: string) {
    super(
      `${SITE_ORIGIN_ENV_VAR} ${reason}. Leave it unset to use ` +
        `${DEFAULT_SITE_ORIGIN}, or set it to a bare origin such as ` +
        `https://preview.motir.co. See .env.example.`,
    )
  }
}

/**
 * Validate and normalise a candidate origin, falling back to the default when
 * nothing is set. Exported for the test, and pure — it reads no environment of
 * its own.
 *
 * An UNSET value takes the default; a SET-BUT-WRONG value throws. Silently
 * falling back from a typo would put the deployment's canonicals somewhere the
 * operator did not choose while every check stayed green.
 */
export function parseSiteOrigin(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (value === '') return DEFAULT_SITE_ORIGIN

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new MotirSiteOriginError(
      `is not a valid URL (got ${JSON.stringify(value)})`,
    )
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new MotirSiteOriginError(
      `must be http or https (got ${url.protocol})`,
    )
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new MotirSiteOriginError(
      `must be a bare origin with no path, query or fragment (got ${JSON.stringify(value)})`,
    )
  }
  return url.origin
}

/**
 * ⚠️ READ THE VARIABLE BY ITS FULL LITERAL NAME — the same rule
 * `lib/appOrigin.ts` records. The build's `define` inlines `process.env.X` only where `X` is
 * written out; `process.env[name]` with a variable is left as a runtime lookup.
 */
export const SITE_ORIGIN: string = parseSiteOrigin(
  process.env.PUBLIC_MOTIR_SITE_ORIGIN,
)

/** Absolute URL for a root-relative path on THIS site. */
export function siteUrl(path = '/'): string {
  return new URL(path, `${SITE_ORIGIN}/`).toString()
}
