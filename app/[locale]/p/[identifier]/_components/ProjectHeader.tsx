import {
  PROJECT_TABS,
  projectTabHref,
  visitorViewUrl,
  type PublicProjectOverviewDto,
  type VisitorView,
} from '@/lib/publicProject'
import { SITE_HOST, type PublicHost } from '@/lib/publicHost'
import { useAppOrigin } from '@/lib/appOriginContext'
import { useCopy, usePageLocale } from '@/lib/copy'
import { ActRail } from './ActRail'
import { WatchLive } from './WatchLive'

/**
 * The project HERO and the TAB BAR (MOTIR-4115) — panel 1 of
 * `design/public-projects/`.
 *
 * Composed by every `/p/*` screen from the subject read it has already made, so
 * a tab renders the hero and its own body from ONE API call.
 *
 * ⚠️ THERE IS NO ACCOUNT MENU AND NO EDIT AFFORDANCE HERE, by decision rather
 * than omission. `public-surface-hosts.md` AMENDMENT 4 row 1 makes the account
 * menu ABSENT (a cross-origin page cannot compute who is looking) and row 7
 * makes in-place overview editing ABSENT (it lives in the application, where the
 * author already signs in). `viewerCanManage` is structurally `false` on this
 * host, so a branch on it would be drawing a state that cannot occur.
 */
export function ProjectHeader({
  project,
  current,
  host = SITE_HOST,
  watch = false,
}: {
  project: PublicProjectOverviewDto
  /**
   * The SITE tab that is current — `''` for the Overview, `'changelog'` — or
   * `null` on a page that is no tab (the request pages, MOTIR-6745).
   */
  current: string | null
  /** Render the "Watch it being built" entry — the project page only (design MOTIR-6742 panel A). */
  watch?: boolean
  /**
   * The address this request arrived on (MOTIR-4220). Defaulted to the site,
   * which is what an unrouted request already is — so the shipped behaviour is
   * the default rather than a case.
   */
  host?: PublicHost
}) {
  // The act rail returns the visitor to the tab they were on, not to the
  // project root — a hand-off that dropped you somewhere else would be a worse
  // round trip than no round trip.
  //
  // ⚠️ BUILT FROM `SITE_HOST`, NOT FROM `host`, ON EVERY HOST. The hand-off
  // prefixes this with `SITE_ORIGIN`, so a host-relative path would become
  // `motir.co/board` — a URL that does not exist. `actHref`'s note carries the
  // reasoning and the consequence.
  // In the page's locale, so the round trip comes back to the same language.
  const locale = usePageLocale()
  const returnPath = projectTabHref(
    SITE_HOST,
    project.identifier,
    current ?? '',
    locale,
  )
  const { identifier, name, workspaceName, publicTagline, publicTags, stats } =
    project
  const copy = useCopy().publicProject
  const appOrigin = useAppOrigin()

  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="flex items-center gap-2.5 font-(family-name:--font-mono) text-[12px] tracking-[0.1em] text-(--el-text) uppercase">
            <i
              aria-hidden="true"
              className="size-[10px] bg-(--el-showcase-highlight)"
            />
            {workspaceName}
          </p>
          <h1 className="mt-3 font-(family-name:--font-serif) text-[clamp(40px,5.4vw,80px)] leading-[0.94] font-bold tracking-[-0.035em] text-(--el-text)">
            {name}
          </h1>
          {publicTagline ? (
            <p className="mt-4 max-w-[60ch] text-[clamp(17px,1.4vw,20px)] leading-[1.5] text-(--el-text-secondary)">
              {publicTagline}
            </p>
          ) : null}
          {publicTags.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {publicTags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-(--radius-badge) border border-(--el-border) bg-(--el-surface) px-(--spacing-chip-x) py-(--spacing-chip-y) text-[12px] leading-snug text-(--el-text-secondary)"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* The four stat figures the design puts opposite the name. `dl` rather
            than a list of divs: each is a term and its value. */}
        <dl className="flex gap-[clamp(20px,2.4vw,40px)] self-end">
          <Stat n={stats.publicRequests} k={copy.stats.requests} />
          <Stat n={stats.upvotes} k={copy.stats.upvotes} />
          <Stat n={stats.planned} k={copy.stats.planned} />
          <Stat n={stats.shipped} k={copy.stats.shipped} />
        </dl>
      </div>

      <ActRail identifier={identifier} returnPath={returnPath} host={host} />

      {watch ? (
        <div className="mt-5">
          <WatchLive identifier={identifier} name={name} />
        </div>
      ) : null}

      {/* ⚠️ SCROLLS, never wraps. Six short labels; a wrapped row would push the
          content down by a line on every project whose window is narrow, which
          the design's narrow panel (16) settles. */}
      {/* ⚠️ SPLIT BY WHO SERVES THE TAB (MOTIR-6745; design MOTIR-6742 panel A).
          Overview and Changelog are pages on this host — host-
          relative plain links. Board, Items, Tree and Roadmap live in the app now
          (MOTIR-6743 redirects the old paths): they follow a divider under
          "In the app", carry the ↗ the act rail's hand-offs use, and are PLAIN
          `<a>`s on the app origin (`useAppOrigin`). SCROLLS, never wraps. */}
      <nav
        aria-label={copy.header.navAria}
        className="mt-8 flex items-center gap-0.5 overflow-x-auto border-b border-(--el-border)"
      >
        {PROJECT_TABS.filter((tab) => tab.served === 'site').map((tab) => {
          const isCurrent = tab.segment === current
          return (
            <a
              key={tab.segment || 'overview'}
              href={projectTabHref(host, identifier, tab.segment, locale)}
              aria-current={isCurrent ? 'page' : undefined}
              className={
                isCurrent
                  ? 'border-b-2 border-(--el-accent) px-3 py-3 text-[15px] font-semibold whitespace-nowrap text-(--el-text)'
                  : 'border-b-2 border-transparent px-3 py-3 text-[15px] font-medium whitespace-nowrap text-(--el-text-secondary) hover:text-(--el-text)'
              }
            >
              {copy.tabs[tab.labelKey]}
            </a>
          )
        })}
        <span
          aria-hidden
          className="mx-2 h-[18px] w-px flex-none bg-(--el-border)"
        />
        <span
          aria-hidden
          className="flex-none px-1 text-[12px] whitespace-nowrap text-(--el-text-secondary)"
        >
          {copy.header.inTheApp}
        </span>
        {PROJECT_TABS.filter((tab) => tab.served === 'app').map((tab) => (
          <a
            key={tab.segment}
            href={visitorViewUrl(
              appOrigin,
              identifier,
              tab.segment as VisitorView,
            )}
            className="border-b-2 border-transparent px-3 py-3 text-[15px] font-medium whitespace-nowrap text-(--el-text-secondary) hover:text-(--el-text)"
          >
            {copy.tabs[tab.labelKey]}&nbsp;<span aria-hidden>↗</span>
            <span className="sr-only"> {copy.header.opensInApp}</span>
          </a>
        ))}
      </nav>
    </header>
  )
}

function Stat({ n, k }: { n: number; k: string }) {
  const locale = usePageLocale()
  return (
    <div className="text-right">
      <dd className="font-(family-name:--font-serif) text-[clamp(28px,2.6vw,40px)] leading-[1] font-bold tracking-[-0.02em] text-(--el-text)">
        {n.toLocaleString(locale)}
      </dd>
      <dt className="mt-1.5 font-(family-name:--font-mono) text-[11px] tracking-[0.1em] text-(--el-text-secondary) uppercase">
        {k}
      </dt>
    </div>
  )
}
