import { copyFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { OG_FONT_FACES } from '@motir/brand'

/*
 * THE SHARE CARD'S FONTS, INTO THE BUILT SITE (MOTIR-10757).
 *
 * The Worker draws a project's social card with Inter at 400, 700 and 800
 * (`worker/share/fonts.ts`) and reads the three faces through the `ASSETS`
 * binding, so they are static files of the site, never bytes in the script.
 * `astro build` calls this once the pages are written (`astro.config.mjs`),
 * copying each face `@motir/brand` ships into `dist/_og/fonts/`.
 *
 * The face list is the package's (`OG_FONT_FACES`), so a face added there is
 * copied here with no second list to keep in step.
 */

/** Where the faces land, relative to the built site's root. */
export const SHARE_FONT_DIR = '_og/fonts'

export function copyShareFonts(distDir: string): string[] {
  const require = createRequire(import.meta.url)
  const target = path.join(distDir, SHARE_FONT_DIR)
  mkdirSync(target, { recursive: true })
  return OG_FONT_FACES.map((face) => {
    const destination = path.join(target, face.file)
    copyFileSync(
      require.resolve(`@motir/brand/fonts/${face.file}`),
      destination,
    )
    return destination
  })
}

// `node scripts/og/copyShareFonts.ts [dist]` — the same step, by hand.
if (process.argv[1] === fileURLToPath(import.meta.url))
  copyShareFonts(path.resolve(process.argv[2] ?? 'dist'))
