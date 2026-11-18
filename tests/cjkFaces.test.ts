// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BACKGROUND_IDS,
  BACKGROUND_REGISTRY,
  PALETTE_IDS,
  PALETTE_REGISTRY,
  STYLE_IDS,
  STYLE_REGISTRY,
  TYPE_IDS,
  TYPE_REGISTRY,
} from '@motir/design-system'
import {
  CJK_FACE_LABEL_CLASS,
  CJK_LANGS,
  cjkAttribute,
  cjkFaceLabelClass,
  cjkFaces,
  cjkLangOf,
  defaultCjkFace,
  type CjkLang,
} from '@/lib/cjkFaces'
import en from '@/messages/en.json'

/*
 * The `/design` rail in the reader's language (Yue, 2026-10-09): a zh, ja or
 * ko page picks its own fonts by name, and every chip row reads from the
 * catalogue. This holds the CSS to the face list, the face list to the
 * installed registry, and the English catalogue to the package's registries.
 */

/** The `:lang()` argument each CJK language's blocks are written with. */
const LANG_TAG: Record<CjkLang, string> = {
  zh: 'zh',
  'zh-tw': 'zh-TW',
  ja: 'ja',
  ko: 'ko',
}

const GLOBALS = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')

describe('a CJK page offers its own fonts', () => {
  it('lists the three faces each set ships, sans first, by their own names', () => {
    expect(cjkFaces('zh').map((f) => f.family)).toEqual([
      'Noto Sans SC',
      'Noto Serif SC',
      'LXGW WenKai TC',
    ])
    expect(cjkFaces('zh-tw').map((f) => f.family)).toEqual([
      'Noto Sans TC',
      'Noto Serif TC',
      'LXGW WenKai TC',
    ])
    expect(cjkFaces('ja').map((f) => f.family)).toEqual([
      'Noto Sans JP',
      'M PLUS Rounded 1c',
      'Noto Serif JP',
    ])
    expect(cjkFaces('ko').map((f) => f.family)).toEqual([
      'Noto Sans KR',
      'Nanum Gothic',
      'Noto Serif KR',
    ])
  })

  it('draws Chinese in LXGW WenKai by default, Japanese and Korean in Noto Sans', () => {
    expect(defaultCjkFace('zh')).toBe('lxgw-wenkai-tc')
    expect(defaultCjkFace('zh-tw')).toBe('lxgw-wenkai-tc')
    expect(defaultCjkFace('ja')).toBe('noto-sans-jp')
    expect(defaultCjkFace('ko')).toBe('noto-sans-kr')
  })

  it('only zh, zh-tw, ja and ko pages get the row', () => {
    expect(cjkLangOf('zh')).toBe('zh')
    expect(cjkLangOf('zh-tw')).toBe('zh-tw')
    expect(cjkLangOf('zh-TW')).toBe('zh-tw')
    expect(cjkLangOf('ja')).toBe('ja')
    expect(cjkLangOf('ko')).toBe('ko')
    for (const latin of ['en', 'fr', 'de', 'pl']) {
      expect(cjkLangOf(latin)).toBeNull()
    }
  })

  it('draws each chip label in its face, through a class Tailwind can find', () => {
    const faces = CJK_LANGS.flatMap((lang) =>
      cjkFaces(lang).map((face) => ({ lang, face })),
    )
    expect(Object.keys(CJK_FACE_LABEL_CLASS).sort()).toEqual(
      faces.map(({ lang, face }) => `${lang}/${face.id}`).sort(),
    )
    expect(faces).toHaveLength(12)
    for (const { lang, face } of faces) {
      expect(cjkFaceLabelClass(lang, face.id)).toBe(
        `font-(family-name:${face.variable})`,
      )
    }
  })

  it('keeps the two Chinese sets’ LXGW WenKai TC apart (MOTIR-9248)', () => {
    expect(cjkFaceLabelClass('zh', 'lxgw-wenkai-tc')).toBe(
      'font-(family-name:--font-set-zh-Hans-serif-lxgw-wenkai-tc)',
    )
    expect(cjkFaceLabelClass('zh-tw', 'lxgw-wenkai-tc')).toBe(
      'font-(family-name:--font-set-zh-Hant-serif-lxgw-wenkai-tc)',
    )
  })

  it('globals.css draws every pick, headings and body alike, and the site default when none', () => {
    for (const lang of CJK_LANGS) {
      for (const face of cjkFaces(lang)) {
        const generic = face.role === 'serif' ? 'serif' : 'sans-serif'
        const selector = `[lang][${cjkAttribute(lang)}='${face.id}']:lang(${LANG_TAG[lang]})`
        const at = GLOBALS.indexOf(selector)
        expect(at, selector).toBeGreaterThan(-1)
        const body = GLOBALS.slice(at, GLOBALS.indexOf('}', at))
        expect(body).toContain(
          `--font-script-sans: var(${face.variable}, ${generic});`,
        )
        expect(body).toContain(
          `--font-script-serif: var(${face.variable}, ${generic});`,
        )
        expect(body).toContain(
          `--font-script-mono: var(${face.variable}, ${generic});`,
        )
        if (face.id === defaultCjkFace(lang)) {
          expect(GLOBALS).toContain(
            `[lang]:lang(${LANG_TAG[lang]}):not([${cjkAttribute(lang)}]),\n${selector}`,
          )
        }
      }
    }
  })

  it('draws zh-TW after zh, since :lang(zh) also matches zh-TW', () => {
    const lastZh = GLOBALS.lastIndexOf(':lang(zh) {')
    expect(lastZh).toBeGreaterThan(-1)
    for (const face of cjkFaces('zh-tw')) {
      const at = GLOBALS.indexOf(`[data-cjk-zh-tw='${face.id}']:lang(zh-TW)`)
      expect(at, face.id).toBeGreaterThan(lastZh)
    }
    expect(
      GLOBALS.indexOf('[lang]:lang(zh-TW):not([data-cjk-zh-tw])'),
    ).toBeGreaterThan(lastZh)
  })
})

describe('the rail’s English is the registries’ English', () => {
  const show = en.designShowcase as unknown as Record<
    string,
    Record<string, { name: string; tagline: string }>
  >
  it.each([
    ['styles', STYLE_IDS, STYLE_REGISTRY],
    ['palettes', PALETTE_IDS, PALETTE_REGISTRY],
    ['types', TYPE_IDS, TYPE_REGISTRY],
  ] as const)('%s', (key, ids, registry) => {
    const table = registry as Record<string, { name: string; tagline: string }>
    expect(Object.keys(show[key] ?? {})).toEqual([...ids])
    for (const id of ids) {
      expect(show[key]?.[id]).toEqual({
        name: table[id]?.name,
        tagline: table[id]?.tagline,
      })
    }
  })
})

describe('the Background row’s English is the background registry’s', () => {
  it('names every registered background with its name and description', () => {
    const table = en.designShowcase.backgrounds as Record<
      string,
      { name: string; tagline: string }
    >
    expect(Object.keys(table)).toEqual([...BACKGROUND_IDS])
    for (const id of BACKGROUND_IDS) {
      expect(table[id]).toEqual({
        name: BACKGROUND_REGISTRY[id].name,
        tagline: BACKGROUND_REGISTRY[id].description,
      })
    }
  })
})
