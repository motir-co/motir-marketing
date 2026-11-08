/*
 * The CJK faces of the per-locale share image (MOTIR-7972).
 *
 *     pnpm brand:og-fonts
 *
 * The build draws the landing's card through satori, which sees no web font and
 * has no CJK glyph of its own, so a `zh` / `ja` / `ko` card needs its script's
 * face as BYTES (`app/_brand/ogFonts.ts`). A whole Noto Sans JP is several MB
 * per weight; the card draws three sentences. So this cuts, per CJK locale and
 * per weight (400 / 700 / 800), a SUBSET of that locale's default sans member
 * (`@motir/design-system`'s `FONT_SET_REGISTRY`, read here, never typed) to
 * exactly the characters of `meta.title`, `landing.hero.headline` and
 * `footer.tagline`, and writes:
 *
 *   app/_brand/og-fonts/<locale>-<weight>.ttf
 *   app/_brand/og-fonts/manifest.json   — per file: family, weight, the subset
 *                                         text, and the catalogue blob it was
 *                                         cut from
 *
 * ⚠️ A DEVELOPER COMMAND, AND THE ONLY THING HERE THAT TOUCHES THE NETWORK. It
 * asks the Google Fonts CSS2 API for `text=<chars>`, with an old user agent so
 * the answer is TrueType (satori cannot read WOFF2). No build, test or CI lane
 * runs it: the subsets are committed, so the build stays offline, the way the
 * Inter bytes already ship. Run it after changing one of those three keys in
 * `messages/{zh,zh-tw,ja,ko}.json`; `tests/ogFonts.test.ts` fails until you do.
 *
 * Pure helpers are exported for `tests/brand/subsetOgFonts.test.ts`; `main()`
 * runs only as the entry point, the same shape as `scripts/design/render-design-mock.ts`.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { format } from 'prettier'

/** The locales whose script Inter cannot draw. */
export const OG_CJK_LOCALES = ['zh', 'zh-tw', 'ja', 'ko'] as const
export type OgCjkLocale = (typeof OG_CJK_LOCALES)[number]

export const OG_WEIGHTS = [400, 700, 800] as const

/** The catalogue keys the card draws — keep in step with `app/_brand/localeShareCard.tsx`. */
export const OG_DRAWN_KEYS = [
  'meta.title',
  'landing.hero.headline',
  'footer.tagline',
] as const

/** Old enough that Google Fonts answers with `format('truetype')`. */
export const TRUETYPE_USER_AGENT = 'Mozilla/4.0'

export interface ManifestFile {
  file: string
  locale: OgCjkLocale
  family: string
  weight: (typeof OG_WEIGHTS)[number]
  text: string
  catalogue: string
  catalogueBlob: string
}

export interface Manifest {
  generatedBy: string
  files: ManifestFile[]
}

function leaf(catalogue: unknown, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      catalogue,
    )
  if (typeof value !== 'string') throw new Error(`no string at ${key}`)
  return value
}

/** The drawn strings of one catalogue, in key order. */
export function drawnStrings(catalogue: unknown): string[] {
  return OG_DRAWN_KEYS.map((key) => leaf(catalogue, key))
}

/** Every distinct non-whitespace code point of the strings, sorted. */
export function subsetText(strings: readonly string[]): string {
  const chars = new Set<string>()
  for (const s of strings)
    for (const ch of s) if (!/\s/u.test(ch)) chars.add(ch)
  return [...chars].sort().join('')
}

/** `git hash-object` of the bytes — the blob a catalogue was cut from. */
export function blobSha(bytes: Buffer): string {
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex')
}

/** The CSS2 request for one family, weight and character set. */
export function css2Url(family: string, weight: number, text: string): string {
  const params = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    text,
  })
  return `https://fonts.googleapis.com/css2?${params}`
}

/** The single TrueType `src` of a CSS2 answer. */
export function truetypeUrl(css: string): string {
  const urls = [...css.matchAll(/url\(([^)]+)\)\s*format\('truetype'\)/g)]
  if (urls.length !== 1)
    throw new Error(`expected one truetype src, found ${urls.length}`)
  return urls[0]![1]!
}

/** `00 01 00 00` (TrueType) or `OTTO` (CFF OpenType) — what satori reads. */
export function isSfnt(bytes: Uint8Array): boolean {
  const head = Buffer.from(bytes.subarray(0, 4))
  return (
    head.equals(Buffer.from([0x00, 0x01, 0x00, 0x00])) ||
    head.toString('latin1') === 'OTTO'
  )
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url, {
    headers: { 'User-Agent': TRUETYPE_USER_AGENT },
  })
  if (!response.ok) throw new Error(`${response.status} for ${url}`)
  return response
}

async function main(): Promise<void> {
  const { FONT_SET_REGISTRY, LOCALE_FONT_SET } =
    await import('@motir/design-system')
  const root = process.cwd()
  const outDir = path.join(root, 'app', '_brand', 'og-fonts')
  mkdirSync(outDir, { recursive: true })
  const files: ManifestFile[] = []

  for (const locale of OG_CJK_LOCALES) {
    const set = FONT_SET_REGISTRY[LOCALE_FONT_SET[locale]]
    const sans = set.roles.sans
    const member = sans.members.find((m) => m.id === sans.default)
    if (!member?.family)
      throw new Error(`${locale}: the default sans member has no family`)
    const catalogue = `messages/${locale}.json`
    const bytes = readFileSync(path.join(root, catalogue))
    const text = subsetText(drawnStrings(JSON.parse(bytes.toString('utf8'))))
    for (const weight of OG_WEIGHTS) {
      const css = await (
        await fetchOk(css2Url(member.family, weight, text))
      ).text()
      const font = new Uint8Array(
        await (await fetchOk(truetypeUrl(css))).arrayBuffer(),
      )
      if (!isSfnt(font))
        throw new Error(`${locale}-${weight}: not a TrueType/OpenType file`)
      const file = `${locale}-${weight}.ttf`
      writeFileSync(path.join(outDir, file), font)
      files.push({
        file,
        locale,
        family: member.family,
        weight,
        text,
        catalogue,
        catalogueBlob: blobSha(bytes),
      })
      console.log(`${file}: ${member.family} ${weight}, ${font.length} bytes`)
    }
  }

  const manifest: Manifest = {
    generatedBy: 'pnpm brand:og-fonts (scripts/brand/subset-og-fonts.ts)',
    files,
  }
  const manifestPath = path.join(outDir, 'manifest.json')
  writeFileSync(
    manifestPath,
    await format(JSON.stringify(manifest), { filepath: manifestPath }),
  )
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  await main()
}
