import { describe, expect, it, vi } from 'vitest'
import {
  KNOWN_CATALOG_VERSIONS,
  explainerResultFrom,
  readExplainerFigures,
} from '@/lib/explainer/figures'
import {
  catalogSource,
  type CatalogSource,
} from '@/lib/explainer/catalogSource'
import {
  HOST_PLAN_KEY,
  PLAN_LADDER_PATH,
  fetchPlanLadderBody,
} from '@/lib/priceLadder'
import { AI_ORIGIN } from '@/lib/aiOrigin'
import recorded from '@/tests/fixtures/price/plans.json'
import unknownVersion from '@/tests/fixtures/price/plans-unknown-version.json'
import missingVersion from '@/tests/fixtures/price/plans-missing-version.json'

/*
 * The explainer's figure reader (MOTIR-9690). Every expected figure is read
 * from the recorded plan-ladder answer (`tests/fixtures/price/plans.json`), the
 * price card's own fixture; no figure is typed here. No test touches the
 * network: the fetch is injected.
 */

const ORIGIN = 'https://ai.example'

/** The real seam's read, pointed at a test origin. */
const source: CatalogSource = {
  read: (fetchImpl) => fetchPlanLadderBody(fetchImpl, ORIGIN),
}

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })

const read = (fetchImpl: typeof fetch, timeoutMs?: number) =>
  readExplainerFigures(fetchImpl, { source, timeoutMs })

const unreadable = { state: 'figure-free', reason: 'unreadable' }

describe('readExplainerFigures', () => {
  it('reads every figure from a well-formed catalog answer', async () => {
    const fetcher = vi.fn(async () => jsonResponse(recorded))
    const result = await read(fetcher)

    expect(fetcher).toHaveBeenCalledWith(
      `${ORIGIN}${PLAN_LADDER_PATH}`,
      expect.anything(),
    )
    expect(result.state).toBe('figures')
    if (result.state !== 'figures') return
    const { figures } = result

    const host = recorded.plans.find((p) => p.key === HOST_PLAN_KEY)!
    const rungs = recorded.plans.filter((p) => p.key !== HOST_PLAN_KEY)
    expect(figures.ladder).toEqual(
      rungs.map((p) => ({
        key: p.key,
        name: p.name,
        monthlyCredits: p.monthlyCredits,
        priceUsdByCadence: p.priceUsdByCadence,
      })),
    )
    expect(figures.host).toEqual({
      key: host.key,
      name: host.name,
      monthlyCredits: host.monthlyCredits,
      priceUsdByCadence: host.priceUsdByCadence,
    })
    expect(figures.topUp).toEqual(recorded.topUp)
    expect(figures.largerPool.fromCredits).toBe(
      Math.min(...recorded.largerPlans.map((p) => p.monthlyCredits)),
    )
  })

  it('names Max ×2 and Host as plans of their own, each on both cadences', async () => {
    const result = await read(async () => jsonResponse(recorded))
    if (result.state !== 'figures') throw new Error(result.reason)
    const names = [...result.figures.ladder, result.figures.host].map(
      (p) => p.name,
    )
    expect(names).toContain('Max ×2')
    expect(names).toContain('Host')
    for (const plan of [...result.figures.ladder, result.figures.host]) {
      expect(Object.keys(plan.priceUsdByCadence).sort()).toEqual([
        'annual',
        'monthly',
      ])
    }
  })

  it('answers unknown-version, and no figures, for a version it does not know', async () => {
    expect(KNOWN_CATALOG_VERSIONS).not.toContain(unknownVersion.version)
    expect(await read(async () => jsonResponse(unknownVersion))).toEqual({
      state: 'figure-free',
      reason: 'unknown-version',
    })
  })

  it.each([
    [
      'a thrown fetch',
      async () => {
        throw new TypeError('fetch failed')
      },
    ],
    [
      'a non-2xx answer',
      async () =>
        new Response('{}', {
          status: 500,
          headers: { 'content-type': 'application/problem+json' },
        }),
    ],
    ['a 429', async () => jsonResponse({}, { status: 429 })],
    [
      'a body that is not JSON',
      async () =>
        new Response('<html>', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ],
    ['a body with no version', async () => jsonResponse(missingVersion)],
    [
      'a body missing a figure',
      async () => jsonResponse({ ...recorded, topUp: undefined }),
    ],
    [
      'a plan priced on one cadence only',
      async () =>
        jsonResponse({
          ...recorded,
          plans: recorded.plans.map((p) =>
            p.key === HOST_PLAN_KEY
              ? {
                  ...p,
                  priceUsdByCadence: { monthly: p.priceUsdByCadence.monthly },
                }
              : p,
          ),
        }),
    ],
    [
      'a catalog with no Host',
      async () =>
        jsonResponse({
          ...recorded,
          plans: recorded.plans.filter((p) => p.key !== HOST_PLAN_KEY),
        }),
    ],
    [
      'a catalog with no larger pool above Host',
      async () => jsonResponse({ ...recorded, largerPlans: [] }),
    ],
    ['a problem body', async () => jsonResponse({ code: 'internal_error' })],
  ])('answers unreadable for %s, and does not throw', async (_, fetcher) => {
    expect(await read(fetcher as typeof fetch)).toEqual(unreadable)
  })

  it('answers unreadable when the catalog cannot be read at all', async () => {
    const missing: CatalogSource = { read: async () => null }
    const throwing: CatalogSource = {
      read: async () => {
        throw new Error('down')
      },
    }
    for (const s of [missing, throwing]) {
      expect(await readExplainerFigures(fetch, { source: s })).toEqual(
        unreadable,
      )
    }
  })

  it('answers unreadable when the read outlasts its timeout', async () => {
    const hanging: CatalogSource = { read: () => new Promise(() => {}) }
    expect(
      await readExplainerFigures(fetch, { source: hanging, timeoutMs: 10 }),
    ).toEqual(unreadable)
  })

  it('bounds the request itself with an abort signal', async () => {
    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
      return jsonResponse(recorded)
    })
    expect((await read(fetcher as typeof fetch)).state).toBe('figures')
  })
})

describe('catalogSource', () => {
  it("is the price card's read, at the site's motir-ai origin", async () => {
    const fetcher = vi.fn(async () => jsonResponse(recorded))
    const body = await catalogSource.read(fetcher)
    if (AI_ORIGIN === null) {
      expect(body).toBeNull()
      expect(fetcher).not.toHaveBeenCalled()
    } else {
      expect(body).toEqual(recorded)
      expect(fetcher).toHaveBeenCalledWith(
        `${AI_ORIGIN}${PLAN_LADDER_PATH}`,
        expect.anything(),
      )
    }
  })
})

describe('explainerResultFrom', () => {
  it('carries no seat, quantity, cost or margin field', () => {
    const result = explainerResultFrom(recorded)
    if (result.state !== 'figures') throw new Error(result.reason)
    const keys = JSON.stringify(result.figures).toLowerCase()
    for (const word of ['seat', 'quantity', 'cost', 'margin']) {
      expect(keys).not.toContain(word)
    }
  })
})
