import {
  DEFAULT_PALETTE_ID,
  STYLE_DEFAULT_TYPE,
  STYLE_IDS,
  THEME_STORAGE_KEYS,
  type PaletteId,
  type StyleId,
  type TypeId,
} from '@motir/design-system'

/*
 * motir.co's own appearance (MOTIR-7724) — the ONE look every page is served:
 *
 *   - THEME: light. Never resolved from `prefers-color-scheme`; a visitor sees
 *     dark only by picking it on `/design`, and only for that visit.
 *   - STYLE: Hand-Drawn / Indie (the 2026-10 redesign).
 *   - PALETTE: the design system's default.
 *   - TYPE: the Grotesk pairing. Hand-drawn's own default type is the serif
 *     `editorial` pairing, which motir.co does not use; a visitor who PICKS
 *     another style on `/design` gets that style's own type, as the app gives
 *     it (`siteTypeForStyle`).
 *
 * ⚠️ NOTHING OUTLIVES THE VISIT. Every page is served with these four as
 * attributes on `<html>` (`src/layouts/SitePage.astro`,
 * `worker/render/document.tsx`), so they are right on the first byte. The site
 * used to run the package's `themeInitScript`, which followed the OS into dark
 * mode and replayed every `/design` choice from `localStorage` on every page
 * and every later visit; a `/design` pick now lasts for the visit only
 * (`lib/useVisitAppearance.ts`). Since the Astro build every link is a full
 * document load, so the visit's pick is kept in `sessionStorage` (this tab
 * only) and `visitAppearanceScript` replays it in `<head>` before the first
 * paint — and drops it on a reload, which starts a new visit.
 *
 * A NEW VISIT LANDS ON A RANDOM STYLE. With nothing stored for the tab (a new
 * tab, or a reload), the head script picks one of `LANDING_STYLES` and keeps
 * it for the visit like a `/design` pick; theme and palette stay the site's.
 * The server still renders the style below, which is what a visitor without
 * script, and an automated browser (`navigator.webdriver`), sees.
 */
export const SITE_DEFAULT_STYLE: StyleId = 'hand-drawn-indie'
export const SITE_DEFAULT_TYPE: TypeId = 'grotesk'

export const SITE_APPEARANCE = {
  pattern: 'light',
  style: SITE_DEFAULT_STYLE,
  palette: DEFAULT_PALETTE_ID as PaletteId,
  type: SITE_DEFAULT_TYPE,
} as const

/** The `<html>` attributes every motir.co page is served with. */
export const siteAppearanceAttributes = {
  'data-theme': SITE_APPEARANCE.pattern,
  'data-style': SITE_APPEARANCE.style,
  'data-palette': SITE_APPEARANCE.palette,
  'data-type': SITE_APPEARANCE.type,
} as const

/**
 * The type pairing a style wears on motir.co when the visitor has not pinned
 * one: Grotesk under the site's own style, the style's own default otherwise.
 */
export function siteTypeForStyle(style: StyleId): TypeId {
  return style === SITE_DEFAULT_STYLE
    ? SITE_DEFAULT_TYPE
    : (STYLE_DEFAULT_TYPE[style] as TypeId)
}

const SCRIPT_UNSAFE_CHAR_MAP: Record<string, string> = {
  '<': '\\u003C',
  '>': '\\u003E',
  '/': '\\u002F',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\0': '\\0',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
}

const escapeUnsafeScriptChars = (value: string): string =>
  value.replace(
    /[<>/\\\b\f\n\r\t\0\u2028\u2029]/g,
    (char) => SCRIPT_UNSAFE_CHAR_MAP[char] ?? char,
  )

/*
 * Forgets what the old persisting `/design` wrote. Nothing reads these keys
 * any more, so this changes nothing a visitor sees; it only stops a choice
 * made before MOTIR-7724 from sitting in their browser indefinitely.
 */
export const clearStoredAppearanceScript = `(function(){try{var ls=window.localStorage,k=${escapeUnsafeScriptChars(
  JSON.stringify(Object.values(THEME_STORAGE_KEYS)),
)};for(var i=0;i<k.length;i++){ls.removeItem(k[i]);}}catch(e){}})();`

/**
 * Where the visit's `/design` pick is kept between document loads: this tab's
 * `sessionStorage`, written only by `lib/useVisitAppearance.ts`.
 */
export const VISIT_APPEARANCE_KEY = 'motir-visit-appearance'

/**
 * Styles motir.co never lands on at random — they stay pickable on `/design`.
 */
export const LANDING_STYLE_EXCLUDED: readonly StyleId[] = [
  'retrofuturism',
  'high-contrast-accessible',
  'cybercore-y2k',
  'art-deco',
  'memphis',
  '3d-immersive',
]

/** The styles a new visit lands on, one picked at random. */
export const LANDING_STYLES: readonly StyleId[] = (
  STYLE_IDS as readonly StyleId[]
).filter((id) => !LANDING_STYLE_EXCLUDED.includes(id))

/**
 * The visit's landing look, kept beside the pick so `/design`'s Reset returns
 * to it rather than to a style the visitor never saw.
 */
export const VISIT_LANDING_KEY = 'motir-visit-landing'

const landingTypes = Object.fromEntries(
  LANDING_STYLES.map((id) => [id, siteTypeForStyle(id)]),
)

/*
 * Runs in every `<head>` before the first paint. A reload starts a new visit
 * (the stored pick is dropped); a link, back or forward keeps it. With nothing
 * stored, a new visit draws a random landing style and stores it. Then the
 * visit's look is replayed onto `<html>` — only the appearance attributes are
 * ever written, whatever the stored value holds.
 */
export const visitAppearanceScript = `(function(){try{var ss=window.sessionStorage,k=${escapeUnsafeScriptChars(
  JSON.stringify(VISIT_APPEARANCE_KEY),
)},lk=${escapeUnsafeScriptChars(JSON.stringify(VISIT_LANDING_KEY))},n=window.performance&&performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];if(n&&n.type==='reload'){ss.removeItem(k);ss.removeItem(lk);}var v=JSON.parse(ss.getItem(k)||'null');if(!v&&!navigator.webdriver){var t=${escapeUnsafeScriptChars(
  JSON.stringify(landingTypes),
)},o=Object.keys(t),s=o[Math.floor(Math.random()*o.length)],c={pattern:${escapeUnsafeScriptChars(
  JSON.stringify(SITE_APPEARANCE.pattern),
)},styleId:s,palette:${escapeUnsafeScriptChars(
  JSON.stringify(SITE_APPEARANCE.palette),
)},pinnedType:null,cjkFaces:{}};v={choice:c,attributes:{'data-theme':c.pattern,'data-style':s,'data-palette':c.palette,'data-type':t[s]},system:false};ss.setItem(k,JSON.stringify(v));ss.setItem(lk,JSON.stringify(c));}if(!v||typeof v.attributes!=='object'||!v.attributes)return;var h=document.documentElement,a=v.attributes;for(var x in a){if(/^data-(theme|style|palette|type|cjk-[a-z-]+)$/.test(x)&&typeof a[x]==='string')h.setAttribute(x,a[x]);}if(v.system&&window.matchMedia)h.setAttribute('data-theme',window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');}catch(e){}})();`

/** The one inline script every motir.co `<head>` runs. */
export const appearanceHeadScript =
  clearStoredAppearanceScript + visitAppearanceScript
