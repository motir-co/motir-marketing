import { OG_FONT_FACES, OG_FONT_FAMILY } from '@motir/brand'
import type { Env } from '../env'

/*
 * THE SHARE CARD'S FONTS, READ FROM THE STATIC ASSETS (MOTIR-10757).
 *
 * satori has no system fonts; its only typefaces are the bytes it is handed.
 * The project card draws Inter alone at 400, 700 and 800 — the faces the Next
 * route loaded (`loadOgFonts()` with no locale). The build copies those three
 * files from `@motir/brand` into `dist/_og/fonts/` (`scripts/og/copyShareFonts.ts`),
 * and an isolate fetches them through the `ASSETS` binding on its first draw.
 *
 * ⚠️ NEVER IN THE SCRIPT. A font is data, not code: bundled, it would count
 * toward the Worker's size limit on every deploy. Read from the assets, it is
 * free, and `tests/worker/shareBundle.test.ts` fails the build if any font
 * bytes reach the bundle.
 *
 * The array is kept for the life of the isolate and returned as the same
 * object every time, which is what satori caches its parsed fonts by. A failed
 * read is not kept: the next draw fetches again.
 */

/** Where the build puts the faces, under the site's own origin. */
export const SHARE_FONT_PATH = '/_og/fonts/'

export interface ShareFont {
  name: string
  data: ArrayBuffer
  weight: 400 | 700 | 800
  style: 'normal'
}

let fonts: Promise<ShareFont[]> | null = null

async function readFonts(env: Env, origin: string): Promise<ShareFont[]> {
  return Promise.all(
    OG_FONT_FACES.map(async (face) => {
      const response = await env.ASSETS.fetch(
        new URL(`${SHARE_FONT_PATH}${face.file}`, origin),
      )
      if (!response.ok)
        throw new Error(`share font ${face.file}: HTTP ${response.status}`)
      return {
        name: OG_FONT_FAMILY,
        data: await response.arrayBuffer(),
        weight: face.weight,
        style: 'normal' as const,
      }
    }),
  )
}

/** The three faces, fetched once per isolate. */
export function shareFonts(env: Env, origin: string): Promise<ShareFont[]> {
  fonts ??= readFonts(env, origin).catch((error: unknown) => {
    fonts = null
    throw error
  })
  return fonts
}

/** Forgets the isolate's fonts — for the unit suite, which runs many isolates in one. */
export function resetShareFonts(): void {
  fonts = null
}
