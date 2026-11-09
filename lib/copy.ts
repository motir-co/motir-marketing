import {
  createContext,
  createElement,
  Fragment,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { createTranslator } from 'use-intl/core'
import type { Locale } from '@/i18n/routing'
import en from '@/messages/en.json'

/**
 * The copy catalogue, read through the page's locale (MOTIR-7950).
 *
 * `messages/en.json` is the baseline and the type: every other locale is a
 * sibling `messages/<locale>.json` with the same key set, and this module turns
 * whatever that file holds into a complete `Copy` by taking English for every
 * key it lacks. A reader therefore never sees a raw key or `undefined`, and a
 * locale with no file at all renders wholly in English.
 *
 * ⚠️ STILL A TYPED OBJECT, NOT `t('…')`. The site reads `copy.landing.hero.cta`
 * and keeps reading it that way. The page's locale and catalogue reach the
 * components through ONE React context, {@link PageProvider}, which every
 * React root on a page mounts — the build's server render and each island's
 * hydration alike (MOTIR-10643, replacing the Next site's i18n provider). The English
 * fallback lives in ONE place, `resolveCopy`, at build; an island receives the
 * already-merged object, so no component ever handles a missing key.
 *
 * Three ways to read it:
 *  • `useCopy()` — any component that is not `async`, rendered at build or in
 *    an island.
 *  • `await getCopy(locale)` — an `async` page module, with the locale from
 *    its `params` (`enterLocale`).
 *  • `englishCopy` — only page METADATA, the share image, the JSON-LD and the
 *    global 404, each of which another card localises.
 *    `tests/i18n/copyReaders.test.ts` holds that list.
 */
export type Copy = typeof en

/** The English catalogue. See the third bullet above for who may import it. */
export const englishCopy: Copy = en

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Merge one value of a locale's catalogue over its English counterpart.
 *
 * The locale's value is taken only where it has English's SHAPE: a non-empty
 * string for a string, an object for an object (merged key by key), an array of
 * the same length for an array (merged item by item). Anything else — a missing
 * key, an empty string, a number, an object where English has a string — is
 * English. Keys English lacks are never visited, so they are dropped.
 */
function merge(english: unknown, local: unknown): unknown {
  if (typeof english === 'string') {
    return typeof local === 'string' && local.length > 0 ? local : english
  }
  if (Array.isArray(english)) {
    if (!Array.isArray(local) || local.length !== english.length) {
      return english
    }
    return english.map((item, index) => merge(item, local[index]))
  }
  if (isRecord(english)) {
    const source = isRecord(local) ? local : {}
    return Object.fromEntries(
      Object.entries(english).map(([key, value]) => [
        key,
        merge(value, source[key]),
      ]),
    )
  }
  // A number or a boolean — a card's child count, a flag on an illustration —
  // is not copy a translator edits, so English's value stands.
  return english
}

/** A locale's catalogue, completed with English per missing key. Pure. */
export function resolveCopy(partial: unknown): Copy {
  return merge(en, partial) as Copy
}

/** Loads one locale's catalogue file; rejects when it does not exist. */
export type CatalogueLoader = (locale: Locale) => Promise<unknown>

/**
 * ⚠️ A TEMPLATE `import()`, SO A NEW LOCALE IS A FILE AND NOTHING ELSE. The
 * bundler turns `../messages/${locale}.json` into one chunk per file present in
 * `messages/` at build time; a translation card adds `messages/ja.json` and
 * this line already reaches it. Relative rather than `@/`, because that is the
 * form Vite resolves as a variable import.
 */
const loadCatalogue: CatalogueLoader = async (locale) =>
  (await import(`../messages/${locale}.json`)).default

/**
 * "This locale has no catalogue file" — the ONE failure that means English.
 * Node says `MODULE_NOT_FOUND`; Vite's variable import says it has
 * no such file. Anything else (a malformed file, a bundler fault) is rethrown.
 */
function isMissingCatalogue(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const code = (error as { code?: unknown }).code
  return (
    code === 'MODULE_NOT_FOUND' ||
    code === 'ERR_MODULE_NOT_FOUND' ||
    /^Cannot find module\b|^Unknown variable dynamic import\b/.test(
      error.message,
    )
  )
}

const resolved = new Map<Locale, Promise<Copy>>()

/**
 * The page's catalogue, English per missing key — at BUILD, memoised per
 * locale. `en` is the English object itself, never a load.
 *
 * `load` is the seam the fallback tests use; a caller in the app passes only
 * the locale, and only that call is memoised.
 */
export function getCopy(
  locale: Locale,
  load: CatalogueLoader = loadCatalogue,
): Promise<Copy> {
  if (locale === 'en') return Promise.resolve(englishCopy)
  const read = async () => {
    try {
      return resolveCopy(await load(locale))
    } catch (error) {
      if (isMissingCatalogue(error)) return englishCopy
      throw error
    }
  }
  if (load !== loadCatalogue) return read()
  let pending = resolved.get(locale)
  if (!pending) {
    pending = read()
    resolved.set(locale, pending)
  }
  return pending
}

/**
 * The namespaces a `'use client'` module reads — and so the only part of the
 * catalogue a page sends to the browser for its islands (`lib/island.tsx`).
 *
 * ⚠️ MEASURED, NOT TIDY. Handing the providers the whole catalogue put every
 * namespace into every page's payload, most of it `products` (26 KB) that no
 * client module reads: `/docs/mcp` measured 211,265 bytes that way and
 * 168,544 with this list (same build, same stub).
 * A client module that starts reading another namespace adds it here, and
 * `tests/i18n/copyReaders.test.ts` fails until it does.
 */
export const CLIENT_COPY_NAMESPACES = [
  'nav',
  'setupPrompt',
  'landing',
  'designShowcase',
  'docs',
  'howItWorks',
  // MOTIR-7954 — `SubscribeForm` is the public-project tree's one client module.
  'publicProject',
  // MOTIR-9684 — the price card's cadence toggle and its retry.
  'pricePage',
] as const satisfies readonly (keyof Copy)[]

/** The part of a catalogue the browser receives: `CLIENT_COPY_NAMESPACES`. */
export function clientCopy(
  copy: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    CLIENT_COPY_NAMESPACES.map((namespace) => [namespace, copy[namespace]]),
  )
}

/*
 * ⚠️ ONE CONTEXT, READ THE SAME WAY AT BUILD AND IN AN ISLAND (MOTIR-10643).
 *
 * Under Next a server component and a client component read the catalogue
 * through different paths, because the i18n library's server config was cached per
 * request and the global 404 answered first (MOTIR-7955). A built page has no
 * request and no second tree: the Astro page renders ONE React root per page
 * in ONE locale, and that root mounts `PageProvider` with the locale, the
 * catalogue and the page's path. An island's root mounts the same provider in
 * the browser with the island's share of the catalogue (`clientCopy`), so a
 * component reads `useCopy()` whichever side it renders on.
 */

/** What a page's React root knows: its locale, its catalogue, its path. */
export interface PageValue {
  locale: Locale
  copy: Copy
  /**
   * The page's own address as built, locale prefix included (`/de/price`).
   * The switcher and the header's current-page mark read it.
   */
  pathname: string
  /**
   * True on a page built once and served at many addresses — the not-found
   * room, which answers every unknown path under its locale. Its path is then
   * the location bar's, read in the browser after hydration.
   */
  servedAtAnyPath?: boolean
}

const PageContext = createContext<PageValue | null>(null)

/** Mount at the root of every React tree a page renders. */
export function PageProvider({
  value,
  children,
}: Readonly<{ value: PageValue; children: ReactNode }>) {
  return createElement(PageContext.Provider, { value }, children)
}

/** The whole page value, for a component that hands it on (`lib/island.tsx`). */
export function usePage(): PageValue {
  const page = useContext(PageContext)
  if (page === null) {
    throw new Error(
      'A component read the page catalogue outside a PageProvider. Every React root a page renders mounts one (lib/copy.ts).',
    )
  }
  return page
}

/** The page's catalogue in a component that is not `async`. */
export function useCopy(): Copy {
  return usePage().copy
}

/**
 * The page's locale in a component that is not `async` — for `Intl`
 * formatting and locale-keeping links.
 */
export function usePageLocale(): Locale {
  return usePage().locale
}

const noSubscription = () => () => {}

/**
 * The address the reader is on, locale prefix included.
 *
 * The page's own built path — except on a page `servedAtAnyPath`, the
 * not-found room, which is built once per locale and served for every unknown
 * address under it: there the switcher on `/de/does-not-exist` must link to
 * `/fr/does-not-exist`, not to the built `/fr/404`, so the path is the location
 * bar's. `useSyncExternalStore` hydrates on the built value and moves to the
 * browser's on the next render, so hydration never mismatches.
 */
export function usePagePathname(): string {
  const { pathname, servedAtAnyPath } = usePage()
  return useSyncExternalStore(
    noSubscription,
    () => (servedAtAnyPath ? window.location.pathname : pathname),
    () => pathname,
  )
}

/**
 * Fill `{name}` placeholders. Two strings carry them — the character counter
 * and the copyright year — and a template literal in the component would put
 * half of each sentence back in the JSX, which is the thing the catalogue
 * exists to prevent.
 */
export function format(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  )
}

/**
 * `format()` for a sentence with an ELEMENT in it — a link, a `<strong>`, a
 * `<time>` (MOTIR-7954). The sentence stays one key, so a translator can move
 * the element to wherever their grammar puts it; the element is passed in as a
 * value and lands where its `{name}` is. A placeholder with no value is left
 * as written, exactly as `format()` leaves it.
 */
export function formatRich(
  template: string,
  values: Record<string, ReactNode>,
): ReactNode[] {
  return template
    .split(/(\{\w+\})/)
    .filter((part) => part !== '')
    .map((part, index) => {
      const key = /^\{(\w+)\}$/.exec(part)?.[1]
      return key !== undefined && key in values
        ? createElement(Fragment, { key: index }, values[key])
        : part
    })
}

/** A value an ICU sentence is filled with: text, a number, or a tag's renderer. */
export type IcuValue = string | number | ((chunks: ReactNode) => ReactNode)

/**
 * Render an ICU catalogue sentence — `{count, plural, one {…} other {…}}`, `{name}`
 * and `<tag>…</tag>` — in `locale` (MOTIR-8037). `format()` and `formatRich()` fill
 * a bare `{name}` only; a count line or a sentence with an inline `<code>` needs
 * the full syntax so that a translator can inflect the noun for their language and
 * move the element where their grammar puts it. A tag's value is a function that
 * wraps its content.
 */
export function formatIcu(
  locale: Locale,
  template: string,
  values: Record<string, IcuValue>,
): ReactNode {
  const translate = createTranslator({
    locale,
    messages: { message: template },
    onError: (error) => {
      throw error
    },
  })
  return translate.rich('message', values)
}
