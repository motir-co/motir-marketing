import type { ReactElement } from 'react'
import {
  BRAND_GLYPH_HEX,
  OG_FONT_FAMILY,
  WAVE_BAND_PATH,
  WAVE_BAND_VIEW_BOX,
} from '@motir/brand'
import {
  OG_TEXT_HEX,
  OG_TEXT_SECONDARY_HEX,
  OG_WASH,
} from '@/app/_brand/ogColours'
import type { PublicProjectOverviewDto } from '@/lib/publicProject'
import type { ShareEngine } from './engine'
import type { ShareFont } from './fonts'

/*
 * THE PER-PROJECT SOCIAL CARD (MOTIR-4118), DRAWN WITHOUT `next/og`
 * (MOTIR-10757).
 *
 * The element tree is the Next route's (`app/[locale]/p/[identifier]/
 * opengraph-image.tsx` at `b9ff37a`), value for value — the template of
 * `motir-core/design/brand/design-notes.md` §6: canvas 1200 × 630 at padding
 * 80; glyph 72 in `BRAND_GLYPH_HEX`, wordmark 30 / 700; eyebrow 24 / 600;
 * headline 60 / 800 / 1.1; lede 28 at max-width 920; colours from
 * `app/_brand/ogColours.ts`. Only the drawing changed: satori lays the tree out
 * and resvg rasterises it, the two libraries `next/og` wrapped.
 *
 * ⚠️ `boxSizing: 'border-box'` ON THE ROOT, as the landing card has it
 * (`app/_brand/localeShareCard.tsx`): Next's bundled satori sized that box
 * border-box and the current one defaults to content-box, which would push the
 * lede off the canvas.
 *
 * INLINE HEXES ARE THE DOCUMENTED EXCEPTION: a raster surface cannot read a
 * custom property. Each names the token it came from.
 */

export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const

/** The lede a project with no tagline gets — the Next route's line. */
export const FALLBACK_TAGLINE =
  'A project built in public on Motir — watch it being built.'

/** What the card says: the project when it was read, else its key. */
export interface ProjectCardText {
  eyebrow: string
  name: string
  tagline: string
}

export function projectCardText(
  identifier: string,
  project: PublicProjectOverviewDto | null,
): ProjectCardText {
  return {
    eyebrow: project?.workspaceName ?? identifier,
    name: project?.name ?? identifier,
    tagline: project?.publicTagline ?? FALLBACK_TAGLINE,
  }
}

export function projectCardElement(text: ProjectCardText): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        // --color-tint-lavender → --color-tint-sky.
        background: OG_WASH,
        fontFamily: OG_FONT_FAMILY,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <svg viewBox={WAVE_BAND_VIEW_BOX} width={72} height={72}>
          <path d={WAVE_BAND_PATH} fill={BRAND_GLYPH_HEX} />
        </svg>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            // --el-text, light.
            color: OG_TEXT_HEX,
          }}
        >
          Motir
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            // --el-text-secondary, light.
            color: OG_TEXT_SECONDARY_HEX,
            letterSpacing: '0.04em',
          }}
        >
          {text.eyebrow}
        </div>
        <div
          style={{
            fontSize: 60,
            fontWeight: 800,
            // --el-text, light.
            color: OG_TEXT_HEX,
            lineHeight: 1.1,
          }}
        >
          {text.name}
        </div>
        <div
          style={{
            fontSize: 28,
            // --el-text-secondary, light.
            color: OG_TEXT_SECONDARY_HEX,
            maxWidth: 920,
          }}
        >
          {text.tagline}
        </div>
      </div>
    </div>
  )
}

/**
 * The card as PNG bytes. resvg's raster and image live in wasm memory, off
 * the JavaScript heap, so both are freed as soon as the bytes are copied out.
 */
export async function drawProjectCard(
  text: ProjectCardText,
  fonts: ShareFont[],
  engine: ShareEngine,
): Promise<Uint8Array<ArrayBuffer>> {
  const svg = await engine.satori(projectCardElement(text), {
    ...SHARE_CARD_SIZE,
    fonts,
  })
  const resvg = new engine.Resvg(svg, { fitTo: { mode: 'original' } })
  try {
    const image = resvg.render()
    try {
      // A copy out of wasm memory, so it outlives the `free` below.
      return image.asPng() as Uint8Array<ArrayBuffer>
    } finally {
      image.free()
    }
  } finally {
    resvg.free()
  }
}
