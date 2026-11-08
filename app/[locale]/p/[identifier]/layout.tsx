import { SiteShell } from '@/app/_components/SiteShell'
import { requestPublicHost } from '@/lib/requestPublicHost'

/**
 * The `/p/*` shell (MOTIR-4115), built to `design/public-projects/`.
 *
 * The room is composed from the same chrome every motir.co surface wears —
 * `SiteHeader` + `SiteFooter` — so a project page cannot drift from the rest of
 * the site. `design/legal/` established this shape; this follows it.
 *
 * ── ⚠️ NO NAV ITEM IS CURRENT, AND THAT IS A DECISION ─────────────────────
 *
 * `/p/*` is a TENANT's page, not a section of this site, so it takes no nav
 * entry and marks none current. `design/public-projects/design-notes.md`'s
 * access-path table records it as a deliberate non-door: the ways in are
 * `/explore`'s cards, a shared link, a changelog feed item, and the 308 from
 * `app.motir.co`.
 *
 * ── ⚠️ NO `loading.tsx` IN THIS TREE, deliberately ────────────────────────
 *
 * `page.tsx` calls `notFound()` when the API says a project is not public. A
 * `loading.tsx` above a route that decides existence flushes the response head
 * and fixes the status at 200, turning a 404 into a page that merely looks like
 * one — the rule `design/legal/`'s layout already records for the same reason.
 * The design draws a LOADING state (panel 11) and it is a skeleton INSIDE the
 * room, rendered by the tab that is waiting, not a boundary above the route.
 *
 * ── The hero is NOT here ──────────────────────────────────────────────────
 *
 * A layout cannot read the route's `identifier` params, and duplicating the
 * subject fetch to render a hero would make two API calls per page view for one
 * project. The hero is a component each page composes from the subject read it
 * already has (`_components/ProjectHeader`), which is also what lets a tab
 * render the hero and its own body from ONE read.
 */
export default async function PublicProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  /*
   * ⚠️ THE LAYOUT READS THE HOST TOO, and it is the whole of MOTIR-4372 on this
   * surface. Every page below it already asks `requestPublicHost()` so that its
   * own tab and detail links point at the address the visitor is on — but the
   * CHROME above them was asking nobody, and emitted `/explore`, `/docs`,
   * `/design` and three legal paths as root-relative links on every host. A
   * tenant host serves that workspace's projects and nothing else, so all six
   * were 404s, and Next RSC-prefetched three of them on every render.
   *
   * It costs nothing here: the `/p/**` tree is `force-dynamic` already
   * (`page.tsx`), because a public project page shows a live board.
   */
  const host = await requestPublicHost()

  return (
    <SiteShell
      host={host}
      contentClassName="mx-auto w-full max-w-[1400px] px-[clamp(16px,3vw,48px)] pt-[clamp(32px,4vw,56px)] pb-[clamp(56px,7vw,112px)]"
    >
      {children}
    </SiteShell>
  )
}
