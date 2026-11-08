// @vitest-environment node
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LOCALE_BCP47, LOCALES, type Locale } from '@/i18n/routing'
import {
  addressesOf,
  checkStaticPages,
  htmlFileFor,
  listFiles,
  main,
  STATIC_PAGES,
  type StaticPage,
} from '@/scripts/i18n/check-static-pages'
import { legalSlugsIn } from '@/lib/legal/slugs'
import { PLACEHOLDER_PRODUCTS, WRITTEN_PRODUCTS } from '@/lib/productAddresses'

/*
 * THE EVERY-LOCALE CHECK OVER THE BUILT OUTPUT (MOTIR-10643), against output
 * directories written here: a whole one passes, and one missing a single
 * locale's file fails naming that route and that locale.
 */

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
  vi.restoreAllMocks()
})

function write(dir: string, file: string, text: string) {
  mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
  writeFileSync(path.join(dir, file), text)
}

const page = (locale: Locale) =>
  `<!doctype html><html lang="${LOCALE_BCP47[locale]}" class="antialiased"><head></head><body></body></html>`

/** A build holding every registered page in every locale, unless told not to. */
function output(
  pages: readonly StaticPage[],
  skip?: { address: string; locale: Locale },
): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'static-pages-'))
  dirs.push(dir)
  for (const p of pages)
    for (const address of addressesOf(p))
      for (const locale of LOCALES) {
        if (skip?.address === address && skip.locale === locale) continue
        write(dir, htmlFileFor(locale, address), page(locale))
      }
  write(dir, '_astro/site.css', 'body{}')
  return dir
}

const PAGES: StaticPage[] = [
  { route: '/' },
  { route: '/price' },
  { route: '/legal/[slug]', slugs: ['terms', 'privacy'] },
]

describe('the output file for an address', () => {
  it('is unprefixed for English and under the locale for the rest', () => {
    expect(htmlFileFor('en', '/')).toBe('index.html')
    expect(htmlFileFor('de', '/')).toBe('de.html')
    expect(htmlFileFor('en', '/price')).toBe('price.html')
    expect(htmlFileFor('zh-tw', '/legal/terms')).toBe('zh-tw/legal/terms.html')
    expect(htmlFileFor('fr', '/404')).toBe('fr/404.html')
  })

  it('expands a slug route into one address per slug, and refuses one with none', () => {
    expect(addressesOf(PAGES[2]!)).toEqual(['/legal/terms', '/legal/privacy'])
    expect(() => addressesOf({ route: '/legal/[slug]' })).toThrow(
      '/legal/[slug] has a [slug] segment and no slugs',
    )
  })
})

describe('the check', () => {
  it('passes a whole build and counts its files', () => {
    const result = checkStaticPages({ dir: output(PAGES), pages: PAGES })
    expect(result.problems).toEqual([])
    expect(result.pagesChecked).toBe(4 * LOCALES.length)
    expect(result.fileCount).toBe(4 * LOCALES.length + 1)
  })

  it('fails a build missing one locale’s file, naming the route and the locale', () => {
    const dir = output(PAGES, { address: '/legal/privacy', locale: 'ko' })
    expect(checkStaticPages({ dir, pages: PAGES }).problems).toEqual([
      '/legal/privacy [ko]: no ko/legal/privacy.html in the build',
    ])
  })

  it('fails a page whose <html lang> is not its locale’s tag', () => {
    const dir = output(PAGES)
    write(dir, 'zh-tw/price.html', page('zh'))
    expect(checkStaticPages({ dir, pages: PAGES }).problems).toEqual([
      '/price [zh-tw]: <html lang="zh">, not "zh-TW"',
    ])
  })

  it('fails a page that declares no language at all', () => {
    const dir = output(PAGES)
    write(dir, 'price.html', '<!doctype html><html><body></body></html>')
    expect(checkStaticPages({ dir, pages: PAGES }).problems).toEqual([
      '/price [en]: <html lang="">, not "en"',
    ])
  })

  it('fails any file that names a Google Fonts host', () => {
    const dir = output(PAGES)
    write(
      dir,
      '_astro/fonts.css',
      "@import url('https://fonts.googleapis.com/css2?family=Inter');",
    )
    expect(checkStaticPages({ dir, pages: PAGES }).problems).toEqual([
      '_astro/fonts.css: names fonts.googleapis.com',
    ])
  })

  it('fails an output over the Workers file limit', () => {
    const dir = output(PAGES)
    expect(checkStaticPages({ dir, pages: PAGES, limit: 10 }).problems).toEqual(
      [`the output holds ${4 * LOCALES.length + 1} files, over 10`],
    )
  })
})

describe('the registry', () => {
  it('starts with the not-found room', () => {
    expect(STATIC_PAGES).toContainEqual({ route: '/404' })
  })

  it('holds the content pages (MOTIR-10644)', () => {
    const routes = STATIC_PAGES.map((page) => page.route)
    for (const route of [
      '/',
      '/price',
      '/how-it-works',
      '/how-to-use',
      '/how-the-calculation-works',
      '/design',
      '/legal',
      ...WRITTEN_PRODUCTS.map((slug) => `/products/${slug}`),
    ])
      expect(routes).toContain(route)
  })

  it('reads the legal slugs off content/legal/, and the product slugs off their list', () => {
    expect(STATIC_PAGES).toContainEqual({
      route: '/legal/[slug]',
      slugs: legalSlugsIn(),
    })
    expect([...legalSlugsIn()].sort()).toEqual(
      readdirSync(path.join(process.cwd(), 'content', 'legal'))
        .filter((name) => name.endsWith('.md'))
        .map((name) => name.replace(/\.md$/, ''))
        .sort(),
    )
    expect(legalSlugsIn()).toContain('subprocessors')
    expect(STATIC_PAGES).toContainEqual({
      route: '/products/[slug]',
      slugs: PLACEHOLDER_PRODUCTS,
    })
  })

  it('fails a build missing one legal document in one locale, naming both', () => {
    const broken = output(STATIC_PAGES, {
      address: '/legal/subprocessors',
      locale: 'ja',
    })
    expect(
      checkStaticPages({ dir: broken, pages: STATIC_PAGES }).problems,
    ).toEqual([
      '/legal/subprocessors [ja]: no ja/legal/subprocessors.html in the build',
    ])
  })

  it('never registers a product that forwards to its docs', () => {
    const addresses = STATIC_PAGES.flatMap(addressesOf)
    expect(addresses).not.toContain('/products/mcp')
    expect(addresses).toContain('/products/project-manager')
  })
})

describe('the command', () => {
  it('passes a whole build of the registry, and fails one missing a locale', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(main(['--dir', output(STATIC_PAGES)])).toBe(0)
    expect(log.mock.calls.at(-1)?.[0]).toMatch(/: whole$/)

    const broken = output(STATIC_PAGES, { address: '/404', locale: 'pl' })
    expect(main(['--dir', broken])).toBe(1)
    expect(error).toHaveBeenCalledWith(
      'FAIL /404 [pl]: no pl/404.html in the build',
    )
  })

  it('reads `dist/` in the working directory by default', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const root = mkdtempSync(path.join(tmpdir(), 'static-pages-root-'))
    dirs.push(root)
    const built = output(STATIC_PAGES)
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root)
    // `path.resolve` reads `process.cwd()`; the build is moved under it.
    mkdirSync(path.join(root, 'dist'))
    for (const file of listFiles(built))
      write(
        path.join(root, 'dist'),
        file,
        readFileSync(path.join(built, file), 'utf8'),
      )
    expect(main([])).toBe(0)
    expect(main(['--dir'])).toBe(0)
    cwd.mockRestore()
  })

  it('says to build first when there is no output', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(main(['--dir', path.join(tmpdir(), 'no-such-build-dir')])).toBe(1)
    expect(error.mock.calls[0]?.[0]).toMatch(/run `pnpm build` first/)
  })
})
