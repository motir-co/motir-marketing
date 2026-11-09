import { describe, expect, it } from 'vitest'
import { render } from '@/tests/helpers/withCopy'
import {
  FILTER_DISALLOW,
  IDEAS_TAGS_MAX,
  filterLinkRel,
  isCrawler,
  isFilterUrl,
  isRefusedCrawler,
  trimmedIdeasUrl,
} from '@/lib/crawlPolicy'
import { ideasHref, parseIdeasParams } from '@/lib/ideas'
import { RankTabs } from '@/app/[locale]/explore/_components/RankTabs'
import { CategoryFilter } from '@/app/[locale]/explore/_components/CategoryFilter'
import { FilterLink as IdeasFilterLink } from '@/app/[locale]/ideas/_components/IdeasNav'

/*
 * `lib/crawlPolicy.ts` — the filter URLs closed to crawlers, the crawlers
 * refused, the previewers let through and the ideas tag cap — asked of the
 * module and of the links the live pages render.
 *
 * The same rules as the Worker applies them per request are
 * `tests/worker/router.test.ts` and `e2e/specs/worker-edge-rules.spec.ts`.
 * The cases that drove the retired Next router went with it (MOTIR-10639);
 * MOTIR-10758 had split them out, so none of these went too.
 */

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
})
