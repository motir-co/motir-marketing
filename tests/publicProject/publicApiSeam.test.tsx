import { APP_ORIGIN } from '@/lib/appOrigin'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import { loadChangelog, loadProject, loadRequest } from '@/lib/publicProject'
import { ProjectHeader } from '@/app/[locale]/p/[identifier]/_components/ProjectHeader'

/*
 * THE SEAM THE UNITS MOCK (MOTIR-4121).
 *
 * ⚠️ WHY THIS SUITE EXISTS AT ALL. Every other test in this directory mocks
 * `fetch` and hands the module a shape someone typed — which means the module
 * and its tests were written from the SAME assumption, and a drift between that
 * assumption and what `motir-core` really returns is invisible to both. This
 * suite drives the RECORDED responses instead, all the way to the props a
 * component receives.
 *
 * ⚠️ THE FIXTURES ARE THE BROWSER LANE'S OWN, deliberately — `e2e/fixtures/`,
 * one set, not a second copy that could drift from the first. They are shaped
 * from motir-core's published contract, and the CONTRACT is guarded in the
 * producing repository (`public-surface-hosts.md` §3): a contract test living
 * only in the consumer reports the break after it has shipped. So nothing here
 * asserts the contract — it asserts that OUR module turns the contract's shapes
 * into the props our components render, which is the half that lives here.
 */

const FIXTURES = join(process.cwd(), 'e2e', 'fixtures')
const recorded = (name: string) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8')) as unknown

const fetchMock = vi.fn()
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

const serve = (name: string) =>
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => recorded(name),
  })

describe('a recorded response reaches the props a component renders', () => {
  it('the project subject → the hero', async () => {
    serve('project.json')
    const read = await loadProject(APP_ORIGIN, 'MOTIR')
    if (read.status !== 'ok') throw new Error('fixture did not parse as ok')

    render(<ProjectHeader project={read.data} current="" />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Motir' }),
    ).toBeVisible()
    expect(screen.getByText('moooon B.V.')).toBeVisible()
    // The stat block is where a renamed key shows up as a blank rather than a
    // crash — `128` here is `stats.publicRequests` surviving the whole path.
    expect(screen.getByText('128')).toBeVisible()
    expect(screen.getByText('1,204')).toBeVisible()
  })
})

describe('every recorded shape parses, field for field', () => {
  const cases: Array<[string, string, () => Promise<unknown>]> = [
    ['project', 'project.json', () => loadProject(APP_ORIGIN, 'MOTIR')],
    ['changelog', 'changelog.json', () => loadChangelog(APP_ORIGIN, 'MOTIR')],
    [
      'request',
      'request-detail.json',
      () => loadRequest(APP_ORIGIN, 'MOTIR', 'MOTIR-4051'),
    ],
  ]

  for (const [name, fixture, call] of cases) {
    it(`${name} — every key the module declares is present in the recording`, async () => {
      serve(fixture)
      const read = (await call()) as { status: string; data?: unknown }

      expect(read.status).toBe('ok')
      // A key the module reads but the recording lacks arrives as `undefined`
      // and renders as a blank — the drift this suite is for. Comparing the
      // parsed object to the file catches a module that silently dropped one.
      expect(read.data).toEqual(recorded(fixture))
    })
  }
})

// The board, items, tree, roadmap and work-item reads left with the pages that
// made them (MOTIR-6743): those paths redirect into the app and read nothing,
// so their recorded shapes and the items / roadmap cursor round trips went too.
