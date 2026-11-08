import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BRAND_ACCENT_DARK_HEX,
  BRAND_ACCENT_HEX,
  BRAND_ACCENT_INK_DARK_HEX,
  BRAND_ACCENT_INK_HEX,
  WAVE_BAND_PATH,
} from '@motir/brand'
import {
  APPLE_ICON_CANVAS,
  ICO_SIZES,
  ICON_SVG_CANVAS,
  iconSvgFile,
  NON_MASKABLE_SCALE,
  packIco,
  TILE_RADIUS_RATIO,
  tiledIconSvg,
  tileRadius,
} from '../../scripts/brand/generate-brand-icons'

/*
 * The favicon / app-icon set (MOTIR-3847 · motir-core
 * `design/brand/design-notes.md` §5).
 *
 * ⚠️ WHAT THIS FILE IS FOR. The three icons are BUILD OUTPUTS of
 * `scripts/brand/generate-brand-icons.ts`, but they are COMMITTED, because the
 * build copies them from `public/` as they are (MOTIR-10647). That gap is what this
 * closes: it asserts the committed bytes are still what the generator produces,
 * so a hand-edited raster or a stale re-run is a red suite rather than a
 * motir.co that quietly wears a different mark from `app.motir.co`. It is the
 * same guarantee `tests/entitySignal.test.ts` already gives
 * `public/motir-mark.svg`, extended to the two files that are rasters and
 * therefore cannot be compared to a string.
 *
 * ⚠️ WHAT IT CANNOT SAY, stated because the acceptance criteria ask for both
 * halves and only one of them lives here: nothing in this file proves
 * `https://motir.co/favicon.ico` returns 200. Those bytes are served by the
 * deployment and only change when `main` merges and releases. That criterion is
 * read LIVE, against the deployed host, and no test in this repository can
 * stand in for it — the same boundary `entitySignal.test.ts` draws for
 * `robots.txt` and `sitemap.xml`.
 */

const REPO = process.cwd()

/** Width + height out of a PNG's IHDR — the first chunk of every PNG. */
function pngSize(buf: Buffer): { width: number; height: number } {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR')
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

describe('the glyph scale is derived, not chosen (§5)', () => {
  it('renders the mark at 0.605 x canvas — the margin-compensated 0.66', () => {
    // The 24-grid artwork used to carry a ~1-unit inset, so its bounding box
    // was 21.984 of the 24 box. MOTIR-3181 removed that margin — the fix that
    // made the vertical caps render crisp — which makes the glyph span the FULL
    // square and so renders 24 / 21.984 = 9.2% larger at any given scale. The
    // scale is divided by that factor to keep the icon the size it already was.
    //
    // Pinning the IDENTITY rather than the literal is the point: a future
    // re-draw that moves the bounding box fails here with its arithmetic in
    // front of whoever has to re-derive the number, instead of silently
    // shipping a mark 9% off.
    expect(NON_MASKABLE_SCALE).toBe(0.605)
    expect(NON_MASKABLE_SCALE).toBeCloseTo(0.66 * (21.984 / 24), 3)
  })

  it('rounds every tile corner at 0.22 x canvas', () => {
    // 0.22 is --radius-lg (12) over a 56px tile — the app's own container
    // ratio, so the icon reads as the same family as the UI.
    expect(TILE_RADIUS_RATIO).toBe(0.22)
    expect(tileRadius(ICON_SVG_CANVAS)).toBe(7)
    expect(tileRadius(APPLE_ICON_CANVAS)).toBe(40)
  })
})

describe('the tiled form paints the glyph out of an opaque accent field', () => {
  const svg = tiledIconSvg({ canvas: APPLE_ICON_CANVAS })

  it('fills the whole canvas with the accent and knocks the glyph out in its ink', () => {
    // iOS masks the corners but supplies NO background, and a browser tab has
    // no surface behind it to tint against — so the tile is opaque, never a
    // bare glyph on transparency. `public/motir-mark.svg` is the other case and
    // is deliberately NOT generated here.
    expect(svg).toContain(
      `<rect width="180" height="180" rx="40" fill="${BRAND_ACCENT_HEX}"/>`,
    )
    expect(svg).toContain(`d="${WAVE_BAND_PATH}"`)
    expect(svg).toContain(`fill="${BRAND_ACCENT_INK_HEX}"`)
  })

  it('centres the glyph box on the canvas', () => {
    // Rounded to 4dp so the committed files read as the numbers they are
    // rather than as binary-float noise.
    const box = APPLE_ICON_CANVAS * NON_MASKABLE_SCALE
    const offset = Number(((APPLE_ICON_CANVAS - box) / 2).toFixed(4))
    expect(svg).toContain(`translate(${offset} ${offset})`)
    expect(svg).toContain(`scale(${Number((box / 24).toFixed(4))})`)
  })
})

describe('the artwork comes from @motir/brand, never a second copy', () => {
  it('draws icon.svg from the package path and its two baked literals', () => {
    // The mark lives in ONE place (motir-core `packages/brand/src/waveBand.ts`,
    // published as @motir/brand). A hand-drawn copy in this repository is the
    // failure this asserts against: it would drift the moment the mark is
    // re-drawn upstream, and nothing would say so.
    const svg = iconSvgFile()
    expect(svg).toContain(`d="${WAVE_BAND_PATH}"`)
    expect(svg).toContain(`fill="${BRAND_ACCENT_HEX}"`)
    expect(svg).toContain(`fill="${BRAND_ACCENT_INK_HEX}"`)
  })
})

describe('icon.svg switches tiles on a dark tab strip (design-notes.md §10)', () => {
  const svg = iconSvgFile()

  it('swaps to the dark accent tile and its dark ink under prefers-color-scheme: dark', () => {
    // The ink tile reads 1.05:1 against Chrome's dark strip, so the one icon
    // that can switch does. The rasters cannot and keep the ink tile.
    expect(svg).toContain(
      `<style>@media (prefers-color-scheme: dark) { .tile { fill: ${BRAND_ACCENT_DARK_HEX}; } .glyph { fill: ${BRAND_ACCENT_INK_DARK_HEX}; } }</style>`,
    )
    expect(svg).toContain(`<rect class="tile" `)
    expect(svg).toContain(`<path class="glyph" `)
  })

  it('keeps the LIGHT values in the fill attributes, for clients that ignore the style', () => {
    expect(svg).toMatch(/<rect class="tile"[^>]* fill="#1a1d21"\/>/)
    expect(svg).toMatch(/<path class="glyph"[^>]* fill="#ffffff"\/>/)
  })

  it('draws the tile in the monochrome Motir palette, not the old purple', () => {
    expect(BRAND_ACCENT_HEX).toBe('#1a1d21')
    expect(BRAND_ACCENT_DARK_HEX).toBe('#edeef0')
    expect(BRAND_ACCENT_INK_DARK_HEX).toBe('#0c0d0f')
    expect(
      readFileSync(path.join(REPO, 'public/icon.svg'), 'utf8'),
    ).not.toContain('#5645d4')
  })
})

describe('the committed files still match the generator', () => {
  it('public/icon.svg is byte-identical to what the script emits', () => {
    expect(readFileSync(path.join(REPO, 'public/icon.svg'), 'utf8')).toBe(
      iconSvgFile(),
    )
  })

  it('public/apple-icon.png is byte-identical to what the script rasterises', async () => {
    // The raster pin the SVG comparison above cannot give. sharp is the
    // generator's own rasteriser and the same pinned version, so a re-run over
    // an unchanged mark and palette is byte-stable; a stale raster, left behind
    // when the package's colours moved, is not.
    const { default: sharp } = await import('sharp')
    const fresh = await sharp(
      Buffer.from(tiledIconSvg({ canvas: APPLE_ICON_CANVAS })),
    )
      .png({ compressionLevel: 9 })
      .toBuffer()
    expect(
      readFileSync(path.join(REPO, 'public/apple-icon.png')).equals(fresh),
    ).toBe(true)
  })

  it('public/apple-icon.png is a PNG at its declared canvas', () => {
    const buf = readFileSync(path.join(REPO, 'public/apple-icon.png'))
    expect(pngSize(buf)).toEqual({
      width: APPLE_ICON_CANVAS,
      height: APPLE_ICON_CANVAS,
    })
  })

  it('keeps favicon.ico as the legacy fallback, re-cut at 16 + 32', () => {
    // §5: kept for old clients and anything requesting /favicon.ico by path —
    // re-cut from the same glyph so the two can never disagree.
    const ico = readFileSync(path.join(REPO, 'public/favicon.ico'))
    expect(ico.readUInt16LE(0)).toBe(0) // reserved
    expect(ico.readUInt16LE(2)).toBe(1) // type: icon
    expect(ico.readUInt16LE(4)).toBe(ICO_SIZES.length)
    for (const [i, size] of ICO_SIZES.entries()) {
      const entry = 6 + i * 16
      expect(ico.readUInt8(entry)).toBe(size)
      expect(ico.readUInt8(entry + 1)).toBe(size)
      // Each payload is a whole PNG — the post-Vista form every current client
      // reads, and what keeps the packer a dozen lines instead of a DIB encoder.
      const offset = ico.readUInt32LE(entry + 12)
      expect(pngSize(ico.subarray(offset))).toEqual({
        width: size,
        height: size,
      })
    }
  })

  it('packs the directory so every payload offset lands inside the file', () => {
    const png = readFileSync(path.join(REPO, 'public/apple-icon.png'))
    const ico = packIco([
      { size: 16, png },
      { size: 32, png },
    ])
    expect(ico.readUInt32LE(6 + 12)).toBe(6 + 32)
    expect(ico.readUInt32LE(6 + 16 + 12)).toBe(6 + 32 + png.length)
    expect(ico.length).toBe(6 + 32 + png.length * 2)
  })
})

describe('every icon is served where the layout links it (MOTIR-10647)', () => {
  // Next linked `app/icon.svg`, `app/apple-icon.png` and `app/favicon.ico` by
  // file convention. Astro has none: the files are in `public/`, which the
  // build copies to the output root as they are, and the shared layout writes
  // the tags the Next head carried at b9ff37a — same rel, type, sizes, path.
  const layout = readFileSync(
    path.join(REPO, 'src/layouts/SitePage.astro'),
    'utf8',
  )
  const links = [...layout.matchAll(/<link\s+([^>]*?)\/>/g)]
    .map((match) => match[1]!.replace(/\s+/g, ' ').trim())
    .filter((attrs) => /rel="(icon|apple-touch-icon)"/.test(attrs))

  it.each([
    ['icon', '/favicon.ico', 'image/x-icon', '16x16'],
    ['icon', '/icon.svg', 'image/svg+xml', 'any'],
    ['apple-touch-icon', '/apple-icon.png', 'image/png', '180x180'],
  ])(
    'links rel=%s %s (%s, %s), and the file is in public/',
    (rel, href, type, sizes) => {
      expect(links).toContain(
        `rel="${rel}" href="${href}" type="${type}" sizes="${sizes}"`,
      )
      expect(() => readFileSync(path.join(REPO, 'public', href))).not.toThrow()
    },
  )

  it('links no icon besides those three', () => {
    expect(links).toHaveLength(3)
  })
})
