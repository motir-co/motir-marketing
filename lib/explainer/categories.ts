import { AI_ORIGIN } from '@/lib/aiOrigin'
import { planLadderRevalidate } from '@/lib/priceLadder'
import {
  CATEGORIES_PATH,
  parseCategories,
} from '@/app/_components/price/calculatorApi'
import { EXPLAINER_READ_TIMEOUT_MS } from './figures'

/*
 * The explainer's category chips (MOTIR-9691): the model categories' working
 * names exactly as the engine returns them, read from the calculator's own
 * public route (`GET /v1/public/calculator/categories`, contract §4d) and parsed
 * by the calculator's own parser. Only the keys are kept; the example models
 * are not shown here, because no model is a promise.
 *
 * It never throws. `null` — no origin, a network error, a timeout, a non-OK
 * answer, a version the calculator does not know, or no category at all — makes
 * section 2 say in words where the names come from. Cached like the plan
 * catalog read, so the page stays a static page that refreshes on its own.
 */
export async function readExplainerCategories(
  fetchImpl: typeof fetch = fetch,
  {
    origin = AI_ORIGIN,
    timeoutMs = EXPLAINER_READ_TIMEOUT_MS,
  }: { origin?: string | null; timeoutMs?: number } = {},
): Promise<string[] | null> {
  if (origin === null) return null
  let timer: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs)
  })
  const read = async (): Promise<string[] | null> => {
    const res = await fetchImpl(`${origin}${CATEGORIES_PATH}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: planLadderRevalidate() },
    } as RequestInit)
    if (!res.ok) return null
    const parsed = parseCategories(await res.json())
    if (parsed.kind !== 'ok' || parsed.value.categories.length === 0) {
      return null
    }
    return parsed.value.categories.map((category) => category.key)
  }
  try {
    return await Promise.race([read(), timedOut])
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
