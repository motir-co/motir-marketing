// @vitest-environment node
import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { localeParams, enterLocale } from '@/i18n/locale'
import { englishCopy, getCopy, usePageLocale } from '@/lib/copy'
import { PageRoot } from '@/lib/pageRoot'
import {
  localeSegment,
  localeSlugStaticPaths,
  localeStaticPaths,
  pageLocale,
  servedPathname,
} from '@/lib/staticPaths'
import { serializeJsonForScript } from '@/lib/scriptJson'
import { LOCALES } from '@/i18n/routing'
import { renderToReadableStream } from 'react-dom/server'

/*
 * ONE PAGE, ONE REACT ROOT, ONE LOCALE (MOTIR-10643): the page root wraps a
 * page module in its route layouts and the site's body, and every component
 * inside reads the page's locale — `async` page modules included, which is why
 * the root is rendered with React's streaming renderer, as Astro renders it.
 */

async function html(node: ReactNode): Promise<string> {
  const stream = await renderToReadableStream(node)
  await stream.allReady
  return (await new Response(stream).text()).replace(/<!-- -->/g, '')
}

describe('the page root', () => {
  it('renders an async page inside its layouts, outermost first, in the site body', async () => {
    const copy = await getCopy('fr')
    const Locale = () => <i>{usePageLocale()}</i>
    async function Page({ params }: { params: Promise<{ locale: string }> }) {
      const locale = await enterLocale(params)
      return (
        <p>
          page {locale} <Locale />
        </p>
      )
    }
    const Outer = ({ children }: { children: ReactNode }) => (
      <section>{children}</section>
    )
    const Inner = ({ children }: { children: ReactNode }) => (
      <article>{children}</article>
    )
    const out = await html(
      <PageRoot
        value={{ locale: 'fr', copy, pathname: '/fr/price' }}
        page={Page}
        layouts={[Outer, Inner]}
        params={localeParams('fr')}
      />,
    )
    expect(out).toMatch(
      /<section><article><p>page fr <i>fr<\/i><\/p><\/article><\/section>/,
    )
    // The site body: the tilt island before the page, the entity graph after.
    expect(out.indexOf('data-island="ImmersiveTilt"')).toBeLessThan(
      out.indexOf('<section>'),
    )
    expect(out.indexOf('application/ld+json')).toBeGreaterThan(
      out.indexOf('</section>'),
    )
  })

  it('renders a page with no layouts', () => {
    const Page = () => <p>bare</p>
    const out = renderToString(
      <PageRoot
        value={{ locale: 'en', copy: englishCopy, pathname: '/' }}
        page={Page}
        params={localeParams('en')}
      />,
    ).replace(/<!-- -->/g, '')
    expect(out).toContain('<p>bare</p>')
  })
})

describe('the build paths', () => {
  it('spell English unprefixed and every other locale by its code', () => {
    expect(localeSegment('en')).toBeUndefined()
    expect(localeSegment('zh-tw')).toBe('zh-tw')
    expect(localeStaticPaths()).toHaveLength(LOCALES.length)
    expect(localeStaticPaths()[0]).toEqual({ params: { locale: undefined } })
  })

  it('build every slug in every locale', () => {
    const paths = localeSlugStaticPaths('slug', ['terms', 'privacy'])
    expect(paths).toHaveLength(2 * LOCALES.length)
    expect(paths).toContainEqual({ params: { locale: 'de', slug: 'privacy' } })
    expect(paths).toContainEqual({
      params: { locale: undefined, slug: 'terms' },
    })
  })

  it('read the locale back, and refuse a segment no page is built for', () => {
    expect(pageLocale({})).toBe('en')
    expect(pageLocale({ locale: 'ja' })).toBe('ja')
    expect(() => pageLocale({ locale: 'en' })).toThrow(
      'No page is built for the locale segment "en"',
    )
    expect(() => pageLocale({ locale: 'sv' })).toThrow('"sv"')
  })

  it('name a page by the address it is served at, not the file it is written to', () => {
    expect(servedPathname('/index.html')).toBe('/')
    expect(servedPathname('/de.html')).toBe('/de')
    expect(servedPathname('/de/price.html')).toBe('/de/price')
    expect(servedPathname('/docs/mcp.html')).toBe('/docs/mcp')
    expect(servedPathname('/docs/mcp/index.html')).toBe('/docs/mcp')
    expect(servedPathname('/legal/terms')).toBe('/legal/terms')
    expect(servedPathname('/')).toBe('/')
  })

  it('hand a page module the params it had under Next', async () => {
    await expect(localeParams('de', { slug: 'terms' })).resolves.toEqual({
      locale: 'de',
      slug: 'terms',
    })
    await expect(enterLocale(Promise.resolve({ locale: 'xx' }))).resolves.toBe(
      'en',
    )
  })
})

describe('JSON in a script element', () => {
  it('stays the same JSON and cannot close or comment out the element', () => {
    const value = { text: '</script><!-- & \u2028\u2029' }
    const written = serializeJsonForScript(value)
    expect(written).not.toMatch(/[<>&\u2028\u2029]/)
    expect(JSON.parse(written)).toEqual(value)
  })
})
