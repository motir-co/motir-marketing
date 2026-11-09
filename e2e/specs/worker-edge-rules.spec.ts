import { randomUUID } from 'node:crypto'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { SITE_ORIGIN } from '../stub/origin'
import { workerLogLines } from '../support/workerLog'

/*
 * THE RULES THE WORKER APPLIES BEFORE ANY PAGE (MOTIR-10758), as an HTTP
 * client meets them under `wrangler dev`: the crawler refusals, the bare-`/`
 * language choice, the locale spellings and the localized 404.
 *
 * They were `proxy.ts`'s and were measured by unit suites that drove it
 * (`tests/crawlPolicy.test.tsx`, `tests/i18n/detectionMatrix.test.tsx`), held
 * out since MOTIR-10649. The router's own unit cases are `tests/worker/
 * router.test.ts`; this file is the serving layer's half: a status, a
 * Location, a Vary, a Cache-Control, the page that comes back.
 *
 * ⚠️ THE LANGUAGE IS CHOSEN ON THE BARE `/` ONLY. Next chose it on every
 * unprefixed page; the Worker cannot, because every other unprefixed address
 * is a built page that runs no code. The last case pins the narrower rule.
 */

const get = (
  request: APIRequestContext,
  path: string,
  headers: Record<string, string> = {},
) => request.get(path, { maxRedirects: 0, headers })

const location = (response: { headers(): Record<string, string> }) =>
  response.headers()['location']
    ? new URL(response.headers()['location']!, SITE_ORIGIN)
    : null

const lang = async (response: { text(): Promise<string> }) =>
  /<html lang="([^"]+)"/.exec(await response.text())?.[1]

test.describe('crawlers', () => {
  for (const path of ['/explore', '/p/MOTIR']) {
    test(`a refused crawler gets 403 on ${path}`, async ({ request }) => {
      const response = await get(request, path, {
        'user-agent': 'Mozilla/5.0 (compatible; AhrefsBot/7.0)',
      })
      expect(response.status()).toBe(403)
    })
  }

  test('a refused crawler still reads robots.txt, a built file', async ({
    request,
  }) => {
    const response = await get(request, '/robots.txt', {
      'user-agent': 'Mozilla/5.0 (compatible; AhrefsBot/7.0)',
    })
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('User-Agent: *')
  })

  test('any crawler gets 403 on a filter URL, before the store is read', async ({
    request,
  }) => {
    const agent = `Googlebot/2.1 (+http://www.google.com/bot.html) ${randomUUID()}`
    const response = await get(request, '/ideas?tag=x', { 'user-agent': agent })
    expect(response.status()).toBe(403)
    // Refused by the router, which logs the refusal and hands nothing on.
    await expect
      .poll(() => workerLogLines().filter((line) => line.ua === agent))
      .toEqual([expect.objectContaining({ refused: true, path: '/ideas' })])
  })

  test('a link previewer on the same filter URL is served', async ({
    request,
  }) => {
    const response = await get(request, '/ideas?tag=x', {
      'user-agent':
        'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
    })
    expect(response.status()).toBe(200)
  })
})

test.describe('the language of a first visit, on the bare /', () => {
  test('a German browser with no cookie is sent to /de, uncached', async ({
    request,
  }) => {
    const response = await get(request, '/', { 'accept-language': 'de-DE,de' })
    expect(response.status()).toBe(307)
    expect(location(response)?.pathname).toBe('/de')
    expect(response.headers()['vary']).toMatch(/Cookie/)
    expect(response.headers()['vary']).toMatch(/Accept-Language/)
    expect(response.headers()['cache-control']).toContain('no-store')
  })

  test('a remembered French choice beats a German browser', async ({
    request,
  }) => {
    const response = await get(request, '/', {
      'accept-language': 'de-DE,de',
      cookie: 'NEXT_LOCALE=fr',
    })
    expect(response.status()).toBe(307)
    expect(location(response)?.pathname).toBe('/fr')
  })

  test('a remembered English choice is served English, marked as varying', async ({
    request,
  }) => {
    const response = await get(request, '/', {
      'accept-language': 'de-DE,de',
      cookie: 'NEXT_LOCALE=en',
    })
    expect(response.status()).toBe(200)
    expect(response.headers()['vary']).toMatch(/Accept-Language/)
    expect(await lang(response)).toBe('en')
  })

  for (const [name, headers] of [
    ['an English browser', { 'accept-language': 'en-US,en' }],
    ['a browser that names no language', {}],
  ] as const) {
    test(`${name} is served English, marked as varying`, async ({
      request,
    }) => {
      const response = await get(request, '/', headers)
      expect(response.status()).toBe(200)
      expect(response.headers()['vary']).toMatch(/Accept-Language/)
      expect(await lang(response)).toBe('en')
    })
  }

  for (const path of ['/price', '/explore']) {
    test(`${path} never redirects to another language`, async ({ request }) => {
      const response = await get(request, path, {
        'accept-language': 'de-DE,de',
        cookie: 'NEXT_LOCALE=fr',
      })
      expect(response.status()).toBe(200)
      expect(location(response)).toBeNull()
      expect(await lang(response)).toBe('en')
    })
  }
})

test.describe('locale spellings and the localized 404', () => {
  for (const [from, to] of [
    ['/zh-TW/price?x=1', '/zh-tw/price?x=1'],
    ['/DE/explore?sort=new', '/de/explore?sort=new'],
    ['/en/ideas?q=returns', '/ideas?q=returns'],
  ]) {
    test(`${from.split('?')[0]} answers 308 to ${to.split('?')[0]}, query kept`, async ({
      request,
    }) => {
      const response = await get(request, from!)
      expect(response.status()).toBe(308)
      const target = location(response)!
      expect(`${target.pathname}${target.search}`).toBe(to)
    })
  }

  for (const [path, locale] of [
    ['/de/does-not-exist', 'de'],
    ['/does-not-exist', 'en'],
  ]) {
    test(`${path} is that locale’s 404 page, with a 404`, async ({
      request,
    }) => {
      const response = await get(request, path!)
      expect(response.status()).toBe(404)
      expect(await lang(response)).toBe(locale)
    })
  }
})
