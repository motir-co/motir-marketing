import { readFileSync } from 'node:fs'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  LANDING_STYLES,
  LANDING_STYLE_EXCLUDED,
  SITE_APPEARANCE,
  VISIT_APPEARANCE_KEY,
  VISIT_LANDING_KEY,
  appearanceHeadScript,
  siteAppearanceAttributes,
  visitAppearanceScript,
} from '@/lib/siteDefaults'
import {
  forgetVisitAppearance,
  useVisitAppearance,
} from '@/lib/useVisitAppearance'

/*
 * A /design pick lasts for the visit across document loads. Since the Astro
 * build every link is a full load, so the pick is kept in this tab's
 * sessionStorage and `visitAppearanceScript` replays it in every `<head>`;
 * a reload is the site look again.
 */

const html = document.documentElement

function servedPage() {
  for (const name of [...html.getAttributeNames()])
    if (name.startsWith('data-')) html.removeAttribute(name)
  for (const [name, value] of Object.entries(siteAppearanceAttributes))
    html.setAttribute(name, value)
}

function navigation(type: string) {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
    { type } as unknown as PerformanceEntry,
  ])
}

afterEach(() => {
  act(() => forgetVisitAppearance())
  vi.restoreAllMocks()
  window.sessionStorage.clear()
  servedPage()
})

describe('a /design pick across document loads', () => {
  it('is stored for the tab and replayed on the next page', () => {
    const { result } = renderHook(() => useVisitAppearance())
    act(() => result.current.setStyleId('neo-brutalism'))
    act(() => result.current.setPattern('dark'))
    act(() => result.current.setCjkFace('ja', 'noto-serif-jp'))
    expect(window.sessionStorage.getItem(VISIT_APPEARANCE_KEY)).not.toBeNull()

    servedPage()
    navigation('navigate')
    new Function(visitAppearanceScript)()
    expect(html.getAttribute('data-style')).toBe('neo-brutalism')
    expect(html.getAttribute('data-theme')).toBe('dark')
    expect(html.getAttribute('data-cjk-ja')).toBe('noto-serif-jp')
  })

  it('is forgotten on a reload, which lands as a new visit', () => {
    const { result } = renderHook(() => useVisitAppearance())
    act(() => result.current.setStyleId('neo-brutalism'))

    servedPage()
    navigation('reload')
    vi.spyOn(Math, 'random').mockReturnValue(0)
    new Function(visitAppearanceScript)()
    expect(html.getAttribute('data-style')).toBe(LANDING_STYLES[0])
  })

  it('leaves storage empty after Reset', () => {
    const { result } = renderHook(() => useVisitAppearance())
    act(() => result.current.setStyleId('neo-brutalism'))
    act(() => result.current.reset())
    expect(window.sessionStorage.getItem(VISIT_APPEARANCE_KEY)).toBeNull()
  })

  it('writes nothing but appearance attributes, whatever is stored', () => {
    window.sessionStorage.setItem(
      VISIT_APPEARANCE_KEY,
      JSON.stringify({
        attributes: { onclick: 'x', class: 'y', 'data-style': 'aurora' },
      }),
    )
    navigation('navigate')
    new Function(visitAppearanceScript)()
    expect(html.hasAttribute('onclick')).toBe(false)
    expect(html.getAttribute('class')).not.toBe('y')
    expect(html.getAttribute('data-style')).toBe('aurora')
  })

  it('runs in both document heads', () => {
    expect(appearanceHeadScript).toContain(visitAppearanceScript)
    expect(readFileSync('src/layouts/SitePage.astro', 'utf8')).toMatch(
      /set:html=\{appearanceHeadScript\}/,
    )
    expect(readFileSync('worker/render/document.tsx', 'utf8')).toMatch(
      /\$\{appearanceHeadScript\}/,
    )
  })
})

describe('a new visit', () => {
  it('lands on a random style and keeps it for the visit', () => {
    navigation('navigate')
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    new Function(visitAppearanceScript)()
    const style = LANDING_STYLES[Math.floor(0.5 * LANDING_STYLES.length)]!
    expect(html.getAttribute('data-style')).toBe(style)
    expect(html.getAttribute('data-theme')).toBe(SITE_APPEARANCE.pattern)
    expect(html.getAttribute('data-palette')).toBe(SITE_APPEARANCE.palette)

    // The next page replays the same style instead of drawing again.
    servedPage()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    new Function(visitAppearanceScript)()
    expect(html.getAttribute('data-style')).toBe(style)
    expect(
      JSON.parse(window.sessionStorage.getItem(VISIT_LANDING_KEY)!).styleId,
    ).toBe(style)
  })

  it('never lands on an excluded style', () => {
    expect(LANDING_STYLE_EXCLUDED).toEqual([
      'retrofuturism',
      'high-contrast-accessible',
      'cybercore-y2k',
      'art-deco',
      'memphis',
      '3d-immersive',
    ])
    navigation('navigate')
    const seen = new Set<string>()
    for (let i = 0; i < LANDING_STYLES.length; i++) {
      window.sessionStorage.clear()
      vi.spyOn(Math, 'random').mockReturnValue(
        (i + 0.5) / LANDING_STYLES.length,
      )
      new Function(visitAppearanceScript)()
      seen.add(html.getAttribute('data-style')!)
    }
    expect([...seen].sort()).toEqual([...LANDING_STYLES].sort())
    for (const id of LANDING_STYLE_EXCLUDED) expect(seen.has(id)).toBe(false)
  })

  it('keeps the served style for an automated browser', () => {
    navigation('navigate')
    Object.defineProperty(navigator, 'webdriver', {
      value: true,
      configurable: true,
    })
    try {
      new Function(visitAppearanceScript)()
    } finally {
      Reflect.deleteProperty(navigator, 'webdriver')
    }
    expect(html.getAttribute('data-style')).toBe(SITE_APPEARANCE.style)
    expect(window.sessionStorage.getItem(VISIT_APPEARANCE_KEY)).toBeNull()
  })

  it('makes the landing style what /design starts from and resets to', async () => {
    window.sessionStorage.setItem(
      VISIT_LANDING_KEY,
      JSON.stringify({
        pattern: 'light',
        styleId: 'bento',
        palette: SITE_APPEARANCE.palette,
        pinnedType: null,
        cjkFaces: {},
      }),
    )
    vi.resetModules()
    const fresh = await import('@/lib/useVisitAppearance')
    const { result } = renderHook(() => fresh.useVisitAppearance())
    expect(result.current.styleId).toBe('bento')
    expect(result.current.offDefault).toBe(false)

    act(() => result.current.setStyleId('aurora'))
    expect(result.current.offDefault).toBe(true)
    act(() => result.current.reset())
    expect(result.current.styleId).toBe('bento')
    expect(html.getAttribute('data-style')).toBe('bento')
  })
})
