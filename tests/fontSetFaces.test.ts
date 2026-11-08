// @vitest-environment node
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  FONT_SET_IDS,
  FONT_SET_REGISTRY,
  FONT_SET_ROLES,
  fontSetMemberVar,
  type FontSetMember,
} from '@motir/design-system'

/*
 * `app/fonts.css` DECLARES EVERY FONT-SET FACE THE INSTALLED PACKAGE NAMES
 * (MOTIR-7952 — a port of motir-core's `tests/theme/fontSetFaces.test.ts`;
 * moved off `next/font` by MOTIR-10643).
 *
 * The registry names each face by its Google family (`Noto_Sans_SC`) and its
 * member id (`noto-sans-sc`), which is also the face's fontsource package. For
 * every face this holds `app/fonts.css` to three things: the variable
 * `fontSetMemberVar` returns is set to that face's family, the face's own
 * fontsource sheet is imported, and that sheet declares the family with
 * `font-display: swap`. A face added to the registry by a package bump fails
 * here until the file declares it.
 */

const FONTS = readFileSync(
  join(process.cwd(), 'app/fonts.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '')
const PRELOADS = readFileSync(
  join(process.cwd(), 'app/fontPreloads.ts'),
  'utf8',
)
const require = createRequire(import.meta.url)

const VARIABLES = new Map(
  [...FONTS.matchAll(/(--font-set-[A-Za-z0-9-]+):\s*'([^']+)'/g)].map(
    ([, name, family]) => [name!, family!],
  ),
)
const IMPORTS = [...FONTS.matchAll(/@import '([^']+)'/g)].map(([, s]) => s!)

/** Each distinct face the registry names, with the variable it is read through. */
function registryFaces() {
  const faces = new Map<
    string,
    { id: string; googleFamily: string; variable: string }
  >()
  for (const setId of FONT_SET_IDS) {
    const set = FONT_SET_REGISTRY[setId]
    for (const role of FONT_SET_ROLES) {
      for (const m of set.roles[role].members as readonly FontSetMember[]) {
        if (m.source.kind !== 'next/font/google') continue
        const variable = fontSetMemberVar(setId, role, m.id)
        if (variable === null) {
          throw new Error(`${setId}/${role}/${m.id} has no variable`)
        }
        faces.set(variable, {
          id: m.id,
          googleFamily: m.source.googleFamily,
          variable,
        })
      }
    }
  }
  return [...faces.values()]
}

describe('app/fonts.css declares every font-set face', () => {
  const faces = registryFaces()

  it('finds the twelve distinct faces the installed registry names', () => {
    expect(faces).toHaveLength(12)
  })

  it.each(faces.map((f) => [f.variable, f] as const))(
    'declares %s with its registry family, served by its own package, with swap',
    (variable, face) => {
      const family = VARIABLES.get(variable)
      const name = face.googleFamily.replace(/_/g, ' ')
      expect(family, `a value for ${variable}`).toBeDefined()
      expect([name, `${name} Variable`]).toContain(family)

      const variableFace = family!.endsWith(' Variable')
      const sheets = IMPORTS.filter((s) =>
        s.startsWith(
          `@fontsource${variableFace ? '-variable' : ''}/${face.id}/`,
        ),
      )
      // A variable face is one weight-axis sheet; a static one is the set's two weights.
      expect(sheets.map((s) => s.split('/').pop())).toEqual(
        variableFace ? ['wght.css'] : ['400.css', '700.css'],
      )
      for (const sheet of sheets) {
        const css = readFileSync(require.resolve(sheet), 'utf8')
        expect(css).toContain(`font-family: '${family}'`)
        expect(css).toContain('font-display: swap')
        expect(css).not.toContain('font-display: block')
      }
    },
  )

  it('declares no font-set face the registry does not name', () => {
    const known = new Set(faces.map((f) => f.variable))
    expect([...VARIABLES.keys()].filter((v) => !known.has(v))).toEqual([])
  })

  it('preloads no font-set face', () => {
    for (const face of faces) expect(PRELOADS).not.toContain(face.id)
  })
})
