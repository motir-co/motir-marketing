import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { SITE_ORIGIN, STUB_ORIGIN } from '../stub/origin'
import { t } from '../support/catalogue'
import { TRACKER_SEAT_FEE_USD_PER_MONTH } from '../../lib/seatFee'

/*
 * ⚠️ THE /price WALK FOR STORY MOTIR-8382 (MOTIR-9688), signed out, as a
 * prospect would: the five-plan card and its toggle, the calculator's answers,
 * the See-Host line, every non-happy state, the engine blocked. PACED FOR A
 * PERSON TO WATCH — the first test is the receipt; every `beat()` is pacing,
 * never a wait for state.
 *
 * ⚠️ THE ENGINE IS THE STUB. `e2e/stub/publicApiStub.ts` answers motir-ai's
 * public routes from the integration gate's recordings: the ladder to the
 * page's SERVER-side read, the categories and the estimate to the browser. A
 * spec switches the stub's answer with `POST /__stub/price`, and the lane reads
 * the ladder fresh on every render (`MOTIR_PLAN_LADDER_REVALIDATE_S=0`).
 * Every expected figure is read from the same recordings; the only literal
 * amount is the seat fee, imported from `lib/seatFee.ts`.
 *
 * ⚠️ THE FILE RUNS SERIALLY: the stub's modes are shared by every caller.
 */

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)

const fixture = (path: string) =>
  JSON.parse(
    readFileSync(join(process.cwd(), 'tests', 'fixtures', path), 'utf8'),
  )
const ladder = fixture('price/plans.json')
const changed = fixture('price/plans-b.json')
const pro = fixture('calculator/estimate-pro.json')
const proTwo = fixture('calculator/estimate-pro-two.json')
const proThree = fixture('calculator/estimate-pro-three.json')
const maxX2 = fixture('calculator/estimate-maxx2-topup.json')
const larger = fixture('calculator/estimate-larger.json')

const n = (v: number) => new Intl.NumberFormat('en').format(v)
const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole)

const beat = (page: Page, ms = 1200) => page.waitForTimeout(ms)
const chapters: { label: string; tSeconds: number }[] = []
let startedAt = Date.now()
const chapter = (label: string) =>
  chapters.push({ label, tSeconds: (Date.now() - startedAt) / 1000 })

test.afterEach(async ({ request }, testInfo) => {
  await request.post(`${STUB_ORIGIN}/__stub/price?reset=1`)
  if (chapters.length) {
    writeFileSync(
      testInfo.outputPath('chapters.json'),
      JSON.stringify(chapters, null, 2),
    )
    chapters.length = 0
  }
})

const stub = (page: Page, query: string) =>
  page.request.post(`${STUB_ORIGIN}/__stub/price?${query}`)

const plans = (page: Page) =>
  page
    .getByRole('list', { name: t('en', 'pricePage.plansLabel') })
    .getByRole('listitem')
    .filter({
      has: page.locator('article'),
    })
const calc = (page: Page) => page.locator('#calculator')
const output = (page: Page) => calc(page).locator('[aria-live="polite"]')

async function estimate(
  page: Page,
  planned: [string, string],
  run: [string, string],
  picks: string[],
) {
  const sets = calc(page)
    .locator('fieldset')
    .filter({ has: page.getByLabel(t('en', 'pricePage.calculator.lowLabel')) })
  for (const [i, [low, high]] of [planned, run].entries()) {
    await sets
      .nth(i)
      .getByLabel(t('en', 'pricePage.calculator.lowLabel'))
      .fill(low)
    await sets
      .nth(i)
      .getByLabel(t('en', 'pricePage.calculator.highLabel'))
      .fill(high)
  }
  for (const key of picks) {
    const label = key.charAt(0).toUpperCase() + key.slice(1)
    await calc(page)
      .getByRole('checkbox', { name: new RegExp(`^${label},`) })
      .click()
  }
  await calc(page)
    .getByRole('button', { name: t('en', 'pricePage.calculator.submit') })
    .click()
}

test('a prospect reads the plans, toggles annual and estimates their usage, as MOTIR-8382 asks to be accepted', async ({
  page,
  request,
}) => {
  startedAt = Date.now()
  await stub(page, 'reset=1')

  chapter('/price, signed out: five plans in ladder order')
  await page.goto('/price')
  await expect(
    page.getByRole('heading', { level: 1, name: t('en', 'pricePage.heading') }),
  ).toBeVisible()
  const cards = plans(page)
  await expect(cards).toHaveCount(ladder.plans.length)
  for (const [i, plan] of ladder.plans.entries()) {
    const card = cards.nth(i)
    await expect(card.getByRole('heading', { level: 3 })).toHaveText(plan.name)
    await expect(card).toContainText(
      fill(t('en', 'pricePage.plans.creditsAllotment'), {
        n: n(plan.monthlyCredits),
      }),
    )
    await expect(card).toContainText(
      fill(t('en', 'pricePage.plans.perMoEquiv'), {
        n: n(plan.priceUsdByCadence.monthly),
      }),
    )
    await expect(card).toContainText('+ 1 Motir seat · work items uncapped')
    await expect(card.getByRole('link')).toBeVisible()
  }
  for (const pool of ladder.largerPlans)
    await expect(page.getByText(pool.name)).toHaveCount(0)
  await expect(page.getByText(/enterprise|contact sales/i)).toHaveCount(0)
  await expect(page.locator('#plans')).toContainText(
    fill(t('en', 'pricePage.plans.seatFee'), {
      price: n(TRACKER_SEAT_FEE_USD_PER_MONTH),
    }),
  )
  await expect(page.locator('#plans')).toContainText(
    t('en', 'pricePage.plans.perOrg'),
  )
  await beat(page)

  chapter('Monthly / Annual, by keyboard — and back')
  const toggle = page.locator('#plans').getByRole('group', {
    name: t('en', 'pricePage.plans.cadenceLabel'),
  })
  await toggle
    .getByRole('button', { name: t('en', 'pricePage.plans.annual') })
    .focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByText(t('en', 'pricePage.plans.saveBadge')),
  ).toBeVisible()
  for (const [i, plan] of ladder.plans.entries()) {
    await expect(cards.nth(i).locator('[data-price="annual"]')).toBeVisible()
    await expect(cards.nth(i)).toContainText(
      fill(t('en', 'pricePage.plans.annualSub'), {
        yr: n(plan.priceUsdByCadence.annual),
      }),
    )
  }
  await beat(page)
  await toggle
    .getByRole('button', { name: t('en', 'pricePage.plans.monthly') })
    .focus()
  await page.keyboard.press('Space')
  await expect(cards.first().locator('[data-price="monthly"]')).toBeVisible()
  await beat(page)

  chapter('The calculator: an ordinary plan')
  await calc(page).scrollIntoViewIfNeeded()
  await estimate(page, ['20', '40'], ['10', '20'], ['balanced'])
  await expect(output(page).getByTestId('calculator-credits')).toHaveText(
    `${n(pro.credits.low)} – ${n(pro.credits.high)}`,
  )
  await expect(output(page).getByTestId('calculator-plan')).toContainText(
    pro.recommendation.planName,
  )
  await expect(output(page).getByTestId('calculator-see-host')).toHaveCount(0)
  await beat(page)

  chapter(
    'Two, then three categories — their shares, and the answer follows the engine',
  )
  await calc(page)
    .getByRole('checkbox', { name: /^Economy,/ })
    .click()
  const shareValues = calc(page).getByTestId('calculator-share-value')
  await expect(shareValues).toHaveText(['50%', '50%'])
  await calc(page)
    .getByRole('button', { name: t('en', 'pricePage.calculator.submit') })
    .click()
  await expect(output(page).getByTestId('calculator-credits')).toHaveText(
    `${n(proTwo.credits.low)} – ${n(proTwo.credits.high)}`,
  )
  await calc(page)
    .getByRole('checkbox', { name: /^Frontier,/ })
    .click()
  await expect(shareValues).toHaveText(['34%', '33%', '33%'])
  await calc(page).getByRole('slider', { name: 'Balanced' }).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(shareValues).toHaveText(['33%', '35%', '32%'])
  await calc(page)
    .getByRole('button', { name: t('en', 'pricePage.calculator.submit') })
    .click()
  await expect(output(page).getByTestId('calculator-credits')).toHaveText(
    `${n(proThree.credits.low)} – ${n(proThree.credits.high)}`,
  )
  await beat(page)

  chapter('Max ×2 with top-ups, and the See-Host line')
  await stub(page, 'estimate=max-x2')
  await calc(page)
    .getByRole('button', { name: t('en', 'pricePage.calculator.submit') })
    .click()
  await expect(output(page).getByTestId('calculator-plan')).toContainText(
    maxX2.recommendation.planName,
  )
  const seeHost = output(page).getByTestId('calculator-see-host')
  await expect(seeHost).toBeVisible()
  expect(await seeHost.textContent()).not.toMatch(/\d/)
  await expect(seeHost.getByRole('link')).toHaveAttribute('href', '#plan-host')
  await beat(page)

  chapter('A larger pool, from the answer')
  await stub(page, 'estimate=larger')
  await calc(page)
    .getByRole('button', { name: t('en', 'pricePage.calculator.submit') })
    .click()
  const pool = output(page).getByTestId('calculator-larger')
  await expect(pool).toContainText(larger.recommendation.planName)
  await expect(pool).toContainText(
    fill(t('en', 'pricePage.plans.creditsAllotment'), {
      n: n(larger.recommendation.poolCredits),
    }),
  )
  await expect(output(page)).toContainText(
    t('en', 'pricePage.calculator.ownAccounts'),
  )
  await expect(output(page).getByTestId('calculator-see-host')).toBeVisible()
  await beat(page, 1800)

  const log = await (
    await request.get(`${STUB_ORIGIN}/__stub/price/log`)
  ).json()
  expect(log.plansHits).toBeGreaterThan(0)
  for (const body of log.estimateBodies) {
    const several = body.categories.length > 1
    expect(Object.keys(body).sort()).toEqual(
      [
        'cadence',
        'categories',
        'plannedPerMonth',
        'runPerMonth',
        ...(several ? ['shares'] : []),
      ].sort(),
    )
  }
  expect(
    log.estimateBodies.map((body: { shares?: object }) => body.shares),
  ).toEqual(
    expect.arrayContaining([
      { economy: 50, balanced: 50 },
      { economy: 33, balanced: 35, frontier: 32 },
    ]),
  )
})

test('the server markup holds both cadence prices, and the browser never reads the ladder', async ({
  page,
  request,
}) => {
  const html = await (await request.get(`${SITE_ORIGIN}/price`)).text()
  for (const plan of ladder.plans) {
    expect(html).toContain(
      fill(t('en', 'pricePage.plans.annualSub'), {
        yr: n(plan.priceUsdByCadence.annual),
      }),
    )
  }
  const seen: { url: string; headers: Record<string, string> }[] = []
  page.on('request', (r) => seen.push({ url: r.url(), headers: r.headers() }))
  await page.goto('/price')
  await expect(
    calc(page).getByRole('checkbox', { name: /^Balanced,/ }),
  ).toBeVisible()
  await estimate(page, ['20', '40'], ['10', '20'], ['balanced'])
  await expect(output(page).getByTestId('calculator-credits')).toBeVisible()
  expect(seen.some((r) => r.url.includes('/v1/public/plans'))).toBe(false)
  const engine = seen.filter((r) =>
    r.url.includes('/v1/public/calculator/estimate'),
  )
  expect(engine.length).toBeGreaterThan(0)
  for (const r of engine) {
    expect(new URL(r.url).origin).toBe(STUB_ORIGIN)
    expect(r.headers['cookie']).toBeUndefined()
    expect(r.headers['authorization']).toBeUndefined()
  }
  expect(seen.some((r) => r.url.includes('app.motir.co'))).toBe(false)
})

test('a changed ladder shows with no code edit', async ({ page }) => {
  await stub(page, 'plans=changed')
  await page.goto('/price')
  await expect(
    plans(page).first().getByRole('heading', { level: 3 }),
  ).toHaveText(changed.plans[0].name)
  await expect(plans(page).first()).toContainText(
    fill(t('en', 'pricePage.plans.creditsAllotment'), {
      n: n(changed.plans[0].monthlyCredits),
    }),
  )
})

for (const scenario of ['unavailable', 'unknown-version']) {
  test(`the ladder ${scenario}: plans-unavailable, and the calculator still works`, async ({
    page,
  }) => {
    await stub(page, `plans=${scenario}`)
    const res = await page.goto('/price')
    expect(res?.status()).toBe(200)
    await expect(page.locator('#plans').getByRole('alert')).toContainText(
      t('en', 'pricePage.plans.unavailableTitle'),
    )
    await expect(page.locator('#plans [data-price]')).toHaveCount(0)
    for (const plan of ladder.plans)
      await expect(
        page.locator('#plans').getByText(plan.name, { exact: true }),
      ).toHaveCount(0)
    await expect(page.locator('#plans')).toContainText(
      t('en', 'pricePage.plans.perOrg'),
    )
    await estimate(page, ['20', '40'], ['10', '20'], ['balanced'])
    await expect(output(page).getByTestId('calculator-credits')).toBeVisible()
  })
}

test('the engine blocked, or an unknown version: the calm message, no number, the page intact', async ({
  page,
}) => {
  await page.goto('/price')
  await expect(
    calc(page).getByRole('checkbox', { name: /^Balanced,/ }),
  ).toBeVisible()
  await page.route('**/v1/public/calculator/estimate', (route) => route.abort())
  await estimate(page, ['20', '40'], ['10', '20'], ['balanced'])
  await expect(output(page)).toContainText(
    t('en', 'pricePage.calculator.errors.unavailable'),
  )
  expect(await output(page).textContent()).not.toMatch(/\d/)
  await expect(plans(page)).toHaveCount(ladder.plans.length)
  await page.unroute('**/v1/public/calculator/estimate')

  await stub(page, 'estimate=unknown-version')
  await calc(page)
    .getByRole('button', { name: t('en', 'pricePage.calculator.retry') })
    .click()
  await expect(output(page)).toContainText(
    t('en', 'pricePage.calculator.errors.unavailable'),
  )
  expect(await output(page).textContent()).not.toMatch(/\d/)
})

test('a bad range, an empty category and a retired one each say so, with no number', async ({
  page,
}) => {
  await page.goto('/price')
  await expect(
    calc(page).getByRole('checkbox', { name: /^Balanced,/ }),
  ).toBeVisible()
  await estimate(page, ['40', '20'], ['1', '2'], ['balanced'])
  await expect(
    calc(page).getByText(t('en', 'pricePage.calculator.errors.rangeOrder')),
  ).toBeVisible()
  await expect(
    calc(page)
      .getByRole('textbox', { name: t('en', 'pricePage.calculator.highLabel') })
      .first(),
  ).toHaveAttribute('aria-invalid', 'true')

  await stub(page, 'estimate=empty-category')
  const planned = calc(page).locator('fieldset').first()
  await planned.getByLabel(t('en', 'pricePage.calculator.lowLabel')).fill('20')
  await planned.getByLabel(t('en', 'pricePage.calculator.highLabel')).fill('40')
  await calc(page)
    .getByRole('checkbox', { name: /^Balanced,/ })
    .click()
  await calc(page)
    .getByRole('checkbox', { name: /^Frontier,/ })
    .click()
  await calc(page)
    .getByRole('button', { name: t('en', 'pricePage.calculator.submit') })
    .click()
  await expect(output(page)).toContainText(
    t('en', 'pricePage.calculator.categoryEmpty'),
  )
  expect(await output(page).textContent()).not.toMatch(/\d/)

  await page.reload()
  await expect(
    calc(page).getByRole('checkbox', { name: /^Frontier,/ }),
  ).toBeEnabled()
  await stub(page, 'estimate=stale-category&categories=empty-frontier')
  await estimate(page, ['20', '40'], ['1', '2'], ['frontier'])
  await expect(
    calc(page).getByRole('status').filter({ hasText: 'Frontier' }),
  ).toContainText(
    fill(t('en', 'pricePage.calculator.retired'), { category: 'Frontier' }),
  )
})

test('while an answer is held, the old number is not current, and an older answer never lands', async ({
  page,
}) => {
  await page.goto('/price')
  await expect(
    calc(page).getByRole('checkbox', { name: /^Balanced,/ }),
  ).toBeVisible()
  await estimate(page, ['20', '40'], ['10', '20'], ['balanced'])
  await expect(output(page).getByTestId('calculator-credits')).toBeVisible()

  await stub(page, 'hold=1')
  await calc(page)
    .getByRole('button', { name: t('en', 'pricePage.calculator.submit') })
    .click()
  await expect(output(page)).toContainText(
    t('en', 'pricePage.calculator.loading'),
  )
  await expect(output(page).getByTestId('calculator-credits')).toHaveCount(0)

  await stub(page, 'estimate=max-x2')
  await calc(page)
    .getByRole('button', { name: t('en', 'pricePage.calculator.submit') })
    .click()
  await expect(output(page).getByTestId('calculator-plan')).toContainText(
    maxX2.recommendation.planName,
  )
  await page.request.post(`${STUB_ORIGIN}/__stub/price/release`)
  await beat(page, 500)
  await expect(output(page).getByTestId('calculator-plan')).toContainText(
    maxX2.recommendation.planName,
  )
})
