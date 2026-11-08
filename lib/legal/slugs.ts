import { readdirSync } from 'node:fs'
import { join } from 'node:path'

/*
 * WHICH LEGAL DOCUMENTS EXIST: ONE FILE EACH IN `content/legal/` (MOTIR-4009 ·
 * MOTIR-10644).
 *
 * A document ships by existing — no route table names it. This is the glob,
 * on its own and with no other import, so the two readers of the list share
 * it: `lib/legal/documents.ts`, which parses each file for the pages, and
 * `scripts/i18n/check-static-pages.ts`, which runs under plain Node after the
 * build and checks every document's page was written in every locale.
 */

/** The directory the documents are read from. */
export const LEGAL_DIR = join(process.cwd(), 'content', 'legal')

/** Every document's slug, its file name without `.md`, in directory order. */
export function legalSlugsIn(dir: string = LEGAL_DIR): string[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
}
