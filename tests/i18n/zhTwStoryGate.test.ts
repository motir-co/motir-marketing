import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse as parseFont } from 'opentype.js'
import {
  FONT_SET_REGISTRY,
  LOCALE_FONT_SET,
  resolveFontSet,
} from '@motir/design-system'
import { describe, expect, it, vi } from 'vitest'
import { loadOgFonts, type OgFont } from '@/app/_brand/ogFonts'
import {
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  LOCALE_ENDONYMS,
  LOCALES,
  OG_LOCALE,
} from '@/i18n/routing'
import {
  documentInvariants,
  listSlugs,
  parseDocumentFile,
  readLedger,
  resolveDocsDocument,
} from '@/lib/docsDocuments'
import { matchAcceptLanguage } from '@/lib/localeDetection'
import { languageAlternates } from '@/lib/localeMetadata'
import { drawnStrings } from '@/scripts/brand/subset-og-fonts'
import type { Env } from '@/worker/env'
import { route } from '@/worker/router'

/*
 * THE zh-tw STORY'S SEAMS IN motir.co (MOTIR-8937 · MOTIR-9252).
 *
 * Each card of the story proved its own piece of the twelfth locale. This
 * file proves the JOINS: that a locale in `LOCALES` owns every asset a locale
 * owes, that the URL code `zh-tw` and the tag `zh-TW` agree across the tables
 * that carry them, that the matcher can only answer with a registered locale,
 * and that the glossary holds over what was translated. The locale and slug
 * sets are read from the code; the one literal count is the case that pins
 * the list itself.
 */

const root = process.cwd()
const messages = join(root, 'messages')
const readJson = (path: string) =>
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
const translated = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE)

/** Every leaf path, an array's length recorded as a path of its own. */
function shape(node: unknown, prefix = '', out: string[] = []): string[] {
  if (Array.isArray(node)) {
    out.push(`${prefix}[length=${node.length}]`)
    node.forEach((v, i) => shape(v, `${prefix}.${i}`, out))
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node))
      shape(v, prefix ? `${prefix}.${k}` : k, out)
  } else out.push(prefix)
  return out
}

/** Every string leaf, with its dotted key. */
function leaves(node: unknown, prefix = ''): [string, string][] {
  if (typeof node === 'string') return [[prefix, node]]
  if (Array.isArray(node))
    return node.flatMap((v, i) => leaves(v, `${prefix}.${i}`))
  if (node && typeof node === 'object')
    return Object.entries(node).flatMap(([k, v]) =>
      leaves(v, prefix ? `${prefix}.${k}` : k),
    )
  return []
}

describe('the locale list', () => {
  it('is twelve, English first, zh-tw directly after zh', () => {
    expect(LOCALES).toHaveLength(12)
    expect(LOCALES[0]).toBe(DEFAULT_LOCALE)
    expect(LOCALES.indexOf('zh-tw')).toBe(LOCALES.indexOf('zh') + 1)
  })
})

describe('a registered locale owns every asset a locale owes', () => {
  const en = readJson(join(messages, 'en.json'))

  it('a catalogue per locale and no other, each with en.json’s shape', () => {
    const files = readdirSync(messages)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort()
    expect(files).toEqual([...LOCALES].sort())
    for (const locale of translated)
      expect(shape(readJson(join(messages, `${locale}.json`))), locale).toEqual(
        shape(en),
      )
  })

  it('a source record per translation', () => {
    expect(readdirSync(join(messages, 'sources')).sort()).toEqual(
      translated.map((l) => `${l}.json`).sort(),
    )
  })

  it('a glossary per translation, each naming its own locale', () => {
    for (const locale of translated) {
      const file = join(messages, 'glossary', `${locale}.json`)
      expect(existsSync(file), locale).toBe(true)
      expect(readJson(file).locale, locale).toBe(locale)
    }
  })

  const slugs = listSlugs()

  it.each(LOCALES)('%s has a current document for every slug', (locale) => {
    expect(slugs.length).toBeGreaterThan(0)
    for (const slug of slugs) {
      const resolved = resolveDocsDocument(slug, locale)
      expect(resolved.fallback, `${locale}/${slug}`).toBeNull()
      expect(resolved.shownLocale, `${locale}/${slug}`).toBe(locale)
    }
  })

  it('every zh-tw document cites a ledgered revision and keeps the English invariants', () => {
    for (const slug of slugs) {
      const dir = join(root, 'content', 'docs', slug)
      const english = parseDocumentFile(
        readFileSync(join(dir, 'en.md'), 'utf8'),
        join(dir, 'en.md'),
      )
      const tw = parseDocumentFile(
        readFileSync(join(dir, 'zh-tw.md'), 'utf8'),
        join(dir, 'zh-tw.md'),
      )
      expect(
        readLedger(slug).map((entry) => entry.revision),
        slug,
      ).toContain(tw.source)
      expect(documentInvariants(tw.body), slug).toEqual(
        documentInvariants(english.body),
      )
    }
  })

  it('a font set for every locale in the installed design system', () => {
    for (const locale of LOCALES)
      expect(Object.keys(LOCALE_FONT_SET), locale).toContain(locale)
  })
})

/** Characters of `strings` that none of `fonts` draws. */
function uncovered(strings: readonly string[], fonts: OgFont[]): string[] {
  const faces = fonts.map((font) =>
    parseFont(
      font.data.buffer.slice(
        font.data.byteOffset,
        font.data.byteOffset + font.data.byteLength,
      ) as ArrayBuffer,
    ),
  )
  const missing = new Set<string>()
  for (const text of strings)
    for (const ch of text)
      if (
        !/\s/u.test(ch) &&
        !faces.some((face) => face.charToGlyphIndex(ch) > 0)
      )
        missing.add(ch)
  return [...missing]
}

describe('the zh-tw share card', () => {
  it('loads Inter and Noto Sans TC, cut for every character it draws', async () => {
    const fonts = await loadOgFonts('zh-tw')
    expect(fonts).toHaveLength(6)
    const cjk = fonts.filter((font) => font.name !== fonts[0]!.name)
    expect(new Set(cjk.map((font) => font.name))).toEqual(
      new Set(['Noto Sans TC']),
    )
    for (const weight of [400, 700, 800])
      expect(
        existsSync(
          join(root, 'app', '_brand', 'og-fonts', `zh-tw-${weight}.ttf`),
        ),
      ).toBe(true)
    const manifest = readJson(
      join(root, 'app', '_brand', 'og-fonts', 'manifest.json'),
    ) as { files: { locale: string; family: string }[] }
    const rows = manifest.files.filter((row) => row.locale === 'zh-tw')
    expect(rows.map((row) => row.family)).toEqual([
      'Noto Sans TC',
      'Noto Sans TC',
      'Noto Sans TC',
    ])
    const catalogue = readJson(join(messages, 'zh-tw.json'))
    expect(uncovered([...drawnStrings(catalogue), 'Motir'], fonts)).toEqual([])
  })
})

describe('the URL code and the language tag agree', () => {
  it('every table is total over the locales', () => {
    for (const table of [OG_LOCALE, LOCALE_BCP47, LOCALE_ENDONYMS])
      expect(Object.keys(table).sort()).toEqual([...LOCALES].sort())
  })

  it('zh-tw is zh_TW, zh-TW and 繁體中文; zh is zh_CN, zh and 简体中文', () => {
    expect([
      OG_LOCALE['zh-tw'],
      LOCALE_BCP47['zh-tw'],
      LOCALE_ENDONYMS['zh-tw'],
    ]).toEqual(['zh_TW', 'zh-TW', '繁體中文'])
    expect([OG_LOCALE.zh, LOCALE_BCP47.zh, LOCALE_ENDONYMS.zh]).toEqual([
      'zh_CN',
      'zh',
      '简体中文',
    ])
  })

  it('the hreflang keys are the tags plus x-default', () => {
    expect(Object.keys(languageAlternates('/')).sort()).toEqual(
      [...LOCALES.map((l) => LOCALE_BCP47[l]), 'x-default'].sort(),
    )
  })

  it('the tag the page renders resolves to the same font set the locale maps to', () => {
    for (const locale of LOCALES)
      expect(resolveFontSet(LOCALE_BCP47[locale]).id, locale).toBe(
        LOCALE_FONT_SET[locale],
      )
    expect(LOCALE_FONT_SET['zh-tw']).toBe('zh-Hant')
    expect(FONT_SET_REGISTRY['zh-Hant'].lang).toBe(LOCALE_BCP47['zh-tw'])
    expect(resolveFontSet(LOCALE_BCP47.zh).id).toBe('zh-Hans')
  })
})

describe('the browser-language matcher', () => {
  it.each(['zh-TW', 'zh-Hant', 'zh-HK', 'zh-MO', 'zh-Hant-TW', 'zh-Hant-HK'])(
    'sends the Traditional range %s to the registered zh-tw',
    (range) => {
      expect(matchAcceptLanguage(range)).toBe('zh-tw')
    },
  )

  it.each(['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-CN'])(
    'sends the Simplified range %s to zh',
    (range) => {
      expect(matchAcceptLanguage(range)).toBe('zh')
    },
  )

  it('answers only with a registered locale', () => {
    const headers = LOCALES.flatMap((locale) =>
      locale.includes('-') ? [locale] : [locale, `${locale}-XX`],
    )
    for (const header of headers) {
      const answer = matchAcceptLanguage(header)
      if (answer !== null) expect(LOCALES, header).toContain(answer)
    }
  })
})

describe('the /zh-TW spelling, on the Worker (MOTIR-10758)', () => {
  const env: Env = {
    ASSETS: {
      fetch: async () => new Response('page', { status: 200 }),
    },
    MOTIR_APP_ORIGIN: 'https://app.test.motir.co',
    MOTIR_SITE_ORIGIN: 'https://motir.co',
  }
  const ask = (path: string) =>
    route(new Request(`https://motir.co${path}`), env)

  it('is moved to the URL code with a 308; the URL code is served as it is', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const moved = await ask('/zh-TW/docs/mcp?x=1')
    expect(moved.status).toBe(308)
    const location = new URL(moved.headers.get('location')!)
    expect(`${location.pathname}${location.search}`).toBe('/zh-tw/docs/mcp?x=1')
    const served = await ask('/zh-tw/docs/mcp?x=1')
    expect(served.status).toBe(200)
    expect(served.headers.get('location')).toBeNull()
    log.mockRestore()
  })
})

describe('the glossary holds over the zh-tw catalogue', () => {
  const catalogue = readJson(join(messages, 'zh-tw.json'))
  const en = Object.fromEntries(leaves(readJson(join(messages, 'en.json'))))
  const glossary = readJson(join(messages, 'glossary', 'zh-tw.json')) as {
    terms: Record<string, { translation: string; banned?: string[] }>
  }

  it('names every product as the glossary translates it', () => {
    for (const [key, text] of leaves(catalogue).filter(([key]) =>
      /^nav\.productItems\.[^.]+\.name$/.test(key),
    ))
      expect(text, key).toBe(glossary.terms[en[key]!]?.translation)
  })

  it('uses no banned word for a work item', () => {
    const banned = glossary.terms['work item']?.banned ?? []
    expect(banned.length).toBeGreaterThan(0)
    const hits = leaves(catalogue).filter(([, text]) =>
      banned.some((word) => text.includes(word)),
    )
    expect(hits).toEqual([])
  })

  it('keeps vibe coding and Vibe the project verbatim wherever en.json has them', () => {
    for (const [key, text] of leaves(catalogue))
      for (const term of ['vibe coding', 'Vibe the project'])
        if (en[key]?.includes(term)) expect(text, key).toContain(term)
  })
})
