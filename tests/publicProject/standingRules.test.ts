import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { APP_ORIGIN } from '@/lib/appOrigin'
import { SITE_ORIGIN } from '@/lib/siteOrigin'
import { projectAddress } from '@/worker/project/path'

/*
 * THE GUARANTEES COVERAGE CANNOT SEE (MOTIR-4121).
 *
 * Each of these is true of the tree rather than of a function, so each is asked
 * of the tree — the idiom `tests/legal/legalRoutes.test.ts` already uses for the
 * no-database rule, and `tests/hosting/appUrlSeam.test.ts` in motir-core for the
 * origin seam.
 */

const ROOT = process.cwd()

const tracked = (dir: string): string[] =>
  execFileSync('git', ['ls-files', dir], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.(ts|tsx)$/.test(f))

const read = (file: string) => readFileSync(join(ROOT, file), 'utf8')

/** A file with its comments stripped — the rules below are asked of CODE. */
const code = (file: string): string =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')

/**
 * The `/p/*` surface: its components, the Worker slot that reads and renders
 * them (MOTIR-10753), and the read module.
 */
const surface = (): string[] => [
  ...tracked('app/[locale]/p'),
  ...tracked('worker/project'),
  'lib/publicProject.ts',
]

describe('the standing NO-DATABASE rule reaches the new tree', () => {
  it('finds the /p/* files at all — the vacuous-pass floor', () => {
    // `tests/legal/legalRoutes.test.ts` walks `app` and `lib` from the
    // filesystem, so it covers this tree by construction. That is only true
    // while the tree is IN those directories, which is what this asserts —
    // otherwise the guard would keep passing over a surface it no longer sees.
    expect(tracked('app/[locale]/p').length).toBeGreaterThanOrEqual(10)
    expect(tracked('lib')).toContain('lib/publicProject.ts')
  })

  it('no /p/* file imports a database client or a connection string', () => {
    const forbidden = [/@prisma\/client/, /from\s+['"]pg['"]/, /DATABASE_URL/]
    const hits: string[] = []
    for (const file of surface()) {
      const src = read(file)
      for (const pattern of forbidden) {
        if (pattern.test(src)) hits.push(`${file}: ${pattern}`)
      }
    }
    expect(hits, hits.join('\n')).toEqual([])
  })
})

describe('ORIGINS DO NOT CROSS', () => {
  it('the two origins are actually different, or this suite proves nothing', () => {
    expect(SITE_ORIGIN).not.toBe(APP_ORIGIN)
  })

  it('every API read is built from the APP origin, through one module', () => {
    // `lib/publicProject.ts` owns the only `${APP_ORIGIN}/api/public` there is.
    // A component that built its own would be a second answer to where the API
    // lives, and the first one to drift at cutover.
    const offenders = [...tracked('app/[locale]/p')].filter((file) =>
      /\/api\/public/.test(read(file)),
    )
    expect(
      offenders,
      'a /p/* file builds an API path itself instead of using lib/publicProject.ts',
    ).toEqual([])
  })

  it('no /p/* file hardcodes either origin as a literal', () => {
    // Getting these the wrong way round is SILENT in production —
    // `lib/siteOrigin.ts`'s own header warns about exactly that — and a literal
    // is how it happens.
    const hits: string[] = []
    for (const file of surface()) {
      // In prose, naming the host is how these files explain themselves; in
      // CODE it is a second source of truth. Strings in code are what this
      // looks for, so comments — where a backticked host is prose — go first.
      for (const match of code(file).matchAll(
        /['"`]https:\/\/(app\.)?motir\.co[^'"`]*['"`]/g,
      )) {
        hits.push(`${file}: ${match[0]}`)
      }
    }
    expect(hits, hits.join('\n')).toEqual([])
  })

  it('the hand-off return is built from SITE_ORIGIN, not from the app origin', () => {
    // The application validates the return against its configured public origin
    // and falls back otherwise, so a return built from the wrong origin is
    // silently discarded and the visitor lands on a dashboard.
    const src = read('lib/publicProject.ts')
    const actHref = src.slice(src.indexOf('export function actHref'))
    expect(actHref).toContain('SITE_ORIGIN_FOR_RETURN')
  })
})

describe('ONE CANONICAL PER PAGE — MOTIR-4222', () => {
  it("no /p/* file builds an absolute URL from siteUrl('/p/…')", () => {
    // ⚠️ THE CARD'S OWN GREP, MECHANISED. Every canonical, `og:url` and JSON-LD
    // `@id` on this surface must come from the project's PRIMARY address
    // (`publicUrlFor`), not from this site's origin — a `siteUrl('/p/…')` left
    // behind is a page telling a crawler that `motir.co` is canonical for a
    // project whose canonical moved, which is the duplication *make primary*
    // exists to prevent.
    //
    // COMMENTS ARE STRIPPED FIRST, the rule this file already applies to the
    // e2e-origin guard: the files that explain the change have to QUOTE the old
    // expression to explain it, and a guard that forbade naming the thing it
    // forbids would have exactly one repair available — deleting the
    // explanation.
    const offenders = surface().filter((f) =>
      /siteUrl\(\s*[`'"]\/p\//.test(code(f)),
    )
    expect(
      offenders,
      'build it from the project’s primary with publicUrlFor() instead',
    ).toEqual([])
  })

  it('and the project sitemap lists this site’s projects alone', () => {
    // A sitemap may only list URLs on its own host. There is one host now
    // (MOTIR-10113), so the project half filters by the Worker's
    // `MOTIR_SITE_ORIGIN` — the behavioural half is
    // `tests/worker/sitemapProjects.test.ts`.
    expect(code('worker/projectSitemap/handler.ts')).toContain(
      'env.MOTIR_SITE_ORIGIN',
    )
  })
})

describe('THE ERROR STATE IS REACHABLE — every /p/* screen has one', () => {
  /*
   * A screen that let the read throw would 500 the whole route on an outage,
   * which is the one thing `public-surface-hosts.md` §8 cost 1 says this
   * surface must not do. Every `/p/*` page is rendered by ONE handler since
   * the Worker took the surface (MOTIR-10753), so the rule is asked of it: its
   * read has three outcomes and each is a different answer. The behavioural
   * half — every page in each outcome — is `tests/worker/project.test.ts`.
   */
  const handler = () => code('worker/project/handler.tsx')

  it('every page that reads renders the error state rather than throwing', () => {
    expect(handler()).toMatch(/readProjectPage\(/)
    expect(handler()).toMatch(/unavailableDocument\(/)
    const pages = code('worker/project/pages.tsx')
    expect(pages).toMatch(/ProjectOverviewUnavailable/)
    expect(pages).toMatch(/ProjectUnavailable/)
    expect(code('app/[locale]/p/[identifier]/ProjectOverview.tsx')).toMatch(
      /<ErrorState[\s/>]/,
    )
  })

  it('and the 404 stays distinct from the outage on every screen that can 404', () => {
    expect(handler()).toMatch(
      /read\.status === 'not-found'\)\s*return notFoundPage\(/,
    )
  })
})

describe('THE COVERAGE LIST IS NOT A PLACE TO FORGET A FILE', () => {
  it('every /p/* component is inside the measured include globs', () => {
    // ⚠️ MOTIR-4120 found exactly this on the motir-core side: the include entry
    // there was a LITERAL path, so five new route files inherited no floor and
    // the gate was green because it was measuring nothing. The globs here are
    // `app/[locale]/p/**/*.tsx` and `lib/publicProject.ts`, so a component added later is
    // measured — this asserts the globs still SAY that, since narrowing them is
    // the change that would silently un-measure the surface.
    const config = read('vitest.config.mts')
    const coverage = config.slice(config.indexOf('coverage: {'))
    const include = coverage.slice(
      coverage.indexOf('include: ['),
      coverage.indexOf(']', coverage.indexOf('include: [')),
    )
    // ⚠️ THE TWO GLOBS ARE THE LOAD-BEARING ENTRIES — narrowing either is the
    // change that silently un-measures a surface. The rest of the list is
    // literal paths, and each is asserted to EXIST below rather than merely to
    // be named, so a file that moves cannot leave a dead entry behind.
    for (const entry of ['lib/publicProject.ts', 'app/?locale?/p/**/*.tsx']) {
      expect(include, `the coverage include lost ${entry}`).toContain(entry)
    }

    // A `?` entry is a glob too (`app/?locale?/…`); `tests/coverageConfig.test.ts`
    // holds every glob to a match.
    const literals = [...include.matchAll(/'([^'*?]+\.tsx?)'/g)].map(
      (m) => m[1]!,
    )
    expect(literals.length).toBeGreaterThan(1)
    for (const file of literals) {
      expect(
        existsSync(join(ROOT, file)),
        `${file} is in the coverage include but does not exist`,
      ).toBe(true)
    }
  })

  it('every host-router file is measured — MOTIR-4220', () => {
    // The router (`worker/router.ts` since MOTIR-10752) is the one file on
    // this surface a visitor cannot reach any other way: it runs before every page and after none, so nothing else's
    // coverage covers it. Naming it here is what keeps that true.
    const coverage = read('vitest.config.mts').slice(
      read('vitest.config.mts').indexOf('coverage: {'),
    )
    for (const file of ['worker/router.ts', 'lib/publicHost.ts']) {
      expect(coverage, `${file} is not in the coverage include`).toContain(
        `'${file}'`,
      )
    }
  })

  it('no /p/* file is excluded — the surface is measured whole', () => {
    // The five exclusions this tree once carried (the Next pages, layout,
    // tab helper, feed route and share-image route) went with the files when
    // the Worker took the surface (MOTIR-10753 · MOTIR-10757): what is left is
    // components the unit suites render, so none is out of scope. An exclusion
    // added back reads as something deliberately unmeasured, which is the
    // decision this asks to be made in the open.
    const config = read('vitest.config.mts')
    // ⚠️ SCOPED TWICE, and both scopings were earned by a red run. First to the
    // COVERAGE section — the file has an earlier `exclude:` for the test glob.
    // Then to the `exclude` array within it — a tree-wide match also picks up
    // the THRESHOLD keys, which are a different thing.
    // The coverage section carries no `exclude` at all since the held-out list
    // went with `proxy.ts` (MOTIR-10639); one added back is read whole.
    const coverage = config.slice(config.indexOf('coverage: {'))
    const start = coverage.indexOf('exclude: [')
    const block =
      start === -1 ? '' : coverage.slice(start, coverage.indexOf(']', start))
    expect([...block.matchAll(/'(app\/\?locale\?\/p\/[^']+)'/g)]).toEqual([])
  })
  it('no e2e spec reconstructs an origin from the environment', () => {
    /*
     * ⚠️ THIS RULE COST A RED CI RUN, and the red run was the lucky outcome.
     *
     * `ci.yml` sets `PUBLIC_MOTIR_APP_ORIGIN` at WORKFLOW level, to
     * production, because `build` and `deploy` need it there. A spec that read
     * it with a local fallback therefore addressed the STUB locally and
     * `https://app.motir.co` in CI — this lane made real calls to production on
     * a pull request, which is exactly the cross-repository coupling
     * `public-surface-hosts.md` AMENDMENT 2 §E splits its jobs to avoid.
     *
     * It failed loudly only because the two answer different error codes. A
     * spec whose assertion happened to hold against the live API would have
     * gone green and told nobody. So the rule is not "assert the right code" —
     * it is that a spec may not derive an address from the environment at all.
     * `e2e/stub/origin.ts` is the one place these live.
     */
    // ⚠️ COMMENTS ARE STRIPPED FIRST, and that is not a convenience. The two
    // files that explain this trap have to QUOTE the expression to explain it,
    // and a guard that forbade naming the thing it forbids would have exactly
    // one repair available: deleting the explanation. So the rule is asked of
    // the code.
    const code = (f: string): string =>
      read(f)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')

    const offenders = tracked('e2e')
      .filter((f) => !f.endsWith('e2e/stub/origin.ts'))
      .filter((f) =>
        /process\.env\[?['"`]PUBLIC_MOTIR_APP_ORIGIN/.test(code(f)),
      )

    expect(
      offenders,
      'import STUB_ORIGIN / SITE_ORIGIN from e2e/stub/origin.ts instead — ' +
        'ci.yml sets PUBLIC_MOTIR_APP_ORIGIN to PRODUCTION at workflow level',
    ).toEqual([])
  })
  it("the stub's hand-run port default still equals the lane's port", () => {
    // The stub cannot import `origin.ts` — it is launched by
    // `node --experimental-strip-types`, which is native ESM and would need an
    // explicit `./origin.ts` specifier. So its literal is a hand-run default and
    // this is what stops the two drifting apart in silence: a lane pointed at
    // 4319 while the stub listened on something else would fail as a connection
    // error, which reads like a broken machine rather than a wrong constant.
    const stub = read('e2e/stub/publicApiStub.ts')
    const origin = read('e2e/stub/origin.ts')

    const declared = /export const STUB_PORT = (\d+)/.exec(origin)?.[1]
    const fallback = /MOTIR_PUBLIC_API_STUB_PORT'\] \?\? (\d+)/.exec(stub)?.[1]

    expect(declared).toBeDefined()
    expect(fallback).toBe(declared)
  })
})

/*
 * ⚠️ NO READ VIEW COMES BACK TO motir.co (MOTIR-6747, Story MOTIR-6171).
 *
 * The board, items, tree, roadmap and item pages moved into the app, where a
 * Visitor reads them behind sign-in and consent; motir.co answers each with a
 * 308 (MOTIR-6743). The rule is written against the CONCEPT — "reads a read
 * view from the public API" — not a list of the files that used to, so a later
 * page that fetched `/p/<id>/board` again, or a loader named for one, fails
 * here whatever it is called and wherever under `app/[locale]/p/**` it lands.
 */
const READ_VIEW = /\/(board|items|tree|roadmap)\b/
const CALL_LITERAL =
  /\b(?:readPublic|fetch)\s*(?:<[^>]*>)?\s*\(\s*([`'"])([\s\S]*?)\1/g
const BASE_LITERAL = /PUBLIC_API_BASE\}([^`]*)`/g
const READ_VIEW_LOADER = /\bload(?:Board|Items?|WorkItems?|Tree|Roadmap)\w*\b/

/** Every way `src` reads a retired read view — empty when it reads none. */
function readViewReads(src: string): string[] {
  const hits: string[] = []
  for (const [, , literal] of src.matchAll(CALL_LITERAL)) {
    if (READ_VIEW.test(literal!)) hits.push(`reads ${literal}`)
  }
  for (const [, rest] of src.matchAll(BASE_LITERAL)) {
    if (READ_VIEW.test(rest!)) hits.push(`builds ${rest}`)
  }
  const loader = READ_VIEW_LOADER.exec(src)
  if (loader) hits.push(`names ${loader[0]}`)
  return hits
}

describe('NO READ VIEW COMES BACK TO motir.co — MOTIR-6747', () => {
  it('the guard can fail — each shape a copy would take is caught', () => {
    for (const bad of [
      'const r = await fetch(`${APP_ORIGIN}/api/public/p/${id}/board`)',
      'return readPublic<BoardDto>(`${seg(identifier)}/items?cursor=${c}`)',
      "readPublic('/p/MOTIR/roadmap')",
      'const url = `${PUBLIC_API_BASE}/p/${id}/tree`',
      "import { loadBoard } from '@/lib/publicProject'",
      'export function loadWorkItem(identifier: string, key: string) {}',
    ]) {
      expect(readViewReads(bad), bad).not.toEqual([])
    }
  })

  it('and passes what legitimately stays — the project, changelog, requests', () => {
    for (const good of [
      'return readPublic<PublicProjectOverviewDto>(`/p/${encodeURIComponent(identifier)}`)',
      'return readPublic<PublicChangelogPageDto>(`${seg(identifier)}/changelog${qs}`)',
      'readPublic<PublicRequestDetailDto>(`${seg(identifier)}/requests/${key}`)',
      "const to = visitorViewUrl(identifier, 'board')",
    ]) {
      expect(readViewReads(good), good).toEqual([])
    }
  })

  it('no module under app/p/**, the Worker slot, nor the read module, reads a read view', () => {
    const files = surface()
    expect(files.length).toBeGreaterThanOrEqual(10)
    const hits = files.flatMap((file) =>
      readViewReads(read(file)).map((hit) => `${file}: ${hit}`),
    )
    expect(hits, hits.join('\n')).toEqual([])
  })

  it('and each retired read path is a redirect, never a page', () => {
    // The Worker decides it from the path alone (`worker/project/path.ts`),
    // before any read; `tests/publicProject/readPageRedirects.test.ts` asks
    // for the 308 itself.
    const url = new URL('https://motir.co/')
    for (const view of ['board', 'items', 'tree', 'roadmap', 'items/ACME-1']) {
      expect(projectAddress(`/p/ACME/${view}`, url)?.page.kind, view).toBe(
        'retired',
      )
      const dir = `app/[locale]/p/[identifier]/${view.split('/')[0]}`
      expect(existsSync(join(ROOT, dir)), dir).toBe(false)
    }
  })
})
