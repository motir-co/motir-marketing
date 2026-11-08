import { writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { SITE_ORIGIN } from '../stub/origin'
import { t } from '../support/catalogue'
import {
  DEFAULT_FAMILY,
  fetchedFamilies,
  settleFonts,
  watchFontRequests,
} from '../support/fontFaces'
import {
  copyAndRead,
  firstParagraph,
  freshVisitor,
  html,
  runPane,
} from '../support/docsWalk'

/*
 * THE PER-REQUEST HALF OF `acceptance-docs-eleven-languages.spec.ts`
 * (MOTIR-10649).
 *
 * Cases 1, 2 and 2a of the /docs walk arrive on the unprefixed `/docs/sandbox`
 * and are moved to `/ja/…` and `/zh-tw/…` by the request-time language
 * detection, which a static-only serve does not do. They are moved here
 * VERBATIM; the static walk opens each language's own address with every other
 * assertion unchanged. This file is on `playwright.config.ts`'s `testIgnore`
 * list; the Worker-routes story re-includes it by deleting that one entry.
 */

test.setTimeout(600_000)

/** Pacing for the recording. NOT a wait for state. */
const beat = (page: Page, ms = 900) => page.waitForTimeout(ms)

const chapters: { label: string; tSeconds: number }[] = []
const startedAt = Date.now()
const chapter = (label: string) => {
  chapters.push({ label, tSeconds: (Date.now() - startedAt) / 1000 })
}

test.afterEach(({}, testInfo) => {
  writeFileSync(
    testInfo.outputPath('chapters.json'),
    JSON.stringify(chapters, null, 2),
  )
})

test('/docs detects the reader’s language, as Stories MOTIR-7739 and MOTIR-8937 ask to be accepted', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: SITE_ORIGIN,
  })

  // ── 1 · A GUIDE IN JAPANESE ─────────────────────────────────────────────
  chapter('The sandbox guide in Japanese')
  // The English page first, in this run: the baseline cases 1 and 2 compare to.
  await freshVisitor(page, 'en-US,en')
  await page.goto('/docs/sandbox')
  await expect(html(page)).toHaveAttribute('lang', 'en')
  const englishIntro = await firstParagraph(page)
  const englishRun = (await runPane(page).textContent()) ?? ''
  expect(englishRun).toContain('docker run')
  const englishPayload = await copyAndRead(page, runPane(page))
  await beat(page, 800)

  await freshVisitor(page, 'ja-JP,ja;q=0.9')
  const requested = watchFontRequests(page)
  await page.goto('/docs/sandbox')
  await expect(page).toHaveURL(`${SITE_ORIGIN}/ja/docs/sandbox`)
  await expect(html(page)).toHaveAttribute('lang', 'ja')
  await expect(runPane(page)).toBeVisible()
  expect(await firstParagraph(page)).not.toBe(englishIntro)
  // The being-updated note is absent: the Japanese document is current.
  await expect(page.getByText(t('ja', 'docs.notes.beingUpdated'))).toHaveCount(
    0,
  )
  // A CJK face was fetched for the page and has settled.
  await expect(async () => {
    await settleFonts(page)
    const fetched = await fetchedFamilies(page, requested)
    expect([...fetched]).toContain(DEFAULT_FAMILY.ja)
  }).toPass({ timeout: 20_000 })
  // The command is code, so it is the same bytes in every language.
  const japaneseRun = (await runPane(page).textContent()) ?? ''
  expect(japaneseRun).toBe(englishRun)
  await beat(page, 1600)

  // ── 2 · COPY A COMMAND ──────────────────────────────────────────────────
  chapter('Copy the docker run command')
  const japanesePayload = await copyAndRead(page, runPane(page))
  expect(japanesePayload).toBe(englishPayload)
  expect(japanesePayload).toBe(japaneseRun)
  await beat(page, 1600)

  // ── 2a · THE GUIDE FOR A TAIWAN READER (MOTIR-8937) ─────────────────────
  chapter('The sandbox guide for a Taiwan browser, and its copy button')
  await freshVisitor(page, 'zh-TW,zh;q=0.9')
  const requestedTw = watchFontRequests(page)
  await page.goto('/docs/sandbox')
  await expect(page).toHaveURL(`${SITE_ORIGIN}/zh-tw/docs/sandbox`)
  await expect(html(page)).toHaveAttribute('lang', 'zh-TW')
  await expect(runPane(page)).toBeVisible()
  expect(await firstParagraph(page)).not.toBe(englishIntro)
  await expect(
    page.getByText(t('zh-tw', 'docs.notes.beingUpdated')),
  ).toHaveCount(0)
  // The Traditional set's default face was fetched for the page.
  await expect(async () => {
    await settleFonts(page)
    const fetched = await fetchedFamilies(page, requestedTw)
    expect([...fetched]).toContain(DEFAULT_FAMILY['zh-tw'])
  }).toPass({ timeout: 20_000 })
  const taiwanRun = (await runPane(page).textContent()) ?? ''
  expect(taiwanRun).toBe(englishRun)
  expect(await copyAndRead(page, runPane(page))).toBe(englishPayload)
  await beat(page, 1600)
})
