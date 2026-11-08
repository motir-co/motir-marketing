// @vitest-environment node
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  type Answer,
  type Ask,
  type Baseline,
  collapse,
  compareParity,
  iconLinks,
  intendedFor,
  localeOfPath,
  parityReport,
  pathOf,
  readPage,
  readSitemap,
  WORKERS_FILE_LIMIT,
} from '@/scripts/parity/parity'
import {
  askAt,
  captureBaseline,
  main as capture,
} from '@/scripts/parity/capture-next-baseline'
import {
  main as check,
  serveWithWrangler,
  wranglerDev,
} from '@/scripts/parity/check-parity'
import committed from '@/scripts/parity/baseline-next-b9ff37a.json'

/*
 * THE PARITY CHECK'S OWN TESTS (MOTIR-10648). The check runs against the real
 * `wrangler dev` in the Build job; here it runs against a SITE written in
 * memory — the pages, sitemaps and files a matching static build would answer
 * — so each kind of drift can be injected one at a time and shown to fail,
 * naming the URL, the fact, the Next value and the served value.
 */

const ORIGIN = 'https://motir.co'

/** A page as both builds write its head. */
function page(input: {
  lang: string
  canonical: string
  hreflang?: Record<string, string>
  ogLocale?: string
  icons?: string[]
}): string {
  const alternates = Object.entries(input.hreflang ?? {})
    .map(
      ([lang, href]) =>
        `<link rel="alternate" hreflang="${lang}" href="${href}"/>`,
    )
    .join('')
  const icons = (input.icons ?? [])
    .map((href) => `<link rel="icon" href="${href}"/>`)
    .join('')
  return `<!doctype html><html lang="${input.lang}"><head><link rel="canonical" href="${input.canonical}"/>${alternates}<meta property="og:locale" content="${input.ogLocale ?? 'en_US'}"/>${icons}</head><body>x</body></html>`
}

const HREFLANG = {
  en: `${ORIGIN}/price`,
  de: `${ORIGIN}/de/price`,
  'x-default': `${ORIGIN}/price`,
}

const urlset = (
  entries: {
    loc: string
    alternates?: Record<string, string>
    changefreq?: string
    priority?: string
  }[],
) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries
    .map(
      (e) =>
        `<url>\n<loc>${e.loc}</loc>\n${Object.entries(e.alternates ?? {})
          .map(
            ([l, h]) =>
              `<xhtml:link rel="alternate" hreflang="${l}" href="${h}" />`,
          )
          .join(
            '\n',
          )}\n<lastmod>2026-11-08T00:00:00.000Z</lastmod>\n<changefreq>${e.changefreq ?? 'weekly'}</changefreq>\n<priority>${e.priority ?? '0.8'}</priority>\n</url>`,
    )
    .join('\n')}\n</urlset>\n`

const SITEMAP_ENTRIES = [
  { loc: `${ORIGIN}/price`, alternates: HREFLANG },
  { loc: `${ORIGIN}/de/price`, alternates: HREFLANG },
  { loc: `${ORIGIN}/legal/terms`, changefreq: 'monthly', priority: '0.4' },
  { loc: `${ORIGIN}/explore`, changefreq: 'daily', priority: '0.9' },
]

const INDEX = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap>\n<loc>${ORIGIN}/sitemap-site.xml</loc>\n</sitemap>\n<sitemap>\n<loc>${ORIGIN}/sitemap-projects.xml</loc>\n</sitemap>\n</sitemapindex>\n`

const ROBOTS =
  'User-Agent: *\nAllow: /\n\nHost: https://motir.co/\nSitemap: https://motir.co/sitemap.xml\n'

type Site = Record<string, Partial<Answer>>

/** What a matching static build answers. */
function staticSite(): Site {
  return {
    '/price': {
      body: page({
        lang: 'en',
        canonical: `${ORIGIN}/price`,
        hreflang: HREFLANG,
      }),
    },
    '/de/price': {
      body: page({
        lang: 'de',
        canonical: `${ORIGIN}/de/price`,
        hreflang: HREFLANG,
        ogLocale: 'de_DE',
      }),
    },
    '/legal/terms': {
      body: page({ lang: 'en', canonical: `${ORIGIN}/legal/terms` }),
    },
    '/sitemap-site.xml': {
      body: urlset(SITEMAP_ENTRIES),
      contentType: 'application/xml',
    },
    '/sitemap.xml': { body: INDEX, contentType: 'application/xml' },
    '/robots.txt': { body: ROBOTS, contentType: 'text/plain' },
    '/favicon.ico': { contentType: 'image/x-icon' },
    '/icon.svg?abc': { contentType: 'image/svg+xml' },
    '/opengraph-image': { contentType: 'image/png' },
    '/de/opengraph-image': { contentType: 'image/png' },
    '/does-not-exist': {
      status: 404,
      body: page({ lang: 'en', canonical: '' }),
    },
    '/de/does-not-exist': {
      status: 404,
      body: page({ lang: 'de', canonical: '' }),
    },
    '/en': { status: 308, location: '/' },
    '/en/price': { status: 308, location: '/price' },
  }
}

/** Ask an in-memory site; anything it does not hold is a 404. */
function askSite(site: Site): Ask {
  return async (address) => {
    const answer = site[address]
    return {
      status: answer ? (answer.status ?? 200) : 404,
      location: answer?.location ?? null,
      contentType: answer?.contentType ?? (answer ? 'text/html' : null),
      body: answer?.body ?? '',
    }
  }
}

/** What the Next build answered: the same pages, `/explore` and `/en` included. */
function nextSite(): Site {
  return {
    ...staticSite(),
    '/': {
      body: page({ lang: 'en', canonical: ORIGIN, icons: ['/icon.svg?abc'] }),
    },
    '/explore': { body: page({ lang: 'en', canonical: `${ORIGIN}/explore` }) },
    '/sitemap-projects.xml': {
      contentType: 'application/xml',
      body: '<urlset/>',
    },
    '/en': { body: page({ lang: 'en', canonical: ORIGIN }) },
    '/en/price': { body: page({ lang: 'en', canonical: `${ORIGIN}/price` }) },
  }
}

vi.mock('@/i18n/routing', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/i18n/routing')>()
  return { ...real }
})

/** The baseline the capture writes from the Next site, two locales only. */
async function baseline(): Promise<Baseline> {
  const captured = await captureBaseline(askSite(nextSite()), {
    commit: 'b9ff37a70cc1d3729ce465d97be6e9ee9bae0540',
    command: 'node scripts/parity/capture-next-baseline.ts',
  })
  // The capture walks all twelve locales; this site holds two.
  const keep = (address: string) =>
    !/^\/(zh|zh-tw|ja|ko|fr|es|it|nl|pl|pt)\//.test(address)
  captured.assets = Object.fromEntries(
    Object.entries(captured.assets).filter(([a]) => keep(a)),
  )
  captured.notFound = Object.fromEntries(
    Object.entries(captured.notFound).filter(([a]) => keep(a)),
  )
  return captured
}

describe('the readers', () => {
  it('read a page head with a parser: canonical, hreflang, og:locale, html lang', () => {
    const facts = readPage({
      status: 200,
      location: null,
      contentType: 'text/html',
      body: page({
        lang: 'de',
        canonical: 'c',
        hreflang: { de: 'd' },
        ogLocale: 'de_DE',
      }),
    })
    expect(facts).toEqual({
      status: 200,
      location: null,
      canonical: 'c',
      hreflang: { de: 'd' },
      ogLocale: 'de_DE',
      htmlLang: 'de',
    })
    expect(
      readPage({
        status: 404,
        location: null,
        contentType: null,
        body: '<p>no head</p>',
      }),
    ).toMatchObject({ canonical: null, ogLocale: null, htmlLang: null })
  })

  it('read a sitemap’s entries, lastmod aside, and an index’s children', () => {
    expect(readSitemap(urlset(SITEMAP_ENTRIES.slice(2, 3)))).toEqual([
      {
        loc: `${ORIGIN}/legal/terms`,
        alternates: {},
        changefreq: 'monthly',
        priority: '0.4',
      },
    ])
    expect(readSitemap(INDEX).map((e) => e.loc)).toEqual([
      `${ORIGIN}/sitemap-site.xml`,
      `${ORIGIN}/sitemap-projects.xml`,
    ])
  })

  it('read paths, icons, locales and whitespace the way the check compares them', () => {
    expect(pathOf(`${ORIGIN}/de/price?x=1`)).toBe('/de/price?x=1')
    expect(
      iconLinks(page({ lang: 'en', canonical: '', icons: ['/a.svg'] })),
    ).toEqual(['/a.svg'])
    expect(iconLinks('<link rel="apple-touch-icon" href="/b.png">')).toEqual([
      '/b.png',
    ])
    expect(localeOfPath('/zh-tw/x')).toBe('zh-tw')
    expect(localeOfPath('/en/x')).toBe('en')
    expect(localeOfPath('/x')).toBe('en')
    expect(collapse(' a \n\n b ')).toBe('a b')
  })

  it('hold exactly the four intended differences', () => {
    expect(intendedFor('/explore')?.id).toBe('explore')
    expect(intendedFor('/zh-tw/explore')?.id).toBe('explore')
    expect(intendedFor('/explore/topic/x')).toBeUndefined()
    expect(intendedFor('/sitemap-projects.xml')?.id).toBe('sitemap-projects')
    expect(intendedFor('/en')?.expect).toEqual({ status: 308, location: '/' })
    expect(intendedFor('/en/price')?.expect).toEqual({
      status: 308,
      location: '/price',
    })
    expect(intendedFor('/price')).toBeUndefined()
  })
})

describe('the check', () => {
  it('passes a matching static build, listing the intended differences', async () => {
    const result = await compareParity(
      await baseline(),
      askSite(staticSite()),
      { fileCount: 10 },
    )
    expect(result.differences).toEqual([])
    expect(result.matched).toBe(3)
    expect(
      result.intended.map(
        (hit) => `${hit.url} ${hit.baseline} → ${hit.served}`,
      ),
    ).toEqual([
      '/explore 200 → 404',
      '/sitemap-projects.xml 200 → 404',
      '/en 200 → 308 → /',
      '/en/price 200 → 308 → /price',
    ])
  })

  it('fails one changed canonical, one dropped hreflang alternate and one 404 in the wrong locale — naming each', async () => {
    const site = staticSite()
    site['/price'] = {
      body: page({
        lang: 'en',
        canonical: `${ORIGIN}/pricing`,
        hreflang: HREFLANG,
      }),
    }
    const rest = { en: HREFLANG.en, 'x-default': HREFLANG['x-default'] }
    site['/de/price'] = {
      body: page({
        lang: 'de',
        canonical: `${ORIGIN}/de/price`,
        hreflang: rest,
        ogLocale: 'de_DE',
      }),
    }
    site['/de/does-not-exist'] = {
      status: 404,
      body: page({ lang: 'en', canonical: '' }),
    }
    const result = await compareParity(await baseline(), askSite(site), {
      fileCount: 10,
    })
    expect(result.differences).toEqual([
      {
        url: '/price',
        fact: 'canonical',
        expected: `${ORIGIN}/price`,
        served: `${ORIGIN}/pricing`,
      },
      { url: '/de/price', fact: 'hreflang', expected: HREFLANG, served: rest },
      {
        url: '/de/does-not-exist',
        fact: 'html lang',
        expected: 'de',
        served: 'en',
      },
    ])
    expect(result.matched).toBe(1)
  })

  it('fails a redirect where Next answered the page, and status, og:locale and html lang drift', async () => {
    const site = staticSite()
    site['/price'] = { status: 308, location: '/price/' }
    site['/legal/terms'] = {
      body: page({
        lang: 'fr',
        canonical: `${ORIGIN}/legal/terms`,
        ogLocale: 'fr_FR',
      }),
    }
    const facts = (
      await compareParity(await baseline(), askSite(site), { fileCount: 10 })
    ).differences.map((d) => `${d.url} ${d.fact}`)
    expect(facts).toEqual([
      '/price status',
      '/price location',
      '/price canonical',
      '/price hreflang',
      '/price og:locale',
      '/price html lang',
      '/legal/terms og:locale',
      '/legal/terms html lang',
    ])
  })

  it('fails sitemap, index, robots, asset and not-found drift', async () => {
    const site = staticSite()
    site['/sitemap-site.xml'] = {
      body: urlset([
        { loc: `${ORIGIN}/price`, alternates: { en: `${ORIGIN}/price` } },
        {
          loc: `${ORIGIN}/de/price`,
          alternates: HREFLANG,
          changefreq: 'daily',
        },
        { loc: `${ORIGIN}/products/x` },
      ]),
    }
    site['/sitemap.xml'] = {
      body: INDEX.replace('sitemap-projects', 'sitemap-other'),
    }
    site['/robots.txt'] = { status: 404, body: 'User-Agent: *\nDisallow: /\n' }
    site['/de/opengraph-image'] = { contentType: 'application/octet-stream' }
    delete site['/favicon.ico']
    site['/does-not-exist'] = {
      status: 200,
      body: page({ lang: 'en', canonical: '' }),
    }
    const facts = (
      await compareParity(await baseline(), askSite(site), { fileCount: 10 })
    ).differences.map((d) => `${d.url} ${d.fact}`)
    expect(facts).toEqual([
      `/sitemap-site.xml alternates of ${ORIGIN}/price`,
      `/sitemap-site.xml changefreq of ${ORIGIN}/de/price`,
      `/sitemap-site.xml entry ${ORIGIN}/legal/terms`,
      `/sitemap-site.xml entry ${ORIGIN}/explore`,
      `/sitemap-site.xml entry ${ORIGIN}/products/x`,
      '/sitemap.xml children',
      '/robots.txt status',
      '/robots.txt text',
      '/favicon.ico status',
      '/de/opengraph-image content type',
      '/does-not-exist status',
    ])
  })

  it('fails /en answered with anything but its 308, and an intended path the list does not hold', async () => {
    const site = staticSite()
    site['/en'] = { status: 200, body: page({ lang: 'en', canonical: ORIGIN }) }
    const base = await baseline()
    base.intended['/old'] = {
      status: 200,
      location: null,
      contentType: 'text/html',
    }
    const differences = (
      await compareParity(base, askSite(site), { fileCount: 10 })
    ).differences
    expect(differences).toEqual([
      { url: '/en', fact: 'redirect', expected: '308 → /', served: '200' },
      {
        url: '/old',
        fact: 'intended difference',
        expected: 'on the list',
        served: 'not on the list',
      },
    ])
  })

  it('fails an output at the Workers file limit', async () => {
    const result = await compareParity(
      await baseline(),
      askSite(staticSite()),
      {
        fileCount: WORKERS_FILE_LIMIT,
      },
    )
    expect(result.differences).toEqual([
      {
        url: 'dist/',
        fact: 'file count',
        expected: `< ${WORKERS_FILE_LIMIT}`,
        served: WORKERS_FILE_LIMIT,
      },
    ])
  })
})

describe('the report', () => {
  it('states the count, every difference and every intended difference with its reason', async () => {
    const base = await baseline()
    const clean = parityReport(
      base,
      await compareParity(base, askSite(staticSite()), { fileCount: 7 }),
    )
    expect(clean).toContain('**3 of 4** sitemap URLs match')
    expect(clean).toContain('## Differences\n\nNone.')
    expect(clean).toContain('**7** files in the output (limit 100000)')
    expect(clean).toContain('- **explore** — The square renders per request')
    expect(clean).toContain('  - `/en`: Next 200, static 308 → /')

    const site = staticSite()
    site['/price'] = {
      body: page({ lang: 'en', canonical: 'a|b', hreflang: HREFLANG }),
    }
    const red = parityReport(
      base,
      await compareParity(base, askSite(site), { fileCount: 7 }),
    )
    expect(red).toContain(`| /price | canonical | ${ORIGIN}/price | a\\|b |`)
  })
})

describe('the report, read closely', () => {
  it('shows a redirect Next answered, an object value, and leaves out an intended difference nobody hit', () => {
    const base = {
      ...(committed as Baseline),
      $comment: [],
      commit: 'c',
      command: 'x',
    }
    const report = parityReport(base, {
      matched: 0,
      fileCount: 1,
      differences: [
        { url: '/a', fact: 'hreflang', expected: { en: '/a' }, served: {} },
      ],
      intended: [
        {
          id: 'en-root',
          url: '/en',
          baseline: '308 → /x',
          served: '308 → /',
          reason: 'r',
        },
      ],
    })
    expect(report).toContain('| /a | hreflang | {"en":"/a"} | {} |')
    expect(report).toContain('- **en-root**')
    expect(report).not.toContain('- **explore**')
  })
})

describe('the committed baseline', () => {
  const b = committed as Baseline
  it('names b9ff37a’s full sha and the command that produced it', () => {
    expect(b.commit).toBe('b9ff37a70cc1d3729ce465d97be6e9ee9bae0540')
    expect(b.$comment.join('\n')).toContain(b.commit)
    expect(b.command).toContain('capture-next-baseline.ts')
  })

  it('holds every sitemap URL, the root files, the cards, the icons and twelve 404s', () => {
    expect(Object.keys(b.pages)).toEqual(
      b.sitemapSite.map((e) => pathOf(e.loc)),
    )
    expect(Object.keys(b.pages).length).toBeGreaterThan(250)
    expect(b.robots).toContain('Sitemap: https://motir.co/sitemap.xml')
    expect(b.sitemapIndex).toEqual([
      `${ORIGIN}/sitemap-site.xml`,
      `${ORIGIN}/sitemap-projects.xml`,
    ])
    expect(Object.keys(b.assets)).toContain('/favicon.ico')
    expect(
      Object.keys(b.assets).filter((a) => a.endsWith('opengraph-image')),
    ).toHaveLength(12)
    expect(Object.keys(b.notFound)).toHaveLength(12)
  })
})

/** A local HTTP server over an in-memory site. */
async function listen(site: Site): Promise<{ origin: string; server: Server }> {
  const server = createServer((request, response) => {
    const answer = site[request.url ?? '']
    response.statusCode = answer ? (answer.status ?? 200) : 404
    if (answer?.location) response.setHeader('location', answer.location)
    response.setHeader('content-type', answer?.contentType ?? 'text/html')
    response.end(
      answer?.body ?? (answer?.contentType?.startsWith('image') ? 'PNG' : ''),
    )
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as { port: number }
  return { origin: `http://127.0.0.1:${port}`, server }
}

const dirs: string[] = []
const servers: Server[] = []
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
  for (const server of servers.splice(0)) server.close()
  vi.restoreAllMocks()
})

describe('the scripts', () => {
  it('capture reads a running server over HTTP, redirects not followed, and writes the baseline', async () => {
    const { origin, server } = await listen(nextSite())
    servers.push(server)
    const answer = await askAt(origin)('/en')
    expect(answer.status).toBe(200)
    expect((await askAt(origin)('/opengraph-image')).body).toBe('')

    const dir = mkdtempSync(path.join(tmpdir(), 'parity-'))
    dirs.push(dir)
    const out = path.join(dir, 'baseline.json')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const sha = 'b9ff37a70cc1d3729ce465d97be6e9ee9bae0540'
    expect(
      await capture(['--origin', origin, '--commit', sha, '--out', out]),
    ).toBe(0)
    const written = JSON.parse(readFileSync(out, 'utf8')) as Baseline
    expect(written.commit).toBe(sha)
    expect(written.command).toBe(
      `node scripts/parity/capture-next-baseline.ts --origin ${origin} --commit ${sha}`,
    )
    expect(Object.keys(written.pages)).toEqual([
      '/price',
      '/de/price',
      '/legal/terms',
      '/explore',
    ])
  })

  it('capture refuses without an origin and a full sha', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await capture(['--origin', 'http://x', '--commit', 'b9ff37a'])).toBe(
      1,
    )
    expect(await capture([])).toBe(1)
    expect(error.mock.calls[0]?.[0]).toMatch(/^usage:/)
  })

  it('check serves the output, writes the report, and exits by what it found', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'parity-'))
    dirs.push(dir)
    writeFileSync(path.join(dir, 'index.html'), 'x')
    const baselineFile = path.join(dir, 'baseline.json')
    writeFileSync(baselineFile, JSON.stringify(await baseline()))
    const report = path.join(dir, 'report.md')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    let stopped = 0
    const serve = async (served: string) => {
      expect(served).toBe(dir)
      return { origin: 'site://', stop: async () => void (stopped += 1) }
    }
    const args = ['--dir', dir, '--report', report, '--baseline', baselineFile]
    expect(await check(args, serve, () => askSite(staticSite()))).toBe(0)
    expect(readFileSync(report, 'utf8')).toContain('**2** files in the output')

    const site = staticSite()
    site['/price'] = {
      body: page({ lang: 'en', canonical: 'x', hreflang: HREFLANG }),
    }
    expect(await check(args, serve, () => askSite(site))).toBe(1)
    expect(error).toHaveBeenCalledWith(
      `FAIL /price — canonical: Next "${ORIGIN}/price", static "x"`,
    )
    expect(stopped).toBe(2)

    // The server is stopped even when the comparison throws.
    await expect(
      check(args, serve, () => async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(stopped).toBe(3)
  })

  it('check reads dist/, the default report and the default baseline from where it runs', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'parity-'))
    dirs.push(dir)
    mkdirSync(path.join(dir, 'dist'))
    writeFileSync(path.join(dir, 'dist', 'index.html'), 'x')
    const baselineFile = path.join(dir, 'baseline.json')
    writeFileSync(baselineFile, JSON.stringify(await baseline()))
    vi.spyOn(process, 'cwd').mockReturnValue(dir)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    const serve = async (served: string) => {
      expect(served).toBe(path.join(dir, 'dist'))
      return { origin: 'site://', stop: async () => {} }
    }
    // `--report` with no value falls back too.
    expect(
      await check(['--baseline', baselineFile, '--report'], serve, () =>
        askSite(staticSite()),
      ),
    ).toBe(0)
    expect(readFileSync(path.join(dir, 'parity-report.md'), 'utf8')).toContain(
      '## Differences',
    )
  })

  it('capture keeps no body for an answer with no content type', async () => {
    const server = createServer((_request, response) => response.end('raw'))
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    servers.push(server)
    const { port } = server.address() as { port: number }
    const answer = await askAt(`http://127.0.0.1:${port}`)('/x')
    expect(answer).toEqual({
      status: 200,
      location: null,
      contentType: null,
      body: '',
    })
  })

  it('serves with wrangler dev, static assets only, from the repository config', () => {
    expect(wranglerDev('dist', 8787)).toEqual([
      path.join('node_modules', '.bin', 'wrangler'),
      ['dev', '--ip', '127.0.0.1', '--port', '8787', '--assets', 'dist'],
    ])
  })

  it('waits for the server to answer, and stops it', async () => {
    const served = await serveWithWrangler('unused', (_dir, port) => [
      process.execPath,
      [
        '-e',
        `require('http').createServer((q,s)=>s.end('ok')).listen(${port},'127.0.0.1')`,
      ],
    ])
    expect(await (await fetch(`${served.origin}/robots.txt`)).text()).toBe('ok')
    await served.stop()
    await served.stop()
  }, 20_000)

  it('says what the server printed when it never answers', async () => {
    await expect(
      serveWithWrangler(
        'unused',
        () => [
          process.execPath,
          ['-e', "console.log('no config');process.exit(1)"],
        ],
        4,
      ),
    ).rejects.toThrow(/did not answer on http:\/\/127\.0\.0\.1:\d+:\nno config/)
  }, 20_000)
})
