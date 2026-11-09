import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * THE STANDING GUARDS, RE-ASSERTED AFTER THE LARGEST CHANGE TO THIS
 * REPOSITORY'S REQUEST PATH SINCE IT GAINED `/p/*` (MOTIR-4224).
 *
 * ⚠️ EACH IS TRUE OF THE TREE RATHER THAN OF A FUNCTION, which is why each is
 * asked of the tree — the idiom `tests/publicProject/standingRules.test.ts`
 * already uses. The story added a THIRD build-time variable, a router that runs
 * before every request, and two routes that read the request's host; none of
 * those is covered by a unit test of anything. The router was the Next
 * `proxy.ts` then; it is the Worker's `worker/router.ts` now (MOTIR-10752), and
 * `proxy.ts` is gone (MOTIR-10639), so the sources below name the Worker.
 */

const ROOT = process.cwd()

const tracked = (dir: string): string[] =>
  execFileSync('git', ['ls-files', dir], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((f) => /\.(ts|tsx|mts|astro)$/.test(f))

const read = (file: string) => readFileSync(join(ROOT, file), 'utf8')

/** Source with comments stripped — a rule must be asked of the CODE. */
const code = (file: string): string =>
  read(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')

const SOURCES = [
  ...tracked('app'),
  ...tracked('lib'),
  ...tracked('e2e'),
  ...tracked('src'),
  ...tracked('i18n'),
  ...tracked('worker'),
  'astro.config.mjs',
]

describe('ONE READER PER BUILD-TIME VARIABLE', () => {
  /*
   * ⚠️ THE RULE `lib/appOrigin.ts` AND `lib/siteOrigin.ts` BOTH RECORD, now
   * with a third variable to hold. It is not tidiness: `PUBLIC_*` is
   * INLINED by `astro build`, whose `define` inlines `process.env.X` only where `X` is
   * written out literally — so a second reader is a second place to write the
   * name, and getting it wrong there produces `undefined` in the bundle with
   * nothing red anywhere. One reader means one place that can be wrong, and it
   * is the place that throws.
   */
  it.each([
    ['PUBLIC_MOTIR_APP_ORIGIN', 'lib/appOrigin.ts'],
    ['PUBLIC_MOTIR_SITE_ORIGIN', 'lib/siteOrigin.ts'],
  ])('%s is read only by %s', (variable, owner) => {
    const readers = SOURCES.filter(
      (file) =>
        file !== owner &&
        // A READ: an assignment is not one. `worker/processEnv.ts` WRITES both
        // origins from the Worker's own variables before the owners evaluate.
        new RegExp(`process\\.env\\.${variable}\\b(?!\\s*=[^=])`).test(
          code(file),
        ),
    )
    expect(
      readers,
      `import the accessor from ${owner} instead of reading the variable again`,
    ).toEqual([])

    expect(code(owner)).toContain(`process.env.${variable}`)
  })
})

describe('THE GUARDS THAT FAIL A BUILD', () => {
  it('the app origin still throws when unset, and it is the module that does', () => {
    // Unchanged by this story, and asserted because the story added a variable
    // with DIFFERENT rules beside it — the risk is somebody harmonising them.
    expect(code('lib/appOrigin.ts')).toContain(
      "throw new MotirAppOriginError('is not set')",
    )
  })
})

describe('THE REQUEST PATH', () => {
  it('has exactly ONE request router, and it is the entry wrangler deploys', () => {
    // The Worker is the one thing that runs per request (MOTIR-10752). A Next
    // `proxy.ts` or `middleware.ts` left beside it would be silently inert —
    // nothing builds Next any more — and would read as a second router.
    for (const retired of ['proxy.ts', 'middleware.ts'])
      expect(tracked('.').includes(retired), retired).toBe(false)
    expect(read('wrangler.jsonc')).toMatch(/^\s*"main": "worker\/index\.ts",$/m)
    expect(code('worker/index.ts')).toContain('export default worker')
    expect(code('worker/index.ts')).toMatch(/\bfetch\(request: Request/)
    expect(code('worker/router.ts')).toMatch(/export async function route\(/)
  })

  it('never reaches a database, however the story rearranged it', () => {
    const forbidden = [/@prisma\/client/, /from\s+['"]pg['"]/, /DATABASE_URL/]
    const hits: string[] = []
    for (const file of SOURCES) {
      for (const pattern of forbidden) {
        if (pattern.test(code(file))) hits.push(`${file}: ${pattern}`)
      }
    }
    expect(hits, hits.join('\n')).toEqual([])
  })

  it('builds every public-project URL through ONE helper', () => {
    // `lib/publicHost.ts` owns what a link and a canonical look like. A file
    // that spelled `/p/` into a URL itself would be a second answer, and the
    // first to be wrong on two hosts out of three.
    //
    // ⚠️ `app/[locale]/explore/**` IS EXEMPT, AND DELIBERATELY SO — MOTIR-4222's boundary
    // says in terms not to touch it. The directory links `motir.co/p/<id>` for
    // every project it lists, which is a valid ALTERNATE address of each; the
    // page-level redirect carries a visitor from there to the primary. Making
    // the square host-aware would mean an addresses read per card on a page
    // whose whole job is to be a fast list.
    // ⚠️ TWO FILES IN `lib` SPELL `/p/` LEGITIMATELY, and each is a different
    // thing wearing the same characters — which is exactly why they are named
    // rather than globbed away:
    //
    //   • `lib/publicHost.ts`     — the helper itself; this is its one home.
    //   • `lib/publicProject.ts`  — the API path (`/api/public/p/<id>`), which
    //     is motir-core's endpoint and has nothing to do with a page's address.
    //
    // (`lib/hostResolution.ts`, the Next router's tenant rewrite target, was the
    // third; it went with `proxy.ts`, MOTIR-10639.)
    const OWNERS = ['lib/publicHost.ts', 'lib/publicProject.ts']
    const offenders = [...tracked('app/[locale]/p'), ...tracked('lib')]
      .filter((f) => !OWNERS.includes(f))
      .filter((f) => /['"`]\/p\/\$\{/.test(code(f)))
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
