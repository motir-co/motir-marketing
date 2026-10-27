import type { Locale } from '@/i18n/routing'

/*
 * Wording the price page must never carry, per locale (MOTIR-8382 · MOTIR-9687):
 * an Enterprise tier, a sales contact, a QUANTITY reading of Max ×2 ("buy two",
 * "two Max subscriptions"), and a claim that the whole page has no per-user
 * price. Lower-case; matched against the page's lower-cased text.
 */
export const FORBIDDEN_TERMS: Record<Locale, string[]> = {
  en: [
    'enterprise',
    'contact sales',
    'talk to sales',
    'x2 quantity',
    'buy two',
    'two max subscriptions',
    'no per-user price',
    'no per-seat price',
  ],
  zh: ['企业版', '联系销售', '购买两个', '两个 max 订阅', '没有按人计价'],
  'zh-tw': ['企業版', '聯絡業務', '購買兩個', '兩個 max 訂閱', '沒有按人計價'],
  ja: [
    'エンタープライズ',
    '営業に問い合わせ',
    '2つ購入',
    'max を2つ',
    'ユーザー単位の料金はありません',
  ],
  ko: [
    '엔터프라이즈',
    '영업팀에 문의',
    '두 개 구매',
    'max 구독 두 개',
    '사용자당 요금이 없',
  ],
  de: [
    'enterprise',
    'vertrieb kontaktieren',
    'zwei kaufen',
    'zwei max-abonnements',
    'kein preis pro nutzer',
  ],
  fr: [
    'entreprise',
    'contacter les ventes',
    'en acheter deux',
    'deux abonnements max',
    'aucun prix par utilisateur',
  ],
  es: [
    'enterprise',
    'contactar con ventas',
    'comprar dos',
    'dos suscripciones max',
    'sin precio por usuario',
  ],
  it: [
    'enterprise',
    'contatta le vendite',
    'comprane due',
    'due abbonamenti max',
    'nessun prezzo per utente',
  ],
  nl: [
    'enterprise',
    'neem contact op met sales',
    'koop er twee',
    'twee max-abonnementen',
    'geen prijs per gebruiker',
  ],
  pl: [
    'enterprise',
    'skontaktuj się z działem sprzedaży',
    'kup dwa',
    'dwie subskrypcje max',
    'brak ceny za użytkownika',
  ],
  pt: [
    'enterprise',
    'fale com vendas',
    'comprar dois',
    'duas assinaturas max',
    'sem preço por usuário',
  ],
}
