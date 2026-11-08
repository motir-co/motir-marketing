import { cleanup } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import {
  PALETTE_IDS,
  STYLE_IDS,
  TYPE_IDS,
  type PaletteId,
} from '@motir/design-system'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Page from '@/app/[locale]/LandingRoute'
import DesignPage from '@/app/[locale]/design/DesignRoute'
import { distinctPairs, paintedPairs } from './support/paintedInks'
import {
  contrastRatio,
  declaredAxisValues,
  styleBlockDeclarations,
  tokenContrast,
  type Axes,
} from './support/themeTokens'
import { EN_PAGE } from '@/tests/helpers/locale'

/*
 * ⚠️ TWO STUBS THE PAGES NEED: jsdom ships no `matchMedia`, and the landing
 * reads the ideas store. Neither touches a colour, so neither can move a
 * number measured below — they exist only so the pages render at all.
 */
// The landing reads live idea titles for the hero brief; no network here.
vi.mock('@/lib/ideas', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/ideas')>()),
  fetchIdeas: vi
    .fn()
    .mockResolvedValue({ items: [], categories: [], total: 0 }),
}))

function stubMatchMedia() {
  window.matchMedia = ((query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
}

/*
 * THE AA MATRIX — `/design`'s "AA holds for body text and controls, in light
 * and dark, for every style × palette pair" criterion (MOTIR-1043), measured
 * over the registries rather than sampled by eye.
 *
 * The full grid the page can wear is 11 styles × 10 palettes × 6 pairings × 2
 * themes = 1,320 cells. Two of those axes are proved NOT to participate rather
 * than assumed not to: the first test asserts that no `[data-style]` block in
 * `theme.css` declares a colour token at all, and type pairings only re-point
 * `--font-*`. What remains — 10 palettes × 2 themes, over every ink/surface
 * pair this page composes — is measured exhaustively below and reported as a
 * table, not a sample.
 */

const THEMES = ['light', 'dark'] as const

function axesFor(theme: (typeof THEMES)[number], palette: PaletteId): Axes {
  return { theme, palette, style: 'warm-editorial', type: 'motir' }
}

const AA = 4.5

/*
 * ⚠️ THE HARNESS IS ASSERTED BEFORE ANY CELL IS BELIEVED.
 *
 * A first run of this sweep during the design pass (MOTIR-3861) reported the
 * theme as 10/10 failing in dark. That was the harness, not the theme: the
 * fixed inks are `color-mix()`, which computes to `color(srgb 0.567 0.519
 * 0.910)`, and the parser read those 0–1 floats as 0–255. **A fixed theme and
 * a catastrophically broken one are one parser bug apart**, so these are the
 * control numbers — every one of them recorded independently of this file,
 * before it existed:
 *
 *   · 4.41 / 5.76  — MOTIR-3745's own figure, and MOTIR-3874's re-measurement
 *                    of the same pair on the pinned 0.1.1, taken in headless
 *                    chromium with `getComputedStyle`.
 *   · 4.17 / 4.34  — `theme.css`'s OWN comment on `--el-text-muted`, written
 *                    by MOTIR-2455 in a different repository years of commits
 *                    before this resolver.
 *   · 0/10 · 0/10  — MOTIR-3872's ten-palette sweep of the tint-lavender arm.
 *
 * Every figure above was taken on the warm scheme, which was called `motir`
 * until MOTIR-6471 and is `amethyst` from `@motir/design-system@0.6.0` on. The
 * controls follow the COLOURS, not the id: under `motir` they would now measure
 * the monochrome palette, a different set of inks the figures never described.
 */
describe('the contrast harness, before it is trusted', () => {
  it('reproduces MOTIR-3874s browser measurement of the nav pair, to the digit', () => {
    expect(
      tokenContrast(
        '--el-accent-on-surface',
        '--el-surface-soft',
        axesFor('dark', 'amethyst'),
      ),
    ).toBe(5.76)
    expect(
      tokenContrast(
        '--el-accent-on-surface',
        '--el-surface-soft',
        axesFor('light', 'amethyst'),
      ),
    ).toBe(6.29)
    expect(
      tokenContrast(
        '--el-accent-on-surface',
        '--el-surface',
        axesFor('dark', 'amethyst'),
      ),
    ).toBe(5.54)
  })

  it('reproduces theme.css OWN stated figures for the muted ink', () => {
    // "AA-SAFE ONLY ON THE WHITE PAGE/CARD, and by 0.04 (4.54:1). On
    // --el-surface it is 4.17, on --el-surface-soft 4.34 — all under AA."
    const light = axesFor('light', 'amethyst')
    expect(tokenContrast('--el-text-muted', '--el-page-bg', light)).toBe(4.54)
    expect(tokenContrast('--el-text-muted', '--el-surface', light)).toBe(4.17)
    expect(tokenContrast('--el-text-muted', '--el-surface-soft', light)).toBe(
      4.34,
    )
  })

  it('reproduces MOTIR-3872s ten-palette result for the selected-chip ink', () => {
    for (const theme of THEMES) {
      const failing = PALETTE_IDS.filter(
        (palette) =>
          tokenContrast(
            '--el-accent-on-surface',
            '--el-tint-lavender',
            axesFor(theme, palette),
          ) < AA,
      )
      expect(failing).toEqual([])
    }
  })

  it('computes the two anchors of the WCAG scale exactly', () => {
    expect(contrastRatio([0, 0, 0, 1], [1, 1, 1, 1])).toBe(21)
    expect(contrastRatio([1, 1, 1, 1], [1, 1, 1, 1])).toBe(1)
  })

  it('THROWS on an unresolved token rather than returning a plausible number', () => {
    // An undefined custom property computes to the INITIAL ink in a browser,
    // which is a pair of believable, AA-passing figures — exactly what hid a
    // missing `--el-danger-on-surface` from a green run during the design pass.
    expect(() =>
      tokenContrast(
        '--el-not-a-token',
        '--el-page-bg',
        axesFor('light', 'amethyst'),
      ),
    ).toThrow(/not declared/)
  })
})

describe('the axes that do not carry colour, proved rather than assumed', () => {
  it('has a [data-style] block for every registered style, and none of them declares a colour', () => {
    // If a style ever DID declare `--el-*`, this matrix would have to run over
    // the style axis too — so the exemption is a test, not a sentence.
    expect(
      styleBlockDeclarations().filter((p) => /^--(el|color)-/.test(p)),
    ).toEqual([])
    const declared = declaredAxisValues('style')
    expect(
      STYLE_IDS.filter((id) => id !== 'warm-editorial').every((id) =>
        declared.has(id),
      ),
    ).toBe(true)
  })

  it('registers 11 styles, 10 palettes and 6 pairings — read from the package, not from a card', () => {
    // The card's body said "9 styles"; the installed package says 11, and the
    // count is a LAYOUT input (it is what wraps the Style axis to a second row
    // at 1440 and forces the narrow scrolling row).
    expect(STYLE_IDS).toHaveLength(11)
    expect(PALETTE_IDS).toHaveLength(10)
    expect(TYPE_IDS).toHaveLength(6)
  })
})

/*
 * The pairs this SITE composes. Each names the element it belongs to, because
 * a pair with no element behind it is a number nobody can re-check.
 *
 * SCOPE: these are the pairs where THIS site picks the ink or the surface. The
 * inks a primitive resolves inside its own box (`Input`'s helper, `Pill`'s
 * status fills) belong to `@motir/design-system` and are gated by motir-core's
 * own `inkContrastLint`, which runs over the same registries.
 *
 * ⚠️ THE LIST NOW CARRIES A VERDICT, AND THE `below-AA` HALF IS THE POINT
 * (MOTIR-3984). Until this card every entry meant "the site paints this, and it
 * must clear AA", so the only way to record a pair the site MUST NOT paint was
 * to leave it out — and a pair that is absent from the list is indistinguishable
 * from one nobody thought of. That is exactly how the same defect arrived three
 * times in three days (MOTIR-3874, MOTIR-3931, MOTIR-3984): the muted ink was
 * carried against `--el-card`, the one surface the rail had just moved onto, and
 * against no other, so the matrix was green about a pair the footer was not
 * painting while the pair it WAS painting went unmeasured.
 *
 * So the three muted inks are stated against every surface this site has, and
 * the ones that fail carry `below-AA` rather than being omitted. Two tests read
 * that verdict and they pull in opposite directions: the `below-AA` rows are
 * asserted to be genuinely BELOW AA (so a republish that lifts them turns this
 * file red and the declaration is re-decided instead of quietly rotting into a
 * tautology), and `the site paints nothing below AA` asserts that no rendered
 * element paints one. Neither number is a promise about the theme —
 * `--el-text-muted`'s values belong to motir-core and are deliberate
 * (MOTIR-2455) — they are a promise about what this site puts on top of them.
 */
type Verdict =
  /** The site paints this, and it must clear AA on every palette × theme. */
  | 'clears-AA'
  /**
   * Below AA in light Amethyst — the warm palette, served by default until
   * MOTIR-6616 and still one pick away on `/design` — so the site must not
   * paint it. `theme.css` states the rule at the
   * token's own declaration: "a muted caption belongs inside a card, never on a
   * panel."
   */
  | 'below-AA'

const PAIRS: {
  ink: string
  surface: string
  element: string
  verdict: Verdict
}[] = [
  {
    ink: '--el-text',
    surface: '--el-page-bg',
    element: 'page headline + body',
    verdict: 'clears-AA',
  },
  {
    ink: '--el-text-secondary',
    surface: '--el-page-bg',
    element: 'the subline and the closing line',
    verdict: 'clears-AA',
  },
  {
    ink: '--el-text-secondary',
    surface: '--el-page-bg',
    element: 'an unselected axis chip (its own fill is --el-page-bg)',
    verdict: 'clears-AA',
  },
  {
    ink: '--el-text',
    surface: '--el-card',
    element: 'an axis name in the rail',
    verdict: 'clears-AA',
  },
  {
    ink: '--el-text-muted',
    surface: '--el-card',
    element: 'an axis help line and its AxisNote',
    verdict: 'clears-AA',
  },
  {
    ink: '--el-text-eyebrow',
    surface: '--el-page-bg',
    element: 'a SectionLabel',
    verdict: 'clears-AA',
  },
  {
    ink: '--el-accent-on-surface',
    surface: '--el-tint-lavender',
    element: 'the SELECTED axis chip',
    verdict: 'clears-AA',
  },
  {
    ink: '--el-accent-on-surface',
    surface: '--el-surface-soft',
    element: 'the nav current-page item, desktop bar',
    verdict: 'clears-AA',
  },
  {
    ink: '--el-accent-on-surface',
    surface: '--el-surface',
    element: 'the nav current-page item, Menu panel',
    verdict: 'clears-AA',
  },
  {
    ink: '--el-text-secondary',
    surface: '--el-surface-soft',
    element: 'the other nav items in the bar, and the footer legal strip',
    verdict: 'clears-AA',
  },
  // The language switcher's open list (MOTIR-7953): it sits on the page
  // background, and a hovered row takes `--el-surface-soft`.
  {
    ink: '--el-accent-on-surface',
    surface: '--el-page-bg',
    element: 'the current language in the open switcher list',
    verdict: 'clears-AA',
  },
  {
    ink: '--el-text',
    surface: '--el-surface-soft',
    element: 'a hovered language in the open switcher list',
    verdict: 'clears-AA',
  },

  /*
   * ⚠️ THE MUTED FAMILY, BY SURFACE RATHER THAN BY INCIDENT (MOTIR-3984).
   *
   * `--el-text-muted`, `--el-text-eyebrow` and `--el-text-helper` are three
   * names for ONE value — all three resolve to `var(--color-muted-foreground)`
   * — so all three are stated rather than only the one that happened to be
   * painted, and a later reader who reaches for `-eyebrow` or `-helper` meets
   * the number too. The `--el-card` and `--el-page-bg` rows above and below are
   * where the family DOES clear AA, and they are what makes the rule
   * ("inside a card, never on a panel") readable as a pair of columns rather
   * than as a sentence.
   */
  {
    ink: '--el-text-muted',
    surface: '--el-page-bg',
    element: "Proof's mono kicker, on the page",
    verdict: 'clears-AA',
  },
  {
    ink: '--el-text-muted',
    surface: '--el-surface',
    element: 'a muted caption on a raised panel — the site paints none',
    verdict: 'below-AA',
  },
  {
    ink: '--el-text-muted',
    surface: '--el-surface-soft',
    element:
      "the band the footer and the pillars section sit on — SiteFooter's legal strip and Pillars' eyebrow painted this until MOTIR-3984",
    verdict: 'below-AA',
  },
  {
    ink: '--el-text-muted',
    surface: '--el-muted',
    element: 'a muted caption on the segmented-control trough',
    verdict: 'below-AA',
  },
  {
    ink: '--el-text-eyebrow',
    surface: '--el-surface',
    element: 'an overline on a raised panel',
    verdict: 'below-AA',
  },
  {
    ink: '--el-text-eyebrow',
    surface: '--el-surface-soft',
    element: 'an overline on the band',
    verdict: 'below-AA',
  },
  {
    ink: '--el-text-eyebrow',
    surface: '--el-muted',
    element: 'an overline on the trough',
    verdict: 'below-AA',
  },
  {
    ink: '--el-text-helper',
    surface: '--el-surface',
    element: 'a form hint on a raised panel',
    verdict: 'below-AA',
  },
  {
    ink: '--el-text-helper',
    surface: '--el-surface-soft',
    element: 'a form hint on the band',
    verdict: 'below-AA',
  },
  {
    ink: '--el-text-helper',
    surface: '--el-muted',
    element: 'a form hint on the trough',
    verdict: 'below-AA',
  },
]

const CLEARS = PAIRS.filter((p) => p.verdict === 'clears-AA')
const BELOW = PAIRS.filter((p) => p.verdict === 'below-AA')

describe('AA over every palette × theme, for every pair this site paints', () => {
  it.each(CLEARS)('$ink on $surface — $element', ({ ink, surface }) => {
    const failures: string[] = []
    for (const theme of THEMES) {
      for (const palette of PALETTE_IDS) {
        const ratio = tokenContrast(ink, surface, axesFor(theme, palette))
        if (ratio < AA) failures.push(`${theme}/${palette} = ${ratio}`)
      }
    }
    expect(failures).toEqual([])
  })

  /*
   * ⚠️ THE DECLARATION IS ASSERTED, NOT ASSUMED. A `below-AA` row that quietly
   * became AA-safe — a republished palette, a re-decided token — would leave
   * this file forbidding something that is no longer a defect, and nothing
   * would say so: the scan below would keep passing and the ban would harden
   * into folklore. So each one has to still FAIL, in the cell the ban is about.
   *
   * THAT CELL IS LIGHT AMETHYST, and it is no longer the default (MOTIR-6616).
   * The monochrome palette a first-time visitor now meets clears every one of
   * these rows (5.31 : 1 at worst). The ban stands anyway: `/design` lets a
   * visitor wear any of the ten palettes on every page, Amethyst is the one
   * `theme.css` wrote the rule against ("a muted caption belongs inside a card,
   * never on a panel"), and a pair that fails in one palette the site offers is
   * a pair the site must not paint.
   */
  it.each(BELOW)(
    '$ink on $surface is still below AA in light Amethyst — $element',
    ({ ink, surface }) => {
      const light = axesFor('light', 'amethyst')
      expect(tokenContrast(ink, surface, light)).toBeLessThan(AA)
    },
  )

  it('reports the whole matrix, not a sample — 20 cells per pair, none missing', () => {
    const rows = PAIRS.flatMap(({ ink, surface }) =>
      THEMES.flatMap((theme) =>
        PALETTE_IDS.map((palette) =>
          tokenContrast(ink, surface, axesFor(theme, palette)),
        ),
      ),
    )
    expect(rows).toHaveLength(PAIRS.length * THEMES.length * PALETTE_IDS.length)
    expect(
      CLEARS.flatMap(({ ink, surface }) =>
        THEMES.flatMap((theme) =>
          PALETTE_IDS.map((palette) =>
            tokenContrast(ink, surface, axesFor(theme, palette)),
          ),
        ),
      ).every((r) => r >= AA),
    ).toBe(true)
    // Print it so a reviewer reads a table rather than a green tick.
    console.log(
      ['', 'AA matrix — minimum ratio per pair over 10 palettes × 2 themes']
        .concat(
          PAIRS.map(({ ink, surface, element, verdict }) => {
            let min = Infinity
            let at = ''
            for (const theme of THEMES) {
              for (const palette of PALETTE_IDS) {
                const r = tokenContrast(ink, surface, axesFor(theme, palette))
                if (r < min) {
                  min = r
                  at = `${theme}/${palette}`
                }
              }
            }
            const mark = verdict === 'clears-AA' ? 'paints ' : 'BANNED '
            return `  ${mark} ${min.toFixed(2)}  ${at.padEnd(16)} ${ink} on ${surface} — ${element}`
          }),
        )
        .join('\n'),
    )
  })
})

/*
 * ⚠️ AND THE HALF A PAIR LIST CANNOT DO — WHAT DOES THE SITE ACTUALLY PAINT?
 * (MOTIR-3984)
 *
 * Everything above rules on pairs somebody WROTE DOWN, which is the mechanism
 * that failed three times in three days: a list is authored by whoever already
 * knows which pairs to write, so it certifies the question that prompted it,
 * says nothing about the rest, and reads as a clean bill of health either way.
 * `tests/aaMatrix.test.ts` carried `--el-text-muted` against `--el-card` — the
 * surface MOTIR-1043 had just moved the axis rail onto — and against no other
 * surface at all, while `SiteFooter`'s legal strip and `Pillars`' eyebrow both
 * painted it on `--el-surface-soft` at 4.34:1, live on motir.co.
 *
 * So this describe starts from the ELEMENTS instead. It renders the site's two
 * pages, reads every ink/surface pair they put on screen (`support/paintedInks`
 * — its header carries the scope), and rules each one against the same matrix.
 * A pair nobody thought of is measured exactly like one somebody did, which is
 * the only property that stops a fourth occurrence.
 *
 * ⚠️ IT IS ALSO WHY THE MOCK COULD NOT HAVE CAUGHT THIS. An element scan over
 * `design/marketing/landing.mock.html` finds the `div.legal` pair and NOT the
 * pillars eyebrow, because the mock does not draw that element at all — an
 * asset can only be measured for what it happens to depict, and the components
 * are the thing a visitor actually reads.
 */
describe('what the site actually paints, read off the rendered pages', () => {
  const pages = [
    ['/', Page],
    ['/design', DesignPage],
  ] as const

  beforeEach(() => {
    stubMatchMedia()
  })
  afterEach(cleanup)

  it.each(pages)(
    '%s paints no pair that is below AA',
    async (_route, Component) => {
      // Called, not mounted: the landing is an async server component.
      const { container } = render(await Component(EN_PAGE))
      const painted = paintedPairs(container.firstElementChild as Element)
      expect(painted.length).toBeGreaterThan(20)

      const banned = new Set(BELOW.map((p) => `${p.ink} on ${p.surface}`))
      const hits = painted
        .filter((p) => banned.has(`${p.ink} on ${p.surface}`))
        .map((p) => `${p.ink} on ${p.surface} — ${p.where} — "${p.text}"`)
      expect(hits).toEqual([])
    },
  )

  /*
   * The stronger form, and the one that does not consult the list at all: every
   * pair the page paints has to clear AA on all 10 palettes × 2 themes. A pair
   * that is neither declared `clears-AA` nor declared `below-AA` is measured
   * here on its own merits, so a new element painting a new pair is caught the
   * first time it renders rather than the first time somebody widens a list.
   */
  it.each(pages)(
    '%s — every rendered pair clears AA on all 20 cells',
    async (_route, Component) => {
      const { container } = render(await Component(EN_PAGE))
      const failures: string[] = []
      for (const pair of distinctPairs(
        paintedPairs(container.firstElementChild as Element),
      )) {
        for (const theme of THEMES) {
          for (const palette of PALETTE_IDS) {
            const ratio = tokenContrast(
              pair.ink,
              pair.surface,
              axesFor(theme, palette),
            )
            if (ratio < AA) {
              failures.push(
                `${pair.ink} on ${pair.surface} = ${ratio} (${theme}/${palette}) — ${pair.where} — "${pair.text}"`,
              )
            }
          }
        }
      }
      expect(failures).toEqual([])
    },
  )
})
