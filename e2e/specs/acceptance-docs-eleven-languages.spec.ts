import { writeFileSync } from 'node:fs'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { SITE_ORIGIN, STUB_ORIGIN } from '../stub/origin'
import { LOCALE_BCP47, type Locale } from '../../i18n/routing'
import { DOCS_ROUTES } from '../../lib/docsSurfaces'
import { leaves, t } from '../support/catalogue'
import {
  DEFAULT_FAMILY,
  fetchedFamilies,
  settleFonts,
  watchFontRequests,
} from '../support/fontFaces'
import {
  html,
  main,
  freshVisitor,
  browserLanguage,
  firstParagraph,
  runPane,
  copyAndRead,
} from '../support/docsWalk'

/*
 * ⚠️ THE ACCEPTANCE WALK FOR /docs IN TWELVE LANGUAGES (MOTIR-8052) — Story
 * MOTIR-7739, PACED FOR A PERSON TO WATCH. Traditional Chinese (Taiwan),
 * `/zh-tw`, joined as the twelfth in Story MOTIR-8937 (MOTIR-9253) with its
 * own chapters: the sandbox guide, the generated references and a rail walk.
 * The file keeps its name so history and anything linking it by path holds.
 *
 * The story's eight Verification steps, in order, as one signed-out reader: ONE
 * test, ONE context, ONE page, so the run yields ONE video, and a
 * `chapters.json` beside it. It follows `acceptance-eleven-languages.spec.ts`
 * (MOTIR-7968) in every mechanic that matters:
 *
 *  · THE LANGUAGE IS THE ROUTE'S `Accept-Language`, NOT `setExtraHTTPHeaders`.
 *    Chromium writes its own header (from the context's locale) over an extra
 *    one of that name, so a page told `ja` still asked for `en-US`. A fresh
 *    visit is `clearCookies()` plus the header — the only state the server reads.
 *  · EVERY EXPECTED STRING IS READ FROM `messages/<locale>.json` through
 *    `t(locale, key)`. The only literal words typed here are none.
 *  · EVERY `beat()` IS PACING, NEVER A WAIT FOR STATE. Each assertion waits on a
 *    URL, a rendered attribute, a response, or the font set settling.
 *
 * ── WHAT THE ENGLISH PAGE IS FOR ───────────────────────────────────────────
 * Most cases compare a translated page with the English one read IN THIS RUN, so
 * "differs from English", "equals the English text" and "byte-identical to what
 * the English button copies" are measured, not typed. The English page is read
 * first, in the same context, then the translated one.
 *
 * ── WHAT THE STUB SERVES ───────────────────────────────────────────────────
 * `/docs/api`, `/docs/cli` and `/docs/mcp/tools` fetch their data SERVER-SIDE
 * from the public-API stub (`e2e/stub/publicApiStub.ts`): the OpenAPI document,
 * the CLI catalogue and the tool catalogue, each a motir-core recording under
 * `tests/docs/fixtures/`. The tool catalogue is answered per `?locale=`, so
 * `/ko/docs/mcp/tools` shows Korean summaries only because the stub has
 * motir-core's Korean recording.
 *
 * ── THE DOCS ARE BUILT AHEAD (MOTIR-10649) ─────────────────────────────────
 * Every /docs page is rendered once, when the lane builds the site, from the
 * repository's `content/docs` and the stub's recordings. The journey that
 * edited `content/docs/sentry/en.md` while the server ran (case 8) went with
 * the per-request render.
 */

// Twelve journeys, two of them walking every docs page, at a watchable pace.
test.setTimeout(600_000)

/** Pacing for the recording. NOT a wait for state — see the header. */
const beat = (page: Page, ms = 900) => page.waitForTimeout(ms)

/*
 * CHAPTERS ARE MEASURED, NEVER AUTHORED: `chapter()` stamps the real elapsed
 * time as the walk reaches each step, and `chapters.json` is written beside the
 * video so an index is never read against another run's recording.
 */
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

function ownProseNodes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const excluded = (node: Node): boolean => {
      for (
        let el = node.parentElement;
        el && el !== document.body;
        el = el.parentElement
      ) {
        if (
          el.matches(
            'pre, code, button, script, style, noscript, [lang="en"], [class*="font-mono"], div:has(> code[id^="tool-"]) > span',
          )
        )
          return true
      }
      return false
    }
    const out: string[] = []
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (excluded(n)) continue
      const text = (n.textContent ?? '').replace(/\s+/g, ' ').trim()
      if (text.length > 40) out.push(text)
    }
    return out
  })
}

/*
 * Strings that stay English in every language ON PURPOSE: the exact name of
 * another product's menu command, which the guide quotes verbatim so a reader
 * can find it. All ten translations keep it (`content/docs/sandbox/<l>.md`,
 * step 2c, in emphasis). A list this short and this exact hides nothing else.
 */
const VERBATIM = new Set(['Dev Containers: Open Folder in Container…'])

/** The English sentences that appear in a page's own-prose text. */
function englishLeftovers(english: string[], translated: string[]): string[] {
  const haystack = translated.join('\n')
  return english.filter(
    (sentence) => !VERBATIM.has(sentence) && haystack.includes(sentence),
  )
}

/** A dotted key path the catalogue really has, as a prefix of one of its keys. */
const KEY_PATH = /\bdocs\.[a-zA-Z]+\./g
const REAL_KEYS = [...leaves('en').keys()]

test('/docs in twelve languages, as Stories MOTIR-7739 and MOTIR-8937 ask to be accepted', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: SITE_ORIGIN,
  })

  // ── 1 · A GUIDE IN JAPANESE ─────────────────────────────────────────────
  // ⚠️ AT ITS JAPANESE ADDRESS (MOTIR-10649). The reader used to arrive on
  // `/docs/sandbox` and be moved to `/ja/docs/sandbox` by the request-time
  // language detection; that hop is per-request, so cases 1, 2 and 2a with it
  // moved verbatim to `acceptance-docs-eleven-languages-live.spec.ts`, and here
  // the reader opens the language's own address, every assertion unchanged.
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
  await page.goto('/ja/docs/sandbox')
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
  await page.goto('/zh-tw/docs/sandbox')
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

  // ── 3 · THE MCP TOOLS IN KOREAN ─────────────────────────────────────────
  chapter('The MCP tools in Korean')
  // What the stub serves for Korean — the page fetches exactly this.
  const served = (await (
    await page.request.get(`${STUB_ORIGIN}/api/docs/mcp-tools.json?locale=ko`)
  ).json()) as {
    toolCount: number
    groups: {
      tools: { name: string; summary: string; summaryLocale?: string }[]
    }[]
  }
  const tools = served.groups.flatMap((group) => group.tools)
  expect(tools.length).toBe(served.toolCount)
  expect(
    tools.some((tool) => tool.summaryLocale === 'ko'),
    'the stub answered ?locale=ko with its Korean recording',
  ).toBe(true)

  await freshVisitor(page, 'en-US,en')
  await page.goto('/ko/docs/mcp/tools')
  await expect(html(page)).toHaveAttribute('lang', 'ko')
  await expect(page.locator('code[id^="tool-"]')).toHaveCount(tools.length)
  const rows = await page.evaluate(() =>
    Array.from(document.querySelectorAll('code[id^="tool-"]')).map((code) => {
      const summary = code.closest('li')?.querySelector(':scope > p')
      return {
        id: code.id,
        name: code.textContent ?? '',
        summary: summary?.textContent ?? '',
        lang: summary?.getAttribute('lang') ?? null,
      }
    }),
  )
  expect(rows.map((row) => row.name)).toEqual(tools.map((tool) => tool.name))
  expect(rows.map((row) => row.id)).toEqual(
    tools.map((tool) => `tool-${tool.name}`),
  )
  rows.forEach((row, index) => {
    const tool = tools[index]!
    if (tool.summaryLocale === 'ko') {
      expect(row.summary, `${tool.name}: Hangul summary`).toMatch(/[가-힣]/)
      expect(row.lang, `${tool.name}: no lang on a Korean summary`).toBeNull()
    } else if (tool.summaryLocale === 'en') {
      expect(row.lang, `${tool.name}: English summary is marked`).toBe('en')
    }
  })
  // The count the page prints is the catalogue's own.
  await expect(main(page)).toContainText(String(served.toolCount))
  await beat(page, 1600)

  // ── 3a · THE MCP TOOLS IN TRADITIONAL CHINESE ───────────────────────────
  chapter('The MCP tools in Traditional Chinese: English summaries, marked')
  // No zh-tw recording exists this round, so the stub answers English and the
  // page must say so on every summary (MOTIR-8937, assumption r1).
  const servedTw = (await (
    await page.request.get(
      `${STUB_ORIGIN}/api/docs/mcp-tools.json?locale=zh-tw`,
    )
  ).json()) as typeof served
  const toolsTw = servedTw.groups.flatMap((group) => group.tools)
  const toolRows = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('code[id^="tool-"]')).map((code) => {
        const summary = code.closest('li')?.querySelector(':scope > p')
        return {
          id: code.id,
          name: code.textContent ?? '',
          summary: (summary?.textContent ?? '').trim(),
          lang: summary?.getAttribute('lang') ?? null,
        }
      }),
    )
  await page.goto('/docs/mcp/tools')
  await expect(html(page)).toHaveAttribute('lang', 'en')
  await expect(page.locator('code[id^="tool-"]')).toHaveCount(toolsTw.length)
  const englishTools = await toolRows()
  const englishToolsIntro = await firstParagraph(page)

  await page.goto('/zh-tw/docs/mcp/tools')
  await expect(html(page)).toHaveAttribute('lang', 'zh-TW')
  await expect(page.locator('code[id^="tool-"]')).toHaveCount(toolsTw.length)
  expect(await firstParagraph(page)).not.toBe(englishToolsIntro)
  const taiwanTools = await toolRows()
  expect(taiwanTools.map((row) => row.name)).toEqual(
    toolsTw.map((tool) => tool.name),
  )
  expect(taiwanTools.map((row) => row.id)).toEqual(
    toolsTw.map((tool) => `tool-${tool.name}`),
  )
  taiwanTools.forEach((row, index) => {
    expect(row.summary, row.name).toBe(englishTools[index]!.summary)
    expect(row.lang, `${row.name}: English summary is marked`).toBe('en')
  })
  await beat(page, 1600)

  // ── 4 · THE API REFERENCE IN FRENCH ─────────────────────────────────────
  chapter('The API reference in French')
  /** Every operation: its anchor, then its summary and description with their `lang`. */
  const operationsOf = (p: Page) =>
    p.evaluate(() =>
      Array.from(document.querySelectorAll('section[id]'))
        .filter((section) => section.querySelector(':scope > h2'))
        .map((section) => {
          const h2 = section.querySelector(':scope > h2')!
          const next = h2.nextElementSibling
          const description = next?.tagName === 'P' ? next : null
          return {
            id: section.id,
            summary: (h2.textContent ?? '').trim(),
            summaryLang: h2.getAttribute('lang'),
            description: description?.textContent?.trim() ?? null,
            descriptionLang: description?.getAttribute('lang') ?? null,
          }
        }),
    )

  await browserLanguage(page, 'en-US,en')
  await page.goto('/docs/api')
  await expect(html(page)).toHaveAttribute('lang', 'en')
  await expect(page.locator('section[id] > h2').first()).toBeVisible()
  const englishApi = await operationsOf(page)
  const englishApiIntro = await firstParagraph(page)
  expect(englishApi.length).toBeGreaterThan(3)

  await page.goto('/fr/docs/api')
  await expect(html(page)).toHaveAttribute('lang', 'fr')
  await expect(page.locator('section[id] > h2').first()).toBeVisible()
  expect(await firstParagraph(page)).not.toBe(englishApiIntro)
  await expect(page.getByText(t('fr', 'docs.notes.beingUpdated'))).toHaveCount(
    0,
  )
  // The note sits once, after the intro and before the first operation.
  const apiNote = page
    .getByRole('note')
    .filter({ hasText: t('fr', 'docs.notes.generatedReference.openapi') })
  await expect(apiNote).toHaveCount(1)
  expect(
    await apiNote.evaluate((note) => {
      const intro = document.querySelector('main p:not(nav p)')!
      const first = document.querySelector('section[id]')!
      return (
        !!(
          intro.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING
        ) &&
        !!(
          note.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING
        )
      )
    }),
    'the note is between the intro and the first operation',
  ).toBe(true)
  const frenchApi = await operationsOf(page)
  expect(frenchApi.map((o) => o.id)).toEqual(englishApi.map((o) => o.id))
  frenchApi.forEach((operation, index) => {
    const english = englishApi[index]!
    expect(operation.summaryLang, `${operation.id} summary`).toBe('en')
    expect(operation.summary).toBe(english.summary)
    expect(operation.description).toBe(english.description)
    if (operation.description !== null)
      expect(operation.descriptionLang, `${operation.id} description`).toBe(
        'en',
      )
  })
  await beat(page, 1800)

  // ── 5 · THE CLI PAGE IN FRENCH ──────────────────────────────────────────
  chapter('The CLI page in French')
  const commandsOf = (p: Page) =>
    p.evaluate(() =>
      Array.from(document.querySelectorAll('li'))
        .filter(
          (li) =>
            li.querySelector(':scope > code') && li.querySelector(':scope > p'),
        )
        .map((li) => {
          const description = li.querySelector(':scope > p')!
          return {
            invocation: li.querySelector(':scope > code')!.textContent ?? '',
            description: (description.textContent ?? '').trim(),
            descriptionLang: description.getAttribute('lang'),
            options: Array.from(li.querySelectorAll('dl > div')).map((row) => ({
              flags: row.querySelector('dt')?.textContent ?? '',
              description: (row.querySelector('dd')?.textContent ?? '').trim(),
              descriptionLang: row.querySelector('dd')?.getAttribute('lang'),
            })),
          }
        }),
    )

  await page.goto('/docs/cli')
  await expect(html(page)).toHaveAttribute('lang', 'en')
  await expect(page.locator('li > code').first()).toBeVisible()
  const englishCli = await commandsOf(page)
  const englishCliIntro = await firstParagraph(page)
  expect(englishCli.length).toBeGreaterThan(5)

  await page.goto('/fr/docs/cli')
  await expect(html(page)).toHaveAttribute('lang', 'fr')
  await expect(page.locator('li > code').first()).toBeVisible()
  expect(await firstParagraph(page)).not.toBe(englishCliIntro)
  await expect(page.getByText(t('fr', 'docs.notes.beingUpdated'))).toHaveCount(
    0,
  )
  await expect(
    page
      .getByRole('note')
      .filter({ hasText: t('fr', 'docs.notes.generatedReference.cli') }),
  ).toHaveCount(1)
  const frenchCli = await commandsOf(page)
  expect(frenchCli.map((c) => c.invocation)).toEqual(
    englishCli.map((c) => c.invocation),
  )
  frenchCli.forEach((command, index) => {
    const english = englishCli[index]!
    expect(command.description, command.invocation).toBe(english.description)
    expect(command.descriptionLang, command.invocation).toBe('en')
    expect(command.options.map((o) => o.flags)).toEqual(
      english.options.map((o) => o.flags),
    )
    command.options.forEach((option, i) => {
      expect(option.description).toBe(english.options[i]!.description)
      expect(
        option.descriptionLang,
        `${command.invocation} ${option.flags}`,
      ).toBe('en')
    })
  })
  await beat(page, 1800)

  // ── 5a · THE GENERATED REFERENCES IN TRADITIONAL CHINESE ────────────────
  chapter('The API and CLI references in Traditional Chinese')
  await page.goto('/zh-tw/docs/api')
  await expect(html(page)).toHaveAttribute('lang', 'zh-TW')
  await expect(page.locator('section[id] > h2').first()).toBeVisible()
  expect(await firstParagraph(page)).not.toBe(englishApiIntro)
  const twApiNote = page
    .getByRole('note')
    .filter({ hasText: t('zh-tw', 'docs.notes.generatedReference.openapi') })
  await expect(twApiNote).toHaveCount(1)
  expect(
    await twApiNote.evaluate((note) => {
      const intro = document.querySelector('main p:not(nav p)')!
      const first = document.querySelector('section[id]')!
      return (
        !!(
          intro.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING
        ) &&
        !!(
          note.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING
        )
      )
    }),
    'the zh-tw note is between the intro and the first operation',
  ).toBe(true)
  const taiwanApi = await operationsOf(page)
  expect(taiwanApi.map((o) => o.id)).toEqual(englishApi.map((o) => o.id))
  taiwanApi.forEach((operation, index) => {
    const english = englishApi[index]!
    expect(operation.summaryLang, `${operation.id} summary`).toBe('en')
    expect(operation.summary).toBe(english.summary)
    expect(operation.description).toBe(english.description)
    if (operation.description !== null)
      expect(operation.descriptionLang, `${operation.id} description`).toBe(
        'en',
      )
  })
  await beat(page, 1200)

  await page.goto('/zh-tw/docs/cli')
  await expect(html(page)).toHaveAttribute('lang', 'zh-TW')
  await expect(page.locator('li > code').first()).toBeVisible()
  expect(await firstParagraph(page)).not.toBe(englishCliIntro)
  await expect(
    page
      .getByRole('note')
      .filter({ hasText: t('zh-tw', 'docs.notes.generatedReference.cli') }),
  ).toHaveCount(1)
  const taiwanCli = await commandsOf(page)
  expect(taiwanCli.map((c) => c.invocation)).toEqual(
    englishCli.map((c) => c.invocation),
  )
  taiwanCli.forEach((command, index) => {
    const english = englishCli[index]!
    expect(command.description, command.invocation).toBe(english.description)
    expect(command.descriptionLang, command.invocation).toBe('en')
    command.options.forEach((option, i) => {
      expect(option.description).toBe(english.options[i]!.description)
      expect(option.descriptionLang).toBe('en')
    })
  })
  await beat(page, 1800)

  // ── 6 · THE SPANISH RAIL WALK ───────────────────────────────────────────
  chapter('Every docs page in Spanish, by the rail')
  // The English side of the comparison: each page's own-prose sentences.
  await browserLanguage(page, 'en-US,en')
  const englishProse = new Map<string, string[]>()
  for (const route of DOCS_ROUTES) {
    await page.goto(route)
    await expect(html(page)).toHaveAttribute('lang', 'en')
    await expect(main(page).locator('h1').first()).toBeVisible()
    englishProse.set(route, await ownProseNodes(page))
  }
  const englishSentences = [...englishProse.values()].flat()
  expect(
    englishSentences.length,
    'the English pages have prose to compare against',
  ).toBeGreaterThan(20)
  // THE PREDICATE FIRES: an English page measured against itself is all leftovers.
  expect(
    englishLeftovers(englishSentences, englishSentences).length,
    'the no-English predicate catches an English page',
  ).toBe(englishSentences.filter((s) => !VERBATIM.has(s)).length)

  /** The checks every translated page owes, run on the page the walk reached. */
  async function checkDocsPage(locale: Locale, route: string) {
    await expect(html(page)).toHaveAttribute('lang', LOCALE_BCP47[locale])
    await expect(main(page).locator('h1').first()).toBeVisible()
    await expect(
      page.getByText(t(locale, 'docs.notes.beingUpdated')),
      `${route}: the being-updated note`,
    ).toHaveCount(0)
    const text = await page.evaluate(() => document.body.innerText)
    expect(text, `${route}: a placeholder reached the page`).not.toMatch(
      /\{\{(slot|value|part):/,
    )
    const keys = [...text.matchAll(KEY_PATH)]
      .map((m) => m[0])
      // `docs.motir.co` is a hostname the pages print, not a key: only a path
      // that begins a real catalogue key counts.
      .filter((path) => REAL_KEYS.some((key) => key.startsWith(path)))
    expect(keys, `${route}: a raw catalogue key is visible`).toEqual([])
    const own = await ownProseNodes(page)
    const english = englishProse.get(route) ?? []
    expect(
      englishLeftovers(english, own),
      `${route}: English sentences in Motir's own prose`,
    ).toEqual([])
    console.log(
      `${route}: ${english.length} English sentences absent from ${own.length} ${locale} text nodes`,
    )
  }

  /** Every docs page in one language, reached by clicking its rail. */
  async function railWalk(locale: Locale) {
    await freshVisitor(page, 'en-US,en')
    await page.goto(`/${locale}/docs`)
    const railOf = () =>
      page.getByRole('navigation', { name: t(locale, 'docs.indexTitle') })
    await expect(railOf()).toBeVisible()
    const visited: string[] = []
    const unprefixed = (href: string) => href.replace(`/${locale}`, '') || '/'

    /** Click a rail entry by its href and wait for the page it leads to. */
    async function clickRailEntry(href: string) {
      await railOf().locator(`a[href="${href}"]`).click()
      await expect(page).toHaveURL(`${SITE_ORIGIN}${href}`)
      await expect(
        railOf().locator(`a[href="${href}"]`),
        `${href} is the rail's current page`,
      ).toHaveAttribute('aria-current', 'page')
    }

    const hrefsOf = (scope: Locator) =>
      scope
        .locator('a')
        .evaluateAll((as) =>
          as
            .map((a) => a.getAttribute('href') ?? '')
            .filter((h) => !h.includes('#')),
        )
    const tierOne = await hrefsOf(railOf())
    expect(tierOne.length).toBeGreaterThan(5)
    for (const href of tierOne) {
      if (href === `/${locale}/docs`) {
        // The walk starts here.
        await checkDocsPage(locale, '/docs')
        visited.push('/docs')
      } else {
        await clickRailEntry(href)
        await checkDocsPage(locale, unprefixed(href))
        visited.push(unprefixed(href))
      }
      // A surface's own pages appear in the rail only inside it: click those too.
      const own = (await hrefsOf(railOf())).filter((h) => !tierOne.includes(h))
      for (const sub of own) {
        await clickRailEntry(sub)
        await checkDocsPage(locale, unprefixed(sub))
        visited.push(unprefixed(sub))
      }
      await beat(page, 400)
    }
    // No page skipped, none visited twice: the rail's routes are the site's routes.
    expect([...visited].sort()).toEqual([...DOCS_ROUTES].sort())
    console.log(`${locale} rail walk visited: ${visited.join(' ')}`)
  }

  await railWalk('es')
  await beat(page, 1200)

  // ── 6a · THE TRADITIONAL CHINESE RAIL WALK (MOTIR-8937) ─────────────────
  chapter('Every docs page in Traditional Chinese, by the rail')
  await railWalk('zh-tw')
  await beat(page, 1200)

  // ── 7 · A DEEP LINK UNDER /pl ───────────────────────────────────────────
  chapter('A deep link into the API reference under /pl')
  await browserLanguage(page, 'en-US,en')
  await page.goto('/docs/api')
  const englishRail = page.getByRole('navigation', {
    name: t('en', 'docs.indexTitle'),
  })
  const thirdHref = await englishRail
    .locator('a[href^="/docs/api#"]')
    .nth(2)
    .getAttribute('href')
  const anchor = thirdHref!.split('#')[1]!
  const pathText = (p: Page) =>
    p.locator(`[id="${anchor}"] span.break-all`).first().textContent()
  const englishPath = await pathText(page)
  expect(englishPath).toBeTruthy()

  await freshVisitor(page, 'en-US,en')
  await page.goto(`/pl/docs/api#${anchor}`)
  await expect(html(page)).toHaveAttribute('lang', 'pl')
  const target = page.locator(`[id="${anchor}"]`)
  await expect(target).toHaveCount(1)
  await expect(target).toBeInViewport()
  expect(await pathText(page)).toBe(englishPath)
  await beat(page, 1800)

  // Case 8 (a German page whose English moved on) edited `content/docs` while
  // the server ran and watched `/de/docs/sentry` go stale, which a built site
  // cannot do: the docs are rendered once, at build (MOTIR-10649). The stale
  // translation's note and English body are asserted on the built render in
  // the docs unit suite.
})
