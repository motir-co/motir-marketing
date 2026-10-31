import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { actHref, loadProject } from '@/lib/publicProject'
import {
  publicPathFor,
  publicUrlFor,
  requestPublicHost,
  SITE_HOST,
} from '@/lib/publicHost'
import { ProjectHeader } from '../../_components/ProjectHeader'
import { ErrorState } from '../../_components/States'
import { format, formatRich, getCopy } from '@/lib/copy'
import { projectAlternates } from '@/lib/localeMetadata'
import { enterLocale } from '@/i18n/locale'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale?: string; identifier: string }>
}): Promise<Metadata> {
  const { identifier } = await params
  const locale = await enterLocale(params)
  const read = await loadProject(identifier)
  if (read.status !== 'ok') return {}
  const meta = (await getCopy(locale)).publicProject.meta
  return {
    title: format(meta.requestNewTitle, { name: read.data.name }),
    description: format(meta.requestNewDescription, { name: read.data.name }),
    alternates: projectAlternates(
      locale,
      publicUrlFor(read.data, 'requests/new'),
    ),
    // ⚠️ NOT INDEXED. This page is a doorway with no content of its own; a
    // crawler that indexed it would rank a hand-off above the roadmap it hands
    // off from.
    robots: { index: false, follow: true },
  }
}

/**
 * THE REQUEST INTAKE (MOTIR-4117) — and it is a HAND-OFF, not a form.
 *
 * ⚠️ THE CARD ASSUMED THIS FLOW WAS ANONYMOUS AND IT IS NOT. MOTIR-4117 says
 * "Both endpoints are anonymous today (`getSession` is not called in either), so
 * this flow works for a logged-out visitor with no cross-origin session question
 * at all — build it, and confirm that reading rather than assuming it." Read on
 * `origin/main`, both call `requireCompliantSession()` and both 401 a logged-out
 * caller — the submit's own header says "sign-in-to-act", and the duplicate
 * pre-check carries the same gate. The same measurement error is recorded in
 * `public-surface-hosts.md` AMENDMENT 4 §A and filed as MOTIR-4166.
 *
 * So this page cannot be the form the card describes, and the reason it is not
 * even a PARTIAL form is worth stating: the duplicate-suggestion step is gated
 * too, so a visitor typing a title here would get no candidates and then be sent
 * to sign in, losing the draft. Canny — the mirror AMENDMENT 4 row 6 follows —
 * identifies the visitor FIRST for exactly this reason. Handing off before the
 * form is the honest shape, not a reduced one.
 *
 * The route exists rather than being deleted because it is a real address:
 * `/explore`, the roadmap and the request detail all want somewhere to point,
 * and a doorway that explains what is about to happen is better than a raw
 * cross-origin link a visitor cannot preview.
 */
export default async function RequestIntakePage({
  params,
}: {
  params: Promise<{ locale?: string; identifier: string }>
}) {
  const { identifier } = await params
  const locale = await enterLocale(params)
  const copy = (await getCopy(locale)).publicProject
  const intake = copy.requestNew
  const host = await requestPublicHost()
  const read = await loadProject(identifier)

  if (read.status === 'not-found') notFound()
  if (read.status === 'failed')
    return <ErrorState title={copy.states.error.project} host={host} />

  const project = read.data

  // ⚠️ TWO PATHS TO THE SAME TAB, AND THEY ARE NOT INTERCHANGEABLE — one
  // variable used to serve both, which was correct only while `motir.co` was
  // the sole host.
  //
  //   • the BACK LINK stays on this host, so it is host-relative;
  //   • the HAND-OFF's return is prefixed with `SITE_ORIGIN` by `actHref`, so
  //     it must be the SITE path or the round trip lands on a URL that does not
  //     exist (`motir.co/<identifier>`). `actHref`'s note carries the reasoning.
  //
  // ⚠️ BOTH ARE THE PROJECT PAGE since MOTIR-6745 (design MOTIR-6742 panel B).
  // They named the roadmap, which was the request board — retired, and its
  // path a redirect into the app's sign-in now (MOTIR-6743).
  const projectHref = publicPathFor(host, identifier, '', locale)
  const returnPath = publicPathFor(SITE_HOST, identifier, '', locale)

  return (
    <>
      <ProjectHeader project={project} current={null} host={host} />

      <div className="mt-6 max-w-[38rem]">
        <p className="mb-5 text-[13px]">
          <Link
            href={projectHref}
            className="text-(--el-text-secondary) hover:text-(--el-link)"
          >
            ← {project.name}
          </Link>
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
            <Link
              href={actHref('request', identifier, returnPath)}
              className="inline-flex h-(--height-btn-md) items-center rounded-(--radius-btn) bg-(--el-accent) px-4 text-[13px] font-medium text-(--el-accent-text) hover:bg-(--el-accent-pressed)"
            >
              {intake.continue}
            </Link>
          </p>
        </div>

        {/* Redrawn TRUE (design MOTIR-6742 panel B): the read tabs need an
            account now, so this names only what still does not. */}
        <p className="mt-5 text-[13px] text-(--el-text-secondary)">
          {formatRich(intake.closing, {
            projectPage: (
              <Link
                href={projectHref}
                className="text-(--el-link) hover:underline"
              >
                {intake.projectPage}
              </Link>
            ),
          })}
        </p>
      </div>
    </>
  )
}
