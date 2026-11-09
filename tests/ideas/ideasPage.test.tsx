import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import { render } from '@/tests/helpers/withCopy'
import { englishCopy as copy } from '@/lib/copy'
import {
  ideasHref,
  parseIdeasParams,
  type PublicIdeaDto,
  type PublicIdeaListDto,
  type PublicIdeaTagListDto,
} from '@/lib/ideas'
import { IdeasPage } from '@/app/[locale]/ideas/IdeasPage'
import { ideasMetadata } from '@/app/[locale]/ideas/ideasMetadata'
import { readIdeas } from '@/worker/ideas/handler'
import ideasFixture from '../../e2e/fixtures/ideas.json'
import tagsFixture from '../../e2e/fixtures/ideas-tags.json'
import ideaFixture from '../../e2e/fixtures/idea-stop-returns-before-they-happen.json'

/*
 * The story's integration gate (MOTIR-7689, Story MOTIR-7665): /ideas as one
 * piece — URL → query → server render → URL — against the public contract as
 * recorded in `e2e/fixtures/`. The page's server component is awaited and its
 * output rendered; the only thing stood in for is `fetch`, which answers from
 * the recordings and NARROWS them the way motir-core's
 * `ideasPublicService.list` does (category exact, every tag required, text
 * over title / pitch / gap / tag label, kind exact; category counts over every
 * filter except the category). That narrowing is written here independently
 * of the page, so it is the oracle the render is checked against.
 */

const APP = 'https://app.test.motir.co'
const API = `${APP}/api/public/ideas`
/** The Worker's store source, reading through the stubbed global `fetch`. */
const SOURCE = { origin: APP, fetch: (url: string) => fetch(url) }
const LIST = ideasFixture as PublicIdeaListDto
const TAGS = tagsFixture as PublicIdeaTagListDto
const ONE = ideaFixture as PublicIdeaDto

/** The store the stub narrows — the recording, unless a block widens it. */
let source: PublicIdeaListDto = LIST

function narrow(search: URLSearchParams): PublicIdeaListDto {
  const category = search.get('category')
  const tags = search.getAll('tag')
  const q = search.get('q')?.toLowerCase()
  const kind = search.get('kind')
  const matches = (idea: PublicIdeaDto, withCategory: boolean) =>
    (!withCategory || !category || idea.category.slug === category) &&
    tags.every((t) => idea.tags.some((x) => x.slug === t)) &&
    (!kind || idea.kind === kind) &&
    (!q ||
      [idea.title, idea.pitch, idea.gap ?? '', ...idea.tags.map((t) => t.label)]
        .join('\n')
        .toLowerCase()
        .includes(q))
  const items = source.items.filter((i) => matches(i, true))
  const countable = source.items.filter((i) => matches(i, false))
  const categories = source.categories
    .map((c) => ({
      ...c,
      count: countable.filter((i) => i.category.slug === c.slug).length,
    }))
    .filter((c) => c.count > 0)
  return { items, categories, total: items.length, locale: 'en' }
}

type Mode = 'ok' | 'down' | 'tags-down'
let mode: Mode = 'ok'
const calls: string[] = []

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  mode = 'ok'
  source = LIST
  calls.length = 0
  vi.stubGlobal('fetch', async (input: string) => {
    calls.push(input)
    if (mode === 'down') throw new TypeError('fetch failed')
    const url = new URL(input)
    const rest = url.pathname.slice(new URL(API).pathname.length)
    if (rest === '') return json(narrow(url.searchParams))
    if (rest === '/tags')
      return mode === 'tags-down' ? json({}, 503) : json(TAGS)
    const slug = decodeURIComponent(rest.slice(1))
    if (slug === ONE.slug) return json(ONE)
    const listed = source.items.find((i) => i.slug === slug)
    return listed ? json(listed) : json({ code: 'not_found' }, 404)
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** The page for `query`, as the Worker's `ideas` slot reads and renders it. */
async function open(query: string) {
  const params = parseIdeasParams(new URLSearchParams(query))
  const { list, tags, found } = await readIdeas(params, 'en', SOURCE)
  render(
    <IdeasPage
      params={params}
      list={list}
      tags={tags}
      open={list ? found : null}
    />,
  )
}

/** The head for `query`, as the Worker's `ideas` slot builds it. */
async function head(query: Record<string, string>) {
  const params = parseIdeasParams(new URLSearchParams(query))
  const { found } = await readIdeas(params, 'en', SOURCE)
  return ideasMetadata('en', copy, params, found)
}

/** The titles of every idea card on the page, in order. */
function cardTitles(): string[] {
  return Array.from(document.querySelectorAll('li[id^="idea-"] h3')).map(
    (h) => h.textContent ?? '',
  )
}

const COMBINATIONS = [
  '',
  'category=ecommerce',
  'category=ai_infrastructure',
  'tag=smb',
  'tag=smb&tag=vertical-saas',
  'tag=ai-agents&tag=b2b-saas',
  'q=returns',
  'q=Small+businesses',
  'kind=motir_buys',
  'kind=direction',
  'category=ecommerce&tag=smb&q=returns',
  'category=pets&tag=healthcare',
  'tag=consumer&q=coach',
  'category=legal&kind=direction',
]

describe('every filter combination', () => {
  it.each(COMBINATIONS)(
    '?%s renders exactly the ideas the contract returns for it',
    async (query) => {
      await open(query)
      const expected = narrow(new URLSearchParams(query))
      // The page asked the contract for exactly this view…
      expect(calls).toContain(
        query ? `${API}?${query}&locale=en` : `${API}?locale=en`,
      )
      // …and rendered those ideas and no others, Motir-would-buy first.
      const buys = expected.items.filter((i) => i.kind === 'motir_buys')
      const rest = expected.items.filter((i) => i.kind === 'direction')
      expect(cardTitles()).toEqual([...buys, ...rest].map((i) => i.title))
      if (expected.total === 0) {
        expect(
          screen.getByRole('heading', { name: copy.ideas.empty.title }),
        ).toBeTruthy()
      } else {
        expect(
          screen.queryByRole('heading', { name: copy.ideas.empty.title }),
        ).toBeNull()
      }
    },
  )

  it.each(COMBINATIONS)(
    '?%s round-trips through parseIdeasParams → ideasHref unchanged',
    (query) => {
      const raw = new URLSearchParams(query)
      expect(ideasHref(parseIdeasParams(raw))).toBe(
        query ? `/ideas?${query}` : '/ideas',
      )
    },
  )

  it('a card links to the same view with that idea open', async () => {
    await open('category=ecommerce&tag=smb')
    const link = screen.getByRole('link', { name: ONE.title })
    expect(link).toHaveAttribute(
      'href',
      `/ideas?category=ecommerce&tag=smb&idea=${ONE.slug}`,
    )
  })
})

describe('a new category of Story MOTIR-8273', () => {
  const direction = LIST.items.find(
    (i) => i.kind === 'direction',
  ) as PublicIdeaDto
  const silver: PublicIdeaDto = {
    ...direction,
    slug: 'silver-test-idea',
    title: 'A silver-economy test idea',
    category: { slug: 'silver_economy', label: 'Silver economy' },
  }

  beforeEach(() => {
    source = {
      ...LIST,
      items: [...LIST.items, silver],
      categories: [
        ...LIST.categories,
        { slug: 'silver_economy', label: 'Silver economy', count: 1 },
      ],
      total: LIST.total + 1,
    }
  })

  function categoryGroup() {
    return screen.getByRole('group', { name: copy.ideas.find.categoryGroup })
  }

  it('the unfiltered page shows its chip with count 1 and its card with the record mark', async () => {
    await open('')
    const chip = within(categoryGroup()).getByRole('link', {
      name: /Silver economy/,
    })
    expect(chip).toHaveTextContent('Silver economy1')
    expect(chip).toHaveAttribute('href', '/ideas?category=silver_economy')
    const card = document.getElementById('idea-silver-test-idea')!
    expect(card).toHaveTextContent('Silver economy')
    expect(card.querySelector('[data-mark]')).toHaveAttribute(
      'data-mark',
      'record',
    )
  })

  it('?category=silver_economy asks for that category and shows only that idea', async () => {
    await open('category=silver_economy')
    expect(calls).toContain(`${API}?category=silver_economy&locale=en`)
    expect(cardTitles()).toEqual([silver.title])
  })

  it('?category=space_travel is ignored: no category asked for, the whole list shown', async () => {
    await open('category=space_travel')
    expect(calls).toContain(`${API}?locale=en`)
    expect(calls.some((c) => c.includes('category='))).toBe(false)
    const buys = source.items.filter((i) => i.kind === 'motir_buys')
    const rest = source.items.filter((i) => i.kind === 'direction')
    expect(cardTitles()).toEqual([...buys, ...rest].map((i) => i.title))
  })
})

describe('the route', () => {
  it('opens with its heading, the controls and the Motir-would-buy band', async () => {
    await open('')
    expect(
      screen.getByRole('heading', { level: 1, name: copy.ideas.headline }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: copy.ideas.find.heading }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: copy.ideas.listHeadline }),
    ).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('the idea open in place', () => {
  it('?idea= renders the list with that idea’s panel over it', async () => {
    await open(`category=ecommerce&idea=${ONE.slug}`)
    const sheet = screen.getByRole('dialog', { name: ONE.title })
    expect(sheet).toHaveTextContent(ONE.evidence[0].claim)
    expect(cardTitles()).toContain(ONE.title)
    // Read from the list: no second request for the idea.
    expect(calls.filter((c) => c.includes(`/${ONE.slug}`))).toEqual([])
  })

  it('an idea outside the current filters is read by its slug', async () => {
    await open(`category=legal&idea=${ONE.slug}`)
    expect(screen.getByRole('dialog', { name: ONE.title })).toBeTruthy()
    expect(calls).toContain(`${API}/${ONE.slug}?locale=en`)
    expect(
      within(screen.getByRole('dialog')).getByRole('link', {
        name: copy.ideas.detail.close,
      }),
    ).toHaveAttribute('href', '/ideas?category=legal')
  })

  it('an unknown or retired slug renders the list with no panel and no error', async () => {
    await open('idea=no-such-idea')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
    expect(cardTitles()).toHaveLength(LIST.total)
  })

  it('the metadata names the open idea and keeps the idea in the canonical', async () => {
    const meta = await head({ tag: 'smb', idea: ONE.slug })
    expect(meta.title).toBe(`${ONE.title} · ${copy.ideas.metaTitle}`)
    expect(meta.description).toBe(ONE.pitch)
    expect(String(meta.alternates?.canonical)).toMatch(
      new RegExp(`/ideas\\?tag=smb&idea=${ONE.slug}$`),
    )
    expect(meta.robots).toEqual({ index: false, follow: true })
  })

  it('with no idea, or an unknown one, the metadata is the page’s own', async () => {
    for (const idea of [undefined, 'no-such-idea']) {
      const meta = await head({ tag: 'smb', ...(idea ? { idea } : {}) })
      expect(meta.title).toBe(copy.ideas.metaTitle)
      expect(String(meta.alternates?.canonical)).toMatch(/\/ideas\?tag=smb$/)
    }
  })
})

describe('the states', () => {
  it('an unreachable API renders the error state with a retry of the same view', async () => {
    mode = 'down'
    await open('category=pets&idea=x')
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(copy.ideas.error.title)
    expect(
      within(status).getByRole('link', { name: copy.ideas.error.action }),
    ).toHaveAttribute('href', '/ideas?category=pets&idea=x')
    expect(cardTitles()).toEqual([])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('a failed tags read still renders the list, without the tag filter', async () => {
    mode = 'tags-down'
    await open('')
    expect(cardTitles()).toHaveLength(LIST.total)
    expect(
      screen.queryByRole('group', { name: copy.ideas.find.tags }),
    ).toBeNull()
  })

  it('no match renders the no-match state', async () => {
    await open('q=zzzz-nothing')
    expect(
      screen.getByRole('heading', { name: copy.ideas.empty.title }),
    ).toBeTruthy()
    expect(screen.getByText(copy.ideas.find.countNone)).toBeTruthy()
  })
})

describe('the guards', () => {
  const ROOT = process.cwd()

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return sources(path)
      return /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : []
    })
  }

  it('no database client or connection string anywhere in the site', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
    expect(
      deps.filter((d) =>
        /prisma|^pg$|postgres|mysql|sqlite|drizzle|@neondatabase|@vercel\/postgres/.test(
          d,
        ),
      ),
    ).toEqual([])
    const offenders = ['app', 'lib', 'worker']
      .map((p) => join(ROOT, p))
      .flatMap((p) => (statSync(p).isDirectory() ? sources(p) : [p]))
      .filter((file) =>
        /DATABASE_URL|PrismaClient|@prisma\/client|postgres(ql)?:\/\//.test(
          readFileSync(file, 'utf8'),
        ),
      )
      .map((file) => relative(ROOT, file))
    expect(offenders).toEqual([])
  })

  it('the recorded fixtures carry every field the page renders', () => {
    const keys: Array<keyof PublicIdeaDto> = [
      'slug',
      'kind',
      'title',
      'pitch',
      'category',
      'tags',
      'capabilities',
      'evidence',
      'gap',
      'whyNow',
      'whyMotir',
      'whoElse',
      'locale',
      'fallbackFields',
    ]
    for (const idea of [...LIST.items, ONE]) {
      for (const key of keys) expect(idea).toHaveProperty(key)
      for (const e of idea.evidence) {
        expect(Object.keys(e).sort()).toEqual(
          ['claim', 'claimFallback', 'sourceDate', 'sourceName', 'url'].sort(),
        )
      }
      for (const t of idea.tags)
        expect(Object.keys(t).sort()).toEqual([
          'label',
          'labelFallback',
          'slug',
        ])
    }
  })
})
