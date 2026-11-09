# MOTIR-10759 — the Worker against the Next site at `b9ff37a`

A one-off comparison, run once on 2026-11-09 against local servers, before the
Next tree is deleted at the cut. Nothing in the repository runs it: the scripts
are reproduced at the end of this file for the record, and the Next checkout
was a separate `git worktree` outside this tree.

**Result: no defect found.** All 120 pairs answered with the same status. Of
the 96 page pairs, all 96 have identical canonical, hreflang set, `<html lang>`,
`<title>` and visible text; 36 differ in `og:locale` only, and that difference is
explained below. `changelog.xml` is identical in all 12 locales; the project
sitemap is identical at its one address and answers 404 on both sides under
every locale prefix. The share card differs in 14 of 756,000 pixels.

## The two sides

|            | Worker                                                                                                    | Next                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Commit     | `main` at `27a51d3` (the merge of #131, MOTIR-10635)                                                      | `main` at `b9ff37a70cc1d3729ce465d97be6e9ee9bae0540` |
| Build      | `pnpm build` (Astro 7.4.7), origins pointed at the stub                                                   | `pnpm build` (`next build --webpack`), same env      |
| Server     | `wrangler dev --ip 127.0.0.1 --port 4318 --var MOTIR_APP_ORIGIN:http://127.0.0.1:4319` (wrangler 4.158.0) | `node .next/standalone/server.js` on 127.0.0.1:4320  |
| App origin | the e2e stub, `e2e/stub/publicApiStub.ts` from `27a51d3`, on 127.0.0.1:4319                               | the same stub process                                |

Build env for both: `NEXT_PUBLIC_MOTIR_APP_ORIGIN` and
`NEXT_PUBLIC_MOTIR_AI_ORIGIN` = `http://127.0.0.1:4319`,
`NEXT_PUBLIC_MOTIR_TENANT_DOMAIN=localhost`, `SKILLS_RELEASE_TAG=v0.8.1`. The
site origin was left at its default, `https://motir.co`, on both sides, so
canonicals and hreflang are production addresses.

**Stub content used.** The stub's committed fixtures already carry every
compared surface, so nothing was seeded beyond them: project key **`MOTIR`**
(overview, changelog with entries, Atom feed), request **`MOTIR-4051`**, topic
slug **`developer-tools`**, the idea store (`ideas.json`, `ideas-tags.json`,
with localized stores for de, ja, ko, pl, zh) and the project index for the
sitemap.

## 1. Page and feed comparison — 10 addresses × 12 locales

Each address was fetched from both servers with redirects not followed. For an
HTML answer the script compares status, `link[rel=canonical]`, the sorted
`hreflang` set (`hreflang=href` pairs), `og:locale`, `<html lang>`, `<title>`,
and the visible text: `body.textContent` after removing `script`, `style`,
`noscript` and `template`, with whitespace collapsed. Nothing else was
normalised, so no build id or hashed asset name could hide a difference (none
appears in visible text). The two documents were compared on status, content
type and body, with whitespace between tags removed, `<entry>`/`<url>` blocks
sorted and the feed-level `<updated>` masked. A 404 pair is compared on status
and `<html lang>`. The comparison was run twice and gave the same result both
times.

Each cell is `Worker/Next` status, then ✓ (identical on every compared field) or
⚠ and the field that differs.

| Address                          | en                 | zh                 | zh-tw              | ja                 | ko                 | de                 | fr                 | es                 | it                 | nl                 | pl                 | pt                 |
| -------------------------------- | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ | ------------------ |
| `/p/MOTIR`                       | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale |
| `/p/MOTIR/changelog`             | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale |
| `/p/MOTIR/changelog.xml`         | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          |
| `/p/MOTIR/requests/MOTIR-4051`   | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale | 200/200 ⚠ ogLocale |
| `/p/MOTIR/requests/new`          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          |
| `/explore`                       | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          |
| `/explore/topic/developer-tools` | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          |
| `/ideas`                         | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          |
| `/motir-builds-itself`           | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          | 200/200 ✓          |
| `/sitemap-projects.xml`          | 200/200 ✓          | 404/404 ⚠ lang     | 404/404 ⚠ lang     | 404/404 ⚠ lang     | 404/404 ⚠ lang     | 404/404 ⚠ lang     | 404/404 ⚠ lang     | 404/404 ⚠ lang     | 404/404 ⚠ lang     | 404/404 ⚠ lang     | 404/404 ⚠ lang     | 404/404 ⚠ lang     |

**Pairs compared: 120** — 96 page pairs (8 HTML addresses × 12 locales) and 24
document pairs (`changelog.xml` and `/sitemap-projects.xml` × 12 locales).
**Pairs with any difference: 47** — every one of them listed below.

### Every difference, with its reason

1. **`og:locale` on the three `/p/MOTIR` pages that read the project — 36 pairs**
   (`/p/MOTIR`, `/p/MOTIR/changelog`, `/p/MOTIR/requests/MOTIR-4051`, × 12
   locales). The Worker writes `og:locale` (`en_US`, `de_DE`, `zh_TW`, …) and the
   eleven others as `og:locale:alternate`; the Next build writes no `og:locale`
   on these pages.
   **Classification: harmless render difference, made on purpose by the port.**
   Next lost the tag because these pages' `openGraph` object replaced the
   site's whole (`app/[locale]/p/[identifier]/page.tsx` at `b9ff37a` sets
   `openGraph` with no `locale`), while every other page, including
   `/p/MOTIR/requests/new` and `/explore`, carried it. MOTIR-10753's
   `app/[locale]/p/[identifier]/projectMetadata.ts` names it deliberately
   ("`og:locale` names the page's locale and the other eleven as alternates, as
   every built page does"). The canonical, hreflang set and `<html lang>` of
   these pages are identical, so nothing a crawler indexes by moves; a link
   unfurler gains a correct locale. It is not a narrowing the story states, and
   it does differ from the letter of the story's first criterion ("the same …
   `og:locale`"), which is why it is listed rather than waved through. No bug
   is filed: nothing is broken, and removing a correct tag to match an
   omission would be a regression.
2. **The localized not-found page for `/<locale>/sitemap-projects.xml` — 11
   pairs** (zh … pt). Both answer 404 with `text/html`. The Worker serves that
   locale's built not-found room (`lang="de"`, "Diese Seite gibt es hier
   nicht"); Next's answer is its root error shell, which has no `lang` and no
   visible text without JavaScript.
   **Classification: harmless render difference.** The project sitemap exists
   only unprefixed on both sides, and the Worker's answer is the story's own
   rule ("a path neither the assets nor the live surface match answers 404
   with that locale's not-found page").

Outside the compared fields, one more difference was seen and is recorded for
the reviewer: the project pages' `og:image` is
`https://motir.co/p/MOTIR/opengraph-image` on the Worker for every locale, and
`https://motir.co/<locale>/p/MOTIR/opengraph-image?<hash>` on Next. It is the
same image (below), and one unprefixed address per project is MOTIR-10758's
stated choice (`projectCardImage`).

## 2. The per-project share image

Fetched from both servers at `/p/MOTIR/opengraph-image` (English) and
`/de/p/MOTIR/opengraph-image` and `/ja/p/MOTIR/opengraph-image` (non-English).

|                            | Worker                 | Next                   |
| -------------------------- | ---------------------- | ---------------------- |
| Status, type               | 200, `image/png`       | 200, `image/png`       |
| Dimensions                 | 1200 × 630, 8-bit RGBA | 1200 × 630, 8-bit RGBA |
| File size                  | 37,485 bytes           | 45,706 bytes           |
| Same bytes across en/de/ja | yes                    | yes                    |

Pixel comparison (decoded RGBA, per-pixel maximum channel delta):

| Pair | Pixels over tolerance | Share  | Mean delta  | Max delta | Where                            |
| ---- | --------------------- | ------ | ----------- | --------- | -------------------------------- |
| en   | 14 of 756,000         | 0.002% | 0.077 / 255 | 43 / 255  | x 99–171, y 80–451 (glyph edges) |
| de   | 14 of 756,000         | 0.002% | 0.077 / 255 | 43 / 255  | same                             |

**Tolerance: 32 / 255 per channel.** The two cards come from two rasterisers —
the Worker draws with satori 0.32 and `@resvg/resvg-wasm`, Next's `next/og`
with its bundled satori and resvg — so anti-aliasing and sub-pixel glyph
placement differ slightly. 32/255 absorbs that while any changed colour, block,
line of text or font would light up thousands of pixels. The 14 pixels are
isolated edge pixels of the logo mark and the title glyphs; a visual check of
both files shows the same card (logo, "moooon B.V.", "Motir", the tagline, the
same gradient). Limit: the stub's projects have Latin names, so this pair does
not exercise the CJK font path; the share-image card's own tests cover it.

## 3. The story's 11-step verification recipe

Run against the Worker on `wrangler dev` above, with curl and a headless
Chromium (Playwright). All 11 steps pass.

| #   | Step                                                                           | Observed                                                                                                                                                                                                                                                                                                                                                                       | Result                      |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| 1   | Install, build, start wrangler dev with the Worker and assets against the stub | `pnpm build` built 420 pages; `wrangler dev` served built pages and Worker routes                                                                                                                                                                                                                                                                                              | pass                        |
| 2   | Project page, under `/de/` and `/zh-tw/`                                       | `/p/MOTIR`, `/de/p/MOTIR`, `/zh-tw/p/MOTIR`: 200, `lang` `en` / `de` / `zh-TW`, overview and the changelog tab (`/de/p/MOTIR/changelog` link). Visible text identical to Next in all 12 locales (section 1)                                                                                                                                                                    | pass                        |
| 3   | Changelog, `changelog.xml`, a request, new-request; the board tab              | 200 `text/html`, 200 `application/atom+xml`, 200, 200; `/p/MOTIR/board` → 308 `http://127.0.0.1:4319/p/MOTIR/board` (the app), `/de/p/MOTIR/items` → 308 `…/p/MOTIR/items`; Next answers the same 308                                                                                                                                                                          | pass                        |
| 4   | The share image                                                                | Same card as Next (section 2)                                                                                                                                                                                                                                                                                                                                                  | pass                        |
| 5   | Stub stopped: project page and `/explore`; stub up: unknown key                | Stub down: `/p/MOTIR` 200 "We could not load this project — The Motir application is not answering right now…", `/de/p/MOTIR/changelog` 200 "Dieses Projekt konnte nicht geladen werden…", `/explore` 200 "Couldn't load the project square…" — identical text to Next stub-down; `changelog.xml` 503. Stub up: `/p/NOPE` 404 `lang="en"`, `/de/p/NOPE` 404 `lang="de"`        | pass                        |
| 6   | `/explore`, a topic, `/ideas`; five tags settle on three                       | 200, 200, 200. Browser on `/ideas?tag=ai-agents&tag=b2b-saas&tag=caregiving&tag=compliance&tag=consumer&q=x` landed on `/ideas?q=x&tag=ai-agents&tag=b2b-saas&tag=caregiving` (3 tags); curl shows the 308                                                                                                                                                                     | pass                        |
| 7   | Crawler refusals                                                               | `curl -A Googlebot /ideas?tag=x` → 403; `curl -A AhrefsBot /explore` → 403; `curl -A AhrefsBot /robots.txt` → 200                                                                                                                                                                                                                                                              | pass                        |
| 8   | Language detection on the bare `/`                                             | German browser, no cookie: `/` → 307 to `/de` (`Vary: Cookie, Accept-Language`, `Cache-Control: private, no-store`), page `lang="de"`. Chose English in the switcher: `NEXT_LOCALE=en` set, `/` stays `/`, `lang="en"`, `Vary: Cookie, Accept-Language`. `/price` with German: 200 English, no redirect; `/explore` with German and `NEXT_LOCALE=de`: 200 English, no redirect | pass                        |
| 9   | Mis-cased locale and localized 404                                             | `/zh-TW/price` → 308 `/zh-tw/price` (browser lands on `/zh-tw/price`, `lang="zh-TW"`); `/DE/explore?rank=new` → 308 `/de/explore?rank=new`; `/de/does-not-exist` → 404, `lang="de"`, "Diese Seite gibt es hier nicht"                                                                                                                                                          | pass                        |
| 10  | Log lines (the dev server's own output, below)                                 | `/price`, `/ja/docs`, `/robots.txt`, `/opengraph-image`: no Worker line; `/p/MOTIR`, `/explore`, `/ideas`, `/motir-builds-itself`: one line each                                                                                                                                                                                                                               | pass                        |
| 11  | The report, the re-included specs and the gates on the PR                      | This report; the spec list and the gates are below                                                                                                                                                                                                                                                                                                                             | pass (gates: see section 5) |

### Step 10 — the dev server's terminal

`[wrangler:info]` is wrangler's own access line for every request; the JSON
`{"msg":"request",…}` line is the Worker's (`worker/requestLog.ts`). Requests
for the four built pages:

```text
[wrangler:info] GET /price 200 OK (6ms)
[wrangler:info] GET /ja/docs 200 OK (7ms)
[wrangler:info] GET /robots.txt 200 OK (5ms)
[wrangler:info] GET /opengraph-image 200 OK (6ms)
```

Then the four live pages:

```text
{"msg":"request","method":"GET","path":"/p/MOTIR","query":"","ua":"curl/8.5.0","edge":"iad","refused":false}
[wrangler:info] GET /p/MOTIR 200 OK (46ms)
{"msg":"request","method":"GET","path":"/explore","query":"","ua":"curl/8.5.0","edge":"iad","refused":false}
[wrangler:info] GET /explore 200 OK (61ms)
{"msg":"request","method":"GET","path":"/ideas","query":"","ua":"curl/8.5.0","edge":"iad","refused":false}
[wrangler:info] GET /ideas 200 OK (150ms)
{"msg":"request","method":"GET","path":"/motir-builds-itself","query":"","ua":"curl/8.5.0","edge":"iad","refused":false}
[wrangler:info] GET /motir-builds-itself 200 OK (104ms)
```

No line carries an IP address.

## 4. The Worker bundle

```text
$ wrangler deploy --dry-run --outdir <scratch>/bundle
Total Upload: 9453.73 KiB / gzip: 2452.17 KiB
```

The bundle is `index.js` (7,130,276 bytes), the resvg wasm (2,478,606 bytes)
and yoga's wasm (71,736 bytes).

**The limit, read on 2026-11-09 from
<https://developers.cloudflare.com/workers/platform/limits/> (section "Worker
size"):** "Worker size (uncompressed) 64 MiB" on Workers Paid (and Free), and
"There is no compressed size limit. Only the uncompressed bundle size counts.
… The Total Upload value is your uncompressed bundle size. The gzip value is
shown for reference but is not a limit."

So the compressed size the card asked for is **2,452.17 KiB**, recorded for
reference, and the figure Cloudflare now limits is the uncompressed
**9,453.73 KiB (9.23 MiB), within the 64 MiB limit** with about 54.8 MiB to
spare.

**No share-image font is bundled.** Searched `index.js` and both wasm files:

- no WOFF2 signature (`wOF2`) and no base64 font header (`d09GMg`, `d09GRg`,
  `T1RUTw`) anywhere;
- the one `wOFF` and nine `OTTO` hits are in satori's font-format sniffing
  code, and the `glyf` hits are opentype table-name strings in the parser;
- the one long base64 literal (5,160 characters) is the line-break Unicode
  trie of the `linebreak` package, not a font;
- `Inter-Regular.ttf`, `Inter-Bold.ttf` and `Inter-ExtraBold.ttf` appear only
  as file names in `worker/share/fonts.ts`'s table, which reads them from the
  static assets at draw time; "Noto Sans" appears only as family names.

## 5. Gates and the re-included specs

The Worker's code was gated on #131 (MOTIR-10635), at its head `2f031d8`, run
42548231225: **E2E success, Test success, Typecheck success, Lint success,
Build success** (also Design guards and CodeQL success; the Vercel deploy and
the live seam skipped, as on every pull request). This pull request runs the
same five gates over `main` with only this file added; their result is
recorded in the comment that carries this report on the pull request.

The specs MOTIR-10758 re-included, as #131 lists them:
`acceptance-ideas.spec.ts`, `acceptance-ideas-categories.spec.ts`,
`acceptance-ideas-localized.spec.ts`, `acceptance-public-project.spec.ts`,
`acceptance-read-pages-move.spec.ts`, `acceptance-public-address.spec.ts`,
`project-acts.spec.ts`, `project-crawl.spec.ts`, `project-detail.spec.ts`,
`project-overview.spec.ts`, `project-tabs.spec.ts`,
`acceptance-eleven-languages-live.spec.ts`,
`acceptance-docs-eleven-languages-live.spec.ts`, `smoke-live.spec.ts`,
`locale-links-live.spec.ts`, `not-found-live.spec.ts`, `landmark-live.spec.ts`,
`languageSwitcher-live.spec.ts`, `acceptance-legal-binding-english-live.spec.ts`,
and the two new ones, `worker-invocation.spec.ts` and
`worker-edge-rules.spec.ts`.

## The throwaway scripts

Kept here for the record only. Nothing in the repository imports or runs them;
they read `jsdom`, `sharp` and `playwright` from a local install.

<details><summary><code>compare.mjs</code> — the 10 × 12 comparison</summary>

```js
// THROWAWAY (MOTIR-10759): compare the Worker (wrangler dev) with a Next build
// of main b9ff37a, both reading the same e2e stub. Not part of the repository.
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'

const require = createRequire(
  '/home/user/motir-marketing-motir-10759/package.json',
)
const { JSDOM } = require('jsdom')

const WORKER = process.env.WORKER ?? 'http://127.0.0.1:4318'
const NEXT = process.env.NEXT ?? 'http://127.0.0.1:4320'
const OUT = process.argv[2] ?? 'results.json'

const LOCALES = [
  'en',
  'zh',
  'zh-tw',
  'ja',
  'ko',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pl',
  'pt',
]
const KEY = 'MOTIR'
const REQUEST = 'MOTIR-4051'
const TOPIC = 'developer-tools'
const PAGES = [
  `/p/${KEY}`,
  `/p/${KEY}/changelog`,
  `/p/${KEY}/requests/${REQUEST}`,
  `/p/${KEY}/requests/new`,
  '/explore',
  `/explore/topic/${TOPIC}`,
  '/ideas',
  '/motir-builds-itself',
]
const DOCS = [`/p/${KEY}/changelog.xml`, '/sitemap-projects.xml']

const prefixed = (locale, path) =>
  locale === 'en' ? path : `/${locale}${path}`

async function get(base, path) {
  const res = await fetch(base + path, { redirect: 'manual' })
  const body = await res.text()
  return {
    status: res.status,
    type: (res.headers.get('content-type') ?? '').split(';')[0].trim(),
    location: res.headers.get('location'),
    body,
  }
}

const collapse = (s) => s.replace(/\s+/g, ' ').trim()

function extract(html) {
  const doc = new JSDOM(html).window.document
  for (const el of doc.querySelectorAll('script, style, noscript, template'))
    el.remove()
  const attr = (sel, name) => doc.querySelector(sel)?.getAttribute(name) ?? null
  const hreflang = [...doc.querySelectorAll('link[rel="alternate"][hreflang]')]
    .map((l) => `${l.getAttribute('hreflang')}=${l.getAttribute('href')}`)
    .sort()
  return {
    canonical: attr('link[rel="canonical"]', 'href'),
    hreflang: hreflang.join(' | '),
    ogLocale: attr('meta[property="og:locale"]', 'content'),
    lang: doc.documentElement.getAttribute('lang'),
    title: collapse(doc.title ?? ''),
    text: collapse(doc.body?.textContent ?? ''),
  }
}

// Document bodies (Atom feed, sitemap): ordering of <entry>/<url> blocks and
// timestamps that are generated per request are normalised; nothing else is.
function normaliseDoc(body) {
  let b = body.replace(/>\s+</g, '><').trim()
  b = b.replace(
    /<updated>[^<]*<\/updated>/,
    '<updated>(feed-updated)</updated>',
  )
  const blocks = (tag) => {
    const re = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, 'g')
    const found = b.match(re) ?? []
    if (found.length === 0) return
    const sorted = [...found].sort()
    let i = 0
    b = b.replace(re, () => sorted[i++])
  }
  blocks('entry')
  blocks('url')
  return b
}

function firstDiff(a, b) {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  const from = Math.max(0, i - 60)
  return { at: i, worker: a.slice(from, i + 140), next: b.slice(from, i + 140) }
}

const rows = []
for (const locale of LOCALES) {
  for (const path of PAGES) {
    const url = prefixed(locale, path)
    const [w, n] = await Promise.all([get(WORKER, url), get(NEXT, url)])
    const row = { kind: 'page', locale, path: url, diffs: {} }
    if (w.status !== n.status)
      row.diffs.status = { worker: w.status, next: n.status }
    if (w.status === 200 && n.status === 200) {
      const we = extract(w.body)
      const ne = extract(n.body)
      for (const f of ['canonical', 'hreflang', 'ogLocale', 'lang', 'title']) {
        if (we[f] !== ne[f]) row.diffs[f] = { worker: we[f], next: ne[f] }
      }
      if (we.text !== ne.text) row.diffs.text = firstDiff(we.text, ne.text)
      row.textLength = { worker: we.text.length, next: ne.text.length }
    } else if (w.location !== n.location) {
      row.diffs.location = { worker: w.location, next: n.location }
    }
    row.status = { worker: w.status, next: n.status }
    rows.push(row)
  }
  for (const path of DOCS) {
    const url = prefixed(locale, path)
    const [w, n] = await Promise.all([get(WORKER, url), get(NEXT, url)])
    const row = {
      kind: 'document',
      locale,
      path: url,
      diffs: {},
      status: { worker: w.status, next: n.status },
    }
    if (w.status !== n.status)
      row.diffs.status = { worker: w.status, next: n.status }
    if (w.type !== n.type) row.diffs.type = { worker: w.type, next: n.type }
    if (w.status === 200 && n.status === 200) {
      const wb = normaliseDoc(w.body)
      const nb = normaliseDoc(n.body)
      if (wb !== nb) row.diffs.body = firstDiff(wb, nb)
    } else if (w.status === 404 && n.status === 404) {
      // both not-found: compare the not-found room's identity, not its markup
      const we = w.type === 'text/html' ? extract(w.body) : null
      const ne = n.type === 'text/html' ? extract(n.body) : null
      if (we && ne && we.lang !== ne.lang)
        row.diffs.lang = { worker: we.lang, next: ne.lang }
    }
    rows.push(row)
  }
}

writeFileSync(OUT, JSON.stringify(rows, null, 2))
const differing = rows.filter((r) => Object.keys(r.diffs).length > 0)
console.log(
  `pairs compared: ${rows.length} (pages ${rows.filter((r) => r.kind === 'page').length}, documents ${rows.filter((r) => r.kind === 'document').length})`,
)
console.log(`pairs differing: ${differing.length}`)
for (const r of differing)
  console.log(
    `${r.path}\t${Object.keys(r.diffs).join(',')}\t${r.status.worker}/${r.status.next}`,
  )
```

</details>

<details><summary><code>pixels.mjs</code> — the share-image pixel comparison</summary>

```js
// THROWAWAY (MOTIR-10759): pixel comparison of the two share cards.
import { createRequire } from 'node:module'
const require = createRequire(
  '/home/user/motir-marketing-motir-10759/package.json',
)
const sharp = require('sharp')

const [a, b, out] = process.argv.slice(2)
const load = async (f) => {
  const { data, info } = await sharp(f)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, info }
}
const A = await load(a)
const B = await load(b)
if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
  console.log('dimensions differ', A.info, B.info)
  process.exit(1)
}
const { width, height } = A.info
const px = width * height
// Per-channel tolerance 32/255: absorbs anti-aliasing and sub-pixel glyph
// placement between two rasterisers (Satori+resvg-wasm vs next/og's
// Satori+resvg) without hiding a changed colour, block or line of text.
const TOL = 32
let differing = 0
let maxDelta = 0
let sumDelta = 0
const diff = Buffer.alloc(px * 4)
let minX = width,
  minY = height,
  maxX = -1,
  maxY = -1
for (let i = 0; i < px; i++) {
  let d = 0
  for (let c = 0; c < 4; c++)
    d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c]))
  maxDelta = Math.max(maxDelta, d)
  sumDelta += d
  const off = d > TOL
  if (off) {
    differing++
    const x = i % width,
      y = Math.floor(i / width)
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  diff[i * 4] = off ? 255 : A.data[i * 4] >> 2
  diff[i * 4 + 1] = off ? 0 : A.data[i * 4 + 1] >> 2
  diff[i * 4 + 2] = off ? 0 : A.data[i * 4 + 2] >> 2
  diff[i * 4 + 3] = 255
}
if (out)
  await sharp(diff, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(out)
console.log(
  JSON.stringify({
    width,
    height,
    tolerance: TOL,
    differingPixels: differing,
    differingPct: +((differing / px) * 100).toFixed(3),
    meanDelta: +(sumDelta / px).toFixed(3),
    maxDelta,
    bbox: differing ? { minX, minY, maxX, maxY } : null,
  }),
)
```

</details>

<details><summary><code>browser.cjs</code> — the browser half of recipe steps 6, 8 and 9</summary>

```js
// THROWAWAY (MOTIR-10759): the browser half of recipe steps 6 and 8.
const { chromium } = require('playwright')
const W = 'http://127.0.0.1:4318'
;(async () => {
  const browser = await chromium.launch()
  // Step 6: an /ideas address carrying five tags settles on three.
  {
    const page = await browser.newPage()
    const five = `${W}/ideas?tag=ai-agents&tag=b2b-saas&tag=caregiving&tag=compliance&tag=consumer&q=x`
    const res = await page.goto(five)
    const u = new URL(page.url())
    console.log(
      'step6 landed',
      res.status(),
      u.pathname + u.search,
      'tags=',
      u.searchParams.getAll('tag').length,
    )
    await page.close()
  }
  // Step 8: a German browser with no cookie lands on /de; choosing English
  // in the switcher keeps / English; /price stays English.
  {
    const ctx = await browser.newContext({
      locale: 'de-DE',
      extraHTTPHeaders: { 'Accept-Language': 'de-DE,de;q=0.9' },
    })
    const page = await ctx.newPage()
    await page.goto(`${W}/`)
    console.log(
      'step8a',
      new URL(page.url()).pathname,
      await page.getAttribute('html', 'lang'),
    )
    // the language switcher: pick English
    const switcher = page
      .locator(
        '[data-language-switcher], nav [aria-label*="Sprache"], button[aria-haspopup]',
      )
      .first()
    let chose = 'cookie'
    try {
      const english = page.getByRole('link', { name: /^English$/ }).first()
      if (!(await english.isVisible())) await switcher.click({ timeout: 3000 })
      await english.click({ timeout: 3000 })
      await page.waitForLoadState('load')
      chose = 'switcher'
    } catch (e) {
      await ctx.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: W }])
    }
    const cookies = (await ctx.cookies()).filter(
      (c) => c.name === 'NEXT_LOCALE',
    )
    console.log(
      'step8b chose English via',
      chose,
      'cookie=',
      cookies.map((c) => c.value).join(','),
      'now at',
      new URL(page.url()).pathname,
    )
    await page.goto(`${W}/`)
    console.log(
      'step8c',
      new URL(page.url()).pathname,
      await page.getAttribute('html', 'lang'),
    )
    await ctx.clearCookies()
    await page.goto(`${W}/price`)
    console.log(
      'step8d',
      new URL(page.url()).pathname,
      await page.getAttribute('html', 'lang'),
    )
    await ctx.close()
  }
  // Step 9 in a browser: the mis-cased address bar settles lower-case.
  {
    const page = await browser.newPage()
    await page.goto(`${W}/zh-TW/price`)
    console.log(
      'step9',
      new URL(page.url()).pathname,
      await page.getAttribute('html', 'lang'),
    )
    await page.close()
  }
  await browser.close()
})()
```

</details>
