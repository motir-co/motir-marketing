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
 * already uses. The story added a THIRD build-time variable, a proxy that runs
 * before every request, and two routes that read the request's host; none of
 * those is covered by a unit test of anything.
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
  'proxy.ts',
  'astro.config.mjs',
]

describe('ONE READER PER BUILD-TIME VARIABLE', () => {
  /*
   * ⚠️ THE RULE `lib/appOrigin.ts` AND `lib/siteOrigin.ts` BOTH RECORD, now
   * with a third variable to hold. It is not tidiness: `NEXT_PUBLIC_*` is
   * INLINED by `next build`, and Next inlines `process.env.X` only where `X` is
   * written out literally — so a second reader is a second place to write the
   * name, and getting it wrong there produces `undefined` in the bundle with
   * nothing red anywhere. One reader means one place that can be wrong, and it
   * is the place that throws.
   */
  it.each([
    ['NEXT_PUBLIC_MOTIR_APP_ORIGIN', 'lib/appOrigin.ts'],
    ['NEXT_PUBLIC_MOTIR_SITE_ORIGIN', 'lib/siteOrigin.ts'],
    ['NEXT_PUBLIC_MOTIR_TENANT_DOMAIN', 'lib/tenantDomain.ts'],
  ])('%s is read only by %s', (variable, owner) => {
    const readers = SOURCES.filter(
      (file) =>
        file !== owner &&
        new RegExp(`process\\.env\\.${variable}\\b`).test(code(file)),
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
  it('has exactly ONE proxy, and it is the file Next 16 looks for', () => {
    // `middleware.ts` was renamed to `proxy.ts` in Next 16. A file left at the
    // old name would be silently inert — no route would be host-aware and every
    // tenant address would render the marketing landing.
    expect(tracked('.').includes('middleware.ts')).toBe(false)
    expect(read('proxy.ts')).toContain('export async function proxy(')
    expect(read('proxy.ts')).toContain('export const config')
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
    // ⚠️ THREE FILES IN `lib` SPELL `/p/` LEGITIMATELY, and each is a different
    // thing wearing the same characters — which is exactly why they are named
    // rather than globbed away:
    //
    //   • `lib/publicHost.ts`     — the helper itself; this is its one home.
    //   • `lib/publicProject.ts`  — the API path (`/api/public/p/<id>`), which
    //     is motir-core's endpoint and has nothing to do with a page's address.
    //   • `lib/hostResolution.ts` — the router's REWRITE target, i.e. the
    //     internal route-tree path `app/[locale]/p/[identifier]` lives at. It is the one
    //     place `/p/` must survive a tenant host, because that is where the
    //     visitor's address is translated INTO it.
    const OWNERS = [
      'lib/publicHost.ts',
      'lib/publicProject.ts',
      'lib/hostResolution.ts',
    ]
    const offenders = [...tracked('app/[locale]/p'), ...tracked('lib')]
      .filter((f) => !OWNERS.includes(f))
      .filter((f) => /['"`]\/p\/\$\{/.test(code(f)))
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
