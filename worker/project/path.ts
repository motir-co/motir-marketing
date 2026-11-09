import type { VisitorView } from '@/lib/publicProject'

/*
 * WHAT A `/p/<identifier>/…` ADDRESS IS (MOTIR-10753).
 *
 * The path the project slot receives (locale prefix removed) resolves to one
 * page kind, the route tree `main` `b9ff37a` had under
 * `app/[locale]/p/[identifier]`: the overview, the changelog and its feed, a
 * request and the request doorway, and the four retired read views, which
 * answer a redirect into the app. Anything else under a project is not a page.
 */

export type ProjectPage =
  | { kind: 'overview' }
  | { kind: 'changelog'; cursor: string | undefined }
  | { kind: 'feed' }
  | { kind: 'request'; requestKey: string }
  | { kind: 'requestNew' }
  | { kind: 'retired'; view: VisitorView; sub: string | undefined }

export interface ProjectAddress {
  identifier: string
  page: ProjectPage
}

const RETIRED: ReadonlySet<string> = new Set(['board', 'tree', 'roadmap'])

function decode(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

function pageOf(rest: readonly string[], url: URL): ProjectPage | null {
  const [first, second, ...more] = rest
  if (first === undefined) return { kind: 'overview' }
  if (more.length > 0) return null
  if (second === undefined) {
    if (first === 'changelog')
      return {
        kind: 'changelog',
        cursor: url.searchParams.get('cursor') ?? undefined,
      }
    if (first === 'changelog.xml') return { kind: 'feed' }
    if (first === 'items')
      return { kind: 'retired', view: 'items', sub: undefined }
    if (RETIRED.has(first))
      return { kind: 'retired', view: first as VisitorView, sub: undefined }
    return null
  }
  if (first === 'items') return { kind: 'retired', view: 'items', sub: second }
  if (first !== 'requests') return null
  return second === 'new'
    ? { kind: 'requestNew' }
    : { kind: 'request', requestKey: second }
}

/**
 * The address `path` names, or null for one that is no page. Segments are
 * decoded once, as Next decoded route params; a segment that does not decode
 * names nothing.
 */
export function projectAddress(path: string, url: URL): ProjectAddress | null {
  const [, p, rawIdentifier, ...rawRest] = path.split('/')
  if (p !== 'p' || !rawIdentifier) return null
  const segments = [rawIdentifier, ...rawRest].map(decode)
  if (segments.some((segment) => segment === null || segment === ''))
    return null
  const [identifier, ...rest] = segments as string[]
  const page = pageOf(rest, url)
  return page ? { identifier: identifier!, page } : null
}
