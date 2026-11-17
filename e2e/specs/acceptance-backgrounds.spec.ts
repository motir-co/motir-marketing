import { writeFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  BACKGROUND_IDS,
  BACKGROUND_REGISTRY,
  PALETTE_IDS,
} from '@motir/design-system'
import { SITE_APPEARANCE } from '../../lib/siteDefaults'
import { t } from '../support/catalogue'

/*
 * ⚠️ THE ACCEPTANCE WALK FOR STORY MOTIR-11600 — BACKGROUNDS IN
 * @motir/design-system (MOTIR-11614). motir.co `/design`, signed out, in a real
 * browser: the Background row (MOTIR-11610) draws each of the seven
 * backgrounds behind the page's own hero, a style switch redraws the Wave but
 * leaves a style-fixed background (Cyclic CA) pixel for pixel the same, a
 * palette and a mode switch recolour the canvas without a reload, None draws
 * nothing, and the landing hero draws the package Wave around the idea box.
 *
 * PACED FOR A PERSON TO WATCH — every `beat()` is pacing, never a wait for
 * state; every assertion waits on its own signal (an attribute, a canvas
 * signature that settled). Each `chapter()` is one user-visible phase.
 *
 * ⚠️ HOW A FRAME IS COMPARED. The canvas animates, so two reads of a moving
 * background differ whatever the page did. Every comparison is therefore made
 * under `prefers-reduced-motion: reduce`, where the package's runtime draws ONE
 * still frame (t = 0) and redraws it only when the host, its theme attributes
 * or its size change. The runtime reads the preference when a background
 * STARTS, so the walk switches the preference first and then picks a
 * background, which restarts the canvas.
 *
 * ⚠️ NOTHING HERE IS TYPED THAT THE SITE ALREADY KNOWS: the seven backgrounds
 * and their order are `BACKGROUND_IDS`, which ones follow the style is the
 * registry's `followsStyle`, and every label is `messages/en.json`.
 */

test.setTimeout(300_000)

const DESIGN = '/design'
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

// ── The page ──────────────────────────────────────────────────────────────

const html = (page: Page) => page.locator('html')
const headline = (page: Page) =>
  page.getByRole('heading', {
    level: 1,
    name: t('en', 'designShowcase.heading'),
  })
const axis = (
  page: Page,
  name: 'theme' | 'style' | 'palette' | 'type' | 'background',
) =>
  page.getByRole('radiogroup', { name: t('en', `designShowcase.${name}.name`) })
const backgroundChip = (page: Page, id: string) =>
  axis(page, 'background').getByRole('radio', {
    name:
      id === 'none'
        ? t('en', 'designShowcase.background.none')
        : t('en', `designShowcase.backgrounds.${id}.name`),
    exact: true,
  })
const styleChip = (page: Page, id: string) =>
  axis(page, 'style').getByRole('radio', {
    name: t('en', `designShowcase.styles.${id}.name`),
    exact: true,
  })
/** The Background row's note says `text`. */
const expectNote = (page: Page, text: string) =>
  expect(
    page
      .getByRole('region', { name: t('en', 'designShowcase.heading') })
      .getByText(text, { exact: false }),
  ).toBeVisible()

/** The showcase hero's canvas — the chips' swatches carry no focus id. */
const heroCanvas = (page: Page) =>
  page.locator('canvas[data-background-focus="design-hero"]')
const heroBox = (page: Page) => page.locator('#design-hero')

/** Every CSS transition finished. */
async function settle(page: Page) {
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((a) => !(a instanceof CSSTransition) || a.playState !== 'running'),
  )
}

async function pick(page: Page, chip: Locator) {
  await chip.scrollIntoViewIfNeeded()
  await chip.click()
  await expect(chip).toHaveAttribute('aria-checked', 'true')
  await settle(page)
}

/**
 * What a canvas shows, read from its pixels on a 48×48 sample grid: how many
 * distinct colours it holds (a blank or flat canvas holds one) and a hash of
 * the whole sample, which two identical frames share.
 */
const readCanvas = (canvas: Locator) =>
  canvas.evaluate((el) => {
    const c = el as HTMLCanvasElement
    const ctx = c.getContext('2d')
    if (!ctx || c.width === 0 || c.height === 0)
      return { colours: 0, hash: '', size: '0x0' }
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    const colours = new Set<number>()
    let hash = 2166136261
    const N = 48
    for (let gy = 0; gy < N; gy++) {
      for (let gx = 0; gx < N; gx++) {
        const x = Math.floor(((gx + 0.5) * c.width) / N)
        const y = Math.floor(((gy + 0.5) * c.height) / N)
        const i = (y * c.width + x) * 4
        const px =
          (data[i]! << 24) |
          (data[i + 1]! << 16) |
          (data[i + 2]! << 8) |
          data[i + 3]!
        colours.add(px)
        hash = Math.imul(hash ^ px, 16777619) >>> 0
      }
    }
    return {
      colours: colours.size,
      hash: hash.toString(16),
      size: `${c.width}x${c.height}`,
    }
  })

/** The canvas draws: more than a handful of colours across the sample. */
async function expectDrawn(canvas: Locator, what: string) {
  await expect(canvas, what).toHaveCount(1)
  await expect
    .poll(async () => (await readCanvas(canvas)).colours, {
      message: `${what}: the canvas draws non-blank pixels`,
    })
    .toBeGreaterThan(4)
}

/** The frame, once two reads 400ms apart agree (a still frame has redrawn). */
async function stillFrame(page: Page): Promise<string> {
  // The runtime draws only while its host is on screen (a refresh off screen
  // re-measures and leaves the canvas clear until it is seen again).
  await heroBox(page).scrollIntoViewIfNeeded()
  let previous = ''
  let current = ''
  await expect
    .poll(
      async () => {
        previous = current
        await page.waitForTimeout(400)
        const read = await readCanvas(heroCanvas(page))
        current = `${read.size}:${read.hash}`
        return current === previous && read.colours > 4
      },
      { message: 'the still frame settles', timeout: 15_000 },
    )
    .toBe(true)
  return current
}

/*
 * Pin the hero's box for a style comparison. A style re-sets the headline's
 * face, size and the box's padding, so the hero is a different height under
 * Neo-Brutalism than under Warm Editorial (240 against 214 CSS px at 1280
 * wide), and a background drawn into a different box is a different picture
 * whatever it does with the style. Holding the box still isolates the one
 * thing the comparison is about: whether the background itself follows the
 * style. Released before None.
 */
const pinHeroBox = (page: Page, pinned: boolean) =>
  heroBox(page).evaluate((el, on) => {
    const box = el as HTMLElement
    box.style.height = on ? '260px' : ''
    box.style.overflow = on ? 'hidden' : ''
  }, pinned)

// ── The walk ──────────────────────────────────────────────────────────────

test('backgrounds on motir.co: the /design picker and the landing hero', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(err.message))
  const noErrors = (where: string) =>
    expect(consoleErrors, `console or page errors at ${where}`).toEqual([])

  startedAt = Date.now()

  // ── 1 · ARRIVAL ────────────────────────────────────────────────────────
  chapter('Open /design: the Background row, the Wave behind the hero')
  const res = await page.goto(DESIGN)
  expect(res?.status()).toBe(200)
  await expect(headline(page)).toBeVisible()
  await page.evaluate(() => {
    ;(window as unknown as { __sameDocument: boolean }).__sameDocument = true
  })
  await expect(html(page)).toHaveAttribute('data-style', SITE_APPEARANCE.style)
  // Seven backgrounds in registry order, then None.
  await expect(axis(page, 'background').getByRole('radio')).toHaveText([
    ...BACKGROUND_IDS.map((id) =>
      t('en', `designShowcase.backgrounds.${id}.name`),
    ),
    t('en', 'designShowcase.background.none'),
  ])
  await expect(backgroundChip(page, 'wave')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(heroCanvas(page)).toHaveAttribute('data-background', 'wave')
  await expectDrawn(heroCanvas(page), 'the default Wave')
  await heroBox(page).scrollIntoViewIfNeeded()
  await beat(page, 2000)

  // ── 2 · EVERY BACKGROUND ───────────────────────────────────────────────
  chapter('Pick each of the seven backgrounds: the hero draws it')
  for (const id of BACKGROUND_IDS) {
    await pick(page, backgroundChip(page, id))
    await expect(heroCanvas(page)).toHaveAttribute('data-background', id)
    await expectDrawn(heroCanvas(page), id)
    // Its name and tagline lead the note under the row.
    await expectNote(page, t('en', `designShowcase.backgrounds.${id}.tagline`))
    await heroBox(page).scrollIntoViewIfNeeded()
    await beat(page, 2200)
  }
  noErrors('the seven backgrounds')

  // ── 3 · THE WAVE FOLLOWS THE STYLE ─────────────────────────────────────
  chapter('Wave, Warm Editorial → Neo-Brutalism: the frame is redrawn')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await pinHeroBox(page, true)
  await pick(page, styleChip(page, 'warm-editorial'))
  await pick(page, backgroundChip(page, 'wave'))
  expect(BACKGROUND_REGISTRY.wave.followsStyle).toBe(true)
  await expectNote(
    page,
    t('en', 'designShowcase.background.followsNote').replace(
      '{style}',
      t('en', 'designShowcase.styles.warm-editorial.name'),
    ),
  )
  const waveEditorial = await stillFrame(page)
  await heroBox(page).scrollIntoViewIfNeeded()
  await beat(page, 1500)
  await pick(page, styleChip(page, 'neo-brutalism'))
  await expect(html(page)).toHaveAttribute('data-style', 'neo-brutalism')
  const waveBrutal = await stillFrame(page)
  expect(waveBrutal, 'the Wave redraws for Neo-Brutalism').not.toBe(
    waveEditorial,
  )
  await heroBox(page).scrollIntoViewIfNeeded()
  await beat(page, 1800)

  // ── 4 · A STYLE-FIXED BACKGROUND DOES NOT ──────────────────────────────
  chapter('Cyclic CA: "same in every style", and the frame is identical')
  expect(BACKGROUND_REGISTRY.cyclic.followsStyle).toBe(false)
  await pick(page, backgroundChip(page, 'cyclic'))
  await expectNote(page, t('en', 'designShowcase.background.fixedNote'))
  const cyclicBrutal = await stillFrame(page)
  await heroBox(page).scrollIntoViewIfNeeded()
  await beat(page, 1500)
  await pick(page, styleChip(page, 'warm-editorial'))
  await expect(html(page)).toHaveAttribute('data-style', 'warm-editorial')
  const cyclicEditorial = await stillFrame(page)
  expect(cyclicEditorial, 'Cyclic CA is the same in every style').toBe(
    cyclicBrutal,
  )
  await heroBox(page).scrollIntoViewIfNeeded()
  await beat(page, 1800)
  noErrors('the style switches')

  // ── 5 · PALETTE AND MODE RECOLOUR IT, WITHOUT A RELOAD ─────────────────
  chapter('A palette switch and a mode switch recolour the canvas')
  const currentPalette = await html(page).getAttribute('data-palette')
  const otherPalette = PALETTE_IDS.find((id) => id !== currentPalette)!
  await pick(
    page,
    axis(page, 'palette').getByRole('radio', {
      name: t('en', `designShowcase.palettes.${otherPalette}.name`),
      exact: true,
    }),
  )
  await expect(html(page)).toHaveAttribute('data-palette', otherPalette)
  const recoloured = await stillFrame(page)
  expect(recoloured, 'the palette recolours the canvas').not.toBe(
    cyclicEditorial,
  )
  await heroBox(page).scrollIntoViewIfNeeded()
  await beat(page, 1800)
  await pick(
    page,
    axis(page, 'theme').getByRole('radio', {
      name: t('en', 'designShowcase.theme.dark'),
    }),
  )
  await expect(html(page)).toHaveAttribute('data-theme', 'dark')
  const dark = await stillFrame(page)
  expect(dark, 'dark mode recolours the canvas').not.toBe(recoloured)
  expect(
    await page.evaluate(
      () => (window as unknown as { __sameDocument?: boolean }).__sameDocument,
    ),
    'no reload happened',
  ).toBe(true)
  await heroBox(page).scrollIntoViewIfNeeded()
  await beat(page, 2000)
  noErrors('the palette and mode switches')

  // ── 6 · NONE ───────────────────────────────────────────────────────────
  chapter('None: no background canvas is drawn')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await pinHeroBox(page, false)
  await pick(page, backgroundChip(page, 'none'))
  await expect(heroCanvas(page)).toHaveCount(0)
  await expectNote(page, t('en', 'designShowcase.background.noneNote'))
  await heroBox(page).scrollIntoViewIfNeeded()
  await beat(page, 2000)

  // ── 7 · THE LANDING HERO ───────────────────────────────────────────────
  chapter('The landing page: the package Wave gathers around the idea box')
  await page.goto('/')
  const brief = page.locator('#hero-brief')
  await expect(brief).toBeVisible()
  const landingWave = page.locator(
    'canvas[data-background="wave"][data-background-focus="hero-brief"]',
  )
  await expectDrawn(landingWave, 'the landing Wave')
  // The canvas sits behind the hero and around the box it gathers to.
  const [canvasBox, briefBox] = await Promise.all([
    landingWave.boundingBox(),
    brief.boundingBox(),
  ])
  expect(canvasBox!.width).toBeGreaterThan(briefBox!.width)
  expect(briefBox!.x).toBeGreaterThanOrEqual(canvasBox!.x)
  expect(briefBox!.y).toBeGreaterThanOrEqual(canvasBox!.y)
  await beat(page, 3000)
  noErrors('the whole walk')
})
