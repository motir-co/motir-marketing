import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import LegalDocumentPage from '@/app/[locale]/legal/[slug]/LegalDocumentRoute'
import LegalIndexPage from '@/app/[locale]/legal/LegalIndexRoute'
import { render } from '@/tests/helpers/withCopy'
import { resolveAsync } from '@/tests/helpers/resolveAsync'
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/i18n/routing'
import { getCopy } from '@/lib/copy'
import { legalDocumentSlugs } from '@/lib/legal/documents'
import { englishLegalPath } from '@/lib/legal/englishAddress'

/*
 * MOTIR-8088 — the binding-English note on the legal pages, and the `lang="en"`
 * marks on the English text, built to `design/legal/design-notes.md`
 * § `legal--binding-english-note.*` (panels A–C).
 *
 * Driven over the real `LOCALES` and `legalDocumentSlugs()`. The cross-locale
 * sweep against the proxy and the sitemap is the coverage gate's (MOTIR-8089).
 */

const OTHER = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE)
const SLUGS = legalDocumentSlugs()

async function documentPage(locale: Locale, slug: string) {
  const ui = (await resolveAsync(
    await LegalDocumentPage({ params: Promise.resolve({ locale, slug }) }),
  )) as never
  return render(ui, { locale, messages: await getCopy(locale) }).container
}

async function indexPage(locale: Locale) {
  const ui = (await resolveAsync(
    await LegalIndexPage({ params: Promise.resolve({ locale }) }),
  )) as never
  return render(ui, { locale, messages: await getCopy(locale) }).container
}

/** The note's catalogue sentence, its `<link>` tag stripped. */
const plain = (template: string) => template.replace(/<\/?link>/g, '')

const precedes = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

describe('englishLegalPath', () => {
  it('spells the /en/ address the proxy serves as it is', () => {
    expect(englishLegalPath('terms')).toBe('/en/legal/terms')
    expect(englishLegalPath()).toBe('/en/legal')
  })

  it('is the only spelling of /en/legal: no app/ or lib/ code types it out', () => {
    // Comment lines are skipped: a comment may NAME the address (the helper's
    // own doc comment does, and so does `siteMetadata.ts`'s), and only code can
    // build a link to it.
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(join(dir, entry.name))
          : /\.tsx?$/.test(entry.name)
            ? [join(dir, entry.name)]
            : [],
      )
    const hits = ['app', 'lib'].flatMap((root) =>
      walk(root).flatMap((file) =>
        readFileSync(file, 'utf8')
          .split('\n')
          .filter((line) => /\/en\/legal/.test(line))
          .filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line))
          .map(() => file),
      ),
    )
    // Not even the helper spells it: it builds the address from
    // `DEFAULT_LOCALE`, so no file can retype it — and the page goes through it.
    expect(hits).toEqual([])
    expect(
      readFileSync('app/[locale]/legal/[slug]/LegalDocumentRoute.tsx', 'utf8'),
    ).toContain('englishLegalPath(slug)')
  })
})

describe('a legal document page', () => {
  it.each(
    OTHER.flatMap((locale) => SLUGS.map((slug) => [locale, slug] as const)),
  )(
    '[%s] /legal/%s: one note, above the English h1, linking to the English document',
    async (locale, slug) => {
      const container = await documentPage(locale, slug)
      const notes = container.querySelectorAll('[role="note"]')
      expect(notes).toHaveLength(1)
      const note = notes[0]!
      const copy = await getCopy(locale)
      const english = await getCopy(DEFAULT_LOCALE)
      expect(note.textContent).toBe(plain(copy.legal.bindingNote.document))
      expect(note.textContent).not.toBe(
        plain(english.legal.bindingNote.document),
      )
      const links = note.querySelectorAll('a')
      expect(links).toHaveLength(1)
      expect(links[0]!.getAttribute('href')).toBe(`/en/legal/${slug}`)
      const h1 = container.querySelector('h1')!
      expect(precedes(note, h1)).toBe(true)
      expect(precedes(container.querySelector('nav')!, note)).toBe(true)
    },
  )

  it.each(SLUGS)('[en] /legal/%s: no note', async (slug) => {
    const container = await documentPage('en', slug)
    expect(container.querySelectorAll('[role="note"]')).toHaveLength(0)
    for (const a of container.querySelectorAll('a')) {
      expect(a.getAttribute('href') ?? '').not.toMatch(/^\/en(\/|$)/)
    }
  })

  it('marks exactly the English title and body lang="en"', async () => {
    const container = await documentPage('fr', SLUGS[0]!)
    const marked = [...container.querySelectorAll('[lang]')]
    expect(marked.map((el) => el.getAttribute('lang'))).toEqual(['en', 'en'])
    expect(marked[0]!.tagName).toBe('H1')
    expect(marked[1]!.querySelector('h1, h2, p')).not.toBeNull()
    // The breadcrumb, the version line and the note carry none.
    expect(container.querySelector('nav')!.closest('[lang]')).toBeNull()
    expect(container.querySelector('header p')!.closest('[lang]')).toBeNull()
    expect(
      container.querySelector('[role="note"]')!.closest('[lang]'),
    ).toBeNull()
  })

  it('shows the same English title and body as the English page', async () => {
    const slug = SLUGS[0]!
    const fr = await documentPage('fr', slug)
    const en = await documentPage('en', slug)
    expect(fr.querySelector('h1')!.textContent).toBe(
      en.querySelector('h1')!.textContent,
    )
    const body = (c: HTMLElement) =>
      c.querySelector('div[lang="en"]')?.textContent ??
      c.querySelector('header')!.nextElementSibling!.textContent
    expect(body(fr)).toBe(body(en))
  })

  it('an unknown slug still reaches notFound() before any note', async () => {
    await expect(
      LegalDocumentPage({
        params: Promise.resolve({ locale: 'fr', slug: 'does-not-exist' }),
      }),
    ).rejects.toThrow()
  })
})

describe('the /legal index', () => {
  it.each(OTHER)(
    '[%s] one note between the intro and the list, the index sentence, no link',
    async (locale) => {
      const container = await indexPage(locale)
      const notes = container.querySelectorAll('[role="note"]')
      expect(notes).toHaveLength(1)
      const note = notes[0]!
      const copy = await getCopy(locale)
      expect(note.textContent).toBe(copy.legal.bindingNote.index)
      expect(note.querySelectorAll('a')).toHaveLength(0)
      expect(precedes(container.querySelector('p')!, note)).toBe(true)
      expect(precedes(note, container.querySelector('ul')!)).toBe(true)
    },
  )

  it('[en] no note', async () => {
    const container = await indexPage('en')
    expect(container.querySelectorAll('[role="note"]')).toHaveLength(0)
  })

  it('marks each row title lang="en", and nothing else', async () => {
    const container = await indexPage('fr')
    const marked = [...container.querySelectorAll('[lang]')]
    expect(marked).toHaveLength(SLUGS.length)
    for (const el of marked) {
      expect(el.tagName).toBe('SPAN')
      expect(el.getAttribute('lang')).toBe('en')
      expect(el.closest('a')).not.toBeNull()
    }
  })
})
