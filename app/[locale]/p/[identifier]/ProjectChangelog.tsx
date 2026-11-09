import { DEFAULT_LOCALE } from '@/i18n/routing'
import { useAppOrigin } from '@/lib/appOriginContext'
import { useCopy, usePageLocale } from '@/lib/copy'
import { publicPathFor, SITE_HOST } from '@/lib/publicHost'
import {
  dateLocaleFor,
  pagedTabHref,
  visitorViewUrl,
  type PublicChangelogPageDto,
  type PublicProjectOverviewDto,
  type PublicRead,
} from '@/lib/publicProject'
import { ProjectHeader } from './_components/ProjectHeader'
import { MoreLink } from './_components/Rows'
import { EmptyState, ErrorState } from './_components/States'

/**
 * `/p/<identifier>/changelog` — the CHANGELOG tab (MOTIR-4116): what shipped,
 * newest first, paged by a real `?cursor=` URL a crawler can walk. Rendered per
 * request by the Worker (MOTIR-10753).
 *
 * ⚠️ THE TAB'S OWN READ FAILING IS NOT THE PROJECT FAILING. The project read
 * decided 404-vs-error for the page before this renders; a changelog endpoint
 * that is down still renders the hero and the tab bar, with the error state in
 * the body.
 */
export function ProjectChangelog({
  project,
  changelog,
}: {
  project: PublicProjectOverviewDto
  changelog: PublicRead<PublicChangelogPageDto>
}) {
  return (
    <>
      <ProjectHeader project={project} current="changelog" host={SITE_HOST} />
      <ChangelogBody identifier={project.identifier} changelog={changelog} />
    </>
  )
}

function ChangelogBody({
  identifier,
  changelog,
}: {
  identifier: string
  changelog: PublicRead<PublicChangelogPageDto>
}) {
  const copy = useCopy().publicProject
  const locale = usePageLocale()
  if (changelog.status !== 'ok')
    return (
      <ErrorState title={copy.states.error.changelog} identifier={identifier} />
    )
  const page = changelog.data
  if (page.entries.length === 0)
    return (
      <EmptyState title={copy.changelog.empty.title}>
        {copy.changelog.empty.body}
      </EmptyState>
    )
  return (
    <>
      <ChangelogEntries identifier={identifier} page={page} />
      {page.nextCursor ? (
        <MoreLink
          href={pagedTabHref(
            SITE_HOST,
            identifier,
            'changelog',
            { cursor: page.nextCursor },
            locale,
          )}
          label={copy.changelog.older}
        />
      ) : null}
      <p className="mt-5 text-[13px]">
        {/* A feed: one address whatever the reader's language. */}
        <a
          href={publicPathFor(
            SITE_HOST,
            identifier,
            'changelog.xml',
            DEFAULT_LOCALE,
          )}
          className="text-(--el-link) underline underline-offset-2"
        >
          {copy.changelog.subscribeAtom}
        </a>
      </p>
    </>
  )
}

/** The entry date, in the page's locale — `9 Oct 2026` in English. */
function dateFormat(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(dateLocaleFor(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function ChangelogEntries({
  identifier,
  page,
}: {
  identifier: string
  page: PublicChangelogPageDto
}) {
  const date = dateFormat(usePageLocale())
  const appOrigin = useAppOrigin()
  return (
    <ul className="mt-5 border-t border-(--el-border)">
      {page.entries.map((entry) => (
        <li
          key={entry.identifier}
          className="flex items-baseline gap-3 border-b border-(--el-border) py-3"
        >
          <time
            dateTime={entry.shippedAt}
            className="w-[6.5rem] flex-none font-(family-name:--font-mono) text-[11px] font-medium text-(--el-text-secondary)"
          >
            {date.format(new Date(entry.shippedAt))}
          </time>
          <span className="min-w-0 flex-1">
            {/* Straight into the app (MOTIR-6745): the item page on this host
                is a redirect now (MOTIR-6743). */}
            <a
              href={visitorViewUrl(
                appOrigin,
                identifier,
                'items',
                entry.identifier,
              )}
              className="text-[14px] font-medium text-(--el-text) hover:text-(--el-link)"
            >
              {entry.title}
            </a>
            {entry.epic ? (
              <span className="mt-1 block text-[12px] text-(--el-text-secondary)">
                {entry.epic.title}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}
