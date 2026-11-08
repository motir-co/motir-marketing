// @vitest-environment node
import { globSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import config from '../vitest.config.mts'

/*
 * A FLOOR OVER AN EMPTY MATCH MEASURES NOTHING (MOTIR-7967, after MOTIR-4120).
 *
 * `coverage.include` is an opt-in list and each `thresholds` key a glob. An
 * entry that matches no file is green forever, which is how five route files
 * once shipped under no floor at all. So every entry must match a file at
 * HEAD, and none may name a path from before the routes moved under
 * `app/[locale]` (MOTIR-7948).
 */

const coverage = config.test?.coverage as {
  include: string[]
  exclude: string[]
  thresholds: Record<string, unknown>
}
const matches = (pattern: string) =>
  globSync(pattern, { exclude: ['node_modules/**'] })

describe('the coverage config', () => {
  it('lists the story’s modules', () => {
    expect(coverage.include).toEqual(
      expect.arrayContaining([
        'i18n/*.ts',
        'lib/copy.ts',
        'scripts/i18n/*.ts',
        'lib/metadata.ts',
      ]),
    )
  })

  it.each([
    ['include', () => coverage.include],
    ['thresholds', () => Object.keys(coverage.thresholds)],
  ] as const)('every %s entry matches a file', (_name, entries) => {
    for (const pattern of entries())
      expect(matches(pattern), pattern).not.toEqual([])
  })

  it('names no path from before the locale move', () => {
    const entries = [
      ...coverage.include,
      ...coverage.exclude,
      ...Object.keys(coverage.thresholds),
    ]
    for (const entry of entries)
      expect(entry, entry).not.toMatch(/^app\/(p|ideas)\//)
  })
})
