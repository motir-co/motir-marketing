import { describe, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/*
 * HELD with `proxy.ts` until MOTIR-10639 deletes both: the two cases of the
 * MOTIR-8089 gate that drive `proxy()`. On the Worker, `/en/legal/…` is a
 * `_redirects` 308 onto `/legal/…` and only the bare `/` is detected, so
 * neither case survives; `e2e/specs/acceptance-legal-binding-english-live.spec.ts`
 * is what measures the link now, and the rest of the gate is in
 * `bindingEnglishNoteGate.test.tsx`.
 *
 * MOTIR-8089 — the coverage + integration gate for Story MOTIR-7740 (legal
 * pages stay English, under a localized note that the English text binds).
 *
 * Each building card proved its own piece on a sample: the catalogue keys
 * (MOTIR-8087), the rendered note and its `lang` marks (MOTIR-8088), and the
 * English-only crawl data (MOTIR-8086). This file proves the pieces AGREE once
 * assembled, for EVERY document the directory holds in EVERY locale: the note
 * is the catalogue's, its link really serves English at the proxy, the English
 * text is identical to English, the page head and the sitemap name the same
 * address, and an unknown slug is a 404.
 *
 * Everything is the real thing: the loader, the catalogues, the pages awaited
 * and rendered, `sitemap()`, `proxy()`. Nothing is a fixture list.
 */

// Empty headers read as the SITE host for `sitemap()` and the pages.
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
// The site branch of the proxy never resolves a host; a call would be the defect.
const resolveHost = vi.fn()
vi.mock('@/lib/hostResolution', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/hostResolution')>()),
  resolveHost,
}))

const {
  default: LegalDocumentPage,
  generateMetadata,
  generateStaticParams,
} = await import('@/app/[locale]/legal/[slug]/LegalDocumentRoute')
const { default: LegalIndexPage, generateMetadata: indexMetadata } =
  await import('@/app/[locale]/legal/LegalIndexRoute')
const { default: sitemap } = await import('@/tests/helpers/sitemap')
const { proxy } = await import('@/proxy')
const { NextRequest } = await import('next/server')
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
const { LOCALE_COOKIE } = await import('@/lib/localeDetection')

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

const request = (path: string, headers: Record<string, string>) =>
  new NextRequest(`https://motir.co${path}`, {
    headers: { host: 'motir.co', ...headers },
  })

/** The body wrapper the document page marks English. */
const bodyOf = (page: HTMLElement) =>
  page.querySelector('header')!.nextElementSibling as HTMLElement

describe('the link serves English, through the proxy', () => {
  it.each(OTHER_MATRIX)(
    '[%s] the proxy serves /en/legal/%s as it is, and leaves the remembered language alone',
    async (locale, slug) => {
      const res = await proxy(
        request(englishLegalPath(slug), {
          cookie: `${LOCALE_COOKIE}=${locale}`,
          'accept-language': locale,
        }),
      )
      expect(res.status).toBeLessThan(300)
      expect(res.headers.get('location')).toBeNull()
      expect(res.headers.get('set-cookie') ?? '').not.toContain(LOCALE_COOKIE)
      expect(resolveHost).not.toHaveBeenCalled()
    },
  )

  it.each(OTHER)(
    '[%s] the counterfactual: an unprefixed link would be sent back to the reader’s language',
    async (locale) => {
      const slug = SLUGS[0]!
      const res = await proxy(
        request(`/legal/${slug}`, {
          cookie: `${LOCALE_COOKIE}=${locale}`,
          'accept-language': locale,
        }),
      )
      expect(res.status).toBe(307)
      expect(new URL(res.headers.get('location')!).pathname).toBe(
        `/${locale}/legal/${slug}`,
      )
    },
  )
})
