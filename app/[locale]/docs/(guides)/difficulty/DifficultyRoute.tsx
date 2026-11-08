import { localePageMetadata } from '@/lib/localeMetadata'
import type { Metadata } from '@/lib/metadata'

import { getCopy } from '@/lib/copy'
import { enterLocale, type LocalePageProps } from '@/i18n/locale'
import { guideDate } from '@/lib/docsGuideValues'
import { DocsDocument } from '../../_components/DocsDocument'

/*
 * The DIFFICULTY guide — what each of a leaf's four difficulty levels means,
 * and which models we suggest running each level on, with what a task costs.
 *
 * ⚠️ THIS PAGE CARRIES NUMBERS THAT LIVE ELSEWHERE, deliberately and dated.
 * The Sentry guide's rule is "no numbers that live elsewhere"; a model guide
 * cannot follow it, because the price and the measured score ARE the advice.
 * So every number is pinned to its source and date in `AS_OF` and `SOURCES`,
 * and the page says so to the reader. When the gateway catalog or the
 * leaderboards move, this file is re-read and re-dated — never half-edited.
 *
 * Sources for the numbers:
 * - token prices: motir-gateway `motir/catalog/upstream-prices.json` (the
 *   OpenRouter snapshot of 2026-09-21); Claude Opus 5.5 is not in that snapshot
 *   yet and is read from OpenRouter's live list on 2026-09-23 ($4 / $20).
 * - scores: SWE-bench Pro (BenchLM, 2026-09-22) and SWE-rebench (fresh GitHub
 *   tasks, 2026-05-15 → 2026-07-01), whose per-problem cost is the measured
 *   cost per task below. A cost marked "≈" is NOT measured: it scales a
 *   measured sibling by the token price, and says which.
 *
 * ⚠️ THE LEVEL NAMES ARE motir-core's: `trivial · low · medium · high`
 * (`lib/issues/difficulty.ts`). Motir states a leaf's difficulty in the
 * dispatch prompt; it does NOT pick the model — the reader does, and the page
 * says that rather than implying a router that has not shipped.
 *
 * THE PROSE LIVES IN `content/docs/difficulty/<locale>.md` (MOTIR-8036). This
 * file keeps the NUMBERS: every candidate cell is a number, a symbol or a model
 * name, so no cell holds an English word. The two words a cost basis needs
 * ("by price", "same price") and the column headers are catalogue copy
 * (`docs.guideLabels.*`). Each level's range, and the date the numbers were
 * read, reach the document as values; the date is formatted per locale.
 */

export function generateMetadata({
  params,
}: LocalePageProps): Promise<Metadata> {
  return localePageMetadata(params, '/docs/difficulty', (copy) => ({
    title: copy.docs.metaTitleDifficulty,
    description: copy.docs.metaDescriptionDifficulty,
  }))
}

/** The day the prices and scores below were read (ISO; the page formats it per locale). */
const AS_OF = '2026-09-23'

/** Which relation a not-measured cost has to the measured model it scales. */
type CostBasis = { model: string; by: 'price' | 'samePrice' }

type Candidate = {
  model: string
  price: string
  sweBenchPro: string
  sweRebench: string
  /** A number, `≈ ` and a number, or `—`. */
  costPerTask: string
  costBasis?: CostBasis
}

type Level = {
  level: 'trivial' | 'low' | 'medium' | 'high'
  /** The range only; "about" and "and up" are the document's words. */
  costRange: string
  candidates: Candidate[]
}

const LEVELS: Level[] = [
  {
    level: 'trivial',
    costRange: '$0.05–0.15',
    candidates: [
      {
        model: 'DeepSeek V4 Pro',
        price: '$0.435 / $0.87',
        sweBenchPro: '55.4',
        sweRebench: '40.2',
        costPerTask: '$0.15',
      },
      {
        model: 'GPT-5.6 Luna',
        price: '$0.20 / $1.20',
        sweBenchPro: '62.7',
        sweRebench: '43.6',
        costPerTask: '$0.11',
      },
      {
        model: 'DeepSeek V4 Flash',
        price: '$0.14 / $0.28',
        sweBenchPro: '52.6',
        sweRebench: '—',
        costPerTask: '≈ $0.05',
        costBasis: { model: 'V4 Pro', by: 'price' },
      },
    ],
  },
  {
    level: 'low',
    costRange: '$0.85–1.45',
    candidates: [
      {
        model: 'GPT-5.6 Sol',
        price: '$2 / $10',
        sweBenchPro: '64.6',
        sweRebench: '62.3',
        costPerTask: '$0.85',
      },
      {
        model: 'GLM-5.2',
        price: '$0.65 / $2.04',
        sweBenchPro: '62.1',
        sweRebench: '62.9',
        costPerTask: '$1.40',
      },
      {
        model: 'Claude Sonnet 5',
        price: '$2 / $10',
        sweBenchPro: '63.2',
        sweRebench: '56.8',
        costPerTask: '$1.43',
      },
    ],
  },
  {
    level: 'medium',
    costRange: '$2.80–3.50',
    candidates: [
      {
        model: 'Claude Opus 5.5',
        price: '$4 / $20',
        sweBenchPro: '89.9',
        sweRebench: '—',
        costPerTask: '≈ $2.80',
        costBasis: { model: 'Opus 5', by: 'price' },
      },
      {
        model: 'Claude Opus 5',
        price: '$5 / $25',
        sweBenchPro: '79.2',
        sweRebench: '63.4',
        costPerTask: '$3.47',
      },
    ],
  },
  {
    level: 'high',
    costRange: '$4.40',
    candidates: [
      {
        model: 'Claude Fable 5.1',
        price: '$10 / $50',
        sweBenchPro: '81.2',
        sweRebench: '—',
        costPerTask: '≈ $4.40',
        costBasis: { model: 'Fable 5', by: 'samePrice' },
      },
      {
        model: 'GPT-6 Astra',
        price: '$10 / $50',
        sweBenchPro: '—',
        sweRebench: '—',
        costPerTask: '—',
      },
    ],
  },
]

const cellClass = 'border-b border-(--el-border) py-2'

export default async function DifficultyDocsPage({ params }: LocalePageProps) {
  const locale = await enterLocale(params)
  const copy = await getCopy(locale)
  const labels = copy.docs.guideLabels
  const basis = {
    price: labels.costBasisPrice,
    samePrice: labels.costBasisSamePrice,
  }

  const slots = Object.fromEntries(
    LEVELS.map((level) => [
      level.level,
      <div key={level.level} className="overflow-x-auto">
        <table className="mt-2 w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="text-[13px] text-(--el-text-secondary)">
              <th className={`${cellClass} pr-4 font-medium`}>
                {labels.candidateModel}
              </th>
              <th className={`${cellClass} pr-4 font-medium`}>
                {labels.candidatePrice}
              </th>
              <th className={`${cellClass} pr-4 font-medium`}>SWE-bench Pro</th>
              <th className={`${cellClass} pr-4 font-medium`}>SWE-rebench</th>
              <th className={`${cellClass} font-medium`}>
                {labels.candidateCost}
              </th>
            </tr>
          </thead>
          <tbody>
            {level.candidates.map((c) => (
              <tr key={c.model} className="align-top">
                <td className={`${cellClass} pr-4 whitespace-nowrap`}>
                  {c.model}
                </td>
                <td className={`${cellClass} pr-4 whitespace-nowrap`}>
                  {c.price}
                </td>
                <td className={`${cellClass} pr-4 whitespace-nowrap`}>
                  {c.sweBenchPro}
                </td>
                <td className={`${cellClass} pr-4 whitespace-nowrap`}>
                  {c.sweRebench}
                </td>
                <td className={`${cellClass} text-(--el-text-secondary)`}>
                  {c.costBasis
                    ? `${c.costPerTask} (${c.costBasis.model}, ${basis[c.costBasis.by]})`
                    : c.costPerTask}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    ]),
  )

  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-[30px] leading-[1.2] font-bold tracking-[-0.01em] text-(--el-text)">
        {copy.docs.difficulty}
      </h1>
      <DocsDocument
        slug="difficulty"
        locale={locale}
        slots={slots}
        values={{
          costRangeTrivial: LEVELS[0]!.costRange,
          costRangeLow: LEVELS[1]!.costRange,
          costRangeMedium: LEVELS[2]!.costRange,
          costRangeHigh: LEVELS[3]!.costRange,
          asOf: guideDate(locale, AS_OF),
        }}
      />
    </>
  )
}
