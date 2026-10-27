import type { Locale } from '@/i18n/routing'
import { flattenCatalogue } from '@/scripts/i18n/sourceRecord'

/*
 * The explainer guards' per-locale phrase lists (MOTIR-9693). Typed
 * `Record<Locale, …>`, so a locale added to `LOCALES` without its lists is a
 * compile error before it can pass a guard vacuously.
 *
 * - `forbidden`: wording the page must never carry — contact-sales, "top-up
 *   only" and "one plan only", in that locale's words. (Enterprise, `$` and the
 *   currency signs are checked for every locale at once.)
 * - `perUser`: the locale's per-user and per-seat phrases, allowed only in the
 *   seats-beyond-the-first sentence and its no-AI-plan sibling.
 */
export interface LocalePhrases {
  forbidden: readonly string[]
  perUser: readonly string[]
}

export const EXPLAINER_PHRASES: Record<Locale, LocalePhrases> = {
  en: {
    forbidden: [
      'contact sales',
      'talk to sales',
      'top-up only',
      'one plan only',
      'only one plan',
    ],
    perUser: ['per user', 'per seat'],
  },
  zh: {
    forbidden: [
      '联系销售',
      '仅限加购',
      '只能加购',
      '只能有一个套餐',
      '仅一个套餐',
    ],
    perUser: ['按用户', '每位用户', '按席位'],
  },
  'zh-tw': {
    forbidden: [
      '聯絡銷售',
      '僅限加購',
      '只能加購',
      '只能有一個方案',
      '僅一個方案',
    ],
    perUser: ['按使用者', '每位使用者', '按席位'],
  },
  ja: {
    forbidden: [
      '営業に問い合わせ',
      '営業担当',
      'チャージのみ',
      'プランは 1 つのみ',
      '1 つのプランのみ',
    ],
    perUser: ['ユーザーあたり', 'シートあたり'],
  },
  ko: {
    forbidden: ['영업팀에 문의', '영업 문의', '충전만', '요금제 하나만'],
    perUser: ['사용자당', '좌석당'],
  },
  de: {
    forbidden: [
      'Vertrieb kontaktieren',
      'Kontaktieren Sie den Vertrieb',
      'nur Aufladung',
      'nur ein Plan',
    ],
    perUser: ['pro Nutzer', 'pro Platz'],
  },
  fr: {
    forbidden: [
      'contacter les ventes',
      'contactez les ventes',
      'service commercial',
      'recharge uniquement',
      'un seul forfait',
    ],
    perUser: ['par utilisateur', 'par siège'],
  },
  es: {
    forbidden: [
      'contactar con ventas',
      'contacta con ventas',
      'solo recarga',
      'un solo plan',
    ],
    perUser: ['por usuario', 'por puesto'],
  },
  it: {
    forbidden: [
      'contatta le vendite',
      'contattare le vendite',
      'solo ricarica',
      'un solo piano',
    ],
    perUser: ['per utente', 'per postazione'],
  },
  nl: {
    forbidden: [
      'contact met sales',
      'neem contact op met sales',
      'alleen bijkoop',
      'maar één abonnement',
    ],
    perUser: ['per gebruiker', 'per plek'],
  },
  pl: {
    forbidden: [
      'skontaktuj się z działem sprzedaży',
      'dział sprzedaży',
      'tylko doładowanie',
      'tylko jeden plan',
    ],
    perUser: ['za użytkownika', 'za stanowisko'],
  },
  pt: {
    forbidden: [
      'fale com vendas',
      'contate vendas',
      'equipe de vendas',
      'apenas recarga',
      'só recarga',
      'um único plano',
    ],
    perUser: ['por usuário', 'por utilizador', 'por licença'],
  },
}

/** The two keys allowed to carry per-user or per-seat wording. */
export const PER_USER_KEYS = ['s7.furtherSeats', 's7.noAiPlanSeats'] as const

/** The key whose sentence MUST carry it: seats beyond the first. */
export const SEATS_BEYOND_FIRST_KEY = 's7.furtherSeats'

/** A catalogue's `explainer` group, flattened to `s7.furtherSeats`-style keys. */
export function explainerValues(group: unknown): Map<string, string> {
  return flattenCatalogue(group as Record<string, unknown>)
}

/** Every `{placeholder}` in a value, sorted, with repeats. */
export const placeholders = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
