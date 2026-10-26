import type { ReactNode } from 'react'
import { useCopy } from '@/lib/copy'

/*
 * The /price page body (MOTIR-8382). Its heading and the app's plans sub-line,
 * then two named sections: the plan ladder (`#plans`) and the calculator
 * (`#calculator`). Laid out at the site's 1400px content width, as the design
 * draws it (design/price/price.mock.html).
 */
export function PricePage({
  plans,
  calculator,
}: {
  plans?: ReactNode
  calculator?: ReactNode
}) {
  const copy = useCopy().pricePage
  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-10 px-[clamp(16px,3vw,48px)] py-10">
      <header className="grid gap-2">
        <h1 className="m-0 text-2xl font-semibold text-(--el-text-strong)">
          {copy.heading}
        </h1>
        <p className="m-0 max-w-prose text-sm text-(--el-text-secondary)">
          {copy.subline}
        </p>
      </header>
      <section id="plans" aria-label={copy.plansLabel} className="grid gap-4">
        {plans}
      </section>
      <section
        id="calculator"
        aria-label={copy.calculatorLabel}
        className="grid scroll-mt-20 gap-4"
      >
        {calculator}
      </section>
    </div>
  )
}
