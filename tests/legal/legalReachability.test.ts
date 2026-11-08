// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getLegalDocument,
  legalDocumentSlugs,
  listLegalDocuments,
} from '@/lib/legal/documents'
import { siteSitemapEntries } from '@/lib/siteSitemap'

/**
 * REACHABILITY AND FRONT-MATTER PARITY (Story MOTIR-3909 · MOTIR-4011).
 *
 * ⚠️ THE PROPERTY THIS PROTECTS IS "A DOCUMENT SHIPS BY EXISTING". The loader
 * globs `content/legal/` rather than enumerating slugs, and that is not
 * tidiness: the source repository's own card was written for SIX documents,
 * `model-providers.md` was added days later, and a hardcoded list of six would
 * have shipped a subprocessor page linking to a 404 — disclosing LESS than it
 * did before. So the guard is over the REAL directory, and it is what makes a
 * new document a file drop rather than an edit in four places.
 *
 * ⚠️ AND IT IS DRIVEN THROUGH THE REAL LOADER, not a fixture of one hand-written
 * document. That is the seam a unit test mocks away and the one that actually
 * broke: a document added and a route table not updated. A fixture cannot fail
 * that way.
 */

const LEGAL_DIR = join(process.cwd(), 'content', 'legal')

/** The directory, read the way the routes read it — the population, not a list. */
function slugsOnDisk(): string[] {
  return readdirSync(LEGAL_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
    .sort()
}

describe('every document in the directory is REACHABLE', () => {
  it('is not vacuous — the directory has the published set in it', () => {
    // A guard over an empty directory passes on every assertion below, which is
    // how a totality test dies quietly. Seven is what ships today; `>=` makes an
    // eighth document growth rather than a red suite.
    expect(slugsOnDisk().length).toBeGreaterThanOrEqual(7)
  })

  it('the loader returns EXACTLY the directory — no list can drift from it', () => {
    expect(legalDocumentSlugs().sort()).toEqual(slugsOnDisk())
  })

  it.each(slugsOnDisk())(
    '/legal/%s resolves to a document the route can render',
    (slug) => {
      // `getLegalDocument` returning null is precisely what the page 404s on, so
      // a non-null result IS the 200-shaped precondition.
      const doc = getLegalDocument(slug)
      expect(
        doc,
        `${slug} is on disk but the loader does not resolve it`,
      ).not.toBeNull()
      expect(doc!.title, `${slug} has no title`).not.toBe('')
      expect(doc!.body.trim(), `${slug} rendered an empty body`).not.toBe('')
    },
  )

  it('the SITEMAP carries every document — a page nobody can find is not published', async () => {
    // The sitemap builds its legal entries from `legalDocumentSlugs()`, so this
    // asserts the composition rather than a copied list. Removing a document
    // from the sitemap's source makes it red.
    const entries = siteSitemapEntries()
    const urls = entries.map((entry) => entry.url)
    for (const slug of slugsOnDisk()) {
      expect(
        urls.some((url) => url.endsWith(`/legal/${slug}`)),
        `/legal/${slug} is on disk but absent from the sitemap`,
      ).toBe(true)
    }
  })
})

describe('front-matter parity — the convention the materiality rule rides on', () => {
  // ⚠️ THIS INTENT MOVED HERE WITH THE DOCUMENTS. `motir-core`'s
  // `legalVersionGuard.test.ts` asserted it while the files lived there; they
  // are here now, and the guard could not follow them as-is because that
  // repository reads a configured manifest rather than these files. What it was
  // protecting is unchanged: `motir-core`'s `isMaterialChange` treats a version
  // it cannot parse as MATERIAL, which would hold every signed-in reader — so an
  // unparseable version published here has a consequence two repositories away.
  const documents = listLegalDocuments()

  it('has documents to check', () => {
    expect(documents.length).toBeGreaterThanOrEqual(7)
  })

  it.each(documents.map((doc) => [doc.slug, doc.version] as const))(
    '%s carries a version that parses as <major>.<minor>.<patch> — got %s',
    (_slug, version) => {
      expect(/^\d+\.\d+\.\d+$/.test(version)).toBe(true)
    },
  )

  it.each(documents.map((doc) => [doc.slug] as const))(
    '%s carries a title',
    (slug) => {
      expect(getLegalDocument(slug)!.title).not.toBe('')
    },
  )

  it('every document parses its front matter at all', () => {
    // A file whose front matter is unterminated parses as ALL BODY, which is
    // silent: the title falls back to the slug and the version is empty. So the
    // check is that no document looks like that.
    const unparsed = documents
      .filter((doc) => doc.version === '' || doc.title === doc.slug)
      .map((doc) => doc.slug)
    expect(unparsed).toEqual([])
  })

  it('no document leaks the TBD sentinel into a rendered field', () => {
    // `effectiveDate` is mapped to null; the guard is that the literal never
    // survives into something a page prints.
    for (const doc of documents) {
      expect(doc.effectiveDate).not.toBe('TBD')
      expect(doc.title).not.toContain('TBD')
    }
  })

  it('every file on disk OPENS and CLOSES its front-matter block near the top', () => {
    // ⚠️ THE CLOSING DELIMITER IS THE HALF THAT MATTERS, and it was found by
    // trying to break this guard. `splitFrontMatter` looks for the NEXT
    // `\n---\n` ANYWHERE in the file — so a document whose closing `---` is
    // missing does not fail: it finds a horizontal rule further down, swallows
    // the prose between into "front matter", and still yields a plausible title
    // and version. Asserting only that the file STARTS with `---` passes on
    // exactly that, which is what the first version of this test did. So the
    // block is required to CLOSE where a block closes.
    for (const slug of slugsOnDisk()) {
      const lines = readFileSync(join(LEGAL_DIR, `${slug}.md`), 'utf8').split(
        '\n',
      )
      expect(lines[0], `${slug}.md does not open a front-matter block`).toBe(
        '---',
      )
      const close = lines.slice(1, 12).indexOf('---')
      expect(
        close,
        `${slug}.md does not close its front-matter block in the first 12 lines`,
      ).not.toBe(-1)
    }
  })
})

/**
 * ── ⚠️ NO LEGAL LINK IS A PATH THIS HOST DOES NOT SERVE (MOTIR-4147) ────────
 *
 * The Privacy Policy's §7 linked to `/settings/account/data` — the account
 * pane where a reader exercises their GDPR Art. 15/17 rights. That path was
 * correct while these documents lived on `app.motir.co` and is a 404 here, so
 * the one sentence in the policy that tells a reader HOW to exercise a right
 * pointed at nothing.
 *
 * ⚠️ THE FIXED LINK IS NOT THE DELIVERABLE — THIS GUARD IS. One link says
 * nothing about the next document, and the class is easy to re-enter: every
 * one of these files was written for a host that served the whole product,
 * so a bare path READS correct to whoever writes the next one.
 *
 * The population is the SHIPPED body — `listLegalDocuments()` after
 * `expandDestinations`, which is the text a reader's browser receives — not
 * the raw file. That matters in both directions: a `{{TOKEN}}` is judged by
 * what it RESOLVES to, and an unresolved one cannot hide behind "it is only a
 * placeholder".
 *
 * The servable shapes, and there are exactly four:
 *
 *   - `/legal/<slug>` where the slug is a document ON DISK — this host serves
 *     it, and the slug is checked rather than the shape, so a link to a
 *     document that does not exist is as red as a link to another host's path.
 *   - an absolute `https?://` URL — it names its own host, whichever that is.
 *   - `mailto:` — already in the set (`content/legal/dpa.md`), and it leaves
 *     the browser rather than this origin.
 *   - `#anchor` — in-page, resolved against whatever URL is showing it.
 *
 * Anything else is a link this site cannot serve.
 */

/** Every link target in a Markdown body — inline links AND reference definitions. */
function linkTargets(body: string): string[] {
  const targets: string[] = []
  // `](target)`, tolerating `<…>` and a trailing "title".
  for (const m of body.matchAll(/\]\(\s*<?([^)\s>]+)>?[^)]*\)/g)) {
    targets.push(m[1])
  }
  // `[id]: target` at the start of a line — nothing uses these today, and the
  // guard is worthless the day somebody does if it cannot see them.
  for (const m of body.matchAll(/^\[[^\]]+\]:\s*<?([^\s>]+)>?/gm)) {
    targets.push(m[1])
  }
  return targets
}

/** Can THIS host serve this href? The predicate both halves of the guard use. */
function isServableLink(href: string, slugs: readonly string[]): boolean {
  if (href.startsWith('#')) return true
  if (/^https?:\/\//.test(href)) return true
  if (href.startsWith('mailto:')) return true
  // A fragment on a legal path is still that path.
  const path = href.split('#')[0]
  const legal = /^\/legal\/([a-z0-9-]+)$/.exec(path)
  return legal !== null && slugs.includes(legal[1])
}

/** Every unservable link in a body, as `slug → href` for a readable failure. */
function unservableLinks(
  slug: string,
  body: string,
  slugs: readonly string[],
): string[] {
  return linkTargets(body)
    .filter((href) => !isServableLink(href, slugs))
    .map((href) => `${slug}: ${href}`)
}

describe('every link in the legal set is one this host can serve', () => {
  const slugs = slugsOnDisk()
  const documents = listLegalDocuments()

  it('is not vacuous — the extractor finds the links that are actually there', () => {
    // A regex that matches nothing passes every assertion below. Twenty-one
    // links ship today (sixteen `/legal/*`, four absolute, one `mailto:`);
    // `>=` makes a new link growth rather than a red suite, and any number
    // near zero means the extractor stopped working.
    const found = documents.flatMap((doc) => linkTargets(doc.body))
    expect(found.length).toBeGreaterThanOrEqual(20)
  })

  it('no document links to a path this host does not serve', () => {
    const offenders = documents.flatMap((doc) =>
      unservableLinks(doc.slug, doc.body, slugs),
    )
    expect(offenders).toEqual([])
  })

  it('FAILS when the old link is put back — the guard is shown, not asserted', () => {
    // ⚠️ THE COUNTERFACTUAL IS THE TEST. A totality guard over a directory that
    // no longer contains a violation passes for two different reasons and
    // cannot tell them apart. So the defect is REINTRODUCED into the real
    // privacy body, verbatim as it shipped, and the guard is required to name
    // it — driven through the same `unservableLinks` the assertion above uses,
    // never a second copy of the predicate.
    const privacy = documents.find((doc) => doc.slug === 'privacy')!
    const regressed = privacy.body.replace(
      /\[In your account settings\]\([^)]*\)/,
      '[In your account settings](/settings/account/data)',
    )
    expect(regressed, 'the §7 link was not found to regress').not.toBe(
      privacy.body,
    )
    expect(unservableLinks('privacy', regressed, slugs)).toEqual([
      'privacy: /settings/account/data',
    ])
  })

  it('accepts the four servable shapes and nothing else', () => {
    expect(isServableLink('/legal/privacy', slugs)).toBe(true)
    expect(isServableLink('/legal/privacy#7-your-rights', slugs)).toBe(true)
    expect(
      isServableLink('https://app.motir.co/settings/account/data', slugs),
    ).toBe(true)
    expect(isServableLink('mailto:legal@motir.co', slugs)).toBe(true)
    expect(isServableLink('#7-your-rights', slugs)).toBe(true)

    // A legal path naming no document is a 404 exactly as a foreign path is —
    // the slug is checked, not the shape.
    expect(isServableLink('/legal/no-such-document', slugs)).toBe(false)
    expect(isServableLink('/settings/account/data', slugs)).toBe(false)
    expect(isServableLink('/sign-in', slugs)).toBe(false)
    expect(isServableLink('/', slugs)).toBe(false)
    expect(isServableLink('privacy.md', slugs)).toBe(false)
  })

  it('no unresolved destination token survives into a shipped body', () => {
    // `expandDestinations` throws on an UNKNOWN token, so this covers the
    // other half: a token that is never expanded because nothing ran, and a
    // near-miss like `{{ DATA_PRIVACY_PANE }}` the substitution regex does not
    // match. Either one reaches a reader as literal braces in a legal document.
    for (const doc of documents) {
      expect(doc.body, `${doc.slug} carries an unresolved token`).not.toMatch(
        /\{\{.*?\}\}/,
      )
    }
  })
})

describe("the Privacy Policy's §7 data-rights link (MOTIR-4147)", () => {
  it('is the account pane on the APP origin, BUILT from the configured origin', () => {
    // ⚠️ THE TEST ENVIRONMENT'S ORIGIN IS NOT PRODUCTION (`vitest.config.mts`
    // sets `https://app.test.motir.co`), which is the whole point: a hardcoded
    // `https://app.motir.co` in the document would pass an assertion written
    // against production and fail this one.
    const privacy = listLegalDocuments().find((doc) => doc.slug === 'privacy')!
    expect(privacy.body).toContain(
      '[In your account settings](https://app.test.motir.co/settings/account/data)',
    )
    expect(privacy.body).not.toContain('](/settings/account/data)')
  })
})
