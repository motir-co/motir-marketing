// @vitest-environment node
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { scanFile, type CopyFinding } from '@/tests/helpers/scanJsxCopy'

/*
 * NO HARD-CODED COPY ON A COVERED PAGE (MOTIR-7970).
 *
 * Every word of Motir's own on motir.co's pages renders from
 * `messages/en.json`, so a translated catalogue reaches it. A literal written
 * straight into JSX is English on `/ja/` forever, and nothing about the page
 * would say so. This guard makes it say so: it walks every `.tsx` under `app/`
 * and fails on a JSX text child or a copy attribute holding words
 * (`tests/helpers/scanJsxCopy.ts` holds the predicate).
 *
 * ⚠️ COVERED BY DEFAULT. The walk starts from every file and REMOVES the ones
 * listed below, each with its owner. A page added tomorrow is covered without
 * anybody remembering to list it.
 *
 * Three lists, each asserted tight in the last block: an entry that stops
 * matching anything fails the suite, so none can outlive its reason.
 */

const APP = join(process.cwd(), 'app')

/**
 * Prose owned by another card, out of this guard's reach by decision. A path
 * ending in `/` is a directory prefix.
 */
const EXCLUDED: readonly { path: string; owner: string }[] = [
  {
    path: 'app/[locale]/docs/(guides)/',
    owner:
      'authored docs prose — motir.co /docs in eleven languages (MOTIR-7739)',
  },
  {
    path: 'app/[locale]/docs/api/',
    owner:
      'authored API reference prose — motir.co /docs in eleven languages (MOTIR-7739)',
  },
  {
    path: 'app/[locale]/opengraph-image.tsx',
    owner:
      'the share image’s wordmark, drawn with satori — every word of it is read through getCopy (MOTIR-7972)',
  },
  {
    path: 'app/[locale]/p/[identifier]/opengraph-image.tsx',
    owner:
      'a project’s share image, drawn with satori — Crawl data per language (MOTIR-7956)',
  },
]

/**
 * Paths not yet swept, each with the card that owns the sweep. EMPTY since
 * MOTIR-7954 swept the public-project tree, `/w` and `/host-unavailable`, and
 * asserted empty below: a new entry is a decision to park copy, made in a diff.
 */
const NOT_YET_SWEPT: readonly { path: string; owner: string }[] = []

/**
 * Literals that are copy-shaped and are not copy. The only admissible reasons
 * are a proper noun no locale translates, code shown as code, or a key cap.
 */
const ALLOWED: readonly { path: string; literal: string; reason: string }[] = [
  {
    path: 'app/[locale]/motir-builds-itself/_components/StoryArt.tsx',
    literal: 'checkout.ts:42 TypeError',
    reason: 'a stack-trace line drawn as code',
  },
  {
    path: 'app/[locale]/motir-builds-itself/_components/StoryArt.tsx',
    literal: '.test',
    reason: 'a test file extension drawn as code (`sign-in.test`)',
  },
  {
    path: 'app/[locale]/ideas/_components/IdeaDetail.tsx',
    literal: 'Esc',
    reason:
      'the key cap printed on the keyboard, inside a <kbd>; the sentence around it is ideas.detail.foot',
  },
]

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return tsxFiles(full)
    return entry.name.endsWith('.tsx') ? [full] : []
  })
}

/** `app/...` with forward slashes, whatever the platform. */
const ALL = tsxFiles(APP)
  .map((file) => relative(process.cwd(), file).split(sep).join('/'))
  .sort()

const matches = (file: string, path: string) =>
  path.endsWith('/') ? file.startsWith(path) : file === path

const COVERED = ALL.filter(
  (file) =>
    ![...EXCLUDED, ...NOT_YET_SWEPT].some(({ path }) => matches(file, path)),
)

const FINDINGS: CopyFinding[] = COVERED.flatMap((file) => scanFile(file))

const isAllowed = (finding: CopyFinding) =>
  ALLOWED.some(
    ({ path, literal }) => path === finding.file && literal === finding.literal,
  )

describe('the covered pages hold no hard-coded copy', () => {
  it('walks the route tree at all', () => {
    // A walk that found nothing would pass the next assertion vacuously.
    expect(COVERED.length).toBeGreaterThanOrEqual(60)
    expect(COVERED).toContain('app/_components/NotFoundRoom.tsx')
    expect(COVERED).toContain('app/[locale]/docs/_components/DocsRail.tsx')
    expect(COVERED).toContain('app/[locale]/p/[identifier]/page.tsx')
    expect(COVERED).toContain('app/[locale]/no-application/page.tsx')
  })

  it('finds no literal outside the catalogue', () => {
    const offenders = FINDINGS.filter((finding) => !isAllowed(finding)).map(
      ({ file, line, where, literal }) =>
        `${file}:${line} [${where}] ${literal}`,
    )
    expect(offenders).toEqual([])
  })
})

describe('every list entry still describes the tree', () => {
  it('each EXCLUDED and NOT_YET_SWEPT path matches a file', () => {
    for (const { path } of [...EXCLUDED, ...NOT_YET_SWEPT]) {
      expect(
        ALL.some((file) => matches(file, path)),
        path,
      ).toBe(true)
    }
  })

  it('NOT_YET_SWEPT is empty — every covered page is swept', () => {
    expect(NOT_YET_SWEPT).toEqual([])
  })

  it('each ALLOWED literal is still found, and carries a reason', () => {
    for (const entry of ALLOWED) {
      expect(entry.reason.length, entry.literal).toBeGreaterThan(10)
      expect(
        FINDINGS.some(
          (finding) =>
            finding.file === entry.path && finding.literal === entry.literal,
        ),
        `${entry.path}: ${entry.literal}`,
      ).toBe(true)
    }
  })
})

describe('the scanner flags copy and nothing else', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scan-jsx-copy-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  function scan(source: string): string[] {
    const file = join(dir, `fixture-${Math.random().toString(36).slice(2)}.tsx`)
    writeFileSync(file, source)
    return scanFile(file).map(({ where, literal }) => `${where}: ${literal}`)
  }

  it('flags a text child, a title prop, aria-label and a bare template placeholder', () => {
    expect(scan('const a = <p>Nothing here</p>')).toEqual([
      'text: Nothing here',
    ])
    expect(scan('const a = <EmptyState title="No results" />')).toEqual([
      'title: No results',
    ])
    expect(scan('const a = <button aria-label="Close" />')).toEqual([
      'aria-label: Close',
    ])
    expect(scan('const a = <input placeholder={`Search ideas`} />')).toEqual([
      'placeholder: Search ideas',
    ])
    expect(scan('const a = <Field errorMessage="Required" />')).toEqual([
      'errorMessage: Required',
    ])
  })

  it('does not flag class names, hrefs, catalogue reads or a lone glyph', () => {
    expect(scan('const a = <p className="text-sm">{copy.x}</p>')).toEqual([])
    expect(scan('const a = <a href="/docs" rel="noopener" />')).toEqual([])
    expect(scan('const a = <span>↗</span>')).toEqual([])
    expect(scan('const a = <span> · </span>')).toEqual([])
    expect(scan('const a = <span>&gt;</span>')).toEqual([])
    expect(scan('const a = <input placeholder={`${copy.find} …`} />')).toEqual(
      [],
    )
  })
})
