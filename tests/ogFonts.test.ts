// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseFont } from 'opentype.js'
import { OG_FONT_FACES as PACKAGE_FACES } from '@motir/brand'
import { describe, expect, it } from 'vitest'
import {
  loadOgFonts,
  ogFontFamily,
  type OgFont,
  OG_FONT_FACES as SITE_FACES,
  OG_FONT_FAMILY,
} from '@/app/_brand/ogFonts'
import { drawnStrings } from '@/scripts/brand/subset-og-fonts'

/*
 * MOTIR-3848 — the root OG card's typeface, after the bytes moved into
 * `@motir/brand`.
 *
 * ⚠️ WHY THIS FILE RUNS IN THE `node` ENVIRONMENT. The rest of the suite is
 * jsdom (`vitest.config.mts`), and the card is drawn by satori and resvg in
 * the Node build (`app/_brand/localeShareCard.tsx`, MOTIR-10647). The
 * docblock above overrides the environment for this file only.
 *
 * ⚠️ WHY IT RENDERS THE REAL IMAGE. The font wiring is the part of this change
 * that can be wrong in production while looking right everywhere else: satori
 * renders OUTSIDE the CSS tree, so if the `fonts` option is missing or its bytes
 * fail to load the card does not error — it renders in whatever face the runtime
 * happens to have. That is what motir.co would have shipped silently if the move
 * had broken the read. So the assertion is that the route actually PRODUCES a
 * PNG with the faces attached, not that the source mentions them.
 */

const PNG_MAGIC = '89504e470d0a1a0a'

describe('the root card is set in @motir/brand’s Inter, not a copy of its own', () => {
  it('reads the faces the package ships, and this repository keeps none', () => {
    // The site repeats the package's face list as LITERALS on purpose: importing
    // `OG_FONT_FACES` and mapping over it would hand Turbopack a value it cannot
    // constant-fold, and its fallback for an unresolvable read is to trace the
    // entire project into the route's `.nft.json`. So the literals are pinned
    // here instead — a face added, dropped or re-cut in the package fails THIS
    // test rather than silently re-weighting a card nobody looks at.
    expect(SITE_FACES).toEqual(PACKAGE_FACES)
    expect(SITE_FACES.length).toBe(3)

    // The duplication this card removed. Re-creating the directory would restore
    // it without failing anything else, because both copies render identically —
    // which is precisely why the defect survived a green build in both
    // repositories for as long as it did.
    expect(existsSync(join(process.cwd(), 'app/_brand/fonts'))).toBe(false)
    for (const { file } of PACKAGE_FACES) {
      expect(
        existsSync(
          join(process.cwd(), 'node_modules/@motir/brand/fonts', file),
        ),
        file,
      ).toBe(true)
    }
  })

  it('loads the three weights the template uses, as parseable TTFs', async () => {
    // satori does not synthesise weight — an absent one silently snaps to the
    // nearest present face, which would quietly re-weight §6's design.
    const fonts = await loadOgFonts()
    expect(fonts.map((f) => f.weight).sort()).toEqual([400, 700, 800])
    for (const font of fonts) {
      expect(font.name).toBe(OG_FONT_FAMILY)
      // 0x00010000 — the sfnt version every TrueType file opens with. satori
      // cannot decompress WOFF2, so a woff2 slipped in here would fail at render
      // time on a surface nobody looks at.
      expect(font.data.subarray(0, 4).toString('hex')).toBe('00010000')
    }
  })

  it('hands satori the SAME array per locale, so it parses the faces once', async () => {
    // satori's parsed-font cache is a WeakMap keyed by the `fonts` array; a new
    // array per draw re-parses every face (the 2026-10-18 outage).
    expect(await loadOgFonts('en')).toBe(await loadOgFonts('en'))
    expect(await loadOgFonts('ja')).toBe(await loadOgFonts('ja'))
    expect(await loadOgFonts('ja')).not.toBe(await loadOgFonts('en'))
  })

  it('still renders a real PNG at 1200 x 630', async () => {
    const { renderLocaleShareCard, SHARE_CARD_SIZE } =
      await import('@/app/_brand/localeShareCard')
    expect(SHARE_CARD_SIZE).toEqual({ width: 1200, height: 630 })
    const png = Buffer.from(await renderLocaleShareCard('en'))
    expect(png.subarray(0, 8).toString('hex')).toBe(PNG_MAGIC)
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)
  }, 30_000)
})

/*
 * MOTIR-7972 — every character the per-locale card draws is IN a face it
 * loads. satori does not error on a missing glyph: it draws tofu, or reaches
 * for a font this site never chose. So the cmap of each face is read with a
 * real font parser (`opentype.js`, pinned) and every non-whitespace code point
 * of the three drawn strings — plus the `Motir` wordmark — must be in at least
 * one of them. A catalogue edit that outgrows a committed CJK subset fails
 * here until `pnpm brand:og-fonts` is re-run; a Latin letter Inter lacks
 * (Polish ą, ł) would fail here too.
 */
/*
 * ⚠️ NOT `hasChar`. In opentype.js 1.3.4 `hasChar` is
 * `charToGlyphIndex(c) !== null`, and a code point absent from the cmap
 * answers `undefined` — so `hasChar` is true for EVERY character and the
 * coverage check below would pass over tofu. A real glyph is index > 0
 * (index 0 is `.notdef`, the tofu box itself).
 */
function maps(face: ReturnType<typeof parseFont>, ch: string): boolean {
  return (face.charToGlyphIndex(ch) ?? 0) > 0
}

function uncovered(strings: readonly string[], fonts: OgFont[]): string[] {
  const faces = fonts.map((font) =>
    parseFont(
      font.data.buffer.slice(
        font.data.byteOffset,
        font.data.byteOffset + font.data.byteLength,
      ) as ArrayBuffer,
    ),
  )
  const missing = new Set<string>()
  for (const text of strings)
    for (const ch of text)
      if (!/\s/u.test(ch) && !faces.some((face) => maps(face, ch)))
        missing.add(ch)
  return [...missing]
}

const catalogueLocales = readdirSync(join(process.cwd(), 'messages'))
  .filter((f) => /^[a-z]{2,3}(-[A-Za-z0-9]+)?\.json$/.test(f))
  .map((f) => f.replace(/\.json$/, ''))
  .sort()

function catalogue(locale: string): unknown {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'messages', `${locale}.json`), 'utf8'),
  )
}

describe('every catalogue’s card is drawable in the faces it loads', () => {
  it.each(catalogueLocales)('%s', async (locale) => {
    const fonts = await loadOgFonts(locale)
    expect(
      uncovered([...drawnStrings(catalogue(locale)), 'Motir'], fonts),
    ).toEqual([])
  })

  it('loads a CJK face only for zh, zh-tw, ja and ko, under its own family', async () => {
    for (const locale of ['en', 'pl', 'de']) {
      expect((await loadOgFonts(locale)).length, locale).toBe(3)
      expect(ogFontFamily(locale), locale).toBe(OG_FONT_FAMILY)
    }
    for (const locale of ['zh', 'zh-tw', 'ja', 'ko']) {
      const fonts = await loadOgFonts(locale)
      expect(fonts.map((f) => f.weight).sort(), locale).toEqual([
        400, 400, 700, 700, 800, 800,
      ])
      const cjk = fonts.filter((f) => f.name !== OG_FONT_FAMILY)
      expect(cjk, locale).toHaveLength(3)
      expect(ogFontFamily(locale)).toBe(`${OG_FONT_FAMILY}, '${cjk[0]!.name}'`)
    }
  })

  it('fails when a catalogue gains a character the subset was not cut for', async () => {
    const ja = catalogue('ja') as { landing: { hero: { headline: string } } }
    // 鬱 — far outside any headline's characters, so no subset holds it.
    ja.landing.hero.headline += '鬱'
    expect(uncovered(drawnStrings(ja), await loadOgFonts('ja'))).toEqual(['鬱'])
  })
})
