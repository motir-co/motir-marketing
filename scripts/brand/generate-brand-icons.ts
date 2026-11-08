/**
 * Renders motir.co's favicon / app-icon set from the ONE brand path
 * (MOTIR-3847 · motir-core `design/brand/design-notes.md` §5).
 *
 *   node scripts/brand/generate-brand-icons.ts
 *
 * ── WHAT THIS IS A PORT OF, AND WHAT IT DELIBERATELY IS NOT ─────────────────
 *
 * motir-core ships the same set from `scripts/brand/generate-brand-icons.mts`.
 * This is that script, narrowed to the three files THIS site serves and cut
 * over to a different rasteriser. It is a PORT rather than a copy of the
 * outputs: the artwork itself is imported from `@motir/brand`, so there is no
 * second copy of the mark anywhere in this repository — `WAVE_BAND_PATH` and
 * the baked colour literals arrive from the package, exactly as
 * `public/motir-mark.svg` already takes `waveBandSvg()` from it (MOTIR-1154).
 *
 * What this site does NOT ship, and why the absence is deliberate:
 *
 *   - **No maskable icons and no `app/manifest.ts`.** Those exist so an
 *     "Add to Home Screen" of the APP gets a real tile; a marketing landing is
 *     not installed. `MASKABLE_SCALE` and the 0.8 safe circle are therefore
 *     meaningless here and are not restated — carrying a constant whose only
 *     consumer is absent is how a number drifts unnoticed.
 *   - **No email mark.** This repository sends no email.
 *
 * ⚠️ THE ICONS ARE IN `public/` SINCE MOTIR-10647. Next linked `app/icon.svg`,
 * `app/apple-icon.png` and `app/favicon.ico` by file convention; Astro copies
 * `public/` into the output as it is, and `src/layouts/SitePage.astro` writes
 * the three `<link>` tags the Next head carried, at the same paths. A sized
 * icon added later goes here too, linked from the layout.
 *
 * ── THE RASTERISER: sharp, not Playwright (the decision MOTIR-3847 carried) ──
 *
 * motir-core rasterises with Playwright's chromium, which is already a
 * devDependency THERE. It is not one here, and adding it would put a browser
 * download in front of every `pnpm install --frozen-lockfile` in a repository
 * whose whole CI is four short jobs — to serve a script CI never runs.
 *
 * `sharp` was already resolved in this repository's lockfile as Next's optional
 * image-optimisation dependency, and `pnpm-workspace.yaml` already allow-lists
 * its build. Depending on it explicitly pins the same version that was being
 * fetched anyway, so the icon set costs this repository no new download.
 *
 * It is imported lazily, inside `main()`, so `tests/brand/iconAssets.test.ts`
 * can import the pure helpers without loading a native module.
 *
 * The two engines are not byte-compatible and are not meant to be: what the two
 * properties share is the PATH, the two colour literals and the geometry below,
 * which is what "one source of truth" means for a mark. The committed bytes are
 * pinned by the test against THIS generator, in THIS repository.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  BRAND_ACCENT_DARK_HEX,
  BRAND_ACCENT_HEX,
  BRAND_ACCENT_INK_DARK_HEX,
  BRAND_ACCENT_INK_HEX,
  WAVE_BAND_PATH,
} from '@motir/brand'

/**
 * Glyph box as a fraction of the canvas, for an icon the OS never crops.
 *
 * ⚠️ THIS NUMBER IS DERIVED, NOT CHOSEN, AND IT MOVED ONCE ALREADY
 * (MOTIR-3181 · design-notes.md §5). The 24-grid artwork used to carry a
 * ~1-unit inset, so its bounding box was 21.984 of the 24 box. Removing that
 * margin — the fix that made the vertical caps render crisp — makes the glyph
 * span the FULL square, so at any given scale it renders 24 / 21.984 = 9.2%
 * larger. Both of motir-core's scales are divided by that factor to keep the
 * icons the size they already were, which is what turns 0.66 into 0.605.
 *
 * `tests/brand/iconAssets.test.ts` pins that identity rather than the literal,
 * so a re-drawn mark fails here with its arithmetic in front of you.
 */
export const NON_MASKABLE_SCALE = 0.605

/** 0.22 is `--radius-lg` (12) over a 56px tile — the app's own container ratio. */
export const TILE_RADIUS_RATIO = 0.22

/** `public/icon.svg` — resolution-free, so it ships as source rather than a raster. */
export const ICON_SVG_CANVAS = 32

/** `public/apple-icon.png` — iOS masks the corners but supplies NO background. */
export const APPLE_ICON_CANVAS = 180

/** The two sizes packed into the legacy `public/favicon.ico`. */
export const ICO_SIZES = [16, 32]

/** Trims binary-float noise so the committed files read as the numbers they are. */
const round = (n: number) => Number(n.toFixed(4))

/** Corner radius in px for a tile of this canvas. */
export const tileRadius = (canvas: number) =>
  Math.round(canvas * TILE_RADIUS_RATIO)

/**
 * The tiled form: the glyph knocked out of an opaque accent field. Every icon
 * uses it — a browser tab has no surface behind it to tint against, and iOS
 * masks the corners but supplies NO background, so the tile must be opaque.
 * This is the one place `motir-mark.svg` and the icon set differ: that file is
 * the bare glyph for a JSON-LD `logo`, which is composited onto a surface the
 * consumer chooses.
 */
export function tiledIconSvg({
  canvas,
  scale = NON_MASKABLE_SCALE,
  radius = tileRadius(canvas),
}: {
  canvas: number
  scale?: number
  radius?: number
}): string {
  const box = canvas * scale
  const offset = round((canvas - box) / 2)
  const unit = round(box / 24)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" ` +
    `viewBox="0 0 ${canvas} ${canvas}">` +
    `<rect width="${canvas}" height="${canvas}" rx="${radius}" fill="${BRAND_ACCENT_HEX}"/>` +
    `<g transform="translate(${offset} ${offset}) scale(${unit})">` +
    `<path d="${WAVE_BAND_PATH}" fill="${BRAND_ACCENT_INK_HEX}"/>` +
    `</g></svg>`
  )
}

/**
 * `public/icon.svg` — the modern browsers' favicon, shipped as source.
 *
 * It emits NO SVG comment: XML forbids a double hyphen inside one, so a token
 * name written as `var(--el-accent)` in a file header makes the whole document
 * malformed (design-notes.md §2). Provenance lives in this module instead,
 * in source, where it can name the token safely.
 *
 * ⚠️ IT CARRIES A `prefers-color-scheme: dark` VARIANT, and it is the only file
 * in the set that can (design-notes.md §10, the dark tab strip). The ink tile
 * reads 1.05:1 against Chrome's dark tab strip, so a dark browser swaps it to
 * the dark accent tile with its dark ink. The fill ATTRIBUTES stay the light
 * values, so a client that ignores the embedded style still draws the ink
 * tile. The rasters below have one appearance each and take the ink tile.
 * This is the same file motir-core's generator emits.
 */
export function iconSvgFile(): string {
  const canvas = ICON_SVG_CANVAS
  const box = canvas * NON_MASKABLE_SCALE
  const offset = round((canvas - box) / 2)
  const unit = round(box / 24)
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}" role="img" aria-label="Motir">`,
    `  <style>@media (prefers-color-scheme: dark) { .tile { fill: ${BRAND_ACCENT_DARK_HEX}; } .glyph { fill: ${BRAND_ACCENT_INK_DARK_HEX}; } }</style>`,
    `  <rect class="tile" width="${canvas}" height="${canvas}" rx="${tileRadius(canvas)}" fill="${BRAND_ACCENT_HEX}"/>`,
    `  <g transform="translate(${offset} ${offset}) scale(${unit})">`,
    `    <path class="glyph" d="${WAVE_BAND_PATH}" fill="${BRAND_ACCENT_INK_HEX}"/>`,
    `  </g>`,
    `</svg>`,
    '',
  ].join('\n')
}

/**
 * Packs PNGs into an .ico. The format is a 6-byte header plus one 16-byte
 * directory entry per image plus the payloads; since Vista a payload may be a
 * whole PNG rather than a DIB, which is what every current client reads and
 * what keeps this a dozen lines instead of a bitmap encoder.
 */
export function packIco(images: { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)

  let offset = 6 + images.length * 16
  const entries: Buffer[] = []
  for (const { size, png } of images) {
    const e = Buffer.alloc(16)
    // 0 means 256 in this field; every size we ship is below that.
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt8(0, 2) // palette colours
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(png.length, 8)
    e.writeUInt32LE(offset, 12)
    entries.push(e)
    offset += png.length
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

async function main() {
  const root = path.resolve(import.meta.dirname, '..', '..')
  const { default: sharp } = await import('sharp')

  const rasterise = (canvas: number): Promise<Buffer> =>
    sharp(Buffer.from(tiledIconSvg({ canvas })))
      .png({ compressionLevel: 9 })
      .toBuffer()

  await writeFile(path.join(root, 'public/icon.svg'), iconSvgFile(), 'utf8')
  console.warn('wrote public/icon.svg')

  const appleIcon = await rasterise(APPLE_ICON_CANVAS)
  const appleDest = path.join(root, 'public/apple-icon.png')
  await mkdir(path.dirname(appleDest), { recursive: true })
  await writeFile(appleDest, appleIcon)
  console.warn(
    `wrote public/apple-icon.png (${APPLE_ICON_CANVAS}px, glyph ${NON_MASKABLE_SCALE} x canvas)`,
  )

  // The legacy fallback, re-cut from the same glyph so the two can never
  // disagree. Kept for old clients and for anything requesting /favicon.ico by
  // path — which, on a marketing domain, is most link-preview and feed-reader
  // fetchers (design-notes.md §5).
  const icoImages = []
  for (const size of ICO_SIZES) {
    icoImages.push({ size, png: await rasterise(size) })
  }
  await writeFile(path.join(root, 'public/favicon.ico'), packIco(icoImages))
  console.warn(`wrote public/favicon.ico (${ICO_SIZES.join(' + ')})`)
}

// Guarded so the test can import the pure helpers without rasterising anything
// or loading sharp's native binding.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  await main()
}
