import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
// Relative, type-only: `scripts/docs/revisions.ts` runs this file under plain Node,
// where the `@/` alias does not resolve.
import type { Locale } from '../i18n/routing.ts'

const DEFAULT_LOCALE: Locale = 'en'

/*
 * The per-language /docs document form (MOTIR-8032, story MOTIR-7739).
 *
 * A /docs page's prose lives at `content/docs/<slug>/<locale>.md`; `en.md` is
 * the source. This module is the whole contract: how a document is read, what it
 * may contain, which English revision a translation was made from, and which
 * document a reader is shown. `content/docs/README.md` is the authoring half.
 *
 * ⚠️ WHAT A DOCUMENT MAY NOT CONTAIN, AND WHY. Anything a reader copies — a
 * command, a `docker run`, a copy button's payload, a generated table — is a
 * block SLOT (`{{slot:name}}` alone on a line), resolved from a map the page
 * passes in. A fenced code block is therefore a load error: no translation can
 * contain, and so restate, a command. The same goes for values the prose must
 * not restate (a release tag, a URL built from configuration, a date): they are
 * inline VALUES (`{{value:name}}`), also resolved by the page.
 *
 * ⚠️ EVERY HEADING CARRIES AN EXPLICIT ANCHOR (`## Title {#anchor-id}`), used
 * verbatim, so a translated heading keeps the English anchor and a `#…` deep
 * link survives the locale prefix.
 *
 * ⚠️ STALENESS IS A LEDGER OF HASHES, NOT A COPY OF THE ENGLISH. Each page keeps
 * `content/docs/<slug>/revisions.json`, every English revision as
 * `{ revision, recordedAt }`, newest last; a translation opens with
 * `source: <revision>`. A translation made from the last revision is current; one
 * made from an older entry is STALE (the English page is shown instead); one
 * naming a revision the ledger has never held is an error, so a typo or a
 * hand-edited hash cannot pass as "current". Whole-page text per locale would be
 * ten copies of every guide; `git log -p` on `en.md` shows what changed.
 */

/*
 * ⚠️ ONE ROOT, READ AT BUILD (MOTIR-10645). Every /docs page is a file the
 * static build writes, so a document is read once, at build time, from
 * `<cwd>/content/docs`. The browser lane's per-request root
 * (`MOTIR_DOCS_LIVE_CONTENT_ROOT`, MOTIR-8072) went with the per-request render
 * it served: a built page has no request to read a document for.
 */
export const DOCS_CONTENT_ROOT = join(process.cwd(), 'content', 'docs')

export type DocsFallback = null | 'stale' | 'missing'

export interface DocsDocumentText {
  /** The Markdown body: front matter stripped, validated. */
  markdown: string
  /** The English revision a translation was made from; `undefined` for `en.md`. */
  source: string | undefined
  /** The file it was read from, for messages. */
  file: string
  /** The file line the body's first line is on (after front matter), for messages. */
  bodyStartLine: number
}

export interface ResolvedDocsDocument {
  document: DocsDocumentText
  /** The locale of the document actually returned. */
  shownLocale: Locale
  fallback: DocsFallback
}

export interface LedgerEntry {
  revision: string
  recordedAt: string
}

// No parameter properties: this file runs under plain Node's type stripping.
export class DocsDocumentError extends Error {
  file: string
  line: number | undefined
  constructor(file: string, message: string, line?: number) {
    super(`${file}${line === undefined ? '' : `:${line}`}: ${message}`)
    this.name = 'DocsDocumentError'
    this.file = file
    this.line = line
  }
}

/** First 12 hex of the SHA-256 of the text, line endings normalised to LF. */
export function revisionOf(text: string): string {
  return createHash('sha256')
    .update(text.replace(/\r\n/g, '\n'))
    .digest('hex')
    .slice(0, 12)
}

const REVISION = /^[0-9a-f]{12}$/
const ANCHOR = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SLOT_LINE = /^\{\{slot:([a-z][A-Za-z0-9_-]*)\}\}$/
const PART_LINE = /^\{\{part:([a-z][A-Za-z0-9_-]*)\}\}$/
const VALUE = /\{\{value:([a-z][A-Za-z0-9_-]*)\}\}/g
const HEADING = /^(#{1,6})\s+(.*)$/
const HEADING_ANCHOR = /\s+\{#([^}\s]*)\}\s*$/
const FENCE = /^ {0,3}(```|~~~)/

/** Split a raw file into its front matter's `source` and its body. */
export function parseDocumentFile(
  raw: string,
  file: string,
): { source: string | undefined; body: string; bodyStartLine: number } {
  const text = raw.replace(/\r\n/g, '\n')
  if (!text.startsWith('---\n')) {
    return { source: undefined, body: text, bodyStartLine: 1 }
  }
  const end = text.indexOf('\n---\n', 3)
  if (end === -1) {
    throw new DocsDocumentError(
      file,
      'front matter is not closed with `---`',
      1,
    )
  }
  const block = text.slice(4, end)
  const match = /^source: ([0-9a-f]{12})$/.exec(block)
  if (!match) {
    throw new DocsDocumentError(
      file,
      `front matter must be exactly one line, \`source: <12 hex>\` (got ${JSON.stringify(block)})`,
      2,
    )
  }
  const body = text.slice(end + 5)
  return {
    source: match[1],
    body,
    bodyStartLine: text.slice(0, end + 5).split('\n').length,
  }
}

/** Throws on anything a document may not contain; the message names file and line. */
export function validateBody(
  body: string,
  file: string,
  bodyStartLine = 1,
): void {
  const lines = body.split('\n')
  const seenParts = new Set<string>()
  for (const [index, line] of lines.entries()) {
    const at = bodyStartLine + index
    if (FENCE.test(line)) {
      throw new DocsDocumentError(
        file,
        'a fenced code block cannot appear in a document — put it in a slot (`{{slot:name}}`)',
        at,
      )
    }
    const heading = HEADING.exec(line)
    if (heading) {
      const anchor = HEADING_ANCHOR.exec(line)
      if (!anchor || !ANCHOR.test(anchor[1]!)) {
        throw new DocsDocumentError(
          file,
          `heading has no explicit anchor — write \`${heading[1]} Title {#anchor-id}\` (lowercase, hyphen-separated)`,
          at,
        )
      }
    }
    const part = PART_LINE.exec(line.trim())
    if (part) {
      const name = part[1]!
      if (name === 'body' || seenParts.has(name)) {
        throw new DocsDocumentError(
          file,
          name === 'body'
            ? '`body` is reserved for the text before the first `{{part:…}}` marker'
            : `duplicate part name "${name}"`,
          at,
        )
      }
      seenParts.add(name)
      continue
    }
    if (/\{\{\s*part:/.test(line)) {
      throw new DocsDocumentError(
        file,
        'a part marker must be alone on its own line: `{{part:name}}`',
        at,
      )
    }
    const slot = SLOT_LINE.exec(line.trim())
    const withoutValues = line.replace(VALUE, '')
    if (slot === null && /\{\{\s*slot:/.test(line)) {
      throw new DocsDocumentError(
        file,
        'a slot must be alone on its own line: `{{slot:name}}`',
        at,
      )
    }
    if (slot === null && /\{\{/.test(withoutValues)) {
      throw new DocsDocumentError(
        file,
        'unknown `{{…}}` syntax — only `{{slot:name}}` and `{{part:name}}` (own line) and `{{value:name}}` exist',
        at,
      )
    }
  }
}

export function readLedger(
  slug: string,
  root: string = DOCS_CONTENT_ROOT,
): LedgerEntry[] {
  const file = join(root, slug, 'revisions.json')
  if (!existsSync(file)) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    throw new DocsDocumentError(
      file,
      `not valid JSON: ${(error as Error).message}`,
    )
  }
  if (!Array.isArray(parsed)) {
    throw new DocsDocumentError(
      file,
      'must be a JSON array of { revision, recordedAt }',
    )
  }
  return parsed.map((entry, index) => {
    const e = entry as Partial<LedgerEntry> | null
    if (
      !e ||
      typeof e.revision !== 'string' ||
      !REVISION.test(e.revision) ||
      typeof e.recordedAt !== 'string'
    ) {
      throw new DocsDocumentError(
        file,
        `entry ${index} must be { revision: <12 hex>, recordedAt: <ISO date> }`,
      )
    }
    return { revision: e.revision, recordedAt: e.recordedAt }
  })
}

function readDocument(
  slug: string,
  locale: Locale,
  root: string,
): DocsDocumentText | null {
  const file = join(root, slug, `${locale}.md`)
  if (!existsSync(file)) return null
  const { source, body, bodyStartLine } = parseDocumentFile(
    readFileSync(file, 'utf8'),
    file,
  )
  validateBody(body, file, bodyStartLine)
  if (locale === DEFAULT_LOCALE && source !== undefined) {
    throw new DocsDocumentError(
      file,
      'the English source carries no front matter',
      1,
    )
  }
  return { markdown: body, source, file, bodyStartLine }
}

/**
 * The document a reader is shown for `slug` in `locale`.
 *
 *   en                                   → en.md, no fallback
 *   file exists, source = ledger's last  → the translation
 *   file exists, source = an older entry → en.md, 'stale'
 *   no file                              → en.md, 'missing'
 *   file exists, source not in ledger    → throws (the build failure)
 */
export function resolveDocsDocument(
  slug: string,
  locale: Locale,
  root: string = DOCS_CONTENT_ROOT,
): ResolvedDocsDocument {
  const english = readDocument(slug, DEFAULT_LOCALE, root)
  if (english === null) {
    throw new DocsDocumentError(
      join(root, slug, 'en.md'),
      'the English source does not exist',
    )
  }
  if (locale === DEFAULT_LOCALE) {
    return { document: english, shownLocale: DEFAULT_LOCALE, fallback: null }
  }
  const translation = readDocument(slug, locale, root)
  if (translation === null) {
    return {
      document: english,
      shownLocale: DEFAULT_LOCALE,
      fallback: 'missing',
    }
  }
  if (translation.source === undefined) {
    throw new DocsDocumentError(
      translation.file,
      'a translation opens with front matter `source: <revision>` naming the English it was made from',
      1,
    )
  }
  const ledger = readLedger(slug, root)
  const index = ledger.findIndex(
    (entry) => entry.revision === translation.source,
  )
  if (index === -1) {
    throw new DocsDocumentError(
      translation.file,
      `source ${translation.source} is not a revision of ${slug}/en.md (the ledger holds ${
        ledger.length === 0 ? 'none' : ledger.map((e) => e.revision).join(', ')
      })`,
      1,
    )
  }
  if (index === ledger.length - 1) {
    return { document: translation, shownLocale: locale, fallback: null }
  }
  return { document: english, shownLocale: DEFAULT_LOCALE, fallback: 'stale' }
}

export interface DocumentInvariants {
  slots: string[]
  values: string[]
  /** `{{part:name}}` markers in order (the text before the first is the implicit `body`). */
  parts: string[]
  inlineCode: string[]
  hrefs: string[]
  anchors: string[]
}

/**
 * What a translation must keep identical to its English, in document order.
 * The per-page, per-locale comparison is the coverage gate's; this is the
 * extractor.
 */
export function documentInvariants(markdown: string): DocumentInvariants {
  const slots: string[] = []
  const parts: string[] = []
  const anchors: string[] = []
  for (const line of markdown.split('\n')) {
    const slot = SLOT_LINE.exec(line.trim())
    if (slot) slots.push(slot[1]!)
    const part = PART_LINE.exec(line.trim())
    if (part) parts.push(part[1]!)
    const anchor = HEADING.test(line) ? HEADING_ANCHOR.exec(line) : null
    if (anchor) anchors.push(anchor[1]!)
  }
  return {
    slots,
    values: [...markdown.matchAll(VALUE)].map((m) => m[1]!),
    parts,
    inlineCode: [...markdown.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]!),
    hrefs: [...markdown.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(
      (m) => m[1]!,
    ),
    anchors,
  }
}

/** The placeholder a non-string value leaves in the Markdown, filled in at render. */
export const VALUE_MARK_OPEN = '\uE000'
export const VALUE_MARK_CLOSE = '\uE001'

/**
 * Resolve `{{value:name}}` against the page's `values`.
 *
 * A STRING is substituted into the Markdown before it is parsed, so it works in a
 * paragraph, a table cell, an inline code span and a link destination alike (and
 * must be one plain line: no newline, no backtick). Any other value (a React node
 * the page renders — its own `<code>`, a link) leaves a placeholder the renderer
 * fills in; a node cannot go inside backticks, which are literal, so that is an
 * error naming the file and line. An unresolved name throws.
 */
export function substituteValues(
  markdown: string,
  values: Record<string, unknown>,
  file: string,
  bodyStartLine = 1,
): string {
  return markdown
    .split('\n')
    .map((line, index) =>
      line.replace(VALUE, (whole, name: string, offset: number) => {
        const at = bodyStartLine + index
        if (!(name in values) || values[name] === undefined) {
          throw new DocsDocumentError(
            file,
            `no value named "${name}" was passed to the renderer`,
            at,
          )
        }
        const value = values[name]
        if (typeof value === 'string') {
          if (/[\n`]/.test(value)) {
            throw new DocsDocumentError(
              file,
              `value "${name}" must be a plain one-line string (no newline, no backtick)`,
              at,
            )
          }
          return value
        }
        const backticksBefore = (line.slice(0, offset).match(/`/g) ?? []).length
        if (backticksBefore % 2 === 1) {
          throw new DocsDocumentError(
            file,
            `value "${name}" is not a string, so it cannot sit inside backticks (they are literal) — pass a string, or move it out of the code span`,
            at,
          )
        }
        return `${VALUE_MARK_OPEN}${name}${VALUE_MARK_CLOSE}`
      }),
    )
    .join('\n')
}

/** Split a document body into its named parts: text before the first marker is `body`. */
export function splitParts(
  markdown: string,
): Array<{ name: string; text: string }> {
  const parts: Array<{ name: string; text: string }> = []
  let name = 'body'
  let run: string[] = []
  const flush = (final: boolean) => {
    const text = run.join('\n')
    if (final || name !== 'body' || text.trim().length > 0)
      parts.push({ name, text })
    run = []
  }
  for (const line of markdown.split('\n')) {
    const marker = PART_LINE.exec(line.trim())
    if (marker) {
      flush(false)
      name = marker[1]!
    } else {
      run.push(line)
    }
  }
  flush(true)
  return parts
}

/** Split a body into Markdown runs and slot names, in order. */
export function splitSlots(
  markdown: string,
): Array<{ kind: 'markdown'; text: string } | { kind: 'slot'; name: string }> {
  const parts: Array<
    { kind: 'markdown'; text: string } | { kind: 'slot'; name: string }
  > = []
  let run: string[] = []
  const flush = () => {
    const text = run.join('\n')
    if (text.trim().length > 0) parts.push({ kind: 'markdown', text })
    run = []
  }
  for (const line of markdown.split('\n')) {
    const slot = SLOT_LINE.exec(line.trim())
    if (slot) {
      flush()
      parts.push({ kind: 'slot', name: slot[1]! })
    } else {
      run.push(line)
    }
  }
  flush()
  return parts
}

/**
 * A date for prose, in the reader's locale (`Intl.DateTimeFormat`): a German page
 * never reads "6 October 2026". The page passes the result as a `{{value:…}}`.
 * UTC, so the day does not move with the server's zone.
 */
export function formatDocsDate(locale: Locale, isoDate: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(isoDate))
}

// ── The revision ledger's writers and the tree check (`docs:revisions`) ─────

/** Every page slug under `root`: a directory holding `en.md`, however deep. */
export function listSlugs(root: string = DOCS_CONTENT_ROOT): string[] {
  const slugs: string[] = []
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory())
        walk(join(dir, entry.name), `${prefix}${entry.name}/`)
    }
    if (existsSync(join(dir, 'en.md')) && prefix !== '')
      slugs.push(prefix.slice(0, -1))
  }
  if (existsSync(root)) walk(root, '')
  return slugs.sort()
}

/**
 * Append the CURRENT English revision to the page's ledger, once. Idempotent: a
 * ledger already ending in this revision is left alone. Returns what happened.
 */
export function recordRevision(
  slug: string,
  root: string = DOCS_CONTENT_ROOT,
  now: Date = new Date(),
): { revision: string; recorded: boolean } {
  const english = join(root, slug, 'en.md')
  if (!existsSync(english)) {
    throw new DocsDocumentError(english, 'the English source does not exist')
  }
  const { body, bodyStartLine } = parseDocumentFile(
    readFileSync(english, 'utf8'),
    english,
  )
  validateBody(body, english, bodyStartLine)
  const revision = revisionOf(readFileSync(english, 'utf8'))
  const ledger = readLedger(slug, root)
  if (ledger[ledger.length - 1]?.revision === revision)
    return { revision, recorded: false }
  mkdirSync(join(root, slug), { recursive: true })
  writeFileSync(
    join(root, slug, 'revisions.json'),
    `${JSON.stringify(
      [...ledger, { revision, recordedAt: now.toISOString().slice(0, 10) }],
      null,
      2,
    )}\n`,
  )
  return { revision, recorded: true }
}

/**
 * Every problem in the tree, as messages. Empty means consistent. Two kinds of
 * failure, both naming the file: a translation whose `source` the ledger never
 * held ("never existed"), and an `en.md` whose hash is not the ledger's last
 * entry (English edited without `docs:revisions record <slug>`). A stale
 * translation is NOT a problem here — staleness is a state, not a defect.
 */
export function checkDocsTree(root: string = DOCS_CONTENT_ROOT): string[] {
  const problems: string[] = []
  for (const slug of listSlugs(root)) {
    const dir = join(root, slug)
    try {
      const english = join(dir, 'en.md')
      const raw = readFileSync(english, 'utf8')
      const parsed = parseDocumentFile(raw, english)
      validateBody(parsed.body, english, parsed.bodyStartLine)
      if (parsed.source !== undefined) {
        throw new DocsDocumentError(
          english,
          'the English source carries no front matter',
          1,
        )
      }
      const ledger = readLedger(slug, root)
      const last = ledger[ledger.length - 1]?.revision
      const current = revisionOf(raw)
      if (last !== current) {
        problems.push(
          `${english}: its revision ${current} is not the ledger's last entry (${last ?? 'empty ledger'}) — run \`pnpm docs:revisions record ${slug}\``,
        )
      }
      for (const name of readdirSync(dir)) {
        if (!name.endsWith('.md') || name === 'en.md') continue
        const file = join(dir, name)
        const doc = parseDocumentFile(readFileSync(file, 'utf8'), file)
        validateBody(doc.body, file, doc.bodyStartLine)
        if (doc.source === undefined) {
          problems.push(
            `${file}:1: a translation opens with front matter \`source: <revision>\``,
          )
        } else if (!ledger.some((entry) => entry.revision === doc.source)) {
          problems.push(
            `${file}:1: source ${doc.source} is not a revision of ${slug}/en.md — it never existed (the ledger holds ${ledger.map((e) => e.revision).join(', ') || 'none'})`,
          )
        }
      }
    } catch (error) {
      if (error instanceof DocsDocumentError) problems.push(error.message)
      else throw error
    }
  }
  return problems
}
