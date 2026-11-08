import { expect, test } from '@playwright/test'

/*
 * THE DOCS RAIL'S BOX, MEASURED (MOTIR-4432).
 *
 * ⚠️ WHY THIS IS IN THE BROWSER LANE AND NOT BESIDE `tests/docs/docsRail.test.tsx`.
 * That file covers the rail thoroughly — the tiers, the filter, the count line,
 * `aria-current`, the narrow disclosure — and it could not have caught the
 * defect this spec exists for, because jsdom computes no layout: every
 * `getBoundingClientRect()` there is zeroes, so a height comparison reads
 * `0 === 0` and passes on any markup at all. The only assertion available in
 * that lane is a class-name one, and a class-name assertion for an ABSENT class
 * (`items-start`) passes on markup that never had it — it agrees with the fix
 * and with a rail deleted outright. So the guard has to run somewhere boxes
 * exist, which is here.
 *
 * ⚠️ WHAT IT GUARDS, AND WHY IT TAKES TWO ASSERTIONS RATHER THAN ONE.
 * The rail has two jobs that cannot live on one element, and each one-element
 * arrangement breaks the other:
 *
 *   - `align-items: start` on the shell's grid shrinks the rail to its own rows,
 *     which is what makes `position: sticky` engage — and it ends the tint and
 *     the right border where the rows end. Shipped state before this card: 283px
 *     of rail against a 931px reading column on `/docs`, and 900px against
 *     86400px on `/docs/api`.
 *   - Deleting `align-items: start` and leaving the sticky where it was gives a
 *     full-height rail whose sticky never engages — measured at `top: -260` after
 *     a 600px scroll. The rail scrolls away, which is the defect the class was
 *     added to prevent.
 *
 * A spec that asserted only the first would go green on the second arrangement,
 * which is the cheapest wrong fix available and the one a reader reaches for.
 * Both are asserted for that reason.
 *
 * `/docs` is the page under test because it is the cheapest instance the defect
 * appears on: no operation tier, no upstream fetch (the guides route group
 * performs none — `app/[locale]/docs/(guides)/layout.tsx`), and a reading column three
 * times the rail's own height.
 */

/** The card's own measurement viewport, and comfortably above the `md` breakpoint. */
const WIDE = { width: 1440, height: 900 }
/** Below `md` (768px) — the layout the rail collapses into. */
const NARROW = { width: 390, height: 844 }

/**
 * The three boxes this file is about, read in one pass.
 *
 * The walk is structural because the thing under test is structural: two grid
 * items and the sticky region inside one of them. Only the rail has an
 * accessible name, so the other two are reached from it — and the walk asserts
 * what it found rather than trusting it, so a future re-shuffle of the shell
 * fails loudly here instead of quietly measuring the wrong element.
 */
async function measure(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const rail = document.querySelector<HTMLElement>(
      'nav[aria-label="Documentation"]',
    )
    if (!rail) throw new Error('no rail: nav[aria-label="Documentation"]')

    // The rail is an island, and its `<motir-island>` wrapper is
    // `display: contents` (MOTIR-10649): it draws no box, so the grid item
    // is the rail itself and the grid is the first ancestor that draws one.
    let shell = rail.parentElement
    while (shell && getComputedStyle(shell).display === 'contents')
      shell = shell.parentElement
    if (!shell || !getComputedStyle(shell).display.includes('grid')) {
      throw new Error("the rail's parent is not the docs grid")
    }

    const column = shell.lastElementChild
    if (!column || column === rail) {
      throw new Error('the docs grid has no reading column beside the rail')
    }

    const inner = rail.firstElementChild
    if (!inner) throw new Error('the rail has no inner region')

    const box = (el: Element) => {
      const r = el.getBoundingClientRect()
      return { top: r.top, height: r.height, width: r.width, bottom: r.bottom }
    }
    return {
      rail: box(rail),
      column: box(column),
      inner: box(inner),
      alignItems: getComputedStyle(shell).alignItems,
    }
  })
}

test.describe('the docs rail at the wide layout', () => {
  test.use({ viewport: WIDE })

  test("the rail's surface spans the reading column", async ({ page }) => {
    const response = await page.goto('/docs')
    expect(response?.status(), '/docs did not serve a document').toBe(200)
    await expect(
      page.getByRole('navigation', { name: 'Documentation' }),
    ).toBeVisible()

    const { rail, column, inner } = await measure(page)

    /*
     * ⚠️ THE PREMISE IS ASSERTED FIRST, because the equality below is VACUOUS on
     * a page whose content happens to be shorter than the rail's own rows — and
     * two of the eight `/docs` routes are exactly that. If `/docs` ever becomes
     * one of them, this line goes red and says so, rather than leaving a test
     * that passes without measuring anything. 200px is a floor, not the observed
     * gap (648px at the time of writing).
     */
    expect(
      column.height - inner.height,
      "the reading column is no longer meaningfully taller than the rail's own rows, so this spec would pass without testing anything",
    ).toBeGreaterThan(200)

    // The defect itself: the painted surface is the height of the row it sits
    // in, not the height of the links inside it.
    expect(Math.abs(rail.height - column.height)).toBeLessThanOrEqual(1)
  })

  test('the rail still sticks, and its own region is capped at the viewport', async ({
    page,
  }) => {
    await page.goto('/docs')
    await expect(
      page.getByRole('navigation', { name: 'Documentation' }),
    ).toBeVisible()

    const atRest = await measure(page)
    expect(
      atRest.inner.height,
      'the rail region is not capped at the viewport, so a long operation list would push the page',
    ).toBeLessThanOrEqual(WIDE.height + 1)

    /*
     * ⚠️ SCROLL TO THE PAGE'S OWN BOTTOM, NOT TO A NUMBER. `/docs` is 1248px at
     * this viewport, so `scrollTo(0, 600)` clamps at 348 and a wait for
     * `scrollY === 600` never returns — a green assertion turned into a 30s
     * timeout by a constant that was never about this page. The premise the
     * test actually needs is that the rail's own top has left the viewport, and
     * that is asserted rather than assumed.
     */
    const scrollY = await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight)
      return window.scrollY
    })
    expect(
      scrollY,
      "the page cannot scroll past the rail's top, so the sticky assertion below would hold on a static rail too",
    ).toBeGreaterThan(atRest.rail.top + 50)
    await page.waitForFunction((y) => window.scrollY === y, scrollY)

    const scrolled = await measure(page)

    // The surface scrolls with the page — it is the full-height grid item.
    expect(scrolled.rail.top).toBeLessThan(0)
    // The region inside it does not: it pins to the top of the viewport. This is
    // the assertion that fails on a rail made full-height by deleting
    // `items-start` and leaving `position: sticky` on the surface.
    expect(Math.abs(scrolled.inner.top)).toBeLessThanOrEqual(1)
  })
})

test.describe('the docs rail below the breakpoint', () => {
  test.use({ viewport: NARROW })

  test('the rail sits above the content and scrolls with the page', async ({
    page,
  }) => {
    await page.goto('/docs')
    await expect(
      page.getByRole('navigation', { name: 'Documentation' }),
    ).toBeVisible()

    const { rail, column, inner } = await measure(page)

    // One column: the rail is above the content it navigates, never beside or
    // over it (the asset's panel 7).
    expect(rail.bottom).toBeLessThanOrEqual(column.top + 1)
    expect(Math.abs(rail.width - column.width)).toBeLessThanOrEqual(1)

    // And nothing sticks here — the rail is static, so scrolling takes it with
    // the page rather than parking it over the content.
    await page.evaluate(() => window.scrollTo(0, 400))
    await page.waitForFunction(() => window.scrollY === 400)
    const scrolled = await measure(page)
    expect(scrolled.inner.top).toBeLessThan(inner.top)
  })
})

/*
 * ══════════════════════════════════════════════════════════════════════════
 * THE SHORT PAGE (MOTIR-4465) — the case the block above is STRUCTURALLY
 * unable to reach, and it is not an oversight to widen it into: it is a
 * SECOND defect that the first one's instrument could not see.
 *
 * `MOTIR-4432` measured the rail against the READING COLUMN, and both tests
 * above are that measurement. On `/docs/mcp` the rail equals its column
 * exactly — 359px against 359px — so the card recorded the defect as
 * "invisible there" and the premise assertion in the first test
 * (`column.height - inner.height > 200`) excludes the route by construction.
 * What neither measurement asks is whether the rail reaches the FOOTER, and
 * on a page shorter than the viewport it does not: the docs grid takes its
 * height from its content while the `main` landmark around it stretches, so
 * the tint ends 224px above the footer and the sidebar reads as a stub.
 *
 * Hence a different pair of boxes — the rail and the FOOTER — and a premise
 * that pins the case rather than excluding it: the page must not scroll.
 * ══════════════════════════════════════════════════════════════════════════
 */

/**
 * The `/docs` route whose whole page fits inside {@link SHORT_VIEWPORT}.
 *
 * ⚠️ RE-POINTED BY MOTIR-4429, EXACTLY AS THE NOTE BELOW ANTICIPATED — and the
 * viewport moved with it, which the note did not anticipate and which is the
 * part worth reading.
 *
 * ~~The one `/docs` route whose whole page is shorter than a 1440×900 viewport.
 * It is SHORT because its content is thin, which is a property of the page and
 * not of the shell — `MOTIR-4429` restores this page's client-wiring guide, and
 * on the day that lands this route stops being the instance. The premise
 * assertion below is what makes that a RED test rather than a silent pass: a
 * route that no longer satisfies "the page does not scroll" fails here and says
 * so, and the fix is to point this constant at whichever route is then the
 * short one — never to delete the case.~~
 *
 * That day is this one. `/docs/mcp` went from 359px of grid to a full wiring
 * guide, and the premise assertion did what it was written to do. **What the
 * note assumed was that some other route would be short at 900, and after
 * MOTIR-4429 none is** — measured at 1440×900 on that branch: `/docs` 1248,
 * `/docs/api/stability` 1849, `/docs/public-address` 3255, and every other
 * route further away.
 *
 * So the case is kept by moving the OTHER term. "Shorter than the viewport" is
 * a relation between a page and a window, and the window is a test parameter
 * while the page is the product — {@link SHORT_VIEWPORT} is tall enough that
 * the shortest route is genuinely short in it, and the premise below still
 * asserts that rather than assuming it. Deleting the case was never an option:
 * it is the only thing standing between the shipped layout and MOTIR-4465's
 * defect, a rail that stops 224px above the footer on a page the viewport does
 * not fill.
 */
const SHORT_ROUTE = '/docs'

/**
 * The window {@link SHORT_ROUTE} is short IN. Deliberately taller than
 * {@link WIDE}: after MOTIR-4429 no documentation route fits in 900px, and a
 * case about a page that does not fill its window needs a window the page does
 * not fill. The width is `WIDE`'s, because the breakpoint behaviour under test
 * is the same one.
 *
 * Raised from 1800 to 2200 by MOTIR-6717: `/docs/skills` added a section to the
 * index, which measured 1923px at this width in CI, and the premise below went
 * red exactly as it was written to. Raised by ~280px of headroom, about two more
 * index sections, rather than to the new height, so the next surface does not
 * trip it on arrival.
 *
 * Raised from 2200 to 2900 by the 2026-10 redesign: the index gained the
 * Claude Code plugin and connector guides and the "Set up Motir in your
 * agent" card, about 560px together. The same headroom kept again.
 */
const SHORT_VIEWPORT = { width: WIDE.width, height: 2900 }

/**
 * The rail against the chrome around it: the landmark it should fill, and the
 * footer that should meet it.
 */
async function measureAgainstChrome(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const rail = document.querySelector<HTMLElement>(
      'nav[aria-label="Documentation"]',
    )
    if (!rail) throw new Error('no rail: nav[aria-label="Documentation"]')

    const main = document.getElementById('main')
    if (!main) throw new Error('no main landmark: #main')
    if (!main.contains(rail))
      throw new Error('the rail is not inside the landmark')

    const footer = document.querySelector('footer')
    if (!footer)
      throw new Error('no footer: the page did not render the chrome')

    const box = (el: Element) => {
      const r = el.getBoundingClientRect()
      return { top: r.top, height: r.height, width: r.width, bottom: r.bottom }
    }
    return {
      rail: box(rail),
      main: box(main),
      footer: box(footer),
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    }
  })
}

test.describe('the docs rail on a page shorter than the viewport', () => {
  test.use({ viewport: SHORT_VIEWPORT })

  test("the rail's surface reaches the footer", async ({ page }) => {
    const response = await page.goto(SHORT_ROUTE)
    expect(response?.status(), `${SHORT_ROUTE} did not serve a document`).toBe(
      200,
    )
    await expect(
      page.getByRole('navigation', { name: 'Documentation' }),
    ).toBeVisible()

    const { rail, main, footer, documentHeight, viewportHeight } =
      await measureAgainstChrome(page)

    /*
     * ⚠️ THE PREMISE IS ASSERTED FIRST, and here it is the whole point of the
     * case rather than a guard on a vacuous one: this test is about a page the
     * viewport does not fill. If `${SHORT_ROUTE}` grows past the fold, the
     * assertion below stops being about anything and this line says so.
     */
    expect(
      documentHeight,
      `${SHORT_ROUTE} scrolls at ${SHORT_VIEWPORT.height}px, so it is no longer the short-page case this test exists for — point SHORT_ROUTE at a route that is short in this window, or raise SHORT_VIEWPORT until the shortest route is. Never delete the case: it is the only guard on MOTIR-4465.`,
    ).toBeLessThanOrEqual(viewportHeight + 1)

    // The defect: the painted surface is the height of its CONTENT, so it ends
    // above the footer with the page background showing under it — 224px of it
    // on `/docs/mcp` before this was fixed.
    expect(
      footer.top - rail.bottom,
      'the rail stops above the footer: the docs row does not fill the landmark',
    ).toBeLessThanOrEqual(1)

    // Stated as the mechanism as well as the symptom, so a fix that reaches the
    // footer by growing the FOOTER (or by padding the rail) does not pass.
    expect(Math.abs(rail.height - main.height)).toBeLessThanOrEqual(1)
  })
})

test.describe('the short page below the breakpoint', () => {
  test.use({ viewport: NARROW })

  test('nothing full-height leaks below the breakpoint', async ({ page }) => {
    await page.goto(SHORT_ROUTE)
    await expect(
      page.getByRole('navigation', { name: 'Documentation' }),
    ).toBeVisible()

    const { rail, column } = await measure(page)

    // The rail is still a band ABOVE the content, not a column filling the
    // viewport: whatever makes it full-height at `md` is gated on `md`.
    expect(rail.bottom).toBeLessThanOrEqual(column.top + 1)
    expect(Math.abs(rail.width - column.width)).toBeLessThanOrEqual(1)
  })
})
