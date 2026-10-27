import { describe, expect, it, vi } from 'vitest'
import {
  currentHost,
  currentOrigin,
  isOnPrimaryHost,
  publicUrlFor,
  SITE_HOST,
  type PublicHost,
} from '@/lib/publicHost'
import { SITE_ORIGIN } from '@/lib/siteOrigin'

/*
 * ONE CANONICAL PER PAGE (MOTIR-4222) — the helper every canonical, `og:url`,
 * JSON-LD `@id`, sitemap entry and redirect is built from.
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
const CUSTOM: PublicHost = {
  kind: 'project',
  host: 'roadmap.acme.com',
  origin: 'https://roadmap.acme.com',
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
    expect(currentOrigin(CUSTOM)).toBe('https://roadmap.acme.com')
  })
})

describe('isOnPrimaryHost — the redirect’s whole decision', () => {
  it('is true only where the canonical lives', () => {
    expect(isOnPrimaryHost(ON_SITE, SITE_HOST)).toBe(true)
    expect(isOnPrimaryHost(ON_SUBDOMAIN, WORKSPACE)).toBe(true)
    expect(isOnPrimaryHost(ON_CUSTOM, CUSTOM)).toBe(true)
  })

  it('is false on every OTHER address, motir.co included', () => {
    // ⚠️ THE motir.co ARM IS THE ONE THE ADR NAMES AS THE CONSEQUENCE (§7):
    // once a project's primary moves, `motir.co/p/<identifier>` for that project
    // becomes a redirect and serves no tenant content at all.
    expect(isOnPrimaryHost(ON_CUSTOM, SITE_HOST)).toBe(false)
    expect(isOnPrimaryHost(ON_SUBDOMAIN, SITE_HOST)).toBe(false)
    expect(isOnPrimaryHost(ON_CUSTOM, WORKSPACE)).toBe(false)
    expect(isOnPrimaryHost(ON_SITE, CUSTOM)).toBe(false)
  })
})

describe('redirectIfNotPrimary', () => {
  const permanentRedirect = vi.fn()

  async function load() {
    vi.doMock('next/navigation', () => ({ permanentRedirect }))
    return import('@/lib/publicHost')
  }

  it('does NOTHING on the primary host — a redirect to itself is a loop', async () => {
    permanentRedirect.mockClear()
    const { redirectIfNotPrimary } = await load()
    try {
      await redirectIfNotPrimary(ON_CUSTOM, CUSTOM, 'board')
      expect(permanentRedirect).not.toHaveBeenCalled()
    } finally {
      vi.doUnmock('next/navigation')
    }
  })

  it('sends the SAME PATH on the primary, query preserved', async () => {
    permanentRedirect.mockClear()
    const { redirectIfNotPrimary } = await load()
    try {
      await redirectIfNotPrimary(ON_CUSTOM, SITE_HOST, 'items', '?cursor=w9')
      expect(permanentRedirect).toHaveBeenCalledWith(
        'https://roadmap.acme.com/items?cursor=w9',
      )
    } finally {
      vi.doUnmock('next/navigation')
    }
  })

  it('carries a workspace visitor to a promoted custom domain', async () => {
    permanentRedirect.mockClear()
    const { redirectIfNotPrimary } = await load()
    try {
      await redirectIfNotPrimary(ON_CUSTOM, WORKSPACE, 'board')
      expect(permanentRedirect).toHaveBeenCalledWith(
        'https://roadmap.acme.com/board',
      )
    } finally {
      vi.doUnmock('next/navigation')
    }
  })
})
