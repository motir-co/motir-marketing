import { cn } from '@motir/design-system'
import { useCopy } from '@/lib/copy'
import type { PublicHost } from '@/lib/publicHost'
import { SiteFooter } from './SiteFooter'
import { SiteHeaderIsland } from '../_islands'

/**
 * THE CHROME EVERY motir.co SURFACE WEARS, AND THE ONE PLACE THE `main`
 * LANDMARK LIVES (MOTIR-4169).
 *
 * ── ⚠️ THE DECISION THIS COMPONENT EXISTS TO MAKE ─────────────────────────
 *
 * MOTIR-4169 asked which of two answers this repository takes, and this is it:
 * **the CHROME owns the landmark, and no page renders its own.** The rejected
 * alternative — the chrome renders a `main` only where a page does not — is
 * not expressible here in any honest way: a layout is rendered BEFORE and
 * AROUND its `children` and cannot inspect what they will produce, so
 * "only where a page does not" would have to be a prop each page passes, which
 * is the same per-page memory that produced the defect, wearing a flag.
 *
 * The defect was exactly that. Four of twelve routes rendered `<main>` in the
 * PAGE and eight did not, because nothing shared supplied one and every page
 * had to remember. A fix that adds the tag to the remaining pages leaves the
 * thirteenth page with the same hole. So the tag moves UP, the four pages that
 * had one give theirs up, and `tests/mainLandmark.test.ts` enumerates the
 * route tree from disk so a page added later cannot ship without one.
 *
 * ── THE SKIP LINK ─────────────────────────────────────────────────────────
 *
 * A landmark with nothing pointing at it is half the bypass mechanism WCAG
 * 2.4.1 asks for, so the affordance ships with it: the FIRST focusable element
 * on every page, invisible until focused, targeting the `main` below.
 *
 * ⚠️ ONE RUNG-1 FILL, DECLARED — the same declaration `SiteHeader`'s narrow
 * menu panel makes, for the same reason. `design/public-site/` (motir-core)
 * draws this chrome's bar and footer and depicts no skip link, because it
 * draws what is VISIBLE at rest and this is visible only under focus. It is
 * not invented here either: it is `motir-core`'s shipped
 * `components/ui/AppLayout.tsx` affordance — its markup, its `href="#main"` /
 * `id="main"` pairing and its `sr-only` → `focus:not-sr-only` reveal — reused
 * rather than redrawn, which is the composition rule
 * `design/public-site/design-notes.md` § "Composition, not redrawing" already
 * states for the bar and the footer.
 *
 * The ONE deliberate divergence from that source: the focus ring is
 * `--el-accent-on-surface` rather than motir-core's `--focus-ring-color`,
 * because this repository routes colour through Tier-3 element tokens and that
 * pair is a MEASURED row of `design/marketing/design-notes.md`'s AA table
 * (6.57:1 light / 6.11:1 dark against the page, over 1.4.11's 3:1). The link's
 * own ink is `--el-text` on `--el-page-bg` — 17.40:1 / 17.42:1, the table's
 * first row. Both readings are the table's, not new ones.
 */

/**
 * The landmark's id, and the skip link's target. Exported because the E2E lane
 * asserts against it rather than re-typing the string — `motir-core` uses the
 * same value, which is what makes the two shells' keyboard journeys identical.
 */
export const MAIN_LANDMARK_ID = 'main'

export function SiteShell({
  children,
  host,
  contentClassName,
  className,
  overlayHeader = false,
}: Readonly<{
  children: React.ReactNode
  /**
   * WHICH HOST THIS PAGE IS BEING SERVED ON — required, never defaulted
   * (MOTIR-4372).
   *
   * The chrome carries links to `/explore`, `/docs`, `/design` and `/legal`,
   * which exist on `motir.co` alone; the same chrome is worn by every tenant
   * host, where all four are 404s. `SiteHeader` and `SiteFooter` therefore spell
   * them through `siteLinkFor`, and this is where that value enters.
   *
   * ⚠️ NO DEFAULT, DELIBERATELY, and `lib/publicHost.ts`'s own header says why:
   * *"a component whose output depends on a value it did not receive is a
   * component whose test can pass while the page is wrong"*. A `= SITE_HOST`
   * here would make the bug this card fixes reachable again by the exact route
   * that produced it — a surface added later that never thought about the host —
   * and it would fail silently, on somebody else's domain. Passing `SITE_HOST`
   * explicitly is one import and makes the claim readable at the call site.
   *
   * ⚠️ AND IT IS A PROP RATHER THAN AN AMBIENT `requestPublicHost()` READ. This
   * shell wraps `motir.co`'s statically rendered pages — the landing, `/legal`,
   * `/docs` — and `headers()` inside it would make every one of them dynamic to
   * answer a question only the `/p/**` tree and `/w` ever need asked.
   */
  host: PublicHost
  /**
   * The width / padding box the surface wants around its own content. It goes
   * ON the landmark rather than in a wrapper inside it, so the room a reader
   * skips into is the room the page draws.
   */
  contentClassName?: string
  /** Extra classes for the outer frame. Rarely needed. */
  className?: string
  /**
   * Lay the header OVER the top of the page instead of above it (2026-10
   * redesign), for a page that opens on the wave hero: the lines then run up
   * behind the bar. The page's first section owes the header its height —
   * 4.75rem — in its own top padding.
   */
  overlayHeader?: boolean
}>) {
  const copy = useCopy()
  return (
    // `data-app-shell`: the design system's hook for a shell that paints its
    // own page fill. A style that draws a canvas on `body` (glassmorphism's
    // wash, cybercore's grid, retrofuturism's sky, …) repaints the same layers
    // here, so this opaque frame no longer hides it (theme.css, MOTIR-4234).
    <div
      data-app-shell=""
      className={cn(
        'relative flex min-h-dvh flex-col bg-(--el-page-bg) text-(--el-text)',
        className,
      )}
    >
      {/* FIRST in the DOM, and therefore first in the tab order — the whole
          point of the affordance is that it is reachable before the banner it
          exists to skip. */}
      <a
        href={`#${MAIN_LANDMARK_ID}`}
        className={cn(
          'sr-only z-50 focus:not-sr-only focus:absolute focus:top-3 focus:left-4',
          'focus:rounded-(--radius-control) focus:bg-(--el-page-bg) focus:px-4 focus:py-2',
          'focus:text-[13.5px] focus:font-semibold focus:text-(--el-text)',
          'focus:shadow-(--shadow-elevated)',
          'focus:outline-2 focus:outline-offset-2 focus:outline-(--el-accent-on-surface)',
        )}
      >
        {copy.nav.skipToContent}
      </a>

      {/* The header is the page's island: everything else in the shell is
          HTML only (MOTIR-10643). */}
      <SiteHeaderIsland host={host} overlay={overlayHeader} />

      {/* `tabIndex={-1}` is what makes the skip link WORK rather than merely
          move the URL fragment: without it the anchor scrolls the landmark
          into view and leaves focus on the link, so the next Tab returns to
          the nav the reader just asked to skip. It is programmatically
          focusable and NOT in the tab order, so nothing else changes.
          `focus:outline-none` because the ring belongs to what the reader is
          about to read, not to the container that received focus in passing. */}
      <main
        id={MAIN_LANDMARK_ID}
        tabIndex={-1}
        className={cn('flex-1 focus:outline-none', contentClassName)}
      >
        {children}
      </main>

      <SiteFooter host={host} />
    </div>
  )
}
