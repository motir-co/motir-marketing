import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DATA_PRIVACY_PANE } from '../destinations'
import { LEGAL_DIR, legalSlugsIn } from './slugs'

/**
 * The legal-document loader — a PORT of motir-core's `lib/legal/documents.ts`
 * (MOTIR-1134), moved into `motir-marketing` with the documents it reads
 * (MOTIR-4009). The parser and comparator are exported PURE so their tests
 * travel with them; only `LEGAL_DIR` changed.
 *
 * `content/legal/*.md` holds the published legal set. This module is the ONE
 * place that reads it, so the routes, the index and the footer all agree about
 * which documents exist and what each one is called.
 *
 * ── ⚠️ THE DIRECTORY IS THE REGISTRY, and that is the whole design ──────────
 * Nothing here enumerates slugs. A document ships by EXISTING and no route
 * table has to be edited to add one. That is not tidiness, it is a defect the
 * source story already hit: the card was written for SIX documents, and a
 * hardcoded list of six would have shipped a subprocessor page linking to a
 * 404. The set has grown during the source story alone, so the cost of a list
 * is paid repeatedly and the cost of a glob is paid once.
 *
 * ── Front matter is parsed here rather than by a dependency ─────────────────
 * The shape is fixed and tiny — five scalar keys, no nesting, no arrays — and
 * this repository has no YAML parser. Adding one would be a new dependency and
 * a new thing to keep current, for a grammar this file handles in fifteen
 * lines. (This is the same reason the source repo wrote it by hand.)
 */

/**
 * The front-matter value that means "no date is set yet".
 *
 * ⚠️ It must NEVER reach a rendered page. `TBD` is a note to ourselves in a file
 * a customer will read, and a published policy whose effective date literally
 * says "TBD" reads as unfinished rather than as not-yet-in-force. It is mapped
 * to a `null` `effectiveDate` here, and the pages branch on that null.
 */
const NOT_YET_SET = 'TBD'

export interface LegalDocument {
  /** URL slug — the filename without its extension. `/legal/<slug>`. */
  slug: string
  /** Human title, from front matter. */
  title: string
  /** Version string, verbatim from the front matter — `1.0.0`. */
  version: string
  /** The effective date, or `null` when it is not yet set. */
  effectiveDate: string | null
  /** Front-matter status, e.g. `approved`. */
  status: string
  /** One human sentence saying what MOVED in this version, or `null`. */
  changeSummary: string | null
  /** The Markdown body, front matter removed. */
  body: string
}

/**
 * The order documents are listed in — most-asked-for first, not alphabetical.
 *
 * A document NOT named here still appears; it sorts after the known ones, by
 * slug. So this array shapes presentation and can never hide a document, which
 * is the property that matters: a stale ordering list is a cosmetic problem, a
 * stale ROUTING list is a 404 on a legal page.
 */
const PREFERRED_ORDER = [
  'terms',
  'privacy',
  'cookies',
  'acceptable-use',
  'dpa',
  'subprocessors',
  'model-providers',
]

/** Split `---\n…\n---\n` off the top of a file. Returns the pairs and the rest. */
function splitFrontMatter(source: string): {
  meta: Map<string, string>
  body: string
} {
  const meta = new Map<string, string>()
  if (!source.startsWith('---\n')) return { meta, body: source }

  const end = source.indexOf('\n---\n', 4)
  if (end === -1) return { meta, body: source }

  for (const line of source.slice(4, end).split('\n')) {
    const at = line.indexOf(':')
    if (at === -1) continue
    meta.set(line.slice(0, at).trim(), line.slice(at + 1).trim())
  }
  return { meta, body: source.slice(end + 5) }
}

/**
 * Parse one document from its raw source. Exported because it is the whole of
 * this module's logic and it is PURE — every branch that matters (a missing
 * title, `TBD`, an absent date, a file with no front matter) is reachable from
 * a string, with no fixture directory to build and no filesystem to stub.
 */
export function parseLegalDocument(
  slug: string,
  source: string,
): LegalDocument {
  const { meta, body } = splitFrontMatter(source)
  const effectiveDate = meta.get('effectiveDate') ?? ''
  return {
    slug,
    // A document with no `title:` falls back to its slug rather than rendering
    // an empty heading — the page still works, and the omission is visible.
    title: meta.get('title') || slug,
    version: meta.get('version') ?? '',
    effectiveDate:
      effectiveDate === '' || effectiveDate === NOT_YET_SET
        ? null
        : effectiveDate,
    status: meta.get('status') ?? '',
    // An absent key and an empty value both mean "no sentence written", so the
    // renderer branches on ONE thing.
    changeSummary: meta.get('changeSummary') || null,
    body,
  }
}

/**
 * ── ⚠️ A DOCUMENT NAMES A CROSS-ORIGIN DOOR BY TOKEN, NEVER BY URL (MOTIR-4147) ──
 *
 * A published document is a static file, so it cannot import
 * `lib/destinations.ts` the way the footer does — and the two ways of writing
 * the link into the file itself are both wrong:
 *
 * - a BARE PATH (`/settings/account/data`) is what shipped, and it is a 404.
 *   It was written while these documents lived on `app.motir.co`, where it
 *   resolved; the port to `motir.co` (MOTIR-4009) carried them byte for byte,
 *   which is exactly what that card asked for, and this link was the one line
 *   that needed editing precisely BECAUSE the host changed under it.
 * - a HARDCODED ORIGIN (`https://app.motir.co/...`) is the failure
 *   `lib/appOrigin.ts` exists to prevent: it works perfectly in production and
 *   silently points a preview build's readers at production data.
 *
 * So the document names a DESTINATION and this module resolves it, which is
 * the same "one configured origin, many doors" shape `lib/destinations.ts`
 * already gives every other cross-origin link on this site.
 */

/** The `{{TOKEN}}` form a document writes a cross-origin destination as. */
const DESTINATION_TOKEN = /\{\{([A-Z0-9_]+)\}\}/g

/**
 * Every destination a legal document may name. Adding one is adding a line
 * here; naming one that is not here is a BUILD failure rather than a link a
 * reader discovers (below).
 */
export const DOCUMENT_DESTINATIONS: Readonly<Record<string, string>> = {
  DATA_PRIVACY_PANE,
}

/** Thrown when a document names a destination this module cannot resolve. */
export class UnknownLegalDestinationError extends Error {
  override readonly name = 'UnknownLegalDestinationError'

  constructor(token: string, known: string[]) {
    super(
      `A legal document names the destination {{${token}}}, which is not one ` +
        `of ${known.join(', ')}. Add it to DOCUMENT_DESTINATIONS in ` +
        `lib/legal/documents.ts, or fix the token.`,
    )
  }
}

/**
 * Resolve every `{{TOKEN}}` in a document body. Pure and exported — the
 * substitution table is a parameter so a test can drive it with a known origin
 * rather than the ambient one.
 *
 * ⚠️ AN UNKNOWN TOKEN THROWS. `/legal/[slug]` is statically generated
 * (`generateStaticParams`), so the throw lands in `next build` with the token's
 * name in it — the same trade `lib/appOrigin.ts` makes, and for the same
 * reason: leaving `{{DATA_PRIVACY_PAIN}}` in the rendered prose of a published
 * legal document is worse than failing the build that produced it.
 */
export function expandDestinations(
  body: string,
  destinations: Readonly<Record<string, string>> = DOCUMENT_DESTINATIONS,
): string {
  return body.replace(DESTINATION_TOKEN, (_match, token: string) => {
    const value = destinations[token]
    if (value === undefined) {
      throw new UnknownLegalDestinationError(token, Object.keys(destinations))
    }
    return value
  })
}

/** Every published legal document, in `PREFERRED_ORDER` then by slug. */
export function listLegalDocuments(): LegalDocument[] {
  return legalSlugsIn()
    .map((slug) => {
      const doc = parseLegalDocument(
        slug,
        readFileSync(join(LEGAL_DIR, `${slug}.md`), 'utf8'),
      )
      // The ONE place the documents are read is the one place their
      // destinations are resolved, so every consumer — the route, the index,
      // and the reachability guard — sees the body a reader sees.
      return { ...doc, body: expandDestinations(doc.body) }
    })
    .sort(byPreferredOrder)
}

/**
 * The list comparator: `PREFERRED_ORDER` first, then unknown slugs
 * alphabetically. Exported and pure for the same reason `parseLegalDocument`
 * is.
 */
export function byPreferredOrder(
  a: { slug: string },
  b: { slug: string },
): number {
  const ai = PREFERRED_ORDER.indexOf(a.slug)
  const bi = PREFERRED_ORDER.indexOf(b.slug)
  if (ai !== -1 && bi !== -1) return ai - bi
  if (ai !== -1) return -1
  if (bi !== -1) return 1
  return a.slug.localeCompare(b.slug)
}

/** Every slug, for `generateStaticParams`. */
export function legalDocumentSlugs(): string[] {
  return listLegalDocuments().map((doc) => doc.slug)
}

/**
 * One document, or `null` when the slug names no file.
 *
 * ⚠️ The slug is checked against the DIRECTORY LISTING rather than used to
 * build a path, so a traversal attempt (`../../.env`) finds no match and
 * returns null instead of reading a file.
 */
export function getLegalDocument(slug: string): LegalDocument | null {
  return listLegalDocuments().find((doc) => doc.slug === slug) ?? null
}
