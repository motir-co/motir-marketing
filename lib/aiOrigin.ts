/**
 * The motir-ai origin the price page reads from (MOTIR-8382): its public plan
 * ladder (`GET /v1/public/plans`) on the server and its public calculator from
 * the browser. Both are motir-ai's §4c public channel — no credential, CORS for
 * motir.co, a per-client rate limit.
 *
 * Unlike `APP_ORIGIN`, an unset or malformed value does NOT fail the build: the
 * price page is one page of many, and with no origin its two sections show
 * their calm unavailable states, which is what they show when motir-ai is down.
 * the CI workflow's `env` sets it on a release (`vercel build` runs there).
 */
export function parseAiOrigin(raw: string | undefined): string | null {
  const value = (raw ?? '').trim()
  if (value === '') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (url.pathname !== '/' || url.search !== '' || url.hash !== '') {
      return null
    }
    return url.origin
  } catch {
    return null
  }
}

/** Read by its full literal name, so Next inlines it into the browser bundle. */
export const AI_ORIGIN: string | null = parseAiOrigin(
  process.env.NEXT_PUBLIC_MOTIR_AI_ORIGIN,
)
