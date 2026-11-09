import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { screen } from '@testing-library/react'
import { render as renderOnPage } from '@/tests/helpers/withCopy'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MAIN_LANDMARK_ID, SiteShell } from '@/app/_components/SiteShell'
import { SITE_HOST } from '@/lib/publicHost'
import { englishCopy as copy } from '@/lib/copy'
import { LIVE_ROUTES, SITE_ROUTES } from '@/e2e/routes'
import { ROUTES, slotFor, type SlotName } from '@/worker/routes'

/*
 * THE `main` LANDMARK, GUARDED BY ENUMERATION (MOTIR-4169).
 *
 * ⚠️ THE DEFECT THIS FILE EXISTS FOR IS NOT "eight pages are missing a tag".
 * It is that NOTHING SHARED SUPPLIED ONE, so every page had to remember and
 * most did not — four of twelve routes had a `main` and eight did not. Adding
 * the tag to the eight would have left the thirteenth page with the same hole,
 * which is why the fix moved the landmark into `SiteShell` and why this guard
 * ENUMERATES the route tree from disk instead of listing the routes it knows
 * about. A page added later cannot ship without one, because this test finds
 * the page rather than waiting to be told about it.
 *
 * ── TWO TREES SINCE THE ASTRO MOVE (MOTIR-10634 · MOTIR-10758) ────────────
 *
 * A BUILT page is a file under `src/pages/[...locale]/`: it hands a page
 * module from `app/` (and any layouts) to `SitePage.astro`. Its render chain
 * is the layout plus the `app/` modules the file imports, and exactly one of
 * them must provide the landmark. A LIVE page is a slot in the Worker's route
 * table (`worker/routes.ts`), which matches addresses by pattern and so cannot
 * be walked from disk; here every document slot must be walked by a
 * `LIVE_ROUTES` row and every row must land on a document slot.
 *
 * ── WHAT IT CAN AND CANNOT SEE, said plainly ──────────────────────────────
 *
 * This is a STATIC read: it cannot see a landmark rendered by some component
 * a page imports, and it does not try — the BEHAVIOURAL half is
 * `e2e/specs/landmark.spec.ts` and `landmark-live.spec.ts`, which open every
 * one of these routes in a browser and count the landmarks the DOM actually
 * has. The static half is the only one that can ask "does a page EXIST that
 * nobody covered", because a browser needs a URL and a dynamic segment has
 * none until a parameter is supplied. The last `describe` below is the join
 * between them — the pattern set here must be exactly the URL tables the
 * browser lane walks.
 *
 * The files that answer bytes rather than a document — `robots.txt.ts`, the
 * sitemaps, `opengraph-image.ts`, the share-image and project-sitemap slots —
 * are deliberately out of scope: a landmark is a property of a DOCUMENT.
 */

// The bar reads the pathname; nothing in this file depends on which one.
const pathname = { value: '/' }

/** Render on the page at `pathname.value` (the built path the header reads). */
const render: typeof renderOnPage = (ui, options = {}) =>
  renderOnPage(ui, { pathname: pathname.value, ...options })

// `process.cwd()` rather than `import.meta.url`: this lane runs on jsdom,
// where `import.meta.url` is not a `file:` URL and `fileURLToPath` throws.
const ROOT = process.cwd()
// Every page is built under the locale segment (MOTIR-10644); a route's
// address is its path below it, since English is unprefixed.
const PAGES_DIR = join(ROOT, 'src', 'pages', '[...locale]')
const LAYOUT = join('src', 'layouts', 'SitePage.astro')

/** The 404 room's file: built per locale, served at any unmatched path. */
const NOT_FOUND_PAGE = '404.astro'

/** Every `.astro` page under the locale segment, relative to it. */
function pageFiles(dir: string = PAGES_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return pageFiles(full)
    return entry.name.endsWith('.astro') ? [relative(PAGES_DIR, full)] : []
  })
}

/** `legal/[slug].astro` → `/legal/[slug]`; `index.astro` → its folder. */
function routePattern(pageFile: string): string {
  const segments = pageFile.replace(/\.astro$/, '').split(sep)
  if (segments.at(-1) === 'index') segments.pop()
  return `/${segments.join('/')}`.replace(/\/$/, '') || '/'
}

/** `@/app/x/Y` → the file on disk, relative to the repository. */
function appModuleFile(specifier: string): string {
  const base = join('app', specifier.slice('@/app/'.length))
  const file = [`${base}.tsx`, join(base, 'index.tsx')].find((candidate) =>
    existsSync(join(ROOT, candidate)),
  )
  if (!file) throw new Error(`no module for ${specifier}`)
  return file
}

/**
 * The files rendered for a built page: the shared layout, then every `app/`
 * module the page file imports — its layouts and the page module.
 */
function renderChain(pageFile: string): string[] {
  const source = readFileSync(join(PAGES_DIR, pageFile), 'utf8')
  const modules = [...source.matchAll(/from '(@\/app\/[^']+)'/g)].map(
    ([, specifier]) => appModuleFile(specifier!),
  )
  return [LAYOUT, ...modules]
}

/**
 * Whether a file PROVIDES the landmark — by rendering the shell that owns it,
 * or by rendering the element itself. The second arm is what makes a page that
 * quietly reintroduces its own `<main>` a failure rather than a duplicate
 * nobody notices until a screen reader meets two of them.
 */
function providesLandmark(repoRelativePath: string): boolean {
  const source = readFileSync(join(ROOT, repoRelativePath), 'utf8')
  return /<SiteShell[\s/>]/.test(source) || /<main[\s/>]/.test(source)
}

const PAGES = pageFiles().filter((file) => file !== NOT_FOUND_PAGE)

/** The slots that answer a document — the rest answer an image or XML. */
const DOCUMENT_SLOTS: readonly SlotName[] = [
  'project',
  'explore',
  'ideas',
  'buildsItself',
]

describe('every route renders exactly one main landmark', () => {
  it('finds the route tree at all', () => {
    // A guard on the guard: a walk that returned nothing would pass every
    // assertion below vacuously, which is the failure mode of a test that
    // enumerates. The number is a floor, not the count — it must not need
    // editing when a page is added.
    expect(PAGES.length).toBeGreaterThanOrEqual(20)
  })

  it.each(PAGES.map((file) => ({ pattern: routePattern(file), file })))(
    '$pattern',
    ({ file }) => {
      const providers = renderChain(file).filter(providesLandmark)
      expect(providers).toHaveLength(1)
    },
  )

  it('the layout itself provides none, so the page module must', () => {
    expect(providesLandmark(LAYOUT)).toBe(false)
  })
})

describe('the 404 room is landmarked by the room', () => {
  it(NOT_FOUND_PAGE, () => {
    const chain = renderChain(NOT_FOUND_PAGE)
    expect(chain).toEqual([LAYOUT, join('app', '[locale]', 'not-found.tsx')])
    // The page module renders the room, and the room owns the shell. Its
    // browser half is `e2e/specs/not-found.spec.ts`, which asserts the 404
    // status a `SITE_ROUTES` row (asserted 200) cannot carry.
    expect(readFileSync(join(ROOT, chain[1]!), 'utf8')).toMatch(
      /<NotFoundRoom[\s/>]/,
    )
    expect(
      readFileSync(
        join(ROOT, 'app', '_components', 'NotFoundRoom.tsx'),
        'utf8',
      ),
    ).toMatch(/<SiteShell[\s/>]/)
  })
})

describe('the shell that owns the landmark', () => {
  it('renders ONE main landmark, and the skip link targets it', () => {
    render(<SiteShell host={SITE_HOST}>content</SiteShell>)

    const landmark = screen.getByRole('main')
    expect(landmark).toHaveAttribute('id', MAIN_LANDMARK_ID)
    // Programmatically focusable, and NOT in the tab order. Without this the
    // anchor moves the fragment and leaves focus on the link, so the next Tab
    // returns to the nav the reader just asked to skip.
    expect(landmark).toHaveAttribute('tabindex', '-1')

    expect(
      screen.getByRole('link', { name: copy.nav.skipToContent }),
    ).toHaveAttribute('href', `#${MAIN_LANDMARK_ID}`)
  })

  it('puts the skip link FIRST in the tab order', async () => {
    const user = userEvent.setup()
    render(<SiteShell host={SITE_HOST}>content</SiteShell>)

    await user.tab()

    expect(
      screen.getByRole('link', { name: copy.nav.skipToContent }),
    ).toHaveFocus()
  })
})

describe('the browser lane walks every route this enumeration finds', () => {
  /*
   * ⚠️ THE JOIN BETWEEN THE TWO HALVES, AND THE REASON THE E2E TABLES ARE SAFE
   * TO WRITE AS LISTS. `e2e/routes.ts` supplies one concrete URL per route
   * because a dynamic segment cannot be walked without a parameter; these
   * assertions are what stop the lists going stale. A new page fails HERE — in
   * a lane that runs in seconds — naming the pattern nobody added.
   */
  it('covers exactly the enumerated built route patterns', () => {
    const enumerated = [...new Set(PAGES.map(routePattern))].sort()
    const walked = [
      ...new Set(SITE_ROUTES.map((route) => route.pattern)),
    ].sort()
    expect(walked).toEqual(enumerated)
  })

  it('walks every document slot of the Worker, and only those', () => {
    const landed = LIVE_ROUTES.map(
      (route) => slotFor(route.url, 'en')?.name ?? `none: ${route.url}`,
    )
    expect([...new Set(landed)].sort()).toEqual([...DOCUMENT_SLOTS].sort())
    // Every slot the table holds is either a document or a named byte answer.
    for (const slot of ROUTES) {
      expect(
        DOCUMENT_SLOTS.includes(slot.name) ||
          slot.name === 'projectImage' ||
          slot.name === 'projectSitemap',
        slot.name,
      ).toBe(true)
    }
  })

  it('gives each dynamic segment a concrete value', () => {
    const unfilled = [...SITE_ROUTES, ...LIVE_ROUTES].filter((route) =>
      route.url.includes('['),
    )
    expect(unfilled).toEqual([])
  })
})
