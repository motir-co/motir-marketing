import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  DEFAULT_STYLE_ID,
  DEFAULT_TYPE_ID,
  PALETTE_IDS,
  STYLE_IDS,
  TYPE_IDS,
} from '@motir/design-system'
import { SITE_APPEARANCE } from '../../lib/siteDefaults'
import { t } from '../support/catalogue'
import { firstFamily } from '../support/elevenLanguages'
import {
  fetchedFamilies,
  settleFonts,
  typeface,
  watchFontRequests,
} from '../support/fontFaces'

/*
 * ⚠️ THE ACCEPTANCE WALK FOR THE @motir/design-system 0.22.0 RE-PIN ON
 * motir.co (MOTIR-10778): `/design`, signed out, in a real browser, after the
 * re-pin (MOTIR-10774, under story MOTIR-10824) merged. The rail is read
 * against the INSTALLED package's three id arrays, every style, palette and
 * pairing is picked, the palettes in light and in dark, an unregistered id is
 * stamped on each axis, and Reset brings the site look back. PACED FOR A
 * PERSON TO WATCH — every `beat()` is pacing, never a wait for state; every
 * assertion waits on its own signal (an attribute, a resolved token, a
 * settled font set, no running transition). Each `chapter()` is one
 * user-visible phase, timed as the walk passes it.
 *
 * ⚠️ NOTHING HERE IS TYPED THAT THE SITE ALREADY KNOWS. The chip counts and
 * their order are `STYLE_IDS` / `PALETTE_IDS` / `TYPE_IDS`; every label is
 * `messages/en.json`; the face a pairing must draw the headline in is
 * derived by reading the installed `theme.css` (which `-source` variable the
 * pairing's `--font-serif-pairing` reads) and then `app/fonts.css` (which
 * family that variable names). The four new families are ALSO named
 * outright, because the release promised exactly those four.
 *
 * ⚠️ THE FONT FILE OF EVERY PAIRING IS FETCHED ON ARRIVAL, NOT ON THE PICK.
 * `TypeChips` scopes each chip's label to its own `data-type` and draws it in
 * that pairing's headline face (`app/_components/AppearancePickers.tsx`), so
 * rendering the rail requests all ten faces before anything is picked. "A
 * file was fetched between the pick and the settle" would therefore be false
 * for every pairing, not only for the three `app/fontPreloads.ts` preloads.
 * What the walk proves instead, per pairing: the headline's computed stack
 * leads with the bound family, a FontFace of that family is `loaded`, and a
 * `.woff2` the page's own `@font-face` rules map to that family was fetched
 * by this page — so the face is the real file, never a system fallback.
 *
 * English `/design` only: a zh, ja or ko route's type row is the CJK faces,
 * which is a different claim (`acceptance-eleven-languages.spec.ts`).
 */

test.setTimeout(420_000)

const DESIGN = '/design'
const THEME_CSS = join(
  process.cwd(),
  'node_modules',
  '@motir',
  'design-system',
  'theme.css',
)
const FONTS_CSS = join(process.cwd(), 'app', 'fonts.css')

const beat = (page: Page, ms = 1200) => page.waitForTimeout(ms)
const chapters: { label: string; tSeconds: number }[] = []
let startedAt = Date.now()
const chapter = (label: string) =>
  chapters.push({ label, tSeconds: (Date.now() - startedAt) / 1000 })

test.afterEach(async ({}, testInfo) => {
  if (chapters.length) {
    writeFileSync(
      testInfo.outputPath('chapters.json'),
      JSON.stringify(chapters, null, 2),
    )
    chapters.length = 0
  }
})

// ── What the installed stylesheet and the fontsheet bind ──────────────────

const themeCss = readFileSync(THEME_CSS, 'utf8')
const fontsCss = readFileSync(FONTS_CSS, 'utf8')
const escapeRe = (text: string) => text.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')

/** The body of the bare, top-level `[data-<axis>='<id>'] { … }` rule, if any. */
function bareBlock(axis: string, id: string): string | undefined {
  const re = new RegExp(
    `^\\[data-${axis}='${escapeRe(id)}'\\]\\s*\\{([^}]*)\\}`,
    'm',
  )
  return re.exec(themeCss)?.[1]
}

/**
 * The `-source` variable a pairing's headline (serif) role reads: its own
 * `[data-type]` block, or — for the base pairing, which has none — the base
 * declaration every block overrides.
 */
function headlineSourceVar(typeId: string): string {
  const block = bareBlock('type', typeId) ?? themeCss
  const found = /--font-serif-pairing:\s*var\((--font-[a-z-]+-source)/.exec(
    block,
  )
  if (!found) throw new Error(`theme.css: no headline source for ${typeId}`)
  return found[1]!
}

/** The family `app/fonts.css` binds a `-source` variable to, as a typeface. */
function boundFamily(sourceVar: string): string {
  const found = new RegExp(`${escapeRe(sourceVar)}:\\s*'([^']+)'`).exec(
    fontsCss,
  )
  if (!found) throw new Error(`app/fonts.css does not define ${sourceVar}`)
  return typeface(found[1]!)
}

/** The four faces the release added, by pairing, as the requirement names them. */
const NEW_FACES: Record<string, string> = {
  marker: 'Caveat',
  rounded: 'Nunito',
  slab: 'Roboto Slab',
  humanist: 'Fira Sans',
}

/**
 * The palette the stylesheet falls back to: the one registered id the
 * stylesheet carries NO bare root block for, because it IS the Tier-3 base
 * (`theme.css`: "`amethyst` needs no root block — it is the Tier-3 base").
 * Since MOTIR-6471 that is not `DEFAULT_PALETTE_ID` (MOTIR-10834).
 */
function basePaletteId(): string {
  const unblocked = PALETTE_IDS.filter((id) => !bareBlock('palette', id))
  expect(unblocked, 'exactly one palette is the stylesheet base').toHaveLength(
    1,
  )
  return unblocked[0]!
}

// ── The page ──────────────────────────────────────────────────────────────

const html = (page: Page) => page.locator('html')
const headline = (page: Page) =>
  page.getByRole('heading', {
    level: 1,
    name: t('en', 'designShowcase.heading'),
  })
const rail = (page: Page) =>
  page.getByRole('region', { name: t('en', 'designShowcase.heading') })
const axis = (page: Page, name: 'theme' | 'style' | 'palette' | 'type') =>
  page.getByRole('radiogroup', { name: t('en', `designShowcase.${name}.name`) })
const chips = (page: Page, name: 'style' | 'palette' | 'type') =>
  axis(page, name).getByRole('radio')
const reset = (page: Page) =>
  page.getByRole('button', { name: t('en', 'designShowcase.reset') })
const primary = (page: Page) =>
  page
    .getByRole('button', {
      name: t('en', 'designShowcase.specimen.primary'),
      exact: true,
    })
    .first()
const composedCard = (page: Page) =>
  page
    .locator('[data-surface="card"]')
    .filter({ has: primary(page) })
    .last()

/** Every CSS transition finished, then a layout and the font set settled. */
async function settle(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => !(a instanceof CSSTransition) || a.playState !== 'running'),
  )
  await settleFonts(page)
}

async function pick(page: Page, chip: Locator) {
  await chip.scrollIntoViewIfNeeded()
  await chip.click()
  await expect(chip).toHaveAttribute('aria-checked', 'true')
  await settle(page)
}

async function expectSiteLook(page: Page) {
  await expect(html(page)).toHaveAttribute(
    'data-theme',
    SITE_APPEARANCE.pattern,
  )
  await expect(html(page)).toHaveAttribute('data-style', SITE_APPEARANCE.style)
  await expect(html(page)).toHaveAttribute(
    'data-palette',
    SITE_APPEARANCE.palette,
  )
  await expect(html(page)).toHaveAttribute('data-type', SITE_APPEARANCE.type)
  await expect(reset(page)).toHaveCount(0)
}

const SHAPE = [
  'border-top-left-radius',
  'padding-top',
  'padding-left',
  'box-shadow',
  'border-top-width',
  'border-top-style',
  'height',
  'font-family',
  'font-weight',
  'letter-spacing',
]

/** The computed shape of every element under `root` (first 80), as one string. */
const shapeOf = (root: Locator) =>
  root.evaluate((el, props) => {
    const all = [el, ...Array.from(el.querySelectorAll('*'))].slice(0, 80)
    return all
      .map((node) => {
        const cs = getComputedStyle(node)
        return props.map((p) => cs.getPropertyValue(p)).join('|')
      })
      .join('\n')
  }, SHAPE)

/**
 * A token's value as the browser computes it for `property`, so `#5645d4`
 * compares with `rgb(86, 69, 212)` and `0` with `0px`.
 */
const computedAs = (page: Page, property: string, value: string) =>
  page.evaluate(
    ([p, v]) => {
      const probe = document.createElement('span')
      probe.style.setProperty(p!, v!)
      document.body.append(probe)
      const out = getComputedStyle(probe).getPropertyValue(p!)
      probe.remove()
      return out
    },
    [property, value],
  )

const rootToken = (page: Page, name: string) =>
  page.evaluate(
    (n) =>
      getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
    name,
  )

/**
 * The token layer as rendering can see it: every custom property some rule
 * in the page's stylesheets READS through `var()`, resolved on `<html>`. A
 * property no rule reads cannot change a pixel, so it is not compared.
 */
const readTokenLayer = (page: Page) =>
  page.evaluate(() => {
    const read = new Set<string>()
    const visit = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        for (const [, name] of rule.cssText.matchAll(/var\((--[\w-]+)/g))
          read.add(name!)
        if ('cssRules' in rule) visit((rule as CSSGroupingRule).cssRules)
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        visit(sheet.cssRules)
      } catch {
        continue
      }
    }
    const cs = getComputedStyle(document.documentElement)
    return Object.fromEntries(
      [...read].sort().map((n) => [n, cs.getPropertyValue(n).trim()]),
    )
  })

/** The specimen's computed look: headline, the composed card and its controls. */
const SPECIMEN_PROPS = [
  ...SHAPE,
  'color',
  'background-color',
  'border-top-color',
]
const specimenLook = (page: Page) =>
  page.evaluate((props) => {
    const h1 = document.querySelector('h1')!
    const card = Array.from(
      document.querySelectorAll('[data-surface="card"]'),
    ).at(-1)!
    return [h1, card, ...Array.from(card.querySelectorAll('*'))]
      .slice(0, 120)
      .map((node) => {
        const cs = getComputedStyle(node)
        return props.map((p) => cs.getPropertyValue(p)).join('|')
      })
  }, SPECIMEN_PROPS)

async function stamp(page: Page, attr: string, value: string) {
  await page.evaluate(
    ([a, v]) => document.documentElement.setAttribute(a!, v!),
    [attr, value],
  )
  await settle(page)
}

// ── The walk ──────────────────────────────────────────────────────────────

test('/design on the 0.22.0 re-pin, as the release is accepted', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))
  const requested = watchFontRequests(page)
  const noErrors = (where: string) =>
    expect(consoleErrors, `console or page errors at ${where}`).toEqual([])

  startedAt = Date.now()

  // ── 1 · ARRIVAL ────────────────────────────────────────────────────────
  chapter('Open /design signed out: the site look, and no Reset')
  const res = await page.goto(DESIGN)
  expect(res?.status()).toBe(200)
  await expect(headline(page)).toBeVisible()
  await settle(page)
  await expectSiteLook(page)
  await expect(
    axis(page, 'theme').getByRole('radio', {
      name: t('en', 'designShowcase.theme.light'),
    }),
  ).toHaveAttribute('aria-checked', 'true')
  await beat(page, 1800)

  // ── 2 · THE LAYOUT ─────────────────────────────────────────────────────
  chapter('The layout: one rail band, three stacked axes, the specimen below')
  await expect(rail(page)).toHaveCount(1)
  await expect(rail(page).getByRole('radiogroup')).toHaveCount(4)
  await expect(rail(page).locator(axis(page, 'theme'))).toHaveCount(1)
  const [bar, band, themeBox, styleBox, paletteBox, typeBox, h1Box] =
    await Promise.all([
      page.getByRole('banner').first().boundingBox(),
      rail(page).boundingBox(),
      axis(page, 'theme').boundingBox(),
      axis(page, 'style').boundingBox(),
      axis(page, 'palette').boundingBox(),
      axis(page, 'type').boundingBox(),
      headline(page).boundingBox(),
    ])
  // The band sits under the bar; the theme control is in its header row,
  // above three axis fields stacked in one column; the specimen follows it.
  expect(band!.y).toBeGreaterThanOrEqual(bar!.y + bar!.height - 1)
  expect(themeBox!.y).toBeLessThan(styleBox!.y)
  expect(styleBox!.y + styleBox!.height).toBeLessThanOrEqual(paletteBox!.y)
  expect(paletteBox!.y + paletteBox!.height).toBeLessThanOrEqual(typeBox!.y)
  expect(paletteBox!.x).toBe(styleBox!.x)
  expect(typeBox!.x).toBe(styleBox!.x)
  expect(h1Box!.y).toBeGreaterThanOrEqual(band!.y + band!.height)
  // The package's own TokensSpecimen, between the composed UI and the closing.
  const order = await page.evaluate(
    ([label, closing]) => {
      const y = (el: Element | null | undefined) =>
        el ? el.getBoundingClientRect().top + window.scrollY : NaN
      const byText = (text: string) =>
        Array.from(document.querySelectorAll('main *')).find(
          (el) => el.children.length === 0 && el.textContent?.trim() === text,
        )
      const h1s = Array.from(document.querySelectorAll('main h1'))
      return {
        h1s: h1s.length,
        label: y(byText(label!)),
        specimen: y(h1s[1]),
        closing: y(byText(closing!)),
      }
    },
    [
      t('en', 'designShowcase.specimen.sectionLabel'),
      t('en', 'designShowcase.closing'),
    ],
  )
  expect(order.h1s).toBe(2)
  expect(order.specimen).toBeGreaterThan(order.label)
  expect(order.closing).toBeGreaterThan(order.specimen)
  await beat(page)

  // ── 3 · THE CHIP ROWS ──────────────────────────────────────────────────
  chapter(
    'Every chip row is the installed package, labelled from the catalogue',
  )
  const rows = [
    ['style', STYLE_IDS, 'styles'],
    ['palette', PALETTE_IDS, 'palettes'],
    ['type', TYPE_IDS, 'types'],
  ] as const
  for (const [row, ids, group] of rows) {
    await axis(page, row).scrollIntoViewIfNeeded()
    await expect(chips(page, row)).toHaveCount(ids.length)
    await expect(chips(page, row)).toHaveText(
      ids.map((id) => t('en', `designShowcase.${group}.${id}.name`)),
    )
    await beat(page, 800)
  }
  for (const [index, id] of PALETTE_IDS.entries()) {
    await expect(
      chips(page, 'palette').nth(index).locator(`[data-palette="${id}"]`),
      `${id} has its swatch`,
    ).toHaveCount(1)
  }
  noErrors('the chip rows')
  await beat(page)

  // ── 4 · A STYLE PICK RE-SHAPES THE BAR, THE SPECIMEN AND THE FOOTER ────
  chapter('Picking a style re-shapes the specimen, the bar and the footer')
  const barRoot = page.getByRole('banner').first()
  const footerRoot = page.getByRole('contentinfo').first()
  const before = {
    specimen: await shapeOf(composedCard(page)),
    bar: await shapeOf(barRoot),
    footer: await shapeOf(footerRoot),
  }
  const firstOther = STYLE_IDS.findIndex((id) => id !== SITE_APPEARANCE.style)
  await pick(page, chips(page, 'style').nth(firstOther))
  await expect(html(page)).toHaveAttribute('data-style', STYLE_IDS[firstOther]!)
  await expect(reset(page)).toBeVisible()
  expect(await shapeOf(composedCard(page)), 'the specimen').not.toBe(
    before.specimen,
  )
  expect(await shapeOf(barRoot), 'the bar').not.toBe(before.bar)
  expect(await shapeOf(footerRoot), 'the footer').not.toBe(before.footer)
  await footerRoot.scrollIntoViewIfNeeded()
  await beat(page)
  await barRoot.scrollIntoViewIfNeeded()
  await beat(page)

  /** Every style in turn: the attribute, the token, and the specimen follows. */
  async function walkStyles(mode: string, ms: number) {
    const looks = new Set<string>()
    for (const [index, id] of STYLE_IDS.entries()) {
      await pick(page, chips(page, 'style').nth(index))
      await expect(html(page), `${mode}:${id}`).toHaveAttribute(
        'data-style',
        id,
      )
      const radius = await computedAs(
        page,
        'border-radius',
        await rootToken(page, '--radius-btn'),
      )
      await expect(primary(page), `${mode}:${id}`).toHaveCSS(
        'border-radius',
        radius,
      )
      looks.add(await shapeOf(composedCard(page)))
      await beat(page, ms)
    }
    // The nineteen are not one shape under nineteen names.
    expect(looks.size, `${mode}: distinct specimen shapes`).toBeGreaterThan(
      STYLE_IDS.length / 2,
    )
    noErrors(`the ${mode} style walk`)
  }

  chapter('Every style, in light')
  await walkStyles('light', 700)
  // Back on the site's own style, so the pairing walk reads the site's frame.
  await pick(
    page,
    chips(page, 'style').nth(STYLE_IDS.indexOf(SITE_APPEARANCE.style)),
  )

  // ── 5 · EVERY PAIRING, IN ITS NAMED FACE ──────────────────────────────
  chapter('Every pairing draws the headline in the face it binds')
  const facesSeen = new Set<string>()
  for (const [index, id] of TYPE_IDS.entries()) {
    const family = boundFamily(headlineSourceVar(id))
    if (NEW_FACES[id]) expect(family, id).toBe(NEW_FACES[id])
    await axis(page, 'type').scrollIntoViewIfNeeded()
    await pick(page, chips(page, 'type').nth(index))
    await expect(html(page)).toHaveAttribute('data-type', id)
    await headline(page).scrollIntoViewIfNeeded()
    await expect
      .poll(
        async () =>
          typeface(
            firstFamily(
              await headline(page).evaluate(
                (el) => getComputedStyle(el).fontFamily,
              ),
            ),
          ),
        { message: `${id}: the headline's leading family` },
      )
      .toBe(family)
    const loaded = await page.evaluate(
      (name) =>
        Array.from(document.fonts).some(
          (face) =>
            face.family.replace(/["']/g, '').replace(/ Variable$/, '') ===
              name && face.status === 'loaded',
        ),
      family,
    )
    expect(loaded, `${id}: ${family} is a loaded FontFace`).toBe(true)
    expect(
      await fetchedFamilies(page, requested),
      `${id}: a ${family} file was fetched`,
    ).toContain(family)
    facesSeen.add(family)
    await beat(page, 900)
  }
  expect(facesSeen.size, 'one face per pairing').toBe(TYPE_IDS.length)
  noErrors('the pairing walk')

  // ── 6 · EVERY PALETTE, IN LIGHT AND IN DARK ───────────────────────────
  const swatches = () =>
    chips(page, 'palette')
      .locator('[data-palette]')
      .evaluateAll((all) => all.map((s) => getComputedStyle(s).backgroundColor))

  async function walkPalettes(mode: string) {
    const looks = new Set<string>()
    for (const [index, id] of PALETTE_IDS.entries()) {
      const chip = chips(page, 'palette').nth(index)
      await axis(page, 'palette').scrollIntoViewIfNeeded()
      await pick(page, chip)
      await expect(html(page), `${mode}:${id}`).toHaveAttribute(
        'data-palette',
        id,
      )
      const swatch = await chip
        .locator('[data-palette]')
        .evaluate((s) => getComputedStyle(s).backgroundColor)
      const accent = await computedAs(
        page,
        'color',
        await rootToken(page, '--el-accent'),
      )
      expect(accent, `${mode}:${id}: the page's accent is its swatch`).toBe(
        swatch,
      )
      await expect(primary(page), `${mode}:${id}`).toHaveCSS(
        'background-color',
        swatch,
      )
      await expect(headline(page)).toBeVisible()
      looks.add(
        (
          await Promise.all(
            ['--el-accent', '--el-text', '--el-surface', '--el-page-bg'].map(
              (n) => rootToken(page, n),
            ),
          )
        ).join(' '),
      )
      await beat(page, 600)
    }
    expect(looks.size, `${mode}: one colour set per palette`).toBe(
      PALETTE_IDS.length,
    )
    noErrors(`the ${mode} palette walk`)
  }

  chapter('Every palette, in light')
  const lightSwatches = await swatches()
  await walkPalettes('light')

  chapter('Dark on the theme control, and every palette again')
  await axis(page, 'theme').scrollIntoViewIfNeeded()
  await pick(
    page,
    axis(page, 'theme').getByRole('radio', {
      name: t('en', 'designShowcase.theme.dark'),
    }),
  )
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  const darkSwatches = await swatches()
  expect(darkSwatches, 'the swatch row re-reads in dark').not.toEqual(
    lightSwatches,
  )
  await beat(page)
  await walkPalettes('dark')

  chapter('Every style, in dark')
  await walkStyles('dark', 450)

  // ── 7 · AN UNREGISTERED ID ON EACH AXIS ───────────────────────────────
  chapter('An unregistered id on each axis falls back, and nothing breaks')
  await headline(page).scrollIntoViewIfNeeded()
  const fallbacks = [
    ['data-style', DEFAULT_STYLE_ID],
    ['data-palette', basePaletteId()],
    ['data-type', DEFAULT_TYPE_ID],
  ] as const
  for (const [attr, fallback] of fallbacks) {
    await stamp(page, attr, fallback)
    const tokens = await readTokenLayer(page)
    const look = await specimenLook(page)
    await stamp(page, attr, 'not-a-registered-id')
    expect(await readTokenLayer(page), `${attr}: the token layer`).toEqual(
      tokens,
    )
    expect(await specimenLook(page), `${attr}: the specimen`).toEqual(look)
    await expect(headline(page)).toBeVisible()
    await expect(composedCard(page)).toBeVisible()
    // Nothing re-stamped the attribute underneath the assertion.
    await expect(html(page)).toHaveAttribute(attr, 'not-a-registered-id')
    noErrors(`an unregistered ${attr}`)
    await beat(page)
  }

  // ── 8 · RESET ─────────────────────────────────────────────────────────
  chapter('Reset returns the site look and hides itself')
  await rail(page).scrollIntoViewIfNeeded()
  await expect(reset(page)).toBeVisible()
  await beat(page, 800)
  await reset(page).click()
  await settle(page)
  await expectSiteLook(page)
  await expect(
    axis(page, 'theme').getByRole('radio', {
      name: t('en', 'designShowcase.theme.light'),
    }),
  ).toHaveAttribute('aria-checked', 'true')
  noErrors('the whole walk')
  await beat(page, 1800)
})
