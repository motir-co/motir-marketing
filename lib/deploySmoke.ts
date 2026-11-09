/**
 * The release's smoke check: does the Worker `wrangler deploy` just published
 * answer the way the site should (MOTIR-10637, MOTIR-10810)?
 *
 * ⚠️ IT RETRIES ON THE ANSWER, NOT ONLY ON THE CONNECTION (MOTIR-10810). The
 * step used to be `curl --retry 10 --retry-all-errors`, and curl counts any HTTP
 * response as a successful transfer, so it retried a refused connection and
 * never a wrong status. A brand-new workers.dev address answers 404 for a few
 * seconds while it propagates, which turned the Worker's FIRST deploy red on its
 * first request even though the release had gone out. Every check here is one
 * bounded loop: ask, compare the answer with the one wanted, and on a mismatch —
 * a wrong status, a wrong `Location`, or no answer at all — wait and ask again,
 * failing with the last answer seen.
 *
 * `--fail` alone could not have fixed it: the check also WANTS a 404 (the
 * localized not-found page) and a 308 (the Worker's lower-casing redirect), so
 * the wanted status has to be compared, not merely "not an error".
 *
 * Dependency-free on purpose: `scripts/deploy/smoke.ts` imports this file under
 * plain Node in the deploy job, where an `@/` alias would not resolve.
 */

/** One request the release must answer, and the answer it must give. */
export interface SmokeCheck {
  readonly path: string
  readonly status: number
  /** When set, the answer's `Location` must end with this. */
  readonly locationEndsWith?: string
}

/**
 * A built page, a Worker route, an unknown path (the localized 404) and a
 * mis-cased locale (the Worker's 308 to the lower-cased path). Redirects are
 * NOT followed, so the 404 and the 308 are seen as answered.
 */
export const SMOKE_CHECKS: readonly SmokeCheck[] = [
  { path: '/', status: 200 },
  { path: '/price', status: 200 },
  { path: '/explore', status: 200 },
  { path: '/de/does-not-exist', status: 404 },
  { path: '/zh-TW/price', status: 308, locationEndsWith: '/zh-tw/price' },
]

/**
 * Ten tries ten seconds apart: room for a new address to propagate (seconds),
 * well inside the deploy job's 30-minute timeout even if every check waits.
 */
export const DEFAULT_ATTEMPTS = 10
export const DEFAULT_DELAY_MS = 10_000
/** One request may take this long before it counts as no answer. */
export const DEFAULT_TIMEOUT_MS = 15_000

/** What one request got back: an answer, or why there was none. */
export type Observation =
  | {
      readonly kind: 'answer'
      readonly status: number
      readonly location: string | null
    }
  | { readonly kind: 'no-answer'; readonly reason: string }

/** The one error a smoke check throws: the check, and the last thing it saw. */
// Fields are declared, not constructor parameter properties: plain Node strips
// types and does not transform, so only erasable syntax runs in the deploy job.
export class SmokeCheckFailed extends Error {
  readonly url: string
  readonly want: string
  readonly last: string
  readonly attempts: number

  constructor(url: string, want: string, last: string, attempts: number) {
    super(
      `GET ${url} answered ${last} after ${attempts} attempts (want ${want})`,
    )
    this.name = 'SmokeCheckFailed'
    this.url = url
    this.want = want
    this.last = last
    this.attempts = attempts
  }
}

export interface SmokeOptions {
  readonly fetch?: typeof fetch
  readonly sleep?: (ms: number) => Promise<void>
  readonly log?: (line: string) => void
  readonly attempts?: number
  readonly delayMs?: number
  readonly timeoutMs?: number
}

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

/** `GET` one URL once, without following a redirect. Never throws. */
export async function observe(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<Observation> {
  try {
    const res = await fetchImpl(url, {
      redirect: 'manual',
      headers: { 'accept-language': 'en' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    // Only the status and the header are read; release the body.
    await res.body?.cancel()
    return {
      kind: 'answer',
      status: res.status,
      location: res.headers.get('location'),
    }
  } catch (error) {
    return {
      kind: 'no-answer',
      reason: error instanceof Error ? error.message : String(error),
    }
  }
}

/** The answer a check wants, as the log line says it. */
export function describeWant(check: SmokeCheck): string {
  return check.locationEndsWith === undefined
    ? String(check.status)
    : `${check.status} → …${check.locationEndsWith}`
}

/** What one request got, as the log line says it. */
export function describeObservation(seen: Observation): string {
  if (seen.kind === 'no-answer') return `no answer (${seen.reason})`
  return seen.location === null
    ? String(seen.status)
    : `${seen.status} → ${seen.location}`
}

/** Whether what one request got is the answer the check wants. */
export function satisfies(check: SmokeCheck, seen: Observation): boolean {
  if (seen.kind !== 'answer' || seen.status !== check.status) return false
  if (check.locationEndsWith === undefined) return true
  return seen.location?.endsWith(check.locationEndsWith) ?? false
}

/**
 * Ask until the release gives the wanted answer, at most `attempts` times with
 * `delayMs` between tries; throws `SmokeCheckFailed` with the last answer seen.
 */
export async function expectAnswer(
  origin: string,
  check: SmokeCheck,
  options: SmokeOptions = {},
): Promise<void> {
  const fetchImpl = options.fetch ?? fetch
  const sleep = options.sleep ?? wait
  const log = options.log ?? console.log
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const url = `${origin}${check.path}`
  const want = describeWant(check)
  let last = 'nothing'
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const seen = await observe(url, fetchImpl, timeoutMs)
    last = describeObservation(seen)
    log(`GET ${url} -> ${last} (want ${want}, attempt ${attempt}/${attempts})`)
    if (satisfies(check, seen)) return
    if (attempt < attempts) await sleep(delayMs)
  }
  throw new SmokeCheckFailed(url, want, last, attempts)
}

/** Run every check in order; the first that never gives its answer throws. */
export async function smokeRelease(
  origin: string,
  options: SmokeOptions = {},
  checks: readonly SmokeCheck[] = SMOKE_CHECKS,
): Promise<void> {
  for (const check of checks) await expectAnswer(origin, check, options)
}

/** The release's origin from the environment: an `http(s)` origin, nothing more. */
export function releaseOrigin(value: string | undefined): string {
  if (!value)
    throw new Error(
      'ORIGIN is not set: the deploy step reports the workers.dev origin',
    )
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    throw new Error(`ORIGIN must be an http(s) origin, got ${value}`)
  return url.origin
}
