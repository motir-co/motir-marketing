import { Resvg } from '@resvg/resvg-js'
import type { ReactElement } from 'react'
import satori from 'satori'
import {
  BRAND_GLYPH_HEX,
  WAVE_BAND_PATH,
  WAVE_BAND_VIEW_BOX,
} from '@motir/brand'
import { getCopy, type Copy } from '@/lib/copy'
import type { Locale } from '@/i18n/routing'
import { loadOgFonts, ogFontFamily } from './ogFonts'
import { OG_TEXT_HEX, OG_TEXT_SECONDARY_HEX, OG_WASH } from './ogColours'

/*
 * motir.co's landing social card (MOTIR-1154 · 8.3.7), one per locale
 * (MOTIR-7972), drawn at BUILD (MOTIR-10647).
 *
 * ⚠️ IT WAS A NEXT IMAGE ROUTE, AND IS NOW A FILE. `app/[locale]/opengraph-image.tsx`
 * drew it with `ImageResponse`; the Astro endpoint
 * `src/pages/[...locale]/opengraph-image.ts` calls {@link renderLocaleShareCard}
 * once per locale at build and writes the PNG at the address every page's
 * `og:image` names (`siteCard` in `lib/localeMetadata.ts`): `/opengraph-image`
 * for English, `/<locale>/opengraph-image` for the rest. The tree below is the
 * route's, unchanged; satori lays it out and resvg rasterises it, which is what
 * `ImageResponse` did inside Next. The file has no extension, so the
 * build's `_headers` (`public/_headers`) serves it as `image/png`.
 *
 * ── THE TEMPLATE IS 8.3.1's, NOT A NEW ONE ─────────────────────────────────
 * `motir-core/design/brand/design-notes.md` §6 ("OG template · 1200 × 630") is
 * the design of record, and this is its SECTION layout: brand lockup top-left,
 * headline and lede anchoring the bottom. Every number below is §6's — canvas
 * 1200 × 630 at padding 80; glyph 72, wordmark 30 / 700, gap 20; headline
 * 60 / 800 / 1.1; lede 28 at max-width 920. The COLOURS are §10's monochrome
 * Motir palette ("§6 amended — OG template", MOTIR-6473): glyph `#155bc4`
 * (`BRAND_GLYPH_HEX`, the glyph-on-a-surface role, not the ink tile's
 * `BRAND_ACCENT_HEX`), wordmark and headline `#16191d`, lede `#565c64`, on a
 * `#e4e6f3` → `#dde9f6` wash. The two cards motir-core already ships render
 * from the same table, so the three social cards of the one product are one
 * design.
 *
 * INLINE HEXES ARE THE DOCUMENTED EXCEPTION, not a lapse from the `--el-*`
 * rule. satori renders outside the React/CSS tree and cannot read a
 * custom property, so a raster surface is the one place a literal is correct —
 * and each literal names the token it came from, which is the provenance to
 * keep in sync. They live in `app/_brand/ogColours.ts`, shared with the project
 * card. The GLYPH is not a literal at all: its path and its fill come from
 * `@motir/brand`, the one place the mark lives.
 *
 * ⚠️ EVERY WORD IS AN EXISTING CATALOGUE STRING. The headline is the landing's
 * own `<h1>` and the lede is the footer tagline — the THREE pillars, in the
 * order the positioning fixes them (`messages/en.json` is MOTIR-1144's
 * artifact; this card invents no copy and re-keys nothing).
 */

/*
 * ⚠️ ONE CARD PER LOCALE, IN THAT LOCALE'S WORDS (MOTIR-7972). The words are
 * the catalogue's, through `getCopy`, so a key a catalogue lacks renders in
 * English rather than as a raw key. A `zh` / `ja` / `ko` card draws its Han,
 * kana and Hangul from the subset faces `loadOgFonts(locale)` adds, which are
 * cut from exactly these three strings (`pnpm brand:og-fonts`;
 * `tests/ogFonts.test.ts` fails when a catalogue edit leaves a glyph out).
 *
 * Nothing below reads a request, and nothing fetches. A fallback font fetched
 * at render would be a face this site did not choose, so
 * `tests/og/localeShareImage.test.ts` spies on `fetch`.
 */
export const SHARE_CARD_SIZE = { width: 1200, height: 630 } as const

/** The card's element tree for one locale's words — what satori lays out. */
export function localeShareCardElement(
  copy: Pick<Copy, 'landing' | 'footer'>,
  locale: Locale,
): ReactElement {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        // Next's bundled satori sized this box border-box; the current
        // satori defaults to content-box, which pushed the lede off the canvas.
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        // --color-tint-lavender → --color-tint-sky.
        background: OG_WASH,
        fontFamily: ogFontFamily(locale),
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
            fontSize: 60,
            fontWeight: 800,
            // --el-text, light.
            color: OG_TEXT_HEX,
            lineHeight: 1.1,
          }}
        >
          {copy.landing.hero.headline}
        </div>
        <div
          style={{
            fontSize: 28,
            // --el-text-secondary, light.
            color: OG_TEXT_SECONDARY_HEX,
            maxWidth: 920,
          }}
        >
          {copy.footer.tagline}
        </div>
      </div>
    </div>
  )
}

/** One locale's card, drawn and rasterised: a 1200 × 630 PNG. */
export async function renderLocaleShareCard(
  locale: Locale,
): Promise<Uint8Array<ArrayBuffer>> {
  const copy = await getCopy(locale)
  const fonts = await loadOgFonts(locale)
  const svg = await satori(localeShareCardElement(copy, locale), {
    ...SHARE_CARD_SIZE,
    fonts,
  })
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: SHARE_CARD_SIZE.width },
  })
    .render()
    .asPng()
  // A copy over its own ArrayBuffer, which a `Response` body takes.
  return new Uint8Array(png)
}
