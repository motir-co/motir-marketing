import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { STUB_ORIGIN } from '../stub/origin'
import { t } from '../support/catalogue'
import { LOCALES, LOCALE_BCP47 } from '../../i18n/routing'
import { TRACKER_SEAT_FEE_USD_PER_MONTH } from '../../lib/seatFee'

/*
 * /price in all twelve languages (MOTIR-8382 · MOTIR-9688): each answers 200
 * with its heading and its Price links, says the seat and per-organisation
 * lines in its own words, and shows the SAME recorded figures as English.
 * Japanese and Dutch walk the toggle and one estimate.
 */

test.describe.configure({ mode: 'serial' })

const fixture = (path: string) =>
  JSON.parse(
    readFileSync(join(process.cwd(), 'tests', 'fixtures', path), 'utf8'),
  )
const ladder = fixture('price/plans.json')
const pro = fixture('calculator/estimate-pro.json')
const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole)

test.beforeEach(async ({ request }) => {
  await request.post(`${STUB_ORIGIN}/__stub/price?reset=1`)
})

for (const locale of LOCALES) {
  const prefix = locale === 'en' ? '' : `/${locale}`
  test(`/price in ${locale}`, async ({ page }) => {
    const res = await page.goto(`${prefix}/price`)
    expect(res?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      t(locale, 'pricePage.heading'),
    )
    await expect(
      page.locator(`header a[href="${prefix}/price"]`).first(),
    ).toHaveCount(1)
    await expect(page.locator(`footer a[href="${prefix}/price"]`)).toHaveCount(
      1,
    )
    const number = new Intl.NumberFormat(LOCALE_BCP47[locale]).format
    const seatFee = fill(t(locale, 'pricePage.plans.seatFee'), {
      price: number(TRACKER_SEAT_FEE_USD_PER_MONTH),
    })
    await expect(page.locator('#plans')).toContainText(seatFee)
    await expect(page.locator('#plans')).toContainText(
      t(locale, 'pricePage.plans.perOrg'),
    )
    if (locale !== 'en') {
      for (const key of [
        'pricePage.heading',
        'pricePage.plans.perOrg',
        'pricePage.plans.seatFee',
        'pricePage.plans.tiers.host.useCase',
      ]) {
        expect(t(locale, key), key).not.toBe(t('en', key))
      }
    }
    for (const plan of ladder.plans) {
      await expect(
        page
          .locator('#plans')
          .getByRole('heading', { level: 3, name: plan.name, exact: true }),
      ).toBeVisible()
      await expect(page.locator('#plans')).toContainText(
        number(plan.monthlyCredits),
      )
    }
  })
}

for (const locale of ['ja', 'nl'] as const) {
  test(`${locale}: the toggle and one estimate, in its own words`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/price`)
    const toggle = page.locator('#plans').getByRole('group', {
      name: t(locale, 'pricePage.plans.cadenceLabel'),
    })
    await toggle
      .getByRole('button', { name: t(locale, 'pricePage.plans.annual') })
      .click()
    await expect(
      page.getByText(t(locale, 'pricePage.plans.saveBadge')),
    ).toBeVisible()
    const calc = page.locator('#calculator')
    await expect(
      calc.getByRole('checkbox', { name: /^Balanced,/ }),
    ).toBeVisible()
    const sets = calc.locator('fieldset')
    for (const i of [0, 1]) {
      await sets
        .nth(i)
        .getByLabel(t(locale, 'pricePage.calculator.lowLabel'))
        .fill('20')
      await sets
        .nth(i)
        .getByLabel(t(locale, 'pricePage.calculator.highLabel'))
        .fill('40')
    }
    await calc.getByRole('checkbox', { name: /^Balanced,/ }).click()
    await calc
      .getByRole('button', { name: t(locale, 'pricePage.calculator.submit') })
      .click()
    const number = new Intl.NumberFormat(LOCALE_BCP47[locale]).format
    await expect(calc.getByTestId('calculator-credits')).toHaveText(
      `${number(pro.credits.low)} – ${number(pro.credits.high)}`,
    )
    await expect(calc.getByTestId('calculator-plan')).toContainText(
      pro.recommendation.planName,
    )
    await expect(calc).toContainText(
      t(locale, 'pricePage.calculator.creditsLabel'),
    )
  })
}
