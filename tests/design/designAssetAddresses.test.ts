import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'
import { ROOT, designTree, filesUnder } from './designTree'

/*
 * MOTIR-4990 — a design asset is a REFERRER, ported from motir-core's
 * `tests/design-asset-addresses.test.ts` (MOTIR-2316, MOTIR-2364).
 *
 * ── Why this repository needs it now ─────────────────────────────────────────
 * The `/docs` design of record lives here (MOTIR-3932, MOTIR-4393), and the
 * design-reference rule makes an asset AUTHORITATIVE: a card building a surface
 * opens `design/<area>/` first and matches what it finds. So an address an
 * asset names is believed by construction, and so is a source path it tells
 * the next agent to open. Neither is resolved by any build, and neither is
 * opened by any other test — both live only in prose and in `href`s.
 *
 * ── The two sweeps ───────────────────────────────────────────────────────────
 *  1. ADDRESSES — every `/…` an asset names must still be a page this app
 *     serves: the `app/**` route tree, plus any redirect `next.config.ts`
 *     declares (checked FIRST — a redirect source resolves, but only by
 *     sending the reader somewhere else).
 *  2. SOURCE PATHS — every path anchored on one of this repository's own
 *     top-level directories must exist in the tree.
 *
 * ── Where the judgement went ─────────────────────────────────────────────────
 * One place per sweep: `KNOWN` and `KNOWN_PATHS`. An asset can name an address
 * on purpose that this app does not serve — another host's route, a
 * point-in-time record — and each such pair is listed once with a reason. Both
 * tables are asserted TIGHT in both directions: an unlisted finding fails, and
 * a row that no longer matches anything fails too, so neither can rot into a
 * mute button.
 */

// ── The address inventory: what the app actually serves ─────────────────────

// A directory holding a PAGE file serves its own path.
const PAGE_FILES = new Set(['page.tsx', 'page.ts', 'route.ts', 'route.tsx'])
// A metadata file serves the directory's path plus its OWN name.
const METADATA_FILES = new Set([
  'opengraph-image.tsx',
  'twitter-image.tsx',
  'icon.tsx',
  'apple-icon.tsx',
  'sitemap.ts',
  'robots.ts',
])

/** The segment every localised page lives under (MOTIR-7948). */
const LOCALE_SEGMENT = '[locale]'

/** Every address `app/**` serves, as a segment pattern (`['p', '[identifier]']`). */
function appRoutePatterns(): string[][] {
  const seen = new Set<string>()
  for (const file of filesUnder(join(ROOT, 'app'))) {
    const parts = file.split('/').slice(1)
    // Every page sits under the locale segment since MOTIR-7948, and English —
    // the address every asset names — is unprefixed, so a route's address is
    // its path below `[locale]`.
    if (parts[0] === LOCALE_SEGMENT) parts.shift()
    const leaf = parts.pop()
    if (!leaf) continue
    // The locale catch-all serves only the 404 room (MOTIR-7955): it would
    // otherwise "serve" every address the guard exists to call dead.
    if (parts.some((segment) => segment.startsWith('[...'))) continue
    if (METADATA_FILES.has(leaf)) parts.push(leaf.replace(/\.[a-z]+$/, ''))
    else if (!PAGE_FILES.has(leaf)) continue
    // Route groups — `(guides)` — organise the tree without appearing in the URL.
    seen.add(parts.filter((segment) => !/^\(.*\)$/.test(segment)).join('/'))
  }
  return [...seen].map((path) => (path === '' ? [] : path.split('/')))
}

const APP_ROUTES = appRoutePatterns()

/*
 * EVERY redirect `next.config.ts` declares, read off the config's own
 * `redirects()` rather than off named maps: a map this list forgot would make
 * the guard call a live address dead. There are none today.
 *
 * ⚠️ `proxy.ts` REWRITES, AND ADDS NOTHING HERE. Its every branch is keyed on a
 * TENANT host (`acme.motir.site`, a customer domain) and maps that host's paths
 * onto `app/p/[identifier]/**`; on motir.co itself it steps aside before reading
 * the path. So it serves no address on this host that `app/**` does not already
 * list.
 */
const REDIRECT_SOURCES: string[][] = (
  (await nextConfig.redirects?.()) ?? []
).map((rule) => rule.source.replace(/^\//, '').split('/'))

const isDynamic = (segment: string) =>
  /^\[.+\]$/.test(segment) || /^:.+/.test(segment)
const isCatchAll = (segment: string) =>
  /^\[\[?\.\.\..+\]\]?$/.test(segment) || /^:.+\*$/.test(segment)

/**
 * Does `candidate` (an address written in an asset, split into segments) match
 * `pattern` (a route or a redirect source)? A dynamic segment on EITHER side
 * matches: the app writes `[identifier]`, and an asset writes either that or a
 * concrete example (`/p/MOTIR`), and both address the same page.
 */
function matchesPattern(pattern: string[], candidate: string[]): boolean {
  let p = 0
  while (p < pattern.length) {
    const segment = pattern[p]!
    if (isCatchAll(segment)) return candidate.length > p
    if (p >= candidate.length) return false
    if (
      !isDynamic(segment) &&
      !isDynamic(candidate[p]!) &&
      segment !== candidate[p]
    )
      return false
    p += 1
  }
  return candidate.length === pattern.length
}

// ── Reading addresses out of an asset ───────────────────────────────────────

// The three syntaxes an asset writes an address in. Restricting to these is what
// keeps the sweep quiet: a bare slash in prose is almost always an alternative
// ("green/mint"), not an address.
const ADDRESS_SYNTAXES = [
  /(?:href|action|src)=["'](\/[^"'\s]*)/g, // a link in a .mock.html
  /\]\((\/[^)\s]*)/g, //                      a Markdown link in design-notes.md
  /`(\/[^`\s]*)`/g, //                        an address quoted in prose
]

interface RawAddress {
  raw: string
  line: number
}

const lineOf = (source: string, index: number | undefined) =>
  source.slice(0, index).split('\n').length

/** Every address-shaped string in one asset's source, with its line number. */
export function addressesIn(source: string): RawAddress[] {
  const found: RawAddress[] = []
  for (const syntax of ADDRESS_SYNTAXES)
    for (const match of source.matchAll(syntax))
      found.push({ raw: match[1]!, line: lineOf(source, match.index) })
  return found
}

/** Reduce a raw match to the page address it names, or `null` when it is not one. */
export function toPageAddress(raw: string): string | null {
  // (1) A placeholder — `/p/<identifier>`, `/legal/{slug}`, and the same thing
  //     HTML-escaped inside a mock (`/p/&lt;identifier&gt;`). Tested before the
  //     query strip, so a `?` inside a regex literal cannot truncate it.
  if (/[<>{}…\\^$|]|&lt;|&gt;/.test(raw)) return null

  let address = raw.split('?')[0]!.split('#')[0]!
  // A prose glob names a FAMILY. `/p/*` is "a page one level under `/p`", so the
  // star becomes a dynamic segment and matches `p/[identifier]`; stripping it to
  // `/p` would ask about a page nobody claimed exists. `/docs*` has no slash
  // before the star, so it names a prefix. (A DEPARTURE from the motir-core
  // spec this ports, which strips both forms — filed there as MOTIR-5447.)
  address = address.replace(/\/\*+$/, '/[*]').replace(/\*+$/, '')
  if (address.length > 1) address = address.replace(/\/+$/, '')
  if (address === '') return null

  // (2) A file, not a page: `/icon.svg`, `/p/MOTIR/changelog.xml`.
  if (/\.[a-z0-9]+$/i.test(address.split('/').pop()!)) return null
  // (3) An HTTP endpoint rather than a page. This app serves no `/api` route;
  //     an `/api/*` in an asset is motir-core's API, which the site reads over
  //     HTTP and whose routes this repository cannot inventory.
  if (/^\/(api|v1)(\/|$)/.test(address)) return null

  return address
}

type Verdict = 'redirects-away' | 'resolves-to-nothing'

export function classify(
  address: string,
  redirects: string[][] = REDIRECT_SOURCES,
): Verdict | null {
  const segments = address === '/' ? [] : address.replace(/^\//, '').split('/')
  if (redirects.some((pattern) => matchesPattern(pattern, segments)))
    return 'redirects-away'
  if (APP_ROUTES.some((pattern) => matchesPattern(pattern, segments)))
    return null
  return 'resolves-to-nothing'
}

/** The `.md` / `.html` sources of every design asset. */
const assetSources = () =>
  designTree().filter((path) => /\.(md|html)$/.test(path))

interface Finding {
  file: string
  address: string
  verdict: Verdict
  line: number
}

function sweep(): Finding[] {
  const findings = new Map<string, Finding>()
  for (const file of assetSources()) {
    for (const { raw, line } of addressesIn(
      readFileSync(join(ROOT, file), 'utf8'),
    )) {
      const address = toPageAddress(raw)
      if (address === null) continue
      const verdict = classify(address)
      if (verdict === null) continue
      const id = `${file} ${address}`
      // First occurrence wins, so the reported line is the one to open.
      if (!findings.has(id)) findings.set(id, { file, address, verdict, line })
    }
  }
  return [...findings.values()].sort((a, b) =>
    `${a.file} ${a.address}`.localeCompare(`${b.file} ${b.address}`),
  )
}

// ── The judgement, in one table ─────────────────────────────────────────────
//
// Every (asset, address) pair the sweep finds today, with why it may stay. A
// genuinely stale address is corrected in the asset, never parked here.
const KNOWN: { file: string; address: string; why: string }[] = [
  // ── A route on the APPLICATION's host, named where the landing hands off ──
  // motir.co's doors lead to app.motir.co, so the landing's own notes name the
  // application routes a visitor arrives at. They are real — on the other host,
  // served by motir-core — and this repository's route tree cannot see them,
  // exactly as motir-core's guard cannot see `/design` or `/legal` here. Kept as
  // rows rather than rewritten to absolute URLs so they stay CHECKED: if this
  // host ever serves one of them, the row stops matching and says so.
  {
    file: 'design/marketing/design-notes.md',
    address: '/onboarding',
    why: "motir-core's idea-first entrance (MOTIR-1461, `app/(onboarding)/onboarding/page.tsx` there) — the application screen the landing's idea door lands on. It lives on app.motir.co, not on this host.",
  },
  {
    file: 'design/marketing/design-notes.md',
    address: '/sign-up',
    why: "motir-core's sign-up route (`app/(auth)/sign-up/page.tsx` there), named in the notes' verification that the door chain reads `next` alone. It lives on app.motir.co, not on this host.",
  },
]

// ── The reconciler, shared by both sweeps ───────────────────────────────────

interface Reconcilable {
  id: string
  report: string
}

const idOf = (x: { file: string; address: string }) => `${x.file} ${x.address}`

const reconcilable = (finding: Finding): Reconcilable => ({
  id: idOf(finding),
  report: `${finding.file}:${finding.line} — ${finding.address} (${finding.verdict})`,
})

/** Findings no row covers — an asset went stale, or a new one shipped stale. */
export function unlisted(
  findings: Reconcilable[],
  allowed: string[],
): string[] {
  const covered = new Set(allowed)
  return findings
    .filter((finding) => !covered.has(finding.id))
    .map((finding) => finding.report)
}

/** Rows that match nothing — the asset was corrected, so the row must go. */
export function expired(findings: Reconcilable[], allowed: string[]): string[] {
  const live = new Set(findings.map((finding) => finding.id))
  return allowed.filter((id) => !live.has(id))
}

/**
 * Rows listed more than once. Neither check above can see a duplicate — a
 * second row is a no-op to `unlisted()` and still matches for `expired()` —
 * so uniqueness is the third axis, and it is the one a parallel merge attacks.
 */
export function duplicated(ids: string[]): string[] {
  const seen = new Set<string>()
  const twice = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) twice.add(id)
    seen.add(id)
  }
  return [...twice].sort()
}

/** A reason is a sentence, not a word. */
const MINIMUM_REASON = 40

describe('a design asset addresses pages that still exist', () => {
  it('reads a route tree and an asset tree that are actually there', () => {
    // Without this, a walk that found nothing would make every assertion below a
    // comparison of two empty lists.
    expect(APP_ROUTES.length).toBeGreaterThan(10)
    expect(assetSources().length).toBeGreaterThan(5)
    expect(
      assetSources().flatMap((file) =>
        addressesIn(readFileSync(join(ROOT, file), 'utf8')),
      ).length,
    ).toBeGreaterThan(50)
  })

  it('finds no address the app no longer serves', () => {
    expect(
      unlisted(sweep().map(reconcilable), KNOWN.map(idOf)),
      'A design asset is the layout source of truth for its surface; an address it names that ' +
        'redirects away or resolves to nothing will be believed by the next card that reads it. ' +
        'Correct the asset, or add the pair to KNOWN with a reason if the address is deliberate.',
    ).toEqual([])
  })

  it('carries no KNOWN entry that has stopped applying', () => {
    expect(
      expired(sweep().map(reconcilable), KNOWN.map(idOf)),
      'These KNOWN entries no longer match anything — delete them.',
    ).toEqual([])
  })

  it('lists each (asset, address) pair exactly once', () => {
    expect(duplicated(KNOWN.map(idOf))).toEqual([])
  })

  it('gives every KNOWN entry a reason at least a sentence long', () => {
    expect(
      KNOWN.filter((entry) => entry.why.trim().length < MINIMUM_REASON),
    ).toEqual([])
  })
})

describe('the allowlist is checked in both directions, and for uniqueness', () => {
  const finding = (file: string, address: string): Reconcilable =>
    reconcilable({ file, address, verdict: 'resolves-to-nothing', line: 7 })
  const allow = (file: string, address: string) => idOf({ file, address })

  it('reports a finding no row covers, with its file, line and verdict', () => {
    expect(
      unlisted([finding('design/a/design-notes.md', '/gone')], []),
    ).toEqual(['design/a/design-notes.md:7 — /gone (resolves-to-nothing)'])
  })

  it('reports a row that matches nothing, so a corrected asset cannot keep its exemption', () => {
    expect(expired([], [allow('design/a/design-notes.md', '/gone')])).toEqual([
      'design/a/design-notes.md /gone',
    ])
  })

  it('scopes a row to ONE asset — the same address going stale elsewhere still fails', () => {
    const rows = [allow('design/a/design-notes.md', '/gone')]
    expect(
      unlisted([finding('design/a/design-notes.md', '/gone')], rows),
    ).toEqual([])
    expect(
      unlisted([finding('design/b/design-notes.md', '/gone')], rows),
    ).toEqual(['design/b/design-notes.md:7 — /gone (resolves-to-nothing)'])
  })

  it('names a pair listed twice — the axis the two tightness checks cannot see', () => {
    const id = allow('design/a/design-notes.md', '/gone')
    const findings = [finding('design/a/design-notes.md', '/gone')]
    expect(unlisted(findings, [id, id])).toEqual([])
    expect(expired(findings, [id, id])).toEqual([])
    expect(duplicated([id, id, id])).toEqual(['design/a/design-notes.md /gone'])
  })
})

// ── The address sweep, seen failing ─────────────────────────────────────────
//
// A guard that has only ever been green is not evidence. These run the real
// extractor and the real classifier over the shape of drift this repository
// inherits: the `/docs` surface arrived here from motir-core (MOTIR-3932), whose
// own assets carried the pre-Amendment-9 `/api-docs*` addresses and whose sign-up
// door is a motir-core route this host does not serve.
describe('the address sweep catches the drift it was written for', () => {
  const verdicts = (source: string, redirects?: string[][]) =>
    [
      ...new Set(
        addressesIn(source)
          .map(({ raw }) => toPageAddress(raw))
          .filter((address): address is string => address !== null)
          .map(
            (address) => `${address} ${classify(address, redirects) ?? 'ok'}`,
          ),
      ),
    ].sort()

  it('names an address this host does not serve, in a mock link and in prose', () => {
    expect(
      verdicts(
        [
          '<a class="navrow" href="/api-docs/getting-started">Getting started</a>',
          '| `/sign-up` | the door the landing sends a visitor through |',
          '<a href="/docs/api/getting-started">Getting started</a>',
        ].join('\n'),
      ),
    ).toEqual([
      '/api-docs/getting-started resolves-to-nothing',
      '/docs/api/getting-started ok',
      '/sign-up resolves-to-nothing',
    ])
  })

  it('resolves a concrete example against a dynamic segment, through a route group', () => {
    expect(
      verdicts(
        [
          '<a href="/p/MOTIR/items/MOTIR-3877">row</a>',
          '[the terms](/legal/terms)',
          '`/docs/mcp/tools`',
          '`/p/*`',
        ].join('\n'),
      ),
    ).toEqual([
      '/docs/mcp/tools ok',
      '/legal/terms ok',
      '/p/MOTIR/items/MOTIR-3877 ok',
      '/p/[*] ok',
    ])
  })

  it('reads a trailing `/*` as the family under a path, and still names a family that is gone', () => {
    // `design/public-projects/design-notes.md` writes `/p/*` for every project
    // page. Stripped to `/p` it read as a dead page on this guard's first run.
    expect(verdicts('`/p/*` and `/pages/*` and `/docs*`')).toEqual([
      '/docs ok',
      '/p/[*] ok',
      '/pages/[*] resolves-to-nothing',
    ])
  })

  it('reports a REDIRECT source as redirecting away, ahead of a route that also matches it', () => {
    // No redirect is declared today, so the arm is exercised on a declared one:
    // the day `next.config.ts` grows a `redirects()`, this is what it reads as.
    expect(
      verdicts('`/docs/old-guide` and `/docs/cli`', [
        ['docs', 'old-guide'],
        ['docs', 'cli'],
      ]),
    ).toEqual(['/docs/cli redirects-away', '/docs/old-guide redirects-away'])
  })

  it('skips a placeholder, a file, an API endpoint and a query string', () => {
    expect(
      verdicts(
        [
          '`/p/<identifier>/board`',
          '<a href="/p/&lt;identifier&gt;">x</a>',
          '<link rel="alternate" href="/p/MOTIR/changelog.xml">',
          '<form action="/api/public/p/MOTIR/subscribe">',
          '<a href="/p/MOTIR/items?cursor=abc">next</a>',
        ].join('\n'),
      ),
    ).toEqual(['/p/MOTIR/items ok'])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// The SOURCE-PATH sweep
// ════════════════════════════════════════════════════════════════════════════
//
// An asset names two kinds of thing. Its ADDRESSES are read by a human orienting
// themselves; its SOURCE PATHS are read by an agent about to write code — "the
// chrome is `app/_components/SiteShell.tsx`". A dead address confuses a reader;
// a dead source path sends an agent to open a file that does not exist, and what
// it does next is improvise the layout.
//
// ⚠️ A PATH INTO ANOTHER REPOSITORY IS NOT SWEPT, BY CONSTRUCTION. The assets
// here cite motir-core constantly (`motir-core/design/public-site/…`), because
// that is where much of this site's design lineage lives. A token is anchored
// only when it BEGINS at one of this repository's own top-level directories, so
// `motir-core/app/(authed)/…` never matches `app/` — this tree cannot say whether
// another tree's file exists, and an allowlist row per citation would be a
// table of things nobody here can check.
//
// (motir-core also sweeps the `theme.css` its mocks copy their token block
// from. That file ships to this repository from npm as `@motir/design-system`,
// outside this tree, so there is no mirrored source to add here.)

/** This repository's own top-level directories — the anchors a citation starts on. */
const SOURCE_ROOTS = readdirSync(ROOT, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      !entry.name.startsWith('.') &&
      entry.name !== 'node_modules',
  )
  .map((entry) => entry.name)
  .sort()

// A segment is a route group `(guides)`, a dynamic segment `[slug]`, or a plain
// name. The trailing capture is the character that ENDED the token — only a
// brace matters, and only as an exclusion below.
const PATH_SEGMENT = String.raw`(?:\([a-z][\w-]*\)|\[[^\]/\s]+\]|[\w.@+-]+)`
const PATH_TOKEN = new RegExp(
  String.raw`(?:^|[^\w./-])((?:${SOURCE_ROOTS.join('|')})(?:/${PATH_SEGMENT})+)([{]?)`,
  'g',
)

interface RawPath {
  raw: string
  brace: boolean
  line: number
}

/** Every path-shaped token in one asset's source, with its line number. */
export function pathsIn(source: string): RawPath[] {
  return [...source.matchAll(PATH_TOKEN)].map((match) => ({
    raw: match[1]!,
    brace: match[2] === '{',
    line: lineOf(source, match.index),
  }))
}

/** Reduce a raw match to the repo path it names, or `null` when it names a family. */
export function toRepoPath({ raw, brace }: RawPath): string | null {
  // (1) A brace expansion — `app/docs/{cli,mcp}` truncates to a stem that is
  //     neither of the files it means.
  if (brace) return null
  // (2) An elided path — `app/…/page.tsx`.
  if (raw.includes('…') || /(^|\/)\.\.\.(\/|$)/.test(raw)) return null
  // Sentence punctuation the token swallowed: "… in app/page.tsx."
  return raw.replace(/\.+$/, '') || null
}

// A citation often drops the extension — `lib/legal/documents` reads as an
// import specifier. Resolve it the way an editor's go-to-file would.
const CITED_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.md',
  '.mdx',
  '.mock.html',
  '.html',
  '.json',
  '.css',
  '.png',
  '.svg',
]

export function resolvesInRepo(path: string): boolean {
  if (existsSync(join(ROOT, path))) return true
  // MOTIR-7948 moved every page one segment down, under `app/[locale]/`. An
  // asset that cites `app/legal/[slug]/page.tsx` names the same file, so the
  // citation still resolves; rewriting every asset to the new spelling would
  // edit records (the delta-mock rule) for a move that changed no surface.
  if (path.startsWith('app/') && !path.startsWith(`app/${LOCALE_SEGMENT}/`))
    return resolvesInRepo(`app/${LOCALE_SEGMENT}/${path.slice('app/'.length)}`)
  if (/\.[a-z0-9]+$/i.test(path.split('/').pop()!)) return false
  return CITED_EXTENSIONS.some((extension) =>
    existsSync(join(ROOT, path + extension)),
  )
}

interface PathFinding {
  file: string
  path: string
  line: number
}

function sweepPaths(): PathFinding[] {
  const findings = new Map<string, PathFinding>()
  for (const file of assetSources()) {
    for (const rawPath of pathsIn(readFileSync(join(ROOT, file), 'utf8'))) {
      const path = toRepoPath(rawPath)
      if (path === null || resolvesInRepo(path)) continue
      const id = `${file} ${path}`
      if (!findings.has(id))
        findings.set(id, { file, path, line: rawPath.line })
    }
  }
  return [...findings.values()].sort((a, b) =>
    `${a.file} ${a.path}`.localeCompare(`${b.file} ${b.path}`),
  )
}

const pathIdOf = (x: { file: string; path: string }) => `${x.file} ${x.path}`

const reconcilablePath = (finding: PathFinding): Reconcilable => ({
  id: pathIdOf(finding),
  report: `${finding.file}:${finding.line} — ${finding.path} (does not exist)`,
})

// ── The judgement, in one table ─────────────────────────────────────────────
//
// Same contract as `KNOWN`: every pair the sweep finds today, with why it may
// stay, asserted TIGHT in both directions.
//
// This sweep's first run found twenty pairs. FIFTEEN were citations of
// motir-core files written without the repository — a bare `design/public-site/`
// or `lib/auth/index.ts` that a builder here would look for in this tree — and
// were CORRECTED in the assets by qualifying them `motir-core/…`. The pairs below
// are the ones that must stay exactly as written.
const KNOWN_PATHS: { file: string; path: string; why: string }[] = [
  // ── A path the asset says must NOT exist ─────────────────────────────────
  // Permanent, and inverted: the asset's instruction is that no card add this
  // file, because a per-segment `not-found.tsx` would split the site's one 404
  // room in two. If the file ever lands, the ASSET is wrong rather than the row.
  {
    file: 'design/legal/design-notes.md',
    path: 'app/legal/not-found.tsx',
    why: 'Cited to forbid it: "there is no `app/legal/not-found.tsx`" and "DO NOT ADD" it, so an unknown legal slug keeps landing in the site-wide room `app/not-found.tsx` draws. Its absence is the design.',
  },
  {
    file: 'design/legal/legal.mock.html',
    path: 'app/legal/not-found.tsx',
    why: 'The same prohibition, on the mock\'s 404 panel ("Do not add `app/legal/not-found.tsx`"). Its absence is the design, so this row is permanent.',
  },
  // ── A file a dated record names, retired since ───────────────────────────
  // The notes are a record of their moment: a section that says which file a
  // fix landed in stays true of that day after the file is gone.
  {
    file: 'design/marketing/design-notes.md',
    path: 'app/_components/Pillars.tsx',
    why: 'The MOTIR-3984 record (2026-08-30) names the pillars section as one of the two elements whose muted eyebrow moved to --el-text-secondary. The 2026-10 redesign retired the pillars section and deleted the file; the record stays true of the page it describes, so it is not rewritten.',
  },
  // ── A path inside a quoted COMMAND run in motir-core ─────────────────────
  // The notes record the exact `git` invocation that verified a claim, and its
  // pathspecs are relative to motir-core's root. Qualifying them would make the
  // recorded command one nobody ran and that would not run.
  {
    file: 'design/marketing/design-notes.md',
    path: 'app/(auth)',
    why: "A pathspec in the recorded motir-core command `git grep -n \"intent\" origin/main -- 'app/(auth)' 'lib/onboarding'`, which verified that `?intent` is read nowhere. Rewriting it would falsify the command.",
  },
  {
    file: 'design/marketing/design-notes.md',
    path: 'lib/onboarding',
    why: 'The second pathspec in the same recorded motir-core `git grep`, which verified that `?intent` is read nowhere. Rewriting it would falsify the command.',
  },
  {
    file: 'design/marketing/design-notes.md',
    path: 'scripts/upload-design-assets.mjs',
    why: 'A pathspec in the recorded motir-core `git ls-tree` that proves the file is GONE — MOTIR-3797 deleted it when the CI design publisher retired. The citation exists to record that absence.',
  },
]

describe('a design asset cites source paths that still exist', () => {
  it('finds no cited repo path that resolves to nothing', () => {
    expect(
      unlisted(sweepPaths().map(reconcilablePath), KNOWN_PATHS.map(pathIdOf)),
      'A design asset tells the next agent which shipped file to mirror; a path it names that ' +
        'does not exist sends that agent looking for nothing. Correct the asset, or add the pair ' +
        'to KNOWN_PATHS with a reason if the path is deliberate.',
    ).toEqual([])
  })

  it('carries no KNOWN_PATHS entry that has stopped applying', () => {
    expect(
      expired(sweepPaths().map(reconcilablePath), KNOWN_PATHS.map(pathIdOf)),
      'These KNOWN_PATHS entries no longer match anything — the asset was corrected or the file ' +
        'now exists. Delete them, so the pair is guarded again.',
    ).toEqual([])
  })

  it('lists each (asset, path) pair exactly once', () => {
    expect(duplicated(KNOWN_PATHS.map(pathIdOf))).toEqual([])
  })

  it('gives every KNOWN_PATHS entry a reason at least a sentence long', () => {
    expect(
      KNOWN_PATHS.filter((entry) => entry.why.trim().length < MINIMUM_REASON),
    ).toEqual([])
  })
})

// ── The source-path sweep, seen failing ─────────────────────────────────────
describe('the source-path sweep catches the drift it was written for', () => {
  const missing = (source: string) =>
    [
      ...new Set(
        pathsIn(source)
          .map(toRepoPath)
          .filter((path): path is string => path !== null)
          .filter((path) => !resolvesInRepo(path)),
      ),
    ].sort()

  it('names a citation of motir-core’s pre-move route directory, written without its repository', () => {
    // MOTIR-4103 moved `/legal` here from motir-core's `app/(public)/legal/`.
    // Cited bare, that directory reads as THIS repository's — and it is not.
    expect(
      missing(
        [
          '- the page shell mirrors `app/(public)/legal/[slug]/page.tsx`',
          '      /* ── chrome (mirrors app/(public)/legal/layout.tsx) ── */',
        ].join('\n'),
      ),
    ).toEqual([
      'app/(public)/legal/[slug]/page.tsx',
      'app/(public)/legal/layout.tsx',
    ])
  })

  it('passes the citations that exist, including an extension-less one', () => {
    expect(
      missing(
        'see `tests/design/inkContrast.test.ts` and `tests/design/inkContrastScan`, and app/legal/[slug]/page.tsx.',
      ),
    ).toEqual([])
  })

  it('does not sweep a path into ANOTHER repository', () => {
    expect(
      missing(
        'drawn from `motir-core/app/(authed)/_components/ProjectSwitcher.tsx` and motir-core/design/public-site/',
      ),
    ).toEqual([])
  })

  it('skips a brace expansion, an elision, and a slash in prose', () => {
    expect(
      missing(
        '`app/docs/{cli,mcp}/page.tsx`, `app/…/Nothing.tsx`, a `Card`/`Pill` split in green/mint',
      ),
    ).toEqual([])
  })
})
