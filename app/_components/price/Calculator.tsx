'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  ErrorState,
  Input,
  Segmented,
  Spinner,
} from '@motir/design-system'
import { LOCALE_BCP47 } from '@/i18n/routing'
import { format, useCopy, usePageLocale } from '@/lib/copy'
import type { Cadence } from '@/lib/priceLadder'
import {
  fetchCategories,
  MAX_CATEGORIES,
  requestEstimate,
  type CategoriesAnswer,
  type CategoriesResult,
  type Estimate,
  type Range as Parsed,
} from './calculatorApi'
import { CalculatorOutput, categoryLabel } from './calculatorOutput'
import {
  dragShare,
  evenShares,
  maxShare,
  MIN_SHARE,
  SHARES_TOTAL,
} from './calculatorShares'
import { exampleModels } from './modelExamples'

/*
 * THE CALCULATOR ISLAND (MOTIR-8382 · MOTIR-9685; design/price/price.mock.html
 * panels 5–13). The page's ONE client component that makes a request: it reads
 * the engine's categories on mount and asks for an estimate on submit, both from
 * the browser through `calculatorApi.ts`, and renders what comes back. It
 * computes nothing — the split, credits, plan and top-up are the answer's.
 *
 * Words are app.motir.co's billing Calculator copy (`pricePage.calculator.*`);
 * the behaviour mirrors motir-core's `CalculatorView`: two ranges where the run
 * range follows the planned one until it is typed into, one picker of one to
 * three categories, a share slider per category once two or more are picked
 * (MOTIR-9834, design/price/price--calculator-shares.mock.html), and a sequence
 * stamp so an older answer never lands under newer inputs.
 */

type RangeIssue = 'rangeEmpty' | 'rangeInvalid' | 'rangeOrder'
type FormIssue = RangeIssue | 'rangeBothZero'
type CategoryIssue = 'categoryMissing' | 'tooManyCategories'
type Lane = 'planned' | 'run'
type RangeText = { low: string; high: string }

type CategoriesState =
  | { kind: 'loading' }
  | { kind: 'ready'; value: CategoriesAnswer }
  | { kind: 'failed' }

type ResultState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'estimate'; value: Estimate }
  | { kind: 'empty'; categories: string[] }
  | { kind: 'unavailable' }

/** A category names a few of its models as examples, never the whole list. */
export const CATEGORY_MODEL_EXAMPLES = 3

function parseCount(text: string): number | 'empty' | 'invalid' {
  const trimmed = text.trim()
  if (trimmed === '') return 'empty'
  if (!/^\d+$/.test(trimmed)) return 'invalid'
  const n = Number(trimmed)
  return Number.isSafeInteger(n) ? n : 'invalid'
}

function sharesFor(
  picked: string[],
  chosen: Record<string, number>,
): Record<string, number> {
  const covers =
    Object.keys(chosen).length === picked.length &&
    picked.reduce((sum, key) => sum + (chosen[key] ?? Number.NaN), 0) ===
      SHARES_TOTAL
  if (covers) return chosen
  const even = evenShares(picked.length)
  return Object.fromEntries(picked.map((key, i) => [key, even[i]!]))
}

function parseRange(range: RangeText): Parsed | RangeIssue {
  const lo = parseCount(range.low)
  const hi = parseCount(range.high)
  if (lo === 'empty' || hi === 'empty') return 'rangeEmpty'
  if (lo === 'invalid' || hi === 'invalid') return 'rangeInvalid'
  return lo > hi ? 'rangeOrder' : { low: lo, high: hi }
}

export function Calculator() {
  const page = useCopy().pricePage
  const words = page.calculator
  const locale = LOCALE_BCP47[usePageLocale()]
  const [categories, setCategories] = useState<CategoriesState>({
    kind: 'loading',
  })
  const [planned, setPlanned] = useState<RangeText>({ low: '', high: '' })
  const [run, setRun] = useState<RangeText>({ low: '', high: '' })
  const runTouched = useRef(false)
  const [picked, setPicked] = useState<string[]>([])
  const [chosenShares, setShares] = useState<Record<string, number>>({})
  const [cadence, setCadence] = useState<Cadence | null>(null)
  const [issues, setIssues] = useState<Partial<Record<Lane, FormIssue>>>({})
  const [categoryIssue, setCategoryIssue] = useState<CategoryIssue | null>(null)
  const [retired, setRetired] = useState<string[]>([])
  const [result, setResult] = useState<ResultState>({ kind: 'idle' })
  const seq = useRef(0)
  const readSeq = useRef(0)
  const inFlight = useRef<AbortController | null>(null)
  // The shares as sent and drawn: the chosen ones while they still cover exactly
  // the picks, else even — a pick the engine or the list took away starts them over.
  const shares = sharesFor(picked, chosenShares)

  // The read, stamped so an older answer never lands; null when it was overtaken.
  const readCategories = useCallback(async () => {
    const mine = ++readSeq.current
    const out = await fetchCategories()
    return mine === readSeq.current ? out : null
  }, [])

  const applyCategories = useCallback(
    (out: CategoriesResult | null): CategoriesAnswer | null => {
      if (out === null) return null
      if (out.kind !== 'ok') {
        setCategories({ kind: 'failed' })
        return null
      }
      setCategories({ kind: 'ready', value: out.value })
      setCadence((current) => current ?? out.value.defaultCadence)
      return out.value
    },
    [],
  )

  const loadCategories = useCallback(
    async () => applyCategories(await readCategories()),
    [readCategories, applyCategories],
  )

  useEffect(() => {
    void readCategories().then(applyCategories)
    return () => {
      readSeq.current += 1
      seq.current += 1
      inFlight.current?.abort()
    }
  }, [readCategories, applyCategories])

  // An edit returns the output to not-yet-asked; the inputs themselves stay.
  const clear = useCallback(() => {
    seq.current += 1
    inFlight.current?.abort()
    setResult({ kind: 'idle' })
    setIssues({})
    setCategoryIssue(null)
  }, [])

  // A pick the live list no longer serves is dropped, and the page says which.
  const dropStale = useCallback((live: CategoriesAnswer, current: string[]) => {
    const serves = (key: string) =>
      live.categories.some((c) => c.key === key && c.models.length > 0)
    const gone = current.filter((key) => !serves(key))
    if (gone.length > 0) {
      setPicked(current.filter(serves))
      setRetired(gone)
    }
    return gone
  }, [])

  const ask = useCallback(async () => {
    const p = parseRange(planned)
    const r = parseRange(run)
    setRetired([])
    if (typeof p === 'string' || typeof r === 'string') {
      setResult({ kind: 'idle' })
      return void setIssues({
        ...(typeof p === 'string' ? { planned: p } : {}),
        ...(typeof r === 'string' ? { run: r } : {}),
      })
    }
    if (p.high === 0 && r.high === 0) {
      setResult({ kind: 'idle' })
      return void setIssues({ planned: 'rangeBothZero', run: 'rangeBothZero' })
    }
    if (picked.length === 0) return void setCategoryIssue('categoryMissing')
    setIssues({})
    setCategoryIssue(null)
    const mine = ++seq.current
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    setResult({ kind: 'loading' })
    const out = await requestEstimate(
      {
        plannedPerMonth: p,
        runPerMonth: r,
        categories: picked,
        ...(picked.length > 1 ? { shares } : {}),
        cadence: cadence ?? 'annual',
      },
      { signal: controller.signal },
    )
    if (mine !== seq.current) return
    switch (out.kind) {
      case 'ok':
        return setResult({ kind: 'estimate', value: out.value })
      case 'emptyCategory':
        // The live list has no model for these now: unpick them, show why.
        setCategories((current) =>
          current.kind === 'ready'
            ? {
                kind: 'ready',
                value: {
                  ...current.value,
                  categories: current.value.categories.map((c) =>
                    out.categories.includes(c.key) ? { ...c, models: [] } : c,
                  ),
                },
              }
            : current,
        )
        setPicked((current) =>
          current.filter((k) => !out.categories.includes(k)),
        )
        return setResult({ kind: 'empty', categories: out.categories })
      case 'invalid': {
        const { refusal } = out
        setResult({ kind: 'idle' })
        if (refusal.field === 'staleCategory') {
          const live = await loadCategories()
          if (mine !== seq.current) return
          if (!live || dropStale(live, picked).length === 0) {
            setResult({ kind: 'unavailable' })
          }
          return
        }
        if (refusal.field === 'categories')
          return setCategoryIssue(refusal.issue)
        if (refusal.field === 'both') {
          return setIssues({ planned: 'rangeBothZero', run: 'rangeBothZero' })
        }
        return setIssues({ [refusal.field]: refusal.issue })
      }
      case 'unavailable':
        return setResult({ kind: 'unavailable' })
    }
  }, [planned, run, picked, shares, cadence, loadCategories, dropStale])

  const ready = categories.kind === 'ready' ? categories.value : null
  const editPlanned = (field: keyof RangeText, value: string) => {
    clear()
    setPlanned((current) => ({ ...current, [field]: value }))
    if (!runTouched.current)
      setRun((current) => ({ ...current, [field]: value }))
  }
  const editRun = (field: keyof RangeText, value: string) => {
    clear()
    runTouched.current = true
    setRun((current) => ({ ...current, [field]: value }))
  }
  // The picks keep the list's order, and any change of them starts the shares even.
  const togglePicked = (key: string) => {
    clear()
    setRetired([])
    const order = ready ? ready.categories.map((c) => c.key) : []
    const next = (
      picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key]
    ).sort((a, b) => order.indexOf(a) - order.indexOf(b))
    setPicked(next)
    setShares(sharesFor(next, {}))
  }
  const dragTo = (key: string, to: number) => {
    clear()
    const moved = dragShare(
      picked.map((k) => shares[k] ?? MIN_SHARE),
      picked.indexOf(key),
      to,
    )
    setShares(Object.fromEntries(picked.map((k, i) => [k, moved[i]!])))
  }

  const asking = result.kind === 'loading'
  const bothZero = issues.planned === 'rangeBothZero'
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  })
  // One pick carries the whole run; with more, the sliders say each share.
  const share = picked.length === 1 ? percent.format(1) : null

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <form
        className="grid content-start gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void ask()
        }}
      >
        <div className="grid gap-1">
          <h2 className="m-0 text-2xl font-semibold text-(--el-text-strong)">
            {words.title}
          </h2>
          <p className="m-0 max-w-prose text-sm text-(--el-text-secondary)">
            {words.subtitle}
          </p>
        </div>
        <RangeField
          legend={words.plannedLabel}
          help={words.rangeHelp}
          value={planned}
          issue={bothZero ? 'invalid' : issues.planned}
          onEdit={editPlanned}
          words={words}
        />
        <RangeField
          legend={words.runLabel}
          help={`${words.rangeHelp} ${words.runHelp}`}
          value={run}
          issue={bothZero ? 'invalid' : issues.run}
          onEdit={editRun}
          words={words}
        />
        {bothZero ? (
          <p role="alert" className="m-0 text-sm text-(--el-danger-on-surface)">
            {words.errors.rangeBothZero}
          </p>
        ) : null}

        <fieldset className="m-0 grid gap-2 border-0 p-0">
          <legend className="mb-1 p-0 text-sm font-medium text-(--el-text-strong)">
            {words.categoriesLabel}
          </legend>
          <p className="m-0 text-sm text-(--el-text-secondary)">
            {words.categoriesHelp}
          </p>
          {categories.kind === 'loading' ? (
            <p
              role="status"
              className="m-0 flex items-center gap-2 text-sm text-(--el-text-secondary)"
            >
              <Spinner size="sm" />
            </p>
          ) : null}
          {categories.kind === 'failed' ? (
            <ErrorState
              title={words.categoriesFailed}
              retry={() => {
                setCategories({ kind: 'loading' })
                void loadCategories()
              }}
              retryLabel={words.retry}
            />
          ) : null}
          {ready
            ? ready.categories.map((category) => {
                const on = picked.includes(category.key)
                const empty = category.models.length === 0
                const full = !on && picked.length >= MAX_CATEGORIES
                return (
                  <div
                    key={category.key}
                    className="grid gap-0.5"
                    data-category={category.key}
                  >
                    <Checkbox
                      checked={on}
                      onChange={() => togglePicked(category.key)}
                      label={categoryLabel(category.key)}
                      labelVisible
                      disabled={empty || full}
                      // The empty line must stay readable: no faded disabled ink.
                      className={
                        empty
                          ? 'text-(--el-text-secondary) disabled:opacity-100'
                          : 'text-(--el-text)'
                      }
                      stateLabels={{
                        checked: words.picked,
                        unchecked: words.notPicked,
                      }}
                    />
                    <span className="pl-6 text-sm break-words text-(--el-text-secondary)">
                      {empty
                        ? words.categoryEmpty
                        : format(words.categoryExamples, {
                            models: exampleModels(
                              category.models.map((m) => m.id),
                              CATEGORY_MODEL_EXAMPLES,
                            ).join(', '),
                          })}
                    </span>
                    {on && share ? (
                      <span className="pl-6 text-sm font-medium text-(--el-text-strong)">
                        {format(words.categoryShare, { share })}
                      </span>
                    ) : null}
                  </div>
                )
              })
            : null}
          {categoryIssue ? (
            <p
              role="alert"
              className="m-0 text-sm text-(--el-danger-on-surface)"
            >
              {words.errors[categoryIssue]}
            </p>
          ) : null}
          {retired.length > 0 ? (
            <p role="status" className="m-0 text-sm text-(--el-text)">
              {retired.map((key) => (
                <span key={key} className="block">
                  {format(words.retired, { category: categoryLabel(key) })}
                </span>
              ))}
            </p>
          ) : null}
        </fieldset>

        {picked.length > 1 ? (
          <SharesField
            picked={picked}
            shares={shares}
            onDrag={dragTo}
            words={words}
          />
        ) : null}

        {ready && cadence ? (
          <Segmented
            label={page.plans.cadenceLabel}
            value={cadence}
            onChange={(next) => {
              clear()
              setCadence(next as Cadence)
            }}
            options={[
              { value: 'monthly', label: page.plans.monthly },
              { value: 'annual', label: page.plans.annual },
            ]}
          />
        ) : null}

        <div>
          <Button
            type="submit"
            variant="primary"
            aria-busy={asking || undefined}
            disabled={categories.kind !== 'ready'}
          >
            {words.submit}
          </Button>
        </div>
      </form>

      <div aria-live="polite" aria-atomic="true" className="grid content-start">
        {result.kind === 'unavailable' ? (
          <ErrorState
            title={words.errors.unavailable}
            retry={() => void ask()}
            retryLabel={words.retry}
          />
        ) : (
          <Card tint="sky">
            {result.kind === 'idle' ? (
              <p className="m-0 text-(--el-text)">{words.idle}</p>
            ) : null}
            {result.kind === 'loading' ? (
              <p className="m-0 flex items-center gap-2 text-(--el-text)">
                <Spinner size="sm" />
                {words.loading}
              </p>
            ) : null}
            {result.kind === 'empty' ? (
              <ul className="m-0 grid list-none gap-1 p-0">
                {result.categories.map((key) => (
                  <li key={key} className="text-sm text-(--el-text)">
                    <span className="font-medium">{categoryLabel(key)}</span>{' '}
                    {words.categoryEmpty}
                  </li>
                ))}
              </ul>
            ) : null}
            {result.kind === 'estimate' ? (
              <CalculatorOutput
                answer={result.value}
                words={words}
                plans={page.plans}
                locale={locale}
              />
            ) : null}
          </Card>
        )}
      </div>
    </div>
  )
}

// The split bar's segments, one tint per picked category in the list's order.
const SHARE_TINTS = [
  'var(--el-tint-sky)',
  'var(--el-tint-mint)',
  'var(--el-tint-lavender)',
]

function SharesField({
  picked,
  shares,
  onDrag,
  words,
}: {
  picked: string[]
  shares: Record<string, number>
  onDrag: (key: string, to: number) => void
  words: ReturnType<typeof useCopy>['pricePage']['calculator']
}) {
  const id = useId()
  const max = maxShare(picked.length)
  return (
    <fieldset
      className="m-0 grid gap-3 border-0 p-0"
      aria-describedby={`${id}-help`}
      data-testid="calculator-shares"
    >
      <legend className="mb-1 p-0 text-sm font-medium text-(--el-text-strong)">
        {words.sharesLabel}
      </legend>
      {picked.map((key) => {
        const label = categoryLabel(key)
        const value = shares[key] ?? MIN_SHARE
        return (
          <div
            key={key}
            className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3"
          >
            <label
              htmlFor={`${id}-${key}`}
              className="text-sm text-(--el-text)"
            >
              {label}
            </label>
            <input
              id={`${id}-${key}`}
              type="range"
              min={MIN_SHARE}
              max={max}
              step={1}
              value={value}
              aria-valuetext={format(words.shareValue, {
                category: label,
                share: String(value),
              })}
              onChange={(event) => onDrag(key, Number(event.target.value))}
              className="h-6 w-full cursor-grab focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring-color)"
              style={{ accentColor: 'var(--el-accent)' }}
            />
            <span
              data-testid="calculator-share-value"
              className="text-right text-sm font-medium text-(--el-text-strong) tabular-nums"
            >
              {value}%
            </span>
          </div>
        )
      })}
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-(--el-muted)"
        aria-hidden
      >
        {picked.map((key, i) => (
          <span
            key={key}
            style={{
              width: `${shares[key] ?? MIN_SHARE}%`,
              backgroundColor: SHARE_TINTS[i % SHARE_TINTS.length],
              borderRight:
                i < picked.length - 1
                  ? '2px solid var(--el-page-bg)'
                  : undefined,
            }}
          />
        ))}
      </div>
      <p id={`${id}-help`} className="m-0 text-sm text-(--el-text-secondary)">
        {words.sharesHelp}
      </p>
    </fieldset>
  )
}

function RangeField({
  legend,
  help,
  value,
  issue,
  onEdit,
  words,
}: {
  legend: string
  help: string
  value: RangeText
  /** A range sentence for this field, or `invalid` to mark it with none. */
  issue: FormIssue | 'invalid' | undefined
  onEdit: (field: keyof RangeText, value: string) => void
  words: ReturnType<typeof useCopy>['pricePage']['calculator']
}) {
  const id = useId()
  const sentence =
    issue && issue !== 'invalid' && issue !== 'rangeBothZero'
      ? words.errors[issue]
      : undefined
  return (
    <fieldset
      className="m-0 grid gap-1 border-0 p-0"
      aria-describedby={`${id}-help`}
    >
      <legend className="mb-1 p-0 text-sm font-medium text-(--el-text-strong)">
        {legend}
      </legend>
      <div className="grid grid-cols-2 items-start gap-2">
        <Input
          id={`${id}-low`}
          label={words.lowLabel}
          inputMode="numeric"
          autoComplete="off"
          value={value.low}
          aria-invalid={issue !== undefined || undefined}
          onChange={(event) => onEdit('low', event.target.value)}
        />
        <Input
          id={`${id}-high`}
          label={words.highLabel}
          inputMode="numeric"
          autoComplete="off"
          value={value.high}
          error={sentence}
          aria-invalid={issue !== undefined || undefined}
          onChange={(event) => onEdit('high', event.target.value)}
        />
      </div>
      <p id={`${id}-help`} className="m-0 text-sm text-(--el-text-secondary)">
        {help}
      </p>
    </fieldset>
  )
}
