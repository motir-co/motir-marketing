import { LOCALE_BCP47, type Locale } from '@/i18n/routing'

/**
 * How the explainer prints a figure it was handed (MOTIR-9691): every number
 * comes from the plan catalog read, formatted for the page's locale. Nothing
 * here holds a figure of its own.
 */
export interface FigureFormat {
  credits: (n: number) => string
  usd: (n: number) => string
}

export function figureFormat(locale: Locale): FigureFormat {
  const tag = LOCALE_BCP47[locale]
  const count = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 })
  const money = new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return { credits: (n) => count.format(n), usd: (n) => money.format(n) }
}
