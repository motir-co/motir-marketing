import { describe, expect, it, vi } from 'vitest'
import { render } from '@/tests/helpers/withCopy'
import {
  FILTER_DISALLOW,
  IDEAS_TAGS_MAX,
  REFUSED_CRAWLERS,
  filterLinkRel,
  isCrawler,
  isFilterUrl,
  isRefusedCrawler,
  trimmedIdeasUrl,
} from '@/lib/crawlPolicy'
import { ideasHref, parseIdeasParams } from '@/lib/ideas'
import { logRequest, requestLogLine } from '@/lib/requestLog'
import { RankTabs } from '@/app/[locale]/explore/_components/RankTabs'
import { CategoryFilter } from '@/app/[locale]/explore/_components/CategoryFilter'
import { FilterLink as IdeasFilterLink } from '@/app/[locale]/ideas/_components/IdeasNav'

/*
 * `lib/crawlPolicy.ts` and `lib/requestLog.ts` as the retired Next
 * `proxy.ts` applied them. Held out with `proxy.ts` (`held-out.json`) until
 * MOTIR-10639 deletes both; the proxy-free cases are `crawlPolicy.test.tsx`,
 * and the Worker's own are `tests/worker/router.test.ts` (MOTIR-10758).
 */

const { proxy } = await import('@/proxy')
const { NextRequest } = await import('next/server')

/**
 * Whether a robots.txt path pattern matches a URL path, as Google and Bing
 * read one: a prefix match, `*` for any run of characters.
 */
function robotsMatch(pattern: string, path: string): boolean {
  const re = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${re}`).test(path)
}

const blocked = (path: string) =>
  FILTER_DISALLOW.some((pattern) => robotsMatch(pattern, path))

describe('the refused crawlers', () => {
  const request = (path: string, ua: string) =>
    new NextRequest(`https://motir.co${path}`, {
      headers: { 'user-agent': ua, 'x-forwarded-host': 'motir.co' },
    })

  it('answers them 403 everywhere but robots.txt', async () => {
    for (const crawler of REFUSED_CRAWLERS) {
      const ua = `Mozilla/5.0 (compatible; ${crawler}/1.0)`
      expect((await proxy(request('/explore', ua))).status, crawler).toBe(403)
      expect(
        (await proxy(request('/robots.txt', ua))).status,
        crawler,
      ).not.toBe(403)
    }
  })

  it('lets everyone else through', async () => {
    const res = await proxy(
      request('/explore', 'Mozilla/5.0 (compatible; Googlebot/2.1)'),
    )
    expect(res.status).not.toBe(403)
  })
})

const GOOGLEBOT =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const META_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 (compatible; meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler))'
const BROWSER =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'

describe('the filter-URL gate', () => {
  const request = (path: string, ua: string) =>
    new NextRequest(`https://motir.co${path}`, {
      headers: { 'user-agent': ua, 'x-forwarded-host': 'motir.co' },
    })

  it('answers a crawler 403 on a filter URL, and nowhere else', async () => {
    for (const ua of [GOOGLEBOT, META_AGENT]) {
      expect(
        (
          await proxy(
            request('/pt/ideas?category=financial_services&tag=smb', ua),
          )
        ).status,
        ua,
      ).toBe(403)
      expect(
        (await proxy(request('/explore?rank=popular', ua))).status,
        ua,
      ).toBe(403)
      expect((await proxy(request('/ideas', ua))).status, ua).not.toBe(403)
      expect((await proxy(request('/explore', ua))).status, ua).not.toBe(403)
    }
  })

  it('serves a person the same filter URL', async () => {
    const res = await proxy(request('/ideas?category=pets&tag=smb', BROWSER))
    expect(res.status).not.toBe(403)
  })
})

describe('the ideas tag cap', () => {
  const tags = ['a', 'b', 'c', 'd', 'e'].map((t) => `tag=${t}`).join('&')

  it('redirects a person with the trimmed address before anything renders', async () => {
    const res = await proxy(
      new NextRequest(`https://motir.co/ideas?${tags}`, {
        headers: { 'user-agent': BROWSER, 'x-forwarded-host': 'motir.co' },
      }),
    )
    expect(res.status).toBe(308)
    expect(res.headers.get('location')).toBe(
      'https://motir.co/ideas?tag=a&tag=b&tag=c',
    )
  })
})

describe('the request log line', () => {
  const request = new NextRequest(
    `https://motir.co/de/ideas?category=pets&tag=${'x'.repeat(400)}`,
    {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; GPTBot/1.2)',
        'fly-request-id': '01M58HR1W7Q2EW9D956WZ1AASD-gru',
        'fly-client-ip': '203.0.113.7',
        'x-forwarded-for': '203.0.113.7',
      },
    },
  )

  it('names the agent, the path and the edge — and carries no address', () => {
    const line = requestLogLine(request, 'motir.co', false)
    expect(line).toMatchObject({
      msg: 'request',
      method: 'GET',
      host: 'motir.co',
      path: '/de/ideas',
      ua: 'Mozilla/5.0 (compatible; GPTBot/1.2)',
      edge: 'gru',
      refused: false,
    })
    expect(line.query.startsWith('?category=pets&tag=')).toBe(true)
    expect(line.query.length).toBe(200)
    expect(JSON.stringify(line)).not.toContain('203.0.113.7')
  })

  it('is written once per visitor request — not again for the English rewrite', async () => {
    vi.stubEnv('FLY_APP_NAME', 'motir-marketing')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const ua = { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' }
    await proxy(new NextRequest('https://motir.co/en/explore', { headers: ua }))
    expect(log).toHaveBeenCalledTimes(1)
    await proxy(
      new NextRequest('https://motir.co/en/explore', {
        headers: { ...ua, 'x-next-intl-locale': 'en' },
      }),
    )
    expect(log).toHaveBeenCalledTimes(1)
    log.mockRestore()
    vi.unstubAllEnvs()
  })

  it('reads the Vercel edge from x-vercel-id', () => {
    const vercel = new NextRequest('https://motir.co/', {
      headers: {
        'x-vercel-id': 'fra1::iad1::abc12-1730000000000-0123456789ab',
      },
    })
    expect(requestLogLine(vercel, 'motir.co', false).edge).toBe('fra1')
  })

  it('is written on Vercel too', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    logRequest(request, 'motir.co', false, { VERCEL: '1' })
    expect(log).toHaveBeenCalledTimes(1)
    log.mockRestore()
  })

  it('is written on Fly only', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    logRequest(request, 'motir.co', false, {})
    expect(log).not.toHaveBeenCalled()
    logRequest(request, 'motir.co', false, { FLY_APP_NAME: 'motir-marketing' })
    expect(log).toHaveBeenCalledTimes(1)
    expect(JSON.parse(log.mock.calls[0]![0] as string).edge).toBe('gru')
    log.mockRestore()
  })
})

describe('the deployment’s own address', () => {
  it('is served as the site on Vercel', async () => {
    vi.stubEnv('VERCEL_URL', 'motir-marketing-abc123-team.vercel.app')
    const res = await proxy(
      new NextRequest('https://motir-marketing-abc123-team.vercel.app/ideas', {
        headers: { host: 'motir-marketing-abc123-team.vercel.app' },
      }),
    )
    expect(res.headers.get('x-middleware-rewrite')).toContain('/en/ideas')
    vi.unstubAllEnvs()
  })
})
