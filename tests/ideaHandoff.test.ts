import { describe, expect, it, vi } from 'vitest'
import { MAX_IDEA_LENGTH, handOffIdea } from '@/lib/ideaHandoff'

/*
 * Door 1's hand-off, against the contract motir-core's
 * `app/api/idea-draft/route.ts` states in its own header:
 *
 *   POST /api/idea-draft  { "idea": string }  →  201 { "draftId": string }
 *
 * Every failure arm below is a real answer that route can give — 403
 * ORIGIN_NOT_ALLOWED, 429 RATE_LIMITED, 400 BAD_REQUEST — plus the network
 * throw a cross-origin POST between two origins can always produce.
 */
const ORIGIN = 'https://app.test.motir.co'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('handOffIdea', () => {
  it('posts the idea and returns the sign-in URL carrying the draft id', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { draftId: 'd-1' }))

    const result = await handOffIdea('  a booking app for a salon  ', fetchImpl)

    expect(result).toEqual({ ok: true, href: `${ORIGIN}/sign-in?draft=d-1` })
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(`${ORIGIN}/api/idea-draft`)
    expect(init.method).toBe('POST')
    expect(init.credentials).toBe('omit')
    // Trimmed on the way out — leading whitespace is not part of the idea.
    expect(JSON.parse(init.body)).toEqual({ idea: 'a booking app for a salon' })
  })

  it('SKIPS the post entirely for an empty idea', async () => {
    // Submit is enabled on an empty box by design — it is a head-start, not a
    // gate. The receiver answers an empty body with 400 EMPTY_IDEA, so posting
    // it would turn the happy path into the ERROR state for a visitor who did
    // nothing wrong.
    const fetchImpl = vi.fn()

    for (const empty of ['', '   ', '\n\t']) {
      const result = await handOffIdea(empty, fetchImpl)
      expect(result).toEqual({ ok: true, href: `${ORIGIN}/sign-in` })
    }
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it.each([
    ['the origin is not allowlisted', 403, { code: 'ORIGIN_NOT_ALLOWED' }],
    ['the per-IP window is exhausted', 429, { code: 'RATE_LIMITED' }],
    ['the body was rejected', 400, { code: 'BAD_REQUEST' }],
    ['motir-core is down', 502, {}],
  ])('reports failure when %s', async (_why, status, body) => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(status, body))
    await expect(handOffIdea('an idea', fetchImpl)).resolves.toEqual({
      ok: false,
    })
  })

  it('reports failure when the network throws', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(handOffIdea('an idea', fetchImpl)).resolves.toEqual({
      ok: false,
    })
  })

  it('reports failure on a 201 whose body is NOT the DTO', async () => {
    // The one arm worth spelling out: navigating to `/sign-in?draft=undefined`
    // loses the idea while LOOKING like success, which is exactly what the
    // error state exists to prevent.
    for (const body of [{}, { draftId: '' }, { draftId: 7 }, null]) {
      const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(201, body))
      await expect(handOffIdea('an idea', fetchImpl)).resolves.toEqual({
        ok: false,
      })
    }
  })

  it('reports failure when a 201 body is not JSON at all', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response('<html>a proxy error page</html>', { status: 201 }),
      )
    await expect(handOffIdea('an idea', fetchImpl)).resolves.toEqual({
      ok: false,
    })
  })

  it('pins the cap to motir-cores MAX_PENDING_IDEA_LENGTH', () => {
    // `normalizePendingIdea()` TRUNCATES past this rather than rejecting, so a
    // mismatch here is silent data loss after sign-in, never an error.
    expect(MAX_IDEA_LENGTH).toBe(2000)
  })
})
