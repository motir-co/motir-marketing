import { describe, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/*
 * MOTIR-8089 — the coverage + integration gate for Story MOTIR-7740 (legal
 * pages stay English, under a localized note that the English text binds).
 *
 * Each building card proved its own piece on a sample: the catalogue keys
 * (MOTIR-8087), the rendered note and its `lang` marks (MOTIR-8088), and the
 * English-only crawl data (MOTIR-8086). This file proves the pieces AGREE once
 * assembled, for EVERY document the directory holds in EVERY locale: the note
 * is the catalogue's, its link names the English address, the English
 * text is identical to English, the page head and the sitemap name the same
 * address, and an unknown slug is a 404.
 *
 * Everything is the real thing: the loader, the catalogues, the pages awaited
 * and rendered, `sitemap()`. Nothing is a fixture list.
 *
 * What the link LANDS on is the Worker's now (MOTIR-10758): `/en/legal/…` is a
 * `_redirects` 308 onto `/legal/…`, and the remembered language never moves a
 * page but the bare `/` — `e2e/specs/acceptance-legal-binding-english-live.spec.ts`
 * follows the link through `wrangler dev`, and `tests/worker/router.test.ts`
 * ("never moves …") pins the rule. The Next-router cases went with that
 * router (MOTIR-10639).
 */

// Empty headers read as the SITE host for `sitemap()` and the pages.
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))

const { default: LegalDocumentPage, generateMetadata } =
  await import('@/app/[locale]/legal/[slug]/LegalDocumentRoute')
const { default: LegalIndexPage, generateMetadata: indexMetadata } =
  await import('@/app/[locale]/legal/LegalIndexRoute')
const { default: sitemap } = await import('@/tests/helpers/sitemap')
const { render } = await import('@/tests/helpers/withCopy')
const { resolveAsync } = await import('@/tests/helpers/resolveAsync')
const { LOCALES, DEFAULT_LOCALE } = await import('@/i18n/routing')
const { localizedPath } = await import('@/i18n/localizedPath')
const { format, getCopy } = await import('@/lib/copy')
const { getLegalDocument, legalDocumentSlugs, listLegalDocuments } =
  await import('@/lib/legal/documents')
const { englishLegalPath } = await import('@/lib/legal/englishAddress')
const { englishOnlyCanonical } = await import('@/lib/localeMetadata')
const { siteUrl } = await import('@/lib/siteOrigin')

type Locale = (typeof LOCALES)[number]

const SLUGS = legalDocumentSlugs()
const OTHER = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE)
const MATRIX = LOCALES.flatMap((locale) =>
  SLUGS.map((slug) => [locale, slug] as const),
)
const OTHER_MATRIX = MATRIX.filter(([locale]) => locale !== DEFAULT_LOCALE)

// ── One render per page, shared by every case below ──────────────────────────
// RTL unmounts every render after each test, so the cache holds a DETACHED
// CLONE of each rendered page: a static copy every case can query.
const documents = new Map<string, Promise<HTMLElement>>()
const indexes = new Map<string, Promise<HTMLElement>>()

async function renderedClone(
  page: Promise<React.ReactNode>,
  locale: Locale,
): Promise<HTMLElement> {
  const ui = (await resolveAsync(await page)) as never
  const result = render(ui, { locale, messages: await getCopy(locale) })
  const clone = result.container.cloneNode(true) as HTMLElement
  result.unmount()
  return clone
}

function documentPage(locale: Locale, slug: string): Promise<HTMLElement> {
  const key = `${locale} ${slug}`
  if (!documents.has(key)) {
    documents.set(
      key,
      renderedClone(
        LegalDocumentPage({ params: Promise.resolve({ locale, slug }) }),
        locale,
      ),
    )
  }
  return documents.get(key)!
}

function indexPage(locale: Locale): Promise<HTMLElement> {
  if (!indexes.has(locale)) {
    indexes.set(
      locale,
      renderedClone(
        LegalIndexPage({ params: Promise.resolve({ locale }) }),
        locale,
      ),
    )
  }
  return indexes.get(locale)!
}

/** A catalogue sentence as the page shows it: its one `<link>` tag stripped. */
const plain = (template: string) => template.replace(/<\/?link>/g, '')

const precedes = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

/** The body wrapper the document page marks English. */
const bodyOf = (page: HTMLElement) =>
  page.querySelector('header')!.nextElementSibling as HTMLElement

describe('the population is real', () => {
  it('sweeps twelve locales and at least seven documents', () => {
    expect(LOCALES).toHaveLength(12)
    expect(SLUGS.length).toBeGreaterThanOrEqual(7)
    expect(MATRIX).toHaveLength(LOCALES.length * SLUGS.length)
  })
})

describe('the note', () => {
  it.each(OTHER_MATRIX)(
    '[%s] /legal/%s: exactly one note, the catalogue’s sentence, above the English h1',
    async (locale, slug) => {
      const page = await documentPage(locale, slug)
      const notes = page.querySelectorAll('[role="note"]')
      expect(notes).toHaveLength(1)
      const text = notes[0]!.textContent ?? ''
      const copy = await getCopy(locale)
      const english = await getCopy(DEFAULT_LOCALE)
      expect(text).toBe(plain(copy.legal.bindingNote.document))
      expect(text).not.toBe(plain(english.legal.bindingNote.document))
      expect(text).not.toContain('legal.bindingNote')
      // Panel A: after the breadcrumb, before the English title and body.
      expect(precedes(page.querySelector('nav')!, notes[0]!)).toBe(true)
      expect(precedes(notes[0]!, page.querySelector('h1')!)).toBe(true)
      expect(precedes(notes[0]!, bodyOf(page))).toBe(true)
    },
  )

  it.each(OTHER)(
    '[%s] /legal: exactly one note, the index sentence, between intro and list',
    async (locale) => {
      const page = await indexPage(locale)
      const notes = page.querySelectorAll('[role="note"]')
      expect(notes).toHaveLength(1)
      const copy = await getCopy(locale)
      const english = await getCopy(DEFAULT_LOCALE)
      expect(notes[0]!.textContent).toBe(copy.legal.bindingNote.index)
      expect(notes[0]!.textContent).not.toBe(english.legal.bindingNote.index)
      // Panel B: the index note carries no link.
      expect(notes[0]!.querySelectorAll('a')).toHaveLength(0)
      expect(precedes(page.querySelector('p')!, notes[0]!)).toBe(true)
      expect(precedes(notes[0]!, page.querySelector('ul')!)).toBe(true)
    },
  )

  it.each(SLUGS)('[en] /legal/%s and /legal: no note', async (slug) => {
    expect(
      (await documentPage('en', slug)).querySelectorAll('[role="note"]'),
    ).toHaveLength(0)
    expect(
      (await indexPage('en')).querySelectorAll('[role="note"]'),
    ).toHaveLength(0)
  })
})

describe('the link serves English', () => {
  it.each(OTHER_MATRIX)(
    '[%s] /legal/%s: the note links to englishLegalPath(slug)',
    async (locale, slug) => {
      const links = (await documentPage(locale, slug)).querySelectorAll(
        '[role="note"] a',
      )
      expect(links).toHaveLength(1)
      expect(links[0]!.getAttribute('href')).toBe(englishLegalPath(slug))
      expect(englishLegalPath(slug)).toBe(`/en/legal/${slug}`)
    },
  )

  it.each(SLUGS)(
    'what /en/legal/%s lands on: the English page, no note',
    async (slug) => {
      expect(
        (await documentPage('en', slug)).querySelectorAll('[role="note"]'),
      ).toHaveLength(0)
    },
  )
})

describe('lang="en" on exactly the English text', () => {
  it.each(OTHER_MATRIX)(
    '[%s] /legal/%s: the h1 and the body wrapper, nothing else',
    async (locale, slug) => {
      const page = await documentPage(locale, slug)
      const marked = [...page.querySelectorAll('[lang]')]
      expect(marked).toEqual([page.querySelector('h1'), bodyOf(page)])
      for (const el of marked) expect(el.getAttribute('lang')).toBe('en')
      expect(page.querySelector('nav')!.closest('[lang]')).toBeNull()
      expect(page.querySelector('header p')!.closest('[lang]')).toBeNull()
      expect(page.querySelector('[role="note"]')!.closest('[lang]')).toBeNull()
    },
  )

  it.each(OTHER)(
    '[%s] /legal: every row title span, nothing else',
    async (locale) => {
      const page = await indexPage(locale)
      const marked = [...page.querySelectorAll('[lang]')]
      const titles = [...page.querySelectorAll('ul li a > span:first-child')]
      expect(marked).toEqual(titles)
      expect(titles).toHaveLength(SLUGS.length)
      for (const el of marked) expect(el.getAttribute('lang')).toBe('en')
    },
  )

  it.each(SLUGS)(
    '[en] /legal/%s carries the same marks, the same way for every slug',
    async (slug) => {
      const page = await documentPage('en', slug)
      expect([...page.querySelectorAll('[lang]')]).toEqual([
        page.querySelector('h1'),
        bodyOf(page),
      ])
    },
  )
})

describe('the English content is identical to English', () => {
  /** A root-relative body href keeps the reader's language (MarkdownBody, MOTIR-7971). */
  const localizedHref = (locale: Locale, href: string) =>
    href.startsWith('/') && !href.startsWith('//')
      ? localizedPath(locale, href)
      : href

  it.each(OTHER_MATRIX)(
    '[%s] /legal/%s: same title, same body text, same destinations',
    async (locale, slug) => {
      const page = await documentPage(locale, slug)
      const english = await documentPage('en', slug)
      expect(page.querySelector('h1')!.textContent).toBe(
        english.querySelector('h1')!.textContent,
      )
      expect(bodyOf(page).textContent).toBe(bodyOf(english).textContent)
      const hrefs = (root: HTMLElement) =>
        [...root.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')
      expect(hrefs(bodyOf(page))).toEqual(
        hrefs(bodyOf(english)).map((href) => localizedHref(locale, href)),
      )
    },
  )

  it.each(MATRIX)(
    '[%s] /legal/%s: the version line is the locale’s sentence over the English values',
    async (locale, slug) => {
      const doc = getLegalDocument(slug)!
      const copy = await getCopy(locale)
      const expected = doc.effectiveDate
        ? format(copy.legal.versionAndEffective, {
            version: doc.version,
            date: doc.effectiveDate,
          })
        : format(copy.legal.versionNotYetEffective, { version: doc.version })
      expect(
        (await documentPage(locale, slug)).querySelector('header p')!
          .textContent,
      ).toBe(expected)
    },
  )

  it.each(LOCALES)(
    '[%s] /legal: the row titles are the English front-matter titles, in order',
    async (locale) => {
      const titles = [
        ...(await indexPage(locale)).querySelectorAll(
          'ul li a > span:first-child',
        ),
      ].map((el) => el.textContent)
      expect(titles).toEqual(listLegalDocuments().map((doc) => doc.title))
    },
  )
})

describe('the page head and the sitemap agree', () => {
  const entries = sitemap()

  it.each(MATRIX)(
    '[%s] /legal/%s: one canonical, the English document, the same as its one sitemap entry',
    async (locale, slug) => {
      const meta = await generateMetadata({
        params: Promise.resolve({ locale, slug }),
      })
      const expected = englishOnlyCanonical(`/legal/${slug}`)
      expect(meta.alternates?.canonical).toBe(expected)
      expect(meta.alternates).not.toHaveProperty('languages')
      const listed = (await entries).filter((entry) =>
        entry.url.endsWith(`/legal/${slug}`),
      )
      expect(listed.map((entry) => entry.url)).toEqual([expected])
    },
  )

  it('lists no language-prefixed legal document', async () => {
    const prefixed = (await entries).filter((entry) =>
      OTHER.some((locale) =>
        new RegExp(`/${locale}/legal/[^/]+$`).test(entry.url),
      ),
    )
    expect(prefixed).toEqual([])
  })

  it.each(LOCALES)('[%s] /legal keeps its own canonical', async (locale) => {
    const meta = await indexMetadata({ params: Promise.resolve({ locale }) })
    expect(meta.alternates?.canonical).toBe(
      siteUrl(localizedPath(locale, '/legal')),
    )
  })
})

describe('an unknown slug is never built', () => {
  it.each(LOCALES)('[%s] /legal/does-not-exist', async (locale) => {
    // Only the documents on disk are built; the address answers the static
    // 404 room (`worker/notFound.ts`), so a slug that names none is a BUILD
    // error, never a page.
    await expect(
      LegalDocumentPage({
        params: Promise.resolve({ locale, slug: 'does-not-exist' }),
      }),
    ).rejects.toThrow('does-not-exist')
    expect(
      await generateMetadata({
        params: Promise.resolve({ locale, slug: 'does-not-exist' }),
      }),
    ).toEqual({})
  })

  it('the Astro page builds exactly the documents on disk', () => {
    const page = readFileSync(
      join('src', 'pages', '[...locale]', 'legal', '[slug].astro'),
      'utf8',
    )
    expect(page).toMatch(
      /localeSlugStaticPaths\('slug', legalDocumentSlugs\(\)\)/,
    )
    expect([...SLUGS].sort()).toEqual(
      readdirSync(join('content', 'legal'))
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.replace(/\.md$/, ''))
        .sort(),
    )
  })
})

describe('a new document needs no code edit', () => {
  it('no slug is a literal in the legal pages or the note', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        return statSync(path).isDirectory() ? walk(path) : [path]
      })
    const files = walk('app/[locale]/legal')
    expect(files).toContain(
      'app/[locale]/legal/_components/BindingEnglishNote.tsx',
    )
    for (const file of files) {
      // Code only: a comment may NAME a document by way of example (the
      // layout's does), and only code can enumerate one.
      const source = readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\*|\/\/|\/\*|\{\/\*)/.test(line))
        .join('\n')
      for (const slug of SLUGS) {
        expect(source, `${file} names '${slug}'`).not.toMatch(
          new RegExp(`['"\`/]${slug}['"\`]`),
        )
      }
    }
  })
})
