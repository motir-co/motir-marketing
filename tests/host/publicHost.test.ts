import { describe, expect, it, vi } from 'vitest'
import {
  PUBLIC_ADDRESS_KIND_HEADER,
  PUBLIC_HOST_HEADER,
  PUBLIC_ORIGIN_HEADER,
  SITE_HOST,
  normaliseHost,
  publicPathFor,
  publicPathWithQuery,
  readPublicHost,
  type PublicHost,
} from '@/lib/publicHost'

/*
 * THE LINK SHAPE, ON ALL THREE HOST KINDS (MOTIR-4220).
 *
 * The card's third acceptance criterion is that every href emitted on a tenant
 * host is host-relative. That is asserted twice: here, on the helper every link
 * goes through, and in the rendered-page tests beside this file, which is what
 * catches a component that stopped going through it.
 */

const WORKSPACE: PublicHost = {
  kind: 'workspace',
  host: 'acme.motir.site',
  origin: 'https://acme.motir.site',
}
const UNRESOLVED: PublicHost = {
  kind: 'unresolved',
  host: 'roadmap.acme.com',
  origin: 'https://roadmap.acme.com',
}

describe('normaliseHost', () => {
  it('lowercases and drops the port', () => {
    expect(normaliseHost('ACME.Motir.Site:4318')).toBe('acme.motir.site')
  })

  it('trims, and reads an empty value as no host at all', () => {
    expect(normaliseHost('  acme.motir.site  ')).toBe('acme.motir.site')
    expect(normaliseHost('')).toBeNull()
    expect(normaliseHost(null)).toBeNull()
    expect(normaliseHost(undefined)).toBeNull()
    expect(normaliseHost(':4318')).toBeNull()
  })

  it('keeps an IPv6 literal whole and loses only its port', () => {
    // Splitting on the first colon would truncate this to `[` — a host that
    // matches nothing and does not look wrong in a log.
    expect(normaliseHost('[::1]:4318')).toBe('[::1]')
    expect(normaliseHost('[::1]')).toBe('[::1]')
  })
})

describe('publicPathFor — one shape, the site’s, for every kind (MOTIR-9528)', () => {
  it('is /p/<id>/<tab> on the site', () => {
    expect(publicPathFor(SITE_HOST, 'ACME', 'board', 'en')).toBe(
      '/p/ACME/board',
    )
    expect(publicPathFor(SITE_HOST, 'ACME', '', 'en')).toBe('/p/ACME')
  })

  it('takes the site’s shape on a workspace host, which serves no project (MOTIR-9512)', () => {
    // The `/<identifier>` arm is gone with the workspace host's project
    // rewrite: `acme.motir.site/ACME` is a 404 now, so no helper may emit it.
    expect(publicPathFor(WORKSPACE, 'ACME', 'board', 'en')).toBe(
      '/p/ACME/board',
    )
  })

  it('never produces a path at a host’s root — no kind can spell a customer root', () => {
    for (const host of [SITE_HOST, WORKSPACE, UNRESOLVED]) {
      expect(publicPathFor(host, 'ACME', 'items/ACME-42', 'en')).toBe(
        '/p/ACME/items/ACME-42',
      )
      expect(publicPathFor(host, 'ACME', '', 'en')).toBe('/p/ACME')
    }
  })

  it('encodes the identifier where the identifier is a path segment', () => {
    expect(publicPathFor(SITE_HOST, 'A B', 'items', 'en')).toBe(
      '/p/A%20B/items',
    )
  })
})

describe('publicPathWithQuery — the no-JS pager, per host', () => {
  it('carries the coordinate on every host kind', () => {
    expect(
      publicPathWithQuery(SITE_HOST, 'ACME', 'items', { cursor: 'w9' }, 'en'),
    ).toBe('/p/ACME/items?cursor=w9')
    expect(
      publicPathWithQuery(WORKSPACE, 'ACME', 'items', { cursor: 'w9' }, 'en'),
    ).toBe('/p/ACME/items?cursor=w9')
  })

  it('drops undefined parameters rather than emitting empty ones', () => {
    // `?parentId=` reads to the endpoint as the ROOT level, so the pager would
    // silently jump back to the top of the tree.
    expect(
      publicPathWithQuery(
        SITE_HOST,
        'ACME',
        'tree',
        {
          parentId: undefined,
          offset: '3',
        },
        'en',
      ),
    ).toBe('/p/ACME/tree?offset=3')
  })
})

describe('readPublicHost — what a page believes about its address', () => {
  const headers = (entries: Record<string, string>) => new Headers(entries)

  it('reads the router’s three headers', () => {
    expect(
      readPublicHost(
        headers({
          [PUBLIC_ADDRESS_KIND_HEADER]: 'workspace',
          [PUBLIC_HOST_HEADER]: 'ACME.motir.site:443',
          [PUBLIC_ORIGIN_HEADER]: 'https://acme.motir.site',
        }),
      ),
    ).toEqual({
      kind: 'workspace',
      host: 'acme.motir.site',
      origin: 'https://acme.motir.site',
    })
  })

  it('treats an origin that is not a bare origin as absent', () => {
    // It ends up in a robots.txt and a sitemap; a malformed value there is
    // worse than the https fallback it would have replaced.
    expect(
      readPublicHost(
        headers({
          [PUBLIC_ADDRESS_KIND_HEADER]: 'workspace',
          [PUBLIC_HOST_HEADER]: 'acme.motir.site',
          [PUBLIC_ORIGIN_HEADER]: 'https://evil.example/path',
        }),
      ).origin,
    ).toBeNull()
  })

  it('is the SITE when the router did not run — the normal case on motir.co', () => {
    expect(readPublicHost(headers({}))).toEqual(SITE_HOST)
  })

  it('reads `unresolved` as a real kind, carrying the host (MOTIR-4430)', () => {
    /*
     * The fourth shape: a host that is neither this site nor a tenant the
     * contract resolved. It arrives with a host and an origin like any tenant
     * kind — the router reads both off the request rather than off the
     * contract — and the whole point is that it is NOT `SITE_HOST`, because
     * `siteLinkFor` branches on the kind.
     */
    expect(
      readPublicHost(
        headers({
          [PUBLIC_ADDRESS_KIND_HEADER]: 'unresolved',
          [PUBLIC_HOST_HEADER]: 'Roadmap.Acme.com:443',
          [PUBLIC_ORIGIN_HEADER]: 'https://roadmap.acme.com',
        }),
      ),
    ).toEqual({
      kind: 'unresolved',
      host: 'roadmap.acme.com',
      origin: 'https://roadmap.acme.com',
    })
  })

  it('refuses a kind it does not know rather than trusting the string', () => {
    // The headers are forgeable: the router OVERWRITES them on every request it
    // handles, but a request it never handled arrives with whatever was sent.
    // An unknown value must read as the site, not as a third behaviour.
    expect(
      readPublicHost(headers({ [PUBLIC_ADDRESS_KIND_HEADER]: 'admin' })),
    ).toEqual(SITE_HOST)
    // The retired customer-domain kind is one of those now (MOTIR-9528).
    expect(
      readPublicHost(
        headers({
          [PUBLIC_ADDRESS_KIND_HEADER]: 'project',
          [PUBLIC_HOST_HEADER]: 'roadmap.acme.com',
        }),
      ),
    ).toEqual(SITE_HOST)
    expect(
      readPublicHost(headers({ [PUBLIC_ADDRESS_KIND_HEADER]: 'site' })),
    ).toEqual(SITE_HOST)
  })
})

describe('requestPublicHost — the one ambient read on the surface', () => {
  it('reads the router’s headers through `next/headers`', async () => {
    // ⚠️ THE IMPORT IS LAZY IN THE MODULE UNDER TEST, and that is not incidental
    // here either: `proxy.ts` imports this module, and `next/headers` does not
    // exist in the proxy runtime — a top-level import would throw there before
    // any routing ran. Mocking the specifier covers the dynamic import too.
    vi.doMock('next/headers', () => ({
      headers: async () =>
        new Headers({
          [PUBLIC_ADDRESS_KIND_HEADER]: 'workspace',
          [PUBLIC_HOST_HEADER]: 'acme.motir.site',
        }),
    }))
    try {
      const { requestPublicHost } = await import('@/lib/publicHost')
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

describe('publicPathFor keeps the page’s locale (MOTIR-7971)', () => {
  it('prefixes the site arm in every locale but English', () => {
    expect(publicPathFor(SITE_HOST, 'ACME', 'board', 'fr')).toBe(
      '/fr/p/ACME/board',
    )
    expect(publicPathFor(SITE_HOST, 'ACME', 'board', 'en')).toBe(
      '/p/ACME/board',
    )
    expect(publicPathFor(SITE_HOST, 'ACME', '', 'ja')).toBe('/ja/p/ACME')
    expect(
      publicPathWithQuery(
        SITE_HOST,
        'ACME',
        'changelog',
        { cursor: 'w9' },
        'fr',
      ),
    ).toBe('/fr/p/ACME/changelog?cursor=w9')
  })

  it('takes the same locale prefix on every kind, since every kind is the site’s shape', () => {
    for (const host of [WORKSPACE, UNRESOLVED]) {
      expect(publicPathFor(host, 'ACME', 'board', 'fr')).toBe(
        '/fr/p/ACME/board',
      )
    }
  })
})
