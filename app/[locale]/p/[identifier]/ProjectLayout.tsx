import type { ReactNode } from 'react'
import { SiteShell } from '@/app/_components/SiteShell'
import { SITE_HOST } from '@/lib/publicHost'

/**
 * The `/p/*` shell (MOTIR-4115), built to `design/public-projects/`.
 *
 * The room is composed from the same chrome every motir.co surface wears —
 * `SiteHeader` + `SiteFooter` — so a project page cannot drift from the rest of
 * the site. `design/legal/` established this shape; this follows it.
 *
 * ⚠️ NO NAV ITEM IS CURRENT, AND THAT IS A DECISION. `/p/*` is a TENANT's
 * page, not a section of this site, so it takes no nav entry and marks none
 * current (`design/public-projects/design-notes.md`'s access-path table).
 *
 * ⚠️ THE HOST IS THE SITE'S. Tenant hosts left this site with MOTIR-10113, and
 * the Worker that renders these pages (MOTIR-10753) answers motir.co alone, so
 * the chrome and every link below it are spelled for `SITE_HOST`.
 *
 * The hero is NOT here: each page composes `ProjectHeader` from the project
 * read it already made, so a page renders hero and body from ONE API call.
 */
export function ProjectLayout({ children }: { children: ReactNode }) {
  return (
    <SiteShell
      host={SITE_HOST}
      contentClassName="mx-auto w-full max-w-[1400px] px-[clamp(16px,3vw,48px)] pt-[clamp(32px,4vw,56px)] pb-[clamp(56px,7vw,112px)]"
    >
      {children}
    </SiteShell>
  )
}
