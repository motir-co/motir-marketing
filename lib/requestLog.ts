import type { NextRequest } from 'next/server'

/*
 * One line per request, so the next spike can be named (`vercel logs`).
 *
 * ⚠️ IT EXISTS BECAUSE NOTHING ELSE SAYS WHO IS ASKING. Fly's edge metrics carry
 * a region and a status and no path; Next logs nothing per request; Sentry has
 * no traces from this host. On 2026-10-18 the site served ~130k requests in two
 * days before launch, ran out of memory, and the most anyone could say was
 * "cloud regions, probably crawlers" (`lib/crawlPolicy.ts`). This line is the
 * missing reading: which agent, which path, through which edge.
 *
 * ⚠️ NO IP ADDRESS, DELIBERATELY. The agent, the path and the edge are what a
 * spike is diagnosed by; the client address is personal data under the GDPR and
 * would make this log a record of visitors, which nothing here needs. The edge
 * is the suffix of `fly-request-id` (`01M58HR1…-ams`) or the prefix of
 * `x-vercel-id` (`fra1::…`), the region the visitor reached the host
 * through — a coarse place, never a person.
 *
 * ⚠️ ONLY ON THE HOST. `VERCEL` is set on every Vercel function (and
 * `FLY_APP_NAME` on a Fly machine) and nowhere else, so the unit suites,
 * `next dev` and the browser lane stay quiet.
 */

/** The longest query string and agent kept — a log line, not a payload. */
const MAX_FIELD = 200

export interface RequestLogLine {
  msg: 'request'
  method: string
  host: string | null
  path: string
  query: string
  ua: string
  edge: string | null
  refused: boolean
}

/** The fields of one request's line. */
export function requestLogLine(
  request: NextRequest,
  host: string | null,
  refused: boolean,
): RequestLogLine {
  const requestId = request.headers.get('fly-request-id')
  return {
    msg: 'request',
    method: request.method,
    host,
    path: request.nextUrl.pathname,
    query: request.nextUrl.search.slice(0, MAX_FIELD),
    ua: (request.headers.get('user-agent') ?? '').slice(0, MAX_FIELD),
    edge:
      requestId?.match(/-([a-z]{3})$/)?.[1] ??
      request.headers.get('x-vercel-id')?.match(/^([a-z]+\d)::/)?.[1] ??
      null,
    refused,
  }
}

/** Write the line, on the host only. */
export function logRequest(
  request: NextRequest,
  host: string | null,
  refused: boolean,
  env: Record<string, string | undefined> = process.env,
): void {
  if (!env['VERCEL'] && !env['FLY_APP_NAME']) return
  console.log(JSON.stringify(requestLogLine(request, host, refused)))
}
