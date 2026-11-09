/**
 * The ONE configured motir-core origin every cross-origin door is built from
 * (MOTIR-1152, acceptance criterion 4).
 *
 * The three doors on this page all leave motir.co for motir-core, and that
 * origin differs between local, preview and production. Three literals is
 * three places to be wrong, and the failure is invisible everywhere except the
 * environment that matters: a hardcoded `app.motir.co` works perfectly in
 * production and silently points a preview build at production data.
 *
 * ⚠️ THIS MODULE THROWS AT IMPORT TIME, DELIBERATELY. `PUBLIC_*` is
 * inlined at BUILD time, so an unset variable cannot be detected at runtime —
 * by then the literal `undefined` is already baked into the bundle and the
 * doors are dead links a visitor discovers. Throwing here fails `astro build`
 * with the name of the variable, which is the only moment the mistake is
 * cheap. `MotirAppOriginError` is asserted by `tests/appOrigin.test.ts`; the
 * criterion asks for a test rather than an inspection precisely because a
 * guard nobody exercises is a comment.
 */

export const APP_ORIGIN_ENV_VAR = 'PUBLIC_MOTIR_APP_ORIGIN'

/** Thrown when the origin is missing or is not an absolute http(s) origin. */
export class MotirAppOriginError extends Error {
  override readonly name = 'MotirAppOriginError'

  constructor(reason: string) {
    super(
      `${APP_ORIGIN_ENV_VAR} ${reason}. Set it to the motir-core origin this ` +
        `build's doors should point at, e.g. https://app.motir.co. ` +
        `See .env.example.`,
    )
  }
}

/**
 * Validate and normalise a candidate origin. Exported for the test, and pure —
 * it reads no environment of its own.
 *
 * A trailing slash is stripped rather than rejected: every caller joins a path
 * onto this, and `https://app.motir.co//sign-in` is a different URL that some
 * proxies redirect and some do not.
 */
export function parseAppOrigin(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (value === '') throw new MotirAppOriginError('is not set')

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new MotirAppOriginError(
      `is not a valid URL (got ${JSON.stringify(value)})`,
    )
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new MotirAppOriginError(`must be http or https (got ${url.protocol})`)
  }
  if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
    throw new MotirAppOriginError(
      `must be a bare origin with no path, query or fragment (got ${JSON.stringify(value)})`,
    )
  }
  return url.origin
}

/**
 * ⚠️ READ THE VARIABLE BY ITS FULL LITERAL NAME. The build's `define`
 * (`astro.config.mjs`) inlines `process.env.X` only where `X` is written out; `process.env[name]` with a variable is left
 * as a runtime lookup, which in the browser bundle is `undefined`.
 */
export const APP_ORIGIN: string = parseAppOrigin(
  process.env.PUBLIC_MOTIR_APP_ORIGIN,
)
