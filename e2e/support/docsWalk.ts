import { expect, type Locator, type Page } from '@playwright/test'

/*
 * THE /docs WALK'S PAGE HELPERS (MOTIR-8052), shared since MOTIR-10649 by
 * `e2e/specs/acceptance-docs-eleven-languages.spec.ts` (the built pages) and
 * `e2e/specs/acceptance-docs-eleven-languages-live.spec.ts` (the language
 * detection on an unprefixed docs address). Moved here unchanged.
 */

export const html = (page: Page) => page.locator('html')
export const main = (page: Page) => page.getByRole('main')

/** A visit from a browser asking for `language`, with no cookie. */
export async function freshVisitor(page: Page, language: string) {
  await page.context().clearCookies()
  await browserLanguage(page, language)
}

/** Every request the page makes from here on asks for `language`. */
export async function browserLanguage(page: Page, language: string) {
  await page.unroute('**/*')
  await page.route('**/*', (route) =>
    route.continue({
      headers: { ...route.request().headers(), 'accept-language': language },
    }),
  )
}

/** The page's own first paragraph — the intro the reader meets first. */
export async function firstParagraph(page: Page): Promise<string> {
  // The reading column's, not the rail's (the rail has `<p>` rows of its own).
  const first = main(page).locator('p:not(nav p)').first()
  await expect(first).toBeVisible()
  return normalise((await first.textContent()) ?? '')
}

export const normalise = (text: string) => text.replace(/\s+/g, ' ').trim()

/**
 * The copy button of the `<pre>` a `CodeBlock` draws: the caption row (`<p>`,
 * holding the button) is the `<pre>`'s preceding sibling. Found structurally,
 * not by its accessible name, because the name is built from the caption.
 */
export const copyButtonOf = (pane: Locator) =>
  pane.locator('xpath=preceding-sibling::p//button')

/** The `docker run` pane of /docs/sandbox, in whatever language the page is. */
export const runPane = (page: Page) =>
  page.locator('pre', { hasText: 'docker run' }).first()

/** What the browser holds, read back through the granted permission. */
export const clipboardText = (page: Page) =>
  page.evaluate(() => navigator.clipboard.readText())

/** Press a pane's copy button until it reports `copied`, then read the clipboard. */
export async function copyAndRead(page: Page, pane: Locator): Promise<string> {
  const button = copyButtonOf(pane)
  // A press before hydration does nothing; pressing again once it has is
  // harmless, so the press is retried until the button says it copied.
  await expect(async () => {
    await button.click()
    await expect(button).toHaveAttribute('data-state', 'copied', {
      timeout: 2_000,
    })
  }).toPass({ timeout: 20_000 })
  return clipboardText(page)
}

/*
 * Text nodes of Motir's OWN prose: every text node under <body>, minus `pre`,
 * `code`, the copy controls (`button`), anything the page draws in the monospace
 * face (an operation path, an enum of identifiers: data, not prose), a tool's
 * TITLE (the catalogue's own name for it, served in English and never translated
 * — the one English run on a Spanish page that is NOT marked `lang="en"`; noted
 * in the report, not hidden) and any
 * `[lang="en"]` region BELOW the body. The body bound matters: the English page's `<html lang="en">` would
 * otherwise exclude the whole English page.
 */
