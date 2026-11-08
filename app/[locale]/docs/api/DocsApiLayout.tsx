import { fetchOpenApiSpec, listOperations, railOperations } from '@/lib/docs'
import { DocsShell } from '../_components/DocsShell'

/*
 * The API sub-area (MOTIR-4396) — `/docs/api`, `/docs/api/getting-started` and
 * `/docs/api/stability`. The one place the rail carries the operation tier.
 *
 * ⚠️ THIS LAYOUT IS THE ROUTE-PREFIX RULE. The design asset says tiers 2 and 3
 * render if and only if the route is `/docs/api` or below; a server layout
 * cannot read a pathname, so the rule is the file's LOCATION rather than a
 * condition. Next renders this layout for exactly those routes, so exactly
 * those routes get operations — including the two prose pages under the prefix,
 * which is what the asset draws.
 *
 * ⚠️ THE FETCH IS SHARED WITH THE PAGE, NOT DUPLICATED. `fetchOpenApiSpec`
 * reads the document once per build (`lib/docs.ts`, MOTIR-10645), so this
 * layout and `ApiReferenceRoute.tsx` see the same bytes in every locale —
 * which is what guarantees the rail's anchors match the sections the page
 * renders. A failed read fails the build; no page under `/docs/api` is ever
 * built without the document.
 */
export default async function DocsApiLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const operations = railOperations(listOperations(await fetchOpenApiSpec()))
  return <DocsShell operations={operations}>{children}</DocsShell>
}
