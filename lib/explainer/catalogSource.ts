import { fetchPlanLadderBody } from '@/lib/priceLadder'

/**
 * Where the explainer page reads the plan catalog from (MOTIR-9690): the price
 * card's own read, `GET /v1/public/plans` (`lib/priceLadder.ts`), and nothing
 * else. This seam adds no endpoint, origin or env variable; it hands back the
 * answer's body unparsed so the explainer can tell an unknown `version` apart
 * from an unreadable answer. `null` means there was no body to read.
 */
export interface CatalogSource {
  read(fetchImpl?: typeof fetch): Promise<unknown>
}

export const catalogSource: CatalogSource = {
  read: (fetchImpl) => fetchPlanLadderBody(fetchImpl),
}
