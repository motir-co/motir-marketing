/*
 * ONE LINE PER WORKER REQUEST (MOTIR-10752), ported from the Next site's
 * `lib/requestLog.ts` (removed with `proxy.ts`, MOTIR-10639).
 *
 * The same fields the Next site logged, so a reading of the logs means the
 * same thing before and after the move: the method, the path, the query and
 * the user agent (each cut to 200 characters), the edge that answered and
 * whether the request was refused. Two changes, both forced by the runtime:
 *
 *  • THE EDGE IS THE CLOUDFLARE DATA CENTRE, read from the request's own
 *    `cf.colo` (`AMS`, `SJC`, lower-cased) rather than a previous host's
 *    request-id header. A request with no Cloudflare data — a unit test, or a
 *    local run that gives none — logs `null`.
 *  • THERE IS NO HOST FIELD AND NO HOST GATE. The Worker answers motir.co
 *    alone (the tenant-host branch is gone, MOTIR-10113), and it runs only on
 *    Cloudflare or under `wrangler dev`, so there is no "not deployed" case to
 *    stay quiet in.
 *
 * ⚠️ NO CLIENT ADDRESS, EVER. `CF-Connecting-IP`, `X-Forwarded-For` and
 * `X-Real-IP` are never read here, and the router test asserts none of their
 * values reaches the line.
 *
 * Only requests the Worker handles are logged, which is the point: a built
 * page never invokes it, so the log is a count of Worker invocations.
 */

const MAX_FIELD = 200

export interface WorkerRequestLogLine {
  msg: 'request'
  method: string
  path: string
  query: string
  ua: string
  edge: string | null
  refused: boolean
}

/** The Cloudflare properties a request carries in production. */
interface CloudflareProperties {
  colo?: unknown
}

function edgeOf(request: Request): string | null {
  const cf = (request as Request & { cf?: CloudflareProperties }).cf
  return typeof cf?.colo === 'string' && cf.colo !== ''
    ? cf.colo.toLowerCase()
    : null
}

export function requestLogLine(
  request: Request,
  refused: boolean,
): WorkerRequestLogLine {
  const url = new URL(request.url)
  return {
    msg: 'request',
    method: request.method,
    path: url.pathname,
    query: url.search.slice(0, MAX_FIELD),
    ua: (request.headers.get('user-agent') ?? '').slice(0, MAX_FIELD),
    edge: edgeOf(request),
    refused,
  }
}

export function logRequest(request: Request, refused: boolean): void {
  console.log(JSON.stringify(requestLogLine(request, refused)))
}
