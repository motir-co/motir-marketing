/*
 * CAPTURE THE NEXT BASELINE, ONCE (MOTIR-10648).
 *
 *     # in a separate checkout of b9ff37a, after `pnpm install` and
 *     # `next build` with ci.yml's NEXT_PUBLIC_* values:
 *     cp -r .next/static .next/standalone/.next/static
 *     cp -r public .next/standalone/public
 *     (cd .next/standalone && PORT=3999 HOSTNAME=127.0.0.1 node server.js) &
 *     # then, from this repository:
 *     node scripts/parity/capture-next-baseline.ts \
 *       --origin http://127.0.0.1:3999 --commit <full sha>
 *
 * `next` is not in this tree any more, so the baseline cannot be rebuilt on
 * every run: this reads a running Next server and writes
 * `baseline-next-b9ff37a.json`, which `check-parity.ts` reads instead. Every
 * address is asked with redirects NOT followed, and every fact is read by the
 * same `parity.ts` readers the check uses.
 */

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { DEFAULT_LOCALE, LOCALES } from '../../i18n/routing.ts'
import {
  type Answer,
  type Ask,
  type Baseline,
  iconLinks,
  INTENDED_DIFFERENCES,
  pathOf,
  readLang,
  readPage,
  readSitemap,
} from './parity.ts'

/** Ask a server at `origin`, redirects not followed. */
export function askAt(origin: string): Ask {
  return async (address) => {
    const response = await fetch(`${origin}${address}`, { redirect: 'manual' })
    const answer: Answer = {
      status: response.status,
      location: response.headers.get('location'),
      contentType: response.headers.get('content-type'),
      body: '',
    }
    const type = answer.contentType ?? ''
    if (/text|xml|html/.test(type)) answer.body = await response.text()
    else await response.arrayBuffer()
    return answer
  }
}

/** The paths the intended differences stand for outside the sitemap. */
export const INTENDED_PATHS = ['/sitemap-projects.xml', '/en', '/en/price']

/** Read everything the check compares from a server. */
export async function captureBaseline(
  ask: Ask,
  input: { commit: string; command: string },
): Promise<Baseline> {
  const site = await ask('/sitemap-site.xml')
  const sitemapSite = readSitemap(site.body)
  const pages: Baseline['pages'] = {}
  for (const entry of sitemapSite) {
    pages[pathOf(entry.loc)] = readPage(await ask(pathOf(entry.loc)))
  }

  const assets: Baseline['assets'] = {}
  const home = await ask('/')
  const cards = LOCALES.map((locale) =>
    locale === DEFAULT_LOCALE
      ? '/opengraph-image'
      : `/${locale}/opengraph-image`,
  )
  for (const address of [...iconLinks(home.body), '/favicon.ico', ...cards]) {
    const answer = await ask(address)
    assets[address] = { status: answer.status, contentType: answer.contentType }
  }

  const notFound: Baseline['notFound'] = {}
  for (const locale of LOCALES) {
    const address =
      locale === DEFAULT_LOCALE
        ? '/does-not-exist'
        : `/${locale}/does-not-exist`
    const answer = await ask(address)
    notFound[address] = {
      status: answer.status,
      htmlLang: readLang(answer.body),
    }
  }

  const intended: Baseline['intended'] = {}
  for (const address of INTENDED_PATHS) {
    const answer = await ask(address)
    intended[address] = {
      status: answer.status,
      location: answer.location,
      contentType: answer.contentType,
    }
  }

  return {
    $comment: [
      `The Next build of motir-marketing at ${input.commit}, as its standalone server answered it.`,
      `Captured with: ${input.command}`,
      'Read by scripts/parity/check-parity.ts (MOTIR-10648). Re-capture rather than edit: a hand-edited baseline agrees with whatever it was edited to.',
      `Intended differences the check allows: ${INTENDED_DIFFERENCES.map((d) => d.id).join(', ')} (scripts/parity/parity.ts).`,
    ],
    commit: input.commit,
    command: input.command,
    pages,
    robots: (await ask('/robots.txt')).body,
    sitemapIndex: readSitemap((await ask('/sitemap.xml')).body).map(
      (e) => e.loc,
    ),
    sitemapSite,
    assets,
    notFound,
    intended,
  }
}

export const BASELINE_FILE = path.join(
  import.meta.dirname,
  'baseline-next-b9ff37a.json',
)

export async function main(
  argv: readonly string[],
  ask: (origin: string) => Ask = askAt,
): Promise<number> {
  const value = (flag: string) => {
    const at = argv.indexOf(flag)
    return at === -1 ? undefined : argv[at + 1]
  }
  const origin = value('--origin')
  const commit = value('--commit')
  if (!origin || !commit || !/^[0-9a-f]{40}$/.test(commit)) {
    console.error(
      'usage: capture-next-baseline.ts --origin <running Next server> --commit <full 40-character sha> [--out <file>]',
    )
    return 1
  }
  const out = value('--out') ?? BASELINE_FILE
  const command = `node scripts/parity/capture-next-baseline.ts --origin ${origin} --commit ${commit}`
  const baseline = await captureBaseline(ask(origin), { commit, command })
  writeFileSync(out, `${JSON.stringify(baseline, null, 2)}\n`)
  console.log(
    `${Object.keys(baseline.pages).length} page(s), ${Object.keys(baseline.assets).length} asset(s), ${Object.keys(baseline.notFound).length} not-found answer(s) written to ${out}`,
  )
  return 0
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  process.exitCode = await main(process.argv.slice(2))
}
