import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetHostResolutionCache,
  type PublicHostResolution,
} from '@/lib/hostResolution'

/*
 * THE RETIRED-HOST GATE (Story MOTIR-4528 · MOTIR-9517).
 *
 * ADR §8 Amendment 3 rule 2, on the consumer side: a workspace name that was
 * renamed away or released stops answering at once, and NOTHING redirects. The
 * units each have their own tests (`hostResolution.test.ts`,
 * `hostRouter.test.ts`); this drives the SEQUENCE a retired name goes through —
 * live, then retired, then still retired after the cache window — through the
 * real `resolveHost`, its cache, `routeForHost` and `proxy.ts` together, over a
 * scripted producer and a fake clock. No unit test reaches that seam.
 *
 * The producer is a stub. This asserts what the router does GIVEN the contract;
 * that a retired row is deleted, and the contract's own cache header, are
 * motir-core's gate.
 */

const { proxy } = await import('@/proxy')
const { NextRequest } = await import('next/server')

const HOST = 'acme.motir.site'
const REDIRECTS = [301, 302, 307, 308]

const LIVE: PublicHostResolution = {
  kind: 'no_application',
  workspace: { name: 'Acme' },
}

type Step =
  { status: number; body?: unknown; cacheControl?: string } | { reject: true }

/**
 * A producer that answers each fetch with the next step of its script (the
 * last step repeats), and counts how often it was asked.
 */
function producer(...script: Step[]) {
  let i = 0
  const fetchMock = vi.fn(async () => {
    const step = script[Math.min(i, script.length - 1)]!
    i += 1
    if ('reject' in step) throw new Error('ECONNREFUSED')
    return new Response(JSON.stringify(step.body ?? {}), {
      status: step.status,
      headers: {
        'content-type': 'application/json',
        ...(step.cacheControl ? { 'cache-control': step.cacheControl } : {}),
      },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const live = (cacheControl = 'public, max-age=30'): Step => ({
  status: 200,
  body: LIVE,
  cacheControl,
})
const retired = (cacheControl = 'no-store'): Step => ({
  status: 404,
  body: { code: 'NOT_FOUND' },
  cacheControl,
})

function visit(path = '/') {
  return proxy(
    new NextRequest(`https://${HOST}${path}`, { headers: { host: HOST } }),
  )
}

const rewriteOf = (res: Response) =>
  res.headers.get('x-middleware-rewrite')
    ? new URL(res.headers.get('x-middleware-rewrite')!).pathname
    : null

/** The assembled property: the not-found room, and no redirect of any kind. */
function expectRetired(res: Response) {
  expect(REDIRECTS).not.toContain(res.status)
  expect(res.headers.get('location')).toBeNull()
  expect(rewriteOf(res)).toBe('/_host-unknown')
  expect(res.headers.get('x-middleware-request-x-motir-address-kind')).toBe(
    'unresolved',
  )
}

beforeEach(() => resetHostResolutionCache())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('a retired workspace name, live then retired', () => {
  it('answers the not-found room once the cache window has passed, and never redirects', async () => {
    vi.useFakeTimers()
    const fetchMock = producer(live(), retired('public, max-age=30'))

    const before = await visit('/')
    expect(rewriteOf(before)).toBe('/en/no-application')

    vi.advanceTimersByTime(30_001)
    for (const path of ['/', '/ACME', '/ACME/changelog?cursor=w9']) {
      expectRetired(await visit(path))
    }
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('holds the live answer for at most 30 seconds — the stated bound on a retired name', async () => {
    vi.useFakeTimers()
    const fetchMock = producer(live(), retired())

    await visit('/')
    vi.advanceTimersByTime(29_000)
    // Inside the window the cached live answer may still be served.
    expect(rewriteOf(await visit('/'))).toBe('/en/no-application')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1_001)
    expectRetired(await visit('/'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('holds a live answer with no Cache-Control for the same 30 seconds', async () => {
    vi.useFakeTimers()
    const fetchMock = producer({ status: 200, body: LIVE }, retired())

    await visit('/')
    vi.advanceTimersByTime(29_000)
    await visit('/')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1_001)
    expectRetired(await visit('/'))
  })

  it('does not remember a no-store 404 — two requests, two producer reads', async () => {
    vi.useFakeTimers()
    const fetchMock = producer(retired('no-store'))

    expectRetired(await visit('/'))
    vi.advanceTimersByTime(500)
    expectRetired(await visit('/'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('a producer a version off', () => {
  it('a 200 carrying the retired `alias` outcome is the not-found room, with no redirect', async () => {
    producer({
      status: 200,
      body: { kind: 'alias', redirectTo: 'acme-inc.motir.site' },
      cacheControl: 'public, max-age=30',
    })
    expectRetired(await visit('/ACME/changelog'))
  })

  it('a 200 carrying a kind this build does not know is the not-found room', async () => {
    producer({
      status: 200,
      body: { kind: 'unknown' },
      cacheControl: 'public, max-age=30',
    })
    expectRetired(await visit('/'))
  })
})

describe('an outage is not a retired name', () => {
  it.each([
    ['a rejected fetch', { reject: true } as Step],
    ['a 5xx', { status: 503 } as Step],
  ])(
    '%s stays the uncached failure, never a 404 or a redirect',
    async (_label, outage) => {
      vi.useFakeTimers()
      const fetchMock = producer(live(), outage)

      await visit('/')
      vi.advanceTimersByTime(30_001)
      for (let n = 0; n < 2; n += 1) {
        const res = await visit('/')
        expect(REDIRECTS).not.toContain(res.status)
        expect(res.headers.get('location')).toBeNull()
        expect(rewriteOf(res)).toBe('/en/host-unavailable')
      }
      // Not remembered: each request asks again.
      expect(fetchMock).toHaveBeenCalledTimes(3)
    },
  )
})

describe('the redirect arm cannot come back silently', () => {
  it.each(['lib/hostResolution.ts', 'proxy.ts'])(
    '%s names no alias outcome and no redirect route',
    (file) => {
      const source = readFileSync(file, 'utf8')
      // Whole words: `redirectToLocale` is the site's locale hop, not this.
      for (const name of [
        /\bPublicHostAlias\b/,
        /\bredirectTo\b/,
        /action: 'redirect'/,
      ]) {
        expect(source, `${file} contains ${name}`).not.toMatch(name)
      }
    },
  )
})
