import interLatin from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url'
import interLatinExt from '@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2?url'
import jetbrainsMonoLatin from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url'
import jetbrainsMonoLatinExt from '@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-ext-wght-normal.woff2?url'
import sourceSerifLatin from '@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2?url'
import sourceSerifLatinExt from '@fontsource-variable/source-serif-4/files/source-serif-4-latin-ext-wght-normal.woff2?url'

/*
 * THE FONT FILES EVERY PAGE PRELOADS (MOTIR-10643).
 *
 * next/font preloaded the files of the subsets a loader named, for every
 * loader not marked `preload: false` — the default pairing's three faces, in
 * `latin` and `latin-ext`. These are the same six files, so the landing's
 * first paint fetches what it fetched under Next and nothing more. The other
 * pairings and every font-set face are not preloaded (`app/fonts.css`).
 *
 * Each import resolves to the hashed address Vite gives the file in
 * `dist/_astro/`, the same file `app/fonts.css`'s `@font-face` rules name, so
 * the preload is the request the face then uses.
 */
export const FONT_PRELOADS: readonly string[] = [
  interLatin,
  interLatinExt,
  sourceSerifLatin,
  sourceSerifLatinExt,
  jetbrainsMonoLatin,
  jetbrainsMonoLatinExt,
]
