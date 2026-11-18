import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { englishCopy as copy, format, formatRich } from '@/lib/copy'

/*
 * ⚠️ THE TERMINOLOGY CHECK, MECHANISED. Yue's 2026-08-28 note on MOTIR-1152
 * gives it as a command to run rather than a habit to keep:
 *
 *     grep -niE 'tracker|\bissues?\b' <your changed files>
 *
 * A habit is exactly what fails on the seventh copy edit six months from now,
 * and the words are BANNED rather than discouraged: the two customer-facing
 * product names are "Motir" and "Motir AI", and the unit of work is a "work
 * item". "tracker" survives ONLY as a code identifier — the `?intent=tracker`
 * query value, `scaled-tracker`, the Stripe price keys — and is never
 * rendered. The catalogue is the one file where a rendered violation can
 * enter, so the check lives on the catalogue rather than on a diff.
 */
const BANNED = /\btrackers?\b|\bissues?\b/i

function leafStrings(value: unknown, path: string[] = []): [string, string][] {
  if (typeof value === 'string') return [[path.join('.'), value]]
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => leafStrings(item, [...path, String(i)]))
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      leafStrings(child, [...path, key]),
    )
  }
  return []
}

/*
 * ⚠️ THE TESTS IN THIS BLOCK READ ENGLISH ONLY, ON PURPOSE (MOTIR-7949). The
 * jargon-on-the-idea-path regex, the "agent applies your design" claim and the
 * whole-tagline check are predicates over English words, and the key-shape
 * asserts are about what the landing renders. In another language the same
 * rules are part of each catalogue card's glossary review; the rules that CAN
 * be checked mechanically in every language are the sweeps in
 * `describe('every catalogue')` at the end of this file.
 */
describe('the copy catalogue', () => {
  it('renders neither "tracker" nor "issue" anywhere', () => {
    const offenders = leafStrings(copy)
      .filter(([, text]) => BANNED.test(text))
      .map(([key, text]) => `${key}: ${text}`)
    expect(offenders).toEqual([])
  })

  it('keeps the tagline whole — all THREE pillars', () => {
    // Dropping agent orchestration describes a different, smaller product.
    const whole = 'AI planning, project-management and agent orchestration'
    expect(copy.footer.tagline).toContain(whole)
    expect(copy.meta.description).toContain(whole)
  })

  it('names every product exactly, in menu order', () => {
    expect(
      Object.values(copy.nav.productItems).map((item) => item.name),
    ).toEqual([
      'Motir AI Planner',
      'Motir Project Management',
      'Motir Project Manager',
      'Motir AI Debugging',
      'Motir MCP',
      'Motir CLI',
      'Motir Claude Code connector',
      'Motir Claude Code plugin',
      'Motir Agent Fleet',
      'Motir Agent Hosting',
      'Motir Sandbox',
    ])
  })

  it('never says "coding agent" — agents do all kinds of work', () => {
    const offenders = leafStrings(copy).filter(([, text]) =>
      /coding agents?/i.test(text),
    )
    expect(offenders).toEqual([])
  })

  it('keeps developer jargon OUT of the idea path and door 3', () => {
    // The import door's audience self-selects as having a codebase; a
    // non-technical founder must not meet "repository" on the way in.
    const jargon = /\brepo(sitory|s)?\b|\bgit\b|\bcodebase\b|\bAPI\b/i
    const ideaPath = [
      ...leafStrings(copy.landing.hero),
      ...leafStrings(copy.landing.close.free),
      ...leafStrings(copy.landing.moreThanCode),
      ...leafStrings(copy.landing.calls),
      ...leafStrings(copy.landing.resume),
    ]
    expect(
      ideaPath.filter(([, text]) => jargon.test(text)).map(([key]) => key),
    ).toEqual([])
  })

  it('stays in key SHAPE with what the landing renders', () => {
    expect(Object.keys(copy.landing).sort()).toEqual([
      'art',
      'builtByMotir',
      'calls',
      'close',
      'hero',
      'moreThanCode',
      'projectManager',
      'resume',
    ])
    expect(Object.keys(copy.landing.close.free).sort()).toEqual([
      'cta',
      'lead',
      'tail',
    ])
  })

  it('never names a third-party agent product in the landing copy', () => {
    const named = /claude|cursor|codex|copilot|devin|opencode/i
    expect(
      leafStrings(copy.landing)
        .filter(([, text]) => named.test(text))
        .map(([key]) => key),
    ).toEqual([])
  })

  it('carries the /design showcase, in the shape the pickers read', () => {
    // MOTIR-3862. The axis keys are `name` + `help` because that is what
    // `AxisField` takes. A rename is a code change in MOTIR-1043, so it
    // surfaces here first.
    expect(Object.keys(copy.designShowcase).sort()).toEqual([
      // MOTIR-11610 — the Background axis and each background's name and
      // tagline; their English is the background registry's.
      'background',
      'backgrounds',
      'closing',
      'heading',
      'palette',
      // Each style, palette and pairing's name and tagline, which the chips and
      // `AxisNote` read so the rail translates (Yue, 2026-10-09). Their English
      // is the registries', held there by `tests/cjkFaces.test.ts`.
      'palettes',
      'reset',
      // MOTIR-7970 — the composed specimen's labels, moved out of the JSX so
      // they translate with the page.
      'specimen',
      'style',
      'styles',
      'subline',
      'theme',
      'type',
      'types',
    ])
    for (const axis of ['style', 'palette', 'type'] as const) {
      expect(Object.keys(copy.designShowcase[axis]).sort()).toEqual([
        'help',
        'name',
      ])
    }
    expect(Object.keys(copy.designShowcase.background).sort()).toEqual([
      'fixedNote',
      'followsNote',
      'help',
      'name',
      'none',
      'noneNote',
    ])
    expect(Object.keys(copy.designShowcase.theme).sort()).toEqual([
      'dark',
      'help',
      'light',
      'name',
      'system',
    ])
    // The nav entry the showcase adds, beside Explore and Docs.
    expect(copy.nav.design).toBe('Design')
  })

  it('never claims an agent applies your design choice to what it builds', () => {
    /*
     * ⚠️ NOT a style rule — a factual one, and it is asserted because it is the
     * kind of sentence a later editor restores in good faith.
     *
     * MOTIR-3862 asked the closing line to say "the agent applies the choice to
     * what it builds". It does not ship. The onboarding design step persists the
     * three axes onto the pre-plan baseline (`PreplanSession.designChoice`) and
     * the generation handoff summarises them, but the value is rendered into NO
     * planner prompt and no dispatch prompt — verified on `origin/main` in both
     * motir-core and motir-ai. Restoring the claim puts a false statement on a
     * public page. Delete this test when a prompt reads the value, not before.
     */
    const builds =
      /\bagents?\b[^.]*\b(build|builds|building|apply|applies)\b|\b(applied|applies)\b[^.]*\bwhat (it|they) builds?\b/i
    const offenders = leafStrings(copy.designShowcase)
      .filter(([, text]) => builds.test(text))
      .map(([key, text]) => `${key}: ${text}`)
    expect(offenders).toEqual([])
  })

  it('is the file on disk, not a stale build artifact', () => {
    const onDisk = JSON.parse(readFileSync('messages/en.json', 'utf8'))
    expect(onDisk).toEqual(copy)
  })
})

describe('format', () => {
  it('fills every named placeholder', () => {
    expect(format('{count} / {max}', { count: 12, max: 2000 })).toBe(
      '12 / 2000',
    )
    expect(format(copy.footer.copyright, { year: 2026 })).toBe(
      '© 2026 moooon B.V.',
    )
  })

  it('leaves an unknown placeholder alone rather than printing "undefined"', () => {
    expect(format('a {b} c', {})).toBe('a {b} c')
  })
})

describe('formatRich', () => {
  it('puts each element where its placeholder sits, keeping the words around it', () => {
    const parts = formatRich(copy.publicProject.request.openedBy, {
      author: createElement('strong', null, 'Dana Okoye'),
      date: createElement('time', null, '14 Aug 2026'),
    })
    expect(renderToStaticMarkup(createElement('p', null, parts))).toBe(
      '<p>Opened by <strong>Dana Okoye</strong> · <time>14 Aug 2026</time></p>',
    )
  })

  it('lets a translation move the element — the sentence stays one key', () => {
    const parts = formatRich('{date} geöffnet von {author}', {
      author: 'Dana',
      date: createElement('time', null, '14. Aug. 2026'),
    })
    expect(renderToStaticMarkup(createElement('p', null, parts))).toBe(
      '<p><time>14. Aug. 2026</time> geöffnet von Dana</p>',
    )
  })

  it('leaves an unknown placeholder as written, as `format` does', () => {
    expect(formatRich('a {b} c', {})).toEqual(['a ', '{b}', ' c'])
  })
})

/*
 * ⚠️ EVERY CATALOGUE, NOT JUST ENGLISH (MOTIR-7949). The checks above read
 * `englishCopy`, a typed import of en.json — so a translated catalogue would
 * reach the page without meeting any of them. These five sweeps read
 * `messages/*.json` by LISTING the directory, never by naming a locale, so a
 * catalogue is checked the moment it lands. Each sweep is a function of a
 * directory and is run once against a temp tree it must fail, so a sweep that
 * silently matches nothing cannot pass.
 */
type Catalogue = Record<string, unknown>

function catalogues(dir: string): [string, Catalogue][] {
  return readdirSync(dir)
    .filter((f) => /^[a-z]{2,3}(-[A-Za-z0-9]+)?\.json$/.test(f))
    .sort()
    .map((f) => [
      f.replace(/\.json$/, ''),
      JSON.parse(readFileSync(join(dir, f), 'utf8')) as Catalogue,
    ])
}

/** `<locale>:<key>` for every leaf whose text matches. */
function hits(
  entries: [string, Catalogue][],
  test: (text: string, key: string, locale: string) => boolean,
): string[] {
  return entries.flatMap(([locale, catalogue]) =>
    leafStrings(catalogue)
      .filter(([key, text]) => test(text, key, locale))
      .map(([key]) => `${locale}:${key}`),
  )
}

/*
 * Keys whose English says "card" in a sense OTHER than the work item — the
 * glossary's `allowedSenses`: a payment card or a UI panel. A translation of
 * one of these may use the language's word for a card. Seeded from
 * `grep -E '\bcards?\b'` over en.json. `products.aiDebugging.*`'s four hits
 * ("checks for a card that covers it") are the WORK ITEM, so they are not
 * listed: their translations say the glossary's word for a work item. Asserted
 * tight against en.json below.
 */
const CARD_SENSE_ALLOWLIST: Record<string, string> = {
  'designShowcase.specimen.notesValue':
    'UI panel — the specimen card on /design',
}

const UNSPACED_SCRIPTS = ['zh', 'ja', 'ko']

function containsWord(locale: string, text: string, word: string): boolean {
  if (UNSPACED_SCRIPTS.includes(locale.split('-')[0]!))
    return text.toLowerCase().includes(word.toLowerCase())
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
    'iu',
  ).test(text)
}

function workItemBans(glossaryDir: string, locale: string): string[] {
  try {
    const glossary = JSON.parse(
      readFileSync(join(glossaryDir, `${locale}.json`), 'utf8'),
    ) as { terms: Record<string, { banned?: string[] }> }
    return glossary.terms['work item']?.banned ?? []
  } catch {
    return []
  }
}

/*
 * A product's name in a locale is the one its glossary records (Yue,
 * 2026-10-09: the product names are translated, but "Claude Code, CLI, MCP
 * don't need translations"), and en.json's where the glossary records none.
 */
function productNameIn(
  glossaryDir: string,
  locale: string,
  english: string,
): string {
  try {
    const glossary = JSON.parse(
      readFileSync(join(glossaryDir, `${locale}.json`), 'utf8'),
    ) as { terms: Record<string, { translation?: string }> }
    return glossary.terms[english]?.translation ?? english
  } catch {
    return english
  }
}

function leafOf(catalogue: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      catalogue,
    )
}

const sweeps = {
  banned: (dir: string) =>
    hits(
      catalogues(dir),
      (text) => BANNED.test(text) || /coding agents?/i.test(text),
    ),
  workItemWords: (dir: string) =>
    catalogues(dir).flatMap(([locale, catalogue]) => {
      const bans = workItemBans(join(dir, 'glossary'), locale)
      return hits([[locale, catalogue]], (text, key) =>
        key in CARD_SENSE_ALLOWLIST
          ? false
          : bans.some((word) => containsWord(locale, text, word)),
      )
    }),
  productNames: (dir: string) => {
    const all = catalogues(dir)
    const en = Object.fromEntries(
      leafStrings(all.find(([l]) => l === 'en')![1]),
    )
    return hits(all, (text, key) =>
      ['Motir AI', 'Motir'].some(
        (name) => en[key]?.includes(name) && !text.includes(name),
      ),
    )
  },
  productItemNames: (dir: string) => {
    const all = catalogues(dir)
    const en = all.find(([l]) => l === 'en')![1]
    return all.flatMap(([locale, catalogue]) =>
      hits(
        [[locale, catalogue]],
        (text, key) =>
          /^nav\.productItems\.[^.]+\.name$/.test(key) &&
          text !==
            productNameIn(
              join(dir, 'glossary'),
              locale,
              leafOf(en, key) as string,
            ),
      ),
    )
  },
  thirdPartyInLanding: (dir: string) =>
    hits(
      catalogues(dir),
      (text, key) =>
        key.startsWith('landing.') &&
        /claude|cursor|codex|copilot|devin|opencode/i.test(text),
    ),
}

describe('every catalogue', () => {
  const MESSAGES = join(process.cwd(), 'messages')

  it.each(Object.keys(sweeps) as (keyof typeof sweeps)[])(
    '%s: no catalogue in messages/ trips it',
    (sweep) => {
      expect(sweeps[sweep](MESSAGES)).toEqual([])
    },
  )

  it('CARD_SENSE_ALLOWLIST names only keys whose English says "card"', () => {
    const en = Object.fromEntries(leafStrings(copy))
    expect(
      Object.keys(CARD_SENSE_ALLOWLIST).filter(
        (key) => !/\bcards?\b/i.test(en[key] ?? ''),
      ),
    ).toEqual([])
  })

  describe('each sweep fails a temp tree that breaks it', () => {
    const EN = {
      nav: { productItems: { planner: { name: 'Motir AI Planner' } } },
      landing: { line: 'Plan with Motir AI' },
      designShowcase: { specimen: { notesValue: 'A card' } },
      other: { line: 'Your work item' },
    }
    const GOOD = {
      nav: {
        productItems: { planner: { name: 'Planificateur Motir AI' } },
      },
      landing: { line: 'Planifiez avec Motir AI' },
      designShowcase: { specimen: { notesValue: 'Une carte' } },
      other: { line: 'Votre élément de travail' },
    }
    function run(sweep: keyof typeof sweeps, xx: unknown): string[] {
      const dir = mkdtempSync(join(tmpdir(), 'copy-sweep-'))
      mkdirSync(join(dir, 'glossary'))
      writeFileSync(join(dir, 'en.json'), JSON.stringify(EN))
      writeFileSync(join(dir, 'xx.json'), JSON.stringify(xx))
      writeFileSync(
        join(dir, 'glossary', 'xx.json'),
        JSON.stringify({
          terms: {
            'work item': { banned: ['carte', 'ticket'] },
            'Motir AI Planner': { translation: 'Planificateur Motir AI' },
          },
        }),
      )
      try {
        return sweeps[sweep](dir)
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    }
    const withLine = (line: string, at: 'landing' | 'other' = 'other') => ({
      ...GOOD,
      [at]: { line },
    })

    it('passes a translation that breaks nothing', () => {
      for (const sweep of Object.keys(sweeps) as (keyof typeof sweeps)[])
        expect(run(sweep, GOOD)).toEqual([])
    })

    it('banned: "issue", "tracker" and "coding agent", in any catalogue', () => {
      expect(run('banned', withLine('Ouvrir une issue'))).toEqual([
        'xx:other.line',
      ])
      expect(run('banned', withLine('Un coding agent'))).toEqual([
        'xx:other.line',
      ])
    })

    it("workItemWords: the glossary's banned word, outside an allowlisted sense", () => {
      expect(run('workItemWords', withLine('Votre carte'))).toEqual([
        'xx:other.line',
      ])
      // As a word: `cartes` is not `carte`, but a capitalised `Carte` is.
      expect(run('workItemWords', withLine('Cartes'))).toEqual([])
      expect(run('workItemWords', withLine('Carte'))).toEqual(['xx:other.line'])
    })

    it('productNames: Motir and Motir AI stay verbatim', () => {
      expect(
        run('productNames', withLine('Planifiez avec Motir IA', 'landing')),
      ).toEqual(['xx:landing.line'])
    })

    it("productItemNames: a product's name is its glossary's", () => {
      expect(
        run('productItemNames', {
          ...GOOD,
          nav: { productItems: { planner: { name: 'Motir AI Planner' } } },
        }),
      ).toEqual(['xx:nav.productItems.planner.name'])
    })

    it('thirdPartyInLanding: no agent product named in landing', () => {
      expect(
        run('thirdPartyInLanding', withLine('Motir AI avec Claude', 'landing')),
      ).toEqual(['xx:landing.line'])
    })
  })
})

describe('the slogan', () => {
  // Yue, 2026-10-09: "Vibe the project" is kept in English, the way "vibe
  // coding" is, wherever the English says it. The glossaries mark it
  // doNotTranslate so `i18n:merge` refuses a translation; this holds the
  // catalogues as they stand.
  it.each(['Vibe the project', 'vibe the project', 'Vibe a project'])(
    'every catalogue keeps "%s" wherever the English has it',
    (slogan) => {
      const dir = join(process.cwd(), 'messages')
      const english = leafStrings(copy).filter(([, text]) =>
        text.includes(slogan),
      )
      expect(english.length).toBeGreaterThan(0)
      const translated = catalogues(dir).filter(([locale]) => locale !== 'en')
      const lost = translated.flatMap(([locale, catalogue]) =>
        english
          .filter(([key]) => {
            const value = leafOf(catalogue, key)
            return typeof value === 'string' && !value.includes(slogan)
          })
          .map(([key]) => `${locale}:${key}`),
      )
      expect(lost).toEqual([])
    },
  )
})
