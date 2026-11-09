// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'jsonc-parser'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/routing'
import {
  addressesOf,
  LOCALE_IMAGES,
  localeImageFileFor,
  ROOT_FILES,
  STATIC_PAGES,
} from '@/scripts/i18n/check-static-pages'
import { RUN_WORKER_FIRST } from '@/worker/routes'

/*
 * THE LIST THAT BRINGS THE WORKER IN (MOTIR-10752).
 *
 * `run_worker_first` decides which requests cost a Worker run. Too wide and a
 * built page is rendered per request (and billed); too narrow and a live page
 * is answered by the assets with a 404. So the list in `wrangler.jsonc` is held
 * to the one `worker/routes.ts` builds, to Cloudflare's limit, to the registered
 * built page set, and to a sample of every live address in every locale.
 */

interface WranglerConfig {
  main?: string
  assets?: {
    binding?: string
    not_found_handling?: string
    run_worker_first?: string[]
  }
}

const config = parse(
  readFileSync(path.join(process.cwd(), 'wrangler.jsonc'), 'utf8'),
) as WranglerConfig
const patterns = config.assets?.run_worker_first ?? []

/** Cloudflare's rule: `*` is any run of characters, slashes included. */
function matches(pattern: string, address: string): boolean {
  const source = pattern
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${source}$`).test(address)
}

const covered = (address: string) =>
  patterns.some((pattern) => matches(pattern, address))

function prefixed(locale: string, address: string): string {
  if (locale === DEFAULT_LOCALE) return address
  return address === '/' ? `/${locale}` : `/${locale}${address}`
}

const LIVE_SAMPLES = [
  '/p/ACME',
  '/p/ACME/changelog',
  '/p/ACME/changelog.xml',
  '/p/ACME/requests/ACME-12',
  '/p/ACME/requests/new',
  '/p/ACME/board/items',
  '/p/ACME/opengraph-image',
  '/explore',
  '/explore/topic/devtools',
  '/ideas',
  '/motir-builds-itself',
]

describe('wrangler.jsonc', () => {
  it('runs the Worker script with the assets bound to it', () => {
    expect(config.main).toBe('worker/index.ts')
    expect(config.assets?.binding).toBe('ASSETS')
    expect(config.assets?.not_found_handling).toBe('none')
  })

  it('carries exactly the list worker/routes.ts builds, inside the limit of 100', () => {
    expect(patterns).toEqual([...RUN_WORKER_FIRST])
    expect(patterns.length).toBeLessThanOrEqual(100)
    expect(new Set(patterns).size).toBe(patterns.length)
  })
})

describe('run_worker_first and the built site', () => {
  const builtAddresses = STATIC_PAGES.flatMap(addressesOf).flatMap((address) =>
    LOCALES.map((locale) => prefixed(locale, address)),
  )

  it('pulls no built page onto the Worker except the bare English root', () => {
    expect(builtAddresses.length).toBeGreaterThan(LOCALES.length)
    const pulled = builtAddresses.filter(covered)
    expect(pulled).toEqual(['/'])
  })

  it('pulls no root file and no share card onto the Worker', () => {
    const files = [
      ...ROOT_FILES.map((file) => `/${file}`),
      ...LOCALE_IMAGES.flatMap((name) =>
        LOCALES.map((locale) => `/${localeImageFileFor(locale, name)}`),
      ),
    ]
    expect(files.filter(covered)).toEqual([])
  })

  it.each(LOCALES)(
    'brings every live address under %s onto the Worker',
    (locale) => {
      for (const address of LIVE_SAMPLES)
        expect(covered(prefixed(locale, address))).toBe(true)
    },
  )

  it('brings the English-prefixed live addresses in, so they can be redirected', () => {
    for (const address of LIVE_SAMPLES)
      expect(covered(`/${DEFAULT_LOCALE}${address}`)).toBe(true)
  })

  it('brings the project sitemap in, at the root only', () => {
    expect(covered('/sitemap-projects.xml')).toBe(true)
    expect(covered('/de/sitemap-projects.xml')).toBe(false)
  })

  it('leaves a mistyped explore address to the assets', () => {
    expect(covered('/explore/elsewhere')).toBe(false)
    expect(covered('/ideas/x')).toBe(false)
  })
})
