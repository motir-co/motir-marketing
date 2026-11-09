import { readFileSync } from 'node:fs'
import path from 'node:path'

/*
 * THE WORKER'S OWN OUTPUT, AS THE BROWSER LANE CAPTURED IT (MOTIR-10758).
 *
 * The site entry in `playwright.config.ts` tees `wrangler dev`'s output into
 * this file. The Worker writes one JSON line per request it runs
 * (`worker/requestLog.ts`), and a request served from the static assets runs
 * no code and so writes none: the file is how a spec tells the two apart.
 *
 * ⚠️ LOCALLY, `reuseExistingServer` keeps a server you started by hand, whose
 * output never reached this file. The spec that reads it says so when the
 * file is missing, rather than failing on an empty match.
 */
export const WORKER_LOG = path.resolve('e2e/.worker.log')

export interface WorkerLogLine {
  msg: string
  method: string
  path: string
  query: string
  ua: string | null
  refused: boolean
  [field: string]: unknown
}

/** Every request line the Worker has written so far. */
export function workerLogLines(): WorkerLogLine[] {
  const text = readFileSync(WORKER_LOG, 'utf8')
  const lines: WorkerLogLine[] = []
  for (const raw of text.split('\n')) {
    const start = raw.indexOf('{"msg":"request"')
    if (start === -1) continue
    try {
      lines.push(JSON.parse(raw.slice(start)) as WorkerLogLine)
    } catch {
      // A line wrangler wrapped or coloured is not one of ours.
    }
  }
  return lines
}
