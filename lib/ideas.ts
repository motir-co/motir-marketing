import { APP_ORIGIN } from '@/lib/appOrigin'
import { IDEAS_TAGS_MAX } from '@/lib/crawlPolicy'
import type { Locale } from '@/i18n/routing'

/**
 * The ideas data layer for `motir-marketing` (MOTIR-7685, Story MOTIR-7665).
 *
 * `/ideas` is read live from motir-core's idea store, through its anonymous
 * public contract — `/api/public/ideas`, `/api/public/ideas/tags` and
 * `/api/public/ideas/:slug`. This module owns the contract's shapes, the URL
 * model that turns `?category=&tag=&q=&kind=&idea=` into an API question and
 * back, and the three server reads. The page renders what it returns. No
 * database client (the standing repo rule, asserted by a test) — the same
 * pattern `lib/explore.ts` set for the project square.
 */

/* ── the contract shapes ───────────────────────────────────────────────────
 *
 * Mirrored BY HAND from motir-core `lib/dto/ideas.ts` (the PUBLIC half) and
 * the `IdeaCategory` / `IdeaKind` enums in `prisma/schema.prisma`, as they
 * stand at motir-core `0ee9f99` (2026-10-07), widened with the per-locale
 * fields of motir-core `03c9c32` (Story MOTIR-7772 · MOTIR-7775: `locale`,
 * `fallbackFields`, `claimFallback`, `labelFallback`). The nine categories of
 * Story MOTIR-8273 (`entertainment_media` … `local_services` among the
 * verticals, `social_community` · `silver_economy` · `independent_work` among
 * the consumer group) are mirrored here AHEAD of motir-core's enum, which gains
 * them in that story's sibling work item, so motir.co can type, filter and mark
 * them before the store can hold one. The contract is guarded
 * in the PRODUCING repository and changes additively only; when it changes,
 * these follow. `e2e/fixtures/ideas*.json` are recorded responses of it, and a
 * test type-checks them against these interfaces.
 *
 * Every response passes through a COERCER below before the page sees it, and
 * the coercer names every field it keeps: a response from a motir-core that
 * predates the locale fields reads as served in English, with nothing listed
 * as a fallback. */

/** The fixed category list, in motir-core's (grouped) enum order. */
export const IDEA_CATEGORY_SLUGS = [
  'legal',
  'finance',
  'security_compliance',
  'customer_support',
  'localization',
  'growth_marketing',
  'sales',
  'people_hr',
  'operations',
  'engineering',
  'ecommerce',
  'healthcare',
  'education',
  'financial_services',
  'real_estate',
  'logistics',
  'construction',
  'agriculture',
  'pets',
  'family_care',
  'public_sector',
  'entertainment_media',
  'hospitality_travel',
  'mobility',
  'energy_climate',
  'manufacturing',
  'local_services',
  'personal_growth',
  'personal_finance',
  'health_wellness',
  'social_community',
  'silver_economy',
  'independent_work',
  'ai_infrastructure',
] as const
export type IdeaCategory = (typeof IDEA_CATEGORY_SLUGS)[number]

/** Every kind. `motir_buys` first — the order the public list sorts by. */
export const IDEA_KINDS = ['motir_buys', 'direction'] as const
export type IdeaKind = (typeof IDEA_KINDS)[number]

export interface IdeaCategoryRefDto {
  slug: IdeaCategory
  label: string
}

export interface IdeaTagRefDto {
  slug: string
  label: string
}

/** One sourced claim. `sourceDate` is `YYYY-MM-DD`, or null when the source has none. */
export interface IdeaEvidenceDto {
  claim: string
  sourceName: string
  url: string
  sourceDate: string | null
}

/** The locale a response was served in: the page's, or `en`. */
export type IdeaLocale = Locale

/** An idea's own translatable fields (motir-core `IDEA_TRANSLATABLE_FIELDS`). */
export const IDEA_TRANSLATABLE_FIELDS = [
  'title',
  'pitch',
  'capabilities',
  'gap',
  'whyNow',
  'whyMotir',
  'whoElse',
] as const
export type IdeaTranslatableField = (typeof IDEA_TRANSLATABLE_FIELDS)[number]

/** A public evidence row; `claimFallback` is true when the claim is the English. */
export interface PublicIdeaEvidenceDto extends IdeaEvidenceDto {
  claimFallback: boolean
}

/** A public tag reference; `labelFallback` is true when the label is the English. */
export interface PublicIdeaTagRefDto extends IdeaTagRefDto {
  labelFallback: boolean
}

export interface PublicIdeaDto {
  slug: string
  title: string
  pitch: string
  kind: IdeaKind
  category: IdeaCategoryRefDto
  tags: PublicIdeaTagRefDto[]
  capabilities: string[]
  evidence: PublicIdeaEvidenceDto[]
  gap: string | null
  whyNow: string | null
  whyMotir: string | null
  whoElse: string | null
  addedAt: string
  lastReviewedAt: string | null
  /** The locale served. */
  locale: IdeaLocale
  /** The idea fields served in English although another locale was asked for. */
  fallbackFields: IdeaTranslatableField[]
}

export interface PublicIdeaCategoryCountDto extends IdeaCategoryRefDto {
  count: number
}

export interface PublicIdeaListDto {
  items: PublicIdeaDto[]
  /** Counts over every filter EXCEPT `category`, so the chips stay choosable. */
  categories: PublicIdeaCategoryCountDto[]
  total: number
  /** The locale served. Category labels stay English: the page names its own sections. */
  locale: IdeaLocale
}

export interface PublicIdeaTagDto extends PublicIdeaTagRefDto {
  /** How many ACTIVE ideas carry the tag. */
  count: number
}

/** `GET /api/public/ideas/tags`. */
export interface PublicIdeaTagListDto {
  tags: PublicIdeaTagDto[]
  locale: IdeaLocale
}

/* ── the coercers ──────────────────────────────────────────────────────────
 *
 * The ONLY path from a response to the page. Each names every field it keeps,
 * so a field the contract adds reaches a component only when it is named here.
 * A field the server did not send takes its pre-locale meaning: served in
 * `en`, no fallback listed, every flag `false` — so a page in another language
 * marks all of it English (`ideaTextLang`), which is true. */

type Wire<T> = Omit<T, 'locale' | 'fallbackFields'> & {
  locale?: IdeaLocale
  fallbackFields?: IdeaTranslatableField[]
}

/** An idea as the wire may carry it: the locale fields absent on an older server. */
export type PublicIdeaWire = Omit<Wire<PublicIdeaDto>, 'evidence' | 'tags'> & {
  evidence: Array<IdeaEvidenceDto & { claimFallback?: boolean }>
  tags: Array<IdeaTagRefDto & { labelFallback?: boolean }>
}

export function toPublicIdea(raw: PublicIdeaWire): PublicIdeaDto {
  return {
    slug: raw.slug,
    title: raw.title,
    pitch: raw.pitch,
    kind: raw.kind,
    category: { slug: raw.category.slug, label: raw.category.label },
    tags: raw.tags.map((t) => ({
      slug: t.slug,
      label: t.label,
      labelFallback: t.labelFallback ?? false,
    })),
    capabilities: [...raw.capabilities],
    evidence: raw.evidence.map((e) => ({
      claim: e.claim,
      sourceName: e.sourceName,
      url: e.url,
      sourceDate: e.sourceDate,
      claimFallback: e.claimFallback ?? false,
    })),
    gap: raw.gap,
    whyNow: raw.whyNow,
    whyMotir: raw.whyMotir,
    whoElse: raw.whoElse,
    addedAt: raw.addedAt,
    lastReviewedAt: raw.lastReviewedAt,
    locale: raw.locale ?? 'en',
    fallbackFields: [...(raw.fallbackFields ?? [])],
  }
}

export interface PublicIdeaListWire {
  items: PublicIdeaWire[]
  categories: PublicIdeaCategoryCountDto[]
  total: number
  locale?: IdeaLocale
}

export function toPublicIdeaList(raw: PublicIdeaListWire): PublicIdeaListDto {
  return {
    items: raw.items.map(toPublicIdea),
    categories: raw.categories.map((c) => ({
      slug: c.slug,
      label: c.label,
      count: c.count,
    })),
    total: raw.total,
    locale: raw.locale ?? 'en',
  }
}

export interface PublicIdeaTagListWire {
  tags: Array<IdeaTagRefDto & { count: number; labelFallback?: boolean }>
  locale?: IdeaLocale
}

export function toPublicIdeaTagList(
  raw: PublicIdeaTagListWire,
): PublicIdeaTagListDto {
  return {
    tags: raw.tags.map((t) => ({
      slug: t.slug,
      label: t.label,
      count: t.count,
      labelFallback: t.labelFallback ?? false,
    })),
    locale: raw.locale ?? 'en',
  }
}

/**
 * The `lang` an idea's text element takes on a page in `pageLocale`: `'en'`
 * when the page is not English and the text is — the response was served in
 * English (an old server, an unknown locale), or this field is a fallback —
 * else `undefined`, so text in the page's language, and every element of an
 * English page, carries no attribute. Put it on the element that HOLDS the
 * text, never on a wrapper, so one English claim marks only that claim.
 */
export function ideaTextLang(
  pageLocale: IdeaLocale,
  servedLocale: IdeaLocale,
  isFallback: boolean,
): 'en' | undefined {
  if (pageLocale === 'en') return undefined
  return servedLocale === 'en' || isFallback ? 'en' : undefined
}

/** Whether an idea field was served in English (see {@link ideaTextLang}). */
export function ideaFieldLang(
  pageLocale: IdeaLocale,
  idea: Pick<PublicIdeaDto, 'locale' | 'fallbackFields'>,
  field: IdeaTranslatableField,
): 'en' | undefined {
  return ideaTextLang(
    pageLocale,
    idea.locale,
    idea.fallbackFields.includes(field),
  )
}

/* ── the URL model ─────────────────────────────────────────────────────────
 *
 * Every narrowing of `/ideas` is a URL parameter, so a filtered view can be
 * shared, bookmarked and crawled, and `?idea=<slug>` addresses the in-place
 * detail. The parse is FORGIVING — a value the API would refuse (an unknown
 * category or kind) or one that is not a slug is dropped rather than turned
 * into an error page, because the URL is something a visitor can type. */

/** The longest free-text query honoured; longer input is cut, as motir-core cuts it. */
export const IDEAS_QUERY_MAX = 200

/** The slug shape every idea and tag slug takes (motir-core `IDEA_SLUG_PATTERN`). */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const IDEAS_PATH = '/ideas'

export interface IdeasParams {
  category?: IdeaCategory
  /** Every tag must match. Kept in the order given, de-duplicated, at most `IDEAS_TAGS_MAX`. */
  tags: string[]
  q?: string
  kind?: IdeaKind
  /** The idea open in place over the list. Not a filter: the API never sees it. */
  idea?: string
}

/** What `searchParams` looks like in a Next page, or a `URLSearchParams`. */
export type RawSearchParams =
  Record<string, string | string[] | undefined> | URLSearchParams

function allValues(raw: RawSearchParams, name: string): string[] {
  if (raw instanceof URLSearchParams) return raw.getAll(name)
  const value = raw[name]
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function firstValue(raw: RawSearchParams, name: string): string | undefined {
  const value = allValues(raw, name)[0]?.trim()
  return value ? value : undefined
}

function oneOf<T extends string>(
  allowed: readonly T[],
  value: string | undefined,
): T | undefined {
  return value !== undefined && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined
}

function slugOrUndefined(value: string | undefined): string | undefined {
  return value !== undefined && SLUG_PATTERN.test(value) ? value : undefined
}

export function parseIdeasParams(raw: RawSearchParams): IdeasParams {
  const tags: string[] = []
  for (const value of allValues(raw, 'tag')) {
    const tag = slugOrUndefined(value.trim())
    if (tag && !tags.includes(tag)) tags.push(tag)
    if (tags.length === IDEAS_TAGS_MAX) break
  }
  const q = firstValue(raw, 'q')?.slice(0, IDEAS_QUERY_MAX).trim()
  return {
    category: oneOf(IDEA_CATEGORY_SLUGS, firstValue(raw, 'category')),
    tags,
    q: q ? q : undefined,
    kind: oneOf(IDEA_KINDS, firstValue(raw, 'kind')),
    idea: slugOrUndefined(firstValue(raw, 'idea')),
  }
}

/** A change to apply to the current params: `null` clears a field. */
export interface IdeasParamsChange {
  category?: IdeaCategory | null
  tags?: string[]
  q?: string | null
  kind?: IdeaKind | null
  idea?: string | null
}

function pick<T>(change: T | null | undefined, current: T | undefined) {
  if (change === null) return undefined
  return change === undefined ? current : change
}

/**
 * The FILTER part of the URL, in the one stable order: category, every tag,
 * q, kind. Shared by the page URL and the API query, so the two cannot
 * disagree about what a filter means.
 */
function filterEntries(p: IdeasParams): Array<[string, string]> {
  const entries: Array<[string, string]> = []
  if (p.category) entries.push(['category', p.category])
  for (const tag of p.tags) entries.push(['tag', tag])
  if (p.q) entries.push(['q', p.q])
  if (p.kind) entries.push(['kind', p.kind])
  return entries
}

/**
 * The canonical `/ideas` URL for `params` with `change` applied. The
 * parameter order is fixed (category, tag…, q, kind, idea), so the same view
 * is always the same string — a shared link and a crawled link are one URL.
 * Fields `change` leaves undefined are kept; `idea` is kept too, so a caller
 * that changes a filter while a detail is open says `idea: null` to close it.
 */
export function ideasHref(
  params: IdeasParams,
  change: IdeasParamsChange = {},
): string {
  const tags = change.tags ?? params.tags
  const next: IdeasParams = {
    category: pick(change.category, params.category),
    tags: [...new Set(tags)].slice(0, IDEAS_TAGS_MAX),
    q: pick(change.q, params.q)?.trim() || undefined,
    kind: pick(change.kind, params.kind),
    idea: pick(change.idea, params.idea),
  }
  const entries = filterEntries(next)
  if (next.idea) entries.push(['idea', next.idea])
  const qs = new URLSearchParams(entries).toString()
  return qs ? `${IDEAS_PATH}?${qs}` : IDEAS_PATH
}

/** Whether any filter narrows the list (the open idea is not a filter). */
export function hasIdeaFilters(params: IdeasParams): boolean {
  return filterEntries(params).length > 0
}

/* ── the reads (the ONLY network hops this surface makes) ─────────────────
 *
 * Server-side, revalidated hourly: the store changes when its owner curates
 * it, not per request, and an hour is how long a retired idea may linger —
 * the window the story promises. motir-core's `Cache-Control` matches it. */

export const IDEAS_REVALIDATE_SECONDS = 3600

const API_BASE = `${APP_ORIGIN}/api/public/ideas`

/**
 * The public API could not answer — unreachable, a 5xx, a refused filter, or
 * a body that is not JSON. The page renders its error state for it: there is
 * no static copy of the ideas left to fall back on.
 */
export class IdeasUnavailableError extends Error {
  override readonly name = 'IdeasUnavailableError'

  constructor(
    readonly path: string,
    readonly status: number | null,
    options?: { cause?: unknown },
  ) {
    super(
      `the public ideas API did not answer ${path}` +
        (status === null ? '' : ` (HTTP ${status})`),
      options,
    )
  }
}

async function read(path: string): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      next: { revalidate: IDEAS_REVALIDATE_SECONDS },
    })
  } catch (cause) {
    throw new IdeasUnavailableError(path, null, { cause })
  }
}

async function json<T>(path: string, res: Response): Promise<T> {
  if (!res.ok) throw new IdeasUnavailableError(path, res.status)
  try {
    return (await res.json()) as T
  } catch (cause) {
    throw new IdeasUnavailableError(path, res.status, { cause })
  }
}

/**
 * `locale=<l>` on the STORE's URL, for every locale `en` included: the query
 * string is the store's cache key, so each locale is its own entry in Next's
 * URL-keyed fetch cache too. It never reaches the visitor's URL — the page's
 * path already carries the language (`ideasHref` has no locale).
 */
function withLocale(entries: Array<[string, string]>, locale: IdeaLocale) {
  return new URLSearchParams([...entries, ['locale', locale]]).toString()
}

/** Every active idea matching the filters, with per-category counts. */
export async function fetchIdeas(
  params: IdeasParams,
  locale: IdeaLocale,
): Promise<PublicIdeaListDto> {
  const path = `?${withLocale(filterEntries(params), locale)}`
  return toPublicIdeaList(
    await json<PublicIdeaListWire>(path, await read(path)),
  )
}

/** Every tag carried by at least one active idea, with its count. */
export async function fetchIdeaTags(
  locale: IdeaLocale,
): Promise<PublicIdeaTagListDto> {
  const path = `/tags?${withLocale([], locale)}`
  return toPublicIdeaTagList(
    await json<PublicIdeaTagListWire>(path, await read(path)),
  )
}

/**
 * One active idea, or `null` when there is none by that slug. motir-core
 * answers an unknown slug and a RETIRED one with the same 404, so `null` is
 * both — the page falls back to the list either way.
 */
export async function fetchIdea(
  slug: string,
  locale: IdeaLocale,
): Promise<PublicIdeaDto | null> {
  const path = `/${encodeURIComponent(slug)}?${withLocale([], locale)}`
  const res = await read(path)
  if (res.status === 404) return null
  return toPublicIdea(await json<PublicIdeaWire>(path, res))
}

/* ── presentation helpers the page and the detail share ────────────────────
 *
 * Both are DERIVED, never stored (`design/ideas/design-notes.md`): the mark
 * follows the category's group in motir-core's enum, so a palette swap
 * re-tints every mark and a category added to a group inherits its mark. */

/** The showcase fill a category's colour mark takes. */
export type IdeaMark = 'field' | 'decision' | 'record' | 'ground'

const MARK_BY_CATEGORY: Record<IdeaCategory, IdeaMark> = {
  // business functions
  legal: 'field',
  finance: 'field',
  security_compliance: 'field',
  customer_support: 'field',
  localization: 'field',
  growth_marketing: 'field',
  sales: 'field',
  people_hr: 'field',
  operations: 'field',
  engineering: 'field',
  // verticals
  ecommerce: 'decision',
  healthcare: 'decision',
  education: 'decision',
  financial_services: 'decision',
  real_estate: 'decision',
  logistics: 'decision',
  construction: 'decision',
  agriculture: 'decision',
  pets: 'decision',
  family_care: 'decision',
  public_sector: 'decision',
  entertainment_media: 'decision',
  hospitality_travel: 'decision',
  mobility: 'decision',
  energy_climate: 'decision',
  manufacturing: 'decision',
  local_services: 'decision',
  // consumer
  personal_growth: 'record',
  personal_finance: 'record',
  health_wellness: 'record',
  social_community: 'record',
  silver_economy: 'record',
  independent_work: 'record',
  // platform
  ai_infrastructure: 'ground',
}

/**
 * A category's mark. Total over every category the contract lists, and a
 * category this file does not know yet (motir-core added one first) takes the
 * platform mark rather than none.
 */
export function ideaCategoryMark(slug: string): IdeaMark {
  return (MARK_BY_CATEGORY as Record<string, IdeaMark>)[slug] ?? 'ground'
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * A source date as "October 2025". The store records the 1st when a source
 * gives only a month, so the day is never shown. Anything that is not
 * `YYYY-MM-DD` gives `null` and the date is simply not drawn.
 */
export function sourceMonth(date: string | null): string | null {
  const match = date?.match(/^(\d{4})-(\d{2})-\d{2}$/)
  if (!match) return null
  const month = MONTHS[Number(match[2]) - 1]
  return month ? `${month} ${match[1]}` : null
}

/** Whether an optional text field has anything to draw (`""` does not). */
export function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}
