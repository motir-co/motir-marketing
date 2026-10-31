import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * THE SHARED CALCULATOR RECORD IS ONE RECORD (MOTIR-10156).
 *
 * The /price parity test (`tests/price/priceIntegration.test.tsx`) and the
 * billing tab's test in motir-core (`tests/components/CalculatorAnswer.test.tsx`)
 * compare the two surfaces on ONE recorded engine exchange — motir-core's
 * pinned cross-surface vector, which this repository carries byte for byte as
 * `tests/fixtures/calculator/pinned-vector.json`. Two copies of a record are two
 * records the moment either is re-recorded alone, and each suite would then go
 * on passing against its own. This is the check that they are still one.
 *
 * It reads motir-core's copy from its default branch (the repository is public),
 * so it lives in the live seam lane with the subprocessor seam: never on a pull
 * request, where a GitHub outage would turn an unrelated change red.
 *
 * When it fails: re-record in motir-core
 * (`node scripts/record-calculator-pinned-vector.mjs`), then copy that file over
 * this one unchanged.
 */

const CORE_RECORD_URL =
  'https://raw.githubusercontent.com/motir-co/motir-core/main/tests/fixtures/calculatorPinnedVector.json'

const LOCAL_RECORD = join(
  process.cwd(),
  'tests',
  'fixtures',
  'calculator',
  'pinned-vector.json',
)

async function fetchCoreRecord(attempts = 3): Promise<string> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(CORE_RECORD_URL, { cache: 'no-store' })
      if (res.ok) return await res.text()
      last = new Error(`${CORE_RECORD_URL} answered ${res.status}`)
    } catch (error) {
      last = error
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000))
  }
  throw last
}

describe('the pinned calculator vector against motir-core’s', () => {
  it('is byte-identical', async () => {
    const core = await fetchCoreRecord()
    const local = readFileSync(LOCAL_RECORD, 'utf8')
    if (core !== local) {
      console.error(
        `\nThe /price parity record differs from motir-core's (${CORE_RECORD_URL}).` +
          '\nCopy motir-core tests/fixtures/calculatorPinnedVector.json over' +
          ' tests/fixtures/calculator/pinned-vector.json, unchanged.\n',
      )
    }
    expect(local).toBe(core)
  })
})
