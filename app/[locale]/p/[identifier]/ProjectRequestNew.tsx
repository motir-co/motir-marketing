import { useAppOrigin } from '@/lib/appOriginContext'
import { format, formatRich, useCopy, usePageLocale } from '@/lib/copy'
import { publicPathFor, SITE_HOST } from '@/lib/publicHost'
import { actHref, type PublicProjectOverviewDto } from '@/lib/publicProject'
import { ProjectHeader } from './_components/ProjectHeader'

/**
 * `/p/<identifier>/requests/new` — the REQUEST doorway (MOTIR-4119; design
 * MOTIR-6742 panel B). Asking for a feature needs an account, which lives in
 * the app, so this page says so and hands the visitor over (`actHref`), to come
 * back to the project page. Rendered per request by the Worker (MOTIR-10753).
 */
export function ProjectRequestNew({
  project,
}: {
  project: PublicProjectOverviewDto
}) {
  const copy = useCopy().publicProject
  const intake = copy.requestNew
  const locale = usePageLocale()
  const appOrigin = useAppOrigin()
  const { identifier } = project
  const projectHref = publicPathFor(SITE_HOST, identifier, '', locale)
  return (
    <>
      <ProjectHeader project={project} current={null} host={SITE_HOST} />
      <div className="mt-6 max-w-[38rem]">
        <p className="mb-5 text-[13px]">
          <a
            href={projectHref}
            className="text-(--el-text-secondary) hover:text-(--el-link)"
          >
            ← {project.name}
          </a>
        </p>
        <h2 className="font-(family-name:--font-serif) text-[24px] leading-tight font-bold text-(--el-text)">
          {intake.heading}
        </h2>
        <p className="mt-2.5 text-[14px] leading-[1.6] text-(--el-text-secondary)">
          {format(intake.intro, { project: project.name })}
        </p>
        <div className="mt-6 rounded-(--radius-card) border border-(--el-border) bg-(--el-surface-soft) p-5">
          <h3 className="text-[14px] font-semibold text-(--el-text)">
            {intake.signInTitle}
          </h3>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-(--el-text-secondary)">
            {formatRich(intake.signInBody, {
              host: (
                <strong className="text-(--el-text)">{copy.appHost}</strong>
              ),
            })}
          </p>
          <p className="mt-4">
            <a
              href={actHref(appOrigin, 'request', identifier, projectHref)}
              className="inline-flex h-(--height-btn-md) items-center rounded-(--radius-btn) bg-(--el-accent) px-4 text-[13px] font-medium text-(--el-accent-text) hover:bg-(--el-accent-pressed)"
            >
              {intake.continue}
            </a>
          </p>
        </div>
        {/* Redrawn TRUE (design MOTIR-6742 panel B): the read tabs need an
            account now, so this names only what still does not. */}
        <p className="mt-5 text-[13px] text-(--el-text-secondary)">
          {formatRich(intake.closing, {
            projectPage: (
              <a
                href={projectHref}
                className="text-(--el-link) hover:underline"
              >
                {intake.projectPage}
              </a>
            ),
          })}
        </p>
      </div>
    </>
  )
}
