/*
 * What crawlers are asked to skip on motir.co, and who is turned away.
 *
 * ⚠️ THE FILTER URLS ARE A CRAWL TRAP, AND THAT IS WHAT THIS MODULE CLOSES.
 * `/explore` and `/ideas` render every filter state as a real link —
 * `/ideas?category=…&tag=…&idea=…` composes 25 categories × 19 tags × 40 ideas
 * across twelve locales — and every one of those addresses renders at request
 * time and reads motir-core. Before launch, with no visitors, the site served
 * ~130k requests in 48 h (Fly edge metrics, 2026-10-17/18), almost all from
 * cloud regions, and a crawl of the `/p/*` social cards ran both machines out
 * of memory (`app/_brand/ogRenderGate.ts`). A crawl spent there indexes
 * nothing worth indexing: `/ideas` is `noindex`, and an `/explore` filter
 * state is the same square re-sorted. The pages that should rank are the
 * plain ones and `/explore/topic/<slug>`, which stay open.
 *
 * Five layers, each for a different crawler:
 *  - `robots.txt` disallows the filter URLs ({@link FILTER_DISALLOW}) — the
 *    crawlers that obey it (Google, Bing, most AI crawlers) stop there;
 *  - the filter links carry `rel="nofollow"` ({@link filterLinkRel}), so a
 *    crawler that reads the page is not invited down them either;
 *  - the canonical of an `/explore` filter state is the unfiltered page;
 *  - `proxy.ts` answers a CRAWLER 403 on a filter URL ({@link isCrawler},
 *    {@link isFilterUrl}), for the ones that read neither of the first two;
 *  - `/ideas` honours at most {@link IDEAS_TAGS_MAX} tags, so a crawler
 *    posing as a browser still walks a small space.
 *
 * ⚠️ THE 403 EXISTS BECAUSE ROBOTS.TXT WAS NOT ENOUGH. On 2026-10-27, eight
 * days after the first two layers shipped, the site was still serving
 * 130–175k requests a day, and every `/ideas` request in the log was
 * `meta-externalagent` walking `?category=…&tag=…` combinations — four to
 * eleven tags deep, in every locale, ~2 a second — past the `Disallow` and
 * the `nofollow`. Each one was a new address, so a fetch-cache miss, a full
 * read of the idea store and a fresh render on a shared-cpu-1x machine, and
 * a visitor landing behind them waited ~2.5 s for `/ideas`.
 *
 * ⚠️ ONLY QUERY STRINGS ON THE TWO FILTER SURFACES — NOT `/*?`. A blanket
 * `Disallow: /*?` would also block `/_next/image?url=…` and the hashed icon
 * addresses (`/icon.svg?…`), and Google renders a page with its images and
 * icons: blocking them makes the page it indexes a broken one.
 */

/** The `robots.txt` disallow lines for the filter URLs, in every locale. */
export const FILTER_DISALLOW: readonly string[] = [
  '/explore?',
  '/*/explore?',
  '/explore/topic/*?',
  '/*/explore/topic/*?',
  '/ideas?',
  '/*/ideas?',
]

/** `pattern` as a regular expression, read as Google and Bing read a robots.txt path: a prefix match, `*` for any run of characters. */
function robotsPattern(pattern: string): RegExp {
  const re = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${re}`)
}

const FILTER_URL = FILTER_DISALLOW.map(robotsPattern)

/**
 * Whether a path and query (`/de/ideas?tag=x`) is one {@link FILTER_DISALLOW}
 * closes — the same lines `robots.txt` serves, so the 403 and the request
 * cannot disagree about what a filter URL is.
 */
export function isFilterUrl(pathAndQuery: string): boolean {
  return FILTER_URL.some((re) => re.test(pathAndQuery))
}

/**
 * ⚠️ THE MOST TAGS `/ideas` HONOURS, AND IT IS A CRAWL-SPACE DECISION. Tags
 * narrow by ALL-must-match over ~40 ideas, so a fourth tag almost always
 * empties the list: a visitor loses nothing, and the address space a crawler
 * can compose stops growing with every tag it appends. `lib/ideas.ts` drops
 * the rest when it parses, and `proxy.ts` redirects a longer address to the
 * trimmed one before anything renders.
 */
export const IDEAS_TAGS_MAX = 3

/**
 * The `/ideas` address with its tags cut to {@link IDEAS_TAGS_MAX} distinct
 * ones, or `null` when it has no more than that (or is not `/ideas`). Every
 * other parameter is kept as given.
 */
export function trimmedIdeasUrl(url: URL): URL | null {
  if (!/^(\/[^/]+)?\/ideas$/.test(url.pathname)) return null
  const given = url.searchParams.getAll('tag')
  if (given.length <= IDEAS_TAGS_MAX) return null
  const tags = [...new Set(given)]
  const trimmed = new URL(url)
  trimmed.searchParams.delete('tag')
  for (const tag of tags.slice(0, IDEAS_TAGS_MAX))
    trimmed.searchParams.append('tag', tag)
  return trimmed
}

/**
 * `rel` for a link on a filter surface: `nofollow` when it carries a query
 * string, nothing when it is a plain page. One rule, so a new filter link
 * cannot forget it and a plain link is never marked.
 */
export function filterLinkRel(href: string): 'nofollow' | undefined {
  return href.includes('?') ? 'nofollow' : undefined
}

/*
 * ⚠️ CRAWLERS WITH NOTHING TO GIVE THE SITE, TURNED AWAY. SEO-tool and bulk
 * scrapers: they do not send visitors, they sell this site's link graph to
 * third parties, and they crawl hardest. They are named in `robots.txt` with
 * `Disallow: /`, and `proxy.ts` ALSO answers them 403 — the same list —
 * because the costliest of them (Bytespider) is documented as ignoring
 * `robots.txt`, and an answer that depends on the crawler's manners is no
 * answer.
 *
 * NOT ON THE LIST, deliberately: search engines (Googlebot, Bingbot,
 * DuckDuckBot, Applebot, YandexBot) and the AI assistants' crawlers (GPTBot,
 * OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended) — a developer tool
 * being an answer in an assistant is marketing, not a cost.
 *
 * TRIGGER to revise: running Ahrefs or Semrush against the site ourselves —
 * both crawl as these agents, and the audit would be refused.
 */
export const REFUSED_CRAWLERS: readonly string[] = [
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'DataForSeoBot',
  'Bytespider',
  'PetalBot',
]

const REFUSED = new RegExp(REFUSED_CRAWLERS.join('|'), 'i')

/** Whether a user agent is one of {@link REFUSED_CRAWLERS}. */
export function isRefusedCrawler(userAgent: string | null): boolean {
  return userAgent !== null && REFUSED.test(userAgent)
}

/*
 * ⚠️ ANY CRAWLER, FOR THE FILTER-URL 403 — not only the refused ones above.
 * Search engines and AI crawlers keep every plain page; what they lose is the
 * filter URLs `robots.txt` already asks them to skip, so the 403 changes
 * nothing for one that obeys it. The words cover the self-declared crawlers
 * (`Googlebot`, `GPTBot`, `Baiduspider`, `meta-externalagent`, …).
 *
 * LINK PREVIEWS ARE NOT CRAWLS. A person who shares `/ideas?tag=…` in Slack
 * or WhatsApp expects a card, and the previewer fetches that one address once,
 * so {@link LINK_PREVIEWERS} pass — and `meta-externalfetcher`, Meta's fetch
 * on a person's request, which is named because its agent string links a
 * `…/crawler` page.
 */
const CRAWLER = /bot\b|crawl|spider|slurp|externalagent/i

export const LINK_PREVIEWERS: readonly string[] = [
  'facebookexternalhit',
  'Twitterbot',
  'Slackbot',
  'LinkedInBot',
  'Discordbot',
  'TelegramBot',
  'WhatsApp',
  'meta-externalfetcher',
]

const PREVIEWER = new RegExp(LINK_PREVIEWERS.join('|'), 'i')

/** Whether a user agent declares itself a crawler, link previewers aside. */
export function isCrawler(userAgent: string | null): boolean {
  return (
    userAgent !== null && CRAWLER.test(userAgent) && !PREVIEWER.test(userAgent)
  )
}
