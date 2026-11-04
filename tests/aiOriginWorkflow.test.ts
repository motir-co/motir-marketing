import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * MOTIR-10276: the build's motir-ai origin is a repository variable with
 * today's value as its default, so the AWS cutover can move /price to
 * ai.motir.co after go with one variable and one release, and merging the
 * change alters no build. Read as text: this repository has no YAML parser,
 * and a workflow is neither type-checked nor linted here.
 */
const ci = readFileSync(
  path.join(process.cwd(), '.github/workflows/ci.yml'),
  'utf8',
)
const TODAY = 'https://motir-ai.fly.dev'

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

describe('NEXT_PUBLIC_MOTIR_AI_ORIGIN in ci.yml (MOTIR-10276)', () => {
  const value = workflowEnv('NEXT_PUBLIC_MOTIR_AI_ORIGIN')

  it('reads the MOTIR_AI_ORIGIN repository variable at workflow level', () => {
    expect(value).toBe(`\${{ vars.MOTIR_AI_ORIGIN || '${TODAY}' }}`)
  })

  it("builds exactly today's value while the variable is unset", () => {
    expect(resolve(value!, '')).toBe(TODAY)
  })

  it('builds the variable once a person sets it', () => {
    expect(resolve(value!, 'https://ai.motir.co')).toBe('https://ai.motir.co')
  })

  it('is set nowhere else in the workflow, so the release reads the same value', () => {
    expect(ci.match(/NEXT_PUBLIC_MOTIR_AI_ORIGIN:/g)).toHaveLength(1)
  })
})
