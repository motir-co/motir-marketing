import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { OG_FONT_FAMILY } from '@motir/brand'
import manifest from './og-fonts/manifest.json'

// Inter, for the share cards (MOTIR-1154 · motir-core
// `design/brand/design-notes.md` §6 "OG template").
//
// ⚠️ TWO READERS (MOTIR-10647). The landing's per-locale card is drawn ONCE, at
// `astro build`, by `app/_brand/localeShareCard.tsx`, which hands these bytes
// to satori directly. The per-project card under
// `app/[locale]/p/[identifier]/opengraph-image.tsx` still draws per request
// through Next's image route until the Worker-routes story ports it, and the tracer
// notes below are about that reader alone.
//
// satori renders OUTSIDE the CSS tree: it cannot read `--font-sans-source`,
// cannot see the faces the page loads, and has no system font stack to fall
// back to. The only way it gets a typeface is its `fonts` option, and the only
// thing that option accepts is font BYTES — so the faces are read off disk. A
// template that sets `fontFamily: 'sans-serif'` does not error; it silently
// ships whatever face the build container happens to have, which is exactly the
// defect §6 records against motir-core's own two cards.
//
// ⚠️ THE BYTES COME FROM `@motir/brand` NOW, AND THAT IS THE POINT (MOTIR-3848).
// They used to be committed here AND in motir-core — three binaries,
// byte-identical, with no shared owner, against MOTIR-3724's own ruling that
// Motir's brand chrome has ONE home across both properties. The header that
// stood here recorded the duplication as "a known cost, not an oversight",
// because `@motir/brand` published `dist` + `brand.css` and carried no font
// assets; it now carries them, in `fonts/`, listed in `files` and exposed as
// `@motir/brand/fonts/*`. The reasoning that used to live here — WHY THREE
// FILES (400 / 700 / 800, and satori does not synthesise weight) and WHY `.ttf`
// (satori cannot decompress WOFF2, which is all Google Fonts serves a modern
// browser) — travelled with the bytes, into
// `motir-core/packages/brand/src/ogFonts.ts`.
//
// ⚠️ EVERY SEGMENT OF `FONT_DIR` IS A LITERAL, AND `OG_FONT_FACES` IS A LOCAL
// ARRAY OF LITERALS — BOTH DELIBERATELY, AND THIS IS THE ONE THING THE MOVE
// COULD HAVE BROKEN. `outputFileTracingIncludes` is INERT under Next 16's
// Turbopack build (`collect-build-traces.js` is skipped entirely). What actually
// ships these bytes is Turbopack's own tracer, which follows this read only
// BECAUSE the path is statically analysable — a value returned from a function
// call is not, and its fallback for an unresolvable read is to trace the ENTIRE
// project (motir-core MOTIR-3219: 4510 files, a 464 MB standalone image). That
// is why `@motir/brand` exports a MANIFEST and no path helper, and why this file
// repeats the face list rather than mapping over the imported one.
// `tests/ogFonts.test.ts` pins these literals against the package's.
//
// For the per-project card, verify by grepping its built `route.js.nft.json`
// for the file names, never by reading the config. The build-time card reads
// from the checkout, where every path exists.
//
// ── THE CJK FACES (MOTIR-7972) ─────────────────────────────────────────────
// Inter has no Han, kana or Hangul, so a `zh` / `ja` / `ko` card would draw
// tofu — or satori would be handed a fallback face this site never chose. Each
// of those locales gets the DEFAULT sans member of its font set
// (`@motir/design-system`'s `FONT_SET_REGISTRY`: Noto Sans SC / JP / KR) at the
// three weights, as SUBSETS committed in `og-fonts/`: a full Noto Sans JP is
// several MB per weight, the subset a few KB. They are cut by
// `pnpm brand:og-fonts` from exactly the three strings the card draws, and
// `og-fonts/manifest.json` records what each was cut from.
// `tests/ogFonts.test.ts` checks every drawn character against the faces'
// cmaps, so a catalogue edit that outgrows a subset fails CI instead of
// drawing tofu.
//
// ⚠️ ONE EXPLICIT BRANCH PER LOCALE, EACH PATH A LITERAL — the same tracer rule
// as `FONT_DIR` above. A template string over the locale is not statically
// analysable.

const FONT_DIR = path.join(
  process.cwd(),
  'node_modules',
  '@motir',
  'brand',
  'fonts',
)

/** The faces this site loads, as literals the tracer can follow. */
export const OG_FONT_FACES = [
  { file: 'Inter-Regular.ttf', weight: 400 as const },
  { file: 'Inter-Bold.ttf', weight: 700 as const },
  { file: 'Inter-ExtraBold.ttf', weight: 800 as const },
]

/** The family name the OG template sets as `fontFamily` — the package owns it. */
export { OG_FONT_FAMILY }

export interface OgFont {
  name: string
  data: Buffer
  weight: Weight
  style: 'normal'
}

const OG_CJK_DIR = path.join(process.cwd(), 'app', '_brand', 'og-fonts')

type Weight = 400 | 700 | 800

/** A CJK locale's subset faces, as literal paths, or none for a Latin one. */
function cjkFaces(locale: string): { path: string; weight: Weight }[] {
  switch (locale) {
    case 'zh':
      return [
        { path: path.join(OG_CJK_DIR, 'zh-400.ttf'), weight: 400 },
        { path: path.join(OG_CJK_DIR, 'zh-700.ttf'), weight: 700 },
        { path: path.join(OG_CJK_DIR, 'zh-800.ttf'), weight: 800 },
      ]
    case 'zh-tw':
      return [
        { path: path.join(OG_CJK_DIR, 'zh-tw-400.ttf'), weight: 400 },
        { path: path.join(OG_CJK_DIR, 'zh-tw-700.ttf'), weight: 700 },
        { path: path.join(OG_CJK_DIR, 'zh-tw-800.ttf'), weight: 800 },
      ]
    case 'ja':
      return [
        { path: path.join(OG_CJK_DIR, 'ja-400.ttf'), weight: 400 },
        { path: path.join(OG_CJK_DIR, 'ja-700.ttf'), weight: 700 },
        { path: path.join(OG_CJK_DIR, 'ja-800.ttf'), weight: 800 },
      ]
    case 'ko':
      return [
        { path: path.join(OG_CJK_DIR, 'ko-400.ttf'), weight: 400 },
        { path: path.join(OG_CJK_DIR, 'ko-700.ttf'), weight: 700 },
        { path: path.join(OG_CJK_DIR, 'ko-800.ttf'), weight: 800 },
      ]
    default:
      return []
  }
}

/** The family a CJK locale's subset faces are registered under, from the
 *  manifest `pnpm brand:og-fonts` wrote; `undefined` for a Latin locale. */
export function ogCjkFamily(locale: string): string | undefined {
  const files: readonly { locale: string; family: string }[] = manifest.files
  return files.find((file) => file.locale === locale)?.family
}

/**
 * The card's `fontFamily`: Inter first, then the locale's CJK face. Satori
 * draws each glyph from the first listed face that has it, so Latin text stays
 * Inter on every card.
 */
export function ogFontFamily(locale = 'en'): string {
  const cjk = ogCjkFamily(locale)
  return cjk ? `${OG_FONT_FAMILY}, '${cjk}'` : OG_FONT_FAMILY
}

/**
 * The `fonts` array for satori (`localeShareCard.tsx`) or
 * `new ImageResponse(..., { fonts })` (the per-project card).
 *
 * ⚠️ ONE ARRAY PER LOCALE FOR THE LIFE OF THE PROCESS, AND THE IDENTITY IS THE
 * POINT. satori keeps the fonts it has parsed in a `WeakMap` keyed by the
 * `fonts` ARRAY it is handed (satori's own font cache), so a fresh
 * array per request — what this used to return, on the reasoning that the
 * route is "rendered rarely" — re-reads and re-parses every face on every
 * draw. The per-project card is drawn at request time, and on 2026-10-18 a
 * crawl of it ran both machines out of memory (`ogRenderGate.ts`). Pinning
 * the faces costs ~1 MB per locale actually drawn.
 *
 * A failed read is not kept, so the next draw tries again.
 */
export function loadOgFonts(locale = 'en'): Promise<OgFont[]> {
  let fonts = loadedFonts.get(locale)
  if (!fonts) {
    fonts = readOgFonts(locale)
    loadedFonts.set(locale, fonts)
    fonts.catch(() => loadedFonts.delete(locale))
  }
  return fonts
}

const loadedFonts = new Map<string, Promise<OgFont[]>>()

async function readOgFonts(locale: string): Promise<OgFont[]> {
  const inter = OG_FONT_FACES.map(async ({ file, weight }) => ({
    name: OG_FONT_FAMILY,
    data: await readFile(path.join(FONT_DIR, file)),
    weight,
    style: 'normal' as const,
  }))
  const family = ogCjkFamily(locale)
  const cjk = family
    ? cjkFaces(locale).map(async ({ path: file, weight }) => ({
        name: family,
        data: await readFile(file),
        weight,
        style: 'normal' as const,
      }))
    : []
  return Promise.all([...inter, ...cjk])
}
