import { useEffect, useSyncExternalStore } from 'react'
import type {
  PaletteId,
  StyleId,
  ThemePattern,
  TypeId,
} from '@motir/design-system'
import {
  SITE_APPEARANCE,
  VISIT_APPEARANCE_KEY,
  VISIT_LANDING_KEY,
  siteTypeForStyle,
} from '@/lib/siteDefaults'
import {
  CJK_LANGS,
  cjkAttribute,
  defaultCjkFace,
  type CjkLang,
} from '@/lib/cjkFaces'

/*
 * The appearance a visitor picks on `/design` — for THIS VISIT (MOTIR-7724).
 *
 * A pick restyles the WHOLE of motir.co, not just `/design`: it is written
 * onto `<html>` (four `data-*` attributes `theme.css` re-resolves for every
 * element), and motir.co has one root layout whose `<html>` survives every
 * client-side navigation, so the bar, the footer and every page the visitor
 * moves on to keep the look. Coming back to `/design` shows the same choice,
 * because it is held here, in memory, rather than read back off the page.
 *
 * ⚠️ AND NOTHING OUTLIVES THE VISIT. Since the Astro build every link is a
 * full document load, so the module-level value alone would be lost on the
 * next page; it is mirrored into this tab's `sessionStorage`
 * (`VISIT_APPEARANCE_KEY`), which `visitAppearanceScript` replays onto
 * `<html>` in every page's `<head>`. A new tab or a reload is a new visit,
 * which lands on a random style (`LANDING_STYLES`, drawn by the head script).
 *
 * This replaces the package's `ThemeProvider` here on purpose: that provider
 * seeds from `localStorage` with the APP's defaults as its fallback (which is
 * what restyled the site on arrival) and persists every pick.
 */

interface VisitChoice {
  pattern: ThemePattern
  styleId: StyleId
  palette: PaletteId
  /** A pinned pairing outranks the style's own; null follows the style. */
  pinnedType: TypeId | null
  /** The CJK font picked per language (`lib/cjkFaces.ts`); absent is the default. */
  cjkFaces: Partial<Record<CjkLang, string>>
}

const SITE_CHOICE: VisitChoice = {
  pattern: SITE_APPEARANCE.pattern,
  styleId: SITE_APPEARANCE.style,
  palette: SITE_APPEARANCE.palette,
  pinnedType: null,
  cjkFaces: {},
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

/** What `visitAppearanceScript` writes onto `<html>` for a choice. */
function attributesFor(c: VisitChoice): Record<string, string> {
  const attributes: Record<string, string> = {
    'data-theme': c.pattern === 'system' ? 'light' : c.pattern,
    'data-style': c.styleId,
    'data-palette': c.palette,
    'data-type': c.pinnedType ?? siteTypeForStyle(c.styleId),
  }
  for (const lang of CJK_LANGS) {
    const face = c.cjkFaces[lang]
    if (face) attributes[cjkAttribute(lang)] = face
  }
  return attributes
}

function asChoice(value: unknown): VisitChoice | null {
  const c = value as Partial<VisitChoice> | null | undefined
  if (
    c &&
    typeof c.pattern === 'string' &&
    typeof c.styleId === 'string' &&
    typeof c.palette === 'string'
  ) {
    return {
      pattern: c.pattern,
      styleId: c.styleId,
      palette: c.palette,
      pinnedType: typeof c.pinnedType === 'string' ? c.pinnedType : null,
      cjkFaces: c.cjkFaces && typeof c.cjkFaces === 'object' ? c.cjkFaces : {},
    }
  }
  return null
}

function readJson(key: string): unknown {
  try {
    const raw = storage()?.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Unreadable or blocked storage is a fresh visit.
    return null
  }
}

/*
 * The look this visit landed on: the random style `visitAppearanceScript`
 * drew, or the site look when it drew none (no script storage, an automated
 * browser). Reset returns here, and "off default" is measured from here.
 */
const landing = asChoice(readJson(VISIT_LANDING_KEY)) ?? SITE_CHOICE

function readStoredChoice(): VisitChoice {
  const stored = readJson(VISIT_APPEARANCE_KEY) as { choice?: unknown } | null
  return asChoice(stored?.choice) ?? landing
}

function storeChoice() {
  try {
    const store = storage()
    if (!store) return
    if (choice === SITE_CHOICE) store.removeItem(VISIT_APPEARANCE_KEY)
    else
      store.setItem(
        VISIT_APPEARANCE_KEY,
        JSON.stringify({
          choice,
          attributes: attributesFor(choice),
          system: choice.pattern === 'system',
        }),
      )
  } catch {
    // Blocked storage: the pick still holds for this page.
  }
}

let choice = readStoredChoice()
const listeners = new Set<() => void>()

function subscribeChoice(onChange: () => void) {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

function updateChoice(patch: Partial<VisitChoice>) {
  choice = { ...choice, ...patch }
  storeChoice()
  for (const listener of listeners) listener()
}

/** Back to the look the visit landed on. Reset does this; tests call it too. */
export function forgetVisitAppearance() {
  choice = landing
  storeChoice()
  for (const listener of listeners) listener()
}

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeColorScheme(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const prefersDark = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia(DARK_QUERY).matches

export function useVisitAppearance() {
  const current = useSyncExternalStore(
    subscribeChoice,
    () => choice,
    () => SITE_CHOICE,
  )
  const osDark = useSyncExternalStore(
    subscribeColorScheme,
    prefersDark,
    () => false,
  )

  const { pattern, styleId, palette, pinnedType, cjkFaces } = current
  const type = pinnedType ?? siteTypeForStyle(styleId)
  const resolvedPattern =
    pattern === 'system' ? (osDark ? 'dark' : 'light') : pattern

  // `osDark` is a dependency even when the pattern is not `system`: the
  // package's `TokensSpecimen` runs its own provider, which re-stamps
  // `data-theme` from the OS when it changes, and this write must answer it.
  // Nothing is undone on unmount — the choice is the whole site's.
  useEffect(() => {
    // Hydration renders the server snapshot (the site look) before the stored
    // pick; writing it would undo what the head script replayed. The re-render
    // with the stored pick follows and writes that instead.
    if (current !== choice) return
    const html = document.documentElement
    html.setAttribute('data-theme', resolvedPattern)
    html.setAttribute('data-style', styleId)
    html.setAttribute('data-palette', palette)
    html.setAttribute('data-type', type)
    for (const lang of CJK_LANGS) {
      const face = cjkFaces[lang]
      if (face) html.setAttribute(cjkAttribute(lang), face)
      else html.removeAttribute(cjkAttribute(lang))
    }
  }, [current, resolvedPattern, styleId, palette, type, cjkFaces, osDark])

  // Hydration renders the server snapshot, which never knows the landing
  // style; measuring it against the site look keeps Reset out of that pass,
  // as in the server HTML. The re-render with the stored pick measures from
  // the landing style.
  const base = current === choice ? landing : SITE_CHOICE
  const offDefault =
    pattern !== base.pattern ||
    styleId !== base.styleId ||
    palette !== base.palette ||
    type !== (base.pinnedType ?? siteTypeForStyle(base.styleId)) ||
    Object.keys(cjkFaces).length > 0

  return {
    pattern,
    styleId,
    palette,
    type,
    cjkFaces,
    offDefault,
    setPattern: (next: ThemePattern) => updateChoice({ pattern: next }),
    setStyleId: (next: StyleId) => updateChoice({ styleId: next }),
    setPalette: (next: PaletteId) => updateChoice({ palette: next }),
    setType: (next: TypeId) => updateChoice({ pinnedType: next }),
    // Picking the default face forgets the pick, so Reset shows only while a
    // language is genuinely off its default.
    setCjkFace: (lang: CjkLang, face: string) => {
      const next = { ...cjkFaces }
      if (face === defaultCjkFace(lang)) delete next[lang]
      else next[lang] = face
      updateChoice({ cjkFaces: next })
    },
    reset: forgetVisitAppearance,
  }
}
