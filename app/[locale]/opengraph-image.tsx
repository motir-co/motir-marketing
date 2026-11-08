import { ImageResponse } from 'next/og'
import {
  BRAND_GLYPH_HEX,
  WAVE_BAND_PATH,
  WAVE_BAND_VIEW_BOX,
} from '@motir/brand'
import { getCopy } from '@/lib/copy'
import { hasLocale } from 'next-intl'
import { routing, type Locale } from '@/i18n/routing'
import { loadOgFonts, ogFontFamily } from '../_brand/ogFonts'
import {
  OG_TEXT_HEX,
  OG_TEXT_SECONDARY_HEX,
  OG_WASH,
} from '../_brand/ogColours'

/*
 * motir.co's landing social card (MOTIR-1154 · 8.3.7), one per locale
 * (MOTIR-7972).
 *
 * ⚠️ IT LIVES BESIDE THE PAGE IT DECORATES, `app/[locale]/LandingRoute.tsx`, AND MUST
 * STAY THERE. A
 * metadata image file is resolved for the page in its OWN segment and is NOT
 * inherited — motir-core lost every `og:image` tag from `/explore` by leaving
 * one behind when its `page.tsx` moved into a route group (MOTIR-3491), while
 * the image ROUTE went on serving a 200 and the build stayed green. If this
 * site ever grows a second page, that page gets its own card or none.
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
 * rule. `ImageResponse` renders outside the React/CSS tree and cannot read a
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

export const runtime = 'nodejs'

/*
 * ⚠️ ONE CARD PER LOCALE, IN THAT LOCALE'S WORDS (MOTIR-7972). The words are
 * the catalogue's, through `getCopy`, so a key a catalogue lacks renders in
 * English rather than as a raw key. A `zh` / `ja` / `ko` card draws its Han,
 * kana and Hangul from the subset faces `loadOgFonts(locale)` adds, which are
 * cut from exactly these three strings (`pnpm brand:og-fonts`;
 * `tests/ogFonts.test.ts` fails when a catalogue edit leaves a glyph out).
 *
 * The card is generated at BUILD time for each of the twelve locales the
 * layout's `generateStaticParams` names: nothing below reads the request, and
 * nothing fetches. A fallback font fetched at render would be a face this site
 * did not choose, so `tests/og/localeShareImage.test.ts` spies on `fetch`.
 */
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function ogLocale(locale: string | undefined): Locale {
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale
}

/*
 * ⚠️ THE ROUTE NAMES THE TWELVE ITSELF. An image file is a ROUTE HANDLER, and
 * a route handler does not inherit the layout's `generateStaticParams` — so
 * without this the route is `●` in the table and prerenders nothing, rendering
 * each card on its first request instead. Measured on `next build`: the
 * prerender manifest listed no path for it until this was added.
 *
 * ⚠️ AND SO NO `generateImageMetadata`, which is how a per-locale `alt` would
 * otherwise be declared. Next's loader answers that export with a
 * `generateStaticParams` of its own (one per image id) and drops this one, and
 * the two cannot both be exported. The per-locale `alt` is set where the card
 * is ADVERTISED instead — `siteCard(locale, copy.meta.title)` in
 * `lib/localeMetadata.ts`, which every page's `openGraph.images` carries.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleOpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const locale = ogLocale((await params).locale)
  const copy = await getCopy(locale)
  const fonts = await loadOgFonts(locale)
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
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
    </div>,
    { ...size, fonts },
  )
}
