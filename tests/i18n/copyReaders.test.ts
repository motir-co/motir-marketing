import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLIENT_COPY_NAMESPACES } from '@/lib/copy'

/*
 * WHO READS ENGLISH ON PURPOSE (MOTIR-7950).
 *
 * Every component reads the page's catalogue — `useCopy()` or
 * `getCopy(locale)` — so `/ja/` shows Japanese wherever a translation exists.
 * `englishCopy` is the English object itself, and a module that imports it
 * renders English on every locale whatever the catalogue says. That is right
 * for exactly the modules below, each localised by a named later card, and it
 * is a regression anywhere else — one that looks fine in English, which is the
 * only language anybody checks by eye.
 *
 * ⚠️ THE LIST IS WRITTEN HERE, NOT DERIVED, so adding a module to it is a
 * decision a reviewer sees in the diff. A card that localises one of these
 * removes its line; the second test fails if a line outlives its import.
 */
const ENGLISH_ON_PURPOSE: Record<string, string> = {
  // MOTIR-7956 localised every page's metadata, the JSON-LD and the sitemap,
  // and MOTIR-7972 the share image. The last module on the list, the global
  // `app/not-found.tsx`, left with Next (MOTIR-10643): every locale's 404 is
  // now built from `app/[locale]/not-found.tsx`, English's included.
}

const ROOT = process.cwd()

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return sources(path)
      return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
    },
  )
}

/** The names a module imports from the catalogue module, by any path. */
function catalogueImports(file: string): string[] {
  const text = readFileSync(join(ROOT, file), 'utf8')
  const names: string[] = []
  const pattern =
    /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"](?:@\/lib\/copy|(?:\.\.?\/)+(?:lib\/)?copy)['"]/g
  for (const match of text.matchAll(pattern)) {
    for (const part of match[1]!.split(',')) {
      const name = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
      if (name) names.push(name)
    }
  }
  return names
}

const FILES = [...sources('app'), ...sources('lib')]
  .map((file) => relative(ROOT, join(ROOT, file)))
  .sort()

describe('catalogue readers', () => {
  it('no module imports the retired `copy` constant', () => {
    const offenders = FILES.filter((file) =>
      catalogueImports(file).includes('copy'),
    )
    expect(offenders).toEqual([])
  })

  it('reads English directly only where the list says why', () => {
    const importers = FILES.filter((file) =>
      catalogueImports(file).includes('englishCopy'),
    )
    expect(importers).toEqual(Object.keys(ENGLISH_ON_PURPOSE).sort())
  })

  it('has found the readers, so the two checks above measure something', () => {
    const readers = FILES.filter((file) =>
      catalogueImports(file).some((name) =>
        ['useCopy', 'getCopy'].includes(name),
      ),
    )
    expect(readers.length).toBeGreaterThan(50)
  })

  it('sends the browser every namespace a client module reads', () => {
    // A `'use client'` module reads the catalogue the provider sent, and the
    // locale layout sends only `CLIENT_COPY_NAMESPACES`. A namespace missing
    // from that list is `undefined` in the browser — a crash on hydration.
    // Read by text: `copy.<ns>` / `useCopy().<ns>`, plus the two helpers that
    // take a whole catalogue and read one namespace of it.
    const HELPERS: Record<string, string> = {
      productGroupsFor: 'nav',
      productItemsFor: 'nav',
      productOf: 'nav',
      docsSurfacesFor: 'docs',
      docsIndexFor: 'docs',
    }
    const read = new Set<string>()
    const clients = FILES.filter((file) => {
      const text = readFileSync(join(ROOT, file), 'utf8')
      return /^['"]use client['"]/.test(text.trim())
    })
    for (const file of clients) {
      // Comments name `tests/copy.test.ts` and the like; only code reads.
      const text = readFileSync(join(ROOT, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      if (!catalogueImports(file).includes('useCopy')) continue
      for (const [, ns] of text.matchAll(/(?:useCopy\(\)|\bcopy)\.(\w+)/g)) {
        read.add(ns!)
      }
      for (const [helper, ns] of Object.entries(HELPERS)) {
        if (new RegExp(`\\b${helper}\\(copy`).test(text)) read.add(ns)
      }
    }
    expect(read.size).toBeGreaterThan(0)
    const sent = new Set<string>(CLIENT_COPY_NAMESPACES)
    expect([...read].filter((ns) => !sent.has(ns)).sort()).toEqual([])
  })
})
