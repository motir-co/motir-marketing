import { WAVE_BAND_PATH } from '@motir/brand'

/*
 * The Motir lockup with the mark on its rounded-square tile (2026-10
 * redesign) — the same tile shape the tab icon draws (`public/icon.svg`): a square,
 * corner radius 7/32 of its side, with the wave inset to 0.8067 of it.
 *
 * The colours are the design system's logo tokens: `--el-logo-mark` is the
 * palette's identity hue (its primary — the colour its swatch shows) and
 * `--el-logo-tile` the tile chosen for it, a pale wash of that hue or, for a
 * palette whose hue is itself bright, a dark tile. Both follow the theme and
 * the palette. The wordmark keeps `@motir/brand`'s
 * `.brand-word` (its type pin included). The glyph is decoration: the visible
 * word is the accessible name.
 */
export function BrandTile({
  size,
  label = 'Motir',
}: Readonly<{ size: number; label?: string }>) {
  return (
    <span
      className="inline-flex items-center"
      style={{ gap: size * 0.33, ['--brand-size' as string]: `${size}px` }}
    >
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="flex-none"
      >
        <rect width="32" height="32" rx="7" className="fill-(--el-logo-tile)" />
        <g transform="translate(6.32 6.32) scale(0.8067)">
          <path d={WAVE_BAND_PATH} className="fill-(--el-logo-mark)" />
        </g>
      </svg>
      <span className="brand-word">{label}</span>
    </span>
  )
}
