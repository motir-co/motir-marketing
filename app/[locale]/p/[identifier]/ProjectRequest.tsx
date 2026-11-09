import { MarkdownBody } from '@/app/[locale]/legal/_components/MarkdownBody'
import { useAppOrigin } from '@/lib/appOriginContext'
import { formatRich, useCopy, usePageLocale } from '@/lib/copy'
import { publicPathFor, SITE_HOST } from '@/lib/publicHost'
import {
  actHref,
  dateLocaleFor,
  type PublicProjectOverviewDto,
  type PublicRead,
  type PublicRequestDetailDto,
} from '@/lib/publicProject'
import { ProjectHeader } from './_components/ProjectHeader'
import { StatusPill } from './_components/Rows'
import { ErrorState } from './_components/States'

/**
 * `/p/<identifier>/requests/<KEY>` — ONE feature request, its public thread and
 * its vote count (MOTIR-4117; design MOTIR-6742 panel C). Rendered per request
 * by the Worker (MOTIR-10753) once the project read is `ok` and the request
 * read is not `not-found`.
 *
 * ⚠️ READ-ONLY ON THIS HOST. Commenting and upvoting are hand-offs to the app
 * (`actHref`), which returns the visitor to this request's address on the site.
 * A request read that FAILED keeps the hero and shows the error state.
 */
export function ProjectRequest({
  project,
  request,
}: {
  project: PublicProjectOverviewDto
  request: Exclude<PublicRead<PublicRequestDetailDto>, { status: 'not-found' }>
}) {
  const copy = useCopy().publicProject
  return (
    <>
      <ProjectHeader project={project} current={null} host={SITE_HOST} />
      {request.status === 'failed' ? (
        <ErrorState
          title={copy.states.error.request}
          identifier={project.identifier}
          host={SITE_HOST}
        />
      ) : (
        <RequestArticle project={project} request={request.data} />
      )}
    </>
  )
}

/** A request's and a comment's date — `9 October 2026` in English. */
function dateFormat(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(dateLocaleFor(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function RequestArticle({
  project,
  request,
}: {
  project: PublicProjectOverviewDto
  request: PublicRequestDetailDto
}) {
  const locale = usePageLocale()
  const returnPath = publicPathFor(
    SITE_HOST,
    project.identifier,
    `requests/${encodeURIComponent(request.identifier)}`,
    locale,
  )
  return (
    <article className="mt-6 grid gap-7 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div>
        <RequestHeading project={project} request={request} />
        {request.descriptionMd ? (
          <div className="mt-5">
            <MarkdownBody value={request.descriptionMd} />
          </div>
        ) : null}
        <RequestThread request={request} />
        <CommentHandoff
          identifier={project.identifier}
          returnPath={returnPath}
        />
      </div>
      <RequestAside
        identifier={project.identifier}
        voteCount={request.voteCount}
        returnPath={returnPath}
      />
    </article>
  )
}

function RequestHeading({
  project,
  request,
}: {
  project: PublicProjectOverviewDto
  request: PublicRequestDetailDto
}) {
  const page = useCopy().publicProject.request
  const locale = usePageLocale()
  return (
    <>
      <p className="mb-5 text-[13px]">
        {/* Back to the project page: the request board this pointed at is
            retired (MOTIR-6745; design MOTIR-6742 panel C). */}
        <a
          href={publicPathFor(SITE_HOST, project.identifier, '', locale)}
          className="text-(--el-text-secondary) hover:text-(--el-link)"
        >
          ← {project.name}
        </a>
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="font-(family-name:--font-mono) text-[12px] text-(--el-text-secondary)">
          {request.identifier}
        </span>
        <StatusPill
          status={request.statusLabel}
          category={request.statusCategory}
        />
      </div>
      <h2 className="mt-1.5 font-(family-name:--font-serif) text-[24px] leading-tight font-bold text-(--el-text)">
        {request.title}
      </h2>
      <p className="mt-2 text-[13px] text-(--el-text-secondary)">
        {formatRich(page.openedBy, {
          author: request.openedByName,
          date: (
            <time dateTime={request.createdAt}>
              {dateFormat(locale).format(new Date(request.createdAt))}
            </time>
          ),
        })}
      </p>
    </>
  )
}

function RequestThread({ request }: { request: PublicRequestDetailDto }) {
  const page = useCopy().publicProject.request
  const date = dateFormat(usePageLocale())
  return (
    <>
      <h3 className="mt-8 text-[12px] font-bold tracking-wider text-(--el-text-secondary) uppercase">
        {page.discussion}
      </h3>
      {request.comments.length === 0 ? (
        <p className="mt-3 text-[13px] text-(--el-text-secondary)">
          {page.noComments}
        </p>
      ) : (
        <ul className="mt-3">
          {request.comments.map((comment) => (
            <li
              key={comment.id}
              className="flex gap-2.5 border-t border-(--el-border) py-3.5"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 flex-none items-center justify-center rounded-(--radius-badge) bg-(--el-tint-lavender) text-[11px] font-semibold text-(--el-text-strong)"
              >
                {initials(comment.author.name)}
              </span>
              <div className="min-w-0">
                <span className="text-[13px] font-semibold text-(--el-text)">
                  {comment.author.name}
                </span>
                <time
                  dateTime={comment.createdAt}
                  className="ml-1.5 text-[12px] text-(--el-text-secondary)"
                >
                  {date.format(new Date(comment.createdAt))}
                </time>
                <div className="mt-1 text-[13px] leading-[1.6] text-(--el-text-secondary)">
                  <MarkdownBody value={comment.bodyMd} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/** Row 5 — the COMMENT hand-off (MOTIR-4119). */
function CommentHandoff({
  identifier,
  returnPath,
}: {
  identifier: string
  returnPath: string
}) {
  const copy = useCopy().publicProject
  const appOrigin = useAppOrigin()
  return (
    <div className="mt-5 rounded-(--radius-card) border border-dashed border-(--el-border-strong) bg-(--el-surface-soft) p-4">
      <p className="text-[13px] text-(--el-text-secondary)">
        {formatRich(copy.request.commentHandoff, {
          host: <strong className="text-(--el-text)">{copy.appHost}</strong>,
        })}
      </p>
      <p className="mt-2.5">
        <a
          href={actHref(appOrigin, 'comment', identifier, returnPath)}
          className="inline-flex h-(--height-btn-sm) items-center rounded-(--radius-btn) border border-(--el-border-strong) bg-(--el-page-bg) px-3 text-[13px] font-medium text-(--el-text) hover:bg-(--el-surface)"
        >
          {copy.request.addComment}&nbsp;<span aria-hidden>↗</span>
        </a>
      </p>
    </div>
  )
}

/** The demand figure and the UPVOTE and REQUEST hand-offs (MOTIR-4119). */
function RequestAside({
  identifier,
  voteCount,
  returnPath,
}: {
  identifier: string
  voteCount: number
  returnPath: string
}) {
  const copy = useCopy().publicProject
  const page = copy.request
  const locale = usePageLocale()
  const appOrigin = useAppOrigin()
  return (
    <aside className="text-[13px] text-(--el-text-secondary)">
      <div>
        <h3 className="mb-2 text-[12px] font-bold tracking-wider uppercase">
          {page.demand}
        </h3>
        <p className="text-[14px] text-(--el-text)">
          {voteCount.toLocaleString(locale)} {copy.stats.upvotes}
        </p>
        <p className="mt-2">
          <a
            href={actHref(appOrigin, 'upvote', identifier, returnPath)}
            className="inline-flex items-center gap-1.5 rounded-(--radius-badge) border border-(--el-border-strong) bg-(--el-page-bg) px-2.5 py-1 text-[12px] text-(--el-text-secondary) hover:border-(--el-accent) hover:text-(--el-text)"
          >
            <span aria-hidden className="text-[10px]">
              ▲
            </span>
            {page.upvote}&nbsp;<span aria-hidden>↗</span>
          </a>
        </p>
        <p className="mt-1.5 text-[12px]">{page.upvoteNote}</p>
      </div>
      <div className="mt-5">
        <h3 className="mb-2 text-[12px] font-bold tracking-wider uppercase">
          {page.askHeading}
        </h3>
        <p>
          <a
            href={actHref(appOrigin, 'request', identifier, returnPath)}
            className="text-(--el-link) hover:underline"
          >
            {page.requestFeature}
          </a>
        </p>
      </div>
    </aside>
  )
}

/** Up to two initials for a comment's avatar; `?` for a name with none. */
export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}
