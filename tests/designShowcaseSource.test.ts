import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/*
 * "The page REUSES the shipped runtime and registries and invents nothing"
 * (MOTIR-1043), asserted against the source rather than against a habit.
 *
 * ⚠️ THIS IS THE CRITERION THAT CANNOT BE CHECKED BY LOOKING AT THE PAGE. A
 * hand-rolled chip row that happens to look right is indistinguishable from
 * the shipped `StylePicker` in a screenshot and identical in a green suite —
 * and the page's entire argument is that it is the system rather than a
 * picture of it. So the check reads the module.
 */

const SHOWCASE = readFileSync('app/_components/DesignShowcase.tsx', 'utf8')
const PAGE = readFileSync('app/[locale]/design/DesignRoute.tsx', 'utf8')

/** Source with comments removed — a rule quoted in a comment is not a declaration. */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
}

describe('the showcase invents nothing', () => {
  it('takes every picker, registry and primitive from @motir/design-system', () => {
    const imported = /import \{([^}]*)\} from '@motir\/design-system'/.exec(
      SHOWCASE,
    )
    expect(imported).not.toBeNull()
    const names = (imported as RegExpExecArray)[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    for (const required of [
      'ThemeSegmentedControl',
      'AxisField',
      'AxisNote',
      'TokensSpecimen',
    ]) {
      expect(names).toContain(required)
    }
  })

  it('builds the chip rows from the package’s AxisRadioGroup and id lists, in the catalogue’s words', () => {
    // The package's StylePicker / PalettePicker / TypePicker label their chips
    // in English only, so the rows are rebuilt from the same parts with
    // translated labels (Yue, 2026-10-09) — still the package's own control.
    const pickers = readFileSync(
      'app/_components/AppearancePickers.tsx',
      'utf8',
    )
    const imported = /import \{([^}]*)\} from '@motir\/design-system'/.exec(
      pickers,
    )
    const names = (imported as RegExpExecArray)[1]
      .split(',')
      .map((s) => s.trim())
    for (const required of [
      'AxisRadioGroup',
      'STYLE_IDS',
      'PALETTE_IDS',
      'TYPE_IDS',
    ]) {
      expect(names).toContain(required)
    }
    expect(code(SHOWCASE)).toMatch(/<StyleChips/)
    expect(code(SHOWCASE)).toMatch(/<PaletteChips/)
    expect(code(SHOWCASE)).toMatch(/<TypeChips/)
    expect(code(pickers)).not.toMatch(/--(el|color)-[a-z0-9-]+\s*:/)
    expect(code(pickers)).not.toMatch(/--color-[a-z0-9-]+/)
  })

  it('DECLARES no design token — every colour is read, never defined', () => {
    // `text-(--el-text)` is a REFERENCE and is the correct way to use the
    // layer. `--el-something: <value>` would be this page minting its own.
    for (const [name, source] of [
      ['DesignShowcase.tsx', SHOWCASE],
      ['design/page.tsx', PAGE],
    ] as const) {
      const declarations = code(source).match(/--(el|color)-[a-z0-9-]+\s*:/g)
      expect({ name, declarations: declarations ?? [] }).toEqual({
        name,
        declarations: [],
      })
    }
  })

  it('routes colour through Tier-3 --el-* only, never a Tier-0 --color-*', () => {
    expect(code(SHOWCASE).match(/--color-[a-z0-9-]+/g)).toBeNull()
    expect(code(PAGE).match(/--color-[a-z0-9-]+/g)).toBeNull()
  })

  it('uses no raw radius, padding or height utility where a shape token exists', () => {
    /*
     * `rounded-*` / `p-*` / `h-*` with a literal scale value are the three that
     * freeze shape against the style axis: a `data-style` swap re-points
     * `--radius-*`, `--spacing-*` and `--height-*`, and a raw utility does not
     * move with it. Layout utilities that carry no shape meaning — `gap-*`,
     * `max-w-*`, `flex` — are untouched by a style swap and are not in scope.
     */
    const raw = code(SHOWCASE).match(/\b(?:rounded|p|h)-(?!\()[a-z0-9[]/g)
    expect(raw ?? []).toEqual([])
  })

  it('mounts no persisting ThemeProvider, and touches no storage or <html> itself (MOTIR-7724)', () => {
    // The package provider seeds from localStorage with the APP's defaults and
    // persists every pick; `/design` is a sandbox over motir.co's own look, and
    // the one attribute writer is `lib/useVisitAppearance.ts`.
    expect(code(SHOWCASE)).not.toMatch(/ThemeProvider|useTheme\b/)
    expect(code(SHOWCASE)).toMatch(/useVisitAppearance\(\)/)
    expect(code(SHOWCASE)).not.toMatch(
      /localStorage|documentElement|setAttribute/,
    )
  })
})
