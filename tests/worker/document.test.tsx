// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { AppOriginProvider, useAppOrigin } from '@/lib/appOriginContext'
import type { Env } from '@/worker/env'
import { DYNAMIC_CACHE_CONTROL, renderPage } from '@/worker/render/document'
import {
  AssetShellError,
  parseShell,
  readShell,
  resetShell,
} from '@/worker/render/shell'

/*
 * THE WORKER'S DOCUMENT (MOTIR-10753): the build's shell read off a built
 * page, and a page with no island that ships no hydration script.
 */

const BUILT = `<html><head><link rel="preload" href="/_astro/a.woff2" as="font" type="font/woff2" crossorigin=""><link rel="preload" href="/x.js" as="script"><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/_astro/site.css"></head><body><script type="application/json" id="motir-page">{}</script><script type="module" src="/_astro/site.js"></script></body></html>`

function env(pages: Array<() => Response>, calls: string[] = []): Env {
  return {
    ASSETS: {
      async fetch(input) {
        calls.push(String(input))
        return (pages.shift() ?? (() => new Response(BUILT)))()
      },
    },
    MOTIR_APP_ORIGIN: 'https://app.test.motir.co',
    MOTIR_SITE_ORIGIN: 'https://motir.co',
  }
}

const URL_ = new URL('https://motir.co/ideas')

afterEach(() => resetShell())

describe('the asset shell', () => {
  it('reads the font preloads, stylesheets and module scripts a built page links', () => {
    expect(parseShell(BUILT)).toEqual({
      fontPreloads: ['/_astro/a.woff2'],
      stylesheets: ['/_astro/site.css'],
      scripts: ['/_astro/site.js'],
    })
  })

  it.each(['<html></html>', '<link rel="stylesheet" href="/a.css">'])(
    'refuses a page that is not the site build (%s)',
    (html) => {
      expect(() => parseShell(html)).toThrow(AssetShellError)
    },
  )

  it('refuses a source page the assets do not have, and tries again next time', async () => {
    const calls: string[] = []
    const binding = env([() => new Response(null, { status: 404 })], calls)
    await expect(readShell(binding, URL_)).rejects.toThrow(/answered 404/)
    await expect(readShell(binding, URL_)).resolves.toMatchObject({
      scripts: ['/_astro/site.js'],
    })
    expect(calls).toEqual(['https://motir.co/404', 'https://motir.co/404'])
  })
})

describe('renderPage', () => {
  it('writes the document with no hydration script when the page has no island', async () => {
    const response = await renderPage({
      env: env([]),
      url: URL_,
      locale: 'it',
      metadata: [{ title: 'Idee' }],
      body: <p>plain</p>,
      status: 202,
      cacheControl: 'public, max-age=60',
    })
    expect(response.status).toBe(202)
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
    const html = await response.text()
    expect(
      html.startsWith('<!doctype html><html lang="it" class="antialiased"'),
    ).toBe(true)
    expect(html).toContain('<title>Idee</title>')
    expect(html).toContain('<p>plain</p>')
    expect(html).toContain('<link rel="stylesheet" href="/_astro/site.css"/>')
    expect(html).toContain('"pathname":"/ideas"')
    expect(html).not.toContain('type="module"')
  })

  it('is not cached by default', async () => {
    const response = await renderPage({
      env: env([]),
      url: URL_,
      locale: 'en',
      metadata: [],
      body: null,
    })
    expect(response.headers.get('cache-control')).toBe(DYNAMIC_CACHE_CONTROL)
  })
})

describe('the app origin a render points at', () => {
  function Origin() {
    return <>{useAppOrigin()}</>
  }

  it('is the provided one, and the build constant with no provider', () => {
    expect(
      renderToString(
        <AppOriginProvider value="https://other.motir.co">
          <Origin />
        </AppOriginProvider>,
      ),
    ).toBe('https://other.motir.co')
    expect(renderToString(<Origin />)).toBe('https://app.test.motir.co')
  })
})
