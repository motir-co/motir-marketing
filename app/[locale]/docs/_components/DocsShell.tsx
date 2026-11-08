import { DocsRailIsland } from '@/app/_islands'
import type { RailOperation } from '@/lib/docs'

/*
 * The docs two-column shell (MOTIR-4396) — the rail beside the reading column,
 * per `design/docs/design-notes.md` § "The one structural change".
 *
 * ⚠️ WHY THIS IS A COMPONENT AND NOT A LAYOUT. Two layouts render it — the
 * guides group and the API sub-area — because those are the two things Next can
 * tell apart WITHOUT a pathname, and a server layout cannot read one. That is
 * the whole reason the route group exists: the file system decides which pages
 * get the operation tier, so "tiers 2 and 3 render if and only if the route is
 * `/docs/api` or below" is a fact about where a file lives rather than a
 * condition somebody has to keep true.
 *
 * ⚠️ THE RAIL SPANS THE ROW; ITS STICKY REGION IS A CHILD OF IT. The grid is
 * left at its default `align-items: stretch`, so the rail's surface is as tall
 * as the reading column beside it — see the block comment on the element, and
 * `design/docs/design-notes.md` § "The one structural change".
 *
 * ⚠️ THE CONTENT COLUMN KEEPS ITS 46rem MEASURE. The rail takes space beside it
 * rather than out of it: long-form prose is constrained by the reading measure,
 * not by the container, so widening the column to fill what the rail left over
 * would make every page harder to read in order to use the space. The asset
 * says so; this is where it is true.
 */
export function DocsShell({
  children,
  operations,
}: Readonly<{
  children: React.ReactNode
  /** The operation tier. Passed only by the API sub-area's layout. */
  operations?: readonly { group: string; operations: RailOperation[] }[]
}>) {
  return (
    /* ⚠️ THE BASE TRACK IS BOUNDED, and that is not decoration. A grid column
       defaults to `auto`, which sizes to MAX-CONTENT — so below the breakpoint
       the single track took its width from the 46rem reading column and the
       rail stretched to 736px inside a 390px viewport, scrolling the whole page
       sideways. `minmax(0,1fr)` is what stops a grid child from setting the
       track's width. Caught by rendering at 390px, not by any test.

       ⚠️ AND THERE IS NO `items-start` HERE — DO NOT PUT ONE BACK (MOTIR-4432).
       It was here to make the rail's `position: sticky` engage, and it did:
       `align-items: start` shrinks a grid item to its own content, and a sticky
       element only sticks while it is shorter than what scrolls past it. But
       the rail is also the element that PAINTS the surface, so shrinking it
       ended `--el-sidebar-bg` and the right border 648px above the bottom of
       the reading column on `/docs`, and 85500px above it on `/docs/api` — a
       sidebar drawn as a floating box. The two jobs are now separated: this
       row STRETCHES the rail, and the sticky region lives in a wrapper INSIDE
       it (`DocsRail.tsx`). Deleting that wrapper and restoring `items-start`
       trades the defect back.

       ⚠️ AND `md:grow` IS WHAT MAKES THAT STRETCH REACH THE FOOTER (MOTIR-4465).
       The row above stretches the rail to the ROW; this stretches the ROW to the
       LANDMARK. Without it the grid is sized by its own content, and on a page
       whose content is shorter than the viewport (`/docs/mcp`: 359px of grid in
       a 900px window) the row — and therefore the painted surface — ended 224px
       above the footer. `app/docs/layout.tsx` is the other half: it passes
       `md:flex md:flex-col` so this element has a flex container to grow inside.
       `grow` and not `flex-1`, deliberately: `flex-1` sets `flex-basis: 0`, and
       a basis of zero on the `/docs/api` row (86400px of operations) asks the
       layout to re-derive from nothing what the content already states. */
    <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-[264px_minmax(0,1fr)] md:grow">
      <DocsRailIsland operations={operations} />
      <div className="w-full max-w-[46rem] px-(--spacing-card-padding) py-10">
        {children}
      </div>
    </div>
  )
}
