import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@/tests/helpers/withCopy'
import { describe, expect, it } from 'vitest'
import DocsIndexPage from '@/app/[locale]/docs/(guides)/DocsIndexRoute'
import { englishCopy } from '@/lib/copy'
import {
  DOCS_INDEX_HREF,
  DOCS_ROUTES,
  docsSurfacesFor,
} from '@/lib/docsSurfaces'

const DOCS_SURFACES = docsSurfacesFor(englishCopy)
import { EN_PAGE } from '@/tests/helpers/locale'

/*
 * ONE LIST OF WHAT `/docs` CONTAINS (MOTIR-4507).
 *
 * ── The defect ─────────────────────────────────────────────────────────────
 * The index page and the rail each held their own copy of the same fact.
 * MOTIR-4227 added `/docs/public-address`, put it in the rail's `SURFACES` and
 * did not put it on the index — so the one page whose entire content is a list
 * of what this area contains was missing a page, and nothing went red, because
 * neither file knew the other existed.
 *
 * ── Why these assertions WALK rather than LIST ─────────────────────────────
 * A test naming the nine routes is the same defect one level up: the tenth page
 * arrives, the author adds it to the list the test names, and the test agrees
 * with itself. So every check below derives its expectation — from
 * `lib/docsSurfaces.ts`, or from the FILE SYSTEM, which is the only witness
 * that does not participate in the mistake.
 */

const DOCS_ROOT = join(process.cwd(), 'app', '[locale]', 'docs')

/** Every page module (`<Name>Route.tsx`) under `app/[locale]/docs`, found rather than listed. */
function docsPageFiles(dir: string = DOCS_ROOT): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return docsPageFiles(full)
    return /^[A-Z]\w*Route\.tsx$/.test(entry) ? [full] : []
  })
}

/**
 * The route a page module serves. Route GROUPS — a segment in parentheses, like
 * `(guides)` — organise the tree without appearing in the URL, which is the one
 * rule this mapping has to know.
 */
function routeOf(file: string): string {
  const segments = file
    .slice(join(process.cwd(), 'app', '[locale]').length)
    .split(/[\\/]/)
    .filter((segment) => segment && !segment.endsWith('Route.tsx'))
    .filter((segment) => !/^\(.*\)$/.test(segment))
  return `/${segments.join('/')}`
}

async function indexHrefs(): Promise<string[]> {
  const { container } = render(await DocsIndexPage(EN_PAGE))
  return [...container.querySelectorAll('a')].map(
    (anchor) => anchor.getAttribute('href') ?? '',
  )
}

describe('the surfaces `/docs` documents', () => {
  it('names every route `app/[locale]/docs` actually serves, and no route it does not', () => {
    // The file system is the authority on which pages answer 200; this file is
    // the authority on which of them anything DRAWS. When they disagree, a
    // reader cannot reach a page that exists — which is the whole bug.
    const served = docsPageFiles().map(routeOf).sort()
    expect([...DOCS_ROUTES].sort()).toEqual(served)
  })

  it('links every route it names from the index — the door this card is about', async () => {
    const hrefs = await indexHrefs()
    // `/docs` is the page being rendered, so it is a rail row and not a row on
    // itself; everything else the list names is a destination the index owes.
    const owed = DOCS_ROUTES.filter((route) => route !== DOCS_INDEX_HREF)
    for (const route of owed) {
      expect(hrefs, route).toContain(route)
    }
  })

  it('links NOTHING the list does not name — no row survives the list it came from', async () => {
    // The other direction, and it is the one that catches a row typed straight
    // into the page: a link the shared list has never heard of.
    expect([...new Set(await indexHrefs())].sort()).toEqual(
      DOCS_ROUTES.filter((route) => route !== DOCS_INDEX_HREF).sort(),
    )
  })

  it('gives every row a description, because a row without one is half a door', () => {
    for (const surface of DOCS_SURFACES) {
      for (const page of [surface, ...surface.pages]) {
        expect(page.description.trim(), page.href).not.toBe('')
        expect(page.description, page.href).not.toContain('\n')
        expect(page.label.trim(), page.href).not.toBe('')
      }
    }
  })

  it('is read by BOTH renderers — neither writes a route down itself', () => {
    /*
     * ⚠️ A SOURCE CHECK, deliberately, because the defect is invisible to a
     * rendered one. Two files that agree TODAY pass every behavioural
     * assertion above; what this card fixes is that one of them can be edited
     * without the other. So: neither renderer may contain a route literal at
     * all. (`DocsRail`'s tier-3 anchors are a template — `/docs/api#${id}` —
     * which is a link INTO a page rather than a page, and is not a quoted
     * route.)
     */
    const routes = new Set(DOCS_ROUTES)
    for (const file of [
      join(
        process.cwd(),
        'app',
        '[locale]',
        'docs',
        '(guides)',
        'DocsIndexRoute.tsx',
      ),
      join(
        process.cwd(),
        'app',
        '[locale]',
        'docs',
        '_components',
        'DocsRail.tsx',
      ),
    ]) {
      const quoted = [
        ...readFileSync(file, 'utf8').matchAll(/['"](\/[^'"]*)['"]/g),
      ]
        .map((match) => match[1]!)
        .filter((literal) => routes.has(literal))
      expect(quoted, file).toEqual([])
    }
  })
})
