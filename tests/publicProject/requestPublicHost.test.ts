import { describe, expect, it, vi } from 'vitest'
import {
  PUBLIC_ADDRESS_KIND_HEADER,
  PUBLIC_HOST_HEADER,
} from '@/lib/publicHost'

/*
 * The live surface's one request read (MOTIR-4220), moved out of
 * `tests/host/publicHost.test.ts` with the function itself (MOTIR-10643):
 * `lib/publicHost.ts` is imported by the built site and no longer names
 * `next/headers`.
 */

describe('requestPublicHost — the one ambient read on the surface', () => {
  it('reads the router’s headers through `next/headers`', async () => {
    // The import is lazy in the module under test; mocking the specifier
    // covers the dynamic import too.
    vi.doMock('next/headers', () => ({
      headers: async () =>
        new Headers({
          [PUBLIC_ADDRESS_KIND_HEADER]: 'workspace',
          [PUBLIC_HOST_HEADER]: 'acme.motir.site',
        }),
    }))
    try {
      const { requestPublicHost } = await import('@/lib/requestPublicHost')
      await expect(requestPublicHost()).resolves.toEqual({
        kind: 'workspace',
        host: 'acme.motir.site',
        origin: null,
      })
    } finally {
      vi.doUnmock('next/headers')
    }
  })
})
