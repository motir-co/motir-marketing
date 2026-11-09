import { describe, expect, it, vi } from 'vitest'
import {
  assertTenantDomainConfigured,
  DEFAULT_TENANT_DOMAIN,
  MotirTenantDomainError,
  TENANT_DOMAIN_ENV_VAR,
  parseTenantDomain,
} from '@/lib/tenantDomain'

/*
 * THE BASE-DOMAIN ACCESSOR (MOTIR-4220's fourth acceptance criterion).
 *
 * `tests/appOrigin.test.ts` and `tests/siteOrigin.test.ts` are the two shapes
 * this sits between — one throws always, one defaults always. The asymmetry
 * here is the point, so it is what is asserted.
 */

describe('parseTenantDomain', () => {
  it('takes the local default when unset OUTSIDE production', () => {
    expect(parseTenantDomain(undefined, false)).toBe(DEFAULT_TENANT_DOMAIN)
    expect(parseTenantDomain('', false)).toBe(DEFAULT_TENANT_DOMAIN)
    expect(parseTenantDomain('   ', false)).toBe(DEFAULT_TENANT_DOMAIN)
  })

  it('THROWS when unset in production, naming the variable', () => {
    // A production build that silently took `localhost` as its tenant namespace
    // would treat the real base domain as an unknown host and 404 it, with
    // nothing red anywhere. `next build` failing is the only cheap moment.
    expect(() => parseTenantDomain(undefined, true)).toThrow(
      MotirTenantDomainError,
    )
    expect(() => parseTenantDomain(undefined, true)).toThrow(
      TENANT_DOMAIN_ENV_VAR,
    )
  })

  it('normalises case', () => {
    expect(parseTenantDomain('Motir.Site', true)).toBe('motir.site')
  })

  it('refuses anything that is not a bare hostname, in every environment', () => {
    // A value compared against a `Host` header has to be the host ALONE. An
    // origin, a port or a trailing path never matches, so it would present as
    // "every tenant host 404s" rather than as a configuration error.
    for (const bad of [
      'https://motir.site',
      'motir.site/',
      'motir.site:443',
      'motir site',
      '-motir.site',
    ]) {
      expect(() => parseTenantDomain(bad, false), bad).toThrow(
        MotirTenantDomainError,
      )
    }
  })
})

describe('assertTenantDomainConfigured — the build-time guard', () => {
  it('throws in production when the variable is absent', () => {
    // ⚠️ THE GUARD `next.config.ts` CALLS. Its whole reason for existing is that
    // nothing else evaluates this module during a build — `lib/tenantDomain.ts`
    // carries the measurement. A guard nobody exercises is a comment.
    vi.stubEnv('PUBLIC_MOTIR_TENANT_DOMAIN', '')
    try {
      expect(() => assertTenantDomainConfigured(true)).toThrow(
        MotirTenantDomainError,
      )
      expect(() => assertTenantDomainConfigured(false)).not.toThrow()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('passes in production when it is set', () => {
    vi.stubEnv('PUBLIC_MOTIR_TENANT_DOMAIN', 'motir.site')
    try {
      expect(() => assertTenantDomainConfigured(true)).not.toThrow()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
