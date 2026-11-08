/*
 * THE PARITY CHECK (MOTIR-10648).
 *
 *     pnpm build && pnpm i18n:check-static-pages && pnpm parity:check
 *
 * Serves `dist/` with `wrangler dev` — the wrangler config's static assets
 * alone, no Worker script, so Cloudflare's own trailing-slash, `_redirects`,
 * `_headers` and not-found handling is what answers — and diffs every address
 * in `baseline-next-b9ff37a.json` against it (`parity.ts`). It builds nothing
 * and needs no `next`. It writes a Markdown report (`--report`, default
 * `parity-report.md`) and exits non-zero on any difference not on the
 * intended-difference list, naming the URL, the fact, the Next value and the
 * served value.
 */

import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { askAt, BASELINE_FILE } from './capture-next-baseline.ts'
import {
  type Ask,
  type Baseline,
  compareParity,
  parityReport,
} from './parity.ts'
import { listFiles } from '../i18n/check-static-pages.ts'

/** A running server: where to ask it, and how to stop it. */
export interface Served {
  origin: string
  stop: () => Promise<void>
}

/** A free local port. */
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      server.close(() => resolve(port))
    })
  })
}

/** The command that serves `dir` on `port`: the command and its arguments. */
export type Launch = (dir: string, port: number) => [string, string[]]

/**
 * `wrangler dev`, static assets only: the config is the repository's
 * `wrangler.jsonc`, and `--assets` points it at `dir`.
 */
export const wranglerDev: Launch = (dir, port) => [
  path.join('node_modules', '.bin', 'wrangler'),
  ['dev', '--ip', '127.0.0.1', '--port', String(port), '--assets', dir],
]

/** Start a server over `dir` and wait until it answers. */
export async function serveWithWrangler(
  dir: string,
  launch: Launch = wranglerDev,
  attempts = 120,
): Promise<Served> {
  const port = await freePort()
  const [command, args] = launch(dir, port)
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
  })
  let log = ''
  child.stdout.on('data', (chunk) => (log += chunk))
  child.stderr.on('data', (chunk) => (log += chunk))
  const origin = `http://127.0.0.1:${port}`
  // A child killed by a signal keeps `exitCode` null: `signalCode` says so.
  const exited = () => child.exitCode !== null || child.signalCode !== null
  const stop = () =>
    new Promise<void>((resolve) => {
      if (exited()) return resolve()
      child.once('exit', () => resolve())
      child.kill('SIGTERM')
    })
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (exited()) break
    try {
      await fetch(`${origin}/robots.txt`)
      return { origin, stop }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }
  await stop()
  throw new Error(`${command} did not answer on ${origin}:\n${log}`)
}

export async function main(
  argv: readonly string[],
  serve: (dir: string) => Promise<Served> = serveWithWrangler,
  ask: (origin: string) => Ask = askAt,
): Promise<number> {
  const value = (flag: string, fallback: string) => {
    const at = argv.indexOf(flag)
    return at === -1 ? fallback : (argv[at + 1] ?? fallback)
  }
  const dir = path.resolve(value('--dir', 'dist'))
  const report = path.resolve(value('--report', 'parity-report.md'))
  const baseline = JSON.parse(
    readFileSync(value('--baseline', BASELINE_FILE), 'utf8'),
  ) as Baseline

  const fileCount = listFiles(dir).length
  const served = await serve(dir)
  let result
  try {
    result = await compareParity(baseline, ask(served.origin), { fileCount })
  } finally {
    await served.stop()
  }

  writeFileSync(report, parityReport(baseline, result))
  for (const d of result.differences)
    console.error(
      `FAIL ${d.url} — ${d.fact}: Next ${JSON.stringify(d.expected)}, static ${JSON.stringify(d.served)}`,
    )
  console.log(
    `${result.matched} of ${Object.keys(baseline.pages).length} sitemap URL(s) match; ${result.intended.length} intended difference(s); ${result.differences.length} difference(s); ${fileCount} file(s) in the output. Report: ${report}`,
  )
  return result.differences.length ? 1 : 0
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  process.exitCode = await main(process.argv.slice(2))
}
