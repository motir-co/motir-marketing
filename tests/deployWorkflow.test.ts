// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'jsonc-parser'
import { describe, expect, it } from 'vitest'

/*
 * THE RELEASE IS A WRANGLER DEPLOY BEHIND THE SAME GATES (MOTIR-10637).
 *
 * `ci.yml`'s `deploy` job is the only path to motir.co, so the properties the
 * hosting decision's Q3 fixed — every gate in `needs`, `main` only, one
 * release at a time — and the ones this card added — Cloudflare credentials
 * only, the Worker's production variables, a smoke check against the Worker's
 * own address — are held here. Read as text, as `aiOriginWorkflow.test.ts`
 * reads the file: this repository has no YAML parser, and a workflow is
 * neither type-checked nor linted.
 */

const read = (file: string): string =>
  readFileSync(path.join(process.cwd(), file), 'utf8')

const ci = read('.github/workflows/ci.yml')
const seam = read('.github/workflows/subprocessor-seam.yml')
const pkg = JSON.parse(read('package.json')) as {
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}

/** One job's block of `ci.yml`: from its key to the next job's key. */
function job(name: string): string {
  const lines = ci.split('\n')
  const start = lines.indexOf(`  ${name}:`)
  if (start === -1) throw new Error(`no job ${name} in ci.yml`)
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => /^ {2}[a-z][\w-]*:\s*$/.test(line))
  return [lines[start], ...(end === -1 ? rest : rest.slice(0, end))].join('\n')
}

/** A block with its `#` comment lines removed, so prose cannot satisfy a rule. */
const code = (block: string): string =>
  block
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')

// Spelled in two halves, so this file is not itself a hit for the search the
// card's criterion runs over the tree.
const nextPublic = ['NEXT', 'PUBLIC_'].join('_')
const nextTelemetry = ['NEXT', 'TELEMETRY'].join('_')

const deploy = job('deploy')
const deployCode = code(deploy)

describe('the deploy job (MOTIR-10637)', () => {
  it('is named Deploy to Cloudflare', () => {
    expect(deployCode).toMatch(/^ {4}name: Deploy to Cloudflare$/m)
  })

  it('needs exactly the seven gates', () => {
    expect(deployCode).toMatch(
      /^ {4}needs: \[lint, typecheck, build, test, design-guards, e2e, subprocessor-seam\]$/m,
    )
  })

  it('runs only on main, outside pull requests — and is no longer held', () => {
    expect(deployCode).toMatch(
      /^ {4}if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'$/m,
    )
    expect(deployCode).not.toMatch(/^ {4}if: false\s*$/m)
  })

  it('releases one at a time, never cancelled mid-flight, with read-only contents', () => {
    expect(deployCode).toMatch(
      /^ {4}concurrency:\n {6}group: cloudflare-deploy-marketing\n {6}cancel-in-progress: false$/m,
    )
    expect(deployCode).toMatch(/^ {4}permissions:\n {6}contents: read$/m)
  })

  it('reads only the two Cloudflare secrets', () => {
    const secrets = [...deployCode.matchAll(/secrets\.([A-Z_]+)/g)].map(
      (m) => m[1],
    )
    expect(new Set(secrets)).toEqual(
      new Set(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']),
    )
  })

  it('builds on the runner, then deploys with the pinned wrangler', () => {
    const build = deployCode.indexOf('- run: pnpm build')
    const release = deployCode.indexOf('pnpm exec wrangler deploy')
    expect(build).toBeGreaterThan(-1)
    expect(release).toBeGreaterThan(build)
    // `pnpm build` resolves the skills release tag itself.
    expect(pkg.scripts['build']).toContain(
      'SKILLS_RELEASE_TAG=$(node scripts/skills/resolve-release.ts)',
    )
    expect(deployCode).not.toMatch(/pnpm dlx|npx/)
  })

  it('pins wrangler exactly, at 4.34.0 or newer', () => {
    const version = pkg.devDependencies['wrangler'] ?? ''
    expect(version).toMatch(/^\d+\.\d+\.\d+$/)
    const [major, minor] = version.split('.').map(Number)
    expect(major! > 4 || (major === 4 && minor! >= 34)).toBe(true)
  })

  it('smokes the workers.dev address wrangler reported, not motir.co', () => {
    expect(deployCode).toContain('WRANGLER_OUTPUT_FILE_PATH')
    expect(deployCode).toMatch(/workers\\\\?\.dev/)
    expect(deployCode).toContain('ORIGIN: ${{ steps.release.outputs.url }}')
    expect(deployCode).not.toMatch(/https?:\/\/(www\.)?motir\.co/)
    // Redirects are not followed, so the 404 and the 308 are answers.
    expect(deployCode).not.toMatch(/curl[^\n]*\s-L\b/)
  })

  it('checks a static page, a Worker route, an unknown path and a mis-cased locale', () => {
    for (const [route, status] of [
      ['/', 200],
      ['/price', 200],
      ['/explore', 200],
      ['/de/does-not-exist', 404],
      ['/zh-TW/price', 308],
    ] as const) {
      expect(deployCode).toContain(`check ${route} ${status}`)
    }
    expect(deployCode).toContain('*/zh-tw/price) ;;')
  })
})

describe('no Vercel left in the workflows (MOTIR-10637)', () => {
  it.each([
    ['ci.yml', ci],
    ['subprocessor-seam.yml', seam],
  ])('%s names no Vercel, on any line', (_name, text) => {
    expect(text.split('\n').filter((line) => /vercel/i.test(line))).toEqual([])
  })
})

describe('the build-time env (MOTIR-10637)', () => {
  const head = ci.split(/^jobs:\s*$/m)[0] ?? ''

  it("sets the app origin to production at workflow level, under Astro's prefix", () => {
    expect(head).toMatch(
      /^ {2}PUBLIC_MOTIR_APP_ORIGIN: 'https:\/\/app\.motir\.co'$/m,
    )
  })

  it('carries no Next-only key', () => {
    for (const text of [ci, seam]) {
      expect(text).not.toContain(nextPublic)
      expect(text).not.toContain(nextTelemetry)
    }
  })

  it('leaves no Next public name in the tree outside proxy.ts', () => {
    // `git grep` over the tracked tree, the search the card's criterion names.
    // `proxy.ts` is reference-only until the decommission (MOTIR-10639).
    // `e2e/verification/` holds dated write-ups of one-off comparisons against
    // the Next build (MOTIR-10759), which name the env that build ran with;
    // they are records, never read by a build or a workflow.
    let hits = ''
    try {
      hits = execFileSync(
        'git',
        [
          'grep',
          '-l',
          '-e',
          nextPublic,
          '-e',
          nextTelemetry,
          '--',
          '.',
          ':(exclude)e2e/verification/',
        ],
        { encoding: 'utf8' },
      )
    } catch (error) {
      // git grep exits 1 when nothing matches.
      if ((error as { status?: number }).status !== 1) throw error
    }
    const files = hits
      .split('\n')
      .filter(Boolean)
      .filter((file) => file !== 'proxy.ts')
    expect(files).toEqual([])
  })
})

describe('the daily seam (MOTIR-10637)', () => {
  it('keeps its schedule, its manual trigger and its concurrency group', () => {
    expect(seam).toContain("- cron: '17 6 * * *'")
    expect(seam).toMatch(/^ {2}workflow_dispatch:\s*$/m)
    expect(seam).toMatch(/^concurrency:\n {2}group: subprocessor-seam$/m)
  })

  it('reads the renamed app origin, at production, and runs the seam lane', () => {
    expect(seam).toMatch(
      /^ {2}PUBLIC_MOTIR_APP_ORIGIN: 'https:\/\/app\.motir\.co'$/m,
    )
    expect(seam).toContain('- run: pnpm test:seam')
  })

  it("the release gate's seam job keeps its condition and its lane", () => {
    const gate = code(job('subprocessor-seam'))
    expect(gate).toMatch(
      /^ {4}if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'$/m,
    )
    expect(gate).toContain('- run: pnpm test:seam')
  })
})

describe('every gate step calls a script the Astro project defines', () => {
  it.each([ci, seam])('%#', (text) => {
    const called = [
      ...code(text).matchAll(/\bpnpm (?!install|exec|dlx)([\w:-]+)/g),
    ]
      .map((m) => m[1]!)
      .filter((name) => name !== 'run')
    expect(called.length).toBeGreaterThan(0)
    expect(called.filter((name) => !(name in pkg.scripts))).toEqual([])
  })
})

describe("the Worker's production variables (MOTIR-10637)", () => {
  const config = parse(read('wrangler.jsonc')) as {
    vars?: Record<string, string>
    workers_dev?: boolean
    routes?: unknown
    route?: unknown
  }

  it('deploys app.motir.co as the app origin and motir.co as the site origin', () => {
    expect(config.vars).toEqual({
      MOTIR_APP_ORIGIN: 'https://app.motir.co',
      MOTIR_SITE_ORIGIN: 'https://motir.co',
    })
  })

  it('keeps the workers.dev address on and attaches no route before the cut', () => {
    expect(config.workers_dev).toBe(true)
    expect(config.routes).toBeUndefined()
    expect(config.route).toBeUndefined()
  })

  it('the browser lane still points the Worker at the stub', () => {
    expect(read('playwright.config.ts')).toContain(
      '`--var MOTIR_APP_ORIGIN:${STUB_ORIGIN}`',
    )
  })
})

describe('the triggers that reach the deploy (MOTIR-10651)', () => {
  /** `ci.yml`'s `on:` block, comments removed: from `on:` to the next top-level key. */
  const triggers = (() => {
    const lines = ci.split('\n')
    const start = lines.indexOf('on:')
    if (start === -1) throw new Error('no on: block in ci.yml')
    const rest = lines.slice(start + 1)
    const end = rest.findIndex((line) => /^[a-z][\w-]*:/.test(line))
    return code([lines[start], ...rest.slice(0, end)].join('\n'))
  })()

  it('rebuilds on a skills release AND on a plan-ladder change, and on nothing else dispatched', () => {
    expect(triggers).toMatch(
      /^ {2}repository_dispatch:\n {4}types: \[motir-skills-release, motir-plan-ladder-changed\]$/m,
    )
  })

  it('keeps the push, pull-request and daily-backstop triggers', () => {
    expect(triggers).toMatch(/^ {2}push:\n {4}branches: \[main\]$/m)
    expect(triggers).toMatch(/^ {2}pull_request:$/m)
    expect(triggers).toMatch(/^ {2}schedule:\n {4}- cron: '17 5 \* \* \*'$/m)
  })

  it('says why the plan-ladder type exists and what backs it up', () => {
    const lines = ci.split('\n')
    const at = lines.findIndex((line) =>
      /^ {2}repository_dispatch:$/.test(line),
    )
    const comment = lines
      .slice(0, at)
      .reverse()
      .filter((_, i, all) => all.slice(0, i + 1).every((l) => /^\s*#/.test(l)))
      .reverse()
      .join('\n')
    expect(comment).toContain('`motir-plan-ladder-changed`')
    expect(comment).toContain('`/price`')
    expect(comment).toContain('`/how-the-calculation-works`')
    expect(comment).toContain('`GET /v1/public/plans`')
    expect(comment).toMatch(/daily schedule stays the backstop/)
  })

  it('a dispatched run is on the default branch, so the deploy guard admits it', () => {
    // A `repository_dispatch` run's `github.ref` is the default branch and its
    // event is not `pull_request`, so the guard that admits a push admits it.
    for (const name of ['deploy', 'subprocessor-seam']) {
      expect(code(job(name))).toMatch(
        /^ {4}if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'$/m,
      )
    }
  })
})
