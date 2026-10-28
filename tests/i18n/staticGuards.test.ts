import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/*
 * MOTIR-7967 — no request read anywhere in the statically built tree.
 *
 * One `headers()`, `cookies()` or `draftMode()` in a module a static page
 * renders makes that page — or, inside a layout or a not-found boundary, every
 * page — dynamic, and the build stays green while it does. The 404 card's
 * guard (`notFoundBoundary.test.ts`) covers the boundaries; this covers the
 * whole of `app/`. The request-rendered trees are the exception, because they
 * answer a HOST: `p/**` (a tenant's public project), `no-application` (a live
 * workspace host with nothing deployed), `host-unavailable`
 * (the outage page), and the two tenant root files, `robots-tenant.txt` and
 * `sitemap-projects.xml`, which describe the requesting host's own pages
 * (motir.co's `robots.txt` and `sitemap.xml` are built since MOTIR-8842). `pnpm i18n:check-prerender` is the build-side half of this guard.
 */

const REQUEST_RENDERED = [
  /^app\/\[locale\]\/p\//,
  /^app\/\[locale\]\/no-application\//,
  /^app\/\[locale\]\/host-unavailable\//,
  /^app\/sitemap-projects\.xml\//,
  /^app\/robots-tenant\.txt\//,
]

/** Next's three request reads, plus this site's one wrapper around
 *  `headers()` (`lib/publicHost.ts`), which reads it through a dynamic import
 *  a scan of `app/` would not otherwise see. */
const REQUEST_READS = new Set([
  'headers',
  'cookies',
  'draftMode',
  'requestPublicHost',
])

function sources(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = `${dir}/${entry.name}`
      if (entry.isDirectory()) return sources(path)
      return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
    },
  )
}

/** Every call to a request read, by name — the AST, not the text, because
 *  comments in this tree name `headers()` to explain the rule. */
function requestReads(file: string, text?: string): string[] {
  const source = ts.createSourceFile(
    file,
    text ?? readFileSync(join(process.cwd(), file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const found: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee)
          ? callee.name.text
          : undefined
      if (name && REQUEST_READS.has(name)) found.push(`${name}(`)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

function defaultExportIsAsync(file: string): boolean {
  const source = ts.createSourceFile(
    file,
    readFileSync(join(process.cwd(), file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  return source.statements.some(
    (s) =>
      ts.isFunctionDeclaration(s) &&
      s.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) &&
      s.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword),
  )
}

describe('the static tree reads no request (MOTIR-7967)', () => {
  const files = sources('app').filter(
    (file) => !REQUEST_RENDERED.some((r) => r.test(file)),
  )

  it('scans the whole tree, not a corner of it', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files).toContain('app/[locale]/layout.tsx')
    expect(files).toContain('app/_components/SiteShell.tsx')
  })

  it('no file outside the request-rendered trees reads the request', () => {
    const offenders = files.flatMap((file) =>
      requestReads(file).map((call) => `${file}: ${call}`),
    )
    expect(offenders).toEqual([])
  })

  it('both not-found boundaries stay synchronous', () => {
    expect(defaultExportIsAsync('app/not-found.tsx')).toBe(false)
    expect(defaultExportIsAsync('app/[locale]/not-found.tsx')).toBe(false)
  })

  it('can fail: a request read, and the exempt trees really do read one', () => {
    expect(
      requestReads('x.tsx', 'export default function X() { draftMode() }'),
    ).toEqual(['draftMode('])
    const exempt = sources('app').filter((file) =>
      REQUEST_RENDERED.some((r) => r.test(file)),
    )
    expect(exempt.flatMap((file) => requestReads(file)).length).toBeGreaterThan(
      0,
    )
  })
})
