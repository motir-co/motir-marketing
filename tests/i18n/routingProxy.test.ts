import { describe, expect, it, vi } from 'vitest'

/*
 * THE LOCALE ROUTING THROUGH `proxy.ts` (MOTIR-7948), held with `proxy.ts`
 * until the decommission card (MOTIR-10639) deletes both. Each case has its
 * Worker counterpart in `tests/worker/router.test.ts`:
 *   - the English rewrite and the prefixed locales: "the assets fallthrough"
 *   - the locale-case 308s and the near-miss: "the case and prefix redirects"
 *   - files and root metadata outside the tree: the assets fallthrough, and
 *     `tests/worker/runWorkerFirst.test.ts` keeping them off the Worker
 *   - the share card: `tests/worker/projectShareImage.test.tsx`
 * The proxy-free cases are in `routing.test.ts`.
 */

// The site branch must not reach the contract; a call would be the defect.
const resolveHost = vi.fn()
vi.mock('@/lib/hostResolution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hostResolution')>()),
  resolveHost,
}))

const { proxy } = await import('@/proxy')
const { NextRequest } = await import('next/server')

const request = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(url, { headers: { host: new URL(url).host, ...headers } })

const rewriteOf = (res: Response) => {
  const to = res.headers.get('x-middleware-rewrite')
  return to ? new URL(to).pathname : null
}

describe('the site host, through the proxy', () => {
  it('rewrites an unprefixed page onto the English tree, URL unchanged', async () => {
    for (const [path, to] of [
      ['/', '/en'],
      ['/explore', '/en/explore'],
      ['/products/ai-planner', '/en/products/ai-planner'],
    ]) {
      const res = await proxy(request(`https://motir.co${path}`))
      expect(rewriteOf(res), path).toBe(to)
      expect(res.headers.get('location'), path).toBeNull()
    }
    expect(resolveHost).not.toHaveBeenCalled()
  })

  it('serves another locale at its own prefix', async () => {
    for (const path of ['/ja', '/de/products/ai-planner', '/zh/explore']) {
      const res = await proxy(request(`https://motir.co${path}`))
      expect(res.headers.get('location'), path).toBeNull()
      expect(rewriteOf(res) ?? path, path).toBe(path)
    }
  })

  it('serves the English tree as it is — its own rewrite comes back through the proxy', async () => {
    // The second pass of `/explore` is `/en/explore`. A redirect here sent the
    // standalone server's `/` back to `/` forever (measured), so both a
    // re-entered rewrite and a typed `/en/…` are served without one.
    for (const path of ['/en', '/en/explore', '/en/docs/mcp']) {
      const res = await proxy(request(`https://motir.co${path}`))
      expect(res.headers.get('location'), path).toBeNull()
      expect(rewriteOf(res), path).toBeNull()
      expect(res.headers.get('x-middleware-next'), path).toBe('1')
    }
  })

  it('answers a locale segment spelled in another case with a 308 to the URL code (MOTIR-9249)', async () => {
    for (const [path, to] of [
      ['/zh-TW/docs/mcp?x=1', '/zh-tw/docs/mcp?x=1'],
      ['/zh-TW', '/zh-tw'],
      ['/ZH-TW/explore', '/zh-tw/explore'],
      ['/zh-TW/opengraph-image', '/zh-tw/opengraph-image'],
      ['/JA/design', '/ja/design'],
    ]) {
      const res = await proxy(request(`https://motir.co${path}`))
      expect(res.status, path).toBe(308)
      const location = new URL(res.headers.get('location')!)
      expect(`${location.pathname}${location.search}`, path).toBe(to)
      expect(res.headers.get('vary'), path).toBeNull()
    }
  })

  it('serves /zh-tw as it is, and leaves a near-miss segment alone', async () => {
    const served = await proxy(request('https://motir.co/zh-tw/explore'))
    expect(served.headers.get('location')).toBeNull()
    expect(rewriteOf(served) ?? '/zh-tw/explore').toBe('/zh-tw/explore')
    const nearMiss = await proxy(request('https://motir.co/zh-TWx'))
    expect(nearMiss.status).not.toBe(308)
    expect(rewriteOf(nearMiss)).toBe('/en/zh-TWx')
  })

  it('still routes a path that merely starts with the letters en', async () => {
    const res = await proxy(request('https://motir.co/enterprise'))
    expect(rewriteOf(res)).toBe('/en/enterprise')
  })

  it('leaves files and root metadata routes OUTSIDE the locale tree', async () => {
    // Under `/en/…` each of these would 404 — the logo and the crawl files.
    for (const path of [
      '/motir-mark.svg',
      '/robots.txt',
      '/sitemap.xml',
      '/favicon.ico',
      '/icon.svg',
      '/icon',
      '/icon-1br99b',
    ]) {
      const res = await proxy(request(`https://motir.co${path}`))
      expect(rewriteOf(res), path).toBeNull()
      expect(res.headers.get('x-middleware-next'), path).toBe('1')
    }
  })

  it('serves the share card from inside the locale tree, never redirecting it (MOTIR-7972)', async () => {
    // The card lives at `app/[locale]/opengraph-image.tsx`: English's
    // unprefixed address is REWRITTEN onto `/en/…`, and a prefixed one is
    // served as it is — never through next-intl, never detected.
    for (const path of ['/opengraph-image', '/opengraph-image-1br99b']) {
      const res = await proxy(
        request(`https://motir.co${path}`, { 'accept-language': 'ja' }),
      )
      expect(res.headers.get('location'), path).toBeNull()
      expect(rewriteOf(res), path).toBe(`/en${path}`)
    }
    for (const path of ['/ja/opengraph-image', '/en/opengraph-image']) {
      const res = await proxy(
        request(`https://motir.co${path}`, { 'accept-language': 'de' }),
      )
      expect(res.headers.get('location'), path).toBeNull()
      expect(rewriteOf(res), path).toBeNull()
      expect(res.headers.get('x-middleware-next'), path).toBe('1')
    }
  })
})
