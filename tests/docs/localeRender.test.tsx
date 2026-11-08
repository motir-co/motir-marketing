import { readFileSync } from 'node:fs'
import { act, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { localizedPath } from '@/i18n/localizedPath'
import { LOCALES, type Locale } from '@/i18n/routing'
import { englishCopy, getCopy } from '@/lib/copy'
import { listOperations, operationAnchorId } from '@/lib/docs'
import { resolveDocsDocument } from '@/lib/docsDocuments'
import {
  DOCS_INDEX_HREF,
  DOCS_ROUTES,
  docsIndexFor,
  docsSurfacesFor,
} from '@/lib/docsSurfaces'
import {
  SANDBOX_PICKER_OPTIONS,
  sandboxDevcontainerJson,
  sandboxRunCommand,
} from '@/lib/sandboxProfiles'
import {
  fallbackProblems,
  firstDifference,
  loadPage,
  NEUTRAL_CLI_COMMANDS,
  pageFileOf,
  pageProps,
  renderDocsRoute,
  slugOf,
  stubDocsFetch,
} from '@/tests/helpers/docsRoutes'
import { PRODUCTION_CATALOGUE, SPEC } from './fixtures/apiMoveCases'

/*
 * THE SHIPPED /docs, IN ALL ELEVEN LANGUAGES (MOTIR-8051, cases 6–9 and 11–17).
 *
 * Every route is rendered once per locale from the shipped documents, catalogues
 * and pages, and each non-English render is compared with the English render of
 * the SAME route over the SAME fetched documents. The mechanism's rules on
 * invented documents are `docsDocuments.test.ts`'s; this is the population.
 *
 * Locales come from `LOCALES` and routes from `DOCS_ROUTES`, so an added locale
 * or page is covered with no edit here. A render is cached per route and locale
 * (`snapshot`), because 14 routes × 11 locales is the cost driver.
 *
 * ⚠️ WHAT COUNTS AS ENGLISH BY DESIGN, and the only thing the detectors skip:
 * an element marked `lang="en"` (generated descriptions, fallback MCP
 * summaries, a stale page's body), `<code>` and `<pre>`. Everything else on a
 * translated page is the reader's language — so a raw key, an English sentence
 * or an unformatted placeholder there is a defect, not noise.
 */

const OTHER_LOCALES = LOCALES.filter((locale) => locale !== 'en')

/*
 * ⚠️ THE ENGLISH WARM-UP RENDERS EVERY ROUTE INSIDE ONE TEST (MOTIR-8145). Cases
 * 6 and 8 open with an aggregate that captures all of `DOCS_ROUTES` in English
 * through the serial `snapshot()` queue, so its cost grows with the page count
 * and outgrew vitest's 5 s default. A timeout there is worse than a red test:
 * the file's `afterEach` unstubs the clipboard while a capture is still in
 * flight. The timeout is sized to the population, not to a guess at one test.
 */
vi.setConfig({ testTimeout: 60_000 })

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── The fixtures: the same documents for every locale ─────────────────────────
const FIXTURES = {
  openapi: SPEC,
  mcpTools: PRODUCTION_CATALOGUE,
  cliCommands: NEUTRAL_CLI_COMMANDS,
}

// ── A rendered route, captured once ───────────────────────────────────────────
interface Snapshot {
  /** The text outside `<code>`/`<pre>`, block boundaries kept (case 15). */
  prose: string
  /** Sentences of five words or more outside `lang="en"`, code and `<pre>` (case 16). */
  sentences: string[]
  /** Every link's `href` (case 12). */
  hrefs: string[]
  /** What the MCP catalogue page shows per tool and group (case 14). */
  mcp: McpFacts
  /** Every `<pre>`'s text, in order. */
  pre: string[]
  /** `<code>` outside `<pre>`, with whether it sits in a `lang="en"` region. */
  code: { text: string; english: boolean }[]
  ids: string[]
  /** What each copy control wrote to the clipboard, in order. */
  copied: string[]
}

const snapshots = new Map<string, Promise<Snapshot>>()

/*
 * ⚠️ ONE CAPTURE AT A TIME. A capture stubs `fetch` and the clipboard on the
 * global object and unstubs them when it is done, so two running together would
 * unstub each other's — a `Promise.all` over routes did exactly that.
 */
let queue: Promise<unknown> = Promise.resolve()

function snapshot(route: string, locale: Locale): Promise<Snapshot> {
  const key = `${locale} ${route}`
  let pending = snapshots.get(key)
  if (!pending) {
    pending = queue.then(() => capture(route, locale))
    queue = pending.catch(() => undefined)
    // A failed capture is not a snapshot: caching it would hand a later case a
    // partial page that fails somewhere unrelated to the cause.
    pending.catch(() => snapshots.delete(key))
    snapshots.set(key, pending)
  }
  return pending
}

async function capture(route: string, locale: Locale): Promise<Snapshot> {
  const ledger = stubDocsFetch(FIXTURES)
  const written: string[] = []
  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: {
      writeText: async (text: string) => {
        written.push(text)
      },
    },
  })
  const page = await renderDocsRoute(pageFileOf(route), locale)
  const { container } = page
  const result: Snapshot = {
    prose: proseText(container, 'code, pre', ' '),
    sentences: sentencesIn(container),
    hrefs: [...container.querySelectorAll('a')].map(
      (a) => a.getAttribute('href') ?? '',
    ),
    mcp: mcpFacts(container),
    pre: [...container.querySelectorAll('pre')].map((e) => e.textContent ?? ''),
    code: [...container.querySelectorAll('code')]
      .filter((e) => !e.closest('pre'))
      .map((e) => ({
        text: e.textContent ?? '',
        english: e.closest('[lang="en"]') !== null,
      })),
    ids: [...container.querySelectorAll('[id]')].map((e) => e.id),
    copied: [],
  }
  const buttons = [...container.querySelectorAll('button[data-state]')]
  for (const button of buttons) {
    await act(async () => {
      fireEvent.click(button)
    })
  }
  // The clipboard stub can be removed under a running capture (the file's
  // `afterEach` unstubs globals); a click then writes nowhere. Say so here.
  expect(
    written,
    `${locale} ${route}: copy controls wrote nowhere`,
  ).toHaveLength(buttons.length)
  result.copied = written
  page.unmount()
  vi.unstubAllGlobals()
  expect(ledger.unserved, `${locale} ${route}`).toEqual([])
  return result
}

/** What `/docs/mcp/tools` shows per tool and group — empty on every other page. */
interface McpFacts {
  ids: string[]
  /** `reads` / `writes` / `destructive`, per chip, in order: the chip's TEXT is the page's language, which chip a row wears is not. */
  hints: string[]
  tables: string[]
  /** Each group's and each summary's own `lang`, with a snippet to name it. */
  regions: { lang: string | null; text: string }[]
}

function mcpFacts(root: HTMLElement): McpFacts {
  const tools = [...root.querySelectorAll('[id^="tool-"]')]
  if (tools.length === 0) return { ids: [], hints: [], tables: [], regions: [] }
  const groups = [...root.querySelectorAll('h2')].map((h) => h.parentElement!)
  const summaries = tools.map((e) => e.closest('li')!.querySelector('p')!)
  return {
    ids: tools.map((e) => e.id),
    hints: [...root.querySelectorAll('[data-hint]')].map(
      (e) => e.getAttribute('data-hint') ?? '',
    ),
    tables: [...root.querySelectorAll('table')].map((t) =>
      (t.textContent ?? '').replace(/\s+/g, ' '),
    ),
    regions: [...groups, ...summaries].map((e) => ({
      lang: e.getAttribute('lang'),
      text: (e.textContent ?? '').slice(0, 40),
    })),
  }
}

const sorted = (list: string[]) => [...list].sort()

/** A difference between two lists, naming the first index. */
function difference(label: string, en: string[], other: string[]): string[] {
  const at = firstDifference(en, other)
  return at === -1
    ? []
    : [
        `${label} differs at index ${at}: en ${JSON.stringify(en[at])} vs ${JSON.stringify(other[at])}`,
      ]
}

// ── The detectors (exported shapes are pure, so the gate can test itself) ─────
/** The code spans a translated page owes, compared as a multiset (see case 7). */
export function codeProblems(
  en: Snapshot['code'],
  other: Snapshot['code'],
): string[] {
  const remaining = en.map((c) => c.text)
  const counted: string[] = []
  for (const span of other) {
    const at = span.english ? remaining.indexOf(span.text) : -1
    if (at !== -1) remaining.splice(at, 1)
    else counted.push(span.text)
  }
  return difference('inline code', sorted(remaining), sorted(counted))
}

const BLOCK =
  'p, li, h1, h2, h3, h4, h5, h6, td, th, tr, blockquote, div, ul, ol, table, button, section'

/** A detached element holding `html` — for the detectors' own unit cases. */
export function fromHtml(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  return root
}

/**
 * `root`'s text with every element matching `selector` replaced by
 * `replacement`, and a line break at each block boundary so a heading never
 * glues to the paragraph after it.
 */
export function proseText(
  root: HTMLElement,
  selector: string,
  replacement: string,
): string {
  const clone = root.cloneNode(true) as HTMLElement
  for (const element of clone.querySelectorAll(selector))
    element.replaceWith(replacement)
  for (const element of clone.querySelectorAll(BLOCK)) {
    element.before('\n')
    element.after('\n')
  }
  return clone.textContent ?? ''
}

/** `docs.notes.beingUpdated`-style leaf paths of a catalogue. */
export function leafPaths(node: unknown, prefix = ''): string[] {
  if (Array.isArray(node))
    return node.flatMap((v, i) =>
      leafPaths(v, prefix ? `${prefix}.${i}` : `${i}`),
    )
  if (node && typeof node === 'object')
    return Object.entries(node).flatMap(([k, v]) =>
      leafPaths(v, prefix ? `${prefix}.${k}` : k),
    )
  return [prefix]
}

const EN_CATALOGUE = JSON.parse(
  readFileSync('messages/en.json', 'utf8'),
) as unknown
const KEY_PATHS = new Set(leafPaths(EN_CATALOGUE))
const ICU_PLACEHOLDER = /\{[A-Za-z_]+(,|\})/
const MARKER = /\{\{(slot|value|part):/

/** Raw keys, template markers and unformatted placeholders in rendered prose. */
export function rawProblems(prose: string): string[] {
  const problems: string[] = []
  for (const token of prose.match(/[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+/g) ??
    []) {
    const parts = token.split('.')
    for (let from = 0; from < parts.length; from += 1)
      for (let to = from + 2; to <= parts.length; to += 1) {
        const path = parts.slice(from, to).join('.')
        if (KEY_PATHS.has(path)) problems.push(`raw key ${path}`)
      }
  }
  const marker = MARKER.exec(prose)
  if (marker) problems.push(`template marker ${marker[0]}`)
  // A URL path template (`/api/v1/things/{id}`) is the API's own text, in English
  // as in every language; it is not an ICU argument that failed to format.
  const placeholder = ICU_PLACEHOLDER.exec(
    prose.replace(/\S*\/\S*\{[^}\s]*\}\S*/g, ' '),
  )
  if (placeholder) problems.push(`unformatted placeholder ${placeholder[0]}`)
  return [...new Set(problems)]
}

/**
 * The sentences of five words or more outside `lang="en"`, `<code>` and `<pre>`.
 * An excluded element leaves a `§` so both languages' sentences keep one shape.
 */
export function sentencesIn(root: HTMLElement): string[] {
  return proseText(root, '[lang="en"], code, pre', '§')
    .split(/\n|(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => {
      // A value list (`epic · story · task`) and a product name
      // (`GitHub Copilot in VS Code`) are identifiers, not prose.
      if (sentence.includes(' · ')) return false
      const words = sentence
        .split(' ')
        .filter((word) => /[\p{L}\p{N}]/u.test(word) && word !== '§')
      const name = words.every(
        (word) => word.length <= 3 || /^[\p{Lu}\p{N}]/u.test(word),
      )
      return words.length >= 5 && !name
    })
}

/** English sentences that survive untranslated into the other language's prose. */
export function mixedProblems(en: string[], other: string[]): string[] {
  const left = new Set(other)
  return [...new Set(en)].filter((sentence) => left.has(sentence))
}

// ── Case 6 ────────────────────────────────────────────────────────────────────
describe('code blocks are byte-identical to English (case 6)', () => {
  it('has code blocks to compare', async () => {
    const lengths = await Promise.all(
      DOCS_ROUTES.map(
        async (route) => (await snapshot(route, 'en')).pre.length,
      ),
    )
    expect(lengths.reduce((a, b) => a + b, 0)).toBeGreaterThan(10)
  })

  for (const route of DOCS_ROUTES) {
    it.each(OTHER_LOCALES)(`${route} [%s]`, async (locale) => {
      const en = await snapshot(route, 'en')
      const other = await snapshot(route, locale)
      expect(difference('<pre>', en.pre, other.pre)).toEqual([])
    })
  }
})

// ── Case 7 ────────────────────────────────────────────────────────────────────
describe('inline code is the same multiset as English (case 7)', () => {
  it('names the difference, and skips only what both renders mark English', () => {
    const en = [
      { text: 'motir run', english: false },
      { text: 'zqGenerated', english: false },
    ]
    expect(codeProblems(en, [...en].reverse())).toEqual([])
    expect(
      codeProblems(en, [
        { text: 'motir run', english: false },
        { text: 'zqGenerated', english: true },
      ]),
    ).toEqual([])
    expect(
      codeProblems(en, [
        { text: 'motir ran', english: false },
        { text: 'zqGenerated', english: false },
      ]),
    ).not.toEqual([])
    // An English-region span the English render lacks still counts.
    expect(
      codeProblems(en, [...en, { text: 'extra', english: true }]),
    ).not.toEqual([])
  })

  for (const route of DOCS_ROUTES) {
    it.each(OTHER_LOCALES)(`${route} [%s]`, async (locale) => {
      const en = await snapshot(route, 'en')
      const other = await snapshot(route, locale)
      expect(codeProblems(en.code, other.code)).toEqual([])
    })
  }
})

// ── Case 8 ────────────────────────────────────────────────────────────────────
describe('every copy control copies the English payloads (case 8)', () => {
  it('has copy controls to click', async () => {
    const counts = await Promise.all(
      DOCS_ROUTES.map(
        async (route) => (await snapshot(route, 'en')).copied.length,
      ),
    )
    expect(counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(10)
  })

  for (const route of DOCS_ROUTES) {
    it.each(OTHER_LOCALES)(`${route} [%s]`, async (locale) => {
      const en = await snapshot(route, 'en')
      const other = await snapshot(route, locale)
      expect(difference('copied payload', en.copied, other.copied)).toEqual([])
    })
  }
})

// ── Case 9 ────────────────────────────────────────────────────────────────────
describe('every anchor id lands where the English one does (case 9)', () => {
  it('/docs/api carries an anchor for every operation, and the comparison sees them', async () => {
    const { ids } = await snapshot('/docs/api', 'en')
    const owed = listOperations(SPEC as never).map(operationAnchorId)
    expect(owed.length).toBeGreaterThan(0)
    for (const id of owed) expect(ids).toContain(id)
  })

  for (const route of DOCS_ROUTES) {
    it.each(OTHER_LOCALES)(`${route} [%s]`, async (locale) => {
      const en = await snapshot(route, 'en')
      const other = await snapshot(route, locale)
      expect(difference('id', sorted(en.ids), sorted(other.ids))).toEqual([])
    })
  }
})

// ── Case 11 ───────────────────────────────────────────────────────────────────
describe('the sandbox picker shows the library, byte for byte (case 11)', () => {
  it.each(LOCALES)('[%s] every profile', async (locale) => {
    stubDocsFetch(FIXTURES)
    const page = await renderDocsRoute(pageFileOf('/docs/sandbox'), locale)
    const radios = page.container.querySelectorAll('[role="radio"]')
    expect(radios).toHaveLength(SANDBOX_PICKER_OPTIONS.length)
    const problems: string[] = []
    for (const [index, { id }] of SANDBOX_PICKER_OPTIONS.entries()) {
      fireEvent.click(radios[index]!)
      if (radios[index]!.getAttribute('aria-checked') !== 'true')
        problems.push(`${id}: the radio did not select`)
      const pre = [...page.container.querySelectorAll('pre')].map(
        (e) => e.textContent,
      )
      if (pre.filter((text) => text === sandboxRunCommand(id)).length !== 1)
        problems.push(`${id}: the docker run block is not sandboxRunCommand`)
      if (
        pre.filter((text) => text === sandboxDevcontainerJson(id)).length !== 1
      )
        problems.push(
          `${id}: the dev-container block is not sandboxDevcontainerJson`,
        )
    }
    page.unmount()
    expect(problems).toEqual([])
  })
})

// ── Case 12 ───────────────────────────────────────────────────────────────────
const isKeyPath = (text: string) =>
  KEY_PATHS.has(text) || /^[a-z]+(\.[A-Za-z0-9]+)+$/.test(text)

describe("the surfaces list every route, in the reader's words (case 12)", () => {
  it.each(LOCALES)('[%s]', async (locale) => {
    const copy = await getCopy(locale)
    const rows: { href: string; label: string; description?: string }[] = [
      docsIndexFor(copy),
      ...docsSurfacesFor(copy).flatMap((s) => [s, ...s.pages]),
    ]
    expect(sorted(rows.map((row) => row.href))).toEqual(sorted(DOCS_ROUTES))
    for (const row of rows) {
      expect(row.label.trim(), row.href).not.toBe('')
      expect(isKeyPath(row.label), `${row.href} label ${row.label}`).toBe(false)
      // The index row is a rail label only; every other row owes a description.
      if (row.href !== DOCS_INDEX_HREF) {
        const description = row.description ?? ''
        expect(description.trim(), row.href).not.toBe('')
        expect(isKeyPath(description), `${row.href} description`).toBe(false)
      }
    }
    // The index page links each route at its own language's address.
    const { hrefs } = await snapshot(DOCS_INDEX_HREF, locale)
    for (const route of DOCS_ROUTES.filter((r) => r !== DOCS_INDEX_HREF))
      expect(hrefs, route).toContain(localizedPath(locale, route))
  })
})

// ── Case 13 ───────────────────────────────────────────────────────────────────
interface MetadataModule {
  generateMetadata: (props: ReturnType<typeof pageProps>) => Promise<{
    title?: unknown
    description?: unknown
  }>
}

/** The catalogue's source record for `locale`: key path → the English it was made from. */
function sourceRecord(locale: Locale): Record<string, string> {
  return JSON.parse(readFileSync(`messages/sources/${locale}.json`, 'utf8'))
}

/** English leaf values by path, for finding which key a metadata string came from. */
const EN_LEAVES = new Map(
  [...KEY_PATHS].map((path) => [
    path,
    path
      .split('.')
      .reduce<unknown>(
        (node, k) => (node as Record<string, unknown>)?.[k],
        EN_CATALOGUE,
      ),
  ]),
)

export function metadataProblems(
  locale: Locale,
  field: string,
  value: unknown,
  english: unknown,
): string[] {
  if (typeof value !== 'string' || value.trim() === '')
    return [`${field} is empty or not a string`]
  const problems: string[] = []
  for (const path of KEY_PATHS) {
    if (path.includes('.') && value.includes(path))
      problems.push(`${field} holds the key ${path}`)
  }
  if (ICU_PLACEHOLDER.test(value))
    problems.push(`${field} holds an ICU placeholder`)
  if (locale !== 'en' && value === english) {
    const record = sourceRecord(locale)
    const current = [...EN_LEAVES].some(
      ([path, text]) => text === english && record[path] === english,
    )
    if (!current)
      problems.push(
        `${field} is English and no source record shows it identical by design`,
      )
  }
  return problems
}

describe("page metadata is the page's own words (case 13)", () => {
  it('detects a key, a placeholder, an untranslated line', () => {
    expect(metadataProblems('de', 'title', 'docs.metaTitle', 'x')).not.toEqual(
      [],
    )
    expect(metadataProblems('de', 'title', 'Hello {name}', 'x')).not.toEqual([])
    expect(
      metadataProblems(
        'de',
        'title',
        'Untranslated title',
        'Untranslated title',
      ),
    ).not.toEqual([])
    expect(metadataProblems('de', 'title', '', 'x')).not.toEqual([])
  })

  for (const route of DOCS_ROUTES) {
    it.each(LOCALES)(`${route} [%s]`, async (locale) => {
      const pageModule = (await loadPage(
        pageFileOf(route),
      )) as unknown as MetadataModule
      const english = await pageModule.generateMetadata(pageProps('en'))
      const metadata = await pageModule.generateMetadata(pageProps(locale))
      expect([
        ...metadataProblems(locale, 'title', metadata.title, english.title),
        ...metadataProblems(
          locale,
          'description',
          metadata.description,
          english.description,
        ),
      ]).toEqual([])
    })
  }
})

// ── Case 14 ───────────────────────────────────────────────────────────────────
describe('the recorded MCP catalogue renders the same on every locale (case 14)', () => {
  const groups = (
    PRODUCTION_CATALOGUE as {
      groups: { label: string; tools: { name: string }[] }[]
    }
  ).groups

  it('has tools to compare', async () => {
    const { mcp } = await snapshot('/docs/mcp/tools', 'en')
    expect(mcp.ids).toHaveLength(groups.reduce((n, g) => n + g.tools.length, 0))
    expect(mcp.hints.length).toBeGreaterThan(10)
    expect(mcp.tables.length).toBeGreaterThan(10)
  })

  it.each(OTHER_LOCALES)('[%s]', async (locale) => {
    const en = (await snapshot('/docs/mcp/tools', 'en')).mcp
    const other = (await snapshot('/docs/mcp/tools', locale)).mcp

    expect(difference('tool id', en.ids, other.ids)).toEqual([])
    expect(difference('hint chip', en.hints, other.hints)).toEqual([])
    expect(difference('argument table', en.tables, other.tables)).toEqual([])

    // The fixture has no locale fields (an older server): all of it is English.
    expect(other.regions).toHaveLength(groups.length + en.ids.length)
    for (const region of other.regions)
      expect(region.lang, region.text).toBe('en')
  })
})

// ── Cases 15 and 16 ───────────────────────────────────────────────────────────
describe('the detectors fire on what they exist for (cases 15–17)', () => {
  it('raw: a key path, a marker, a placeholder', () => {
    expect(rawProblems('Run it. docs.notes.beingUpdated now')).toEqual([
      'raw key docs.notes.beingUpdated',
    ])
    expect(rawProblems('See {{slot:run}}')).not.toEqual([])
    expect(rawProblems('Hello {name}')).not.toEqual([])
    expect(rawProblems('POST /api/v1/things/{id}/archive')).toEqual([])
    expect(rawProblems('Visit app.motir.co or v1.2.3 or e.g. this')).toEqual([])
  })

  it('mixed: an English sentence inside a translated page, but not inside lang="en" or code', () => {
    const sentences = (html: string) => sentencesIn(fromHtml(html))
    const en = sentences('<p>Run the container on your own machine today.</p>')
    expect(
      mixedProblems(
        en,
        sentences('<p>Hallo. Run the container on your own machine today.</p>'),
      ),
    ).toEqual(['Run the container on your own machine today.'])
    expect(
      mixedProblems(
        en,
        sentences(
          '<div lang="en"><p>Run the container on your own machine today.</p></div>',
        ),
      ),
    ).toEqual([])
    expect(
      mixedProblems(en, sentences('<p>Führen Sie den Container aus.</p>')),
    ).toEqual([])
    // Product names and value lists are not sentences.
    const names = sentences(
      '<p>GitHub Copilot in VS Code</p><p>epic · story · task · bug · subtask</p>',
    )
    expect(mixedProblems(names, names)).toEqual([])
  })

  it('fallback: an honest page passes, a translated body outside lang="en" does not', () => {
    const honest = fromHtml(
      '<div role="note"><p>Wird aktualisiert.</p></div><div lang="en"><h2>Why</h2><p>This is the English body of the page.</p></div>',
    )
    expect(fallbackProblems(honest, 'Wird aktualisiert.')).toEqual([])
    const dishonest = fromHtml(
      '<div role="note"><p>Wird aktualisiert.</p></div><div lang="en"><p>English.</p></div><h2>Ein deutscher Titel</h2>',
    )
    expect(fallbackProblems(dishonest, 'Wird aktualisiert.')).not.toEqual([])
    expect(fallbackProblems(honest, 'Something else')).not.toEqual([])
  })
})

describe('no raw key, marker or placeholder reaches a reader (case 15)', () => {
  for (const route of DOCS_ROUTES) {
    it.each(OTHER_LOCALES)(`${route} [%s]`, async (locale) => {
      expect(rawProblems((await snapshot(route, locale)).prose)).toEqual([])
    })
  }
})

/*
 * ── TWO FINDINGS THE GATE MADE, kept visible rather than loosened ───────────
 * Both routes render a SERVED English string in a translated page with no
 * `lang="en"` on it, so case 16 reads it as an English sentence left behind —
 * which, to a screen reader and a translator alike, it is:
 *
 *   · `/docs/mcp` — the scope table's `gates` cell (`{group.gates}`,
 *     `app/[locale]/docs/(guides)/mcp/McpRoute.tsx`) is the catalogue's English
 *     sentence in a bare `<td>`.
 *   · `/docs/mcp/tools` — `ToolArguments` renders each argument's served
 *     `description` in a bare `<td>`; `SchemaTable` has a `descriptionLang`
 *     prop for exactly this and the tools page does not pass it.
 *
 * The strict case is `it.skip` with the evidence (delete the entry when the page
 * marks the text). Beside it an ACTIVE case runs the same detector over the same
 * page with the served strings taken out, so the page's authored prose is still
 * held to it. No Motir bug can be filed from the run that found these.
 */
const UNMARKED_SERVED_TEXT: Record<string, string> = {}

const SERVED_STRINGS = (function strings(node: unknown): string[] {
  if (typeof node === 'string') return [node.replace(/\s+/g, ' ').trim()]
  if (Array.isArray(node)) return node.flatMap(strings)
  if (node && typeof node === 'object')
    return Object.values(node).flatMap(strings)
  return []
})(PRODUCTION_CATALOGUE)

const isServed = (sentence: string) =>
  SERVED_STRINGS.some((served) => served.includes(sentence))

describe('no English sentence is left in a translated page (case 16)', () => {
  it('has English sentences to look for', async () => {
    const counts = await Promise.all(
      DOCS_ROUTES.map(
        async (route) => (await snapshot(route, 'en')).sentences.length,
      ),
    )
    expect(counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(200)
  })

  async function leftBehind(
    route: string,
    locale: Locale,
  ): Promise<string[] | null> {
    const slug = slugOf(route)
    // A page showing the English body is wholly English by design (case 17).
    if (slug !== null && resolveDocsDocument(slug, locale).fallback !== null)
      return null
    const en = await snapshot(route, 'en')
    const other = await snapshot(route, locale)
    return mixedProblems(en.sentences, other.sentences)
  }

  for (const route of DOCS_ROUTES) {
    const unmarked = UNMARKED_SERVED_TEXT[route]
    const run = unmarked ? it.skip : it
    run.each(OTHER_LOCALES)(
      `${route} [%s]${unmarked ? ` — ${unmarked}` : ''}`,
      async (locale) => {
        expect((await leftBehind(route, locale)) ?? []).toEqual([])
      },
    )
    if (unmarked) {
      it.each(OTHER_LOCALES)(
        `${route} [%s] (served catalogue text excluded)`,
        async (locale) => {
          const found = (await leftBehind(route, locale)) ?? []
          expect(found.filter((sentence) => !isServed(sentence))).toEqual([])
        },
      )
    }
  }
})

// ── Case 17 ───────────────────────────────────────────────────────────────────
describe('a fallback page is wholly English, honestly marked (case 17)', () => {
  // Expected empty at this item's base; the mechanism is proved on the
  // temporary tree in `localeCoverage.test.ts` (case 18). When a page does go
  // stale in a real locale, this holds it to the design's rule.
  const stale = DOCS_ROUTES.flatMap((route) => {
    const slug = slugOf(route)
    return slug === null
      ? []
      : OTHER_LOCALES.filter(
          (l) => resolveDocsDocument(slug, l).fallback !== null,
        ).map((locale) => [route, locale] as const)
  })

  it.each(stale)('%s [%s]', async (route, locale) => {
    stubDocsFetch(FIXTURES)
    const page = await renderDocsRoute(pageFileOf(route), locale)
    expect(
      fallbackProblems(
        page.container,
        (await getCopy(locale)).docs.notes.beingUpdated,
      ),
    ).toEqual([])
    page.unmount()
  })

  it('reads the English note as the fallback of last resort', () => {
    expect(englishCopy.docs.notes.beingUpdated).not.toBe('')
  })
})
