import { readFileSync } from 'node:fs'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SITE_APPEARANCE,
  VISIT_APPEARANCE_KEY,
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

  it('is forgotten on a reload', () => {
    const { result } = renderHook(() => useVisitAppearance())
    act(() => result.current.setStyleId('neo-brutalism'))

    servedPage()
    navigation('reload')
    new Function(visitAppearanceScript)()
    expect(html.getAttribute('data-style')).toBe(SITE_APPEARANCE.style)
    expect(window.sessionStorage.getItem(VISIT_APPEARANCE_KEY)).toBeNull()
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
