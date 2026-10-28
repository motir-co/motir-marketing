import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { SiteShell } from '@/app/_components/SiteShell'
import { ErrorState } from '@/app/[locale]/p/[identifier]/_components/States'
import { resolveHost } from '@/lib/hostResolution'
import { requestPublicHost } from '@/lib/publicHost'
import { format, getCopy } from '@/lib/copy'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'

/**
 * A LIVE WORKSPACE HOST WITH NO APPLICATION YET (Story MOTIR-4528 ·
 * MOTIR-9512) — what `acme.motir.site/` answers.
 *
 * The address decision (MOTIR-9790) gives the bare workspace host to the
 * workspace's default application, and moves public projects to
 * `motir.co/p/<identifier>`. No application record exists yet, so the contract
 * answers `no_application` for every live workspace host and this page says so
 * in the site chrome, naming the workspace. It lists no projects.
 *
 * `noindex`: the page is a placeholder for an application that is not there,
 * not content a crawler should keep.
 *
 * The route is reachable directly (`motir.co/no-application`), so it checks
 * where the request came from: a request the router did not send here is not a
 * workspace host, and it 404s.
 */

/* In the page's locale; no `hreflang` — a tenant host's versions are not motir.co's to list (MOTIR-7956). */
export async function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  const { meta } = (await getCopy(await enterLocale(params))).publicProject
  return {
    title: meta.noApplicationTitle,
    robots: { index: false, follow: false },
  }
}

export default async function NoApplicationPage({ params }: LocalePageProps) {
  const copy = (await getCopy(await enterLocale(params))).publicProject
  const host = await requestPublicHost()

  // Not routed here by the proxy — `motir.co/no-application` is not a workspace.
  if (host.kind !== 'workspace' || !host.host) notFound()

  const read = await resolveHost(host.host)
  if (read.status === 'not-found') notFound()
  if (read.status === 'failed') {
    return (
      <SiteShell
        host={host}
        contentClassName="mx-auto flex w-full max-w-[46rem] flex-col justify-center px-(--spacing-card-padding) py-16"
      >
        <ErrorState title={copy.states.error.address} />
      </SiteShell>
    )
  }
  // The router resolved this host one request ago. A different kind here means
  // the address changed mid-flight, which is a 404 rather than a page drawing a
  // shape it was not given.
  if (read.data.kind !== 'no_application') notFound()

  const { workspace } = read.data

  return (
    <SiteShell
      host={host}
      contentClassName="mx-auto flex w-full max-w-[46rem] flex-col justify-center px-(--spacing-card-padding) py-16"
    >
      <p className="flex items-center gap-1.5 text-[13px] text-(--el-text-secondary)">
        <Building2 className="h-3.5 w-3.5 flex-none" aria-hidden />
        {workspace.name}
      </p>
      <h1 className="mt-1 font-(family-name:--font-serif) text-[30px] leading-tight font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.noApplication.heading}
      </h1>
      <p className="mt-3 text-[15px] leading-[1.6] text-(--el-text-secondary)">
        {format(copy.noApplication.body, { workspace: workspace.name })}
      </p>
    </SiteShell>
  )
}
