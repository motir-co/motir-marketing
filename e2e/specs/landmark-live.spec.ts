import { expect, test } from '@playwright/test'
import { LIVE_ROUTES } from '../routes'

/*
 * THE PER-REQUEST HALF OF `landmark.spec.ts` (MOTIR-10649).
 *
 * `/explore`, `/explore/topic/*`, `/ideas`, `/motir-builds-itself` and `/p/**`
 * render per request from the public API (`LIVE_ROUTES` in `e2e/routes.ts`).
 * The cases below moved here VERBATIM from `landmark.spec.ts`, whose
 * static cases still run. This file is on `playwright.config.ts`'s
 * `testIgnore` list, because a static-only serve cannot answer the routes it
 * drives; the Worker-routes story re-includes it by deleting that one entry.
 */

for (const route of LIVE_ROUTES) {
  test(`${route.pattern} renders exactly one main landmark`, async ({
    page,
  }) => {
    const response = await page.goto(route.url)

    // ⚠️ THE STATUS IS ASSERTED FIRST, AND IT IS NOT A COURTESY. A route whose
    // stub fixture is missing renders a not-found page — which HAS a landmark,
    // because the chrome supplies it — so the landmark assertion below would
    // pass while proving nothing at all about the route named in the title.
    expect(response?.status(), `${route.url} did not serve a document`).toBe(
      200,
    )

    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.locator('main')).toHaveCount(1)
  })
}

test('the skip link is the first thing a keyboard reaches, and it lands in the content', async ({
  page,
}) => {
  /*
   * The half a landmark alone does not deliver. WCAG 2.4.1 asks for a way to
   * BYPASS the repeated banner, and `/explore` is the page the card was filed
   * from: a reader arriving here tabbed the whole bar before reaching anything
   * they came for, on every navigation.
   */
  await page.goto('/explore')
  await expect(page.getByRole('main')).toBeVisible()

  // 1. It is the FIRST focusable element in the document — before the brand
  //    link, before the nav, before the two app doors.
  await page.keyboard.press('Tab')
  const skipLink = page.getByRole('link', { name: 'Skip to content' })
  await expect(skipLink).toBeFocused()

  // 2. Invisible at rest, visible under focus. `sr-only` is a clip, not
  //    `display: none`, so "reachable" and "visible" are separate questions
  //    and a skip link that never reveals itself is a sighted keyboard user's
  //    focus disappearing into nowhere.
  await expect(skipLink).toBeVisible()

  // 3. Activating it moves FOCUS, not merely the scroll position. This is the
  //    whole reason the landmark carries `tabIndex={-1}`: without it the
  //    fragment jumps and focus stays on the link, so the next Tab walks back
  //    into the nav the reader just asked to skip.
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()

  // 4. And the next Tab continues INTO the content rather than back out.
  await page.keyboard.press('Tab')
  await expect(page.locator('main')).not.toBeFocused()
})
