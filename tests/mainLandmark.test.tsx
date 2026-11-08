import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { screen } from '@testing-library/react'
import { render as renderOnPage } from '@/tests/helpers/withCopy'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MAIN_LANDMARK_ID, SiteShell } from '@/app/_components/SiteShell'
import { SITE_HOST } from '@/lib/publicHost'
import { englishCopy as copy } from '@/lib/copy'
import { SITE_ROUTES } from '@/e2e/routes'

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
 * ── WHAT IT CAN AND CANNOT SEE, said plainly ──────────────────────────────
 *
 * This is a STATIC read of the route tree: it resolves each page's layout
 * chain and asks which files in it render a landmark. It cannot see a landmark
 * rendered by some component a page imports, and it does not try — the
 * BEHAVIOURAL half is `e2e/specs/landmark.spec.ts`, which opens every one of
 * these routes in a browser and counts the landmarks the DOM actually has.
 * The two are deliberate halves: the static one is the only one that can ask
 * "does a page EXIST that nobody covered", because a browser needs a URL and a
 * dynamic segment has none until a parameter is supplied. The last `describe`
 * below is the join between them — the pattern set here must be exactly the
 * URL table the browser lane walks.
 *
 * A page.tsx is not the only file Next serves, and the others are deliberately
 * out of scope: `robots.ts`, `sitemap.ts`, `opengraph-image.tsx` and the
 * changelog `route.ts` answer bytes rather than a document, and a landmark is
 * a property of a DOCUMENT.
 */

// The bar reads the pathname; nothing in this file depends on which one.
const pathname = { value: '/' }

/** Render on the page at `pathname.value` (the built path the header reads). */
const render: typeof renderOnPage = (ui, options = {}) =>
  renderOnPage(ui, { pathname: pathname.value, ...options })

// `process.cwd()` rather than `import.meta.url`: this lane runs on jsdom,
// where `import.meta.url` is not a `file:` URL and `fileURLToPath` throws.
// `tests/entitySignal.test.ts` reads `public/` the same way.
// Every page lives under the locale segment (MOTIR-7948); a route's address is
// its path below it, since English — the address every test uses — is unprefixed.
const APP_DIR = join(process.cwd(), 'app', '[locale]')

/** Every `page.tsx` under `app/`, as a path relative to `app/`. */
function pageFiles(dir: string = APP_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      // `_`-prefixed folders are private (components, helpers) and serve no
      // route — Next's own convention, and this repository uses it throughout.
      return entry.name.startsWith('_') ? [] : pageFiles(full)
    }
    return entry.name === 'page.tsx' ? [relative(APP_DIR, full)] : []
  })
}

/**
 * `p/[identifier]/board/page.tsx` → `/p/[identifier]/board`; `page.tsx` → `/`.
 * Route GROUPS — a `(name)` segment — contribute no path segment. There are
 * none today; handling them here means the first one added does not silently
 * produce a pattern that matches nothing.
 */
function routePattern(pageFile: string): string {
  const segments = pageFile
    .split(sep)
    .slice(0, -1)
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
  return `/${segments.join('/')}`.replace(/\/$/, '') || '/'
}

/**
 * The files Next renders for a route, outermost first: every `layout.tsx` from
 * `app/` down to the page's own folder, then the page.
 */
function renderChain(pageFile: string): string[] {
  const segments = pageFile.split(sep).slice(0, -1)
  const chain: string[] = []
  for (let depth = 0; depth <= segments.length; depth += 1) {
    const candidate = join(...segments.slice(0, depth), 'layout.tsx')
    if (existsSync(join(APP_DIR, candidate))) chain.push(candidate)
  }
  return [...chain, pageFile]
}

/**
 * Whether a file PROVIDES the landmark — by rendering the shell that owns it,
 * or by rendering the element itself. The second arm is what makes a page that
 * quietly reintroduces its own `<main>` a failure rather than a duplicate
 * nobody notices until a screen reader meets two of them.
 */
function providesLandmark(appRelativePath: string): boolean {
  const source = readFileSync(join(APP_DIR, appRelativePath), 'utf8')
  return /<SiteShell[\s/>]/.test(source) || /<main[\s/>]/.test(source)
}

/**
 * Pages that render NO document of their own: they only throw `notFound()`, so
 * what reaches the reader is the locale's `not-found.tsx` (the 404 room inside
 * `SiteShell`). Their landmark is the room's, and their browser half is
 * `e2e/specs/not-found.spec.ts`, which asserts the 404 status a
 * `SITE_ROUTES` row (asserted 200) cannot carry.
 */
const NOT_FOUND_ONLY: { file: string; reason: string }[] = [
  {
    file: join('[...rest]', 'page.tsx'),
    reason:
      'the locale catch-all (MOTIR-7955): every unmatched path, answered by the localised 404 room',
  },
]
const notFoundOnly = new Set(NOT_FOUND_ONLY.map(({ file }) => file))

const PAGES = pageFiles().filter((file) => !notFoundOnly.has(file))

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
})

describe('a page that only throws notFound() is landmarked by the 404 room', () => {
  it.each(NOT_FOUND_ONLY)('$file', ({ file }) => {
    const source = readFileSync(join(APP_DIR, file), 'utf8')
    // It must stay a page that renders nothing: the moment it grows markup, it
    // is an ordinary route and belongs back in the enumeration above.
    expect(source).toMatch(/\bnotFound\(\)/)
    expect(source).not.toMatch(/return\s*\(?\s*</)
    // …and the boundary that answers it renders the room, which owns the shell.
    expect(readFileSync(join(APP_DIR, 'not-found.tsx'), 'utf8')).toMatch(
      /<NotFoundRoom[\s/>]/,
    )
    expect(
      readFileSync(
        join(process.cwd(), 'app', '_components', 'NotFoundRoom.tsx'),
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
   * ⚠️ THE JOIN BETWEEN THE TWO HALVES, AND THE REASON THE E2E TABLE IS SAFE
   * TO WRITE AS A LIST. `e2e/routes.ts` supplies one concrete URL per route
   * because a dynamic segment cannot be walked without a parameter; this
   * assertion is what stops that list going stale. A new page fails HERE — in
   * a lane that runs in seconds — naming the pattern nobody added.
   */
  it('covers exactly the enumerated route patterns', () => {
    const enumerated = [...new Set(PAGES.map(routePattern))].sort()
    const walked = [
      ...new Set(SITE_ROUTES.map((route) => route.pattern)),
    ].sort()
    expect(walked).toEqual(enumerated)
  })

  it('gives each dynamic segment a concrete value', () => {
    const unfilled = SITE_ROUTES.filter((route) => route.url.includes('['))
    expect(unfilled).toEqual([])
  })
})
