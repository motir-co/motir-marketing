import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { WORKER_LOG, workerLogLines } from '../support/workerLog'

/*
 * THE WORKER RUNS FOR THE LIVE SURFACE ONLY (MOTIR-10758 · parent criterion 12).
 *
 * A built page is served from the static assets and runs no code; the live
 * surface is the Worker's (`run_worker_first` in `wrangler.jsonc`). The Worker
 * writes exactly one JSON line per request it runs (`worker/requestLog.ts`),
 * and the browser lane tees `wrangler dev`'s output to a file
 * (`e2e/support/workerLog.ts`), so the lines ARE the invocations: a built
 * address must add none, a live one exactly one.
 *
 * Each request carries a user agent no other request in the run carries, so a
 * line is matched to its request without reading the order of the file, and a
 * parallel spec's traffic cannot be mistaken for it. The server writes the
 * line after it answers, so the count is polled, never slept for.
 *
 * ⚠️ NO CLIENT ADDRESS: every request also carries the three headers a client
 * address arrives in, and no value of theirs may reach the line.
 */

const ADDRESS = '203.0.113.7'

const BUILT = ['/price', '/ja/docs', '/robots.txt', '/opengraph-image']
const LIVE = ['/p/MOTIR', '/explore', '/ideas', '/motir-builds-itself']

async function probe(request: APIRequestContext, path: string) {
  const agent = `motir-e2e-probe/${randomUUID()}`
  const response = await request.get(path, {
    maxRedirects: 0,
    headers: {
      'user-agent': agent,
      'cf-connecting-ip': ADDRESS,
      'x-forwarded-for': ADDRESS,
      'x-real-ip': ADDRESS,
    },
  })
  expect(response.status(), path).toBe(200)
  return agent
}

const linesFor = (agent: string) =>
  workerLogLines().filter((line) => line.ua === agent)

test.beforeAll(() => {
  if (!existsSync(WORKER_LOG))
    throw new Error(
      `${WORKER_LOG} is missing: the site server was not started by this ` +
        'lane (locally, stop the wrangler you started by hand and re-run).',
    )
})

test('a built page writes no Worker log line', async ({ request }) => {
  const agents = new Map<string, string>()
  for (const path of BUILT) agents.set(path, await probe(request, path))
  // The live control is made LAST and waited for: once its line is in the
  // file, every earlier request has been answered and logged if it ever was.
  const control = await probe(request, '/explore')
  await expect.poll(() => linesFor(control).length).toBe(1)
  for (const [path, agent] of agents)
    expect(linesFor(agent), `${path} ran the Worker`).toEqual([])
})

for (const path of LIVE) {
  test(`${path} writes exactly one Worker log line, with no client address`, async ({
    request,
  }) => {
    const agent = await probe(request, path)
    await expect.poll(() => linesFor(agent).length).toBe(1)
    const [line] = linesFor(agent)
    expect(line).toMatchObject({ msg: 'request', method: 'GET', path })
    expect(JSON.stringify(line)).not.toContain(ADDRESS)
    expect(JSON.stringify(line)).not.toContain('127.0.0.1')
  })
}
