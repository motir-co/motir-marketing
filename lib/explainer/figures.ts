import { PLAN_LADDER_VERSION } from '@/lib/priceLadder'
import { catalogSource, type CatalogSource } from './catalogSource'
import { parseExplainerFigures, type ExplainerFigures } from './figuresParse'

export type { ExplainerFigures, ExplainerPlan } from './figuresParse'

/*
 * THE EXPLAINER PAGE'S ONE READ OF FIGURES (MOTIR-9690). "How the calculation
 * works" types no plan name, pool, price or rate into its copy: it reads them
 * here, from the same plan catalog the price card renders, and gets back a
 * closed union.
 *
 * It never throws and never returns part of a set. A `version` it does not know
 * is `unknown-version`; anything else that stops it from reading every figure —
 * no origin, a network error, a timeout, a non-OK answer, a body that is not
 * JSON or misses a figure — is `unreadable`. Either way the page renders its
 * figure-free wording.
 *
 * The lane factors are not here: the engine applies them and does not return
 * them, and whether the page shows them as figures is the owner's open decision
 * on MOTIR-8383. Nothing here derives one.
 */

/** The catalog answer versions this page reads. Any other is `unknown-version`. */
export const KNOWN_CATALOG_VERSIONS: readonly number[] = [PLAN_LADDER_VERSION]

/** How long the read may take before the page gives up on figures — a duration, not a figure. */
export const EXPLAINER_READ_TIMEOUT_MS = 5_000

export type ExplainerResult =
  | { state: 'figures'; figures: ExplainerFigures }
  | { state: 'figure-free'; reason: 'unreadable' | 'unknown-version' }

const UNREADABLE = { state: 'figure-free', reason: 'unreadable' } as const
const UNKNOWN_VERSION = {
  state: 'figure-free',
  reason: 'unknown-version',
} as const

/** Pure: the catalog's body (or `null` for none) as the page's result. */
export function explainerResultFrom(body: unknown): ExplainerResult {
  if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
    const version = (body as Record<string, unknown>).version
    if (
      typeof version === 'number' &&
      !KNOWN_CATALOG_VERSIONS.includes(version)
    ) {
      return UNKNOWN_VERSION
    }
  }
  const figures = parseExplainerFigures(body)
  return figures === null ? UNREADABLE : { state: 'figures', figures }
}

export async function readExplainerFigures(
  fetchImpl: typeof fetch = fetch,
  {
    source = catalogSource,
    timeoutMs = EXPLAINER_READ_TIMEOUT_MS,
  }: { source?: CatalogSource; timeoutMs?: number } = {},
): Promise<ExplainerResult> {
  const bounded: typeof fetch = (input, init) =>
    fetchImpl(input, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  let timer: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs)
  })
  try {
    const body = await Promise.race([source.read(bounded), timedOut])
    return explainerResultFrom(body)
  } catch {
    return UNREADABLE
  } finally {
    clearTimeout(timer)
  }
}
