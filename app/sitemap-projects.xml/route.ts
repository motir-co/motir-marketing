import { requestPublicHost } from '@/lib/requestPublicHost'
import { projectSitemapEntries } from '@/lib/sitemapEntries'
import { SITEMAP_HEADERS, urlsetXml } from '@/lib/sitemapXml'

/*
 * The per-host half of the sitemap (MOTIR-8842): the public projects whose
 * canonical is THIS host, at the paths this host serves them at.
 *
 * Request-rendered, and on the allowlist for it: which host asked decides the
 * answer, and the list is a network read of motir-core's public index. On
 * motir.co it is the second entry of `/sitemap.xml`'s index; on a tenant host
 * it is `/sitemap.xml` itself, reached through `proxy.ts`'s rewrite.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const entries = await projectSitemapEntries(await requestPublicHost())
  return new Response(urlsetXml(entries), { headers: SITEMAP_HEADERS })
}
