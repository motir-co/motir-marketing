// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import heldOut from '../held-out.json' with { type: 'json' }
import config from '../vitest.config.mts'

/*
 * THE HELD-OUT LIST IS ONE LIST (MOTIR-10643).
 *
 * `held-out.json` names the Next source a later card ports and the tests whose
 * subject it is. `vitest.config.mts` and `eslint.config.mjs` read it; JSON
 * with comments cannot import, so `tsconfig.json` carries a copy, and this is
 * what keeps the copy honest. A card that ports its pages deletes its group
 * here and its lines there in the same change.
 */

const tsconfig = JSON.parse(readFileSync('tsconfig.json', 'utf8')) as {
  exclude: string[]
}
const groups = heldOut.groups
const held = groups.flatMap((group) => [...group.sources, ...group.tests])

describe('the held-out list', () => {
  it('is what tsconfig.json excludes, beside the build output', () => {
    expect([...tsconfig.exclude].sort()).toEqual(
      ['node_modules', 'dist', ...held].sort(),
    )
  })

  it('takes every held test out of the unit suite', () => {
    const exclude = config.test?.exclude ?? []
    for (const group of groups)
      for (const test of group.tests) expect(exclude).toContain(test)
  })

  it('names only paths that exist, each once, each with the card that re-includes it', () => {
    expect(new Set(held).size).toBe(held.length)
    for (const path of held) expect(existsSync(path), path).toBe(true)
    for (const group of groups) {
      expect(group.owner).toMatch(/^MOTIR-\d+$/)
      expect(group.why.length).toBeGreaterThan(20)
    }
  })

  it('keeps proxy.ts and its tests out of lint too, and nothing else', () => {
    const unlinted = groups.filter((group) => !group.lint)
    expect(unlinted).toHaveLength(1)
    expect(unlinted[0]!.sources).toContain('proxy.ts')
    for (const test of unlinted[0]!.tests)
      expect(readFileSync(test, 'utf8')).toMatch(/@\/proxy'/)
  })

  it('holds every test that imports @/proxy in that group', () => {
    const proxyTests = groups.find((group) => !group.lint)!.tests
    for (const group of groups.filter((g) => g.lint))
      for (const test of group.tests)
        expect(readFileSync(test, 'utf8'), test).not.toMatch(/from '@\/proxy'/)
    expect(proxyTests.length).toBeGreaterThan(0)
  })
})
