// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  IDEA_CATEGORY_SLUGS,
  IDEA_KINDS,
  IDEA_TRANSLATABLE_FIELDS,
  IDEAS_QUERY_MAX,
  IDEAS_REVALIDATE_SECONDS,
  IdeasUnavailableError,
  fetchIdea,
  fetchIdeaTags,
  fetchIdeas,
  hasIdeaFilters,
  hasText,
  ideaCategoryMark,
  sourceMonth,
  ideaFieldLang,
  ideasHref,
  ideaTextLang,
  parseIdeasParams,
  toPublicIdea,
  toPublicIdeaList,
  toPublicIdeaTagList,
  type IdeasParams,
  type PublicIdeaDto,
  type PublicIdeaListDto,
  type PublicIdeaListWire,
  type PublicIdeaTagDto,
  type PublicIdeaTagListDto,
  type PublicIdeaTagListWire,
  type PublicIdeaWire,
} from '@/lib/ideas'
import ideasFixture from '../e2e/fixtures/ideas.json'
import tagsFixture from '../e2e/fixtures/ideas-tags.json'
import ideaFixture from '../e2e/fixtures/idea-stop-returns-before-they-happen.json'

/*
 * The ideas data layer (MOTIR-7685, Story MOTIR-7665) — the URL model both
 * ways, every read's URL and cache option, the 404 → null, the error mapping,
 * and the recorded fixtures against the contract types.
 */

const ORIGIN = 'https://app.test.motir.co' // vitest.config.mts sets it
const EMPTY: IdeasParams = { tags: [] }

/** A response as a motir-core without the locale fields would send it. */
function preLocale(idea: PublicIdeaWire): PublicIdeaWire {
  const LOCALE_KEYS = [
    'locale',
    'fallbackFields',
    'claimFallback',
    'labelFallback',
  ]
  return JSON.parse(
    JSON.stringify(idea, (key, value: unknown) =>
      LOCALE_KEYS.includes(key) ? undefined : value,
    ),
  ) as PublicIdeaWire
}

describe('parseIdeasParams', () => {
  it('reads every field from a Next searchParams record', () => {
    expect(
      parseIdeasParams({
        category: 'ecommerce',
        tag: ['smb', 'retail'],
        q: '  returns  ',
        kind: 'direction',
        idea: 'stop-returns-before-they-happen',
      }),
    ).toEqual({
      category: 'ecommerce',
      tags: ['smb', 'retail'],
      q: 'returns',
      kind: 'direction',
      idea: 'stop-returns-before-they-happen',
    })
  })

  it('reads a URLSearchParams the same way', () => {
    const raw = new URLSearchParams(
      'category=pets&tag=smb&tag=consumer&q=vet&kind=motir_buys&idea=a-b',
    )
    expect(parseIdeasParams(raw)).toEqual({
      category: 'pets',
      tags: ['smb', 'consumer'],
      q: 'vet',
      kind: 'motir_buys',
      idea: 'a-b',
    })
  })

  it('empty params are the unfiltered page', () => {
    expect(parseIdeasParams({})).toEqual({
      category: undefined,
      tags: [],
      q: undefined,
      kind: undefined,
      idea: undefined,
    })
    expect(hasIdeaFilters(parseIdeasParams({}))).toBe(false)
  })

  it('drops an unknown category or kind instead of failing the page', () => {
    const p = parseIdeasParams({ category: 'astrology', kind: 'maybe' })
    expect(p.category).toBeUndefined()
    expect(p.kind).toBeUndefined()
  })

  it('keeps repeated tags in order, de-duplicated, and drops non-slugs', () => {
    expect(
      parseIdeasParams({ tag: ['smb', ' ai-agents ', 'smb', 'Not A Slug', ''] })
        .tags,
    ).toEqual(['smb', 'ai-agents'])
  })

  it('trims q, caps it at 200 characters, and treats blank as absent', () => {
    expect(parseIdeasParams({ q: '   ' }).q).toBeUndefined()
    const long = 'x'.repeat(IDEAS_QUERY_MAX + 50)
    expect(parseIdeasParams({ q: long }).q).toHaveLength(IDEAS_QUERY_MAX)
  })

  it('takes the first value of a repeated single-valued param', () => {
    expect(parseIdeasParams({ category: ['legal', 'finance'] }).category).toBe(
      'legal',
    )
  })

  it('drops an idea slug that is not a slug', () => {
    expect(parseIdeasParams({ idea: '../etc/passwd' }).idea).toBeUndefined()
  })
})

describe('ideasHref', () => {
  it('the unfiltered page is a bare /ideas', () => {
    expect(ideasHref(EMPTY)).toBe('/ideas')
  })

  it('writes the parameters in one stable order', () => {
    expect(
      ideasHref({
        idea: 'stop-returns-before-they-happen',
        kind: 'direction',
        q: 'returns',
        tags: ['smb', 'retail'],
        category: 'ecommerce',
      }),
    ).toBe(
      '/ideas?category=ecommerce&tag=smb&tag=retail&q=returns&kind=direction&idea=stop-returns-before-they-happen',
    )
  })

  it('is stable through a parse: the same filters are the same URL', () => {
    const urls = [
      'q=returns&tag=smb&category=ecommerce',
      'category=ecommerce&q=returns&tag=smb',
      'tag=smb&tag=smb&category=ecommerce&q=%20returns%20&kind=nope',
    ]
    const hrefs = urls.map((u) =>
      ideasHref(parseIdeasParams(new URLSearchParams(u))),
    )
    expect(new Set(hrefs).size).toBe(1)
    expect(hrefs[0]).toBe('/ideas?category=ecommerce&tag=smb&q=returns')
    // …and round-trips: parsing the canonical URL gives the same URL back.
    const again = ideasHref(
      parseIdeasParams(new URLSearchParams(hrefs[0]!.split('?')[1])),
    )
    expect(again).toBe(hrefs[0])
  })

  it('applies a change, keeping what it does not mention', () => {
    const current: IdeasParams = {
      category: 'ecommerce',
      tags: ['smb'],
      q: 'returns',
    }
    expect(ideasHref(current, { tags: ['smb', 'retail'] })).toBe(
      '/ideas?category=ecommerce&tag=smb&tag=retail&q=returns',
    )
    expect(ideasHref(current, { category: 'pets' })).toBe(
      '/ideas?category=pets&tag=smb&q=returns',
    )
    expect(ideasHref(current, { kind: 'motir_buys' })).toBe(
      '/ideas?category=ecommerce&tag=smb&q=returns&kind=motir_buys',
    )
  })

  it('null clears a field; clearing everything is the bare page', () => {
    const current: IdeasParams = {
      category: 'ecommerce',
      tags: ['smb'],
      q: 'returns',
      kind: 'direction',
    }
    expect(ideasHref(current, { q: null })).toBe(
      '/ideas?category=ecommerce&tag=smb&kind=direction',
    )
    expect(
      ideasHref(current, { category: null, tags: [], q: null, kind: null }),
    ).toBe('/ideas')
  })

  it('opening an idea keeps the filters, and closing it returns to them', () => {
    const filtered: IdeasParams = { category: 'ecommerce', tags: ['smb'] }
    const open = ideasHref(filtered, {
      idea: 'stop-returns-before-they-happen',
    })
    expect(open).toBe(
      '/ideas?category=ecommerce&tag=smb&idea=stop-returns-before-they-happen',
    )
    const opened = parseIdeasParams(new URLSearchParams(open.split('?')[1]))
    expect(ideasHref(opened, { idea: null })).toBe(
      '/ideas?category=ecommerce&tag=smb',
    )
  })

  it('a blank q in a change is no q', () => {
    expect(ideasHref(EMPTY, { q: '   ' })).toBe('/ideas')
  })

  it('the open idea is not a filter', () => {
    expect(hasIdeaFilters({ tags: [], idea: 'a' })).toBe(false)
    expect(hasIdeaFilters({ tags: ['smb'] })).toBe(true)
  })
})

/*
 * The nine categories of Story MOTIR-8273 (MOTIR-8279): the URL model keeps
 * each, round-trips it, and still drops a slug it does not list — and the list
 * holds them at the grouped positions motir-core's enum shares.
 */
const NEW_VERTICALS = [
  'entertainment_media',
  'hospitality_travel',
  'mobility',
  'energy_climate',
  'manufacturing',
  'local_services',
] as const
const NEW_CONSUMER = [
  'social_community',
  'silver_economy',
  'independent_work',
] as const

describe('the nine categories of Story MOTIR-8273', () => {
  it.each([...NEW_VERTICALS, ...NEW_CONSUMER])(
    'parseIdeasParams keeps %s and ideasHref round-trips it',
    (slug) => {
      expect(parseIdeasParams({ category: slug }).category).toBe(slug)
      const href = ideasHref({ category: slug, tags: [] })
      expect(href).toBe(`/ideas?category=${slug}`)
      expect(
        parseIdeasParams(new URLSearchParams(href.split('?')[1])).category,
      ).toBe(slug)
    },
  )

  it('still drops an unknown slug and a near-miss of a new one', () => {
    expect(parseIdeasParams({ category: 'astrology' }).category).toBeUndefined()
    expect(
      parseIdeasParams({ category: 'silver-economy' }).category,
    ).toBeUndefined()
  })

  it('lists 34 unique slugs with the nine at their grouped positions', () => {
    const slugs: readonly string[] = IDEA_CATEGORY_SLUGS
    expect(slugs).toHaveLength(34)
    expect(new Set(slugs).size).toBe(34)
    const afterPublicSector = slugs.indexOf('public_sector') + 1
    expect(
      slugs.slice(afterPublicSector, afterPublicSector + NEW_VERTICALS.length),
    ).toEqual(NEW_VERTICALS)
    const afterHealth = slugs.indexOf('health_wellness') + 1
    expect(slugs.slice(afterHealth, afterHealth + NEW_CONSUMER.length)).toEqual(
      NEW_CONSUMER,
    )
    expect(slugs[afterHealth + NEW_CONSUMER.length]).toBe('ai_infrastructure')
  })
})

describe('the reads', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(response: Response | Error) {
    const fn = vi.fn(async () => {
      if (response instanceof Error) throw response
      return response
    })
    vi.stubGlobal('fetch', fn)
    return fn
  }

  const ok = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

  it('fetchIdeas asks the API with the filters, never the open idea', async () => {
    const fetchMock = stubFetch(ok(ideasFixture))
    const list = await fetchIdeas(
      {
        category: 'ecommerce',
        tags: ['smb', 'retail'],
        q: 'returns',
        kind: 'direction',
        idea: 'stop-returns-before-they-happen',
      },
      'en',
    )
    expect(list.total).toBe(ideasFixture.total)
    expect(fetchMock).toHaveBeenCalledWith(
      `${ORIGIN}/api/public/ideas?category=ecommerce&tag=smb&tag=retail&q=returns&kind=direction&locale=en`,
    )
    expect(IDEAS_REVALIDATE_SECONDS).toBe(3600)
  })

  it('fetchIdeas with no filters asks for the whole store', async () => {
    const fetchMock = stubFetch(ok(ideasFixture))
    await fetchIdeas(EMPTY, 'en')
    expect(fetchMock).toHaveBeenCalledWith(
      `${ORIGIN}/api/public/ideas?locale=en`,
    )
  })

  it('fetchIdeaTags reads the tag list with its locale', async () => {
    const fetchMock = stubFetch(ok(tagsFixture))
    const tags = await fetchIdeaTags('en')
    expect(tags).toEqual(tagsFixture)
    expect(fetchMock).toHaveBeenCalledWith(
      `${ORIGIN}/api/public/ideas/tags?locale=en`,
    )
  })

  it('fetchIdea reads one idea by its encoded slug', async () => {
    const fetchMock = vi.fn(async () => ok(ideaFixture))
    vi.stubGlobal('fetch', fetchMock)
    const idea = await fetchIdea('stop-returns-before-they-happen', 'en')
    expect(idea?.slug).toBe('stop-returns-before-they-happen')
    expect(fetchMock).toHaveBeenCalledWith(
      `${ORIGIN}/api/public/ideas/stop-returns-before-they-happen?locale=en`,
    )
    await fetchIdea('a/b?c', 'en')
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${ORIGIN}/api/public/ideas/a%2Fb%3Fc?locale=en`,
    )
  })

  it('fetchIdea answers null on a 404 — unknown and retired alike', async () => {
    stubFetch(new Response('{"code":"IDEA_NOT_FOUND"}', { status: 404 }))
    await expect(fetchIdea('retired-one', 'ja')).resolves.toBeNull()
  })

  it('a 5xx is IdeasUnavailableError carrying the path and status', async () => {
    stubFetch(new Response('boom', { status: 503 }))
    const err = await fetchIdeas(EMPTY, 'en').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(IdeasUnavailableError)
    expect(err).toMatchObject({ path: '?locale=en', status: 503 })
    expect((err as Error).message).toContain('HTTP 503')
  })

  it('a refused filter (400) is unavailable too, not an empty list', async () => {
    stubFetch(new Response('{"code":"INVALID_IDEA_FILTER"}', { status: 400 }))
    await expect(fetchIdeas({ tags: [], q: 'x' }, 'en')).rejects.toMatchObject({
      name: 'IdeasUnavailableError',
      path: '?q=x&locale=en',
      status: 400,
    })
  })

  it('an unreachable API is IdeasUnavailableError with no status', async () => {
    stubFetch(new TypeError('fetch failed'))
    const err = await fetchIdeaTags('en').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(IdeasUnavailableError)
    expect(err).toMatchObject({ path: '/tags?locale=en', status: null })
    expect((err as Error).cause).toBeInstanceOf(TypeError)
  })

  it('a body that is not JSON is IdeasUnavailableError', async () => {
    stubFetch(new Response('<html>', { status: 200 }))
    await expect(fetchIdea('x', 'en')).rejects.toBeInstanceOf(
      IdeasUnavailableError,
    )
  })

  it('a 5xx on the detail read is unavailable, never a silent null', async () => {
    stubFetch(new Response('boom', { status: 500 }))
    await expect(fetchIdea('x', 'en')).rejects.toMatchObject({ status: 500 })
  })
})

/*
 * The recorded fixtures (motir-core production, 2026-10-07) against the
 * contract. The JSON imports are typed WIDE (a string, not a category union),
 * so the assignment alone proves only the field names; the checks below prove
 * the closed sets.
 */
describe('the E2E fixtures match the contract', () => {
  const list: PublicIdeaListDto = ideasFixture as PublicIdeaListDto
  const tags: PublicIdeaTagDto[] = (tagsFixture as PublicIdeaTagListDto).tags
  const one: PublicIdeaDto = ideaFixture as PublicIdeaDto

  const IDEA_KEYS = [
    'addedAt',
    'capabilities',
    'category',
    'evidence',
    'fallbackFields',
    'gap',
    'kind',
    'lastReviewedAt',
    'locale',
    'pitch',
    'slug',
    'tags',
    'title',
    'whoElse',
    'whyMotir',
    'whyNow',
  ]

  function checkIdea(idea: PublicIdeaDto) {
    expect(Object.keys(idea).sort()).toEqual(IDEA_KEYS)
    expect(IDEA_KINDS).toContain(idea.kind)
    expect(IDEA_CATEGORY_SLUGS).toContain(idea.category.slug)
    for (const e of idea.evidence) {
      expect(Object.keys(e).sort()).toEqual([
        'claim',
        'claimFallback',
        'sourceDate',
        'sourceName',
        'url',
      ])
      if (e.sourceDate !== null)
        expect(e.sourceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  }

  it('the list: every idea, counts and total', () => {
    expect(list.items.length).toBe(list.total)
    list.items.forEach(checkIdea)
    for (const c of list.categories) {
      expect(IDEA_CATEGORY_SLUGS).toContain(c.slug)
      expect(c.count).toBe(
        list.items.filter((i) => i.category.slug === c.slug).length,
      )
    }
  })

  it('the tags: slug, label and count', () => {
    expect(tags.length).toBeGreaterThan(0)
    for (const t of tags) {
      expect(Object.keys(t).sort()).toEqual([
        'count',
        'label',
        'labelFallback',
        'slug',
      ])
      expect(t.count).toBeGreaterThan(0)
    }
  })

  it('the detail: one idea, and the same one the list carries', () => {
    checkIdea(one)
    expect(list.items.find((i) => i.slug === one.slug)).toEqual(one)
  })
})

/*
 * The per-locale reads (Story MOTIR-7772 · MOTIR-7777): every read carries the
 * page's locale on the STORE's URL, never on the visitor's; the coercers keep
 * the locale fields and give an older server's response its pre-locale
 * meaning; `ideaTextLang` marks exactly the English on a non-English page.
 */
describe('the locale on every read', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const ok = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })

  function stub(body: unknown) {
    const fn = vi.fn(async () => ok(body))
    vi.stubGlobal('fetch', fn)
    return fn
  }

  it('the list, a search, the tags and one idea ask for locale=ja', async () => {
    const fn = stub(ideasFixture)
    await fetchIdeas(EMPTY, 'ja')
    await fetchIdeas({ tags: [], q: '再生' }, 'ja')
    expect(fn.mock.calls.map((c) => c as unknown[])).toEqual([
      [`${ORIGIN}/api/public/ideas?locale=ja`],
      [`${ORIGIN}/api/public/ideas?q=%E5%86%8D%E7%94%9F&locale=ja`],
    ])
    const tagsFn = stub(tagsFixture)
    await fetchIdeaTags('ja')
    expect(tagsFn).toHaveBeenCalledWith(
      `${ORIGIN}/api/public/ideas/tags?locale=ja`,
    )
    const oneFn = stub(ideaFixture)
    await fetchIdea('stop-returns-before-they-happen', 'ja')
    expect(oneFn).toHaveBeenCalledWith(
      `${ORIGIN}/api/public/ideas/stop-returns-before-they-happen?locale=ja`,
    )
  })

  it('the visitor URL never carries a locale', () => {
    for (const query of [
      '',
      'locale=ja',
      'q=x&locale=de&tag=smb',
      'category=pets&idea=a-b&locale=ko',
    ]) {
      const href = ideasHref(parseIdeasParams(new URLSearchParams(query)))
      expect(href).not.toContain('locale')
    }
  })
})

describe('the coercers', () => {
  const localized: PublicIdeaWire = {
    ...(ideaFixture as PublicIdeaWire),
    title: '返品を未然に防ぐ',
    locale: 'ja',
    fallbackFields: ['pitch'],
    evidence: (ideaFixture as PublicIdeaWire).evidence.map((e, n) => ({
      ...e,
      claimFallback: n === 0,
    })),
    tags: (ideaFixture as PublicIdeaWire).tags.map((t, n) => ({
      ...t,
      labelFallback: n === 0,
    })),
  }

  it('keep locale, fallbackFields, claimFallback and labelFallback', () => {
    const idea = toPublicIdea(localized)
    expect(idea.locale).toBe('ja')
    expect(idea.fallbackFields).toEqual(['pitch'])
    expect(idea.evidence.map((e) => e.claimFallback)).toEqual(
      localized.evidence.map((_, n) => n === 0),
    )
    expect(idea.tags.map((t) => t.labelFallback)).toEqual(
      localized.tags.map((_, n) => n === 0),
    )
    const list = toPublicIdeaList({
      items: [localized],
      categories: [],
      total: 1,
      locale: 'ja',
    })
    expect(list.locale).toBe('ja')
    expect(list.items[0]).toEqual(idea)
    const tags = toPublicIdeaTagList({
      tags: [{ slug: 'smb', label: 'SMB', count: 1, labelFallback: true }],
      locale: 'ja',
    })
    expect(tags).toEqual({
      tags: [{ slug: 'smb', label: 'SMB', count: 1, labelFallback: true }],
      locale: 'ja',
    })
  })

  it('give a pre-locale response its old meaning: English, nothing listed, every flag false', () => {
    const old = preLocale(ideaFixture as PublicIdeaWire)
    const idea = toPublicIdea(old)
    expect(idea.locale).toBe('en')
    expect(idea.fallbackFields).toEqual([])
    expect(idea.evidence.every((e) => e.claimFallback === false)).toBe(true)
    expect(idea.tags.every((t) => t.labelFallback === false)).toBe(true)
    expect(
      toPublicIdeaList({ items: [old], categories: [], total: 1 }).locale,
    ).toBe('en')
    const tags = toPublicIdeaTagList({
      tags: [{ slug: 'smb', label: 'SMB', count: 1 }],
    })
    expect(tags).toEqual({
      tags: [{ slug: 'smb', label: 'SMB', count: 1, labelFallback: false }],
      locale: 'en',
    })
  })

  it('a fetch passes the response through them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(localized))),
    )
    const idea = await fetchIdea('stop-returns-before-they-happen', 'ja')
    expect(idea).toEqual(toPublicIdea(localized))
    vi.unstubAllGlobals()
  })
})

describe('ideaTextLang', () => {
  it('an English page marks nothing', () => {
    expect(ideaTextLang('en', 'en', false)).toBeUndefined()
    expect(ideaTextLang('en', 'en', true)).toBeUndefined()
  })

  it('a Japanese page: Japanese text is unmarked, a fallback is English', () => {
    expect(ideaTextLang('ja', 'ja', false)).toBeUndefined()
    expect(ideaTextLang('ja', 'ja', true)).toBe('en')
  })

  it('a response served in English on a Japanese page is English throughout', () => {
    expect(ideaTextLang('ja', 'en', false)).toBe('en')
  })

  it('ideaFieldLang reads the field from fallbackFields', () => {
    const idea = { locale: 'ja' as const, fallbackFields: ['pitch' as const] }
    expect(ideaFieldLang('ja', idea, 'pitch')).toBe('en')
    expect(ideaFieldLang('ja', idea, 'title')).toBeUndefined()
    expect(ideaFieldLang('en', idea, 'pitch')).toBeUndefined()
  })
})

/*
 * The LOCALIZED recordings (Story MOTIR-7772 · MOTIR-7779) against the same
 * contract: every file under `e2e/fixtures/ideas/<locale>/` passes through the
 * page's coercers UNCHANGED — so a field the coercer would drop fails here —
 * and says the locale its directory names.
 */
describe('the localized E2E fixtures match the contract', () => {
  const DIR = 'e2e/fixtures/ideas'
  const locales = readdirSync(DIR)
  const read = (path: string): unknown =>
    JSON.parse(readFileSync(`${DIR}/${path}`, 'utf8'))

  it('covers the five locales the acceptance walks read', () => {
    expect([...locales].sort()).toEqual(['de', 'ja', 'ko', 'pl', 'zh'])
  })

  it.each(locales)(
    '%s: the list, the tags and each idea survive the coercers',
    (locale) => {
      const list = read(`${locale}/ideas.json`) as PublicIdeaListWire
      expect(toPublicIdeaList(list)).toEqual(list)
      expect(list.locale).toBe(locale)
      const tags = read(`${locale}/ideas-tags.json`) as PublicIdeaTagListWire
      expect(toPublicIdeaTagList(tags)).toEqual(tags)
      expect(tags.locale).toBe(locale)
      for (const file of readdirSync(`${DIR}/${locale}`)) {
        if (file.startsWith('ideas')) continue
        const idea = read(`${locale}/${file}`) as PublicIdeaWire
        expect(toPublicIdea(idea)).toEqual(idea)
        expect(idea.locale).toBe(locale)
        expect(`${idea.slug}.json`).toBe(file)
      }
      for (const idea of list.items) {
        expect(IDEA_CATEGORY_SLUGS).toContain(idea.category.slug)
        expect(
          (idea.fallbackFields ?? []).every((f) =>
            IDEA_TRANSLATABLE_FIELDS.includes(f),
          ),
        ).toBe(true)
      }
    },
  )
})

describe('no database client', () => {
  it('lib/ideas.ts reads the API only', () => {
    // `tests/legal/legalRoutes.test.ts` walks all of `lib/` for the standing
    // rule; this pins the new module to it by name, so the guard cannot pass
    // over it vacuously if the module ever moves.
    const src = readFileSync('lib/ideas.ts', 'utf8')
    for (const pattern of [
      /@prisma\/client/,
      /from\s+['"]pg['"]/,
      /DATABASE_URL/,
      /postgres(ql)?:\/\//i,
    ]) {
      expect(src).not.toMatch(pattern)
    }
    expect(src).toMatch(/\$\{APP_ORIGIN\}\/api\/public\/ideas/)
  })
})

/*
 * The drawing helpers the idea cards read (MOTIR-7689). Their page tests live
 * with the live `/ideas` surface, which the Worker-routes story ports; these
 * hold the helpers on their own while those wait (MOTIR-10644).
 */
describe('the idea drawing helpers', () => {
  it('marks a known category, and an unknown one with the platform mark', () => {
    expect(ideaCategoryMark('personal_finance')).toBe('record')
    expect(ideaCategoryMark('ai_infrastructure')).toBe('ground')
    expect(ideaCategoryMark('a_category_added_later')).toBe('ground')
  })

  it('reads a source date as its month, and nothing else as a date', () => {
    expect(sourceMonth('2025-10-01')).toBe('October 2025')
    expect(sourceMonth('2024-01-31')).toBe('January 2024')
    expect(sourceMonth('2025-13-01')).toBeNull()
    expect(sourceMonth('October 2025')).toBeNull()
    expect(sourceMonth(null)).toBeNull()
  })

  it('treats only a non-blank string as text to draw', () => {
    expect(hasText('a line')).toBe(true)
    expect(hasText('   ')).toBe(false)
    expect(hasText('')).toBe(false)
    expect(hasText(null)).toBe(false)
    expect(hasText(undefined)).toBe(false)
  })
})
