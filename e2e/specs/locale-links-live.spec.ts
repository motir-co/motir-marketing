import { expect, test } from '@playwright/test'
import { SITE_ORIGIN } from '../stub/origin'
import { HEADER_LADDER } from '../../i18n/routing'

/*
 * THE PER-REQUEST HALF OF `locale-links.spec.ts` (MOTIR-10649).
 *
 * `/fr/explore` renders per request from the public API. The cases below are
 * moved here VERBATIM from `locale-links.spec.ts`, whose static cases still
 * run. This file is on `playwright.config.ts`'s `testIgnore` list: a static-
 * only serve cannot answer the route it drives, and the Worker-routes story
 * re-includes it by deleting that one entry.
 */

test('a link on a French page goes straight to the French page', async ({
  page,
}) => {
  // Wide enough for the French bar's nav (the header's give-way ladder,
  // `HEADER_LADDER` — below it the nav folds into the Menu panel).
  await page.setViewportSize({
    width: Math.max(1440, HEADER_LADDER.fr.b),
    height: 900,
  })
  await page.goto(`${SITE_ORIGIN}/fr/explore`)
  const docs = page.locator('header a[href="/fr/docs"]').first()
  await expect(docs).toBeVisible()

  await docs.click()
  await expect(page).toHaveURL(`${SITE_ORIGIN}/fr/docs`)
  await expect(page.locator('h1').first()).toBeVisible()

  // And the address the link names is the page itself, not a hop to it.
  const direct = await page.request.get(`${SITE_ORIGIN}/fr/docs`, {
    maxRedirects: 0,
  })
  expect(direct.status()).toBe(200)
})
