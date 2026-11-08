// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FILTER_DISALLOW, REFUSED_CRAWLERS } from '@/lib/crawlPolicy'
import { robotsText, robotsTxt } from '@/lib/robots'

/*
 * `/robots.txt` IS THE FILE NEXT WROTE (MOTIR-10646).
 *
 * `tests/fixtures/next-b9ff37a/robots.txt` is the Next build's
 * `.next/server/app/robots.txt.body` at b9ff37a, the last Next commit, copied
 * as it was. Next serialized `app/robots.ts`'s object into it; `lib/robots.ts`
 * writes the same text, and `astro build` emits it through
 * `src/pages/robots.txt.ts`. Do not regenerate the fixture to make this pass:
 * a crawler reading a different file is the finding.
 */

const NEXT_ROBOTS = readFileSync(
  'tests/fixtures/next-b9ff37a/robots.txt',
  'utf8',
)

/** The text without blank-line and trailing-space differences. */
const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

describe('robots.txt', () => {
  it('is the Next build’s file at b9ff37a, apart from whitespace', () => {
    expect(lines(robotsTxt())).toEqual(lines(NEXT_ROBOTS))
  })

  it('is that file byte for byte, as it happens', () => {
    expect(robotsTxt()).toBe(NEXT_ROBOTS)
  })

  it('carries every filter path and every refused crawler from the policy', () => {
    const text = robotsTxt()
    for (const path of FILTER_DISALLOW)
      expect(text).toContain(`\nDisallow: ${path}\n`)
    for (const agent of REFUSED_CRAWLERS)
      expect(text).toContain(`\nUser-Agent: ${agent}\n`)
    expect(text.startsWith('User-Agent: *\nAllow: /\n')).toBe(true)
    expect(
      text.endsWith(
        '\nHost: https://motir.co/\nSitemap: https://motir.co/sitemap.xml\n',
      ),
    ).toBe(true)
  })
})

describe('the serializer', () => {
  it('writes a rule with no allow or disallow as its agents and a blank line', () => {
    expect(
      robotsText({
        rules: [{ userAgents: ['a', 'b'] }],
        host: 'https://x.test/',
        sitemap: 'https://x.test/s.xml',
      }),
    ).toBe(
      'User-Agent: a\nUser-Agent: b\n\nHost: https://x.test/\nSitemap: https://x.test/s.xml\n',
    )
  })
})

describe('the endpoint', () => {
  it('serves the text as text/plain', async () => {
    const { GET } = await import('@/src/pages/robots.txt')
    const res = await GET({} as never)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(await res.text()).toBe(NEXT_ROBOTS)
  })
})
