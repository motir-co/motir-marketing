import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { TYPE_IDS } from '@motir/design-system'
import { describe, expect, it } from 'vitest'
import { referencedFontSources } from './support/themeTokens'

/*
 * ALL TEN TYPE PAIRINGS RENDER THEIR REAL FACES (MOTIR-1043 · MOTIR-10774).
 *
 * `/design` is a picker, and seven of the ten pairings read faces the default
 * one does not. TWO OF THEM FAIL HARD RATHER THAN DEGRADING:
 * `[data-type='grotesk']` and `[data-type='editorial']` read
 * `var(--font-grotesk-source)` / `var(--font-editorial-source)` with NO in-var
 * fallback, so an unloaded face makes the whole declaration invalid and the
 * role silently reverts — a Type axis that appears to work and does nothing.
 *
 * ⚠️ THE ASSERTION IS TOTAL OVER THE STYLESHEET, NOT OVER A LIST OF TEN. What
 * this reads is every `--font-*-source` variable `theme.css` actually
 * references through `var()`, whatever declares it, and requires
 * `app/fonts.css` to define each one AND to load the face it names. An eleventh
 * pairing that loads no face fails the suite on the day the package is bumped.
 *
 * ⚠️ THE DECLARATION MOVED (MOTIR-10643). The faces were `next/font/google`
 * loaders in `app/fonts.ts`; on the built site they are fontsource `@font-face`
 * sheets imported by `app/fonts.css`, which sets the same variables on
 * `:root`. So this reads the CSS, and resolves each imported sheet to check
 * the face it declares is the family the variable names.
 */

const FONTS = readFileSync('app/fonts.css', 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)
const PRELOADS = readFileSync('app/fontPreloads.ts', 'utf8')
const require = createRequire(import.meta.url)

/** `--font-…: '<family>'` in `:root`, as a map from variable to family. */
const VARIABLES = new Map(
  [...FONTS.matchAll(/(--font-[A-Za-z0-9-]+):\s*'([^']+)'/g)].map(
    ([, name, family]) => [name!, family!],
  ),
)

/** Every `@font-face` family the imported fontsource sheets declare. */
function importedSheets(): { specifier: string; css: string }[] {
  return [...FONTS.matchAll(/@import '([^']+)'/g)].map(([, specifier]) => ({
    specifier: specifier!,
    css: readFileSync(require.resolve(specifier!), 'utf8'),
  }))
}

const sheetFamilies = (css: string) =>
  new Set([...css.matchAll(/font-family:\s*'([^']+)'/g)].map(([, f]) => f!))

const PAIRING = new Map([
  ['--font-sans-source', '@fontsource-variable/inter/'],
  ['--font-serif-source', '@fontsource-variable/source-serif-4/'],
  ['--font-mono-source', '@fontsource-variable/jetbrains-mono/'],
  ['--font-grotesk-source', '@fontsource-variable/space-grotesk/'],
  ['--font-editorial-source', '@fontsource-variable/fraunces/'],
  ['--font-mono-technical-source', '@fontsource/ibm-plex-mono/'],
  ['--font-marker-source', '@fontsource-variable/caveat/'],
  ['--font-rounded-source', '@fontsource-variable/nunito/'],
  ['--font-slab-source', '@fontsource-variable/roboto-slab/'],
  ['--font-humanist-source', '@fontsource/fira-sans/'],
])

describe('the type axis loads every face it offers', () => {
  it('defines every --font-*-source variable theme.css reads', () => {
    const referenced = [...referencedFontSources()].sort()
    expect(referenced.length).toBeGreaterThanOrEqual(6)
    expect(referenced.filter((name) => !VARIABLES.has(name))).toEqual([])
  })

  it('loads the face every variable names, from a sheet the site serves', () => {
    const declared = new Set(
      importedSheets().flatMap(({ css }) => [...sheetFamilies(css)]),
    )
    for (const [name, family] of VARIABLES) {
      expect(declared, `${name} names '${family}'`).toContain(family)
    }
  })

  it('names the variables --font-*-SOURCE, never the role token', () => {
    /*
     * `theme.css` declares the ROLE tokens as `--font-sans:
     * var(--font-sans-source, …)`, so a variable named `--font-sans` leaves
     * every `var(--font-*-source)` unresolved and quietly disables the whole
     * axis. A font-set face is named by `fontSetMemberVar` instead
     * (`tests/fontSetFaces.test.ts`).
     */
    for (const name of VARIABLES.keys()) {
      expect(name).toMatch(/^--font-[a-z0-9-]+-source$|^--font-set-/)
      expect(name).not.toMatch(/^--font-(sans|serif|mono)$/)
    }
  })

  it('preloads only the default pairing, so the landings first paint is unchanged', () => {
    /*
     * The default pairing's three faces in `latin` and `latin-ext` — the six
     * files next/font preloaded — and nothing else: a visitor pays for any
     * other face only by choosing its pairing or reading its script.
     */
    const preloaded = [
      ...PRELOADS.matchAll(/from '(@fontsource[^']+)\?url'/g),
    ].map(([, file]) => file)
    expect(preloaded.sort()).toEqual(
      ['inter', 'source-serif-4', 'jetbrains-mono']
        .flatMap((face) =>
          ['latin', 'latin-ext'].map(
            (subset) =>
              `@fontsource-variable/${face}/files/${face}-${subset}-wght-normal.woff2`,
          ),
        )
        .sort(),
    )
  })

  it('loads latin-ext on every pairing face, so accented letters keep the face', () => {
    const sheets = importedSheets()
    for (const [name, pkg] of PAIRING) {
      expect(VARIABLES.has(name)).toBe(true)
      const faceSheets = sheets.filter((s) => s.specifier.startsWith(pkg))
      expect(faceSheets.length, pkg).toBeGreaterThan(0)
      for (const { css } of faceSheets) {
        expect(css).toMatch(/-latin-ext-[a-z0-9-]+\.woff2/)
        expect(css).toMatch(
          /-latin-[a-z0-9-]*normal\.woff2|-latin-\d+-normal\.woff2/,
        )
      }
    }
  })

  it('registers exactly the ten pairings the rail offers', () => {
    expect(TYPE_IDS).toEqual([
      'motir',
      'motir-sans',
      'motir-mono',
      'grotesk',
      'editorial',
      'mono-technical',
      'marker',
      'rounded',
      'slab',
      'humanist',
    ])
  })
})
