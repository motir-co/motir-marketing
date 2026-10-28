import { writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { CUSTOM_ORIGIN, SITE_ORIGIN, STUB_ORIGIN } from '../stub/origin'

/*
 * ⚠️ THE ACCEPTANCE WALK FOR STORY MOTIR-6171 (MOTIR-6749) — motir.co's read
 * pages moved into the app. A reader on the project page reads what watching
 * live costs BEFORE the click, follows a tab and an old board link into the
 * app, sees the same on a customer-owned address, then requests a feature and
 * reaches a request's upvote and comment hand-offs — with no request board
 * anywhere. PACED FOR A PERSON TO WATCH.
 *
 * The first test is the RECEIPT: its recording is published onto the story and
 * a reviewer accepts on it, so it is deliberately slowed between steps. Every
 * `beat()` is PACING, not a wait for state; every assertion still waits on an
 * authoritative signal (a URL, a response, a role).
 *
 * ⚠️ THE LANE STUBS THE APP. `STUB_ORIGIN` is this build's `APP_ORIGIN`, and it
 * answers any `/p/*` with a one-line stand-in page (`e2e/stub/publicApiStub.ts`)
 * so the recording shows where the reader landed. The spec asserts the URL and
 * STOPS there: sign-in, consent and the Visitor's views are another application,
 * walked by motir-core's MOTIR-6651.
 */

test.setTimeout(180_000)

/** Pacing for the recording — "look at the address" beats, as MOTIR-4226's. */
const beat = (page: Page, ms = 1600) => page.waitForTimeout(ms)

const chapters: { label: string; tSeconds: number }[] = []
let startedAt = Date.now()
const chapter = (label: string) => {
  chapters.push({ label, tSeconds: (Date.now() - startedAt) / 1000 })
}

test.afterEach(({}, testInfo) => {
  if (chapters.length) {
    writeFileSync(
      testInfo.outputPath('chapters.json'),
      JSON.stringify(chapters, null, 2),
    )
  }
})

const APP = STUB_ORIGIN
const READ_PATH = /\/(board|items|tree|roadmap)(\/|\?|$)/

/**
 * Every href on the page that names a read path on THIS host — which would 308
 * off it. App links (absolute on the app origin) are the point, so they pass.
 */
async function sameHostReadLinks(page: Page): Promise<string[]> {
  const here = new URL(page.url()).origin
  const hrefs = await page
    .locator('a[href]')
    .evaluateAll((links) => links.map((l) => l.getAttribute('href')!))
  return hrefs.filter((href) => {
    const url = new URL(href, here)
    return url.origin === here && READ_PATH.test(url.pathname)
  })
}

async function expectWatchSentence(page: Page) {
  const watch = page.getByRole('region', { name: /being built/ })
  await expect(watch).toContainText('You’ll need a Motir account.')
  await expect(watch).toContainText('name and email')
  await expect(watch).toContainText('this project’s workspace Managers')
  return watch
}

test('the read pages move into the app, as MOTIR-6171 asks to be accepted', async ({
  page,
}) => {
  startedAt = Date.now()

  // ── 1 · THE PROJECT PAGE, SIGNED OUT, ON motir.co ────────────────────────
  chapter('The project page on motir.co — signed out')
  await page.goto(`${SITE_ORIGIN}/p/MOTIR`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /^Follow/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Subscribe' })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Request a feature' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Atom feed/ })).toBeVisible()
  await beat(page)

  chapter('Watching live states its cost before the click')
  const watch = await expectWatchSentence(page)
  await watch.scrollIntoViewIfNeeded()
  await beat(page, 3200)

  chapter('The tabs: two on this site, four in the app')
  const nav = page.getByRole('navigation', { name: 'Project' })
  await expect(nav.getByRole('link', { name: 'Overview' })).toHaveAttribute(
    'href',
    '/p/MOTIR',
  )
  await expect(nav.getByRole('link', { name: 'Changelog' })).toHaveAttribute(
    'href',
    '/p/MOTIR/changelog',
  )
  for (const view of ['board', 'items', 'tree', 'roadmap']) {
    await expect(
      nav.getByRole('link', { name: new RegExp(`^${view}`, 'i') }),
    ).toHaveAttribute('href', `${APP}/p/MOTIR/${view}`)
  }
  await expect(nav).toContainText('In the app')
  expect(await sameHostReadLinks(page)).toEqual([])
  await nav.hover()
  await beat(page)

  // ── 2 · A TAB LEAVES THE SITE ────────────────────────────────────────────
  chapter('Board opens in the app')
  await nav.getByRole('link', { name: /^Board/ }).click()
  await page.waitForURL(`${APP}/p/MOTIR/board`)
  await beat(page, 2400)

  chapter('Watch live lands on the same view')
  await page.goto(`${SITE_ORIGIN}/p/MOTIR`)
  await page.getByRole('link', { name: /Watch live/ }).click()
  await page.waitForURL(`${APP}/p/MOTIR/board`)
  await beat(page, 2000)

  chapter('An old motir.co board link redirects into the app')
  const old = await page.goto(`${SITE_ORIGIN}/p/MOTIR/board`)
  await page.waitForURL(`${APP}/p/MOTIR/board`)
  // The browser followed a 308: the chain's first hop is motir.co's.
  expect(old?.request().redirectedFrom()?.url()).toBe(
    `${SITE_ORIGIN}/p/MOTIR/board`,
  )
  await beat(page, 2000)

  // ── 5 · THE REQUEST JOURNEY, WITH NO BOARD ANYWHERE ──────────────────────
  chapter('Request a feature — the doorway')
  await page.goto(`${SITE_ORIGIN}/p/MOTIR`)
  await page.getByRole('link', { name: 'Request a feature' }).click()
  await page.waitForURL(`${SITE_ORIGIN}/p/MOTIR/requests/new`)
  await expect(page.getByText('You will sign in first')).toBeVisible()
  const main = page.getByRole('main')
  await expect(main.getByRole('link', { name: /^← / })).toHaveAttribute(
    'href',
    '/p/MOTIR',
  )
  const handoff = await page
    .getByRole('link', { name: /Continue to Motir/ })
    .getAttribute('href')
  expect(handoff).toContain('/act?')
  expect(handoff).toContain('intent=request')
  expect(new URL(new URL(handoff!).searchParams.get('return')!).pathname).toBe(
    '/p/MOTIR',
  )
  expect(await sameHostReadLinks(page)).toEqual([])
  await beat(page, 2400)

  chapter('A request page — upvote and comment are hand-offs')
  await page.goto(`${SITE_ORIGIN}/p/MOTIR/requests/MOTIR-4051`)
  await expect(
    page.getByRole('heading', { name: 'Gantt view for the roadmap' }),
  ).toBeVisible()
  for (const [name, intent] of [
    [/^Upvote/, 'upvote'],
    [/^Add a comment/, 'comment'],
  ] as const) {
    const href = await page.getByRole('link', { name }).getAttribute('href')
    expect(href).toContain(`intent=${intent}`)
    const back = new URL(new URL(href!).searchParams.get('return')!)
    expect(READ_PATH.test(back.pathname), href!).toBe(false)
  }
  await expect(
    page.getByRole('main').getByRole('link', { name: /^← / }),
  ).toHaveAttribute('href', '/p/MOTIR')
  expect(await sameHostReadLinks(page)).toEqual([])
  await page.getByRole('link', { name: /^Upvote/ }).hover()
  await beat(page, 2400)

  chapter('Back to the project')
  await page.getByRole('main').getByRole('link', { name: /^← / }).click()
  await page.waitForURL(`${SITE_ORIGIN}/p/MOTIR`)
  await expectWatchSentence(page)
  await beat(page, 2000)
})

/* ── the cases the receipt does not need to show ──────────────────────────── */

test('every old read path on motir.co answers 308 into the app', async ({
  page,
}) => {
  for (const view of ['board', 'items', 'tree', 'roadmap', 'items/MOTIR-42']) {
    const res = await page.request.get(`${SITE_ORIGIN}/p/MOTIR/${view}`, {
      maxRedirects: 0,
    })
    expect(res.status(), view).toBe(308)
    expect(res.headers()['location'], view).toBe(`${APP}/p/MOTIR/${view}`)
  }
})

test('the same on a customer-owned address, and its app tabs point at the app', async ({
  page,
}) => {
  // A customer domain only: a workspace host serves no project since
  // MOTIR-9512, so it has no read link to move.
  const res = await page.request.get(`${CUSTOM_ORIGIN}/board`, {
    maxRedirects: 0,
  })
  expect(res.status()).toBe(308)
  expect(res.headers()['location']).toBe(`${APP}/p/ROAD/board`)

  await page.goto(`${CUSTOM_ORIGIN}/`)
  const nav = page.getByRole('navigation', { name: 'Project' })
  await expect(nav.getByRole('link', { name: /^Board/ })).toHaveAttribute(
    'href',
    `${APP}/p/ROAD/board`,
  )
  await expect(nav.getByRole('link', { name: /^Roadmap/ })).toHaveAttribute(
    'href',
    `${APP}/p/ROAD/roadmap`,
  )
  await expect(nav.getByRole('link', { name: 'Changelog' })).toHaveAttribute(
    'href',
    '/changelog',
  )
  await expectWatchSentence(page)
  expect(await sameHostReadLinks(page)).toEqual([])
})

test('the changelog’s items link straight into the app', async ({ page }) => {
  await page.goto(`${SITE_ORIGIN}/p/MOTIR/changelog`)
  const itemLinks = await page
    .getByRole('main')
    .locator(`a[href^="${APP}/p/MOTIR/items/"]`)
    .evaluateAll((links) => links.map((l) => l.getAttribute('href')!))
  expect(itemLinks.length).toBeGreaterThan(0)
  for (const href of itemLinks) {
    expect(href).toMatch(new RegExp(`^${APP}/p/MOTIR/items/MOTIR-\\d+$`))
  }
  expect(await sameHostReadLinks(page)).toEqual([])
})

test('the states that remain — empty, error and narrow', async ({ page }) => {
  // EMPTY: the redrawn copy, not the old "the tabs above are where the work is".
  await page.goto(`${SITE_ORIGIN}/p/QUIET`)
  await expect(
    page.getByText('This project has not written an overview yet'),
  ).toBeVisible()
  await expect(page.getByText(/are in the Motir app/)).toBeVisible()
  await expect(page.getByText(/still public/)).toHaveCount(0)

  // ERROR: the contract failed. The chrome and the Watch entry still render,
  // titled without the name the failed read would have supplied.
  const down = await page.goto(`${SITE_ORIGIN}/p/DOWN`)
  expect(down?.status()).toBe(200)
  await expect(page.getByRole('banner').first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Watch this project being built' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Watch live/ })).toHaveAttribute(
    'href',
    `${APP}/p/DOWN/board`,
  )

  // NARROW: the split tab bar SCROLLS, it does not wrap.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${SITE_ORIGIN}/p/MOTIR`)
  const nav = page.getByRole('navigation', { name: 'Project' })
  const box = await nav.boundingBox()
  const tabs = nav.getByRole('link')
  const first = await tabs.first().boundingBox()
  const last = await tabs.last().boundingBox()
  expect(Math.abs(first!.y - last!.y)).toBeLessThan(2)
  expect(await nav.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  expect(box!.height).toBeLessThan(first!.height * 2)
})
