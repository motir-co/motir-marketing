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
 * `lib/crawlPolicy.ts` — the filter URLs closed to crawlers, the crawlers
 * refused — and `lib/requestLog.ts`, the line that says who was asking.
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

describe('the filter disallow lines', () => {
  it.each([
    '/explore?rank=popular',
    '/de/explore?category=design&window=day',
    '/explore/topic/design?rank=recent',
    '/ja/explore/topic/design?cursor=abc',
    '/ideas?category=pets',
    '/pl/ideas?tag=b2b-saas&idea=a-care-team-app-for-families',
  ])('close %s', (path) => {
    expect(blocked(path)).toBe(true)
  })

  it.each([
    '/',
    '/de',
    '/explore',
    '/fr/explore',
    '/explore/topic/design',
    '/ko/explore/topic/design',
    '/ideas',
    '/docs/api',
    '/p/MOTIR',
    // The assets Google renders a page with — why the rule is not `/*?`.
    '/_next/image?url=%2Ficon.png&w=64&q=75',
    '/icon.svg?1e83bb7cfb2dd1ec',
    '/apple-icon.png?ff4c2e56e0460a31',
  ])('leave %s open', (path) => {
    expect(blocked(path)).toBe(false)
  })
})

describe('filterLinkRel', () => {
  it('marks a filtered address nofollow, and leaves a plain page alone', () => {
    expect(filterLinkRel('/explore?rank=popular')).toBe('nofollow')
    expect(filterLinkRel('/de/ideas?idea=x')).toBe('nofollow')
    expect(filterLinkRel('/explore')).toBeUndefined()
    expect(filterLinkRel('/ideas')).toBeUndefined()
  })

  it('reaches the square’s rank tabs and topic chips', () => {
    const { container } = render(
      <>
        <RankTabs
          basePath="/explore"
          query={{ rank: 'trending', window: 'week' }}
        />
        <CategoryFilter
          basePath="/explore"
          query={{ rank: 'trending', window: 'week', category: 'design' }}
          categories={[
            { slug: 'design', label: 'Design', projectCount: 3 },
            {
              slug: 'developer-tools',
              label: 'Developer tools',
              projectCount: 2,
            },
          ]}
        />
      </>,
    )
    const links = [...container.querySelectorAll('a')]
    expect(links.length).toBeGreaterThan(3)
    for (const link of links) {
      const href = link.getAttribute('href')!
      expect(link.getAttribute('rel'), href).toBe(
        href.includes('?') ? 'nofollow' : null,
      )
    }
    // Both kinds are present, so the loop above checked both arms.
    expect(links.some((l) => l.getAttribute('rel') === 'nofollow')).toBe(true)
    expect(links.some((l) => l.getAttribute('rel') === null)).toBe(true)
  })

  it('reaches the ideas filter links', () => {
    const { container } = render(
      <>
        <IdeasFilterLink href="/ideas?category=pets">Pets</IdeasFilterLink>
        <IdeasFilterLink href="/ideas">All</IdeasFilterLink>
      </>,
    )
    const [filtered, plain] = [...container.querySelectorAll('a')]
    expect(filtered!.getAttribute('rel')).toBe('nofollow')
    expect(plain!.getAttribute('rel')).toBeNull()
  })
})

describe('the refused crawlers', () => {
  it('matches each by its agent string, and never a search engine or an assistant', () => {
    expect(
      isRefusedCrawler(
        'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
      ),
    ).toBe(true)
    expect(
      isRefusedCrawler(
        'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
      ),
    ).toBe(true)
    for (const agent of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
    ]) {
      expect(isRefusedCrawler(agent), agent).toBe(false)
    }
    expect(isRefusedCrawler(null)).toBe(false)
  })

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
  it('reads the same lines robots.txt serves', () => {
    expect(
      isFilterUrl('/zh-tw/ideas?category=financial_services&tag=smb'),
    ).toBe(true)
    expect(isFilterUrl('/explore/topic/design?rank=recent')).toBe(true)
    expect(isFilterUrl('/ideas')).toBe(false)
    expect(isFilterUrl('/_next/image?url=%2Ficon.png&w=64&q=75')).toBe(false)
  })

  it('knows a crawler by its own words, and lets link previews and people through', () => {
    for (const agent of [
      GOOGLEBOT,
      META_AGENT,
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
      'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
      'DuckDuckBot-Https/1.1; (+https://duckduckgo.com/duckduckbot)',
    ]) {
      expect(isCrawler(agent), agent).toBe(true)
    }
    for (const agent of [
      BROWSER,
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'Twitterbot/1.0',
      'WhatsApp/2.23.20.0',
      'meta-externalfetcher/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
    ]) {
      expect(isCrawler(agent), agent).toBe(false)
    }
    expect(isCrawler(null)).toBe(false)
  })

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

  it('parses at most IDEAS_TAGS_MAX distinct tags, and never writes more', () => {
    const params = parseIdeasParams(
      new URLSearchParams(`category=pets&tag=a&tag=a&${tags}`),
    )
    expect(params.tags).toEqual(['a', 'b', 'c'])
    expect(params.tags).toHaveLength(IDEAS_TAGS_MAX)
    expect(ideasHref(params, { tags: [...params.tags, 'd'] })).toBe(
      '/ideas?category=pets&tag=a&tag=b&tag=c',
    )
  })

  it('trims a longer address to the first distinct tags, keeping the rest', () => {
    expect(
      trimmedIdeasUrl(
        new URL(
          `https://motir.co/de/ideas?category=pets&tag=a&tag=a&${tags}&idea=x`,
        ),
      )?.toString(),
    ).toBe('https://motir.co/de/ideas?category=pets&idea=x&tag=a&tag=b&tag=c')
    expect(
      trimmedIdeasUrl(new URL('https://motir.co/ideas?tag=a&tag=b&tag=c')),
    ).toBeNull()
    expect(
      trimmedIdeasUrl(new URL(`https://motir.co/explore?${tags}`)),
    ).toBeNull()
  })

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
