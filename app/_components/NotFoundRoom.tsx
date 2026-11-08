import { buttonVariants } from '@motir/design-system'
import { useCopy, usePageLocale } from '@/lib/copy'
import { EXPLORE, SITE_ROOT } from '@/lib/destinations'
import { siteLinkFor, type PublicHost } from '@/lib/publicHost'
import { ChromeLink } from './ChromeLink'
import { SiteShell } from './SiteShell'

/**
 * THE 404 ROOM ITSELF (MOTIR-4193), lifted out of `app/not-found.tsx`
 * (MOTIR-4430) so that its host is a PARAMETER rather than a hard-coded
 * `SITE_HOST`.
 *
 * ── ⚠️ WHY IT TAKES A HOST AT ALL ────────────────────────────────────────
 *
 * The room is worn by every host `proxy.ts` serves, not only by `motir.co`: a
 * tenant address that 404s a path, the tenant base domain, and any host the
 * public contract does not know are all rewritten to `ROUTER_PATHS.notFound`
 * and land here. On those hosts `/explore`, `/docs`, `/design` and the three
 * legal paths are 404s — so a lost visitor was being handed six chrome doors
 * and two room doors that all led back to the room they were standing in.
 * `hey.motir.site/explore` is the reproduction MOTIR-4430 was filed from.
 *
 * ── ⚠️ AND WHY ITS CALLER PASSES {@link UNKNOWN_HOST} RATHER THAN ASKING ──
 *
 * `app/not-found.tsx` may not read the request — it is the GLOBAL not-found
 * boundary, so a `headers()` read there makes the entire application dynamic
 * (measured; that file carries the route tables and the two alternatives that
 * were built and failed). It passes `UNKNOWN_HOST`, whose `kind` is not `site`, which is
 * all `siteLinkFor` needs: every `motir.co` path is spelled absolutely, which
 * is the only spelling that works off the site and the same destination on it.
 *
 * The component is deliberately host-AGNOSTIC, so the day a route can hand it a
 * real `PublicHost` — a nested `not-found.tsx` that may be async, or partial
 * prerendering — the change is one argument and nothing here moves.
 */
export function NotFoundRoom({ host }: { host: PublicHost }) {
  const copy = useCopy()
  // The doors keep the room's language (MOTIR-7955): `/fr/explore` and `/fr`
  // from a French 404, `/explore` and `/` from an English one. The global
  // boundary's provider says `en`, so there this changes nothing.
  const locale = usePageLocale()
  return (
    /* The box is the design's, verbatim. `max-w-[46rem]` is the shipped
       `/legal` measure, reused rather than re-chosen. */
    <SiteShell
      host={host}
      contentClassName="mx-auto flex w-full max-w-[46rem] flex-col justify-center px-(--spacing-card-padding) py-16"
    >
      <p className="font-(family-name:--font-mono) text-[12px] font-semibold tracking-[0.08em] text-(--el-text-secondary)">
        {copy.notFound.eyebrow}
      </p>

      <h1 className="mt-2.5 font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.notFound.title}
      </h1>

      <p className="mt-3 max-w-[40rem] text-[15px] leading-[1.6] text-(--el-text-secondary)">
        {copy.notFound.lede}
      </p>

      {/* The doors STACK below `sm` and sit on one line above it. Panel 3
          measures them at 390 — where two `md` buttons do not fit — and panel
          1 at 1440; a WRAPPED pair with no explicit order reads as two equal
          choices, which is precisely what the ranking above is not. */}
      <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {/* ⚠️ THE DOORS ARE SPELLED FOR THE HOST TOO, and they are the half a
            reader of MOTIR-4430 misses. The CHROME's links are what the bug was
            reported about; these two are the room's entire PURPOSE. On a tenant
            host `/explore` and `/` are that workspace's or that project's own
            paths, so a lost visitor was being handed two doors back into the
            room they were already standing in.

            Same pair of helpers as the chrome, for the same two reasons:
            `siteLinkFor` spells the href and `ChromeLink` picks the element, so
            off the site both are plain `<a>`s and neither is RSC-prefetched. On
            `motir.co` this is byte-identical to what shipped — a `next/link` to
            `EXPLORE` and one to the site root. */}
        <ChromeLink
          href={siteLinkFor(host, EXPLORE, locale)}
          className={buttonVariants({ size: 'md' })}
        >
          {copy.notFound.exploreDoor}
        </ChromeLink>
        <ChromeLink
          href={siteLinkFor(host, SITE_ROOT, locale)}
          className={buttonVariants({ variant: 'ghost', size: 'md' })}
        >
          {copy.notFound.homeDoor}
        </ChromeLink>
      </div>
    </SiteShell>
  )
}
