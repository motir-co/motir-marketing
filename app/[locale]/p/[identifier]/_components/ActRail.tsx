import { actHref, publicApiBase } from '@/lib/publicProject'
import { publicPathFor, type PublicHost } from '@/lib/publicHost'
import { useCopy, usePageLocale } from '@/lib/copy'
import { DEFAULT_LOCALE } from '@/i18n/routing'
import { useAppOrigin } from '@/lib/appOriginContext'
import { SubscribeFormIsland } from '@/app/_islands'

/**
 * The ACT RAIL (MOTIR-4119) — `public-surface-hosts.md` AMENDMENT 4 §D, rows 2,
 * 3 and 6, on the surface they belong to.
 *
 * ⚠️ EVERY ACT THAT NEEDS IDENTITY IS A LINK, NOT A BUTTON, and that is
 * mechanical rather than stylistic. `lib/auth/index.ts` sets the session cookie
 * `sameSite: 'lax'`, so a `fetch` from this origin carries no credential at all
 * — there is nothing to call. Making one work would need `sameSite: 'none'`,
 * which is a widening §4 rejects. AMENDMENT 4 §B is the reasoning; this rail is
 * where it becomes pixels.
 *
 * The `↗` affix is the chrome's own mark for a door that leaves this host, so a
 * visitor can tell before clicking which controls stay and which travel.
 *
 * ⚠️ AND `Follow` NEVER READS `Following`. `actorUserId` is structurally null for
 * every read this host makes (row 8), so the page cannot know whether you already
 * follow. Drawing a followed state would be a picture of a page this
 * architecture cannot serve. The state exists, and it is visible in the
 * application.
 */
export function ActRail({
  identifier,
  returnPath,
  host,
}: {
  identifier: string
  /** ⚠️ A path on the SITE, on every host — `actHref`'s note says why. */
  returnPath: string
  host: PublicHost
}) {
  const rail = useCopy().publicProject.actRail
  const locale = usePageLocale()
  const appOrigin = useAppOrigin()
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      {/* Row 2 — FOLLOW, a hand-off. */}
      <a
        href={actHref(appOrigin, 'follow', identifier, returnPath)}
        className="inline-flex h-(--height-btn-md) items-center rounded-(--radius-btn) bg-(--el-accent) px-(--spacing-btn-x) text-[14px] font-medium text-(--el-accent-text) hover:bg-(--el-accent-pressed)"
      >
        {rail.follow}&nbsp;<span aria-hidden>↗</span>
        <span className="sr-only"> {rail.followSr}</span>
      </a>

      {/* Row 3 — SUBSCRIBE, the one write that stays on this host. */}
      <SubscribeFormIsland
        identifier={identifier}
        apiBase={publicApiBase(appOrigin)}
      />

      {/* Row 6 — REQUEST A FEATURE, a hand-off through the doorway page. */}
      <a
        href={publicPathFor(host, identifier, 'requests/new', locale)}
        className="inline-flex h-(--height-btn-md) items-center rounded-(--radius-btn) border border-(--el-border-strong) px-(--spacing-btn-x) text-[14px] font-medium text-(--el-text) hover:bg-(--el-surface-soft)"
      >
        {rail.requestFeature}
      </a>

      {/* ⚠️ A PLAIN `<a>`, NOT `next/link` (MOTIR-4372). `changelog.xml` is a
          ROUTE HANDLER, not a page: there is no RSC payload to prefetch and no
          client navigation to perform. Next prefetched it anyway, because the
          href is same-origin — and the prefetch answered **404**, once per
          render of every project page, on every host. It was invisible until a
          spec counted responses instead of reading markup
          (`e2e/specs/tenant-chrome.spec.ts`). */}
      <a
        href={publicPathFor(
          host,
          identifier,
          'changelog.xml',
          // A feed, not a page: one address whatever the reader's language.
          DEFAULT_LOCALE,
        )}
        className="inline-flex h-(--height-btn-md) items-center px-2 text-[14px] text-(--el-text-secondary) hover:text-(--el-link)"
      >
        {rail.atomFeed}
      </a>
    </div>
  )
}
