import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * MOTIR-10276: the build's motir-ai origin (renamed from its Next spelling to
 * Astro's `PUBLIC_` prefix by MOTIR-10637) is a repository variable with a
 * default, so a release can be pointed elsewhere with one variable. Since
 * MOTIR-10938 the default is the Motir-owned origin, ai.motir.co. Read as
 * text: this repository has no YAML parser, and a workflow is neither
 * type-checked nor linted here.
 */
const ci = readFileSync(
  path.join(process.cwd(), '.github/workflows/ci.yml'),
  'utf8',
)
const DEFAULT = 'https://ai.motir.co'
/** Any value other than the default, so the override case proves the variable wins. */
const OVERRIDE = 'https://ai.preview.motir.co'

/** The value of a top-level `env:` key, as written. */
function workflowEnv(name: string): string | null {
  const head = ci.split(/^jobs:\s*$/m)[0] ?? ''
  const m = new RegExp(`^ {2}${name}:\\s*(.+)$`, 'm').exec(head)
  return m ? m[1]!.trim() : null
}

/** GitHub's `a || 'b'` over an unset variable (which reads as ''). */
function resolve(expression: string, variable: string): string {
  const m = /^\$\{\{\s*vars\.MOTIR_AI_ORIGIN\s*\|\|\s*'([^']*)'\s*\}\}$/.exec(
    expression,
  )
  if (!m) throw new Error(`unexpected expression: ${expression}`)
  return variable !== '' ? variable : m[1]!
}

describe('PUBLIC_MOTIR_AI_ORIGIN in ci.yml (MOTIR-10276)', () => {
  const value = workflowEnv('PUBLIC_MOTIR_AI_ORIGIN')

  it('reads the MOTIR_AI_ORIGIN repository variable at workflow level', () => {
    expect(value).toBe(`\${{ vars.MOTIR_AI_ORIGIN || '${DEFAULT}' }}`)
  })

  it('builds the Motir-owned origin while the variable is unset', () => {
    expect(resolve(value!, '')).toBe(DEFAULT)
  })

  it('builds the variable once a person sets it', () => {
    expect(OVERRIDE).not.toBe(DEFAULT)
    expect(resolve(value!, OVERRIDE)).toBe(OVERRIDE)
  })

  it('is set nowhere else in the workflow, so the release reads the same value', () => {
    expect(ci.match(/(?<![A-Z_])PUBLIC_MOTIR_AI_ORIGIN:/g)).toHaveLength(1)
  })
})
