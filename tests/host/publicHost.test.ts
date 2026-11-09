import { describe, expect, it } from 'vitest'
import * as publicHostModule from '@/lib/publicHost'
import {
  SITE_HOST,
  UNKNOWN_HOST,
  publicPathFor,
  publicPathWithQuery,
} from '@/lib/publicHost'

/*
 * THE LINK SHAPE, ON BOTH HOST KINDS (MOTIR-4220 · MOTIR-10811).
 *
 * Asserted twice: here, on the helper every link goes through, and in the
 * rendered-page tests beside this file, which is what catches a component that
 * stopped going through it. The tenant `workspace` kind left with the Next
 * `proxy.ts` that produced it (MOTIR-10811), so the kinds are the site and the
 * 404 room's `unresolved`.
 */

describe('publicPathFor — one shape, the site’s, for every kind (MOTIR-9528)', () => {
  it('is /p/<id>/<tab> on the site', () => {
    expect(publicPathFor(SITE_HOST, 'ACME', 'board', 'en')).toBe(
      '/p/ACME/board',
    )
    expect(publicPathFor(SITE_HOST, 'ACME', '', 'en')).toBe('/p/ACME')
  })

  it('never produces a path at a host’s root — no kind can spell a customer root', () => {
    for (const host of [SITE_HOST, UNKNOWN_HOST]) {
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
      publicPathWithQuery(
        UNKNOWN_HOST,
        'ACME',
        'items',
        { cursor: 'w9' },
        'en',
      ),
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
    expect(publicPathFor(UNKNOWN_HOST, 'ACME', 'board', 'fr')).toBe(
      '/fr/p/ACME/board',
    )
  })
})

describe('the address vocabulary cannot spell a customer host (MOTIR-9531)', () => {
  it('exports neither page-redirect helper', () => {
    // Read off the module's bindings, not its source, so a re-export under
    // another file's name still fails here.
    const exported = Object.keys(publicHostModule)
    expect(exported).not.toContain('redirectIfNotPrimary')
    expect(exported).not.toContain('isOnPrimaryHost')
  })
})

describe('the address vocabulary has no tenant half (MOTIR-10811)', () => {
  it('exports no request-header reader, header name or tenant-host helper', () => {
    // Their one producer was the Next `proxy.ts` (deleted, MOTIR-10639); the
    // Worker serves motir.co alone (MOTIR-10113) and writes none of them. Read
    // off the module's bindings so a re-export under another name fails too.
    const exported = Object.keys(publicHostModule)
    for (const name of [
      'readPublicHost',
      'PUBLIC_HOST_HEADER',
      'PUBLIC_ADDRESS_KIND_HEADER',
      'PUBLIC_ORIGIN_HEADER',
      'normaliseHost',
      'currentHost',
      'currentOrigin',
    ]) {
      expect(exported).not.toContain(name)
    }
  })

  it('names the site and the 404 room by their kind alone', () => {
    expect(SITE_HOST).toEqual({ kind: 'site' })
    expect(UNKNOWN_HOST).toEqual({ kind: 'unresolved' })
  })
})
