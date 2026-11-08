import { writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { SITE_ORIGIN, STUB_ORIGIN } from '../stub/origin'

/*
 * ⚠️ THE ACCEPTANCE WALK FOR STORY MOTIR-6976 (MOTIR-7084) — "Motir on Claude
 * ships", on motir.co. A reader opens /docs/mcp and finds Add Motir to Claude,
 * copies the Claude Code command, finds the token route below it, follows the
 * hints to /docs/mcp/tools and sees each tool's title with a Reads, Writes or
 * Destructive chip, opens /docs/skills installing the plugin from a release tag
 * with its three things, and reaches the privacy notice's passage on connected AI clients.
 * PACED FOR A PERSON TO WATCH.
 *
 * The first test is the RECEIPT: its recording is published onto the story and
 * a reviewer accepts on it, so it is deliberately slowed between steps. Every
 * `beat()` is PACING, not a wait for state; every assertion still waits on an
 * authoritative signal (a role, a URL, text).
 *
 * ⚠️ THE LANE STUBS THE APP. `STUB_ORIGIN` is this build's `APP_ORIGIN`, so the
 * server URL the page prints here is `${STUB_ORIGIN}/api/mcp` — in production
 * the same interpolation prints `https://app.motir.co/api/mcp`. The real
 * claude.ai sign-in and the plugin install are not browser-reachable here: they
 * are MOTIR-7076's and MOTIR-7075's.
 *
 * ⚠️ AND THE CATALOGUE IS READ AT BUILD (MOTIR-10649). `/docs/mcp/tools` is built
 * ahead from the stub's recorded catalogue, so the page shows that answer and
 * no spec can change it between two loads. The file still runs SERIALLY and
 * puts the stub's mode back after every test, so a mode a later spec sets
 * cannot leak.
 */

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)

/** Pacing for the recording — "look at this" beats, as MOTIR-6749's. */
const beat = (page: Page, ms = 1600) => page.waitForTimeout(ms)

const chapters: { label: string; tSeconds: number }[] = []
let startedAt = Date.now()
const chapter = (label: string) => {
  chapters.push({ label, tSeconds: (Date.now() - startedAt) / 1000 })
}

async function catalogueMode(mode: 'recorded' | 'stripped' | 'failing') {
  const res = await fetch(`${STUB_ORIGIN}/__stub/mcp-tools?mode=${mode}`, {
    method: 'POST',
  })
  expect(res.status, `stub mode ${mode}`).toBe(204)
}

test.afterEach(async ({}, testInfo) => {
  await catalogueMode('recorded')
  if (chapters.length) {
    writeFileSync(
      testInfo.outputPath('chapters.json'),
      JSON.stringify(chapters, null, 2),
    )
    chapters.length = 0
  }
})

const SERVER_URL = `${STUB_ORIGIN}/api/mcp`

/** A tool's row on /docs/mcp/tools, by the anchor its name carries. */
const toolRow = (page: Page, name: string) =>
  page.locator('li', { has: page.locator(`[id="tool-${name}"]`) })

test.describe('the receipt', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

  test('a reader adds Motir to Claude, as MOTIR-6976 asks to be accepted', async ({
    page,
  }) => {
    startedAt = Date.now()

    // ── 1 · /docs/mcp LEADS WITH ADD MOTIR TO CLAUDE ─────────────────────────
    chapter('/docs/mcp — Add Motir to Claude comes first')
    await page.goto(`${SITE_ORIGIN}/docs/mcp`)
    const firstSection = page.getByRole('heading', { level: 2 }).first()
    await expect(firstSection).toHaveText('Add Motir to Claude')
    await beat(page)

    for (const [id, client] of [
      ['claude-ai', 'claude.ai'],
      ['claude-desktop', 'Claude desktop app'],
      ['claude-code', 'Claude Code'],
    ] as const) {
      chapter(`The ${client} steps`)
      // The document form puts the id on the h3 itself (MOTIR-8055); the steps and
      // the config block follow it, so the block is the first <pre> after it.
      const heading = page.locator(`h3#${id}`)
      await heading.scrollIntoViewIfNeeded()
      await expect(heading).toHaveText(client)
      await expect(heading.locator('xpath=following::pre[1]')).toContainText(
        SERVER_URL,
      )
      await beat(page, 2400)
    }

    chapter('Copy the Claude Code command')
    const copyButton = page.getByRole('button', {
      name: 'Copy the Claude Code command',
    })
    await copyButton.click()
    await expect(copyButton).toHaveText('Copied')
    const held = await page.evaluate(() => navigator.clipboard.readText())
    expect(held).toBe(`claude mcp add --transport http motir ${SERVER_URL}`)
    await beat(page)

    chapter('What you approve, and where to revoke it')
    const revoke = page.getByRole('link', { name: 'Connected apps' })
    await revoke.scrollIntoViewIfNeeded()
    await expect(revoke).toHaveAttribute(
      'href',
      `${STUB_ORIGIN}/settings/account/tokens#connected-apps`,
    )
    await beat(page, 2400)

    chapter('The token route, kept below for other clients and CI')
    const tokenRoute = page.getByRole('heading', {
      level: 2,
      name: 'Other clients and CI: use a token',
    })
    await tokenRoute.scrollIntoViewIfNeeded()
    await expect(page.locator('#token')).toBeAttached()
    await expect(page.locator('#wire')).toBeAttached()
    await expect(page.locator('#check')).toBeAttached()
    await beat(page, 2400)

    // ── 2 · THE HINTS ON /docs/mcp/tools ─────────────────────────────────────
    chapter('Follow the hints to /docs/mcp/tools')
    await page
      .locator('#consent ~ p')
      .getByRole('link', { name: 'MCP tools' })
      .first()
      .click()
    await expect(page).toHaveURL(`${SITE_ORIGIN}/docs/mcp/tools`)
    await expect(
      page.getByText('Each tool says what it does to your data:'),
    ).toBeVisible()
    await beat(page)

    for (const [name, title, chip] of [
      ['dispatch_prompt', 'Dispatch prompt', 'Reads'],
      ['add_lesson', 'Add lesson', 'Writes'],
      ['delete_work_item', 'Delete work item', 'Destructive'],
    ] as const) {
      chapter(`${title} — ${chip}`)
      const row = toolRow(page, name)
      await row.scrollIntoViewIfNeeded()
      await expect(row).toContainText(title)
      await expect(row.locator('[data-hint]')).toHaveText(chip)
      await beat(page, 2000)
    }

    // ── 3 · /docs/skills INSTALLS THE PLUGIN FROM A RELEASE TAG ──────────────
    // WHICH tag is `docs-skills.spec.ts`'s assertion, and it moves with every
    // release. This walk asserts only that the command pins one, so a release
    // does not turn MOTIR-6976's receipt red (MOTIR-7268 moved it to v0.5.0).
    chapter('/docs/skills — the plugin brings three things, from a release tag')
    await page.goto(`${SITE_ORIGIN}/docs/skills`)
    // The page is a document (MOTIR-8036): the Claude Code heading, its three
    // list items and its first command pane are siblings, not a <section>.
    const claudeCode = page.getByRole('heading', {
      level: 3,
      name: 'Claude Code',
    })
    await claudeCode.scrollIntoViewIfNeeded()
    for (const item of [
      'The seven skills',
      'The Motir MCP server',
      'The motir runner',
    ]) {
      await expect(
        page.getByRole('listitem').filter({ hasText: item }),
      ).toHaveCount(1)
    }
    await expect(
      page.locator('pre', { hasText: '/plugin marketplace add' }).first(),
    ).toContainText(/motir-co\/motir-skills#v\d+\.\d+\.\d+\b/)
    await beat(page, 3200)

    // ── 4 · THE PRIVACY NOTICE ───────────────────────────────────────────────
    chapter('The privacy notice — AI clients you connect')
    await page.goto(`${SITE_ORIGIN}/legal/privacy`)
    const passage = page.getByText(
      'An AI client you connect is your choice and your service, not ours.',
    )
    await passage.scrollIntoViewIfNeeded()
    await expect(passage).toBeVisible()
    const paragraph = page.locator('p', { has: passage })
    await expect(paragraph).toContainText('Connected apps')
    await expect(paragraph).toContainText('Settings → Account → Tokens')
    await beat(page, 2400)

    chapter('… and Motir never receives the conversation')
    const conversation = page.getByText('It does not send us your')
    await conversation.scrollIntoViewIfNeeded()
    await expect(conversation).toBeVisible()
    await beat(page, 2400)
  })
})

/*
 * Two journeys switched the catalogue between page loads and went with the
 * per-request render (MOTIR-10649): /docs/mcp/tools is built ahead from the
 * catalogue the stub answered at build. "An older Motir with no hints" is the
 * stripped catalogue's render, asserted in `tests/docs/apiMove.test.tsx`; "the
 * catalogue unreachable" is a state no built page has, since a catalogue that
 * cannot be read fails the build (`tests/docs/buildReads.test.tsx`).
 */

test.describe('at a phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('every title and chip stays visible, with no horizontal scroll', async ({
    page,
  }) => {
    await page.goto(`${SITE_ORIGIN}/docs/mcp/tools`)
    const row = toolRow(page, 'search_work_items_semantic')
    await row.scrollIntoViewIfNeeded()
    await expect(row).toContainText('Search work items by meaning')
    const chip = row.locator('[data-hint]')
    await expect(chip).toBeInViewport()
    const box = await chip.boundingBox()
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
