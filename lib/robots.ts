import { FILTER_DISALLOW, REFUSED_CRAWLERS } from './crawlPolicy'
import { SITE_ORIGIN } from './siteOrigin'

/*
 * motir.co's `robots.txt` (MOTIR-1154 · 8.3.7 · MOTIR-10646).
 *
 * ⚠️ IT OPENS THE SITE, AND THAT WAS THE DELIVERABLE. MOTIR-1455 shipped it as
 * `Disallow: /` while the deploy was a one-page placeholder; MOTIR-1154 opened
 * it. Nothing is disallowed but the filter URLs and the refused crawlers, both
 * from `lib/crawlPolicy.ts`, which says why: there is no private surface to
 * hold back, only a crawl trap to close.
 *
 * ⚠️ THE TEXT IS THE ONE NEXT WROTE. `app/robots.ts` handed Next a
 * `MetadataRoute.Robots` object and Next serialized it; the Astro endpoint
 * `src/pages/robots.txt.ts` writes this string at build instead, laid out the
 * same way — per rule, one `User-Agent` line per agent, then its `Allow` and
 * `Disallow` lines and a blank line; then `Host` and `Sitemap`. A crawler reads
 * the document it read before the move (`tests/robots.test.ts` holds it to the
 * Next build's file at b9ff37a).
 *
 * `Sitemap` is absolute because the protocol requires it, which is why
 * `SITE_ORIGIN` is a module. A tenant address answers its own robots file from
 * the Worker routes, never this one.
 */

/** One group of a robots file: the agents it binds, and their paths. */
export interface RobotsRule {
  userAgents: readonly string[]
  allow?: readonly string[]
  disallow?: readonly string[]
}

/** motir.co's two groups: everyone, and the crawlers it refuses. */
export function robotsRules(): RobotsRule[] {
  return [
    { userAgents: ['*'], allow: ['/'], disallow: FILTER_DISALLOW },
    { userAgents: REFUSED_CRAWLERS, disallow: ['/'] },
  ]
}

/** Write a robots file from its groups, its host and its sitemap. */
export function robotsText(input: {
  rules: readonly RobotsRule[]
  host: string
  sitemap: string
}): string {
  let text = ''
  for (const rule of input.rules) {
    for (const agent of rule.userAgents) text += `User-Agent: ${agent}\n`
    for (const path of rule.allow ?? []) text += `Allow: ${path}\n`
    for (const path of rule.disallow ?? []) text += `Disallow: ${path}\n`
    text += '\n'
  }
  return `${text}Host: ${input.host}\nSitemap: ${input.sitemap}\n`
}

/** motir.co's `robots.txt`, as `astro build` writes it. */
export function robotsTxt(): string {
  return robotsText({
    rules: robotsRules(),
    host: `${SITE_ORIGIN}/`,
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  })
}
