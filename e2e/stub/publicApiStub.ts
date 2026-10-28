import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * THE PUBLIC-API STUB (MOTIR-4112) — a fixture server standing in for
 * `app.motir.co` while the browser lane runs.
 *
 * ── ⚠️ WHY THIS IS A SERVER AND NOT `page.route()` ────────────────────────
 *
 * The obvious way to stub an API in Playwright is to intercept the BROWSER's
 * requests. It does not work here, and the reason is structural rather than
 * incidental: every surface on this site reads the public API from a SERVER
 * COMPONENT. `lib/explore.ts` is the shipped example — `fetch(..., { next:
 * { revalidate: 0 } })`, executed by Next inside the Node process. Playwright's
 * `page.route()` sees requests the browser makes; it cannot see a request the
 * server made before the browser had a document. A lane built on `page.route()`
 * passes on any page that happens to fetch client-side and silently does nothing
 * on every page that does not — which is all of them, today.
 *
 * So the stub is a real HTTP server, and the app under test is pointed at it.
 *
 * ── ⚠️ AND POINTING THE APP AT IT IS A *BUILD*-TIME ACT ───────────────────
 *
 * `NEXT_PUBLIC_MOTIR_APP_ORIGIN` is a `NEXT_PUBLIC_*` variable, which Next
 * INLINES at build time — `lib/appOrigin.ts` says so at length and throws at
 * import when it is unset, precisely so that the mistake is caught by
 * `next build` rather than by a visitor. The consequence for this lane is easy
 * to get wrong: setting the variable when STARTING the server changes nothing,
 * because the literal is already in the bundle. `playwright.config.ts` therefore
 * BUILDS with it set, and its `webServer` command carries the build.
 *
 * ── ⚠️ THE FIXTURES ARE A FIXTURE, NOT A SECOND SOURCE OF TRUTH ───────────
 *
 * The shapes below are `motir-core`'s. That contract is guarded in the
 * PRODUCING repository — `motir-core/docs/decisions/public-surface-hosts.md` §3
 * and its `tests/api/public/contract-drift.test.ts` — because, as §3 puts it, "a
 * contract test that lives only in the consumer reports that motir-core broke
 * motir.co, after it has shipped". Nothing here asserts the contract; these
 * files only make the site renderable without a database. When a shape changes,
 * the guard that goes red is over there, and these files are updated to follow.
 */

const FIXTURE_DIR = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  'fixtures',
)

/**
 * `GET` paths under `/api/public` → the fixture file that answers them.
 *
 * Keyed by PATHNAME only: a query string selects a page or a facet and every
 * fixture here is the first page, which is what a smoke lane needs.
 *
 * ⚠️ THE READ-PAGE FIXTURES ARE GONE (MOTIR-6743). The board, items, tree,
 * roadmap and work-item pages are permanent redirects into the app and read
 * nothing, so their fixtures, their second pages and the parameterised table
 * that served those pages left with them.
 */
const ROUTES: Record<string, string> = {
  '/api/public/explore': 'explore.json',
  '/api/public/categories': 'categories.json',
  '/api/public/p/MOTIR': 'project.json',
  '/api/public/p/MOTIR/changelog': 'changelog.json',
  '/api/public/p/MOTIR/requests/MOTIR-4051': 'request-detail.json',
  '/api/public/projects': 'projects-index.json',
  // The HOST CONTRACT (MOTIR-4220). `acme.localhost` is the lane's tenant host
  // — `e2e/stub/origin.ts` explains why no `/etc/hosts` edit is needed. It is a
  // live workspace host with no application yet (MOTIR-9512), so it serves the
  // no-application page at its root and no project anywhere.
  '/api/public/hosts/acme.localhost': 'host-workspace.json',
  // The ADDRESS MATRIX the acceptance walk needs (MOTIR-4226). Four labels
  // under `.localhost`, so all four reach the same server with a different
  // `Host` header — which is the only thing the router reads. What each one IS
  // is decided here, so the whole matrix is one fixture table rather than four
  // deployments.
  '/api/public/hosts/roadmap.localhost': 'host-project.json',
  // A RETIRED name, answered with the retired never-released `alias` payload a
  // producer a version behind might still send: the router must 404 it.
  '/api/public/hosts/old.localhost': 'host-alias.json',
  '/api/public/p/ROAD': 'project-road.json',
  // MOTIR-6749 — a project that has written no overview, for the EMPTY state
  // the project page redrew when the read tabs left it (design MOTIR-6742).
  '/api/public/p/QUIET': 'project-quiet.json',
  // MOTIR-7685 — the idea store, recorded from production on 2026-10-07. The
  // list fixture is the unfiltered store; `ideasList` below NARROWS it the way
  // motir-core does (MOTIR-7690), so a spec that filters sees a filtered page.
  // These are the ENGLISH answers; a `?locale=` with recordings under
  // `fixtures/ideas/<l>/` is answered by `localizedIdeas` first (MOTIR-7779).
  '/api/public/ideas': 'ideas.json',
  '/api/public/ideas/tags': 'ideas-tags.json',
  '/api/public/ideas/stop-returns-before-they-happen':
    'idea-stop-returns-before-they-happen.json',
}

/**
 * Paths that answer 500 — the OUTAGE arm.
 *
 * ⚠️ A STUB THAT COULD ONLY SUCCEED OR 404 CANNOT TEST THE MOST IMPORTANT
 * DISTINCTION ON THIS SURFACE. `broken.localhost` exists so the browser lane can
 * walk the case where the contract is unreachable — which must render the ERROR
 * state, never a 404, because a crawler acts on a 404 and would drop every
 * customer's domain the moment `app.motir.co` restarted.
 */
const FAILING: ReadonlySet<string> = new Set([
  '/api/public/hosts/broken.localhost',
  // MOTIR-6749 — the project page's ERROR state, on the site's own host, where
  // the "Watch it being built" entry still renders (design MOTIR-6742 panel E).
  '/api/public/p/DOWN',
])

/**
 * Paths whose answer is NOT JSON. The changelog feed is the surface's only
 * non-JSON response, and a stub that served it as `application/json` would let
 * a content-type assertion pass on a route that had silently stopped
 * forwarding XML.
 */
const NON_JSON: Record<string, [string, string]> = {
  '/api/public/p/MOTIR/changelog.xml': [
    'changelog.atom',
    'application/atom+xml; charset=utf-8',
  ],
}

/**
 * THE MCP TOOL CATALOGUE (MOTIR-7084) — `GET /api/docs/mcp-tools.json`, which
 * `/docs/mcp/tools` and `/docs/mcp`'s scope table read SERVER-SIDE.
 *
 * ⚠️ ONE PATH, THREE ANSWERS, AND A SPEC PICKS WHICH. The page fetches a fixed
 * URL from inside the Node process, so nothing about the BROWSER's request can
 * select a variant (the header comment above says why `page.route()` cannot).
 * The stub therefore keeps a MODE, switched by a spec through
 * `POST /__stub/mcp-tools?mode=recorded|stripped|failing`:
 *
 *   · `recorded` (the default) — the production response the integration gate
 *     recorded (`tests/docs/fixtures/mcp-tools.production.json`), REUSED rather
 *     than copied, so the two lanes measure one recording;
 *   · `stripped` — the same rows with `title` and `annotations` removed, which
 *     is what an older or self-hosted Motir serves;
 *   · `failing` — a 500, the unreachable state.
 *
 * The spec that switches it runs SERIALLY and puts it back to `recorded` after
 * every test. A parallel spec that opens a docs page in that window sees the
 * page's own degraded states — no chip, or "temporarily unreachable" — and no
 * other spec asserts on the catalogue, so a switch cannot redden one.
 */
type CatalogueMode = 'recorded' | 'stripped' | 'failing'
let catalogueMode: CatalogueMode = 'recorded'

const DOCS_FIXTURES = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  '..',
  'tests',
  'docs',
  'fixtures',
)

const RECORDED_CATALOGUE = join(DOCS_FIXTURES, 'mcp-tools.production.json')

/**
 * THE CATALOGUE BY LOCALE (MOTIR-8052) — `?locale=<l>` selects the recording,
 * the way motir-core serves each locale its own summaries.
 *
 * ⚠️ A STUB THAT IGNORED THE QUERY COULD NOT SHOW A KOREAN PAGE: the page
 * fetches server-side, so nothing about the browser's request reaches it. Only a
 * locale with a recording at `tests/docs/fixtures/mcp-tools.production.<l>.json`
 * is answered from it; no `locale`, `en`, and a locale with no recording are all
 * answered with the unlocalized recording above — which is what motir-core does
 * for a locale it has no translations for. The recordings are motir-core's own
 * `mcpToolCatalogueDocument(<l>)` output, not hand-written.
 */
/** A locale code safe to join into a fixture path: `fr`, or `zh-tw` (MOTIR-9241). */
const LOCALE_CODE = /^[a-z]{2}(-[a-z]{2})?$/

function recordedCatalogueFile(locale: string | null): string {
  if (locale && LOCALE_CODE.test(locale)) {
    const localized = join(DOCS_FIXTURES, `mcp-tools.production.${locale}.json`)
    if (existsSync(localized)) return localized
  }
  return RECORDED_CATALOGUE
}

function mcpToolCatalogue(
  mode: Exclude<CatalogueMode, 'failing'>,
  locale: string | null = null,
): string {
  const catalogue = JSON.parse(
    readFileSync(recordedCatalogueFile(locale), 'utf8'),
  ).catalogue as {
    groups: { tools: Record<string, unknown>[] }[]
  }
  if (mode === 'stripped') {
    for (const group of catalogue.groups) {
      for (const tool of group.tools) {
        delete tool['title']
        delete tool['annotations']
      }
    }
  }
  return JSON.stringify(catalogue)
}

/**
 * THE OPENAPI DOCUMENT AND THE CLI CATALOGUE (MOTIR-8052) — what `/docs/api` and
 * `/docs/cli` fetch server-side. Until the docs walk needed them the stub had no
 * route for either, so both pages rendered their "unreachable" state in this
 * lane. Each is a motir-core recording under `tests/docs/fixtures/` in the same
 * `{ …provenance, document }` wrapper the catalogue recording uses; the wrapper's
 * `document` is what is served.
 */
const DOCS_DOCUMENTS: Record<string, string> = {
  '/api/openapi/v1.json': 'openapi-v1.production.json',
  '/api/docs/cli-commands.json': 'cli-commands.production.json',
}

function docsDocument(file: string): string {
  return JSON.stringify(
    JSON.parse(readFileSync(join(DOCS_FIXTURES, file), 'utf8')).document,
  )
}

/**
 * THE IDEA STORE'S LIST, NARROWED (MOTIR-7690) — `GET /api/public/ideas`.
 *
 * The recording is the whole store; a filter is answered the way motir-core's
 * `ideasPublicService.list` answers it: category exact, EVERY tag required,
 * text case-insensitive over title, pitch, gap and tag label, kind exact, and
 * the category counts over every filter EXCEPT the category (so the chips stay
 * choosable). `tests/ideas/ideasPage.test.tsx` checks the page against the
 * same rules, written independently.
 *
 * And a MODE, the catalogue's pattern above: `POST /__stub/ideas?mode=failing`
 * turns every ideas read into a 500 — the unreachable state — until a spec
 * puts it back with `mode=ok`. Only `ideas.spec.ts` switches it, serially.
 */
let ideasFailing = false

interface StubIdea {
  slug: string
  kind: string
  title: string
  pitch: string
  gap: string | null
  category: { slug: string }
  tags: { slug: string; label: string }[]
}

function ideasList(search: URLSearchParams, file = 'ideas.json'): string {
  const store = JSON.parse(fixture(file)) as {
    items: StubIdea[]
    categories: { slug: string; label: string; count: number }[]
    locale?: string
  }
  const category = search.get('category')
  const tags = search.getAll('tag')
  const q = search.get('q')?.toLowerCase()
  const kind = search.get('kind')
  const matches = (idea: StubIdea, withCategory: boolean) =>
    (!withCategory || !category || idea.category.slug === category) &&
    tags.every((t) => idea.tags.some((x) => x.slug === t)) &&
    (!kind || idea.kind === kind) &&
    (!q ||
      [idea.title, idea.pitch, idea.gap ?? '', ...idea.tags.map((t) => t.label)]
        .join('\n')
        .toLowerCase()
        .includes(q))
  const items = store.items.filter((i) => matches(i, true))
  const countable = store.items.filter((i) => matches(i, false))
  const categories = store.categories
    .map((c) => ({
      ...c,
      count: countable.filter((i) => i.category.slug === c.slug).length,
    }))
    .filter((c) => c.count > 0)
  return JSON.stringify({
    items,
    categories,
    total: items.length,
    locale: store.locale ?? 'en',
  })
}

/**
 * THE IDEA STORE BY LOCALE (Story MOTIR-7772 · MOTIR-7779) — `?locale=<l>`
 * selects the fixture, the way motir-core serves each locale its own text.
 *
 * ⚠️ A STUB THAT IGNORED THE QUERY WOULD MAKE A BROKEN PAGE LOOK CORRECT: it
 * would answer one fixture to every locale, so a page that forgot to send
 * `locale` would still render. So the locale is READ here, and only a locale
 * with recordings under `e2e/fixtures/ideas/<l>/` is served its own text:
 *
 * - no `locale`, or one with no recordings → the English fixtures, `locale:
 *   'en'` — what motir-core answers for an unknown locale;
 * - a recorded locale → its list (NARROWED by `q` and the filters exactly as
 *   the English list is, so a search finds only the words that locale's text
 *   holds), its tags, and each idea recorded by slug;
 * - a recorded locale and a slug with no recording → the loud 404, naming the
 *   locale, never another language's idea.
 *
 * Returns `null` when the request is not a locale read (the English path).
 */
const IDEA_LOCALES_DIR = join(FIXTURE_DIR, 'ideas')

function localizedIdeas(url: URL): { status: number; body: string } | null {
  const locale = url.searchParams.get('locale')
  if (
    !locale ||
    !LOCALE_CODE.test(locale) ||
    !existsSync(join(IDEA_LOCALES_DIR, locale))
  )
    return null
  const dir = `ideas/${locale}`
  if (url.pathname === '/api/public/ideas')
    return {
      status: 200,
      body: ideasList(url.searchParams, `${dir}/ideas.json`),
    }
  if (url.pathname === '/api/public/ideas/tags')
    return { status: 200, body: fixture(`${dir}/ideas-tags.json`) }
  const slug = url.pathname.slice('/api/public/ideas/'.length)
  const file = `${dir}/${slug}.json`
  if (/^[a-z0-9-]+$/.test(slug) && existsSync(join(FIXTURE_DIR, file)))
    return { status: 200, body: fixture(file) }
  return {
    status: 404,
    body: JSON.stringify({
      code: 'STUB_NO_FIXTURE',
      path: url.pathname,
      locale,
      q: url.searchParams.get('q'),
    }),
  }
}

function fixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), 'utf8')
}

/**
 * THE PRICE PAGE'S ENGINE (MOTIR-8382 · MOTIR-9688) — motir-ai's public routes
 * the /price page reads: `GET /v1/public/plans` SERVER-SIDE, and
 * `GET /v1/public/calculator/categories` and `POST /v1/public/calculator/estimate`
 * from the BROWSER (so they answer CORS, as motir-ai's public channel does).
 *
 * The answers are the integration gate's recordings, REUSED from
 * `tests/fixtures/price/` and `tests/fixtures/calculator/`. A spec picks them
 * through `POST /__stub/price?plans=…&estimate=…&categories=…` (`reset=1` puts
 * every mode back), may HOLD the next estimate (`hold=1`) until
 * `POST /__stub/price/release`, and reads what the stub saw from
 * `GET /__stub/price/log` — the plan-ladder hits and every estimate body.
 * `estimate=auto` answers by the number of picked categories.
 */
const PRICE_FIXTURES = join(
  fileURLToPath(new URL('.', import.meta.url)),
  '..',
  '..',
  'tests',
  'fixtures',
)

const PLANS_SCENARIOS: Record<string, [number, string]> = {
  recorded: [200, 'price/plans.json'],
  changed: [200, 'price/plans-b.json'],
  'unknown-version': [200, 'price/plans-unknown-version.json'],
  unavailable: [500, 'calculator/problem-unavailable.json'],
}
const ESTIMATE_SCENARIOS: Record<string, [number, string]> = {
  pro: [200, 'calculator/estimate-pro.json'],
  'pro-two': [200, 'calculator/estimate-pro-two.json'],
  'pro-three': [200, 'calculator/estimate-pro-three.json'],
  'max-x2': [200, 'calculator/estimate-maxx2-topup.json'],
  larger: [200, 'calculator/estimate-larger.json'],
  'empty-category': [200, 'calculator/estimate-empty-category.json'],
  'range-order': [400, 'calculator/problem-range-order.json'],
  'stale-category': [400, 'calculator/problem-stale-category.json'],
  unavailable: [500, 'calculator/problem-unavailable.json'],
}
const CATEGORIES_SCENARIOS: Record<string, [number, string]> = {
  recorded: [200, 'calculator/categories.json'],
  'empty-frontier': [200, 'calculator/categories-empty-frontier.json'],
  unavailable: [500, 'calculator/problem-unavailable.json'],
}

const price = {
  plans: 'recorded',
  estimate: 'auto',
  categories: 'recorded',
  hold: false,
  held: [] as (() => void)[],
  plansHits: 0,
  estimateBodies: [] as unknown[],
}

function priceFixture(name: string, unknownVersion = false): string {
  const text = readFileSync(join(PRICE_FIXTURES, name), 'utf8')
  return unknownVersion
    ? JSON.stringify({ ...JSON.parse(text), version: 99 })
    : text
}

function priceCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('access-control-allow-origin', origin)
    res.setHeader('vary', 'Origin')
  }
}

function handlePrice(
  url: URL,
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (url.pathname === '/__stub/price' && req.method === 'POST') {
    const q = url.searchParams
    if (q.get('reset') === '1') {
      Object.assign(price, {
        plans: 'recorded',
        estimate: 'auto',
        categories: 'recorded',
        hold: false,
        plansHits: 0,
        estimateBodies: [],
      })
    }
    for (const key of ['plans', 'estimate', 'categories'] as const) {
      const value = q.get(key)
      if (value !== null) price[key] = value
    }
    if (q.get('hold') === '1') price.hold = true
    res.writeHead(204)
    res.end()
    return true
  }
  if (url.pathname === '/__stub/price/release' && req.method === 'POST') {
    const held = price.held.splice(0)
    for (const answer of held) answer()
    res.writeHead(204)
    res.end()
    return true
  }
  if (url.pathname === '/__stub/price/log') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify({
        plansHits: price.plansHits,
        estimateBodies: price.estimateBodies,
      }),
    )
    return true
  }
  if (url.pathname === '/v1/public/plans') {
    price.plansHits += 1
    const [status, file] =
      PLANS_SCENARIOS[price.plans] ?? PLANS_SCENARIOS['recorded']!
    res.writeHead(status, {
      'content-type':
        status === 200 ? 'application/json' : 'application/problem+json',
    })
    res.end(priceFixture(file))
    return true
  }
  if (url.pathname.startsWith('/v1/public/calculator/')) {
    priceCors(req, res)
    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
      res.setHeader('access-control-allow-headers', 'Content-Type')
      res.writeHead(204)
      res.end()
      return true
    }
    if (url.pathname === '/v1/public/calculator/categories') {
      const [status, file] =
        CATEGORIES_SCENARIOS[price.categories] ??
        CATEGORIES_SCENARIOS['recorded']!
      res.writeHead(status, {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      })
      res.end(priceFixture(file))
      return true
    }
    if (
      url.pathname === '/v1/public/calculator/estimate' &&
      req.method === 'POST'
    ) {
      let raw = ''
      req.on('data', (chunk) => (raw += chunk))
      req.on('end', () => {
        let body: { categories?: unknown[] } = {}
        try {
          body = JSON.parse(raw)
        } catch {
          /* recorded as-is below */
        }
        price.estimateBodies.push(body)
        const unknown = price.estimate === 'unknown-version'
        const name =
          price.estimate === 'auto' || unknown
            ? (['pro', 'pro-two', 'pro-three'][
                (body.categories?.length ?? 1) - 1
              ] ?? 'pro')
            : price.estimate
        const [status, file] =
          ESTIMATE_SCENARIOS[name] ?? ESTIMATE_SCENARIOS['pro']!
        const answer = () => {
          res.writeHead(status, {
            'content-type':
              status === 200 ? 'application/json' : 'application/problem+json',
            'cache-control': 'no-store',
          })
          res.end(priceFixture(file, unknown))
        }
        if (price.hold) {
          price.hold = false
          price.held.push(answer)
        } else answer()
      })
      return true
    }
  }
  return false
}

function handle(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://stub.invalid')

  if (handlePrice(url, req, res)) return

  // ⚠️ THE APP'S STAND-IN (MOTIR-6749). In this lane the stub IS the app's
  // origin, so a reader who follows a read link off motir.co lands HERE. It
  // answers a one-line page naming the path it was asked for — enough for the
  // recording to show where the reader landed. A spec asserts the URL, never
  // this page's content: what the real app does there is the Visitor story's.
  if (url.pathname.startsWith('/p/')) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(
      `<!doctype html><title>Motir app</title><main style="font:16px system-ui;padding:48px">` +
        `<h1>The Motir app</h1><p>Stand-in for <code>app.motir.co${url.pathname.replace(/[<>&]/g, '')}</code> — ` +
        `sign-in and the Visitor view are the app’s, not this lane’s.</p></main>`,
    )
    return
  }

  if (url.pathname === '/__stub/mcp-tools' && req.method === 'POST') {
    const mode = url.searchParams.get('mode')
    if (mode !== 'recorded' && mode !== 'stripped' && mode !== 'failing') {
      res.writeHead(400, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ code: 'STUB_BAD_MODE', mode }))
      return
    }
    catalogueMode = mode
    res.writeHead(204)
    res.end()
    return
  }

  if (url.pathname === '/api/docs/mcp-tools.json') {
    if (catalogueMode === 'failing') {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ code: 'STUB_FORCED_FAILURE' }))
      return
    }
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(mcpToolCatalogue(catalogueMode, url.searchParams.get('locale')))
    return
  }

  const docsFile = DOCS_DOCUMENTS[url.pathname]
  if (docsFile !== undefined) {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(docsDocument(docsFile))
    return
  }

  if (url.pathname === '/__stub/ideas' && req.method === 'POST') {
    const mode = url.searchParams.get('mode')
    if (mode !== 'ok' && mode !== 'failing') {
      res.writeHead(400, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ code: 'STUB_BAD_MODE', mode }))
      return
    }
    ideasFailing = mode === 'failing'
    res.writeHead(204)
    res.end()
    return
  }

  if (url.pathname.startsWith('/api/public/ideas')) {
    if (ideasFailing) {
      res.writeHead(500, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ code: 'STUB_FORCED_FAILURE' }))
      return
    }
    const localized = localizedIdeas(url)
    if (localized) {
      res.writeHead(localized.status, { 'content-type': 'application/json' })
      res.end(localized.body)
      return
    }
    if (url.pathname === '/api/public/ideas') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(ideasList(url.searchParams))
      return
    }
  }

  if (FAILING.has(url.pathname)) {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ code: 'STUB_FORCED_FAILURE' }))
    return
  }

  const nonJson = NON_JSON[url.pathname]
  if (nonJson) {
    const [fixtureName, contentType] = nonJson
    res.writeHead(200, { 'content-type': contentType })
    res.end(fixture(fixtureName))
    return
  }

  const file = ROUTES[url.pathname]

  if (file === undefined) {
    // ⚠️ 404 WITH A `code`, which is the shape `motir-core` answers with — and
    // a LOUD one: the body names the path, so a spec that fails because the
    // stub has no fixture for a route says so instead of rendering an empty
    // state that looks like a product bug.
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ code: 'STUB_NO_FIXTURE', path: url.pathname }))
    return
  }

  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(fixture(file))
}

/** Every fixture this stub can serve — used by the lane's own self-check. */
export function fixtureFiles(): string[] {
  return readdirSync(FIXTURE_DIR).filter((name) => name.endsWith('.json'))
}

/*
 * ⚠️ THE LITERAL BELOW IS A HAND-RUN DEFAULT, NOT THE AUTHORITY.
 *
 * `e2e/stub/origin.ts` owns the port; `playwright.config.ts` passes it in as
 * `MOTIR_PUBLIC_API_STUB_PORT`, so under the lane this fallback is never
 * reached. It cannot simply IMPORT the constant: this file is launched by
 * `node --experimental-strip-types`, which is native ESM and needs an explicit
 * `./origin.ts` specifier — legal only with `allowImportingTsExtensions`, which
 * is not worth turning on repository-wide for one line.
 *
 * `standingRules.test.ts` asserts this literal still equals `STUB_PORT`, so the
 * two cannot drift apart in silence.
 */
const port = Number(process.env['MOTIR_PUBLIC_API_STUB_PORT'] ?? 4319)

createServer(handle).listen(port, '127.0.0.1', () => {
  // Playwright's `webServer` waits on this URL, so the line is also the
  // readiness signal a developer reads when the lane hangs.
  process.stdout.write(
    `public-api stub listening on http://127.0.0.1:${port}\n`,
  )
})
