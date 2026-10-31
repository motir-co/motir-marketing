import { currentOrigin, requestPublicHost } from '@/lib/publicHost'

/*
 * `robots.txt` for a WORKSPACE address (MOTIR-4222, split out by MOTIR-8842).
 *
 * `acme.motir.site` needs a `robots.txt` naming its OWN sitemap and host: one
 * pointing at `motir.co/sitemap.xml` would hand a crawler a document listing
 * URLs on a host it did not ask about, which the sitemap protocol refuses
 * outright. A customer's own domain never reaches this route: it is the
 * certificate edge's (decision MOTIR-9521), and `proxy.ts` answers one that
 * still points here with the one 404 (MOTIR-9527). Which host asked is only known per
 * request, so this is the part of robots that cannot be built — and it is a
 * route handler on its own so that `app/robots.ts` can be a static file for
 * `motir.co`, which is where the traffic is.
 *
 * Nobody requests `/robots-tenant.txt`: `proxy.ts` rewrites a workspace host's
 * `/robots.txt` here after the host has resolved, with the host headers set.
 * Same body `app/robots.ts` renders, byte for byte, on a different origin.
 */
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const origin = currentOrigin(await requestPublicHost())
  const body = [
    'User-Agent: *',
    'Allow: /',
    '',
    `Host: ${origin}/`,
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
