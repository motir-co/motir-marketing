// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { OG_FONT_FACES } from '@motir/brand'

/*
 * WHAT THE WORKER SCRIPT CARRIES (MOTIR-10757): bundled exactly as a deploy
 * would bundle it (`wrangler deploy --dry-run --outdir`), against an empty
 * assets directory so the suite needs no site build.
 *
 *  • No font. The share card's faces are static assets read through `ASSETS`
 *    (`worker/share/fonts.ts`); bundled, they would count toward the script
 *    limit on every deploy. The check looks for every shipped face's bytes —
 *    raw or base64, at any alignment — and for any sfnt header at all.
 *  • No `next/og`, and not the Next gate that wrapped it.
 *  • No HarfBuzz. satori ≥ 0.33 inlines it as wasm bytes compiled at run
 *    time, which workerd refuses, so every draw hangs (`worker/share/engine.ts`).
 *  • Inside the Workers Paid script limit: 10 MB, compressed.
 */

const require = createRequire(import.meta.url)
const WORKERS_PAID_LIMIT = 10 * 1024 * 1024

let outdir: string
let assets: string
let files: string[]
let script: Buffer

beforeAll(() => {
  outdir = mkdtempSync(path.join(tmpdir(), 'motir-bundle-'))
  assets = mkdtempSync(path.join(tmpdir(), 'motir-assets-'))
  execFileSync(
    process.execPath,
    [
      path.join(
        path.dirname(require.resolve('wrangler/package.json')),
        'bin/wrangler.js',
      ),
      'deploy',
      '--dry-run',
      '--outdir',
      outdir,
      '--assets',
      assets,
    ],
    { env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }, stdio: 'pipe' },
  )
  files = readdirSync(outdir)
  script = readFileSync(path.join(outdir, 'index.js'))
}, 120_000)

afterAll(() => {
  rmSync(outdir, { recursive: true, force: true })
  rmSync(assets, { recursive: true, force: true })
})

/** Every font this repository ships: the share faces and the CJK subsets. */
function shippedFonts(): Buffer[] {
  const brand = OG_FONT_FACES.map((face) =>
    readFileSync(require.resolve(`@motir/brand/fonts/${face.file}`)),
  )
  const subsets = readdirSync('app/_brand/og-fonts')
    .filter((file) => file.endsWith('.ttf'))
    .map((file) => readFileSync(path.join('app/_brand/og-fonts', file)))
  return [...brand, ...subsets]
}

/** A table directory's tags are four printable characters. */
function looksLikeSfnt(bytes: Buffer): boolean {
  if (bytes.length < 12 + 16) return false
  const version = bytes.readUInt32BE(0)
  if (version !== 0x00010000 && version !== 0x4f54544f) return false
  const tables = bytes.readUInt16BE(4)
  if (tables < 4 || tables > 64 || bytes.length < 12 + tables * 16) return false
  for (let n = 0; n < tables; n += 1) {
    const tag = bytes.subarray(12 + n * 16, 16 + n * 16).toString('latin1')
    if (!/^[A-Za-z0-9/ ]{4}$/.test(tag)) return false
  }
  return true
}

describe('the bundled Worker', () => {
  it('holds no font file', () => {
    expect(files.filter((f) => /\.(ttf|otf|woff2?)$/i.test(f))).toEqual([])
  })

  it('holds no shipped face’s bytes, raw or base64', () => {
    const text = script.toString('latin1')
    for (const font of shippedFonts()) {
      const sample = font.subarray(
        Math.floor(font.length / 2),
        Math.floor(font.length / 2) + 48,
      )
      expect(script.includes(sample)).toBe(false)
      for (const shift of [0, 1, 2]) {
        const encoded = sample.subarray(shift, shift + 45).toString('base64')
        expect(text.includes(encoded)).toBe(false)
      }
    }
  })

  it('holds no sfnt at all, raw or as a base64 blob', () => {
    for (
      let at = script.indexOf(0x00);
      at !== -1;
      at = script.indexOf(0x00, at + 1)
    )
      expect(looksLikeSfnt(script.subarray(at, at + 1100))).toBe(false)
    const text = script.toString('latin1')
    for (const blob of text.matchAll(/[A-Za-z0-9+/]{2000,}={0,2}/g)) {
      const head = Buffer.from(blob[0].slice(0, 1600), 'base64')
      expect(looksLikeSfnt(head)).toBe(false)
    }
  })

  it('does not import next/og or the Next gate', () => {
    const text = script.toString('utf8')
    expect(text).not.toContain('next/og')
    expect(text).not.toContain('ogRenderGate')
  })

  it('holds no wasm the runtime would have to compile from bytes', () => {
    expect(script.toString('utf8')).not.toMatch(/harfbuzz/i)
  })

  it('carries the two wasm engines as modules of their own', () => {
    expect(files.filter((f) => f.endsWith('.wasm'))).toHaveLength(2)
  })

  it('fits the Workers Paid script limit, compressed', () => {
    const modules = files.filter((f) => /\.(js|wasm)$/.test(f))
    const compressed = modules.reduce(
      (total, file) =>
        total + gzipSync(readFileSync(path.join(outdir, file))).length,
      0,
    )
    console.info(
      `worker script: ${(compressed / 1024 / 1024).toFixed(2)} MB compressed`,
    )
    expect(compressed).toBeLessThan(WORKERS_PAID_LIMIT)
  })
})
