import { readFileSync } from 'node:fs'
import {
  DEFAULT_PALETTE_ID,
  PALETTE_IDS,
  THEME_STORAGE_KEYS,
} from '@motir/design-system'
import { afterEach, describe, expect, it } from 'vitest'
import {
  SITE_APPEARANCE,
  clearStoredAppearanceScript,
  siteAppearanceAttributes,
  siteTypeForStyle,
} from '@/lib/siteDefaults'

/*
 * The look every motir.co page is served (MOTIR-7724): light, Hand-Drawn /
 * Indie, the default palette, Grotesk — rendered on <html> by the root layout,
 * never resolved from the OS and never replayed from storage.
 */

// The one place a built page's `<html>` is written (MOTIR-10643).
const LAYOUT = readFileSync('src/layouts/SitePage.astro', 'utf8')

afterEach(() => {
  window.localStorage.clear()
})

describe("motir.co's appearance", () => {
  it('is light, Hand-Drawn / Indie, the default palette and Grotesk', () => {
    expect(siteAppearanceAttributes).toEqual({
      'data-theme': 'light',
      'data-style': 'hand-drawn-indie',
      'data-palette': DEFAULT_PALETTE_ID,
      'data-type': 'grotesk',
    })
  })

  it('is the monochrome Motir palette — the MOTIR-6471 rename, as installed', () => {
    // Pinned on 0.1.3, `motir` named the warm scheme (MOTIR-6616); the pin IS
    // the change, so this is what proves it landed.
    expect(SITE_APPEARANCE.palette).toBe('motir')
    expect(PALETTE_IDS.slice(0, 2)).toEqual(['motir', 'amethyst'])
    expect(PALETTE_IDS).not.toContain('graphite')
  })

  it('pairs Grotesk with the site style, and a picked style with its own type', () => {
    expect(siteTypeForStyle('hand-drawn-indie')).toBe('grotesk')
    expect(siteTypeForStyle('neo-brutalism')).not.toBe('grotesk')
  })
})

describe('the root layout', () => {
  it('renders the site look on <html> server-side', () => {
    expect(LAYOUT).toMatch(/\{\.\.\.siteAppearanceAttributes\}/)
  })

  it('runs no theme init script — nothing follows the OS or replays storage', () => {
    expect(LAYOUT).not.toMatch(/themeInitScript|siteDefaultsScript/)
  })
})

describe('the stored-choice cleanup', () => {
  it('removes every key the old persisting /design wrote', () => {
    for (const key of Object.values(THEME_STORAGE_KEYS)) {
      window.localStorage.setItem(key, 'dark')
    }
    window.localStorage.setItem('unrelated', 'kept')
    new Function(clearStoredAppearanceScript)()
    for (const key of Object.values(THEME_STORAGE_KEYS)) {
      expect(window.localStorage.getItem(key)).toBeNull()
    }
    expect(window.localStorage.getItem('unrelated')).toBe('kept')
  })

  it('touches nothing on <html>', () => {
    const before = document.documentElement.getAttributeNames()
    new Function(clearStoredAppearanceScript)()
    expect(document.documentElement.getAttributeNames()).toEqual(before)
  })
})
