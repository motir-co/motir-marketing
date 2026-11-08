import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LOCALES, type Locale } from '@/i18n/routing'
import {
  DocsArtifactUnavailableError,
  forgetDocsArtifactReads,
} from '@/lib/docs'
import { DOCS_ROUTES } from '@/lib/docsSurfaces'
import {
  docsPages,
  renderDocsRoute,
  routeOf,
  spacedText,
  stubDocsFetch,
  stubDocsUnreachable,
} from '@/tests/helpers/docsRoutes'
import allowlist from './fixtures/terminologyAllowlist.json'

/*
 * THE TERMINOLOGY SWEEP, ON THE RENDER (MOTIR-4508).
 *
 * ── The defect this exists for, which is a GREEN TEST rather than a red one ─
 * `/docs/sandbox` opened with "a container you start on your own machine,
 * holding a coding agent, the Motir CLI and your checkouts". `tests/copy.test.ts`
 * carries a case named *"never says 'coding agent' — agents do all kinds of
 * work"*, and it passed, because it walks `lib/copy` — the catalogue — and this
 * sentence was typed into `app/[locale]/docs/(guides)/sandbox/SandboxRoute.tsx` as JSX prose.
 *
 * The catalogue was once the only place a rendered string could enter. It is not
 * any more: `lib/docs.ts`'s own carve-out makes the guide pages AUTHORED
 * documentation, so `/docs`, `/docs/cli`, `/docs/mcp`, `/docs/mcp/tools`,
 * `/docs/sandbox`, `/docs/public-address` and the three `/docs/api` pages all
 * render sentences no catalogue holds. A guard scoped to the wrong surface is
 * worse than no guard: it converts an open question into a settled one, and the
 * next person to wonder whether the terminology is enforced finds a passing test
 * with the right name and stops looking.
 *
 * ── Why it is not a second `grep` ───────────────────────────────────────────
 * The offending source line reads
 *
 *     A sandbox is a container you start on your own machine, holding a coding
 *     agent, the Motir CLI and your checkouts — and nothing else.
 *
 * so `grep -rn "coding agent" app/` returns NOTHING on the unfixed tree. JSX
 * wraps the phrase across two lines and joins it back with a single space when
 * it renders. That is the same trap MOTIR-4369 records about an acceptance
 * criterion that greps for a string JSX line-wraps. A source grep cannot be the
 * check, and `sourceGrepMissesIt` below asserts exactly that rather than
 * asserting it in a comment.
 *
 * ── Why it WALKS rather than lists ──────────────────────────────────────────
 * `tests/docs/pageMetadata.test.ts` found its pages instead of naming them for
 * this reason and this file follows it: a page added tomorrow is covered without
 * anybody remembering to add a case. The cost of the other shape is already
 * visible next door — `tests/docs/inlineSpacing.test.tsx` names seven routes and
 * the tree holds nine, so `/docs/mcp/tools` and `/docs/api` have never been
 * checked by it.
 *
 * ── What it does NOT reach, said plainly ────────────────────────────────────
 * It renders the PAGE, not the shell around it. The rail and the site chrome
 * read their strings out of `lib/copy`, which is the surface `tests/copy.test.ts`
 * already sweeps — so the two together cover the page and its frame, and neither
 * is a substitute for the other. This ADDS; it changes nothing in that file.
 */

/** The three predicates `tests/copy.test.ts` runs on the catalogue. */
const BANNED_TERMS: { label: string; pattern: RegExp }[] = [
  // Rendered "tracker" is banned outright; it survives only as a code
  // identifier (`?intent=tracker`, `scaled-tracker`, the Stripe price keys).
  { label: 'tracker', pattern: /\btrackers?\b/gi },
  // The unit of work is a "work item", never an "issue".
  { label: 'issue', pattern: /\bissues?\b/gi },
  // Motir's agents do design, decision, content, test and code work. Calling
  // the third pillar a "coding agent" sells a narrower product than the one
  // being built.
  { label: 'coding agent', pattern: /\bcoding agents?\b/gi },
]

/**
 * Every banned term in `text`, each with enough of its surroundings to find in
 * the source.
 *
 * ⚠️ WHITESPACE IS FLATTENED FIRST, and that is the whole mechanism. The
 * defect this file was written for is a phrase split across two source lines,
 * and `textContent` can carry that break through — so a detector that matched
 * the raw string would reproduce the very failure it exists to catch, one
 * surface further along.
 */
export function bannedTerms(text: string): string[] {
  const flat = text.replace(/\s+/g, ' ')
  return BANNED_TERMS.flatMap(({ label, pattern }) =>
    [...flat.matchAll(pattern)].map((match) => {
      const at = match.index ?? 0
      const from = Math.max(0, at - 60)
      const to = at + match[0].length + 40
      return `${label} — …${flat.slice(from, to).trim()}…`
    }),
  )
}

/** What a source `grep` for the phrase would have found. */
export function sourceGrepMissesIt(source: string): boolean {
  return !/coding agent/i.test(source)
}

/**
 * The same page read a second way, with every ELEMENT boundary spaced out.
 *
 * ⚠️ WHY BOTH READINGS ARE SWEPT. `textContent` concatenates across elements
 * with no separator, so `…a coding agent</strong>1 tool…` flattens to
 * `coding agent1`, where `\bagents?\b` correctly does not match — a violation
 * hidden by the element after it. That is not hypothetical on these pages:
 * words running into the element beside them is the exact defect MOTIR-4429
 * shipped seven of, and `tests/docs/inlineSpacing.test.tsx` exists for it.
 * Reading the markup with tags replaced by a space closes it, and cannot
 * invent a hit — separating text can only ever break a match, never make one.
 */
export { spacedText }

describe('the terminology detector', () => {
  it('FIRES on the sentence that shipped, across the line break JSX wraps it at', () => {
    // Verbatim from `app/[locale]/docs/(guides)/sandbox/SandboxRoute.tsx` at `3ca037b`,
    // including the source indentation that broke the phrase in two.
    const shipped =
      'A sandbox is a container you start on your own machine, holding a coding\n' +
      '        agent, the Motir CLI and your checkouts — and nothing else.'

    const found = bannedTerms(shipped)
    expect(found).toHaveLength(1)
    expect(found[0]).toContain('coding agent')
  })

  it('is the only mechanism that could have — a source grep misses that line', () => {
    // The card's third criterion, asserted rather than asserted-in-prose.
    const shipped =
      'A sandbox is a container you start on your own machine, holding a coding\n' +
      '        agent, the Motir CLI and your checkouts — and nothing else.'
    expect(sourceGrepMissesIt(shipped)).toBe(true)
  })

  it('FIRES on the other two words as well', () => {
    expect(bannedTerms('Motir is not a tracker.')[0]).toContain('tracker')
    expect(bannedTerms('Close the issue when it merges.')[0]).toContain('issue')
    expect(bannedTerms('Two issues and three trackers.')).toHaveLength(2)
  })

  it('permits the words that merely CONTAIN them', () => {
    // `\b` is doing this work; the cases are here so a later widening of the
    // pattern cannot silently start failing ordinary prose.
    expect(
      bannedTerms(
        'The issuer reissues a token; tracking a run; an agent that codes.',
      ),
    ).toEqual([])
  })

  it('SEES a phrase the element after it runs into, once the tags are spaced', () => {
    /*
     * The blind spot `spacedText` closes, measured rather than asserted. On a
     * heading immediately followed by a count, `textContent` yields
     * `coding agent1 tools` — and `\bagents?\b` is right not to match that,
     * which is why the fix is a second READING rather than a looser pattern.
     */
    const html = '<h1>MCP tools for your coding agent</h1><p>1 tools at …</p>'
    const asTextContent = 'MCP tools for your coding agent1 tools at …'

    expect(bannedTerms(asTextContent)).toEqual([])
    expect(bannedTerms(spacedText(html))[0]).toContain('coding agent')
  })
})

/*
 * ── The glossary arm (MOTIR-8051, case 10) ─────────────────────────────────
 * The three English words are swept in every locale, outside `lang="en"`
 * regions and code (a translated page legitimately quotes an English command or
 * a generated description). And each locale's own `messages/glossary/<L>.json`
 * names words that must not stand for a "work item" in that language — *Karte*,
 * *carte*, *カード*, … — which is the same rule in the language's own words.
 *
 * ⚠️ A GLOSSARY WORD CAN HAVE A LEGITIMATE SENSE. "Card" is correct for a
 * PAYMENT card and for a UI PANEL (the glossary's `allowedSenses`), so the word
 * is not banned outright and is not allowed everywhere: an occurrence is
 * permitted only where `fixtures/terminologyAllowlist.json` records it — locale,
 * route, an excerpt of the sentence and the sense — by a person, once. A blanket
 * exemption would be the guard stopped on exactly the word it exists for.
 */

interface Glossary {
  terms: Record<string, { banned?: string[]; allowedSenses?: string }>
}

export interface AllowlistEntry {
  locale: string
  route: string
  excerpt: string
  sense: string
}

/** The senses a banned word may legitimately carry — named by the glossary's own `allowedSenses` prose. */
export const ALLOWED_SENSES = ['payment-card', 'ui-panel'] as const

const CJK =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

/**
 * Every occurrence of a banned word in `text`. A word in a script without
 * spaces is matched as a substring; any other must start a word and may carry a
 * short inflection (at most two letters) (Karte → Karten, carte → cartes) but not continue into a
 * longer word.
 */
export function glossaryHits(
  text: string,
  banned: string[],
): { word: string; at: number; end: number; context: string }[] {
  const flat = text.replace(/\s+/g, ' ')
  return banned.flatMap((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = CJK.test(word)
      ? new RegExp(escaped, 'gu')
      : new RegExp(
          `(?<![\\p{L}\\p{N}])${escaped}\\p{L}{0,2}(?![\\p{L}\\p{N}])`,
          'giu',
        )
    return [...flat.matchAll(pattern)].map((match) => {
      const at = match.index ?? 0
      return {
        word,
        at,
        end: at + match[0].length,
        context: `…${flat.slice(Math.max(0, at - 50), at + match[0].length + 40).trim()}…`,
      }
    })
  })
}

/** The hits no allowlist entry covers (same locale and route, excerpt spanning the hit). */
export function unallowedHits(
  text: string,
  banned: string[],
  locale: string,
  route: string,
  entries: AllowlistEntry[],
): string[] {
  const flat = text.replace(/\s+/g, ' ')
  const spans = entries
    .filter((entry) => entry.locale === locale && entry.route === route)
    .flatMap((entry) => {
      const excerpt = entry.excerpt.replace(/\s+/g, ' ')
      const found: [number, number][] = []
      for (
        let at = flat.indexOf(excerpt);
        at !== -1;
        at = flat.indexOf(excerpt, at + 1)
      )
        found.push([at, at + excerpt.length])
      return found
    })
  return glossaryHits(text, banned)
    .filter(
      (hit) => !spans.some(([from, to]) => hit.at >= from && hit.end <= to),
    )
    .map((hit) => `${hit.word} — ${hit.context}`)
}

function glossaryFor(locale: Locale): Glossary {
  return JSON.parse(
    readFileSync(`messages/glossary/${locale}.json`, 'utf8'),
  ) as Glossary
}

/** A locale's banned words for "work item". */
function bannedFor(locale: Locale): string[] {
  return glossaryFor(locale).terms['work item']?.banned ?? []
}

/**
 * What a reader reads in the page's own language: the container with its
 * English-by-design regions (`lang="en"`), inline code and code blocks taken
 * out. Both readings of `terminology.test.tsx` are produced from the same
 * trimmed tree.
 */
export function proseOnly(container: HTMLElement): {
  text: string
  spaced: string
} {
  const clone = container.cloneNode(true) as HTMLElement
  for (const element of clone.querySelectorAll('[lang="en"], code, pre'))
    element.replaceWith(' ')
  // An island's props are JSON in an attribute (MOTIR-10645), never prose.
  for (const island of clone.querySelectorAll('[data-props]'))
    island.removeAttribute('data-props')
  return {
    text: clone.textContent ?? '',
    spaced: spacedText(clone.innerHTML),
  }
}

describe('the glossary detector', () => {
  it('FIRES on a banned word, with its inflection, and not on a longer word', () => {
    expect(
      glossaryHits('Jede Karte zeigt zwei Karten.', ['Karte']),
    ).toHaveLength(2)
    expect(glossaryHits('Kartenspiel und Kartenhalter', ['Karte'])).toEqual([])
    expect(glossaryHits('各カードを開く', ['カード'])).toHaveLength(1)
  })

  it('permits a hit only where the allowlist records it, for that locale and route', () => {
    const text = 'Bezahlen Sie mit Karte. Die Karte zeigt das Element.'
    const entry: AllowlistEntry = {
      locale: 'de',
      route: '/docs/x',
      excerpt: 'Bezahlen Sie mit Karte.',
      sense: 'payment-card',
    }
    expect(
      unallowedHits(text, ['Karte'], 'de', '/docs/x', [entry]),
    ).toHaveLength(1)
    expect(
      unallowedHits(text, ['Karte'], 'de', '/docs/y', [entry]),
    ).toHaveLength(2)
    expect(
      unallowedHits(text, ['Karte'], 'fr', '/docs/x', [entry]),
    ).toHaveLength(2)
  })

  it('reads a page without its lang="en" regions or its code', () => {
    const container = document.createElement('div')
    container.innerHTML =
      '<p>Eine Karte.</p><div lang="en"><p>An issue.</p></div><code>tracker</code><pre>coding agent</pre>'
    const { text, spaced } = proseOnly(container)
    expect(bannedTerms(text)).toEqual([])
    expect(bannedTerms(spaced)).toEqual([])
    expect(text).toContain('Eine Karte.')
  })
})

describe('the glossary and the allowlist are readable', () => {
  it('every non-English locale names banned words for "work item"', () => {
    for (const locale of LOCALES.filter((l) => l !== 'en')) {
      expect(bannedFor(locale).length, locale).toBeGreaterThan(0)
    }
  })

  it('every allowlist entry names a real locale and route, an excerpt and an allowed sense', () => {
    for (const entry of allowlist as AllowlistEntry[]) {
      expect(LOCALES as readonly string[], JSON.stringify(entry)).toContain(
        entry.locale,
      )
      expect(DOCS_ROUTES, JSON.stringify(entry)).toContain(entry.route)
      expect(entry.excerpt.trim(), JSON.stringify(entry)).not.toBe('')
      expect(
        ALLOWED_SENSES as readonly string[],
        JSON.stringify(entry),
      ).toContain(entry.sense)
    }
  })
})

const PAGES = docsPages()

describe('every /docs page is found, not named', () => {
  it('the walk finds them — a walk that returns nothing passes vacuously', () => {
    /*
     * The same floor `tests/docs/pageMetadata.test.ts` puts under its own walk,
     * and it is the reason this file can be trusted to have checked anything: a
     * `readdirSync` that quietly returned an empty list would make every case
     * below disappear rather than fail.
     *
     * ⚠️ IT IS A FLOOR AND NOT THE ROUTE LIST, deliberately. Pinning the nine
     * routes here would read as a stronger check and would defeat the point —
     * adding a page would turn this red and the covered set would go back to
     * being a list somebody maintains. The readable inventory is the run output
     * itself: each route below is its own named case.
     */
    expect(PAGES.length).toBeGreaterThanOrEqual(9)
    expect(PAGES.map(routeOf)).toContain('/docs/sandbox')
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/*
 * ── A FINDING THE GATE MADE, left red-and-skipped rather than loosened ──────
 * Each entry is a shipped translation the glossary arm rejects, with the
 * evidence. The case is `it.skip` so the run names it; fix the translation and
 * delete the entry. (No Motir bug can be filed from the run that found it, so
 * the reason stands in for the bug key until one is.)
 */
const KNOWN_DEFECTS: { locale: Locale; route: string; reason: string }[] = [
  {
    locale: 'zh',
    route: '/docs/sentry',
    reason:
      'content/docs/sentry/zh.md line 35 renders English "error" as 问题 ("在 Sentry 中将问题标记为已解决"), the glossary\'s banned word for "work item"; the same document renders "error" as 错误 everywhere else',
  },
]

describe('no /docs page RENDERS a banned term, in any language', () => {
  for (const locale of LOCALES) {
    for (const file of PAGES) {
      const route = routeOf(file)
      const known = KNOWN_DEFECTS.find(
        (defect) => defect.locale === locale && defect.route === route,
      )
      const run = known ? it.skip : it

      run(
        `${route} [${locale}]${known ? ` — ${known.reason}` : ''}`,
        async () => {
          const ledger = stubDocsFetch()
          const page = await renderDocsRoute(file, locale)
          const { text, spaced } =
            locale === 'en'
              ? { text: page.text, spaced: page.spaced }
              : proseOnly(page.container)

          // Prove the page got its data BEFORE reading its text — see the two
          // ledgers above. Without it the page is not built at all (MOTIR-10645),
          // so a page that read an artifact must refuse to render without one.
          expect(ledger.unserved).toEqual([])
          if (ledger.served.length > 0) {
            forgetDocsArtifactReads()
            stubDocsUnreachable()
            await expect(renderDocsRoute(file, locale)).rejects.toThrow(
              DocsArtifactUnavailableError,
            )
          }
          page.unmount()

          // The criterion's reading, and then the same page with its element
          // boundaries spaced out — see `spacedText`.
          expect(bannedTerms(text)).toEqual([])
          expect(bannedTerms(spaced)).toEqual([])

          if (locale !== 'en') {
            const banned = bannedFor(locale)
            const entries = allowlist as AllowlistEntry[]
            expect(unallowedHits(text, banned, locale, route, entries)).toEqual(
              [],
            )
            expect(
              unallowedHits(spaced, banned, locale, route, entries),
            ).toEqual([])
          }
        },
      )
    }
  }
})
