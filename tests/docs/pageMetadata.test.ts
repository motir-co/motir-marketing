// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { pathToFileURL } from 'node:url'
import * as docsLayout from '@/app/[locale]/docs/DocsLayout'
import { LOCALES } from '@/i18n/routing'
import { englishCopy as copy, getCopy } from '@/lib/copy'
import { DOCS_ROUTES } from '@/lib/docsSurfaces'
import type { Metadata } from '@/lib/metadata'
import { siteUrl } from '@/lib/siteOrigin'
import { pageFileOf } from '@/tests/helpers/docsRoutes'

/*
 * EVERY `/docs` PAGE PUBLISHES ITS OWN TITLE (MOTIR-4429).
 *
 * ── The defect this closes, which is a REGRESSION of a fixed one ────────────
 * `app/[locale]/docs/DocsLayout.tsx` exported the only metadata in the tree and every page
 * inherited it, so `/docs/mcp`, `/docs/cli`, `/docs/sandbox`, `/docs/api` and
 * the rest all published "Docs · Motir" — in the browser tab, in search
 * results, in a shared link's preview, and to a screen reader on arrival.
 *
 * That is exactly the defect MOTIR-2526 fixed in motir-core, page by page,
 * before the cutover; `lib/apiDocs/pageMetadata.ts` and eight
 * `generateMetadata` exports were deleted with the pages and nothing replaced
 * them. MOTIR-4397's parity ledger did not measure it — its instrument was
 * rendered TEXT — which is precisely why it is in this card: the ledger's own
 * last criterion is that every difference is restored or recorded, and a
 * difference nobody's instrument could see is the family this whole bug is
 * about.
 *
 * ── Why the check is structural rather than a render ────────────────────────
 * Nothing FAILS when a page inherits: the shell supplies a title, so every
 * page has one. It is invisible from inside the product and visible only from
 * outside it. So the check reads the file system — every page under `app/[locale]/docs`
 * must carry the export — which also means a page added tomorrow is covered
 * without anybody remembering to add a case.
 *
 * ── THE PATTERN, chosen once and applied to all of them ─────────────────────
 *
 *     <page> · Motir docs                     — a page that IS a surface
 *     <page> · <surface> · Motir docs         — a page INSIDE a surface
 *
 * The middle segment appears exactly when the page is not itself the surface,
 * which is the same fact the rail's second tier is gated on, read one layer
 * out.
 */

const DOCS_ROOT = join(process.cwd(), 'app', '[locale]', 'docs')

/**
 * The docs index, which names the AREA's title (`docs.metaTitle`) — that page
 * IS the area. It used to inherit the layout's; since MOTIR-7956 it exports its
 * own, because the canonical and the `hreflang` set are each page's and a
 * layout's would be inherited by every page under it.
 */
const INDEX = join(DOCS_ROOT, '(guides)', 'DocsIndexRoute.tsx')

/** Every page module (`<Name>Route.tsx`) under `app/[locale]/docs`, found rather than listed. */
function docsPages(dir: string = DOCS_ROOT): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return docsPages(full)
    return /^[A-Z]\w*Route\.tsx$/.test(entry) ? [full] : []
  })
}

describe('every /docs page publishes its own title and description', () => {
  const pages = docsPages()

  it('finds the pages at all — a walk that returns nothing passes vacuously', () => {
    // The floor exists because this whole suite is about a check that measured
    // the wrong thing. A file walk that silently found nothing would be green.
    expect(pages.length).toBeGreaterThanOrEqual(9)
  })

  for (const page of pages) {
    const relative = page.slice(process.cwd().length + 1)

    it(`${relative} exports its own metadata, in the page's locale`, () => {
      const source = readFileSync(page, 'utf8')
      // Through the one helper (MOTIR-7956), so its canonical and alternates
      // are its own address in its own language.
      expect(source).toMatch(/export function generateMetadata\(/)
      expect(source).toMatch(
        /localePageMetadata\(params, ('\/docs|DOCS_INDEX_HREF)/,
      )
      // Read from the page's catalogue, not typed into the page and not the
      // English object — the same rule every rendered string follows.
      expect(source).toMatch(/title:\s*copy\.docs\.metaTitle/)
      expect(source).toMatch(/description:\s*copy\.docs\.metaDescription/)
      expect(source).not.toMatch(/englishCopy/)
    })
  }

  it('the index names the AREA — the only page whose title is docs.metaTitle', () => {
    const source = readFileSync(INDEX, 'utf8')
    expect(source).toMatch(/title:\s*copy\.docs\.metaTitle,/)
  })
})

describe('the titles follow one pattern, so a reader can place a tab', () => {
  const titles = {
    metaTitleReference: 'API reference · Motir docs',
    metaTitleGuide: 'Getting started · API reference · Motir docs',
    metaTitleStability: 'Stability & deprecation · API reference · Motir docs',
    metaTitleMcp: 'MCP server · Motir docs',
    metaTitleMcpTools: 'Tools · MCP server · Motir docs',
    metaTitleCli: 'Motir CLI · Motir docs',
    metaTitleSandbox: 'Agent sandbox · Motir docs',
    metaTitlePublicAddress: 'Public address · Motir docs',
  } as const

  for (const [key, expected] of Object.entries(titles)) {
    it(`${key} carries the surface segment it should`, () => {
      expect(copy.docs[key as keyof typeof copy.docs]).toBe(expected)
    })
  }

  it('every one of them ends in the area, and every description is a sentence', () => {
    for (const [key, value] of Object.entries(copy.docs)) {
      if (key.startsWith('metaTitle') && key !== 'metaTitle') {
        expect(value, key).toMatch(/ · Motir docs$/)
      }
      if (key.startsWith('metaDescription') && key !== 'metaDescription') {
        // Long enough to say something, short enough for a search result.
        expect(String(value).length, key).toBeGreaterThan(60)
        expect(String(value).length, key).toBeLessThan(200)
      }
    }
  })
})

/*
 * ── What each built page's head says (MOTIR-10645) ──────────────────────────
 * The source checks above say each page CALLS the helper; this calls each
 * page module's `generateMetadata` the way its `.astro` page does, after the
 * docs layout's, and reads what the head gets: its own unprefixed canonical in
 * that locale, all twelve locales plus `x-default`, and the area's words from
 * the layout under the page's own.
 */
describe('every built /docs page heads itself, in its locale', () => {
  const params = (locale: string) => Promise.resolve({ locale })

  it('the docs layout gives the area’s title and description, in the page’s locale', async () => {
    const de = await getCopy('de')
    await expect(
      docsLayout.generateMetadata({ params: params('de') }),
    ).resolves.toEqual({
      title: de.docs.metaTitle,
      description: de.docs.metaDescription,
    })
  })

  it.each(DOCS_ROUTES)('%s', async (route) => {
    const page = (await import(
      /* @vite-ignore */ pathToFileURL(pageFileOf(route)).href
    )) as {
      generateMetadata: (props: {
        params: Promise<{ locale: string }>
      }) => Promise<Metadata>
    }
    const meta = await page.generateMetadata({ params: params('de') })
    expect(meta.alternates?.canonical).toBe(siteUrl(`/de${route}`))
    const languages = Object.keys(meta.alternates?.languages ?? {})
    expect(languages).toHaveLength(LOCALES.length + 1)
    expect(languages).toContain('x-default')
    expect(meta.title).toEqual(expect.any(String))
    expect(meta.description).toEqual(expect.any(String))
  })
})
