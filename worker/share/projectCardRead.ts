import type { PublicProjectOverviewDto, PublicRead } from '@/lib/publicProject'
import { publicApiBase } from '@/lib/publicProject'

/*
 * THE ONE READ THE SHARE CARD MAKES (MOTIR-10757): the project's overview, from
 * the app `MOTIR_APP_ORIGIN` names, with the three outcomes `readPublic` maps —
 * `ok`, `not-found` (the API said so) and `failed` (it did not answer).
 *
 * One thing `readPublic` does not have: a TIMEOUT. A card is fetched by an
 * unfurler that gives up after a few seconds, and a card drawn from the key
 * alone, now, is worth more to it than the full card too late. A read that
 * runs out of time is `failed`, so its card is answered and not kept.
 */

/** How long the read may take before the card is drawn from the key. */
export const PROJECT_CARD_READ_TIMEOUT_MS = 3000

export async function readProjectCard(
  appOrigin: string,
  identifier: string,
  timeoutMs = PROJECT_CARD_READ_TIMEOUT_MS,
): Promise<PublicRead<PublicProjectOverviewDto>> {
  try {
    const res = await fetch(
      `${publicApiBase(appOrigin)}/p/${encodeURIComponent(identifier)}`,
      {
        cache: 'no-store',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      },
    )
    if (res.status === 404) return { status: 'not-found' }
    if (!res.ok) return { status: 'failed' }
    return {
      status: 'ok',
      data: (await res.json()) as PublicProjectOverviewDto,
    }
  } catch {
    return { status: 'failed' }
  }
}
