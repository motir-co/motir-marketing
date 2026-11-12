import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { SITE_ORIGIN } from '../stub/origin'
import { t } from '../support/catalogue'
import {
  TRANSFER_BASIS_SECTION,
  VENDOR_SECTIONS as SEAM_SECTIONS,
} from '../../lib/legal/subprocessorSeam'
import { settleFonts } from '../support/fontFaces'

/*
 * ⚠️ THE ACCEPTANCE WALK FOR THE AWS DISCLOSURE (MOTIR-10954) — Story
 * MOTIR-9716, PACED FOR A PERSON TO WATCH.
 *
 * The subprocessor page and the DPA, as the site's build publishes them at
 * `/legal/subprocessors` and `/legal/dpa`, read by one signed-out visitor in
 * English: ONE test, ONE context, ONE page, so the run yields ONE video. Five
 * chapters:
 *
 *   1. The Amazon Web Services row, cell by cell.
 *   2. What the page no longer discloses (Tigris, Resend, Amazon SES as its own
 *      row, Fly.io hosting Motir) and what it narrows (Fly.io, Neon).
 *   3. The transfer bases, and the two bumped dates (version, Last reviewed).
 *   4. The agreement: its version, no company restated, its pointers to the
 *      page, and section 6's objection window.
 *   5. The two routes' own health.
 *
 * ── WHAT "PUBLISHED" MEANS HERE ─────────────────────────────────────────────
 *
 * The artefact the site's build produces, served by the lane's Worker — not
 * the deployed site. Both routes are prerendered from `content/legal/`, so the
 * bytes this lane serves are the bytes a release ships. What production shows
 * after a deploy, and whether it agrees with the manifest motir-core serves, is
 * `tests/seam/subprocessorSeamLive.test.ts`'s, post-merge.
 *
 * ── A VENDOR ROW IS PARSED AS THE SEAM PARSES IT ────────────────────────────
 *
 * `lib/legal/subprocessorSeam.ts` `vendorsInSections`: a table row whose first
 * cell OPENS with a bolded span, inside a section `VENDOR_SECTIONS` lists, and
 * the vendor is that span — the entity in parentheses after it is not part of
 * it. `parseBody` below does the same over the RENDERED DOM, so the spec reads
 * what a visitor is shown rather than the Markdown the seam already proves.
 * The section list is imported from the seam module (it is pure and imports
 * nothing), so the two cannot disagree about which tables name vendors.
 *
 * ── THE NEGATIVES ARE ROW-SCOPED, NEVER PAGE-SCOPED ─────────────────────────
 *
 * The page records Tigris's and Resend's removal BY NAME in its own change log
 * and in the dated "Updated" note under the core table. A page-wide absence
 * check would forbid the page from keeping its history and go red on a
 * correct page. So the spec asserts what the DISCLOSURE must stop saying: no
 * vendor row, no transfer-basis row, no bucket paragraph naming Tigris, and no
 * present-tense sentence saying Motir's products are hosted by Fly.io.
 *
 * ── WHERE EACH EXPECTATION COMES FROM ───────────────────────────────────────
 *
 * - The site's own copy (the version line) is read through
 *   `e2e/support/catalogue.ts`; nothing is typed.
 * - The expected VERSION is read from each content file's front matter with
 *   `readFileSync`. The legal loader is deliberately NOT imported:
 *   `lib/legal/documents.ts` → `lib/destinations.ts` → `lib/appOrigin.ts`,
 *   which throws at import when `PUBLIC_MOTIR_APP_ORIGIN` is unset — as it is
 *   in the Playwright runner process.
 * - The disclosure's FACTS are the requirement's (Story MOTIR-9716, requirement
 *   Q1's `us-east-1`), matched by the alternations declared once in `FACTS`
 *   below. The page card owns the exact phrasing; widen a constant there
 *   rather than hunting sentences.
 * - The baselines the bumps are measured against were read on `main` at
 *   e4b496a, before either merge: the page at 1.0.2 reviewed 2026-08-27, the
 *   agreement at 1.0.0. A patch or a minor bump passes; a forgotten one fails.
 *
 * ── PACING ──────────────────────────────────────────────────────────────────
 *
 * Every `beat()` is pacing for the recording, NOT a wait for state: each
 * assertion waits on a response, a URL, rendered text or the font set
 * settling. `spotlight()` scrolls the element being checked into view and
 * outlines it, so a reviewer can follow which row is under test; it changes
 * only an inline outline, never content. The chapter list is MEASURED, and is
 * written beside the recording after the test.
 *
 * ── THE RECORDING ───────────────────────────────────────────────────────────
 *
 * `playwright.config.ts` records every run (`video: 'on'`) and its header
 * records why CI uploads nothing: the agent that runs this spec publishes the
 * clip onto the card over the Motir MCP surface. This file adds no workflow,
 * secret or upload step, and must not.
 */

test.setTimeout(300_000)

/** The facts the disclosure must state, as the requirement states them. */
const FACTS = {
  aws: 'Amazon Web Services',
  awsPurpose: {
    hosting: /application hosting/i,
    postgres: /managed PostgreSQL/i,
    storage: /object storage/i,
    codeGraph: /code-graph snapshots/i,
  },
  /** Requirement Q1 (MOTIR-9701, approved 2026-10-27). */
  region: /\bus-east-1\b/,
  /** The narrowed purpose of Fly.io and Neon — the applications Motir hosts. */
  hostedApps: /\bapplications? (?:you ask Motir to host|Motir hosts)\b/i,
  primaryDatabase: /\bprimary database/i,
  /**
   * Where motir-core, motir-ai and motir-gateway run, said in the present.
   * `\s+`, not a space: the Markdown wraps lines, and the DOM keeps the break.
   */
  awsHostsProducts:
    /\b(?:are|is)\s+(?:hosted\s+by|run\s+on|deployed\s+on)\s+Amazon\s+Web\s+Services\b/,
  flyHostsProducts:
    /\b(?:are|is)\s+(?:hosted\s+by|hosted\s+on|run\s+on|running\s+on|deployed\s+on)\s+Fly\.io\b/,
  ourProducts: ['motir-core', 'motir-ai', 'motir-gateway'],
  /** The AWS basis row names AWS's own published terms… */
  awsTerms: /AWS Data Processing Addendum|AWS Service Terms/,
  /** …and the date they were read. */
  dateRead: /\bread (\d{4}-\d{2}-\d{2})\b/,
  /** Section 6: the window reaches a CHANGE, not only an addition. */
  objection: {
    thirtyDays: /\bwithin thirty days\b/,
    addition: /\bof an addition\b/,
    change: /\ba change to an existing subprocessor's\b/,
    purposes: /\bpurposes\b/,
    data: /\b(?:the )?(?:Customer )?Data it reaches\b/i,
    location: /\bwhere it processes it\b|\bits location\b/,
  },
  removed: ['Tigris', 'Resend'],
  sesAlone: 'Amazon SES',
} as const

const BASELINE = {
  subprocessorsVersion: '1.0.2',
  subprocessorsReviewed: '2026-08-27',
  dpaVersion: '1.0.0',
} as const

const VENDOR_SECTIONS = SEAM_SECTIONS['subprocessors.md']!

/* ── front matter, read from disk (see the header) ─────────────────────── */

function frontMatter(slug: string): Record<string, string> {
  const raw = readFileSync(
    join(process.cwd(), 'content', 'legal', `${slug}.md`),
    'utf8',
  )
  const block = /^---\n([\s\S]*?)\n---/.exec(raw)
  if (!block) throw new Error(`content/legal/${slug}.md has no front matter`)
  return Object.fromEntries(
    block[1]!
      .split('\n')
      .map((line) => /^(\w+):\s*(.*)$/.exec(line))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => [m[1]!, m[2]!.trim()]),
  )
}

const semver = (v: string) => v.split('.').map(Number)
const above = (v: string, base: string) => {
  const [a, b] = [semver(v), semver(base)]
  for (let i = 0; i < 3; i++)
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  return false
}

const versionLine = (version: string) =>
  t('en', 'legal.versionNotYetEffective').replace('{version}', version)

/* ── pacing (NOT waits for state — see the header) ─────────────────────── */

const beat = (page: Page, ms = 900) => page.waitForTimeout(ms)

let lit: Locator | null = null
/** Scroll `el` into view and outline it, clearing the previous one. */
async function spotlight(page: Page, el: Locator, ms = 1000) {
  if (lit)
    await lit
      .evaluate((node) => ((node as HTMLElement).style.outline = ''))
      .catch(() => undefined)
  await el.scrollIntoViewIfNeeded()
  await el.evaluate((node) => {
    const s = (node as HTMLElement).style
    s.outline = '3px solid currentColor'
    s.outlineOffset = '2px'
  })
  lit = el
  await beat(page, ms)
}

/* CHAPTERS ARE MEASURED, NEVER AUTHORED. */
const chapters: { label: string; tSeconds: number }[] = []
const startedAt = Date.now()
const chapter = (label: string) => {
  lit = null
  chapters.push({ label, tSeconds: (Date.now() - startedAt) / 1000 })
}

test.afterEach(({}, testInfo) => {
  writeFileSync(
    testInfo.outputPath('chapters.json'),
    JSON.stringify(chapters, null, 2),
  )
})

/* ── the rendered body, parsed as the seam parses the Markdown ─────────── */

/** The document body: `MarkdownBody`'s div, after the page's header. */
const bodyOf = (page: Page) => page.locator('main header + div')
const rowsOf = (page: Page) => bodyOf(page).locator('tbody tr')

interface Row {
  /** Index into `rowsOf(page)`, so a row can be spotlit. */
  index: number
  section: string
  /** The cell's opening bolded span, or null when it does not open with one. */
  firstBold: string | null
  /** Cell text by the table's own header text. */
  cells: Record<string, string>
}
interface Body {
  rows: Row[]
  /** Text of each section, keyed by its heading, in order. */
  sections: { heading: string; text: string }[]
}

async function parseBody(page: Page): Promise<Body> {
  return bodyOf(page).evaluate((root) => {
    const rows: Row[] = []
    const sections: { heading: string; text: string }[] = [
      { heading: '', text: '' },
    ]
    const allRows = [...root.querySelectorAll('tbody tr')]
    for (const child of [...root.children]) {
      if (/^H[1-6]$/.test(child.tagName)) {
        sections.push({ heading: child.textContent!.trim(), text: '' })
        continue
      }
      const current = sections[sections.length - 1]!
      current.text += ' ' + (child as HTMLElement).innerText
      const tables =
        child.tagName === 'TABLE'
          ? [child]
          : [...child.querySelectorAll('table')]
      for (const table of tables) {
        const headers = [...table.querySelectorAll('thead th')].map((th) =>
          th.textContent!.trim(),
        )
        for (const tr of table.querySelectorAll('tbody tr')) {
          const tds = [...tr.querySelectorAll('td')]
          const first = tds[0]
          const strong = first?.firstElementChild
          const opens =
            strong?.tagName === 'STRONG' &&
            first!.textContent!.trimStart().startsWith(strong.textContent!)
          rows.push({
            index: allRows.indexOf(tr),
            section: current.heading,
            firstBold: opens ? strong!.textContent!.trim() : null,
            cells: Object.fromEntries(
              tds.map((td, i) => [
                headers[i] ?? String(i),
                (td as HTMLElement).innerText.trim(),
              ]),
            ),
          })
        }
      }
    }
    return { rows, sections }
  }) as Promise<Body>
}

const inSections = (row: Row, prefixes: readonly string[]) =>
  prefixes.some((p) => row.section.startsWith(p))
const sectionText = (body: Body, prefix: string) =>
  body.sections
    .filter((s) => s.heading.startsWith(prefix))
    .map((s) => s.text)
    .join(' ')
/** Sentences, as a reader splits them: on a full stop before a space. */
const sentences = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)

test('the published subprocessor page and DPA carry the AWS disclosure, as Story MOTIR-9716 asks', async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.context().clearCookies()

  const page_ = frontMatter('subprocessors')
  const dpa_ = frontMatter('dpa')
  const note = page.locator('[role="note"]')
  const h1 = page.locator('h1')
  const header = page.locator('main header p')

  // ── 1 ─────────────────────────────────────────────────────────────────────
  chapter('1 · The Amazon Web Services row, cell by cell')
  const opened = await page.goto('/legal/subprocessors')
  expect(opened?.status()).toBe(200)
  await expect(h1).toHaveText(page_['title']!)
  await expect(h1).toHaveAttribute('lang', 'en')
  // English documents shown in English carry no binding-English note.
  await expect(note).toHaveCount(0)
  await settleFonts(page)
  await beat(page, 1500)

  const body = await parseBody(page)
  const vendorRows = body.rows.filter(
    (r) => r.firstBold !== null && inSections(r, VENDOR_SECTIONS),
  )
  const basisRows = body.rows.filter(
    (r) => r.firstBold !== null && r.section.startsWith(TRANSFER_BASIS_SECTION),
  )
  expect(vendorRows.length, 'the vendor sections render rows').toBeGreaterThan(
    0,
  )

  const awsRows = vendorRows.filter((r) => r.firstBold === FACTS.aws)
  expect(awsRows, 'exactly one Amazon Web Services vendor row').toHaveLength(1)
  const aws = awsRows[0]!
  const awsRow = rowsOf(page).nth(aws.index)
  await spotlight(page, awsRow, 1500)

  const purpose = aws.cells['Purpose'] ?? ''
  for (const [fact, pattern] of Object.entries(FACTS.awsPurpose))
    expect(purpose, `AWS Purpose names ${fact}`).toMatch(pattern)
  await spotlight(page, awsRow.locator('td').nth(1), 1200)
  expect((aws.cells['Data reached'] ?? '').length).toBeGreaterThan(0)
  await spotlight(page, awsRow.locator('td').nth(2), 1000)
  expect(aws.cells['Location'] ?? '').toMatch(FACTS.region)
  await spotlight(page, awsRow.locator('td').nth(3), 1000)

  // Amazon SES is folded into the AWS row: no row anywhere opens with it.
  expect(
    body.rows.filter((r) => r.firstBold === FACTS.sesAlone),
    'no Amazon SES row on the page',
  ).toEqual([])
  await beat(page, 1000)

  // ── 2 ─────────────────────────────────────────────────────────────────────
  chapter('2 · Tigris and Resend gone; Fly.io and Neon narrowed')
  for (const name of FACTS.removed) {
    expect(
      vendorRows.filter((r) => r.firstBold === name),
      `no ${name} vendor row`,
    ).toEqual([])
    expect(
      basisRows.filter((r) => r.firstBold === name),
      `no ${name} transfer-bases row`,
    ).toEqual([])
  }

  const buckets = bodyOf(page)
    .locator('p')
    .filter({ hasText: /Amazon S3 buckets/ })
  await expect(buckets).toHaveCount(1)
  await spotlight(page, buckets, 1500)
  const bucketText = await buckets.innerText()
  expect(bucketText).toContain('Amazon S3')
  expect(bucketText).not.toMatch(/Tigris/)
  // The three names, exactly as the merged page names them.
  const source = readFileSync(
    join(process.cwd(), 'content', 'legal', 'subprocessors.md'),
    'utf8',
  )
  const bucketSource = /\*\*The three Amazon S3 buckets\*\*[\s\S]*?\n\n/.exec(
    source,
  )?.[0]
  const bucketNames = [
    ...(bucketSource ?? '').matchAll(/`(motir-[a-z-]+)`/g),
  ].map((m) => m[1]!)
  expect(bucketNames, 'the merged page names three buckets').toHaveLength(3)
  for (const name of bucketNames) expect(bucketText).toContain(name)

  const ai = bodyOf(page)
    .locator('p')
    .filter({ hasText: FACTS.awsHostsProducts })
  await expect(ai).toHaveCount(1)
  await spotlight(page, ai, 1500)
  const aiSection =
    sectionText(body, 'AI features') +
    sectionText(body, '⚠️ Three of the names')
  for (const product of FACTS.ourProducts) expect(aiSection).toContain(product)
  // No present-tense sentence anywhere in the disclosure says Fly.io hosts
  // them. The change log keeps its history, so it is not read.
  const disclosure = body.sections
    .filter((s) => !s.heading.startsWith('Changes to this list'))
    .map((s) => s.text)
    .join(' ')
  expect(
    sentences(disclosure).filter((s) => FACTS.flyHostsProducts.test(s)),
    'no present-tense claim that Fly.io hosts Motir',
  ).toEqual([])

  for (const name of ['Fly.io', 'Neon']) {
    const row = vendorRows.find((r) => r.firstBold === name)
    expect(row, `${name} is still disclosed`).toBeDefined()
    await spotlight(
      page,
      rowsOf(page).nth(row!.index).locator('td').nth(1),
      1500,
    )
    expect(row!.cells['Purpose']).toMatch(FACTS.hostedApps)
    if (name === 'Neon')
      expect(row!.cells['Purpose']).not.toMatch(FACTS.primaryDatabase)
  }

  // ── 3 ─────────────────────────────────────────────────────────────────────
  chapter('3 · The transfer bases, the version and the review date')
  await spotlight(
    page,
    bodyOf(page).getByRole('heading', { name: TRANSFER_BASIS_SECTION }),
  )
  const basisNames = new Set(basisRows.map((r) => r.firstBold))
  for (const vendor of vendorRows)
    expect(
      basisNames.has(vendor.firstBold),
      `${vendor.firstBold} has a basis row`,
    ).toBe(true)
  const awsBasis = basisRows.find((r) => r.firstBold === FACTS.aws)
  expect(awsBasis, 'Amazon Web Services has a transfer-bases row').toBeDefined()
  const readFrom = awsBasis!.cells['Read from'] ?? ''
  await spotlight(
    page,
    rowsOf(page).nth(awsBasis!.index).locator('td').last(),
    1800,
  )
  expect(readFrom).toMatch(FACTS.awsTerms)
  expect(readFrom).toMatch(FACTS.dateRead)

  await page.evaluate(() => window.scrollTo(0, 0))
  await spotlight(page, header, 1500)
  expect(above(page_['version']!, BASELINE.subprocessorsVersion)).toBe(true)
  await expect(header).toHaveText(versionLine(page_['version']!))

  const reviewedLine = bodyOf(page)
    .locator('p')
    .filter({ hasText: /^Last reviewed: \d{4}-\d{2}-\d{2}/ })
  await expect(reviewedLine).toHaveCount(1)
  await spotlight(page, reviewedLine, 1200)
  const reviewed = /Last reviewed: (\d{4}-\d{2}-\d{2})/.exec(
    await reviewedLine.innerText(),
  )![1]!
  expect(reviewed > BASELINE.subprocessorsReviewed).toBe(true)
  const passRows = body.rows.filter((r) => 'Pass' in r.cells)
  expect(passRows.map((r) => r.firstBold)).toEqual([
    'Repository read',
    'Platform read',
    'Vendor read',
  ])
  for (const pass of passRows) {
    await spotlight(page, rowsOf(page).nth(pass.index), 1000)
    expect(pass.cells['Date']).toBe(reviewed)
  }

  // ── 4 ─────────────────────────────────────────────────────────────────────
  chapter('4 · The agreement: version, no restated vendor, its pointers')
  const disclosed = new Set(
    [...vendorRows, ...basisRows].map((r) => r.firstBold!),
  )
  const agreement = await page.goto('/legal/dpa')
  expect(agreement?.status()).toBe(200)
  await expect(h1).toHaveText('Data Processing Agreement')
  await expect(h1).toHaveText(dpa_['title']!)
  await expect(note).toHaveCount(0)
  await settleFonts(page)
  await spotlight(page, header, 1500)
  expect(above(dpa_['version']!, BASELINE.dpaVersion)).toBe(true)
  await expect(header).toHaveText(versionLine(dpa_['version']!))

  const dpa = await parseBody(page)
  const dpaText = dpa.sections.map((s) => s.text).join(' ')
  const words = (name: string) =>
    new RegExp(
      `(?<![\\w-])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`,
    )
  expect(
    [...disclosed].filter((name) => words(name).test(dpaText)),
    'the agreement restates no disclosed company',
  ).toEqual([])

  const section = (prefix: string) =>
    bodyOf(page).getByRole('heading', { name: new RegExp(`^${prefix}`) })
  // §5 points at the platforms of §6; §6 names the page; Annex III is the
  // published list; §7 links to it.
  await spotlight(page, section('5\\. Security'), 900)
  expect(sectionText(dpa, '5. Security')).toMatch(/the platforms in §6/)
  await spotlight(page, section('6\\. Subprocessors'), 900)
  const s6 = sectionText(dpa, '6. Subprocessors')
  expect(s6).toContain('/legal/subprocessors')
  const window_ = bodyOf(page)
    .locator('p')
    // §10's deletion window is also thirty days: the objection clause is
    // the one that counts from an addition.
    .filter({ hasText: /thirty\s+days\s+of\s+an\s+addition/ })
  await expect(window_).toHaveCount(1)
  await spotlight(page, window_, 2000)
  const clause = (await window_.innerText()).replace(/\s+/g, ' ')
  for (const [part, pattern] of Object.entries(FACTS.objection))
    expect(clause, `section 6 window: ${part}`).toMatch(pattern)

  const annex = bodyOf(page)
    .locator('li')
    .filter({ hasText: /^Annex III/ })
  await expect(annex).toHaveCount(1)
  await spotlight(page, annex, 1200)
  await expect(annex).toContainText('the published subprocessor list')

  await spotlight(page, section('7\\. International transfers'), 900)
  const link = bodyOf(page).getByRole('link', { name: '/legal/subprocessors' })
  await expect(link).toHaveCount(1)
  await spotlight(page, link, 1500)
  await Promise.all([
    page.waitForURL(`${SITE_ORIGIN}/legal/subprocessors`),
    link.click(),
  ])
  await expect(h1).toHaveText(page_['title']!)
  await beat(page, 1500)

  // ── 5 ─────────────────────────────────────────────────────────────────────
  chapter('5 · Both routes are healthy')
  for (const [path, title] of [
    ['/legal/subprocessors', page_['title']!],
    ['/legal/dpa', dpa_['title']!],
  ] as const) {
    const res = await page.goto(path)
    expect(res?.status(), path).toBe(200)
    expect(res?.headers()['content-type'], path).toMatch(/text\/html/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(h1).toHaveText(title)
    await expect(note).toHaveCount(0)
    // The version line never shows the front matter's literal `TBD`.
    await expect(header).not.toContainText('TBD')
    await beat(page, 1500)
  }
  expect(pageErrors, 'no script error on either route').toEqual([])
  await beat(page, 1000)
})
