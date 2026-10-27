import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { englishCopy } from '@/lib/copy'
import recorded from '@/tests/fixtures/price/plans.json'
import { explainerValues } from './forbiddenPhrases'

/*
 * THE EXPLAINER'S LITERAL GUARD (MOTIR-9693). "How the calculation works"
 * types no model name, plan price, pool size, top-up rate or lane factor: every
 * figure is read from the plan catalog when the page renders. This scans the
 * English `explainer` copy and every source file the page is built from.
 *
 * The figures to forbid are DERIVED from the recorded catalog answer the price
 * card and the reader are tested against, so the guard follows the data; the
 * 300,000-credit pool the story names is added by hand because it is the one
 * figure people quote. Model names are caught by shape. Lane factors are not in
 * any response (the engine applies them), so any decimal or multiplier other
 * than the range's own 1× and 2× is treated as one.
 */

const ROOT = process.cwd()
const PAGE_DIR = join(ROOT, 'app/[locale]/how-the-calculation-works')
const READER_DIR = join(ROOT, 'lib/explainer')

/** Every number the catalog answer carries: prices, pools, the top-up unit. */
function catalogFigures(): number[] {
  const out = new Set<number>([300_000])
  for (const plan of [...recorded.plans, ...recorded.largerPlans]) {
    out.add(plan.monthlyCredits)
    for (const price of Object.values(plan.priceUsdByCadence)) out.add(price)
  }
  out.add(recorded.topUp.unitCredits)
  out.add(recorded.topUp.unitAmountUsd)
  return [...out]
}

/** A figure as it might be typed: plain, grouped with `,` `.` `_` or a space. */
function spellings(n: number): string[] {
  const plain = String(n)
  const grouped = (sep: string) => plain.replace(/\B(?=(\d{3})+(?!\d))/g, sep)
  return [
    ...new Set([plain, grouped(','), grouped('.'), grouped('_'), grouped(' ')]),
  ]
}

/** A model id or family, by shape: `claude-…`, `gpt-4o`, Sonnet, Opus … */
const MODEL_NAME =
  /\b(?:claude|gpt|gemini|llama|mistral|mixtral|deepseek|qwen|grok|o[1-9])-[\w.]+|\b(?:sonnet|opus|haiku|fable)\b/i

/** A decimal, or a multiplier other than the range's 1× / 2× and the plan name Max ×2. */
const FACTOR = /\d+[.,]\d+|(?<![\w.])(?![12]×)\d+(?:[.,]\d+)?\s*[x×](?!\w)/

export interface LiteralHit {
  where: string
  literal: string
}

/** The literals a text carries. Pure, so the guard can be shown to fire. */
export function literalHits(where: string, text: string): LiteralHit[] {
  const hits: LiteralHit[] = []
  const bare = text.replace(/Max ×2/g, '')
  const model = MODEL_NAME.exec(bare)
  if (model) hits.push({ where, literal: model[0] })
  const factor = FACTOR.exec(bare)
  if (factor) hits.push({ where, literal: factor[0] })
  for (const n of catalogFigures()) {
    for (const s of spellings(n)) {
      const re = new RegExp(
        `(?<![\\w.,])${s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}(?![\\w]|[.,]\\d)`,
      )
      if (n >= 4 && re.test(bare)) hits.push({ where, literal: s })
    }
  }
  return hits
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? sourceFiles(path) : [path]
  })
}

/** Source text with the parts that are not page content taken out. */
function scannable(source: string): string {
  return (
    source
      // class names and Tailwind arbitrary values carry sizes, not figures
      .replace(/className=(?:"[^"]*"|\{`[^`]*`\}|'[^']*')/g, '')
      .replace(
        /'[^']*\b(?:px|py|gap|grid|text|max-w|h|w|pt|pl|lg|md|sm)-[^']*'/g,
        '',
      )
      // a duration constant (`…_MS = 5_000`) is a time, not a figure
      .replace(/_MS = [\d_]+/g, '')
      // section ids `s1`…`s10`, the count of sections and `padStart(2, '0')`
      .replace(/\bs\d+\b/g, '')
      .replace(/padStart\(\d+, '0'\)/g, '')
      // comments explain the rules in prose
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
  )
}

describe('the explainer literal guard', () => {
  it('finds no literal in the English explainer copy', () => {
    const hits = [...explainerValues(englishCopy.explainer)].flatMap(
      ([key, value]) => literalHits(`en:${key}`, value),
    )
    expect(hits).toEqual([])
  })

  it('finds no literal in the page and reader sources', () => {
    const files = [...sourceFiles(PAGE_DIR), ...sourceFiles(READER_DIR)]
    expect(files.length).toBeGreaterThan(5)
    const hits = files.flatMap((file) =>
      literalHits(
        file.slice(ROOT.length + 1),
        scannable(readFileSync(file, 'utf8')),
      ),
    )
    expect(hits).toEqual([])
  })

  describe('fires on what it guards', () => {
    const [host] = recorded.plans.filter((p) => p.key === 'host')
    it.each([
      ['a model id', 'Planning runs on claude-sonnet-5-5.'],
      ['a model family', 'Planning uses Opus.'],
      ['a plan price', `Host costs ${host.priceUsdByCadence.monthly} a month.`],
      ['a pool size', `Host has ${host.monthlyCredits} credits.`],
      ['the 300,000 pool, grouped', 'Larger plans start at 300,000 credits.'],
      [
        'the top-up rate',
        `A top-up costs ${recorded.topUp.unitAmountUsd} for ${recorded.topUp.unitCredits} credits.`,
      ],
      ['a lane factor as a decimal', 'Running carries a 0.6 factor.'],
      ['a lane factor as a multiplier', 'Running is weighted 3×.'],
    ])('%s', (_, text) => {
      expect(literalHits('planted', text)).not.toEqual([])
    })

    it('but not the range, the split or Max ×2', () => {
      expect(
        literalHits(
          'ok',
          'low · 1×, high · 2×; split 50/50 or 33/33/33; Max ×2; Account 3; enter zero runs.',
        ),
      ).toEqual([])
    })
  })
})
