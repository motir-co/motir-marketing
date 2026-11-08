import { DocsShell } from '../_components/DocsShell'
import { enterLocale, type LocaleParams } from '@/i18n/locale'

/*
 * The GUIDES sub-area (MOTIR-4396) — every documentation page that is not the
 * API reference: the index, the MCP pages, the CLI, the sandbox, the public
 * address.
 *
 * ⚠️ THE ROUTE GROUP IS THE PREDICATE, and that is the point of it. The design
 * asset says tiers 2 and 3 of the rail render "if and only if the route is
 * `/docs/api` or below", and a server layout cannot read a pathname — so the
 * rule is expressed by WHERE THE FILE LIVES instead. These pages get a rail
 * with no operation tier because this layout passes none, and there is no code
 * path by which they could acquire one. A page added here inherits the rail and
 * cannot inherit the operations; a page added under `api/` gets both.
 *
 * The group adds no URL segment: `/docs`, `/docs/cli`, `/docs/mcp`,
 * `/docs/mcp/tools`, `/docs/sandbox` and `/docs/public-address` are exactly
 * where they were.
 *
 * It also means these pages perform NO spec fetch. Before the group, the only
 * way to give the rail its operations was to fetch the 720 KB document in the
 * shared layout — on every prose page, for a tier none of them shows.
 */
export default async function DocsGuidesLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: LocaleParams }>) {
  await enterLocale(params)
  return <DocsShell>{children}</DocsShell>
}
