import { describe, expect, it } from 'vitest'
import { localeCookie, rememberLocale, switchHref } from '@/lib/languageSwitch'
import { LOCALE_COOKIE } from '@/lib/localeDetection'
import { SITE_HOST, type PublicHost } from '@/lib/publicHost'

/*
 * The two pure halves of the header's language switcher (MOTIR-7953): where an
 * entry points on each kind of host, and the cookie a choice writes.
 */

const WORKSPACE: PublicHost = {
  kind: 'workspace',
  host: 'acme.motir.site',
  origin: 'https://acme.motir.site',
}

describe('switchHref — on motir.co the address is the language', () => {
  it.each([
    ['/explore', 'fr', '/fr/explore'],
    ['/explore', 'en', '/explore'],
    ['/', 'ja', '/ja'],
    ['/', 'en', '/'],
    ['/docs/mcp', 'zh', '/zh/docs/mcp'],
  ] as const)('%s in %s is %s', (path, locale, href) => {
    expect(switchHref(SITE_HOST, path, locale)).toBe(href)
  })
})

describe('switchHref — a tenant address never carries a prefix', () => {
  it.each([['a workspace subdomain', WORKSPACE, '/MOTIR/changelog']])(
    'on %s the entry is the same path',
    (_label, host, path) => {
      expect(switchHref(host, path, 'fr')).toBe(path)
      expect(switchHref(host, path, 'en')).toBe(path)
    },
  )
})

describe('localeCookie', () => {
  it('is the remembered-choice cookie the proxy reads, for a year', () => {
    expect(localeCookie('fr', true)).toBe(
      `${LOCALE_COOKIE}=fr; Path=/; Max-Age=31536000; SameSite=Lax; Secure`,
    )
    expect(localeCookie('fr', true)).toBe(
      'NEXT_LOCALE=fr; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
    )
  })

  it('is host-only — it names no Domain', () => {
    expect(localeCookie('de', true)).not.toMatch(/domain/i)
    expect(localeCookie('de', false)).not.toMatch(/domain/i)
  })

  it('is Secure only on https', () => {
    expect(localeCookie('ja', false)).toBe(
      `${LOCALE_COOKIE}=ja; Path=/; Max-Age=31536000; SameSite=Lax`,
    )
  })
})

describe('rememberLocale', () => {
  it('writes the cookie on this host', () => {
    rememberLocale('pl')
    expect(document.cookie).toContain(`${LOCALE_COOKIE}=pl`)
  })
})
