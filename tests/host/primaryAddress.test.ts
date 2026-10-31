import { describe, expect, it } from 'vitest'
import {
  currentHost,
  currentOrigin,
  publicUrlFor,
  SITE_HOST,
  type PublicHost,
} from '@/lib/publicHost'
import { SITE_ORIGIN } from '@/lib/siteOrigin'

/*
 * ONE CANONICAL PER PAGE (MOTIR-4222) — the helper every canonical, `og:url`,
 * JSON-LD `@id` and sitemap entry is built from. Nothing redirects to it any
 * more (MOTIR-9528): the per-host redirect retired with the customer domain.
 *
 * ⚠️ THE PRIMARY IS A PROPERTY OF THE PROJECT, NOT OF THE REQUEST, and that is
 * the whole design. `motir-core` decides it once (ADR §7: a promoted custom
 * domain, else the workspace subdomain, else `motir.co/p/<id>`) and sends it on
 * the subject DTO, so every consumer here reads ONE value rather than four
 * places re-deriving a rule.
 */

const ON_SITE = {
  identifier: 'PROD',
  addresses: { primary: 'https://motir.co/p/PROD' },
}
const ON_SUBDOMAIN = {
  identifier: 'PROD',
  addresses: { primary: 'https://acme.motir.site/PROD' },
}
const ON_CUSTOM = {
  identifier: 'PROD',
  addresses: { primary: 'https://roadmap.acme.com' },
}

const WORKSPACE: PublicHost = {
  kind: 'workspace',
  host: 'acme.motir.site',
  origin: 'https://acme.motir.site',
}

describe('publicUrlFor', () => {
  it('hangs a tab below the primary, whichever shape it has', () => {
    expect(publicUrlFor(ON_SITE, 'board')).toBe('https://motir.co/p/PROD/board')
    expect(publicUrlFor(ON_SUBDOMAIN, 'board')).toBe(
      'https://acme.motir.site/PROD/board',
    )
    expect(publicUrlFor(ON_CUSTOM, 'board')).toBe(
      'https://roadmap.acme.com/board',
    )
  })

  it('is the primary itself for the project’s own page', () => {
    expect(publicUrlFor(ON_SITE)).toBe('https://motir.co/p/PROD')
    expect(publicUrlFor(ON_CUSTOM)).toBe('https://roadmap.acme.com')
  })

  it('does not double a slash when the primary carries one', () => {
    // A customer domain's root can arrive either way depending on who wrote it;
    // `https://roadmap.acme.com//board` is a DIFFERENT URL that some proxies
    // redirect and some do not, which is exactly the ambiguity a canonical
    // cannot afford.
    expect(
      publicUrlFor(
        {
          identifier: 'PROD',
          addresses: { primary: 'https://roadmap.acme.com/' },
        },
        'board',
      ),
    ).toBe('https://roadmap.acme.com/board')
  })

  it('falls back to motir.co/p/<identifier> when the field has not arrived', () => {
    expect(publicUrlFor({ identifier: 'PROD' })).toBe(`${SITE_ORIGIN}/p/PROD`)
    expect(publicUrlFor({ identifier: 'A B' }, 'changelog')).toBe(
      `${SITE_ORIGIN}/p/A%20B/changelog`,
    )
  })

  it('carries a query when one is given, and nothing when it is not', () => {
    expect(publicUrlFor(ON_CUSTOM, 'items', '?cursor=w9')).toBe(
      'https://roadmap.acme.com/items?cursor=w9',
    )
    expect(publicUrlFor(ON_CUSTOM, 'items')).toBe(
      'https://roadmap.acme.com/items',
    )
  })
})

describe('currentHost / currentOrigin', () => {
  it('are the SITE’s when the router stepped aside', () => {
    expect(currentHost(SITE_HOST)).toBe(new URL(SITE_ORIGIN).host)
    expect(currentOrigin(SITE_HOST)).toBe(SITE_ORIGIN)
  })

  it('are the tenant’s, over https, when it did not', () => {
    // https is not an assumption: a tenant address serves only once its
    // certificate is ISSUED — `motir-core`'s `resolveHost` refuses every other
    // status — and the host redirects http to https.
    expect(currentHost(WORKSPACE)).toBe('acme.motir.site')
    expect(currentOrigin(WORKSPACE)).toBe('https://acme.motir.site')
    expect(currentOrigin({ ...WORKSPACE, origin: null })).toBe(
      'https://acme.motir.site',
    )
  })
})
