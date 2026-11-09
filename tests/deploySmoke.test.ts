// @vitest-environment node
import { execFile } from 'node:child_process'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_ATTEMPTS,
  DEFAULT_DELAY_MS,
  SMOKE_CHECKS,
  SmokeCheckFailed,
  describeObservation,
  describeWant,
  expectAnswer,
  observe,
  releaseOrigin,
  satisfies,
  smokeRelease,
  type SmokeCheck,
} from '@/lib/deploySmoke'

/*
 * THE RELEASE SMOKE RETRIES ON THE ANSWER (MOTIR-10810).
 *
 * Run 42609664075 failed the Worker's first deploy: the new workers.dev address
 * answered `/` with 404 for a few seconds, and the curl loop it ran retried only
 * a refused connection. These tests hold the loop that replaced it — a wrong
 * status, a wrong Location and no answer are all asked again, within a bound —
 * first against a scripted `fetch`, then against a real server and the script
 * the deploy job runs.
 */

const execFileAsync = promisify(execFile)
const ORIGIN = 'https://motir-marketing.example.workers.dev'

type Scripted = () => Response | Error

/**
 * A `fetch` that answers each call with the next scripted answer, repeating the
 * last. Each is built fresh per call: a cloned `Response` is a tee, and
 * cancelling one branch of a tee waits for the other.
 */
function scripted(...answers: Scripted[]) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = []
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    const next = (answers.length > 1 ? answers.shift()! : answers[0]!)()
    if (next instanceof Error) throw next
    return next
  }) as typeof fetch
  return { impl, calls }
}

const answer =
  (status: number, location?: string): Scripted =>
  () =>
    new Response(status === 308 ? null : 'body', {
      status,
      headers: location ? { location } : {},
    })
const refused: Scripted = () => new TypeError('fetch failed')

const quiet = { log: () => {}, sleep: async () => {} }

describe('one request', () => {
  it('asks without following a redirect, in English, and reads status and Location', async () => {
    const { impl, calls } = scripted(answer(308, '/zh-tw/price'))
    await expect(observe(`${ORIGIN}/zh-TW/price`, impl, 1000)).resolves.toEqual(
      {
        kind: 'answer',
        status: 308,
        location: '/zh-tw/price',
      },
    )
    expect(calls[0]!.url).toBe(`${ORIGIN}/zh-TW/price`)
    expect(calls[0]!.init?.redirect).toBe('manual')
    expect(calls[0]!.init?.headers).toEqual({ 'accept-language': 'en' })
    expect(calls[0]!.init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('turns a refused connection into "no answer" rather than throwing', async () => {
    const { impl } = scripted(refused)
    await expect(observe(ORIGIN, impl, 1000)).resolves.toEqual({
      kind: 'no-answer',
      reason: 'fetch failed',
    })
  })

  it('says what a non-Error rejection was', async () => {
    const impl = (() =>
      Promise.reject('socket hang up')) as unknown as typeof fetch
    await expect(observe(ORIGIN, impl, 1000)).resolves.toEqual({
      kind: 'no-answer',
      reason: 'socket hang up',
    })
  })
})

describe('what a check wants', () => {
  const status: SmokeCheck = { path: '/', status: 200 }
  const redirect: SmokeCheck = {
    path: '/zh-TW/price',
    status: 308,
    locationEndsWith: '/zh-tw/price',
  }

  it('matches the status, and the Location only when the check names one', () => {
    expect(
      satisfies(status, { kind: 'answer', status: 200, location: null }),
    ).toBe(true)
    expect(
      satisfies(status, { kind: 'answer', status: 404, location: null }),
    ).toBe(false)
    expect(satisfies(status, { kind: 'no-answer', reason: 'x' })).toBe(false)
    expect(
      satisfies(redirect, {
        kind: 'answer',
        status: 308,
        location: 'https://x/zh-tw/price',
      }),
    ).toBe(true)
    expect(
      satisfies(redirect, {
        kind: 'answer',
        status: 308,
        location: '/zh-TW/price',
      }),
    ).toBe(false)
    expect(
      satisfies(redirect, { kind: 'answer', status: 308, location: null }),
    ).toBe(false)
  })

  it('says the wanted and the seen answer the way the log reads them', () => {
    expect(describeWant(status)).toBe('200')
    expect(describeWant(redirect)).toBe('308 → …/zh-tw/price')
    expect(
      describeObservation({ kind: 'answer', status: 404, location: null }),
    ).toBe('404')
    expect(
      describeObservation({ kind: 'answer', status: 308, location: '/a' }),
    ).toBe('308 → /a')
    expect(describeObservation({ kind: 'no-answer', reason: 'timeout' })).toBe(
      'no answer (timeout)',
    )
  })
})

describe('the retry loop', () => {
  it('waits out the 404 a new workers.dev address answers (run 42609664075)', async () => {
    const { impl, calls } = scripted(answer(404), answer(404), answer(200))
    const sleep = vi.fn(async () => {})
    const lines: string[] = []
    await expectAnswer(
      ORIGIN,
      { path: '/', status: 200 },
      {
        fetch: impl,
        sleep,
        log: (line) => lines.push(line),
      },
    )
    expect(calls).toHaveLength(3)
    expect(sleep).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(DEFAULT_DELAY_MS)
    expect(lines).toEqual([
      `GET ${ORIGIN}/ -> 404 (want 200, attempt 1/10)`,
      `GET ${ORIGIN}/ -> 404 (want 200, attempt 2/10)`,
      `GET ${ORIGIN}/ -> 200 (want 200, attempt 3/10)`,
    ])
  })

  it('retries a refused connection in the same loop', async () => {
    const { impl, calls } = scripted(refused, answer(200))
    await expectAnswer(
      ORIGIN,
      { path: '/', status: 200 },
      { fetch: impl, ...quiet },
    )
    expect(calls).toHaveLength(2)
  })

  it('retries a 308 whose Location is wrong', async () => {
    const { impl, calls } = scripted(
      answer(308, '/zh-TW/price'),
      answer(308, '/zh-tw/price'),
    )
    await expectAnswer(
      ORIGIN,
      { path: '/zh-TW/price', status: 308, locationEndsWith: '/zh-tw/price' },
      { fetch: impl, ...quiet },
    )
    expect(calls).toHaveLength(2)
  })

  it('is bounded: fails with the last answer seen, without a sleep after the last try', async () => {
    const { impl, calls } = scripted(answer(503), answer(404))
    const sleep = vi.fn(async () => {})
    const failure = expectAnswer(
      ORIGIN,
      { path: '/', status: 200 },
      {
        fetch: impl,
        sleep,
        log: () => {},
      },
    )
    await expect(failure).rejects.toBeInstanceOf(SmokeCheckFailed)
    await expect(failure).rejects.toMatchObject({
      url: `${ORIGIN}/`,
      want: '200',
      last: '404',
      attempts: DEFAULT_ATTEMPTS,
      message: `GET ${ORIGIN}/ answered 404 after 10 attempts (want 200)`,
    })
    expect(calls).toHaveLength(DEFAULT_ATTEMPTS)
    expect(sleep).toHaveBeenCalledTimes(DEFAULT_ATTEMPTS - 1)
  })

  it('takes its bound and its pause from the options', async () => {
    const { impl, calls } = scripted(answer(404))
    const sleep = vi.fn(async () => {})
    await expect(
      expectAnswer(
        ORIGIN,
        { path: '/', status: 200 },
        {
          fetch: impl,
          sleep,
          log: () => {},
          attempts: 3,
          delayMs: 5,
        },
      ),
    ).rejects.toThrow('after 3 attempts')
    expect(calls).toHaveLength(3)
    expect(sleep).toHaveBeenCalledWith(5)
  })

  it('logs to the console and really waits when nothing is injected', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const real = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(scripted(answer(404), answer(200)).impl)
    try {
      await expectAnswer(ORIGIN, { path: '/', status: 200 }, { delayMs: 1 })
      expect(log).toHaveBeenCalledTimes(2)
    } finally {
      log.mockRestore()
      real.mockRestore()
    }
  })
})

describe('the whole smoke', () => {
  it('asks every check in order, and stops at the first that never answers right', async () => {
    const { impl, calls } = scripted(answer(200), answer(500))
    await expect(
      smokeRelease(ORIGIN, { fetch: impl, ...quiet, attempts: 2 }),
    ).rejects.toThrow(
      `GET ${ORIGIN}/price answered 500 after 2 attempts (want 200)`,
    )
    expect(calls.map((c) => c.url)).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/price`,
      `${ORIGIN}/price`,
    ])
  })

  it('names the five answers the release must give', () => {
    expect(SMOKE_CHECKS.map((c) => `${c.path} ${describeWant(c)}`)).toEqual([
      '/ 200',
      '/price 200',
      '/explore 200',
      '/de/does-not-exist 404',
      '/zh-TW/price 308 → …/zh-tw/price',
    ])
  })
})

describe('the origin the deploy step hands over', () => {
  it('is an http(s) origin, path and all dropped', () => {
    expect(releaseOrigin(`${ORIGIN}/`)).toBe(ORIGIN)
    expect(releaseOrigin('http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787')
  })

  it('refuses a missing or non-http value', () => {
    expect(() => releaseOrigin(undefined)).toThrow('ORIGIN is not set')
    expect(() => releaseOrigin('')).toThrow('ORIGIN is not set')
    expect(() => releaseOrigin('ftp://example.com')).toThrow(
      'must be an http(s) origin',
    )
    expect(() => releaseOrigin('not a url')).toThrow()
  })
})

/*
 * AGAINST A REAL SERVER: real `fetch`, so `redirect: 'manual'` is measured
 * rather than assumed — a followed 308 would read as 200 — and the script the
 * deploy job runs, under the same plain `node` (type stripping, no aliases).
 */
describe('against a real server', () => {
  let server: Server | undefined
  afterEach(async () => {
    if (!server) return
    server.closeAllConnections()
    await new Promise<void>((done) => server!.close(() => done()))
    server = undefined
  })

  /** The release as it should answer, with `/` answering 404 `warmup` times first. */
  async function release(warmup: number): Promise<string> {
    let rootHits = 0
    server = createServer((req, res) => {
      if (req.url === '/' && rootHits++ < warmup)
        return void res.writeHead(404).end()
      if (req.url === '/zh-TW/price')
        return void res.writeHead(308, { location: '/zh-tw/price' }).end()
      if (req.url === '/de/does-not-exist')
        return void res.writeHead(404).end('not found')
      res.writeHead(200).end('ok')
    })
    await new Promise<void>((done) => server!.listen(0, '127.0.0.1', done))
    return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`
  }

  it('passes once a propagating address starts answering', async () => {
    const origin = await release(2)
    const lines: string[] = []
    await smokeRelease(origin, { log: (l) => lines.push(l), delayMs: 1 })
    expect(lines.filter((l) => l.startsWith(`GET ${origin}/ `))).toHaveLength(3)
    expect(lines.at(-1)).toBe(
      `GET ${origin}/zh-TW/price -> 308 → /zh-tw/price (want 308 → …/zh-tw/price, attempt 1/10)`,
    )
  })

  it('runs as the deploy job runs it', async () => {
    const origin = await release(0)
    const { stdout } = await execFileAsync(
      'node',
      ['scripts/deploy/smoke.ts'],
      {
        env: { ...process.env, ORIGIN: origin },
      },
    )
    expect(stdout).toContain('smoke: the release answered every check')
  })

  it('exits non-zero with an annotation when it cannot start', async () => {
    const env = { ...process.env }
    delete env['ORIGIN']
    const run = execFileAsync('node', ['scripts/deploy/smoke.ts'], { env })
    await expect(run).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(
        '::error title=Release smoke check failed::ORIGIN is not set',
      ),
    })
  })
})
