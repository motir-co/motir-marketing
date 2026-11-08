import { readFileSync } from 'node:fs'
import { render } from '@/tests/helpers/withCopy'
import { EN_PAGE } from '@/tests/helpers/locale'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { afterEach, describe, expect, it, vi } from 'vitest'
import GettingStartedPage from '@/app/[locale]/docs/api/getting-started/GettingStartedRoute'
import StabilityPage from '@/app/[locale]/docs/api/stability/StabilityRoute'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { DocsArtifactUnavailableError } from '@/lib/docs'

/*
 * THE TWO PROSE PAGES UNDER `/docs/api` (MOTIR-4429).
 *
 * Both were measured by MOTIR-4397's parity ledger and both were short in the
 * same way — the deleted `motir-core` pages handed a reader something they
 * could RUN or CHECK, and these handed them a description of it instead.
 *
 *   · `/docs/api/getting-started` — `0 <pre>`, and ZERO occurrences of `curl`,
 *     on a page titled *Getting started*.
 *   · `/docs/api/stability` — three bullets, and `v2` appeared ZERO times. The
 *     two missing sections were the client's own obligations and the migration
 *     story: a promise with only the vendor's half written down.
 *
 * ⚠️ THE `0 CODE BLOCKS` ASSERTION IS THE CARD'S OWN, AND IT IS NOT THE ONLY
 * ONE HERE. A floor of one can be met by a page that shows a request and no
 * response, which is most of the distance back to the defect — so the count is
 * a floor and the CONTENT of each block is asserted beside it.
 */

const catalogueFixture = {
  openapi: '3.1.0',
  info: { title: 'Motir API', version: '9.9.9' },
  paths: {},
}

function stubSpec(document: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(document), { status })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/** The list items under one heading of `content/docs/api/stability/en.md`. */
function listUnder(markdown: string, anchor: string): string[] {
  const lines = markdown.split('\n')
  const start = lines.findIndex((line) => line.endsWith(`{#${anchor}}`))
  expect(start, `no heading {#${anchor}}`).toBeGreaterThanOrEqual(0)
  const items: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) break
    const item = /^- (.*)$/.exec(line)
    if (item) items.push(item[1]!)
  }
  return items
}

function policyLists() {
  const markdown = readFileSync('content/docs/api/stability/en.md', 'utf8')
  return {
    additive: listUnder(markdown, 'allowed-inside-v1'),
    forbidden: listUnder(markdown, 'needs-a-new-major'),
  }
}

/** Every `<pre>` the page renders, as text. */
async function panes(): Promise<string[]> {
  const { container } = render(
    (await resolveAsync(await GettingStartedPage(EN_PAGE))) as never,
  )
  return [...container.querySelectorAll('pre')].map(
    (pane) => pane.textContent ?? '',
  )
}

describe('/docs/api/getting-started is a walkthrough, not a summary', () => {
  it('renders code blocks at all — the card’s own criterion, as a floor', async () => {
    stubSpec(catalogueFixture)
    expect((await panes()).length).toBeGreaterThan(0)
  })

  it('carries a runnable request AND its response for all three cases', async () => {
    stubSpec(catalogueFixture)
    const all = (await panes()).join('\n')

    // 1 · a first authenticated call, and the body it answers with.
    expect(all).toContain('/api/v1/me')
    expect(all).toContain('"permissions": ["project:browse"]')

    // 2 · a paginated read — both pages, and the cursor that joins them.
    expect(all).toContain('limit=2')
    expect(all).toContain('cursor=$CURSOR')
    expect(all).toContain('"nextCursor"')

    // 3 · an error, as a real body a client would branch on.
    expect(all).toContain('"code": "WORK_ITEM_NOT_FOUND"')

    // …and the headers, read back, which is the step a reader skips until a
    // 429 arrives.
    expect(all).toContain('X-RateLimit-Reset')
    expect(all).toContain('X-Request-Id')
  })

  it('every curl is BUILT from the configured origin, never typed', async () => {
    // ⚠️ The negative half is what makes this meaningful: a hard-coded
    // `https://app.motir.co` would work perfectly in production and silently
    // point a preview build's reader at production data. In this lane the
    // configured origin is `vitest.config.mts`'s test value, so a typed
    // production URL fails here.
    stubSpec(catalogueFixture)
    const curls = (await panes()).filter((pane) => pane.includes('curl'))
    // Three: the first authenticated call, and the two pages of the paginated
    // read. The response bodies beside them are not requests and carry no URL.
    expect(curls.length).toBe(3)
    for (const pane of curls) {
      expect(pane, pane.slice(0, 48)).toContain(APP_ORIGIN)
    }

    const source = readFileSync(
      'app/[locale]/docs/api/getting-started/GettingStartedRoute.tsx',
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, '')
    expect(source).not.toContain('https://app.motir.co')
  })

  it('reads the contract version off the SERVED document', async () => {
    // The deleted page interpolated motir-core's own constant. This repository
    // cannot import it, and a committed number is stale exactly when it is
    // displayed — so it comes from `info.version`, through the memoized fetch
    // the layout already makes.
    stubSpec(catalogueFixture)
    const all = (await panes()).join('\n')
    expect(all).toContain('X-Motir-Api-Version:   9.9.9')
  })

  it('UNREACHABLE fails the build, never an invented version or a placeholder', async () => {
    // A built page has no request at which the document could be unreachable
    // (MOTIR-10645): the read throws, naming the artifact, and the build stops.
    stubSpec({}, 503)
    await expect(GettingStartedPage(EN_PAGE)).rejects.toThrow(
      DocsArtifactUnavailableError,
    )
    await expect(GettingStartedPage(EN_PAGE)).rejects.toThrow(
      /the OpenAPI spec at .*\/api\/openapi\/v1\.json: HTTP 503/,
    )
  })

  it('keeps the five steps it had, in order', async () => {
    // The restore ADDS to the five-step spine rather than replacing it — the
    // page's structure was not the defect.
    stubSpec(catalogueFixture)
    const { container } = render(
      (await resolveAsync(await GettingStartedPage(EN_PAGE))) as never,
    )
    const headings = [...container.querySelectorAll('h2')].map(
      (heading) => heading.textContent ?? '',
    )
    expect(headings).toEqual([
      '1. Mint a token',
      '2. Your first authenticated call',
      '3. Paginate a collection',
      '4. Read an error',
      '5. Read the response headers',
      'What next',
    ])
  })
})

describe('/docs/api/stability publishes BOTH halves of the promise', () => {
  it('states the client’s own obligations — the section that went missing', async () => {
    const { container } = render(
      (await resolveAsync(await StabilityPage(EN_PAGE))) as never,
    )
    const text = container.textContent ?? ''
    expect(text).toContain('Your side of the promise')
    expect(text).toMatch(/MUST tolerate unknown fields/)
    expect(text).toMatch(/MUST NOT\s*parse the human/)
  })

  it('states how a new major would arrive — `v2` appeared ZERO times before', async () => {
    const { container } = render(
      (await resolveAsync(await StabilityPage(EN_PAGE))) as never,
    )
    const text = container.textContent ?? ''
    expect(text).toContain('How a v2 would arrive')
    expect(text).toContain('served alongside v1')
    // The count, because the ledger's finding was a count.
    expect((text.match(/\bv2\b/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })

  it('renders all four sections, in the deleted page’s order', async () => {
    const { container } = render(
      (await resolveAsync(await StabilityPage(EN_PAGE))) as never,
    )
    expect(
      [...container.querySelectorAll('h2')].map((h) => h.textContent ?? ''),
    ).toEqual([
      'What v1 guarantees',
      'Your side of the promise',
      'Deprecation',
      'How a v2 would arrive',
    ])
  })

  it('publishes the two policy lists by MEMBERSHIP, not by summary', async () => {
    /*
     * ⚠️ WHAT THIS CAN AND CANNOT CHECK, said plainly. motir-core's ADR §8 is
     * the INTERNAL record of the same promise, and over there a test held each
     * published sentence against its §8 bullet. That check cannot exist in
     * this lane: the ADR is in another repository and nothing here reaches it,
     * so a phrase-matching structure copied across would be a check that
     * cannot go red — which is worse than none, because it looks like one.
     *
     * What IS checkable here is that the published lists do not quietly move.
     * Silently adding a row to the additive list widens what may change under
     * a client without a version bump, and that is the edit worth failing on.
     */
    const { container } = render(
      (await resolveAsync(await StabilityPage(EN_PAGE))) as never,
    )
    const text = container.textContent ?? ''

    // The lists live in the document now (MOTIR-8037): read them from the file,
    // as the sentences a reader is shown — the items under each list's heading.
    const { additive, forbidden } = policyLists()

    expect(additive).toEqual([
      'A new endpoint.',
      'A new OPTIONAL query parameter.',
      'A new field on a response object.',
      'A new response header.',
      'A new value on a field documented as open-ended.',
      'A raised rate-limit budget.',
    ])
    expect(forbidden).toEqual([
      'Removing a field.',
      'Renaming a field.',
      'Changing a field’s type or nullability.',
      'Removing or re-purposing an error `code`.',
      'Changing an existing status for an existing condition.',
      'Tightening a limit.',
      'Making an optional parameter required.',
    ])

    // …and every one of them actually reaches the page. A list nothing renders
    // is a constant, not a policy.
    for (const item of [...additive, ...forbidden]) {
      expect(text, item).toContain(item.replaceAll('`', ''))
    }
  })
})
